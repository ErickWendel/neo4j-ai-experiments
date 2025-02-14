import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import "dotenv/config";

// ✅ Load Neo4j credentials from environment variables
const config = {
    url: 'bolt://localhost:7687',
    username: 'neo4j',
    password: 'password',
    textNodeProperties: ["text"],
    indexName: "sim_example_index",
    keywordIndexName: "sim_example_keywords",
    // indexName: "test_index",
    // keywordIndexName: "keyword_index",
    // searchType: "vector",
    // nodeLabel: "Chunk",
    // textNodeProperty: "text",
    // embeddingNodeProperty: "embedding",
};

// ✅ Initialize Ollama Embeddings Model
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseURL: process.env.OPENAI_BASE_URL,
});

const neo4jVectorIndex = await Neo4jVectorStore.fromExistingGraph(ollamaEmbeddings, config);

// ✅ Documents to Store in Neo4j
const documents = [
    { pageContent: "who is the actor that commented most?", metadata: { answer: "the actor is Erick" } },
    { pageContent: "who most commented post?", metadata: { answer: "lorem ipsum is the most commented" } },
    { pageContent: "who least commented post?", metadata: { answer: "chat hey is the least commented" } },
];

// ✅ Function to Check and Add Documents
async function addDocumentIfNotExists(doc) {
    const searchResults = await neo4jVectorIndex.similaritySearch(doc.pageContent, 1);
    console.log("🔍 Search Results:", searchResults);
    if (searchResults.length > 0 && searchResults[0].pageContent === '\ntext: '.concat(doc.pageContent)) {
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
    let results = await neo4jVectorIndex.similaritySearchWithScore(question, 1);

    console.log("🔍 Search Results:", question, results.at(0)?.at(1), results.at(0)?.at(0));
}

await makeAQuestion("what is the most popular post?");
await makeAQuestion("what is the less popular post?");
await makeAQuestion("what is top post?");
await makeAQuestion("what is bottom post?");

// ✅ Close Neo4j Connection
await neo4jVectorIndex.close();
