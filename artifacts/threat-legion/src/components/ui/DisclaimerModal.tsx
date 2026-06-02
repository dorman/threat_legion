import { useState } from "react";
import { AlertTriangle, Shield, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcceptDisclaimer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface DisclaimerModalProps {
  onAccepted: () => void;
}

export function DisclaimerModal({ onAccepted }: DisclaimerModalProps) {
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: acceptDisclaimer, isPending } = useAcceptDisclaimer({
    mutation: {
      onSuccess: (updatedUser) => {
        queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
        onAccepted();
      },
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-background border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />

        <div className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">AI-App Security Disclaimer</h2>
              <p className="text-muted-foreground text-sm">Please read before scanning Cursor, agent, or RAG projects</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground mb-8 max-h-72 overflow-y-auto pr-2">
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-yellow-200/80">
              <strong className="text-yellow-400 block mb-1">No Security Guarantee</strong>
              Threat Legion scans for AI-app risks (prompt injection, RAG leaks, agent tools) using your chosen LLM provider. It <strong className="text-foreground">does not guarantee detection of all issues</strong> — including classic appsec bugs, logic flaws, or novel agent abuse patterns.
            </div>

            <p>
              <strong className="text-foreground">Scan results reflect a point-in-time snapshot</strong> of your uploaded project. A clean report does not mean your LLM routes, retrieval layer, or agent tools are safe.
            </p>

            <p>
              <strong className="text-foreground">Not a substitute for professional security review.</strong> These results should be used as one input among many in your security program. You should always employ manual code review, penetration testing, and professional security audits in addition to automated scanning.
            </p>

            <p>
              <strong className="text-foreground">Limitation of liability.</strong> By using this tool, you acknowledge that Threat Legion and its operators are not liable for any security breach, data loss, or damages arising from vulnerabilities that were present in your code at the time of scanning — whether detected or undetected — or from vulnerabilities introduced after scanning.
            </p>

            <p>
              <strong className="text-foreground">You are responsible for your own security.</strong> It is your responsibility as the project owner to maintain secure LLM routes, retrieval layers, and agent tools, conduct regular reviews, and act on scan findings promptly. A clean scan report does not constitute a warranty or certification of security.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium text-xs">What this tool does</span>
              </div>
              <p className="text-xs">Analyzes uploaded source with the AI-app profile: prompt surfaces, RAG pipelines, agent/MCP configs, and related auth/secrets. Results are informational — not a certification.</p>
            </div>
          </div>

          <button
            onClick={() => setAgreed(!agreed)}
            className="flex items-start gap-3 mb-6 text-left w-full group"
          >
            <span className="shrink-0 mt-0.5 text-primary">
              {agreed
                ? <CheckSquare className="w-5 h-5" />
                : <Square className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              }
            </span>
            <span className="text-sm text-foreground leading-relaxed">
              I have read and understand the disclaimer above. I acknowledge that Threat Legion may not detect all vulnerabilities, and I agree that its operators are not liable for any security incidents related to missed findings or post-scan changes.
            </span>
          </button>

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!agreed || isPending}
            onClick={() => acceptDisclaimer()}
          >
            {isPending ? "Saving..." : "Accept and Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
