import { useRoute, Link } from "wouter";
import { ArrowLeft, ShieldCheck, ShieldAlert, Shield, FileText, Code2, AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useGetScan, type Finding } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { getScoreColor, getSeverityColor, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ScanResults() {
  const [, params] = useRoute("/scans/:id");
  const scanId = params?.id ? parseInt(params.id) : undefined;
  
  const { data: scan, isLoading, isError } = useGetScan(scanId!, {
    query: { enabled: !!scanId, retry: false }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (isError || !scan) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Scan Not Found</h1>
            <p className="text-muted-foreground mb-6">This scan doesn't exist or you don't have access.</p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const score = scan.score || 0;
  
  // Sort findings by severity (Critical -> High -> Medium -> Low)
  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedFindings = [...(scan.findings || [])].sort((a, b) => 
    severityOrder[b.severity] - severityOrder[a.severity]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Navigation */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              Security Report
            </h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <Github className="w-4 h-4" />
              <a href={scan.repoUrl} target="_blank" rel="noreferrer" className="hover:text-primary underline underline-offset-4 decoration-white/20 hover:decoration-primary transition-colors">
                {scan.repoOwner}/{scan.repoName}
              </a>
              <span className="text-border mx-2">•</span>
              <span>{format(new Date(scan.createdAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>
          
          {scan.status !== 'completed' && (
            <Button asChild variant="outline" className="border-primary/50 text-primary">
              <Link href={`/scans/${scan.id}/progress`}>
                View Live Progress <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Summary */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Score Card */}
            <div className="bg-card rounded-2xl border border-white/5 p-8 shadow-lg text-center relative overflow-hidden">
              <div className={cn(
                "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
                score >= 90 ? "from-green-500/50 via-green-500 to-green-500/50" :
                score >= 70 ? "from-yellow-500/50 via-yellow-500 to-yellow-500/50" :
                score >= 50 ? "from-orange-500/50 via-orange-500 to-orange-500/50" :
                "from-red-500/50 via-red-500 to-red-500/50"
              )} />
              
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                Overall Security Score
              </h3>
              
              <div className="relative inline-flex items-center justify-center mb-6">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle 
                    cx="80" cy="80" r="70" 
                    className="stroke-secondary fill-none" 
                    strokeWidth="12" 
                  />
                  <circle 
                    cx="80" cy="80" r="70" 
                    className={cn("fill-none transition-all duration-1000 ease-out stroke-current", getScoreColor(score))} 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    strokeDasharray="439.8"
                    strokeDashoffset={439.8 - (439.8 * score) / 100}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={cn("text-5xl font-bold font-mono", getScoreColor(score))}>
                    {score}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {score >= 90 ? "Excellent security posture. Keep it up!" :
                 score >= 70 ? "Good posture, but some issues need attention." :
                 score >= 50 ? "Significant vulnerabilities detected." :
                 "Critical security flaws require immediate action."}
              </p>
            </div>
            
            {/* Stats Breakdown */}
            <div className="bg-card rounded-2xl border border-white/5 p-6 shadow-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Findings Breakdown
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-2 text-red-500 font-medium">
                    <AlertTriangle className="w-4 h-4" /> Critical
                  </div>
                  <span className="font-mono text-lg font-bold text-red-500">{scan.criticalCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <div className="flex items-center gap-2 text-orange-500 font-medium">
                    <AlertCircle className="w-4 h-4" /> High
                  </div>
                  <span className="font-mono text-lg font-bold text-orange-500">{scan.highCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <div className="flex items-center gap-2 text-yellow-500 font-medium">
                    <Info className="w-4 h-4" /> Medium
                  </div>
                  <span className="font-mono text-lg font-bold text-yellow-500">{scan.mediumCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2 text-blue-500 font-medium">
                    <Shield className="w-4 h-4" /> Low
                  </div>
                  <span className="font-mono text-lg font-bold text-blue-500">{scan.lowCount}</span>
                </div>
              </div>
            </div>
            
            {/* Agent Summary */}
            {scan.summary && (
              <div className="bg-card rounded-2xl border border-white/5 p-6 shadow-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Executive Summary
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {scan.summary}
                </p>
              </div>
            )}
            
          </div>
          
          {/* Right Column: Findings List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Identified Vulnerabilities
              <span className="text-sm font-normal text-muted-foreground bg-secondary px-3 py-1 rounded-full ml-2">
                {sortedFindings.length} Total
              </span>
            </h2>
            
            {sortedFindings.length === 0 ? (
              <div className="bg-card border border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-medium mb-2">No Vulnerabilities Found</h3>
                <p className="text-muted-foreground max-w-sm">
                  The agent did not detect any security issues in this repository during its analysis.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="bg-card rounded-xl border border-white/5 overflow-hidden shadow-lg group hover:border-white/10 transition-colors">
      <div className="p-5 md:p-6 border-b border-white/5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
            {finding.title}
          </h3>
          <span className={cn(
            "shrink-0 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border",
            getSeverityColor(finding.severity)
          )}>
            {finding.severity}
          </span>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          {finding.description}
        </p>
        
        {finding.filePath && (
          <div className="flex items-center gap-2 text-sm bg-secondary/50 border border-white/5 p-3 rounded-lg overflow-x-auto">
            <Code2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-gray-300">
              {finding.filePath}
            </span>
            {(finding.lineStart || finding.lineEnd) && (
              <span className="text-muted-foreground font-mono ml-auto shrink-0 bg-black/40 px-2 py-0.5 rounded">
                Lines {finding.lineStart}{finding.lineEnd !== finding.lineStart ? `-${finding.lineEnd}` : ''}
              </span>
            )}
          </div>
        )}
      </div>
      
      {finding.codeSnippet && (
        <div className="bg-[#0a0a0a] p-5 border-b border-white/5 overflow-x-auto">
          <pre className="font-mono text-sm text-gray-300">
            <code>{finding.codeSnippet}</code>
          </pre>
        </div>
      )}
      
      <div className="p-5 md:p-6 bg-primary/5 border-t border-primary/10">
        <h4 className="font-semibold text-primary flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" /> Remediation Advice
        </h4>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
          <p className="leading-relaxed whitespace-pre-wrap">{finding.remediation}</p>
        </div>
      </div>
    </div>
  );
}

// GitHub icon for reuse
function Github(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}
