import { createOpenAI } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

/**
 * Vercel AI Gateway Configuration
 * Reference: https://vercel.com/docs/ai-gateway/openai-compat
 */
const vercelAiGateway = createOpenAI({
  name: "vercel-ai-gateway",
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1",
});

const geminiModel = vercelAiGateway("google/gemini-2.0-flash-lite");

export const aiModel = wrapLanguageModel({
  model: geminiModel,
  middleware: {
    specificationVersion: "v3",
    transformParams: async ({ params }) => {
      return {
        ...params,
        providerOptions: {
          ...params.providerOptions,
          gateway: {
            ...params.providerOptions?.gateway,
            models: ["mistral/mistral-nemo"],
          },
        },
      };
    },
  },
});
