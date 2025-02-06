import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import "dotenv/config";

const config = {
    url: process.env.NEO4J_URI,
    username: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
    indexName: "vector_index",
    searchType: "vector",
    nodeLabel: "Chunk",
    // retrievalQuery: `
    //     RETURN node.text AS text, score, {a: node.a * 2} AS metadata
    // `,
    // textNodeProperty: "text",
    // embeddingNodeProperty: "embedding",
};

// ✅ Initialize Neo4j Graph Connection
const graph = await Neo4jGraph.initialize({
    url: config.url,
    username: config.username,
    password: config.password,
    enhancedSchema: true
});

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

const vectorIndex = await getVectorIndex();

// const question = "who is the actor that commented most?";
const question = "what is the most popular post?";

// HERE: this messes up with the above question
// const question = "what is the less popular post";
try {
    const response = await answerQuestion(question)
    console.log("\n📢 Final Response to User:\n", response);
    process.exit(0);

} catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
}


async function getVectorIndex() {
    let neo4jVectorIndex;
    try {
        neo4jVectorIndex = await Neo4jVectorStore.fromExistingIndex(ollamaEmbeddings, config);
        console.log("✅ Using existing Neo4j vector index.");
    } catch (error) {
        console.warn("⚠️ No existing vector index found. Creating a new one...");
        neo4jVectorIndex = await Neo4jVectorStore.initialize(ollamaEmbeddings, config);
    }

    return neo4jVectorIndex;
}


async function validateCypherQuery(query) {
    try {
        const validationResult = await graph.query(`EXPLAIN ${query}`);
        return validationResult ? true : false;
    } catch (error) {
        console.error("❌ Invalid Cypher query:", error.message);
        return false;
    }
}

// ✅ Function to Check and Add Documents
async function addDocumentIfNotExists(doc) {
    // const searchResults = await vectorIndex.similaritySearchWithScore(doc.pageContent, 1);
    // if (searchResults.at(0).length > 0 && searchResults.at(0)[0].pageContent === doc.pageContent) {
    //     console.log(`🚫 Skipping duplicate: "${doc.pageContent}"`);
    // } else {
    console.log(`✅ Adding new document: "${doc.pageContent}"`);
    doc.id = Date.now()
    await vectorIndex.addDocuments([doc]);
    // }
}

function parseTemplateToData(responseTemplate, data) {
    // console.log("🔍 Parsing template with data:", responseTemplate, data);
    return Object.keys(data).reduce((prev, next) => {
        return prev.replace(`{${next}}`, data[next]);
    }, responseTemplate)
}

async function getResults(query) {
    try {
        const dbResponse = await graph.query(query);
        if (!dbResponse || dbResponse.length === 0) {
            console.log("⚠️ No meaningful results from Neo4j.");
            return {
                error: true,
                message: "No results found.",
            };
        }

        return {
            error: false,
            result: dbResponse,
        };
    } catch (error) {

        console.error("❌ Neo4j Query Execution Failed:", error.message);
        return {
            error: true,
            message: "I couldn't retrieve data from the database."
        };
    }
}

async function answerQuestion(question) {
    console.log(`🔍 Searching Neo4j vector store for relevant answers...`);
    let vectorResults = await vectorIndex.similaritySearchWithScore(question, 1);
    const results = vectorResults?.at(0);
    const score = results?.at(1);
    // if (results.at(0).length > 0) {
    if (!!results?.length && score > 0.95) {
        // console.log("🔍 Search Results:", results, score);
        const metadata = results[0].metadata;
        console.log("✅ Vector match found in Neo4j!", score, metadata.answerTemplate);
        const dbResults = await getResults(metadata.query);
        if (dbResults.error) {
            return dbResults.message;
        }
        const answer = parseTemplateToData(metadata.answerTemplate, dbResults.result[0]);
        return answer;
    }

    console.log("⚠️ No vector match found, generating Cypher query via AI...");

    const res = await coderModel.invoke([
        "system",
        `You are an AI that translates natural language questions into optimized Neo4j Cypher queries.
        Only return the Cypher query, nothing else.

        **Important:** the return will always add an alias with the nested key, e.g. "u.username AS username".

        ### Database Schema
        ${await graph.getSchema()}

        ### User Question
        "${question}"
        `,
    ]);


    let query = res.content?.trim();
    if (!query || !(await validateCypherQuery(query))) {
        console.error("❌ Generated query is invalid:", query);
        return "I couldn't generate a valid query.";
    }

    console.log('🤖 AI Generated Cypher Query:\n', query);

    const dbResponse = await getResults(query)
    if (dbResponse.error) {
        return dbResponse.message;
    }

    const structuredResponse = JSON.stringify(dbResponse.result);
    const aiResponse = await nlpModel.invoke([
        [
            "system",
            `
                Generate a response **using placeholders** answering the question "${question}" that match the keys from the provided JSON.

                The response should **only** return a template string using placeholders, without replacing values.

                Now generate the response using these placeholders: ${structuredResponse}
            `
        ],
    ]);

    const message = parseTemplateToData(aiResponse.content, dbResponse.result[0])
    // console.log("📢 Final NLP Response to User:\n", message);

    console.log("💾 Storing new question-answer pair in Neo4j...");
    await addDocumentIfNotExists({
        pageContent: question,
        metadata: { answerTemplate: aiResponse.content, query },
    })

    console.log("✅ New data stored in Neo4j Vector Store!");
    return message;
}


