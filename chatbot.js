// import dotenv from "dotenv";
// dotenv.config();

import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY,
});
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function webSearch({ query }) {
    const response = await tvly.search(query);

    return response.results.map(results => results.content).join("\n\n")
}

export async function generate(userMessage) {

    const messages = [
        {
            role: 'system',
            content: `For latest information call webSearch tool`
        }, {
            role: 'user',
            content: userMessage
        }
    ]

    while (true) {
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