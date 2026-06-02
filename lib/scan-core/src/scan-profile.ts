import type { NormTool } from "./ai-provider";

export type ScanProfile = "ai-app" | "general";

export type BaseAgentRole = "auth" | "injection" | "secrets" | "dependency" | "general";
export type AiAppAgentRole = BaseAgentRole | "rag" | "ai_agent";

export type AgentRole = BaseAgentRole | AiAppAgentRole;

export interface GeneralFileCategories {
  auth: string[];
  injection: string[];
  dependency: string[];
  general: string[];
}

export interface AiAppFileCategories extends GeneralFileCategories {
  rag: string[];
  ai_agent: string[];
}

export type FileCategories = GeneralFileCategories | AiAppFileCategories;

export interface AgentSpec {
  role: AgentRole;
  label: string;
  assignedFiles: string[];
}

export interface ScanProfileDefinition {
  id: ScanProfile;
  label: string;
  coordinatorTool: NormTool;
  coordinatorSystem: string;
  buildCoordinatorUserMessage: (files: string[]) => string;
  formatCategoryLog: (categories: FileCategories) => string;
  fallbackCategories: (files: string[]) => FileCategories;
  specialistPrompts: Record<string, string>;
  buildAgentSpecs: (categories: FileCategories, allFiles: string[]) => AgentSpec[];
  buildScanContext: (deltaScan: boolean) => string;
  synthesizerSystem: string;
  buildSynthesizerUserMessage: (params: {
    projectName: string;
    critCount: number;
    highCount: number;
    medCount: number;
    lowCount: number;
    findingSummary: string;
  }) => string;
}

const PROFILES: Record<ScanProfile, ScanProfileDefinition> = {} as Record<
  ScanProfile,
  ScanProfileDefinition
>;

export function registerProfile(definition: ScanProfileDefinition): void {
  PROFILES[definition.id] = definition;
}

export function getScanProfileDefinition(profile: ScanProfile = "ai-app"): ScanProfileDefinition {
  return PROFILES[profile] ?? PROFILES["ai-app"];
}

export function parseScanProfile(value: string): ScanProfile {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ai-app" || normalized === "ai_app" || normalized === "ai") {
    return "ai-app";
  }
  if (normalized === "general" || normalized === "legacy") {
    return "general";
  }
  throw new Error(`Unsupported scan profile "${value}". Use: ai-app, general`);
}

export const DEFAULT_SCAN_PROFILE: ScanProfile = "ai-app";
