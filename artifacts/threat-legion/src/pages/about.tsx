import { Shield, Zap, Code, Lock, Eye, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NinjaHoodIcon } from "@/components/ui/NinjaHoodIcon";

const VALUES = [
  {
    icon: <Eye className="w-6 h-6 text-primary" />,
    title: "Transparency first",
    desc: "We explain which specialist reviews each file, which provider runs the scan, and what AI-app risks we do not cover.",
  },
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    title: "Your key, your provider",
    desc: "Bring your own API key. Code is analyzed via the provider you choose — we store keys encrypted and never return them to the browser.",
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: "Honest about limitations",
    desc: "AI-app scanning is a strong first pass for prompt injection and agent tools — not a guarantee. Always review findings manually.",
  },
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "Built for PR velocity",
    desc: "Delta scans and CI integration mean you can check AI-assisted diffs without scanning entire monorepos every time.",
  },
  {
    icon: <Code className="w-6 h-6 text-primary" />,
    title: "Actionable results",
    desc: "Findings include severity, file location, and remediation tuned to LLM apps — not generic OWASP boilerplate.",
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: "Built for Cursor-era devs",
    desc: "Upload a project, wire the CLI into CI, or use the dashboard — security that fits how you actually ship with AI.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <NinjaHoodIcon className="h-7 w-7" />
                </div>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">About ThreatLegion</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Security for software built with <span className="text-primary">AI</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Threat Legion helps developers who ship with Cursor, coding agents, and RAG catch
                prompt injection, retrieval leaks, and over-powered tools — before they merge.
                We built it because generic scanners do not understand AI-assisted failure modes,
                and prompting Claude yourself does not give you CI guardrails or specialist routing.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-white/5">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-6">Our mission</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  When code is AI-generated or orchestrates models, new risks appear: user messages
                  merged into system prompts, vector queries without tenant filters, MCP tools that
                  can read secrets or run shell commands, and API keys pasted into Cursor rules.
                </p>
                <p>
                  Threat Legion&apos;s default <strong className="text-foreground">ai-app profile</strong> routes
                  files to seven specialists — auth on LLM routes, prompt & tool injection, RAG retrieval,
                  agent/MCP configs, secrets in AI configs, dependencies, and general AI-app hygiene.
                  They run in parallel and stream findings as they go.
                </p>
                <p>
                  Use the <strong className="text-foreground">CLI on pull requests</strong> for delta scans,
                  or upload a project in the dashboard for a full local audit. You bring your own
                  provider key — we orchestrate the specialists, not markup on inference.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-white/5">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">What we stand for</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The principles that shape every decision we make about ThreatLegion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-card/50 border border-white/5 rounded-2xl p-6 hover:border-primary/20 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  {v.icon}
                </div>
                <h3 className="font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it's built */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-6">How it works</h2>
              <div className="space-y-6">
                {[
                  {
                    step: "01",
                    title: "Add your provider key",
                    desc: "Save your Anthropic, OpenAI, or other API key in Settings (dashboard) or THREAT_LEGION_API_KEY (CLI).",
                  },
                  {
                    step: "02",
                    title: "Upload or diff your project",
                    desc: "Dashboard: upload a folder/ZIP with your app, .cursor rules, and RAG code. CLI: scan git-changed files on each PR.",
                  },
                  {
                    step: "03",
                    title: "Coordinator routes AI surfaces",
                    desc: "Files are classified into auth, injection, RAG, agent tools, dependencies, and general — tuned for LLM apps.",
                  },
                  {
                    step: "04",
                    title: "Specialists stream findings",
                    desc: "Each specialist runs an agentic review and reports prompt injection, retrieval leaks, dangerous tools, and secrets live.",
                  },
                  {
                    step: "05",
                    title: "Review the AI-app report",
                    desc: "Get a score, executive summary, and remediation steps focused on Cursor, agents, and RAG — not generic noise.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
