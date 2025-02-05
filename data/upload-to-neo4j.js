import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import csvtojson from 'csvtojson';
import neo4j from 'neo4j-driver';
import readline from 'node:readline';

// ✅ Neo4j Connection
const uri = 'bolt://localhost:7687';
const user = 'neo4j';
const password = 'password';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

const file = createReadStream('./hacker_news_comments.csv');
console.time('Data loaded into Neo4j');

// ✅ Function to Log Progress
function log(message) {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(message);
}

// ✅ Batch Insert Function
async function insertBatch(batch) {
    if (batch.length === 0) return;

    const session = driver.session();
    try {
        await session.writeTransaction(async tx => {
            await tx.run(
                `
                UNWIND $batch AS row
                MERGE (s:Story {story_id: toInteger(row.story_id)})
                  ON CREATE SET s.url = row.story_url, s.author = row.story_author, s.comment_count = toInteger(row.story_comment_count)

                MERGE (u:User {username: row.comment_author})
                  ON CREATE SET u.comment_count = toInteger(row.author_comment_count)

                MERGE (c:Comment {comment_id: toInteger(row.comment_id)})
                  ON CREATE SET c.text = row.comment_text, c.ranking = toInteger(row.comment_ranking)

                MERGE (u)-[:POSTED]->(c)
                MERGE (c)-[:BELONGS_TO]->(s)
                `,
                { batch }
            );
        });
    } catch (error) {
        console.error('❌ Error inserting batch:', error.message);
    } finally {
        await session.close();
    }
}

// ✅ Process CSV File and Batch Insert Data
async function processCSV(batchSize = 100) {
    let batch = [];
    let counter = 0;

    await pipeline(
        file,
        csvtojson(),
        async function* (source) {
            for await (const item of source) {
                for (const line of item.toString().split('\n').filter(Boolean)) {
                    const data = JSON.parse(line);
                    yield data;
                }
            }
        },
        async function* (source) {
            for await (const item of source) {
                batch.push(item);

                // 🚀 Process batch when it reaches batchSize
                if (batch.length >= batchSize) {
                    await insertBatch(batch);
                    counter += batch.length;
                    log(`✅ Processed ${counter} items`);
                    batch = []; // Reset batch
                }
            }

            // 🚀 Process any remaining data in the last batch
            if (batch.length > 0) {
                await insertBatch(batch);
                counter += batch.length;
                log(`✅ Processed ${counter} items`);
            }
        }
    );

    console.log('\n✅ Import Completed!');
}

// ✅ Run the Import Process
await processCSV();
await driver.close();

console.timeEnd('Data loaded into Neo4j');

process.on('exit', () => {
    console.timeEnd('Data loaded into Neo4j');
});
