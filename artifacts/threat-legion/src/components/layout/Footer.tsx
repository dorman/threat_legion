import { Link } from "wouter";
import { NinjaHoodIcon } from "@/components/ui/NinjaHoodIcon";
import { Github, Shield, Key } from "lucide-react";

const GITHUB_REPO = "https://github.com/threatlegion/threat-legion";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-background/80 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <NinjaHoodIcon className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                Threat<span className="text-primary">Legion</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Open-source agentic vulnerability scanner for GitHub repositories.
              Bring your own AI provider key — no subscriptions, no lock-in.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Key className="w-3.5 h-3.5 text-primary/60" />
              <span>BYOK — Anthropic, OpenAI, DeepSeek, Groq</span>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Product</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" /> Source Code
                </a>
              </li>
              <li>
                <a href="/api/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Legal</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Security Notice
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © {year} ThreatLegion — MIT Licensed
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Shield className="w-3.5 h-3.5" />
            <span>Scan results are informational only — not a security guarantee.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
