import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";


const url = process.env.NEO4J_URI;
const username = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

const graph = await Neo4jGraph.initialize({ url, username, password, enhancedSchema: true });

const model = new ChatOllama({
    temperature: 0,// temperature: 0 ensures deterministic responses (less randomness).
    maxRetries: 2,
    model: process.env.OPENAI_MODEL,
    baseURL: process.env.OPENAI_BASE_URL,
});


// Populate the database with two nodes and a relationship
// await graph.query(
//     "CREATE (a:Actor {name:'Bruce Willis'})" +
//     "-[:ACTED_IN]->(:Movie {title: 'Pulp Fiction'})"
// );

const ollamaEmbeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseURL: process.env.OPENAI_BASE_URL,
});

const embeddings = await ollamaEmbeddings.embedQuery("Hello, world!")
// console.log('embedings',);


// // Refresh schema
// await graph.refreshSchema();
// console.log('getSchema:::::', graph.getSchema())


const question = "how many comments does the actor who has more story comments have?";
try {


    const res = await model.invoke([
        "system",
        `
            You are an AI that translates natural language questions into Neo4j Cypher queries that will be executed on neo4j
            The database contains: ${graph.getSchema()}

            and the question is: ${question}

            Generate an optimized Cypher query that returns a useful answer.
            DO NOT EXPLAIN, ONLY RETURN THE QUERY WITHOUT COMMENTS.
    `,
    ]);
    const data = res.content?.replaceAll('```', '').replaceAll('cypher', '')
    console.log('AI FOUND:::\n', data);
    const neo = await graph.query(data)
    console.log('NEO4J RESPONSE:::\n', neo);

    process.exit(0);
    // Bruce Willis played in Pulp Fiction.
} catch (error) {
    console.error('error***', error);
    process.exit(1);
}