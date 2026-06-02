import {
  Shield, Zap, Bot, Terminal, Key, Github, ArrowRight, ExternalLink, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PromoVideo } from "@/components/PromoVideo";

const GITHUB_REPO = "https://github.com/dorman/threat_legion";

const FEATURES = [
  {
    icon: <Brain className="w-6 h-6 text-primary" />,
    title: "Prompt & tool injection",
    desc: "Finds user input merged into system prompts, indirect injection via RAG documents, and model output executed as shell, SQL, or code.",
  },
  {
    icon: <Bot className="w-6 h-6 text-primary" />,
    title: "Agents with too much power",
    desc: "Flags over-privileged MCP tools, missing human-in-the-loop on destructive actions, and unsafe patterns in .cursor rules and agent configs.",
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: "RAG tenant leaks",
    desc: "Catches vector queries without user filters, debug endpoints dumping chunks, and sensitive data embedded without redaction.",
  },
];

const BYOK_CARDS = [
  {
    icon: <Key className="w-6 h-6 text-primary" />,
    title: "Bring your own key",
    desc: "Anthropic, OpenAI, DeepSeek, Groq, or Gemini. Your key stays in CI or your server — no scanner markup.",
  },
  {
    icon: <Terminal className="w-6 h-6 text-primary" />,
    title: "CLI + PR delta scans",
    desc: "Default profile targets Cursor, agents, and RAG surfaces. Scan changed files on every pull request with threat-legion scan --ci.",
  },
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "Catch what Cursor missed",
    desc: "AI-generated diffs can skip auth, leak retrieval context, or enable dangerous tools. Threat Legion is the specialist layer for that.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/80 z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/90 to-background z-10" />
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover opacity-50 mix-blend-screen"
          />
        </div>

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Bot className="w-4 h-4" />
                <span>Cursor · Agents · RAG</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                Security for{" "}
                <span className="text-primary text-glow">AI-built</span>
                <br />
                software
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Threat Legion finds prompt injection, RAG leaks, and over-powered agent tools —
                the failures common when you ship with Cursor, coding agents, and retrieval pipelines.
                Run it on every PR. Bring your own API key.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button asChild size="lg" className="font-semibold h-12 px-8">
                <a href="/dashboard">
                  Open Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-semibold h-12 px-8 border-white/10 hover:border-white/20">
                <a href={`${GITHUB_REPO}#quick-start-cli--ci`} target="_blank" rel="noopener noreferrer">
                  <Terminal className="mr-2 w-4 h-4" /> CLI setup <ExternalLink className="ml-2 w-3.5 h-3.5 opacity-50" />
                </a>
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-2xl mx-auto">
            <PromoVideo />
          </div>
        </div>

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24 border-t border-white/5 pt-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the vibe-coding era</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Seven specialist agents review auth on LLM routes, prompt injection, RAG retrieval,
              agent tools, secrets in AI configs, and AI stack dependencies — not generic OWASP checkbox scans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card/50 border border-white/5 rounded-2xl p-8 hover:bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24 border-t border-white/5 pt-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Key className="w-3.5 h-3.5" /> Bring Your Own Key
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your model, your pipeline</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Use the provider you already pay for. Threat Legion orchestrates the scan —
              you control cost, data, and where it runs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {BYOK_CARDS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card/50 border border-white/5 rounded-2xl p-8 hover:bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="rounded-2xl border border-white/5 bg-card/30 p-8 text-center max-w-2xl mx-auto">
            <Github className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Open source</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
              MIT-licensed CLI, GitHub Action, and optional dashboard. Fork it, self-host it,
              or wire it into the way you already build with AI.
            </p>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <Github className="w-4 h-4" /> View on GitHub <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
