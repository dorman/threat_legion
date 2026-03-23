import { Link, useLocation } from "wouter";
import { Shield, Search, Code, Zap, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";

export default function Home() {
  const { data: user, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false }
  });
  const [, setLocation] = useLocation();

  if (!isLoading && user) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 relative overflow-hidden">
        {/* Background Image & Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-background/80 z-10" /> {/* Dark Wash */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/90 to-background z-10" />
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Cyber aesthetic background" 
            className="w-full h-full object-cover opacity-50 mix-blend-screen"
          />
        </div>

        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Activity className="w-4 h-4 animate-pulse-fast" />
                <span>AI-Powered Security Operations</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                Agentic <span className="text-primary text-glow">Vulnerability Scanner</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Threat Legion autonomously reads, searches, and analyzes your GitHub repositories 
                to identify security vulnerabilities before they hit production. 
                Powered by Claude AI.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button asChild size="lg" className="h-14 px-8 text-lg w-full sm:w-auto font-semibold">
                <a href="/api/auth/login">
                  Sign in with Replit to Start
                </a>
              </Button>
              <Button asChild variant="glass" size="lg" className="h-14 px-8 text-lg w-full sm:w-auto">
                <a href="#features">
                  Learn More <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-white/5 bg-background">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Autonomous Threat Detection</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our multi-agent system doesn't just run static rules. It actively reads your code, follows execution paths, and understands context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Search className="w-8 h-8 text-primary" />,
                title: "Deep Context Analysis",
                desc: "Goes beyond regex matching. The agent understands control flow and business logic to find complex vulnerabilities."
              },
              {
                icon: <Code className="w-8 h-8 text-primary" />,
                title: "Actionable Remediation",
                desc: "Don't just get alerts. Receive specific code snippets and step-by-step instructions on how to patch the flaws."
              },
              {
                icon: <Zap className="w-8 h-8 text-primary" />,
                title: "Real-time Operations",
                desc: "Watch the AI agent work in real-time as it clones, reads, and analyzes your codebase file by file."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-card/50 border border-white/5 rounded-2xl p-8 hover:bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
