import { createServer } from "node:http"
import { once } from "node:events"
import { prompt } from "./ai.js"

// const DEBUG_ENABLED = false
const DEBUG_ENABLED = true
const debugLog = (...args) => {
    if (!DEBUG_ENABLED) return

    console.log(...args);
    // const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg);
    // response.write(msg.toString() + "\n");
}

// await prompt("what student is over 80% progress?");
// await prompt("what reached more than 80% progress?");
// await prompt("what engaged has progress over 80%");
// await prompt("how many students enrolled in the 'Machine Learning em Navegadores' course");
// await prompt("how many students asked for refund in the 'Machine Learning em Navegadores' course");
// await prompt("quantos estudantes pediram reembolso no curso Mastering Node.js Streams?");
// await prompt("quem são os estudantes que tem progresso acima de 80%??");
// await prompt("qual estudante tem progresso abaixo de 80%?");
// await prompt("quem progrediu acima de 80% ?");
await prompt("quem progrediu abaixo de 80% ?", debugLog);


createServer(async (request, response) => {
    try {
        if (request.url === '/v1/chat' && request.method === 'POST') {
            const data = JSON.parse(await once(request, 'data'))
            logger("🔹 Received AI Prompt:", data.prompt);

            const aiResponse = await prompt(data.prompt, debugLog);

            response.end(aiResponse.answer || aiResponse.error);
            return
        }

        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ message: "Not Found" }));

    } catch (error) {
        console.error("❌ AI Backend Error:", error.stack);
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ message: "Internal Server Error" }));
    }

}).listen(process.env.PORT || 3002, () => console.log("🚀 AI Backend running on port 3001"));
