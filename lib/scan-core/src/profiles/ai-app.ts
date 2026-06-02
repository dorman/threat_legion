import { registerProfile, type AgentSpec, type AiAppFileCategories, type ScanProfileDefinition } from "../scan-profile";
import type { NormTool } from "../ai-provider";

const COORDINATOR_TOOL: NormTool = {
  name: "categorize_files",
  description:
    "Classify codebase files into AI-application security domains for Cursor, agent, and RAG projects.",
  parameters: {
    type: "object",
    properties: {
      auth: {
        type: "array",
        items: { type: "string" },
        description:
          "Auth on LLM/chat endpoints, session handling, API keys for model routes, tenant isolation for retrieval, permission checks before invoking agents",
      },
      injection: {
        type: "array",
        items: { type: "string" },
        description:
          "Prompt injection surfaces, user input merged into system prompts, model output executed as SQL/shell/code, template injection, classic injection in handlers",
      },
      rag: {
        type: "array",
        items: { type: "string" },
        description:
          "RAG pipelines: document loaders, chunkers, embedders, vector DB clients, retrievers, rerankers, context assembly, citation/debug endpoints",
      },
      ai_agent: {
        type: "array",
        items: { type: "string" },
        description:
          "Agent configs, tool/function calling definitions, MCP servers, agent loops, .cursor rules, AGENTS.md, orchestration code that grants model actions",
      },
      dependency: {
        type: "array",
        items: { type: "string" },
        description:
          "Manifest and lockfiles: package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml, etc.",
      },
      general: {
        type: "array",
        items: { type: "string" },
        description: "Remaining application code not clearly in the above AI-security domains",
      },
    },
    required: ["auth", "injection", "rag", "ai_agent", "dependency", "general"],
  },
};

const SPECIALIST_PROMPTS: Record<string, string> = {
  auth: `You are an Auth & Tenant Isolation specialist for AI applications (Cursor, agents, RAG).

Focus on:
- Missing auth on /chat, /generate, /embeddings, /retrieval, or agent invocation routes
- Broken object-level authorization: user A retrieving user B's chunks or conversations
- Shared API keys across tenants; model routes callable without authentication
- Session fixation on chat UIs; insecure JWT on streaming endpoints
- Admin/debug routes exposing other users' prompts or retrieved context

Prioritize issues where an attacker abuses the LLM surface, not generic unrelated auth bugs.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  injection: `You are a Prompt & Tool Injection specialist for AI applications.

Focus on:
- User/retrieved content concatenated into system prompts without sanitization or delimiters
- Indirect prompt injection via documents, emails, web pages ingested into RAG
- Model-chosen tool arguments built from untrusted input (shell, SQL, path, eval)
- Missing output validation before executing model-generated code or commands
- Jailbreak-friendly patterns: "ignore previous instructions", role confusion, delimiter breaks

Search for: systemPrompt + userInput, template literals in prompts, execute/run/eval on model output.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  rag: `You are a RAG & Retrieval Security specialist.

Focus on:
- Vector queries without tenant/user filters (cross-customer data leak)
- Over-broad retrieval (top_k too high, no metadata filters)
- Sensitive data embedded without redaction (PII, credentials in source docs)
- Debug endpoints dumping chunks, embeddings, or similarity scores
- Stale permission checks: index built with ACLs that aren't enforced at query time
- Logging retrieved context or user queries with secrets

Frameworks: LangChain, LlamaIndex, Pinecone, Weaviate, Chroma, pgvector, Supabase vectors.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  ai_agent: `You are an AI Agents & Tools security specialist (MCP, function calling, coding agents).

Focus on:
- Over-privileged tools: filesystem read/write anywhere, unrestricted terminal, network, git push
- Missing human-in-the-loop for destructive tools (delete, deploy, send email)
- Tool allowlists absent or copied from tutorials with all tools enabled
- MCP server configs granting broad host access
- .cursor/rules, AGENTS.md, or agent YAML encouraging unsafe patterns or embedding secrets
- Agents running as privileged OS user on the server

This is Scenario B: the model can *do* things, not just talk. Prioritize actionable tool abuse.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  secrets: `You are a Secrets & AI Config Exposure specialist.

Focus on:
- API keys in .cursor/rules, AGENTS.md, agent configs, client-side bundles, or logged prompts
- OPENAI_API_KEY, ANTHROPIC_API_KEY, or provider keys in committed .env examples
- Keys in MCP configs, LangChain/LlamaIndex init code, or CI workflow files
- Private keys and service account JSON in repos Cursor/agents can read

Use search_files for sk-, ghp_, AKIA, api_key patterns in AI config paths first.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  dependency: `You are a Dependency & Supply Chain specialist for AI stacks.

Focus on:
- AI-related packages with broad install scripts or postinstall hooks
- Typosquatted packages similar to langchain, openai, anthropic, mcp
- Unpinned or wildcard versions on agent frameworks in production
- Dependencies suggested by AI coding tools that look plausible but are unmaintained

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  general: `You are a General AI Application Security specialist.

Focus on:
- Insecure streaming/SSE exposing internal errors or stack traces to clients
- Missing rate limits on expensive model endpoints (cost abuse)
- CORS allowing any origin on chat/agent APIs
- Debug flags left on in production agent servers
- Insecure caching of personalized model responses

Report every confirmed finding with report_finding, then call complete_analysis when done.`,
};

registerProfile({
  id: "ai-app",
  label: "AI app security (Cursor, agents, RAG)",
  coordinatorTool: COORDINATOR_TOOL,
  coordinatorSystem:
    "You are a security scan coordinator for AI-assisted applications. Classify files so specialists can find prompt injection, RAG leaks, and over-powered agent tools.",
  buildCoordinatorUserMessage: (files) => `Classify these ${files.length} files from an AI-assisted codebase (Cursor, agents, and/or RAG):

${files.join("\n")}

Rules:
- auth: LLM/chat route auth, tenant isolation on retrieval, permissions before agent invocation
- injection: prompt injection, user content in system prompts, model output executed as code/SQL/shell
- rag: loaders, chunkers, embedders, vector DB, retrievers, context assembly
- ai_agent: tool definitions, MCP configs, agent loops, .cursor/, AGENTS.md, orchestration
- dependency: package.json, requirements.txt, lockfiles, pyproject.toml, go.mod
- general: everything else

Every file must appear in exactly one category.`,
  formatCategoryLog: (categories) => {
    const c = categories as AiAppFileCategories;
    const total =
      c.auth.length +
      c.injection.length +
      c.rag.length +
      c.ai_agent.length +
      c.dependency.length +
      c.general.length;
    return `Coordinator: ${c.auth.length} auth · ${c.injection.length} injection · ${c.rag.length} rag · ${c.ai_agent.length} agents · ${c.dependency.length} deps · ${c.general.length} general (${total} classified)`;
  },
  fallbackCategories: (files) => ({
    auth: [],
    injection: [],
    rag: [],
    ai_agent: [],
    dependency: [],
    general: files,
  }),
  specialistPrompts: SPECIALIST_PROMPTS,
  buildAgentSpecs: (categories, allFiles) => {
    const c = categories as AiAppFileCategories;
    const secretsCandidates = [
      ...c.ai_agent,
      ...c.rag,
      ...allFiles.filter((f) => /\.env|secret|config|cursor|agent|mcp/i.test(f)),
    ];
    const secretsFiles = [...new Set(secretsCandidates)].slice(0, 25);

    return [
      { role: "auth", label: "Auth & Tenant Isolation", assignedFiles: c.auth },
      { role: "injection", label: "Prompt & Tool Injection", assignedFiles: c.injection },
      { role: "rag", label: "RAG & Retrieval Security", assignedFiles: c.rag },
      { role: "ai_agent", label: "AI Agents & Tools", assignedFiles: c.ai_agent },
      { role: "secrets", label: "Secrets & AI Config", assignedFiles: secretsFiles },
      { role: "dependency", label: "AI Dependency Security", assignedFiles: c.dependency },
      { role: "general", label: "General AI App Security", assignedFiles: c.general },
    ].filter((spec) => spec.assignedFiles.length > 0) as AgentSpec[];
  },
  buildScanContext: (deltaScan) =>
    deltaScan
      ? "This is a PR delta scan for an AI-assisted app. Prioritize new prompt injection, RAG isolation, and agent tool risks introduced in this diff. Changed files may include .cursor rules, agent configs, and retrieval code."
      : "Analyse this AI-assisted codebase (Cursor, agents, RAG). Focus on failures common when code is AI-generated or orchestrates models.",
  synthesizerSystem:
    "You are a senior AI application security analyst. Summarize risks specific to LLM apps: prompt injection, retrieval leaks, and over-privileged agent tools.",
  buildSynthesizerUserMessage: ({ projectName, critCount, highCount, medCount, lowCount, findingSummary }) =>
    `Project: ${projectName} (AI app — Cursor/agents/RAG)

Scan results:
- Critical: ${critCount}
- High: ${highCount}
- Medium: ${medCount}
- Low: ${lowCount}

Findings:
${findingSummary || "No findings reported"}

Write an executive summary for a developer who ships AI features. Highlight prompt injection, RAG tenant leaks, and dangerous agent tools first. Score from 100 minus: 20/critical, 10/high, 5/medium, 2/low.`,
});
