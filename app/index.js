import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import "dotenv/config";

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
    enhancedSchema: true
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

const DEBUG_ENABLED = false
// const DEBUG_ENABLED = true
const debugLog = (...args) => DEBUG_ENABLED && console.log(...args);

async function retrieveVectorSearchResults(input) {
    debugLog("🔍 Searching Neo4j vector store...");
    const vectorResults = await vectorIndex.similaritySearchWithScore(input.question, 1);
    const results = vectorResults?.at(0);
    const score = results?.at(1);

    if (results?.length && score > 0.95) {
        debugLog("✅ Vector match found!", score);
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

    const queryPrompt = ChatPromptTemplate.fromTemplate(`
        You are an AI that translates natural language questions into optimized Neo4j Cypher queries.

        ### Rules:
        - Always use aliases like "u.username AS username".
        - **Return only the Cypher query** as plain text. (Do not return Cypher query as markdown)
        - Do **not** add explanations, just the query.

        ### Database Schema:
        {schema}

        ### User Question:
        "{question}"
    `);

    const queryChain = queryPrompt.pipe(coderModel).pipe(new StringOutputParser());
    const query = (await queryChain.invoke({ question: input.question, schema })) // 🔥 FIX: Pass schema here
        ?.replaceAll('`', '')
        ?.replaceAll('cypher', '')
        ?.trim(); // 🔥 FIX: Ensure we clean up unnecessary characters


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

    const responsePrompt = ChatPromptTemplate.fromTemplate(`
        Generate a **human-readable response** using placeholders that match the keys from the provided JSON.

        ### Rules:
        - **Do not** generate SQL queries, JSON structures, or code snippets.
        - Use **placeholders** like {{key}}.
        - **Only return a natural language sentence** answering the question "{question}".
        - **Do not include example JSON data in the output.**

        Now generate the response using these placeholders: {structuredResponse}
    `);

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

    // debugLog("🔍 Parsing template with data:", input);
    const data = input.dbResults[0]
    return {
        ...input,
        answer: Object.keys(data).reduce((prev, next) => {
            return prev.replace(`{${next}}`, data[next]);
        }, input.answerTemplate),

    }
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
    "who is the actor that commented most?",
    "what is the most popular post?",
    "what is the less popular post",
    "Does the story with story_id = 3985069 exist?",
    "Find all comments posted by the user jpadilla_",
    "Get details of the story with story_id = 3985069, including the author and total comments.",
    "Who has posted the most comments?",
    "Find the highest-ranked comment for the story with story_id = 3985069",
    "Retrieve the text of the comment with comment_id = 67890",
    "How many comments has john_doe posted?",
    "Which story has the most comments?",
    "List all users who have commented on the story with story_id = 3985069",
]


// ✅ Execute Chain
// for (const question of [questions[3]]) {
for (const question of questions) {
    const result = await chain.invoke({ question });
    console.log("\n🎙️ Question:\n", question);
    console.log(result.answer || result.error);
}

process.exit(0);
