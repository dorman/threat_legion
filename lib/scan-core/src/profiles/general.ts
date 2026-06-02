import { registerProfile, type AgentSpec, type GeneralFileCategories, type ScanProfileDefinition } from "../scan-profile";
import type { NormTool } from "../ai-provider";

const COORDINATOR_TOOL: NormTool = {
  name: "categorize_files",
  description:
    "Classify codebase files into security analysis domains. Each file should appear in exactly one category.",
  parameters: {
    type: "object",
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

const SPECIALIST_PROMPTS: Record<string, string> = {
  auth: `You are an Authentication & Authorization security specialist working as part of a multi-agent security scanning system.

Your exclusive focus: authentication flaws, broken authorization, session management weaknesses, JWT vulnerabilities, password handling errors, insecure OAuth flows, missing access controls, privilege escalation paths, and broken object-level authorization (BOLA/IDOR).

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  injection: `You are an Injection Vulnerabilities security specialist working as part of a multi-agent security scanning system.

Your exclusive focus: SQL injection, NoSQL injection, command injection, path traversal, LDAP injection, XML injection, template injection (SSTI), prototype pollution, and unsafe deserialization.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  secrets: `You are a Secrets & Sensitive Data Exposure specialist working as part of a multi-agent security scanning system.

Strategy: Use search_files extensively with targeted patterns before reading individual files.
Report every confirmed hardcoded secret or sensitive data exposure with report_finding, then call complete_analysis when done.`,

  dependency: `You are a Dependency Security specialist working as part of a multi-agent security scanning system.

Your exclusive focus: vulnerable library versions, insecure dependency configurations, supply-chain risks, and suspicious install scripts.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,

  general: `You are a General Security specialist working as part of a multi-agent security scanning system.

Your focus: XSS, CSRF, insecure cryptography, security misconfigurations, missing security headers, open redirects, and other issues not covered by specialist agents.

Report every confirmed finding with report_finding, then call complete_analysis when done.`,
};

registerProfile({
  id: "general",
  label: "General application security",
  coordinatorTool: COORDINATOR_TOOL,
  coordinatorSystem:
    "You are a security scan coordinator. Classify files into security analysis domains so specialist agents can focus their expertise.",
  buildCoordinatorUserMessage: (files) => `Classify these ${files.length} codebase files into the four security analysis domains:

${files.join("\n")}

Rules:
- auth: authentication/authorization/session/middleware/JWT/password/oauth/permission files
- injection: database queries, ORM usage, request body handlers, file path handlers, templates
- dependency: package.json, requirements.txt, Gemfile, go.mod, Cargo.toml, composer.json, *.lock files
- general: everything else

Every file must appear in exactly one category.`,
  formatCategoryLog: (categories) => {
    const c = categories as GeneralFileCategories;
    const total = c.auth.length + c.injection.length + c.dependency.length + c.general.length;
    return `Coordinator: ${c.auth.length} auth · ${c.injection.length} injection · ${c.dependency.length} dependency · ${c.general.length} general (${total} classified)`;
  },
  fallbackCategories: (files) => ({
    auth: [],
    injection: [],
    dependency: [],
    general: files,
  }),
  specialistPrompts: SPECIALIST_PROMPTS,
  buildAgentSpecs: (categories, allFiles) => {
    const c = categories as GeneralFileCategories;
    const secretsFiles = allFiles.length <= 20 ? allFiles : allFiles.slice(0, 20);
    return [
      { role: "auth", label: "Auth & Authorization", assignedFiles: c.auth },
      { role: "injection", label: "Injection Vulnerabilities", assignedFiles: c.injection },
      { role: "secrets", label: "Secrets & Exposure", assignedFiles: secretsFiles },
      { role: "dependency", label: "Dependency Security", assignedFiles: c.dependency },
      { role: "general", label: "General Security", assignedFiles: c.general },
    ].filter((spec) => spec.assignedFiles.length > 0) as AgentSpec[];
  },
  buildScanContext: (deltaScan) =>
    deltaScan
      ? "This is a CI delta scan of changed files only — prioritize regressions introduced in this diff."
      : "Analyse the full uploaded codebase.",
  synthesizerSystem:
    "You are a senior security analyst synthesising results from a multi-agent vulnerability scan. Produce an accurate, calibrated final assessment.",
  buildSynthesizerUserMessage: ({ projectName, critCount, highCount, medCount, lowCount, findingSummary }) =>
    `Project: ${projectName}

Multi-agent scan results:
- Critical findings: ${critCount}
- High findings: ${highCount}
- Medium findings: ${medCount}
- Low findings: ${lowCount}

Findings detail:
${findingSummary || "No findings reported"}

Produce the final security score and executive summary. The score should start at 100 and be reduced by: 20 per critical, 10 per high, 5 per medium, 2 per low (minimum 0).`,
});
