import { useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Loader2, Terminal, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useScanStream } from "@/hooks/use-scan-stream";
import { useGetScan, getGetScanQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {useRateLimiter} from '@tanstack/pacer/react'

const rateLimitedAddFinding = useRateLimiter(
  (finding: Finding) => setFindings(prev => [...prev, finding]),
  { limit: 5, window:1000 }
)

// in your SSE onmessage handler, replace direct setState:
if (e.type === 'finding') {
  rateLimitedAddFinding.maybeExecute(e.finding)
}

export default function ScanProgress() {
  const [, params] = useRoute("/scans/:id/progress");
  const scanId = params?.id ? parseInt(params.id) : undefined;
  const [, setLocation] = useLocation();
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const { data: scan } = useGetScan(scanId!, {
    query: { queryKey: getGetScanQueryKey(scanId!), enabled: !!scanId, retry: false }
  });

  const { logs, findings, status, result, error } = useScanStream(scanId);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // If already completed on load, redirect immediately
  useEffect(() => {
    if (scan?.status === "completed" && status === "idle") {
      setLocation(`/scans/${scanId}`);
    }
  }, [scan, status, scanId, setLocation]);

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8 overflow-hidden h-full">
        
        {/* Left Column: Context & Stats */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="bg-card rounded-xl border border-white/5 p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" /> 
              Active Assessment
            </h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-sm text-muted-foreground">Target Repository</p>
                <p className="font-mono text-sm mt-1 bg-secondary/50 p-2 rounded border border-white/5 truncate">
                  {scan ? `${scan.repoOwner}/${scan.repoName}` : "Loading..."}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                <div className="flex items-center gap-3">
                  {status === 'connecting' && <><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">Connecting to agent...</span></>}
                  {status === 'running' && <><Loader2 className="w-4 h-4 animate-spin text-primary" /> <span className="text-primary font-medium">Agent actively analyzing...</span></>}
                  {status === 'completed' && <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="text-green-500 font-medium">Analysis Complete</span></>}
                  {status === 'error' && <span className="text-destructive font-medium">Error: {error}</span>}
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Real-time Discoveries
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-mono font-bold text-red-500">
                    {findings.filter(f => f.severity === 'critical').length}
                  </div>
                  <div className="text-xs font-medium text-red-500/80 uppercase tracking-wider mt-1">Critical</div>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-mono font-bold text-orange-500">
                    {findings.filter(f => f.severity === 'high').length}
                  </div>
                  <div className="text-xs font-medium text-orange-500/80 uppercase tracking-wider mt-1">High</div>
                </div>
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-mono font-bold text-yellow-500">
                    {findings.filter(f => f.severity === 'medium').length}
                  </div>
                  <div className="text-xs font-medium text-yellow-500/80 uppercase tracking-wider mt-1">Medium</div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-mono font-bold text-blue-500">
                    {findings.filter(f => f.severity === 'low').length}
                  </div>
                  <div className="text-xs font-medium text-blue-500/80 uppercase tracking-wider mt-1">Low</div>
                </div>
              </div>
            </div>

            {status === 'completed' && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button asChild className="w-full h-12 text-base font-semibold shadow-xl shadow-primary/20">
                  <Link href={`/scans/${scanId}`}>
                    View Full Report <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Terminal */}
        <div className="w-full lg:w-2/3 flex flex-col bg-black rounded-xl border border-white/10 shadow-2xl overflow-hidden relative font-mono text-sm leading-relaxed">
          {/* Terminal Header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">agent_execution_log.sh</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
          </div>

          {/* Terminal Output */}
          <div 
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 terminal-scrollbar space-y-1.5 text-gray-300"
          >
            <div className="text-primary opacity-80 mb-4">
              [SYSTEM] Starting Threat Legion Autonomous Agent...<br/>
              [SYSTEM] Target: {scan?.repoUrl || 'Loading...'}<br/>
              [SYSTEM] Model: Claude 3.5 Sonnet<br/>
              [SYSTEM] Status: Initializing sandbox...
            </div>
            
            {logs.map((log, i) => {
              const isAlert = log.includes("[ALERT]");
              const isTool = log.includes("Using tool");
              
              return (
                <div key={i} className={
                  isAlert ? "text-red-400 font-medium" :
                  isTool ? "text-cyan-400" :
                  "text-gray-300"
                }>
                  <span className="opacity-50 select-none mr-2">
                    {new Date().toISOString().split('T')[1].slice(0,8)}
                  </span>
                  {log}
                </div>
              );
            })}
            
            {status === 'running' && (
              <div className="flex items-center gap-2 mt-2 text-primary opacity-80">
                <span className="w-2 h-4 bg-primary animate-pulse" />
              </div>
            )}

            {status === 'completed' && (
              <div className="mt-6 text-green-400 font-bold">
                [SYSTEM] Assessment complete.<br/>
                [SYSTEM] Security Score: {result?.score}/100<br/>
                [SYSTEM] Generated final report. Ready for review.
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
}
