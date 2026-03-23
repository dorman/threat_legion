import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, scansTable, findingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getRepoFileTree, getFileContent } from "./github";
import { logger } from "./logger";

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

type CreateParams = Parameters<typeof anthropic.messages.create>[0];
type MessageParam = CreateParams["messages"][number];

type TextContentBlock = { type: "text"; text: string };
type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};
type ResponseContentBlock = TextContentBlock | ToolUseBlock;

type ToolResultBlockParam = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

const SYSTEM_PROMPT = `You are ThreatLegion, an expert security vulnerability scanner. Your job is to analyze source code repositories for security vulnerabilities.

You will be given information about a GitHub repository and you should identify security vulnerabilities. For each vulnerability found, provide:
1. Severity (critical, high, medium, low)
2. A clear title
3. The affected file path and line numbers if applicable
4. A detailed description of the vulnerability
5. Specific remediation steps

Focus on:
- SQL injection vulnerabilities
- XSS vulnerabilities  
- Authentication and authorization flaws
- Sensitive data exposure (API keys, passwords in code)
- CSRF vulnerabilities
- Insecure dependencies
- Insecure cryptography
- Path traversal
- Command injection
- Hardcoded secrets

Be thorough but focused on real, actionable security issues.`;

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

type FinishScanInput = {
  summary?: string;
  score?: number;
};

type FileToolInput = {
  path?: string;
};

type SearchFilesInput = {
  pattern?: string;
  max_results?: number;
};

type AnyToolInput = FileToolInput &
  SearchFilesInput &
  ReportFindingInput &
  FinishScanInput;

const TOOLS: CreateParams["tools"] = [
  {
    name: "read_file",
    description: "Read the contents of a specific file in the repository",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "The file path to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_directory",
    description: "List files in the repository",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path (use / for root)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Search for a pattern across all repository files",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Regex pattern to search for",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "report_finding",
    description: "Report a security vulnerability finding",
    input_schema: {
      type: "object" as const,
      properties: {
        severity: {
          type: "string",
          description: "critical, high, medium, or low",
        },
        title: {
          type: "string",
          description: "Short title of the vulnerability",
        },
        file_path: { type: "string", description: "Affected file path" },
        line_start: { type: "number", description: "Starting line number" },
        line_end: { type: "number", description: "Ending line number" },
        description: {
          type: "string",
          description: "Detailed description of the vulnerability",
        },
        remediation: {
          type: "string",
          description: "Steps to fix the vulnerability",
        },
        code_snippet: {
          type: "string",
          description: "Relevant code snippet",
        },
      },
      required: ["severity", "title", "description", "remediation"],
    },
  },
  {
    name: "finish_scan",
    description: "Complete the scan and provide a summary",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "Executive summary of the security analysis",
        },
        score: {
          type: "number",
          description:
            "Security score from 0-100 (100 = perfect, 0 = critical issues)",
        },
      },
      required: ["summary", "score"],
    },
  },
];

async function executeToolCall(
  block: ToolUseBlock,
  files: string[],
  owner: string,
  repo: string,
  scanId: number,
  findings: FindingData[],
  onEvent: (event: ScanEvent) => void
): Promise<{
  result: string;
  scanDone: boolean;
  finalScore?: number;
  finalSummary?: string;
}> {
  const toolName = block.name;
  const toolInput = block.input as AnyToolInput;

  onEvent({
    type: "log",
    message: `Using tool: ${toolName}${toolInput.path ? ` on ${toolInput.path}` : ""}`,
  });

  if (toolName === "read_file") {
    const content = await getFileContent(owner, repo, toolInput.path ?? "");
    if (content) {
      onEvent({ type: "log", message: `Read file: ${toolInput.path}` });
    }
    return {
      result: content ?? "File not found or could not be read",
      scanDone: false,
    };
  }

  if (toolName === "list_directory") {
    const dirPath =
      toolInput.path === "/" ? "" : (toolInput.path ?? "");
    const dirFiles = files.filter((f) =>
      dirPath === "" ? !f.includes("/") : f.startsWith(dirPath + "/")
    );
    return {
      result:
        dirFiles.length > 0
          ? dirFiles.join("\n")
          : "Directory empty or not found",
      scanDone: false,
    };
  }

  if (toolName === "search_files") {
    try {
      const regex = new RegExp(toolInput.pattern ?? "", "gi");
      const maxResults = toolInput.max_results ?? 20;
      const searchResults: string[] = [];

      for (const filePath of files.slice(0, 50)) {
        if (searchResults.length >= maxResults) break;
        const content = await getFileContent(owner, repo, filePath);
        if (!content) continue;
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          if (regex.test(line) && searchResults.length < maxResults) {
            searchResults.push(`${filePath}:${idx + 1}: ${line.trim()}`);
          }
          regex.lastIndex = 0;
        });
      }
      return {
        result:
          searchResults.length > 0
            ? searchResults.join("\n")
            : "No matches found",
        scanDone: false,
      };
    } catch {
      return { result: "Invalid search pattern", scanDone: false };
    }
  }

  if (toolName === "report_finding") {
    const severityRaw = toolInput.severity ?? "low";
    const validSeverities = [
      "critical",
      "high",
      "medium",
      "low",
    ] as const satisfies readonly FindingData["severity"][];
    const severity: FindingData["severity"] = (
      validSeverities as readonly string[]
    ).includes(severityRaw)
      ? (severityRaw as FindingData["severity"])
      : "low";

    const finding: FindingData = {
      severity,
      title: toolInput.title ?? "Unknown vulnerability",
      filePath: toolInput.file_path,
      lineStart: toolInput.line_start,
      lineEnd: toolInput.line_end,
      description: toolInput.description ?? "",
      remediation: toolInput.remediation ?? "",
      codeSnippet: toolInput.code_snippet,
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
    return { result: "Finding recorded", scanDone: false };
  }

  if (toolName === "finish_scan") {
    const finalScore = Math.max(0, Math.min(100, toolInput.score ?? 100));
    const finalSummary = toolInput.summary ?? "Scan complete";
    return { result: "Scan completed", scanDone: true, finalScore, finalSummary };
  }

  return { result: "Unknown tool", scanDone: false };
}

export async function runScan(
  scanId: number,
  owner: string,
  repo: string,
  onEvent: (event: ScanEvent) => void
): Promise<void> {
  const findings: FindingData[] = [];

  try {
    await db
      .update(scansTable)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(scansTable.id, scanId));

    onEvent({
      type: "log",
      message: `Starting security scan for ${owner}/${repo}...`,
    });

    const files = await getRepoFileTree(owner, repo, 150);
    onEvent({
      type: "log",
      message: `Found ${files.length} files to analyze`,
    });

    const fileList = files.join("\n");

    const messages: MessageParam[] = [
      {
        role: "user",
        content: `Please perform a comprehensive security audit of the GitHub repository ${owner}/${repo}.

Repository file tree:
${fileList}

Start by exploring the repository structure, then read key files (especially configuration files, authentication code, database queries, API endpoints, and anything handling user input). Use the report_finding tool for each vulnerability you discover, and finish with the finish_scan tool providing an overall assessment.

Be thorough but efficient - focus on files likely to contain security issues.`,
      },
    ];

    let scanDone = false;
    let finalScore = 100;
    let finalSummary = "";
    let iterations = 0;
    const MAX_ITERATIONS = 30;

    while (!scanDone && iterations < MAX_ITERATIONS) {
      iterations++;
      onEvent({
        type: "log",
        message: `AI agent analyzing... (step ${iterations})`,
      });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      const responseBlocks = response.content as ResponseContentBlock[];
      messages.push({
        role: "assistant",
        content: responseBlocks as MessageParam extends { role: "assistant"; content: infer C } ? C : never,
      });

      if (response.stop_reason === "end_turn") {
        break;
      }

      const toolUseBlocks = responseBlocks.filter(
        (block): block is ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        break;
      }

      const toolResults: ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const {
          result,
          scanDone: done,
          finalScore: score,
          finalSummary: summary,
        } = await executeToolCall(
          block,
          files,
          owner,
          repo,
          scanId,
          findings,
          onEvent
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });

        if (done) {
          scanDone = true;
          if (score !== undefined) finalScore = score;
          if (summary !== undefined) finalSummary = summary;
        }
      }

      messages.push({
        role: "user",
        content: toolResults as MessageParam extends { role: "user"; content: infer C } ? C : never,
      });

      if (scanDone) break;
    }

    const criticalCount = findings.filter(
      (f) => f.severity === "critical"
    ).length;
    const highCount = findings.filter((f) => f.severity === "high").length;
    const mediumCount = findings.filter((f) => f.severity === "medium").length;
    const lowCount = findings.filter((f) => f.severity === "low").length;

    if (!finalScore) {
      finalScore = Math.max(
        0,
        100 -
          criticalCount * 20 -
          highCount * 10 -
          mediumCount * 5 -
          lowCount * 2
      );
    }

    await db
      .update(scansTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        summary: finalSummary || `Found ${findings.length} security issues`,
        score: finalScore,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      })
      .where(eq(scansTable.id, scanId));

    onEvent({
      type: "complete",
      score: finalScore,
      summary:
        finalSummary ||
        `Security scan complete. Found ${findings.length} issues.`,
    });
  } catch (err) {
    logger.error({ err, scanId }, "Scan failed");

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
