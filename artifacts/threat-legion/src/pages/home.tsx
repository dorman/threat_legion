import {
  Shield, Zap, Code, Search, Key, Users, LineChart, Github, ArrowRight, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PromoVideo } from "@/components/PromoVideo";

const GITHUB_REPO = "https://github.com/threatlegion/threat-legion";

const FEATURES = [
  {
    icon: <Search className="w-6 h-6 text-primary" />,
    title: "Five Specialist Agents",
    desc: "A coordinator AI routes each file to the right expert: auth, injection, secrets, dependency, and general security agents — each with domain-specific reasoning.",
  },
  {
    icon: <Code className="w-6 h-6 text-primary" />,
    title: "Actionable Remediation",
    desc: "Don't just get alerts — receive specific code snippets and step-by-step instructions on how to patch every flaw found.",
  },
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "Real-time Parallel Streaming",
    desc: "Specialists run in parallel and stream findings the moment they're discovered — not after everything finishes. Watch multiple agents work simultaneously.",
  },
];

const BYOK_CARDS = [
  {
    icon: <Key className="w-6 h-6 text-primary" />,
    title: "Any major provider",
    desc: "Plug in your Anthropic, OpenAI, DeepSeek, or Groq API key. Threat Legion adapts the multi-agent protocol to whichever API you prefer.",
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: "Why not just prompt Claude yourself?",
    desc: "You could — but you'd need to build the five-agent architecture, file routing, tool schemas, and synthesis pass yourself. Threat Legion is that infrastructure, prebuilt and tuned for security analysis.",
  },
  {
    icon: <LineChart className="w-6 h-6 text-primary" />,
    title: "No mark-up, ever",
    desc: "Because you supply the key, there's no per-scan fee. Run as many scans as your API budget allows — no subscription required.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/80 z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/90 to-background z-10" />
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover opacity-50 mix-blend-screen"
          />
        </div>

        {/* Hero */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Github className="w-4 h-4" />
                <span>Open Source</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                Agentic{" "}
                <span className="text-primary text-glow">Vulnerability</span>
                <br />
                Scanner
              </h1>

              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                A multi-agent AI system that scans your <strong>GitHub repositories</strong> for
                security vulnerabilities — with real-time reasoning, severity ranking, and code-level remediation.
                Bring your own API key.
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
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 w-4 h-4" /> View Source <ExternalLink className="ml-2 w-3.5 h-3.5 opacity-50" />
                </a>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Promo Video */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-2xl mx-auto">
            <PromoVideo />
          </div>
        </div>

        {/* Features Section */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24 border-t border-white/5 pt-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A multi-agent AI system that doesn't just run static rules — it actively reads your
              code, follows execution paths, and understands context.
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

        {/* BYOK Section */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24 border-t border-white/5 pt-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Key className="w-3.5 h-3.5" /> Bring Your Own Key
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your model, your rules</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Use the AI provider you already trust and pay for. Threat Legion works with
              Anthropic, OpenAI, DeepSeek, and Groq — you stay in full control of your data and costs.
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

        {/* Open Source Strip */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="rounded-2xl border border-white/5 bg-card/30 p-8 text-center max-w-2xl mx-auto">
            <Github className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Free and open source</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
              Threat Legion is MIT-licensed and fully open source. Read the code, fork it, self-host it,
              or contribute. Your AI provider key goes directly to the provider — Threat Legion never stores it in plaintext.
            </p>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <Github className="w-4 h-4" /> View the source on GitHub <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
