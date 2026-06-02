import {
  getLocalFileTree,
  getLocalFileContent,
  searchLocalFiles,
  resolveExistingFiles,
} from "./local-files";
import {
  type LLMConfig,
  type NormTool,
  callForcedTool,
  runAgentLoop,
} from "./ai-provider";
import {
  collectAiSurfaceFiles,
  mergeScanFileList,
} from "./ai-surface";
import {
  DEFAULT_SCAN_PROFILE,
  getScanProfileDefinition,
  type AgentSpec,
  type FileCategories,
  type ScanProfile,
} from "./scan-profile";
import "./profiles/general";
import "./profiles/ai-app";

export type { ScanProfile } from "./scan-profile";
export { DEFAULT_SCAN_PROFILE, parseScanProfile } from "./scan-profile";

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

export type ScanCompleteResult = {
  findings: FindingData[];
  score: number;
  summary: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  profile: ScanProfile;
};

export type ScanRunConfig = {
  scanId?: number;
  scanDir: string;
  projectName: string;
  aiConfig: LLMConfig;
  onEvent: (event: ScanEvent) => void;
  profile?: ScanProfile;
  fileFilter?: string[];
  maxFiles?: number;
  deltaScan?: boolean;
  onFinding?: (finding: FindingData) => Promise<void>;
  onStart?: () => Promise<void>;
  onComplete?: (result: ScanCompleteResult) => Promise<void>;
  onFail?: () => Promise<void>;
  cleanup?: () => Promise<void>;
};

const log = {
  warn: (msg: string, err?: unknown) => console.warn(msg, err ?? ""),
  error: (msg: string, err?: unknown) => console.error(msg, err ?? ""),
};

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

const SYNTHESIZER_TOOL: NormTool = {
  name: "produce_report",
  description: "Produce the final security report after reviewing all agent findings",
  parameters: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description:
          "Overall security score from 0–100. Start at 100. Deduct: 20 per critical, 10 per high, 5 per medium, 2 per low. Minimum 0.",
      },
      summary: {
        type: "string",
        description:
          "Executive summary (3–5 sentences). Highlight the most severe findings and remediation priorities.",
      },
    },
    required: ["score", "summary"],
  },
};

function buildSpecialistTools(role: string): NormTool[] {
  return [
    {
      name: "read_file",
      description: "Read the contents of a specific file in the codebase",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "File path to read" } },
        required: ["path"],
      },
    },
    {
      name: "list_directory",
      description: "List files in the codebase",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path (use / for root)" },
        },
        required: ["path"],
      },
    },
    {
      name: "search_files",
      description: "Search for a regex pattern across all codebase files",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern to search for" },
          max_results: {
            type: "number",
            description: "Max number of matches to return (default 20)",
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "report_finding",
      description: "Report a confirmed security vulnerability finding",
      parameters: {
        type: "object",
        properties: {
          severity: { type: "string", description: "critical | high | medium | low" },
          title: { type: "string", description: "Short descriptive title" },
          file_path: { type: "string", description: "Affected file path" },
          line_start: { type: "number", description: "Starting line number" },
          line_end: { type: "number", description: "Ending line number" },
          description: {
            type: "string",
            description: "Detailed explanation of the vulnerability and its risk",
          },
          remediation: {
            type: "string",
            description: "Specific steps to fix the vulnerability",
          },
          code_snippet: {
            type: "string",
            description: "The vulnerable code snippet",
          },
        },
        required: ["severity", "title", "description", "remediation"],
      },
    },
    {
      name: "complete_analysis",
      description: `Signal that the ${role} security analysis is complete. Call this when you have finished reviewing all assigned files.`,
      parameters: {
        type: "object",
        properties: {
          files_reviewed: {
            type: "number",
            description: "Number of files examined",
          },
          notes: { type: "string", description: "Brief summary of what was reviewed" },
        },
        required: ["files_reviewed"],
      },
    },
  ];
}

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
  toolName: string,
  rawInput: unknown,
  allFiles: string[],
  scanDir: string,
  findings: FindingData[],
  agentLabel: string,
  onEvent: (event: ScanEvent) => void,
  onFinding?: (finding: FindingData) => Promise<void>
): Promise<{ result: string; isDone: boolean }> {
  const input = rawInput as SpecialistToolInput;

  if (toolName === "read_file") {
    const content = await getLocalFileContent(scanDir, input.path ?? "");
    onEvent({ type: "log", message: `[${agentLabel}] Reading ${input.path}` });
    return { result: content ?? "File not found or unreadable", isDone: false };
  }

  if (toolName === "list_directory") {
    const dir = input.path === "/" ? "" : (input.path ?? "");
    const dirFiles = allFiles.filter((f) =>
      dir === "" ? !f.includes("/") : f.startsWith(dir + "/")
    );
    return {
      result: dirFiles.length > 0 ? dirFiles.join("\n") : "Directory empty or not found",
      isDone: false,
    };
  }

  if (toolName === "search_files") {
    try {
      const matches = await searchLocalFiles(
        scanDir,
        allFiles,
        input.pattern ?? "",
        input.max_results ?? 20
      );
      onEvent({
        type: "log",
        message: `[${agentLabel}] Searched for pattern — ${matches.length} matches`,
      });
      return {
        result: matches.length > 0 ? matches.join("\n") : "No matches found",
        isDone: false,
      };
    } catch {
      return { result: "Invalid regex pattern", isDone: false };
    }
  }

  if (toolName === "report_finding") {
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

    if (onFinding) {
      await onFinding(finding);
    }

    onEvent({ type: "finding", finding });
    onEvent({
      type: "log",
      message: `[${agentLabel}] Reported ${severity.toUpperCase()}: ${finding.title}`,
    });
    return { result: "Finding recorded and streamed", isDone: false };
  }

  if (toolName === "complete_analysis") {
    onEvent({
      type: "log",
      message: `[${agentLabel}] Analysis complete — reviewed ${input.files_reviewed ?? "?"} files`,
    });
    return { result: "Analysis marked complete", isDone: true };
  }

  return { result: "Unknown tool", isDone: false };
}

async function runCoordinator(
  aiConfig: LLMConfig,
  files: string[],
  profileId: ScanProfile,
  onEvent: (event: ScanEvent) => void
): Promise<FileCategories> {
  const profile = getScanProfileDefinition(profileId);
  onEvent({
    type: "log",
    message: `Coordinator classifying files (${profile.label})...`,
  });

  try {
    const result = await callForcedTool<FileCategories>(aiConfig, {
      system: profile.coordinatorSystem,
      userMessage: profile.buildCoordinatorUserMessage(files),
      tool: profile.coordinatorTool,
      maxTokens: 4096,
    });

    if (result) {
      onEvent({ type: "log", message: profile.formatCategoryLog(result) });
      return result;
    }
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const isAuthErr =
      msg.toLowerCase().includes("api key") ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("authentication") ||
      msg.toLowerCase().includes("401");
    log.warn("Coordinator agent failed — falling back", err);
    onEvent({
      type: "log",
      message: isAuthErr
        ? "[ALERT] Coordinator failed: Authentication error — verify your API key before scanning"
        : `[ALERT] Coordinator failed (${msg.slice(0, 100)}) — using fallback routing`,
    });
  }

  return profile.fallbackCategories(files);
}

async function runSpecialistAgent(
  aiConfig: LLMConfig,
  spec: AgentSpec,
  allFiles: string[],
  scanDir: string,
  projectName: string,
  findings: FindingData[],
  profileId: ScanProfile,
  deltaScan: boolean,
  onEvent: (event: ScanEvent) => void,
  onFinding?: (finding: FindingData) => Promise<void>
): Promise<void> {
  if (spec.assignedFiles.length === 0) {
    onEvent({ type: "log", message: `[${spec.label}] No files assigned — skipping` });
    return;
  }

  const profile = getScanProfileDefinition(profileId);
  const systemPrompt = profile.specialistPrompts[spec.role];
  if (!systemPrompt) {
    onEvent({ type: "log", message: `[${spec.label}] No prompt for role — skipping` });
    return;
  }

  onEvent({
    type: "log",
    message: `[${spec.label}] Starting analysis of ${spec.assignedFiles.length} files...`,
  });

  const scanContext = profile.buildScanContext(deltaScan);

  try {
    await runAgentLoop(aiConfig, {
      system: systemPrompt,
      initialMessage: `You are the ${spec.label} agent in a multi-agent security scan of '${projectName}'.

${scanContext}

Your assigned files (${spec.assignedFiles.length}):
${spec.assignedFiles.join("\n")}

Analyse each file for security vulnerabilities in your domain. Use read_file to examine file contents, search_files to find specific patterns across the codebase, report_finding for each vulnerability confirmed, and complete_analysis when you are finished.

Start now.`,
      tools: buildSpecialistTools(spec.role),
      maxTokens: 8192,
      maxIterations: 15,
      onToolCall: async (name, input) => {
        return executeSpecialistTool(
          name,
          input,
          allFiles,
          scanDir,
          findings,
          spec.label,
          onEvent,
          onFinding
        );
      },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const isAuthErr =
      msg.toLowerCase().includes("api key") ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("authentication") ||
      msg.toLowerCase().includes("401");
    log.error(`Specialist agent failed: ${spec.label}`, err);
    onEvent({
      type: "log",
      message: isAuthErr
        ? `[ALERT] [${spec.label}] Authentication failed — check your API key`
        : `[${spec.label}] API error: ${msg.slice(0, 120)}`,
    });
  }

  onEvent({ type: "log", message: `[${spec.label}] Agent finished` });
}

async function runSynthesizer(
  aiConfig: LLMConfig,
  findings: FindingData[],
  projectName: string,
  profileId: ScanProfile,
  onEvent: (event: ScanEvent) => void
): Promise<{ score: number; summary: string }> {
  const profile = getScanProfileDefinition(profileId);
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
    const result = await callForcedTool<{ score: number; summary: string }>(aiConfig, {
      system: profile.synthesizerSystem,
      userMessage: profile.buildSynthesizerUserMessage({
        projectName,
        critCount,
        highCount,
        medCount,
        lowCount,
        findingSummary,
      }),
      tool: SYNTHESIZER_TOOL,
      maxTokens: 2048,
    });

    if (result) {
      return {
        score: Math.max(0, Math.min(100, result.score)),
        summary: result.summary,
      };
    }
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    log.warn("Synthesizer agent failed — using computed fallback", err);
    onEvent({
      type: "log",
      message: `[ALERT] Synthesizer failed: ${msg.slice(0, 120)} — using computed score`,
    });
  }

  const score = Math.max(
    0,
    100 - critCount * 20 - highCount * 10 - medCount * 5 - lowCount * 2
  );
  return {
    score,
    summary: `Scan of '${projectName}' complete (${profile.label}). Found ${findings.length} issue${findings.length !== 1 ? "s" : ""}: ${critCount} critical, ${highCount} high, ${medCount} medium, ${lowCount} low.`,
  };
}

async function resolveScanFiles(
  config: ScanRunConfig,
  profileId: ScanProfile,
  maxFiles: number,
  deltaScan: boolean,
  onEvent: (message: string) => void
): Promise<string[]> {
  if (config.fileFilter?.length) {
    let paths = config.fileFilter;

    if (profileId === "ai-app") {
      const aiSurfaces = await collectAiSurfaceFiles(config.scanDir);
      if (aiSurfaces.length > 0) {
        paths = mergeScanFileList(paths, aiSurfaces);
        onEvent(
          `AI-app delta: ${config.fileFilter.length} changed file(s) + ${aiSurfaces.length} AI surface file(s) (Cursor rules, agents, RAG)`
        );
      } else {
        onEvent(`Delta scan: ${config.fileFilter.length} changed file(s) to analyze`);
      }
    } else {
      onEvent(`Delta scan: ${config.fileFilter.length} changed file(s) to analyze`);
    }

    return resolveExistingFiles(config.scanDir, paths);
  }

  const allFiles = await getLocalFileTree(config.scanDir, maxFiles);
  onEvent(`Found ${allFiles.length} files in codebase`);
  return allFiles;
}

export async function runScanCore(config: ScanRunConfig): Promise<ScanCompleteResult | null> {
  const allFindings: FindingData[] = [];
  const maxFiles = config.maxFiles ?? 200;
  const profileId = config.profile ?? DEFAULT_SCAN_PROFILE;
  const profile = getScanProfileDefinition(profileId);
  const deltaScan = config.deltaScan ?? Boolean(config.fileFilter?.length);

  try {
    if (config.onStart) {
      await config.onStart();
    }

    const scanLabel = deltaScan ? "delta" : "full";
    emitLog(
      config,
      `Starting ${scanLabel} scan (${profile.label}) of '${config.projectName}'...`
    );

    const allFiles = await resolveScanFiles(
      config,
      profileId,
      maxFiles,
      deltaScan,
      (message) => emitLog(config, message)
    );

    if (allFiles.length === 0) {
      throw new Error(
        deltaScan
          ? "No scannable changed files found. Ensure your git diff includes source files."
          : "No scannable files found. Ensure the folder contains source code files."
      );
    }

    const categories = await runCoordinator(
      config.aiConfig,
      allFiles,
      profileId,
      config.onEvent
    );

    const agentSpecs = profile.buildAgentSpecs(categories, allFiles);
    const agentCount = agentSpecs.length;
    emitLog(
      config,
      `Launching ${agentCount} specialist agents in parallel (max 3 concurrent)...`
    );

    await runConcurrently(
      agentSpecs.map(
        (spec) => () =>
          runSpecialistAgent(
            config.aiConfig,
            spec,
            allFiles,
            config.scanDir,
            config.projectName,
            allFindings,
            profileId,
            deltaScan,
            config.onEvent,
            config.onFinding
          )
      ),
      3
    );

    emitLog(
      config,
      `All ${agentCount} agents finished. ${allFindings.length} total finding${allFindings.length !== 1 ? "s" : ""} collected.`
    );

    const { score, summary } = await runSynthesizer(
      config.aiConfig,
      allFindings,
      config.projectName,
      profileId,
      config.onEvent
    );

    const result: ScanCompleteResult = {
      findings: allFindings,
      score,
      summary,
      criticalCount: allFindings.filter((f) => f.severity === "critical").length,
      highCount: allFindings.filter((f) => f.severity === "high").length,
      mediumCount: allFindings.filter((f) => f.severity === "medium").length,
      lowCount: allFindings.filter((f) => f.severity === "low").length,
      profile: profileId,
    };

    if (config.onComplete) {
      await config.onComplete(result);
    }

    config.onEvent({ type: "complete", score, summary });
    return result;
  } catch (err) {
    log.error("Multi-agent scan failed", err);

    if (config.onFail) {
      await config.onFail();
    }

    config.onEvent({
      type: "error",
      message: `Scan failed: ${(err as Error).message}`,
    });
    return null;
  } finally {
    if (config.cleanup) {
      await config.cleanup();
    }
  }
}

function emitLog(config: ScanRunConfig, message: string): void {
  config.onEvent({ type: "log", message });
}
