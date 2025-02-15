import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

import { readFile } from 'node:fs/promises'
const promptsFolder = './prompts'
const promptsFiles = {
    nlpToCypher: `${promptsFolder}/nlpToCypher.md`,
    responseTemplateFromJson: `${promptsFolder}/responseTemplateFromJson.md`,
    context: `${promptsFolder}/context.md`,
}

// ✅ Load Neo4j Credentials
const config = {
    url: process.env.NEO4J_URI,
    username: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
    indexName: "agent_index",
    searchType: "vector",
    textNodeProperties: ["question"],
    nodeLabel: "Chunk",
};

// ✅ Initialize Models
const coderModel = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.CODER_MODEL,
    baseURL: process.env.OLLAMA_BASE_URL,
});

const nlpModel = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.NLP_MODEL,
    baseURL: process.env.OLLAMA_BASE_URL,
});

const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: process.env.OLLAMA_BASE_URL,
});


export async function prompt(question, debugLog = () => { }) {

    // ✅ Initialize Neo4j Graph Connection
    const graph = await Neo4jGraph.initialize({
        url: config.url,
        username: config.username,
        password: config.password,
        enhancedSchema: false,
    });

    const vectorIndex = await Neo4jVectorStore.fromExistingGraph(ollamaEmbeddings, config);
    // ✅ LangChain Pipeline
    const chain = RunnableSequence.from([
        retrieveVectorSearchResults,
        generateQueryIfNoCached,
        validateAndExecuteQuery,
        generateNLPResponse,
        cacheResult,
        parseTemplateToData,
    ]);

    const result = await chain.invoke({ question });
    debugLog("\n🎙️ Question:")
    debugLog("\n", question, "\n");
    debugLog(result.answer || result.error);

    await vectorIndex.close()
    await graph.close()

    return result;

    async function retrieveVectorSearchResults(input) {
        debugLog("🔍 Searching Neo4j vector store...");
        const vectorResults = await vectorIndex.similaritySearchWithScore(input.question, 1);
        const results = vectorResults?.at(0);
        const score = results?.at(1);

        if (results?.length && score > process.env.NEO4J_VECTOR_THRESHOLD) {
            debugLog(`✅ Vector match found! - score: ${score}`);
            return {
                ...input,
                cached: true,
                answerTemplate: results[0].metadata.answerTemplate,
                query: results[0].metadata.query
            };
        }

        debugLog("⚠️ No vector match found, generating Cypher query...");
        return {
            ...input,
            cached: false,
        };
    }

    async function generateQueryIfNoCached(input) {
        if (input.cached) return input; // Skip if we already have a cached answer

        const schema = await graph.getSchema();
        // debugLog(`Schema`, schema);
        const nlpTocypherPrompt = await readFile(promptsFiles.nlpToCypher, 'utf-8')
        const context = await readFile(promptsFiles.context, 'utf-8')
        const queryPrompt = ChatPromptTemplate.fromTemplate(nlpTocypherPrompt);

        const queryChain = queryPrompt.pipe(coderModel).pipe(new StringOutputParser());
        const query = (await queryChain.invoke({
            question: input.question,
            schema,
            context
        }))

        return { ...input, query };
    }

    async function validateAndExecuteQuery(input) {
        if (input.cached) {
            const dbResults = await graph.query(input.query);
            if (!dbResults || dbResults.length === 0) {
                debugLog("⚠️ No meaningful results from Neo4j.");
                return { error: "No results found." };
            }

            return { ...input, dbResults };
        }

        debugLog("🤖 AI Generated Cypher Query:\n", input.query);
        const validationResult = await graph.query(`EXPLAIN ${input.query}`);
        if (!validationResult) {
            debugLog("❌ Generated query is invalid:", input.query);
            return { error: "I couldn't generate a valid query." };
        }

        const dbResults = await graph.query(input.query);
        if (!dbResults || dbResults.length === 0) {
            debugLog("⚠️ No meaningful results from Neo4j.");
            return { error: "No results found." };
        }

        return { ...input, dbResults };
    }

    async function generateNLPResponse(input) {
        if (input.cached) return input; // Skip if cached
        if (input.error) return input; // Handle errors
        const responseTemplatePrompt = await readFile(promptsFiles.responseTemplateFromJson, 'utf-8')
        const responsePrompt = ChatPromptTemplate.fromTemplate(responseTemplatePrompt);

        const responseChain = responsePrompt.pipe(nlpModel).pipe(new StringOutputParser());

        // ✅ Ensure structuredResponse is formatted as a string
        const aiResponse = await responseChain.invoke({
            question: input.question,
            structuredResponse: JSON.stringify(input.dbResults[0]) // Fix: Ensure JSON data is properly formatted
        });

        return { ...input, answerTemplate: aiResponse };
    }
    function parseTemplateToData(input) {
        if (input.error) return input;
        if (!input.dbResults.length) {
            return {
                ...input,
                answer: "I'm sorry, but I couldn't find any relevant information."
            };
        }

        // Ensure we have a valid template
        let template = input.answerTemplate || "**Results:**\n{Results}";
        // Extract placeholders from the template
        const placeholders = template.match(/{(.*?)}/g) || [];

        // Extract the static part (before the first placeholder)
        const [staticHeader, dynamicTemplate] = template.split("\n\n", 2);

        // Process each entry and replace placeholders
        const formattedEntries = input.dbResults.map(entry => {
            let formattedEntry = dynamicTemplate || template; // Use the part after the first newline

            placeholders.forEach(placeholder => {
                const key = placeholder.replace(/{|}/g, ""); // Remove { }
                let value = entry[key];

                // Convert objects into readable format
                if (typeof value === "object" && value !== null) {
                    value = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(", ");
                }

                // Replace placeholder with actual value
                formattedEntry = formattedEntry.replace(new RegExp(placeholder, "g"), value ?? "");
            });

            return formattedEntry; // Each entry gets its own formatted block
        });

        // Join all formatted entries while keeping the static header only once
        const formattedResponse = staticHeader + "\n\n" + formattedEntries.join("\n\n");

        // console.log("🎙️ Answer:", formattedResponse);
        return { ...input, answer: formattedResponse };
    }
    async function cacheResult(input) {
        if (input.cached || input.error) return input;

        debugLog("💾 Storing new question-answer pair in Neo4j Vector Store...");
        await vectorIndex.addDocuments([
            {
                pageContent: input.question,
                metadata: {
                    answerTemplate: input.answerTemplate,
                    query: input.query
                },
            },
        ]);

        debugLog("✅ New data stored in Neo4j Vector Store!");
        return input;
    }
}
