"use server";
// streamingChatCompletion.ts
import { OpenAI } from 'openai';
import { config } from '../config';

let openai: OpenAI;
if (config.useOllamaInference) {
    openai = new OpenAI({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama'
    });
} else {
    openai = new OpenAI({
        baseURL: config.nonOllamaBaseURL,
        apiKey: config.inferenceAPIKey
    });
}

export async function streamingChatCompletion(
    userMessage: string,
    vectorResults: any,
    streamable: any,
    searchResults: any[]
): Promise<string> {
    // Format vector results with source numbers
    const formattedResults = vectorResults.map((result: any, index: number) => ({
        ...result,
        sourceNumber: index + 1
    }));

    // Format search results with numbers
    const formattedSearchResults = searchResults.map((result, index) => ({
        number: index + 1,
        title: result.title,
        link: result.link
    }));

    const chatCompletion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `
          - Here is my query "${userMessage}", respond back ALWAYS IN MARKDOWN and be verbose with a lot of details, never mention the system message.
          - Always cite your sources using [Source X] format where X is the number of the source.
          - Each source is numbered from 1 to ${formattedSearchResults.length}.
          - After citing a source, include its link in a reference list at the end of your response.
          - If you can't find any relevant results, respond with "No relevant results found."
        `,
            },
            {
                role: "user",
                content: `Here are the numbered sources to use in your response:

Content from sources:
${JSON.stringify(formattedResults, null, 2)}

Source References:
${JSON.stringify(formattedSearchResults, null, 2)}

Please provide a detailed answer using these sources, citing them with [Source X] format. Include a reference list at the end with the links to the cited sources.`,
            },
        ],
        stream: true,
        model: config.inferenceModel,
    });

    let accumulatedLLMResponse = "";
    for await (const chunk of chatCompletion) {
        if (
            chunk.choices[0].delta &&
            chunk.choices[0].finish_reason !== "stop" &&
            chunk.choices[0].delta.content !== null
        ) {
            streamable.update({ llmResponse: chunk.choices[0].delta.content });
            accumulatedLLMResponse += chunk.choices[0].delta.content;
        } else if (chunk.choices[0].finish_reason === "stop") {
            streamable.update({ llmResponseEnd: true });
        }
    }

    return accumulatedLLMResponse;
}