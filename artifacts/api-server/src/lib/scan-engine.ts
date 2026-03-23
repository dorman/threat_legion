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

Be thorough but focused on real, actionable security issues. Always respond in valid JSON format.`;

type Tool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
};

type ToolInput = {
  path?: string;
  pattern?: string;
  max_results?: number;
};

const TOOLS: Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a specific file in the repository",
    input_schema: {
      type: "object",
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
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path (use / for root)" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Search for a pattern across all repository files",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern to search for" },
        max_results: { type: "number", description: "Maximum number of results to return" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "report_finding",
    description: "Report a security vulnerability finding",
    input_schema: {
      type: "object",
      properties: {
        severity: { type: "string", description: "critical, high, medium, or low" },
        title: { type: "string", description: "Short title of the vulnerability" },
        file_path: { type: "string", description: "Affected file path" },
        line_start: { type: "number", description: "Starting line number" },
        line_end: { type: "number", description: "Ending line number" },
        description: { type: "string", description: "Detailed description of the vulnerability" },
        remediation: { type: "string", description: "Steps to fix the vulnerability" },
        code_snippet: { type: "string", description: "Relevant code snippet" },
      },
      required: ["severity", "title", "description", "remediation"],
    },
  },
  {
    name: "finish_scan",
    description: "Complete the scan and provide a summary",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Executive summary of the security analysis" },
        score: { type: "number", description: "Security score from 0-100 (100 = perfect, 0 = critical issues)" },
      },
      required: ["summary", "score"],
    },
  },
];

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

    onEvent({ type: "log", message: `🔍 Starting security scan for ${owner}/${repo}...` });

    const files = await getRepoFileTree(owner, repo, 150);
    onEvent({ type: "log", message: `📁 Found ${files.length} files to analyze` });

    const fileList = files.join("\n");

    const messages: { role: "user" | "assistant"; content: string | { type: string; tool_use_id?: string; content: string }[] }[] = [
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
      onEvent({ type: "log", message: `🤖 AI agent analyzing... (step ${iterations})` });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: TOOLS as Parameters<typeof anthropic.messages.create>[0]["tools"],
        messages: messages as Parameters<typeof anthropic.messages.create>[0]["messages"],
      });

      messages.push({ role: "assistant", content: response.content as unknown as string });

      if (response.stop_reason === "end_turn") {
        scanDone = true;
        break;
      }

      const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const toolName = block.name;
        const toolInput = block.input as ToolInput & {
          severity?: string;
          title?: string;
          file_path?: string;
          line_start?: number;
          line_end?: number;
          description?: string;
          remediation?: string;
          code_snippet?: string;
          summary?: string;
          score?: number;
          pattern?: string;
        };

        onEvent({ type: "log", message: `🔧 Using tool: ${toolName}${toolInput.path ? ` on ${toolInput.path}` : ""}` });

        let result = "";

        if (toolName === "read_file") {
          const content = await getFileContent(owner, repo, toolInput.path || "");
          result = content || "File not found or could not be read";
          if (content) {
            onEvent({ type: "log", message: `📄 Read file: ${toolInput.path}` });
          }
        } else if (toolName === "list_directory") {
          const dirPath = toolInput.path === "/" ? "" : toolInput.path || "";
          const dirFiles = files.filter((f) =>
            dirPath === "" ? !f.includes("/") : f.startsWith(dirPath + "/")
          );
          result = dirFiles.length > 0 ? dirFiles.join("\n") : "Directory empty or not found";
        } else if (toolName === "search_files") {
          try {
            const regex = new RegExp(toolInput.pattern || "", "gi");
            const maxResults = toolInput.max_results || 20;
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
            result = searchResults.length > 0 ? searchResults.join("\n") : "No matches found";
          } catch {
            result = "Invalid search pattern";
          }
        } else if (toolName === "report_finding") {
          const finding: FindingData = {
            severity: (toolInput.severity || "low") as FindingData["severity"],
            title: toolInput.title || "Unknown vulnerability",
            filePath: toolInput.file_path,
            lineStart: toolInput.line_start,
            lineEnd: toolInput.line_end,
            description: toolInput.description || "",
            remediation: toolInput.remediation || "",
            codeSnippet: toolInput.code_snippet,
          };
          findings.push(finding);

          await db.insert(findingsTable).values({
            scanId,
            severity: finding.severity,
            title: finding.title,
            filePath: finding.filePath || null,
            lineStart: finding.lineStart || null,
            lineEnd: finding.lineEnd || null,
            description: finding.description,
            remediation: finding.remediation,
            codeSnippet: finding.codeSnippet || null,
          });

          onEvent({ type: "finding", finding });
          result = "Finding recorded";
        } else if (toolName === "finish_scan") {
          finalScore = Math.max(0, Math.min(100, toolInput.score || 100));
          finalSummary = toolInput.summary || "Scan complete";
          scanDone = true;
          result = "Scan completed";
        } else {
          result = "Unknown tool";
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults });
      }

      if (scanDone) break;
    }

    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;
    const mediumCount = findings.filter((f) => f.severity === "medium").length;
    const lowCount = findings.filter((f) => f.severity === "low").length;

    if (!finalScore) {
      finalScore = Math.max(
        0,
        100 - criticalCount * 20 - highCount * 10 - mediumCount * 5 - lowCount * 2
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
      summary: finalSummary || `Security scan complete. Found ${findings.length} issues.`,
    });
  } catch (err) {
    logger.error({ err, scanId }, "Scan failed");

    await db
      .update(scansTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(scansTable.id, scanId));

    onEvent({ type: "error", message: `Scan failed: ${(err as Error).message}` });
  }
}
