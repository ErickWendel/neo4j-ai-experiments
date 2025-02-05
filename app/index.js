import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import "dotenv/config";


const config = {
    url: process.env.NEO4J_URI,
    username: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
    indexName: "vector_index",
    keywordIndexName: "keyword_index",
    searchType: "vector",
    nodeLabel: "Chunk",
    textNodeProperties: ["text"],
    embeddingNodeProperty: "embedding",
};

// ✅ Initialize Neo4j Graph Connection
const graph = await Neo4jGraph.initialize({
    url: config.url,
    username: config.username,
    password: config.password,
    enhancedSchema: true
});

// ✅ Initialize Ollama Model (for AI Responses)
const model = new ChatOllama({
    temperature: 0,
    maxRetries: 2,
    model: process.env.OPENAI_MODEL,
    baseURL: process.env.OPENAI_BASE_URL,
});

// ✅ Initialize Ollama Embeddings Model (for Vector Search)
const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseURL: process.env.OPENAI_BASE_URL,
});

// ✅ Step 1: Check if Vector Index Exists in Neo4j
async function checkAndCreateVectorIndex() {
    try {
        const result = await graph.query(`
            SHOW INDEXES
            YIELD name
            WHERE name = $indexName
            RETURN name
        `, { indexName: config.indexName });

        if (result.length === 0) {
            console.log("⚠️ Vector index does not exist. Creating it now...");
            await graph.query(`
                CREATE VECTOR INDEX ${config.indexName}
                IF NOT EXISTS
                FOR (n:${config.nodeLabel})
                ON (n.${config.embeddingNodeProperty});
            `);
            console.log("✅ Vector index created successfully.");
        } else {
            console.log("✅ Vector index already exists.");
        }
    } catch (error) {
        console.error("❌ Error checking/creating vector index:", error.message);
    }
}



// ✅ Ensure the index exists before initializing the vector store
await checkAndCreateVectorIndex();

// ✅ Initialize Neo4j Vector Store AFTER ensuring index exists
const neo4jVectorIndex = await Neo4jVectorStore.fromExistingGraph(ollamaEmbeddings, config);

async function answerQuestion(question) {
    console.log(`🔍 Searching Neo4j vector store for relevant answers...`);

    // ✅ Step 1: Search for Similar Vector in Neo4j
    let vectorResults;
    try {
        vectorResults = await neo4jVectorIndex.similaritySearch(question, 1);
    } catch (error) {
        console.error("❌ Vector search failed:", error.message);
        vectorResults = [];
    }

    if (vectorResults.length > 0) {
        console.log("✅ Vector match found in Neo4j!");
        console.log(vectorResults);
        return vectorResults[0].pageContent;
    }

    console.log("⚠️ No vector match found, generating Cypher query via Llama...");

    // ✅ Step 2: Use Llama to Generate a Cypher Query
    const res = await model.invoke([
        "system",
        `
            You are an AI that translates natural language questions into **only** Neo4j Cypher queries. The queries will be **executed directly** on Neo4j.

            ### **Database Schema**
            ${await graph.getSchema()}

            ### **Instructions**
            - **DO NOT** add explanations, context, or introductions.
            - **DO NOT** include text like "Here's your Cypher query" or "This is the answer."
            - **ONLY** return the **raw Cypher query** with no extra text.
            - **DO NOT** wrap the response in code blocks (no "cypher" formatting).

            ### ** User Question **
        "${question}"

            ### ** Expected Output **
        (Return only the optimized Cypher query)
        `,
    ]);


    const query = res.content?.replaceAll('```', '').replaceAll('cypher', '').trim();
    console.log('🤖 AI Generated Cypher Query:\n', query);

    // ✅ Step 3: Execute Query on Neo4j
    let neo4jResponse;
    try {
        neo4jResponse = await graph.query(query);
        console.log('🟢 Neo4j Response:\n', neo4jResponse);
    } catch (error) {
        console.error("❌ Neo4j Query Execution Failed:", error.message);
        return "I couldn't retrieve data from the database.";
    }

    // ✅ Step 4: Convert Neo4j Results into a Natural Language Answer via Llama
    const structuredResponse = JSON.stringify(neo4jResponse);
    const aiResponse = await model.invoke([
        "system",
        `
            You are an AI assistant that converts database query results into natural language responses.
            The database returned the following JSON data: ${structuredResponse}

            Convert this into a clear and concise response for a human user. return only the query without comments.
        `,
    ]);

    console.log("\n📢 Final NLP Response to User:\n", aiResponse.content);

    // ✅ Step 5: Store the New Question & Answer in Neo4j Vector Store
    console.log("💾 Storing new question-answer pair in Neo4j...");
    await neo4jVectorIndex.addDocuments([
        { pageContent: aiResponse.content, metadata: { question: question } }
    ]);

    console.log("✅ New data stored in Neo4j Vector Store!");

    return aiResponse.content;
}

// ✅ Example Question
const question = "How many comments does the actor who has more story comments have and who he is?";
answerQuestion(question).then(response => {
    console.log("\n📢 Final Response to User:\n", response);
    process.exit(0);
}).catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
});
