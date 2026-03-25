import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, Zap, Code, Search, ArrowRight, CheckCircle2, Loader2, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

type SubmitState = "idle" | "loading" | "success" | "error";

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

export default function Home() {
  const { data: user, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  if (!isLoading && user) return null;

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitState("loading");
    setMessage("");

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setSubmitState("success");
        setMessage(data.message ?? "You're on the list!");
      } else {
        setSubmitState("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitState("error");
      setMessage("Network error. Please try again.");
    }
  };

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
                <Activity className="w-4 h-4 animate-pulse" />
                <span>Join the Waitlist</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                Agentic{" "}
                <span className="text-primary text-glow">Vulnerability</span>
                <br />
                Scanner
              </h1>

              <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
                Threat Legion autonomously scans your <strong>public GitHub repositories</strong> for security vulnerabilities
                — with real-time AI reasoning, severity ranking, and code-level remediation.
              </p>
              <p className="text-sm text-muted-foreground/70 mb-12 max-w-xl mx-auto">
                We're putting the finishing touches on the platform. Drop your email below
                and we'll notify you when we launch.
              </p>
            </motion.div>

            {/* Waitlist Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Product Hunt badge */}
              <div className="flex justify-center mb-6">
                <a
                  href="https://www.producthunt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#DA552F]/30 bg-[#DA552F]/5 hover:bg-[#DA552F]/10 hover:border-[#DA552F]/50 transition-all group"
                >
                  <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <rect width="40" height="40" rx="8" fill="#DA552F"/>
                    <path d="M22.5 20c0 1.38-1.12 2.5-2.5 2.5h-3.75v-5H20c1.38 0 2.5 1.12 2.5 2.5z" fill="white"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M20 11.25C15.17 11.25 11.25 15.17 11.25 20S15.17 28.75 20 28.75 28.75 24.83 28.75 20 24.83 11.25 20 11.25zm-6.25 8.75V15h6.25a5 5 0 010 10H16.25v-5z" fill="white"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-0.5">Featured on</p>
                    <p className="text-sm font-bold text-[#DA552F] leading-none">Product Hunt</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#DA552F]/50 group-hover:text-[#DA552F] transition-colors ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M17 7H7M17 7v10"/>
                  </svg>
                </a>
              </div>

              {submitState === "success" ? (
                <div className="max-w-md mx-auto rounded-2xl border border-primary/30 bg-primary/10 p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">You're on the list!</h3>
                  <p className="text-muted-foreground text-sm">{message}</p>
                </div>
              ) : (
                <form
                  onSubmit={handleWaitlist}
                  className="max-w-md mx-auto bg-card/60 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
                >
                  <h2 className="text-lg font-semibold text-left">Join the waitlist</h2>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-4 rounded-lg bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      disabled={submitState === "loading"}
                    />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-lg bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      disabled={submitState === "loading"}
                    />
                  </div>

                  {submitState === "error" && (
                    <p className="text-sm text-destructive text-left">{message}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitState === "loading" || !email.trim()}
                    className="w-full h-11 font-semibold"
                  >
                    {submitState === "loading" ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                    ) : (
                      <>Join the Waitlist <ArrowRight className="ml-2 w-4 h-4" /></>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    No spam. Unsubscribe anytime.
                  </p>
                </form>
              )}

              <p className="mt-6 text-sm text-muted-foreground">
                Already have access?{" "}
                <a href="/api/auth/login" className="text-primary hover:underline font-medium">
                  Sign in with Replit
                </a>
              </p>
            </motion.div>
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

        {/* Social Proof / Trust Strip */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="rounded-2xl border border-white/5 bg-card/30 p-8 text-center max-w-2xl mx-auto">
            <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Built with privacy in mind</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Threat Legion only scans <strong>public repositories</strong>. Your private source code
              is never sent to any external AI service. AI analysis uses Claude AI (Anthropic) — which
              does not train on API data by default.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
