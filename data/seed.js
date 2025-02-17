import neo4j from "neo4j-driver";
import { faker } from "@faker-js/faker";
import { readFile } from "node:fs/promises";

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

const courses = JSON.parse(await readFile("./data/courses.json"));

const students = Array.from({ length: 20 }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
}));

const salesRecords = students.flatMap(student => {
    return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => ({
        studentId: student.id,
        courseId: faker.helpers.arrayElement(courses).name,
        status: faker.helpers.arrayElement(["paid", "refunded"]),
        paymentMethod: faker.helpers.arrayElement(["pix", "credit_card"]),
        paymentDate: faker.date.past().toISOString(),
        amount: faker.number.float({ min: 0, max: 2000, precision: 0.01 }),
    }));
});

const progressRecords = salesRecords
    .filter(sale => sale.status === "paid")
    .map(sale => ({
        studentId: sale.studentId,
        courseId: sale.courseId,
        progress: faker.number.int({ min: 0, max: 100 }),
    }));

async function insertData() {
    // await session.run(`MATCH (n) DETACH DELETE n`);
    // console.log("🧹 Database cleared!");

    await session.run(
        `UNWIND $batch AS row
        MERGE (c:Course {name: row.name})
        ON CREATE SET c.url = row.url`,
        { batch: courses }
    );
    console.log("✅ Courses Inserted!");

    await session.run(
        `UNWIND $batch AS row
        MERGE (s:Student {id: row.id})
        ON CREATE SET s.name = row.name, s.email = row.email, s.phone = row.phone`,
        { batch: students }
    );
    console.log("✅ Students Inserted!");

    await session.run(
        `UNWIND $batch AS row
        MATCH (s:Student {id: row.studentId}), (c:Course {name: row.courseId})
        MERGE (s)-[p:PURCHASED]->(c)
        ON CREATE SET p.status = row.status, p.paymentMethod = row.paymentMethod, p.paymentDate = row.paymentDate, p.amount = row.amount
        ON MATCH SET p.status = row.status, p.paymentMethod = row.paymentMethod, p.paymentDate = row.paymentDate, p.amount = row.amount`,
        { batch: salesRecords }
    );
    console.log("✅ Sales Inserted!");

    await session.run(
        `UNWIND $batch AS row
        MATCH (s:Student {id: row.studentId})-[:PURCHASED {status: "paid"}]->(c:Course {name: row.courseId})
        MERGE (s)-[p:PROGRESS]->(c)
        ON CREATE SET p.progress = row.progress
        ON MATCH SET p.progress = row.progress`,
        { batch: progressRecords }
    );
    console.log("✅ Progress Inserted!");

    await session.close();
    await driver.close();
}

await insertData();
