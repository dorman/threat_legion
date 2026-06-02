import { Link } from "wouter";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, Eye, Lock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const practices = [
  {
    icon: <Lock className="w-5 h-5 text-primary" />,
    title: "Encrypted connections",
    desc: "All data in transit uses TLS. Uploaded projects and scan results are not sent over unencrypted channels.",
  },
  {
    icon: <Eye className="w-5 h-5 text-primary" />,
    title: "Read-only analysis",
    desc: "Threat Legion analyzes uploaded source for the scan session — it does not modify your files or repository.",
  },
  {
    icon: <Shield className="w-5 h-5 text-primary" />,
    title: "Bring your own key",
    desc: "Inference runs through your configured provider. API keys are encrypted at rest and never returned to the browser.",
  },
  {
    icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
    title: "Session security",
    desc: "Authentication sessions are server-side, cryptographically signed, and expire after inactivity.",
  },
  {
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    title: "Ephemeral uploads",
    desc: "Uploaded source files are stored temporarily for the scan, then cleaned up from server temp storage.",
  },
  {
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    title: "Provider transparency",
    desc: "Scans use your chosen LLM provider (Anthropic, OpenAI, etc.). Review their data handling policies before scanning sensitive code.",
  },
];

export default function Security() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Security Notice</h1>
              <p className="text-sm text-muted-foreground mt-0.5">How ThreatLegion protects your data</p>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mt-4">
            We take the security of your code and account data seriously. This page describes how ThreatLegion is designed to protect your information, and what limitations you should be aware of.
          </p>
        </motion.div>

        {/* Security practices grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
          {practices.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="bg-card/50 border border-white/5 rounded-xl p-6 flex gap-4"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/5 border border-white/5 flex items-center justify-center">
                {p.icon}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Important caveat */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6 mb-10"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-300 mb-2">Scanner Limitation Disclosure</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Threat Legion is an <strong className="text-foreground">informational AI-app scanner</strong>, not a certification.
                It focuses on prompt injection, RAG leaks, and agent tools — but cannot detect every issue.
                Combine scans with manual review and professional testing for production systems.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Responsible disclosure */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-card/30 border border-white/5 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Responsible Disclosure
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you discover a security vulnerability in ThreatLegion itself, please disclose it responsibly. Contact us through the Replit platform before publishing any vulnerability details. We are committed to addressing valid security reports promptly and will credit researchers who report issues responsibly.
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
