import "dotenv/config";
import express from "express";
import { generate } from "./chatbot.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and serving static files
app.use(express.json());
app.use(express.static("public"));

// Chat API Endpoint
app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        const botResponse = await generate(message);

        res.json({ response: botResponse });
    } catch (error) {
        console.error("Error in chat route:", error);

        let clientMessage = error.message || "Something went wrong.";
        let errorCode = "unknown";

        // Check if error is related to token limits (TPM)
        if (error.status === 413 || clientMessage.includes("rate_limit_exceeded") || clientMessage.includes("Limit 12000") || clientMessage.includes("TPM")) {
            clientMessage = "The request has exceeded the token rate limit (TPM). This is usually caused by long conversations or large search tool results. Click below to clear the history and try again.";
            errorCode = "request_too_large";
        } else if (error.status === 429 || clientMessage.includes("429") || clientMessage.includes("Rate limit")) {
            clientMessage = "Too many requests. Please wait a moment before sending another message.";
            errorCode = "rate_limit";
        }

        res.status(500).json({
            error: clientMessage,
            code: errorCode
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Chatbot server is running at http://localhost:${PORT}`);
});
