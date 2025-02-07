import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import "dotenv/config";
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
    indexName: "vector_index",
    searchType: "vector",
    nodeLabel: "Chunk",
};

// ✅ Initialize Neo4j Graph Connection
const graph = await Neo4jGraph.initialize({
    url: config.url,
    username: config.username,
    password: config.password,
    enhancedSchema: false
});

// ✅ Initialize Models
const coderModel = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.CODER_MODEL,
    baseURL: process.env.OPENAI_BASE_URL,
});

const nlpModel = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.NLP_MODEL,
    baseURL: process.env.OPENAI_BASE_URL,
});

const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseURL: process.env.OPENAI_BASE_URL,
});

// const DEBUG_ENABLED = false
const DEBUG_ENABLED = true
const debugLog = (...args) => DEBUG_ENABLED && console.log(...args);

async function retrieveVectorSearchResults(input) {
    debugLog("🔍 Searching Neo4j vector store...");
    const vectorResults = await vectorIndex.similaritySearchWithScore(input.question, 1);
    const results = vectorResults?.at(0);
    const score = results?.at(1);

    if (results?.length && score > 0.95) {
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
    debugLog(`Schema`, schema);
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

function parseTemplateToData(input) {
    if (input.error) return input;
    if (!input.dbResults.length) return { ...input, answer: "No results found." };

    const firstEntry = input.dbResults[0];
    const groupKey = Object.keys(firstEntry)[0];

    const groupedData = input.dbResults.reduce((acc, entry) => {
        const groupValue = entry[groupKey]?.name || entry[groupKey]; // Ensure we use a string value
        const details = Object.entries(entry)
            .filter(([key]) => key !== groupKey)
            .map(([key, value]) => {
                if (typeof value === "object" && value !== null) {
                    return `- ${key}: ${Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
                }
                return `- ${key}: ${value}`;
            })
            .join("\n");

        acc[groupValue] = acc[groupValue] || [];
        acc[groupValue].push(details);
        return acc;
    }, {});

    const answer = Object.entries(groupedData)
        .map(([group, entries]) => `The following data is available for **${group}**:\n${entries.join("\n")}`)
        .join("\n\n");

    return { ...input, answer };
}




// ✅ Initialize Vector Store
const vectorIndex = await Neo4jVectorStore.fromExistingIndex(ollamaEmbeddings, config);


// ✅ LangChain Pipeline
const chain = RunnableSequence.from([
    retrieveVectorSearchResults,
    generateQueryIfNoCached,
    validateAndExecuteQuery,
    generateNLPResponse,
    cacheResult,
    parseTemplateToData,
]);

const questions = [
    "what are the students who progressed over 80% on a course?"
    // "whos the student who bought only a course?",
    ,
]


// ✅ Execute Chain
for (const question of [questions[0]]) {
    // for (const question of questions) {
    const result = await chain.invoke({ question });
    console.log("\n🎙️ Question:")
    console.log("\n", question, "\n");
    console.log(result.answer || result.error);
}

process.exit(0);
