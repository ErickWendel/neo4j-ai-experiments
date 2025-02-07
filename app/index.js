import { createServer } from "node:http"
import { once } from "node:events"
import { prompt } from "./ai.js"

// await prompt("what student is over 80% progress?");
// await prompt("what reached more than 80% progress?");
// await prompt("what engaged has progress over 80%");
// await prompt("how many students enrolled in the 'Machine Learning em Navegadores' course");
// await prompt("how many students asked for refund in the 'Machine Learning em Navegadores' course");
await prompt("quantos estudantes pediram reembolso no curso Mastering Node.js Streams?");
// await prompt("quem são os estudantes que tem progresso acima de 80%??");
// console.log(response.answer);

createServer(async (req, res) => {
    try {
        // curl -X POST -H "Content-Type: application/json" -d '{"prompt": "What is the most popular post?"}' http://localhost:3001/v1/chat/completions
        if (req.url === '/v1/chat/completions' && req.method === 'POST') {
            const data = JSON.parse(await once(req, 'data'))

            console.log("🔹 Received AI Prompt:", data);
            const response = await prompt(data);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
            return
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: "Not Found" }));

    } catch (error) {
        console.error("❌ AI Backend Error:", error.stack);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: "Internal Server Error" }));
    }

}).listen(process.env.PORT || 3002, () => console.log("🚀 AI Backend running on port 3001"));
