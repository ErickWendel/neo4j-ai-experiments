import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { readFile } from 'node:fs/promises';

// ✅ Neo4j Configuration
const config = {
    url: process.env.NEO4J_URI,
    username: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
    textNodeProperties: ["text"],
    indexName: "javascript_index",
    keywordIndexName: "javascript_keywords",
    searchType: "vector",
    nodeLabel: "Chunk",
    textNodeProperty: "text",
    embeddingNodeProperty: "embedding",
};

// ✅ Initialize Language Model
const model = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.NLP_MODEL,
    baseURL: process.env.OLLAMA_BASE_URL,
});

// ✅ Initialize Embeddings Model
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseURL: process.env.OLLAMA_BASE_URL,
});


// ✅ Load and Process JavaScript Documentation
const documents = (await readFile('./data/javascript.txt', 'utf-8'))
    .toString()
    .split('.')
    .map(sentence => ({
        pageContent: sentence.trim(),
        metadata: {},
    }))
    .filter(doc => doc.pageContent.length > 10); // Avoid empty or too-short documents

const neo4jVectorIndex = await Neo4jVectorStore.fromExistingGraph(ollamaEmbeddings, config);


// ✅ Function to Check and Store Documents with Embeddings
async function addDocumentIfNotExists(doc) {
    const searchResults = await neo4jVectorIndex.similaritySearch(doc.pageContent, 2);
    // console.log("🔍 Search Results:", searchResults);
    if (searchResults.length > 0 && searchResults[0].pageContent === '\ntext: '.concat(doc.pageContent)) {
        // console.log(`🚫 Skipping duplicate: "${doc.pageContent}"`);
    } else {
        console.log(`✅ Adding new document: "${doc.pageContent}"`);
        await neo4jVectorIndex.addDocuments([doc]);
    }
}

// ✅ Add Documents to Vector Store if Not Exists
for (const doc of documents) {
    await addDocumentIfNotExists(doc);
}

// ✅ Function to Answer Questions Based on Stored Context
async function answerQuestion(question) {
    // console.log(`🔍 Processing question: "${question}"`);

    // 2️⃣ Search for Most Relevant Chunks in Neo4j
    const results = await neo4jVectorIndex.similaritySearchWithScore(question, 1);
    const relevantChunks = results.map(result => result[0]?.pageContent?.replaceAll('text: ', '')).filter(Boolean);

    if (relevantChunks.length === 0) {
        console.log("⚠️ No relevant context found.");
        return "Sorry, I couldn't find enough information to answer.";
    }

    // console.log("📌 Relevant chunks found:", relevantChunks);

    // 3️⃣ Construct Prompt for GPT
    const context = relevantChunks.join("\n");
    const prompt = `
        Answer the question concisely and naturally based on the following context:
        Don't use information outside of the provided context.

        Context:
        ${context}

        Question: ${question}

        Provide a direct and informative response:

    `;

    // 4️⃣ Generate Response Using AI Model
    const response = await model.invoke(prompt);

    // console.log("📝 Generated Answer:", response);
    return response;
}


await Promise.all([
    "Is JavaScript a object oriented programing language?",
    "Is JavaScript an interpreted language?",
    "Node.js and JavaScript are the same?",
].map(async question => {
    // ✅ Ask a Question and Get an Answer
    const response = await answerQuestion(question);
    console.log("\n💡 Final Answer:\n", response.content);
    return
}));

// ✅ Close Neo4j Connection
await neo4jVectorIndex.close();