import { Shield, Zap, Code, Lock, Eye, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NinjaHoodIcon } from "@/components/ui/NinjaHoodIcon";

const VALUES = [
  {
    icon: <Eye className="w-6 h-6 text-primary" />,
    title: "Transparency first",
    desc: "We tell you exactly how the scanner works, what AI provider processes your code, and what it cannot do. No black boxes.",
  },
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    title: "Privacy by design",
    desc: "Only public repositories are scanned. Private source code is never sent to any external AI service — ever.",
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: "Honest about limitations",
    desc: "AI scanning is a powerful first pass, not a guarantee. We always remind you to complement our results with manual review.",
  },
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "Speed without compromise",
    desc: "Real-time streaming means you see findings the moment they're discovered — no waiting for a batch report.",
  },
  {
    icon: <Code className="w-6 h-6 text-primary" />,
    title: "Actionable results",
    desc: "Every finding comes with a severity rating, the exact file and line, and a concrete remediation step — not just a warning.",
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: "Built for developers",
    desc: "Security tooling that fits into your workflow, not the other way around. Paste a URL, get answers.",
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
                Security tooling that actually <span className="text-primary">tells you the truth</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                ThreatLegion is an autonomous, AI-powered vulnerability scanner built to give developers
                clear, actionable insight into the security posture of their public GitHub repositories.
                We built it because most security tools either overwhelm you with noise or hide behind
                vague scores. We do neither.
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
                  Most security vulnerabilities aren't exotic — they're the same classes of bugs
                  (SQL injection, hardcoded credentials, insecure dependencies) found again and again
                  in production code. The problem isn't that developers don't care; it's that the
                  tooling to catch these issues is either too slow, too expensive, or requires a
                  dedicated security team to interpret.
                </p>
                <p>
                  ThreatLegion changes that. Our multi-agent AI system reads your codebase the way a
                  security engineer would — following data flows, understanding context, and reasoning
                  about your actual business logic — then surfaces findings with the severity ratings
                  and fix instructions you need to act immediately.
                </p>
                <p>
                  We scan only <strong className="text-foreground">public repositories</strong> by
                  design. Code is analysed by Claude AI (Anthropic), which does not train on API data
                  by default. We believe good security tooling should never require you to compromise
                  your own privacy to use it.
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
                    title: "Authenticate & submit",
                    desc: "Sign in with Replit, paste any public GitHub repository URL, and ThreatLegion verifies you have authorisation before touching a single file.",
                  },
                  {
                    step: "02",
                    title: "Multi-agent analysis",
                    desc: "An AI agent autonomously fetches the file tree, selects high-risk files, and reads their content — reasoning about data flows, auth patterns, and dependency chains.",
                  },
                  {
                    step: "03",
                    title: "Real-time findings stream",
                    desc: "Vulnerabilities surface via live SSE streaming as soon as the agent finds them. Critical and high-severity issues appear first.",
                  },
                  {
                    step: "04",
                    title: "Remediation guidance",
                    desc: "Each finding includes the exact file, line numbers, a description of the risk, and concrete steps to fix it — not just a severity badge.",
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
