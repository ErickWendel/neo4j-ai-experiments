import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import "dotenv/config";

// ✅ Load Neo4j credentials from environment variables
const config = {
    url: process.env.NEO4J_URI,
    username: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
    indexName: "test_index",
    keywordIndexName: "keyword_index",
    searchType: "vector",
    nodeLabel: "Chunk",
    textNodeProperty: "text",
    embeddingNodeProperty: "embedding",
};

// ✅ Initialize Neo4j Graph Connection
const graph = await Neo4jGraph.initialize({
    url: config.url,
    username: config.username,
    password: config.password,
    enhancedSchema: true
});

// ✅ Initialize Ollama Model
const model = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.OPENAI_MODEL,
    baseURL: process.env.OPENAI_BASE_URL,
});

// ✅ Initialize Ollama Embeddings Model
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseURL: process.env.OPENAI_BASE_URL,
});

let neo4jVectorIndex;
try {
    neo4jVectorIndex = await Neo4jVectorStore.fromExistingIndex(ollamaEmbeddings, config);
    console.log("✅ Using existing Neo4j vector index.");
} catch (error) {
    console.warn("⚠️ No existing vector index found. Creating a new one...");
    neo4jVectorIndex = await Neo4jVectorStore.initialize(ollamaEmbeddings, config);
}

// ✅ Documents to Store in Neo4j
const documents = [
    { pageContent: "who is the actor that commented most?", metadata: { answer: "the actor is Erick" } },
    { pageContent: "who most commented post?", metadata: { answer: "lorem ipsum is the most commented" } },
    { pageContent: "who least commented post?", metadata: { answer: "chat hey is the least commented" } },
];

// ✅ Function to Check and Add Documents
async function addDocumentIfNotExists(doc) {
    const searchResults = await neo4jVectorIndex.similaritySearch(doc.pageContent, 1);
    if (searchResults.length > 0 && searchResults[0].pageContent === doc.pageContent) {
        console.log(`🚫 Skipping duplicate: "${doc.pageContent}"`);
    } else {
        console.log(`✅ Adding new document: "${doc.pageContent}"`);
        await neo4jVectorIndex.addDocuments([doc]);
    }
}

// ✅ Iterate Over Documents and Add Only If Not Exists
for (const doc of documents) {
    await addDocumentIfNotExists(doc);
}

async function makeAQuestion(question) {
    let results = await neo4jVectorIndex.similaritySearch(question, 1);
    console.log("🔍 Search Results:", question, results.at(0)?.metadata.answer);
}

await makeAQuestion("what is the most popular post?");
await makeAQuestion("what is the less popular post?");
await makeAQuestion("what is top post?");
await makeAQuestion("what is bottom post?");

// ✅ Close Neo4j Connection
await neo4jVectorIndex.close();
await graph.close();
