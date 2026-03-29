import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AIProvider = "anthropic" | "openai" | "deepseek" | "groq" | "minimax" | "gemini";

export interface LLMConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface NormTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  minimax: "MiniMax-M2.7",
  gemini: "gemini-2.0-flash",
};

const OPENAI_BASE_URLS: Partial<Record<AIProvider, string>> = {
  deepseek: "https://api.deepseek.com",
  groq: "https://api.groq.com/openai/v1",
  minimax: "https://api.minimax.io/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

function getModel(config: LLMConfig): string {
  return config.model ?? DEFAULT_MODELS[config.provider];
}

// ============================================================
// RETRY WITH EXPONENTIAL BACKOFF
// Retries on 429 rate-limit errors up to maxRetries times
// ============================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  baseDelayMs = 3000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("too many requests") ||
        msg.toLowerCase().includes("ratelimit");
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }
  // unreachable, but satisfies TypeScript
  throw new Error("withRetry exhausted");
}

function toAnthropicTool(t: NormTool): Anthropic.Tool {
  return {
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool["input_schema"],
  };
}

function toOpenAITool(t: NormTool): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as OpenAI.FunctionParameters,
    },
  };
}

// ============================================================
// FORCED TOOL CALL
// Forces the model to call a specific tool and returns its input
// ============================================================

export async function callForcedTool<T>(
  config: LLMConfig,
  params: {
    system: string;
    userMessage: string;
    tool: NormTool;
    maxTokens: number;
  }
): Promise<T | null> {
  const model = getModel(config);

  if (config.provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: params.maxTokens,
        system: params.system,
        tools: [toAnthropicTool(params.tool)],
        tool_choice: { type: "tool", name: params.tool.name },
        messages: [{ role: "user", content: params.userMessage }],
      })
    );
    const block = response.content.find((b) => b.type === "tool_use");
    if (block && "input" in block) return block.input as T;
    return null;
  }

  // OpenAI-compatible
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: OPENAI_BASE_URLS[config.provider],
  });
  const response = await withRetry(() =>
    client.chat.completions.create({
      model,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.userMessage },
      ],
      tools: [toOpenAITool(params.tool)],
      tool_choice: { type: "function", function: { name: params.tool.name } },
    })
  );
  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.type === "function") {
    return JSON.parse(toolCall.function.arguments) as T;
  }
  return null;
}

// ============================================================
// AGENTIC LOOP
// Runs a multi-turn tool-use loop until the agent signals done
// ============================================================

export async function runAgentLoop(
  config: LLMConfig,
  params: {
    system: string;
    initialMessage: string;
    tools: NormTool[];
    maxTokens: number;
    maxIterations: number;
    onToolCall: (
      name: string,
      input: unknown
    ) => Promise<{ result: string; isDone: boolean }>;
  }
): Promise<void> {
  const model = getModel(config);

  if (config.provider === "anthropic") {
    await runAnthropicAgentLoop(config.apiKey, model, params);
  } else {
    await runOpenAIAgentLoop(config, model, params);
  }
}

async function runAnthropicAgentLoop(
  apiKey: string,
  model: string,
  params: Parameters<typeof runAgentLoop>[1]
): Promise<void> {
  const client = new Anthropic({ apiKey });
  const tools = params.tools.map(toAnthropicTool);

  type AnthropicMsg = Anthropic.Messages.MessageParam;
  const messages: AnthropicMsg[] = [
    { role: "user", content: params.initialMessage },
  ];

  let done = false;
  let iterations = 0;

  while (!done && iterations < params.maxIterations) {
    iterations++;

    const response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: params.maxTokens,
        system: params.system,
        tools,
        messages,
      })
    );

    messages.push({
      role: "assistant",
      content: response.content as Anthropic.Messages.ContentBlock[],
    });

    if (response.stop_reason === "end_turn") break;

    const toolBlocks = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );
    if (toolBlocks.length === 0) break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of toolBlocks) {
      const { result, isDone } = await params.onToolCall(block.name, block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
      if (isDone) done = true;
    }

    messages.push({ role: "user", content: toolResults });
    if (done) break;
  }
}

async function runOpenAIAgentLoop(
  config: LLMConfig,
  model: string,
  params: Parameters<typeof runAgentLoop>[1]
): Promise<void> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: OPENAI_BASE_URLS[config.provider],
  });
  const tools = params.tools.map(toOpenAITool);

  type OAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
  const messages: OAIMsg[] = [
    { role: "system", content: params.system },
    { role: "user", content: params.initialMessage },
  ];

  let done = false;
  let iterations = 0;

  while (!done && iterations < params.maxIterations) {
    iterations++;

    const response = await withRetry(() =>
      client.chat.completions.create({
        model,
        max_tokens: params.maxTokens,
        messages,
        tools,
      })
    );

    const choice = response.choices[0];
    if (!choice) break;

    messages.push(choice.message as OAIMsg);

    if (choice.finish_reason === "stop") break;

    const toolCalls = choice.message.tool_calls ?? [];
    if (toolCalls.length === 0) break;

    for (const tc of toolCalls) {
      if (tc.type !== "function") continue;
      let input: unknown;
      try {
        input = JSON.parse(tc.function.arguments);
      } catch {
        input = {};
      }
      const { result, isDone } = await params.onToolCall(tc.function.name, input);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
      if (isDone) done = true;
    }

    if (done) break;
  }
}
