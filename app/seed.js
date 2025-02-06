import neo4j from "neo4j-driver";
import { faker } from "@faker-js/faker";

// ✅ Neo4j Connection
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD) // Replace with your credentials
);
const session = driver.session();

// ✅ Courses Data
const courses = [
    { name: "Formação JavaScript Expert", url: "https://ew.academy/javascript-expert" },
    { name: "Método Testes Automatizados em JavaScript", url: "https://ew.academy/metodo-tajs" },
    { name: "Mastering Node.js Streams", url: "https://ew.academy/nodejsstreams" },
    { name: "Recriando o Player de Vídeo da Netflix", url: "https://ew.academy/recriando-a-netflix" },
    { name: "Criando seu Próprio App Zoom com WebRTC e WebSockets", url: "https://ew.academy/zoom" },
    { name: "Recriando o App Clubhouse" },
    { name: "Reimaginando o Multi-Upload de Arquivos do Google Drive", url: "https://ew.academy/recriando-google-drive" },
    { name: "Reimaginando um Rádio Musical Online Usando Spotify como Exemplo" },
    { name: "Machine Learning em Navegadores" },
    { name: "Reimaginando o Processamento de Vídeos do Maior Site do Mundo" }
];

// ✅ Generate Students
const students = Array.from({ length: 20 }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
}));

// ✅ Generate Sales Data (Students must buy the course first)
const salesRecords = students.flatMap(student => {
    const numSales = faker.number.int({ min: 1, max: 10 });
    return Array.from({ length: numSales }, () => {
        const course = faker.helpers.arrayElement(courses);
        return {
            studentId: student.id,
            courseId: course.name,
            status: faker.helpers.arrayElement(["paid", "refunded"]),
            paymentMethod: faker.helpers.arrayElement(["pix", "credit_card"]),
            paymentDate: faker.date.past().toISOString(),
            amount: faker.number.float({ min: 0, max: 2000, precision: 0.01 }),
        };
    });
});

// ✅ Generate Progress Data (Only for Purchased Courses)
const progressRecords = salesRecords.flatMap(sale => {
    // Ensure progress exists only for "paid" courses
    if (sale.status === "paid") {
        return {
            studentId: sale.studentId,
            courseId: sale.courseId,
            progress: faker.number.int({ min: 0, max: 100 }),
        };
    }
    return [];  // Skip if the purchase was refunded
});


// ✅ Clear the Database Before Running
async function clearDatabase() {
    try {
        await session.run(`MATCH (n) DETACH DELETE n`);
        console.log("🧹 Database cleared!");
    } catch (error) {
        console.error("❌ Error clearing database:", error);
    }
}

// ✅ Insert Data into Neo4j Using Batches
async function insertData() {
    try {
        await clearDatabase();

        // 🔹 Insert Courses
        await session.run(
            `UNWIND $batch AS row
            MERGE (c:Course {name: row.name})
            ON CREATE SET c.url = row.url`,
            { batch: courses }
        );
        console.log("✅ Courses Inserted!");

        // 🔹 Insert Students
        await session.run(
            `UNWIND $batch AS row
            MERGE (s:Student {id: row.id})
            ON CREATE SET s.name = row.name, s.email = row.email, s.phone = row.phone`,
            { batch: students }
        );
        console.log("✅ Students Inserted!");

        await session.run(
            `UNWIND $batch AS row
            MATCH (s:Student {id: row.studentId})-[:PURCHASED]->(c:Course {name: row.courseId})  // 🔥 Ensure student has purchased the course
            MERGE (s)-[p:PROGRESS]->(c)
            ON CREATE SET p.progress = row.progress
            ON MATCH SET p.progress = row.progress`,  // 🔥 Ensures progress is updated, not duplicated
            { batch: progressRecords }
        );
        console.log("✅ Progress Inserted!");

        // ✅ Insert Sales (Ensure only one purchase/refund per student per course)
        await session.run(
            `UNWIND $batch AS row
    MATCH (s:Student {id: row.studentId}), (c:Course {name: row.courseId})
    MERGE (s)-[p:PURCHASED]->(c)
    ON CREATE SET p.status = row.status, p.paymentMethod = row.paymentMethod, p.paymentDate = row.paymentDate, p.amount = row.amount
    ON MATCH SET p.status = row.status, p.paymentMethod = row.paymentMethod, p.paymentDate = row.paymentDate, p.amount = row.amount`,  // 🔥 Ensures only one purchase record exists per student-course
            { batch: salesRecords }
        );
        console.log("✅ Sales Inserted!");


    } catch (error) {
        console.error("❌ Error inserting data:", error);
    } finally {
        await session.close();
        await driver.close();
    }
}

// ✅ Run the Script
await insertData();
