import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";

import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";

const url = process.env.NEO4J_URI;
const username = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

const graph = await Neo4jGraph.initialize({ url, username, password, enhancedSchema: true });
// const embeddings = new OpenAIEmbeddings({
//     model: process.env.OPENAI_MODEL
// });

// console.log('embedings', await embeddings.embedQuery("Hello, world!"));

// const model = new ChatOllama({
//     temperature: 0,// temperature: 0 ensures deterministic responses (less randomness).
//     maxRetries: 2,
//     model: process.env.OPENAI_MODEL,
//     configuration: {
//         baseURL: process.env.OPENAI_BASE_URL,
//     }
// });


const model = new ChatOpenAI({
    temperature: 0,// temperature: 0 ensures deterministic responses (less randomness).
    maxRetries: 2,
    model: process.env.OPENAI_MODEL,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
    // streaming: true,
});




// Populate the database with two nodes and a relationship
// await graph.query(
//     "CREATE (a:Actor {name:'Bruce Willis'})" +
//     "-[:ACTED_IN]->(:Movie {title: 'Pulp Fiction'})"
// );

// Refresh schema
await graph.refreshSchema();
// console.log('getSchema:::::', graph.getSchema())
// const chain = GraphCypherQAChain.fromLLM({
//     llm: model,
//     graph,
// });

// const res = await model.invoke([
//     [
//         "human",
//         "What would be a good company name for a company that makes colorful socks?",
//     ],
// ]);

const question = "What is the story actor who has the most comments?";
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
    console.log('AI FOUND:::\n', res.content?.replaceAll('```', '').replaceAll('cypher', ''));

    process.exit(0);
    // Bruce Willis played in Pulp Fiction.
} catch (error) {
    console.error('error***', error);
    process.exit(1);
}