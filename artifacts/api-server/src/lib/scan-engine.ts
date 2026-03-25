import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, scansTable, findingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getRepoFileTree, getFileContent } from "./github";
import { logger } from "./logger";

// ============================================================
// PUBLIC TYPES
// ============================================================

export type ScanEvent =
  | { type: "log"; message: string }
  | { type: "finding"; finding: FindingData }
  | { type: "complete"; score: number; summary: string }
  | { type: "error"; message: string };

export type FindingData = {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  description: string;
  remediation: string;
  codeSnippet?: string;
};

// ============================================================
// INTERNAL TYPES (Anthropic SDK shapes)
// ============================================================

type CreateParams = Parameters<typeof anthropic.messages.create>[0];
type MessageParam = CreateParams["messages"][number];
type ToolDef = NonNullable<CreateParams["tools"]>[number];

type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown };
type ResponseBlock = TextBlock | ToolUseBlock;
type ToolResultParam = { type: "tool_result"; tool_use_id: string; content: string };

type AgentRole = "auth" | "injection" | "secrets" | "dependency" | "general";

interface FileCategories {
  auth: string[];
  injection: string[];
  dependency: string[];
  general: string[];
}

interface AgentSpec {
  role: AgentRole;
  label: string;
  assignedFiles: string[];
}

// ============================================================
// CONCURRENCY HELPER
// ============================================================

async function runConcurrently<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then((r) => {
      results.push(r);
    });
    const wrapper = p.then(() => {
      executing.delete(wrapper);
    });
    executing.add(wrapper);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}

// ============================================================
// TOOL DEFINITIONS
// ============================================================

const COORDINATOR_TOOL: ToolDef = {
  name: "categorize_files",
  description:
    "Classify repository files into security analysis domains. Each file should appear in exactly one category (except config files which always go to dependency if they're manifests, or general otherwise). The secrets agent searches all files automatically so do not add files to a secrets category.",
  input_schema: {
    type: "object" as const,
    properties: {
      auth: {
        type: "array",
        items: { type: "string" },
        description:
          "Files handling authentication, authorization, sessions, JWT tokens, OAuth, passwords, permissions, middleware guards",
      },
      injection: {
        type: "array",
        items: { type: "string" },
        description:
          "Files handling database queries, SQL/ORM operations, user input processing, request bodies, template rendering, file paths from user input",
      },
      dependency: {
        type: "array",
        items: { type: "string" },
        description:
          "Package manifest files: package.json, requirements.txt, Gemfile, go.mod, Cargo.toml, composer.json, pom.xml, build.gradle, .lock files",
      },
      general: {
        type: "array",
        items: { type: "string" },
        description:
          "All remaining files: API routes, config files, utility code, anything not in the above categories",
      },
    },
    required: ["auth", "injection", "dependency", "general"],
  },
};

const SYNTHESIZER_TOOL: ToolDef = {
  name: "produce_report",
  description: "Produce the final security report after reviewing all agent findings",
  input_schema: {
    type: "object" as const,
    properties: {
      score: {
        type: "number",
        description:
          "Overall security score from 0–100. Start at 100. Deduct: 20 per critical, 10 per high, 5 per medium, 2 per low. Minimum 0.",
      },
      summary: {
        type: "string",
        description:
          "Executive summary (3–5 sentences). Highlight the most severe findings, which agents found them, and the biggest remediation priorities.",
      },
    },
    required: ["score", "summary"],
  },
};

function buildSpecialistTools(role: AgentRole): ToolDef[] {
  return [
    {
      name: "read_file",
      description: "Read the contents of a specific file in the repository",
      input_schema: {
        type: "object" as const,
        properties: { path: { type: "string", description: "File path to read" } },
        required: ["path"],
      },
    },
    {
      name: "list_directory",
      description: "List files in the repository",
      input_schema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "Directory path (use / for root)" },
        },
        required: ["path"],
      },
    },
    {
      name: "search_files",
      description: "Search for a regex pattern across all repository files",
      input_schema: {
        type: "object" as const,
        properties: {
          pattern: { type: "string", description: "Regex pattern to search for" },
          max_results: { type: "number", description: "Max number of matches to return (default 20)" },
        },
        required: ["pattern"],
      },
    },
    {
      name: "report_finding",
      description: "Report a confirmed security vulnerability finding",
      input_schema: {
        type: "object" as const,
        properties: {
          severity: { type: "string", description: "critical | high | medium | low" },
          title: { type: "string", description: "Short descriptive title" },
          file_path: { type: "string", description: "Affected file path" },
          line_start: { type: "number", description: "Starting line number" },
          line_end: { type: "number", description: "Ending line number" },
          description: { type: "string", description: "Detailed explanation of the vulnerability and its risk" },
          remediation: { type: "string", description: "Specific steps to fix the vulnerability" },
          code_snippet: { type: "string", description: "The vulnerable code snippet" },
        },
        required: ["severity", "title", "description", "remediation"],
      },
    },
    {
      name: "complete_analysis",
      description: `Signal that the ${role} security analysis is complete. Call this when you have finished reviewing all assigned files.`,
      input_schema: {
        type: "object" as const,
        properties: {
          files_reviewed: { type: "number", description: "Number of files examined" },
          notes: { type: "string", description: "Brief summary of what was reviewed" },
        },
        required: ["files_reviewed"],
      },
    },
  ];
}

// ============================================================
// SPECIALIST SYSTEM PROMPTS
// ============================================================

const SPECIALIST_PROMPTS: Record<AgentRole, string> = {
  auth: `You are an Authentication & Authorization security specialist working as part of a multi-agent security scanning system.

Your exclusive focus: authentication flaws, broken authorization, session management weaknesses, JWT vulnerabilities, password handling errors, insecure OAuth flows, missing access controls, privilege escalation paths, and broken object-level authorization (BOLA/IDOR).

For each file you review:
- Check for authentication bypass conditions
- Verify authorization checks exist on all protected routes
- Look for insecure session configuration
- Check JWT secret strength and algorithm enforcement
- Examine password hashing (bcrypt/argon2 required, never MD5/SHA1)
- Look for hardcoded admin credentials or backdoors

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  injection: `You are an Injection Vulnerabilities security specialist working as part of a multi-agent security scanning system.

Your exclusive focus: SQL injection, NoSQL injection, command injection, path traversal, LDAP injection, XML injection, template injection (SSTI), prototype pollution, and unsafe deserialization.

For each file you review:
- Trace user input from entry points (req.body, req.query, req.params, URL params) through to database queries, shell commands, or file system operations
- Look for raw string concatenation in queries instead of parameterized queries
- Check ORM usage for raw() calls or unsafe interpolation
- Look for user-controlled paths in file system operations
- Examine template rendering for user-controlled values

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  secrets: `You are a Secrets & Sensitive Data Exposure specialist working as part of a multi-agent security scanning system.

Your exclusive focus: hardcoded API keys, passwords, tokens, cryptographic material in source code, sensitive data logged or exposed in responses, insecure storage of credentials, and information leakage.

Strategy: Use search_files extensively with targeted patterns before reading individual files:
- Search for: (api[_-]?key|apikey|secret|password|passwd|token|credential|private[_-]?key)\\s*[:=]\\s*["'][^"']+["']
- Search for: (sk-|ghp_|gho_|ghu_|ghs_|ghr_|AKIA|AIza|ya29\\.)
- Search for: (BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY)
- Check .env files, config files, and any hardcoded values

Report every confirmed hardcoded secret or sensitive data exposure with report_finding, then call complete_analysis when done.`,

  dependency: `You are a Dependency Security specialist working as part of a multi-agent security scanning system.

Your exclusive focus: vulnerable library versions, insecure dependency configurations, use of deprecated/abandoned packages, missing lockfiles, scripts that download code at runtime, and supply-chain risks.

For each manifest file you review:
- Read the file completely
- Look for dependencies with known vulnerability patterns (very old versions, known-bad packages)
- Check for npm scripts that execute curl/wget or run downloaded code
- Look for packages with suspicious names (typosquatting patterns)
- Check for missing or inconsistent lockfiles
- Look for overly broad version ranges (*, latest) in production dependencies

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  general: `You are a General Security specialist working as part of a multi-agent security scanning system.

Your focus: XSS vulnerabilities, CSRF protections, insecure cryptography, security misconfigurations, missing security headers, insecure direct object references, sensitive data in URLs, open redirects, and any security issue not covered by the other specialist agents.

For each file you review:
- Check for unescaped output in templates (XSS)
- Look for CSRF token validation on state-changing endpoints
- Check cryptographic operations (avoid MD5, SHA1, ECB mode, weak keys)
- Look for debug endpoints or admin interfaces without proper protection
- Check CORS configuration for overly permissive origins
- Look for rate limiting on sensitive endpoints

Report every confirmed finding with report_finding, then call complete_analysis when done.`,
};

// ============================================================
// TOOL EXECUTION (SPECIALIST)
// ============================================================

type ReportFindingInput = {
  severity?: string;
  title?: string;
  file_path?: string;
  line_start?: number;
  line_end?: number;
  description?: string;
  remediation?: string;
  code_snippet?: string;
};

type FileToolInput = { path?: string };
type SearchToolInput = { pattern?: string; max_results?: number };
type CompleteInput = { files_reviewed?: number; notes?: string };

type SpecialistToolInput = FileToolInput & SearchToolInput & ReportFindingInput & CompleteInput;

async function executeSpecialistTool(
  block: ToolUseBlock,
  allFiles: string[],
  owner: string,
  repo: string,
  scanId: number,
  findings: FindingData[],
  agentLabel: string,
  onEvent: (event: ScanEvent) => void
): Promise<{ result: string; isDone: boolean }> {
  const name = block.name;
  const input = block.input as SpecialistToolInput;

  if (name === "read_file") {
    const content = await getFileContent(owner, repo, input.path ?? "");
    onEvent({ type: "log", message: `[${agentLabel}] Reading ${input.path}` });
    return { result: content ?? "File not found or unreadable", isDone: false };
  }

  if (name === "list_directory") {
    const dir = input.path === "/" ? "" : (input.path ?? "");
    const dirFiles = allFiles.filter((f) =>
      dir === "" ? !f.includes("/") : f.startsWith(dir + "/")
    );
    return {
      result: dirFiles.length > 0 ? dirFiles.join("\n") : "Directory empty or not found",
      isDone: false,
    };
  }

  if (name === "search_files") {
    try {
      const regex = new RegExp(input.pattern ?? "", "gi");
      const max = input.max_results ?? 20;
      const matches: string[] = [];
      for (const fp of allFiles.slice(0, 80)) {
        if (matches.length >= max) break;
        const content = await getFileContent(owner, repo, fp);
        if (!content) continue;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          regex.lastIndex = 0;
          if (regex.test(lines[i]!) && matches.length < max) {
            matches.push(`${fp}:${i + 1}: ${lines[i]!.trim()}`);
          }
        }
      }
      onEvent({ type: "log", message: `[${agentLabel}] Searched for pattern — ${matches.length} matches` });
      return { result: matches.length > 0 ? matches.join("\n") : "No matches found", isDone: false };
    } catch {
      return { result: "Invalid regex pattern", isDone: false };
    }
  }

  if (name === "report_finding") {
    const validSeverities = ["critical", "high", "medium", "low"] as const;
    const raw = input.severity ?? "low";
    const severity: FindingData["severity"] = (
      validSeverities as readonly string[]
    ).includes(raw)
      ? (raw as FindingData["severity"])
      : "low";

    const finding: FindingData = {
      severity,
      title: input.title ?? "Unnamed vulnerability",
      filePath: input.file_path,
      lineStart: input.line_start,
      lineEnd: input.line_end,
      description: input.description ?? "",
      remediation: input.remediation ?? "",
      codeSnippet: input.code_snippet,
    };
    findings.push(finding);

    await db.insert(findingsTable).values({
      scanId,
      severity: finding.severity,
      title: finding.title,
      filePath: finding.filePath ?? null,
      lineStart: finding.lineStart ?? null,
      lineEnd: finding.lineEnd ?? null,
      description: finding.description,
      remediation: finding.remediation,
      codeSnippet: finding.codeSnippet ?? null,
    });

    onEvent({ type: "finding", finding });
    onEvent({ type: "log", message: `[${agentLabel}] Reported ${severity.toUpperCase()}: ${finding.title}` });
    return { result: "Finding recorded and streamed", isDone: false };
  }

  if (name === "complete_analysis") {
    onEvent({
      type: "log",
      message: `[${agentLabel}] Analysis complete — reviewed ${input.files_reviewed ?? "?"} files`,
    });
    return { result: "Analysis marked complete", isDone: true };
  }

  return { result: "Unknown tool", isDone: false };
}

// ============================================================
// COORDINATOR AGENT
// ============================================================

async function runCoordinator(
  files: string[],
  onEvent: (event: ScanEvent) => void
): Promise<FileCategories> {
  onEvent({ type: "log", message: "Coordinator agent classifying repository structure..." });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "You are a security scan coordinator. Your only job is to classify a list of repository files into security analysis domains so that specialist agents can focus their expertise. Be precise and thorough — every file should be assigned to exactly one category.",
      tools: [COORDINATOR_TOOL],
      tool_choice: { type: "tool", name: "categorize_files" },
      messages: [
        {
          role: "user",
          content: `Classify these ${files.length} repository files into the four security analysis domains:

${files.join("\n")}

Rules:
- auth: authentication/authorization/session/middleware/JWT/password/oauth/permission files
- injection: database queries, ORM usage, request body handlers, file path handlers, templates  
- dependency: package.json, requirements.txt, Gemfile, go.mod, Cargo.toml, composer.json, *.lock files
- general: everything else (routes, utilities, config, tests, etc.)

Every file must appear in exactly one category.`,
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (toolBlock && "input" in toolBlock) {
      const cats = toolBlock.input as FileCategories;
      const total =
        cats.auth.length + cats.injection.length + cats.dependency.length + cats.general.length;
      onEvent({
        type: "log",
        message: `Coordinator: ${cats.auth.length} auth · ${cats.injection.length} injection · ${cats.dependency.length} dependency · ${cats.general.length} general (${total} classified)`,
      });
      return cats;
    }
  } catch (err) {
    logger.warn({ err }, "Coordinator agent failed — falling back to full-general");
  }

  // Fallback: everything goes to the general agent
  return { auth: [], injection: [], dependency: [], general: files };
}

// ============================================================
// SPECIALIST AGENT (agentic loop)
// ============================================================

async function runSpecialistAgent(
  spec: AgentSpec,
  allFiles: string[],
  owner: string,
  repo: string,
  scanId: number,
  findings: FindingData[],
  onEvent: (event: ScanEvent) => void
): Promise<void> {
  if (spec.assignedFiles.length === 0) {
    onEvent({ type: "log", message: `[${spec.label}] No files assigned — skipping` });
    return;
  }

  onEvent({
    type: "log",
    message: `[${spec.label}] Starting analysis of ${spec.assignedFiles.length} files...`,
  });

  const tools = buildSpecialistTools(spec.role);
  const systemPrompt = SPECIALIST_PROMPTS[spec.role];

  const messages: MessageParam[] = [
    {
      role: "user",
      content: `You are the ${spec.label} agent in a multi-agent security scan of ${owner}/${repo}.

Your assigned files (${spec.assignedFiles.length}):
${spec.assignedFiles.join("\n")}

Analyse each file for security vulnerabilities in your domain. Use read_file to examine file contents, search_files to find specific patterns across the codebase, report_finding for each vulnerability confirmed, and complete_analysis when you are finished.

Start now.`,
    },
  ];

  let done = false;
  let iterations = 0;
  const MAX_ITER = 15;

  while (!done && iterations < MAX_ITER) {
    iterations++;

    let response;
    try {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        tools,
        messages,
      });
    } catch (err) {
      logger.error({ err, agent: spec.label }, "Specialist agent API call failed");
      onEvent({ type: "log", message: `[${spec.label}] API error — stopping agent` });
      break;
    }

    const responseBlocks = response.content as ResponseBlock[];
    messages.push({
      role: "assistant",
      content: responseBlocks as MessageParam extends { role: "assistant"; content: infer C }
        ? C
        : never,
    });

    if (response.stop_reason === "end_turn") break;

    const toolBlocks = responseBlocks.filter(
      (b): b is ToolUseBlock => b.type === "tool_use"
    );
    if (toolBlocks.length === 0) break;

    const toolResults: ToolResultParam[] = [];
    for (const block of toolBlocks) {
      const { result, isDone } = await executeSpecialistTool(
        block,
        allFiles,
        owner,
        repo,
        scanId,
        findings,
        spec.label,
        onEvent
      );
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      if (isDone) done = true;
    }

    messages.push({
      role: "user",
      content: toolResults as MessageParam extends { role: "user"; content: infer C }
        ? C
        : never,
    });

    if (done) break;
  }

  onEvent({ type: "log", message: `[${spec.label}] Agent finished` });
}

// ============================================================
// SYNTHESIZER AGENT
// ============================================================

async function runSynthesizer(
  findings: FindingData[],
  owner: string,
  repo: string,
  onEvent: (event: ScanEvent) => void
): Promise<{ score: number; summary: string }> {
  onEvent({ type: "log", message: "Synthesizer agent producing final security report..." });

  const critCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const medCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  const findingSummary = findings
    .map(
      (f) =>
        `[${f.severity.toUpperCase()}] ${f.title}${f.filePath ? ` (${f.filePath})` : ""}: ${f.description.slice(0, 150)}`
    )
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system:
        "You are a senior security analyst synthesising results from a multi-agent vulnerability scan. Produce an accurate, calibrated final assessment.",
      tools: [SYNTHESIZER_TOOL],
      tool_choice: { type: "tool", name: "produce_report" },
      messages: [
        {
          role: "user",
          content: `Repository: ${owner}/${repo}

Multi-agent scan results:
- Critical findings: ${critCount}
- High findings: ${highCount}
- Medium findings: ${medCount}
- Low findings: ${lowCount}
- Total: ${findings.length}

Findings detail:
${findingSummary || "No findings reported"}

Produce the final security score and executive summary. The score should start at 100 and be reduced by: 20 per critical, 10 per high, 5 per medium, 2 per low (minimum 0). The summary should identify the most important findings and remediation priorities.`,
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (toolBlock && "input" in toolBlock) {
      const out = toolBlock.input as { score: number; summary: string };
      return {
        score: Math.max(0, Math.min(100, out.score)),
        summary: out.summary,
      };
    }
  } catch (err) {
    logger.warn({ err }, "Synthesizer agent failed — using computed fallback");
  }

  // Computed fallback
  const score = Math.max(
    0,
    100 - critCount * 20 - highCount * 10 - medCount * 5 - lowCount * 2
  );
  return {
    score,
    summary: `Multi-agent scan of ${owner}/${repo} complete. Found ${findings.length} issue${findings.length !== 1 ? "s" : ""}: ${critCount} critical, ${highCount} high, ${medCount} medium, ${lowCount} low.`,
  };
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

export async function runScan(
  scanId: number,
  owner: string,
  repo: string,
  onEvent: (event: ScanEvent) => void
): Promise<void> {
  const allFindings: FindingData[] = [];

  try {
    await db
      .update(scansTable)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(scansTable.id, scanId));

    // ── Phase 0: Fetch file tree ──────────────────────────────
    onEvent({ type: "log", message: `Starting multi-agent scan of ${owner}/${repo}...` });
    const allFiles = await getRepoFileTree(owner, repo, 200);
    onEvent({ type: "log", message: `Fetched ${allFiles.length} files from repository` });

    // ── Phase 1: Coordinator classifies files ─────────────────
    const categories = await runCoordinator(allFiles, onEvent);

    // ── Phase 2: Build specialist specs ───────────────────────
    const agentSpecs: AgentSpec[] = (
      [
        {
          role: "auth" as AgentRole,
          label: "Auth & Authorization",
          assignedFiles: categories.auth,
        },
        {
          role: "injection" as AgentRole,
          label: "Injection Vulnerabilities",
          assignedFiles: categories.injection,
        },
        {
          role: "secrets" as AgentRole,
        label: "Secrets & Exposure",
        // Secrets agent searches all files via search_files — no pre-assigned subset
        assignedFiles: allFiles.slice(0, 20), // top-level files as starting point
      },
        {
          role: "dependency" as AgentRole,
          label: "Dependency Security",
          assignedFiles: categories.dependency,
        },
        {
          role: "general" as AgentRole,
          label: "General Security",
          assignedFiles: categories.general,
        },
      ] as AgentSpec[]
    ).filter((s) => s.assignedFiles.length > 0);

    const agentCount = agentSpecs.length;
    onEvent({
      type: "log",
      message: `Launching ${agentCount} specialist agents in parallel (max 3 concurrent)...`,
    });

    // ── Phase 2: Run specialists (max 3 concurrent) ───────────
    await runConcurrently(
      agentSpecs.map(
        (spec) => () =>
          runSpecialistAgent(spec, allFiles, owner, repo, scanId, allFindings, onEvent)
      ),
      3
    );

    onEvent({
      type: "log",
      message: `All ${agentCount} agents finished. ${allFindings.length} total finding${allFindings.length !== 1 ? "s" : ""} collected.`,
    });

    // ── Phase 3: Synthesizer produces final report ────────────
    const { score, summary } = await runSynthesizer(allFindings, owner, repo, onEvent);

    // Persist scan results
    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const highCount = allFindings.filter((f) => f.severity === "high").length;
    const mediumCount = allFindings.filter((f) => f.severity === "medium").length;
    const lowCount = allFindings.filter((f) => f.severity === "low").length;

    await db
      .update(scansTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        summary,
        score,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      })
      .where(eq(scansTable.id, scanId));

    onEvent({ type: "complete", score, summary });
  } catch (err) {
    logger.error({ err, scanId }, "Multi-agent scan failed");

    await db
      .update(scansTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(scansTable.id, scanId));

    onEvent({
      type: "error",
      message: `Scan failed: ${(err as Error).message}`,
    });
  }
}
