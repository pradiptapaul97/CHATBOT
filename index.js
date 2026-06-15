import "dotenv/config";
import express from "express";
import { generate, clearSession, hasSession } from "./chatbot.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and serving static files
app.use(express.json());
app.use(express.static("public"));

// Chat API Endpoint
app.post("/api/chat", async (req, res) => {
    try {
        const { message, threadId, hasHistory } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        const botResponse = await generate(message, threadId, hasHistory);

        res.json({ response: botResponse });
    } catch (error) {
        console.error("Error in chat route:", error);

        let clientMessage = error.message || "Something went wrong.";
        let errorCode = "unknown";

        if (clientMessage.includes("Session expired")) {
            clientMessage = "Your session has expired (the server was restarted or cache cleared). Please clear the conversation history and start again.";
            errorCode = "session_expired";
        } else if (error.status === 413 || clientMessage.includes("rate_limit_exceeded") || clientMessage.includes("Limit 12000") || clientMessage.includes("TPM")) {
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

// Clear Cache API Endpoint
app.post("/api/chat/clear", async (req, res) => {
    try {
        const { threadId } = req.body;
        if (threadId) {
            clearSession(threadId);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Error in clear route:", error);
        res.status(500).json({ error: "Failed to clear session cache" });
    }
});

// Check Session API Endpoint
app.get("/api/chat/check", async (req, res) => {
    try {
        const { threadId } = req.query;
        const exists = threadId ? hasSession(threadId) : false;
        res.json({ exists });
    } catch (error) {
        console.error("Error in check route:", error);
        res.status(500).json({ error: "Failed to check session" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Chatbot server is running at http://localhost:${PORT}`);
});
