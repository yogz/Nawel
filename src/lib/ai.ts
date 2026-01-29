import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

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
const mistralModel = vercelAiGateway("mistral/mistral-nemo");

class FallbackLanguageModel {
  specificationVersion = "v3" as const;
  provider = "fallback";
  modelId = "fallback-model";

  constructor(
    private primary: any,
    private secondary: any
  ) {}

  async doGenerate(options: any) {
    try {
      return await this.primary.doGenerate(options);
    } catch (error) {
      console.warn("Primary model failed, failing back to secondary", error);
      return await this.secondary.doGenerate(options);
    }
  }

  async doStream(options: any) {
    try {
      return await this.primary.doStream(options);
    } catch (error) {
      console.warn("Primary model failed, failing back to secondary", error);
      return await this.secondary.doStream(options);
    }
  }
}

export const aiModel = new FallbackLanguageModel(
  geminiModel,
  mistralModel
) as unknown as LanguageModel;
