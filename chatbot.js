// import dotenv from "dotenv";
// dotenv.config();

import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY,
});
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const myCache = new NodeCache({
    stdTTL: 60 * 60 * 24
})

async function webSearch({ query }) {
    const response = await tvly.search(query);

    return response.results.map(results => results.content).join("\n\n")
}

export async function generate(userMessage, threadId) {

    let messages = myCache.get(threadId);

    console.log({ messages });


    if (!messages) {
        messages = [
            {
                role: 'system',
                content: `Today's date time is ${new Date().toLocaleString()}. For the latest or real-time information, call the webSearch tool.
                        Example:
                        User: "What is the weather today in Tokyo?"
                        Tool Call: webSearch({ query: "Tokyo weather 2026-06-15" })
                        Tool Output: "Sunny, 22°C"
                        Assistant: "The weather in Tokyo today is sunny and 22°C."`
            }
        ];
    }

    messages.push({
        role: 'user',
        content: userMessage
    });

    const MAX_RETRIES = 10;

    for (let i = 0; i < MAX_RETRIES; i++) {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            messages: messages,
            tools: [
                {
                    "type": "function",
                    "function": {
                        "name": "webSearch",
                        "description": "Search the latest information and realtime data on the internet",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The search query to perform search on."
                                },
                            }
                        },
                        "required": ["query"]
                    }
                }
            ],
            tool_choice: 'auto'
        });


        messages.push(completion.choices[0].message)

        const toolCalls = completion.choices[0].message.tool_calls;

        if (!toolCalls) {
            myCache.set(threadId, messages)
            return completion.choices[0].message.content
        }

        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionParams = toolCall.function.arguments;

            if (functionName === "webSearch") {
                const result = await webSearch(JSON.parse(functionParams));

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: result
                })
            }
        }

    }

}

export function clearSession(threadId) {
    if (threadId) {
        myCache.del(threadId);
    }
}