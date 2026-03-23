import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Github, Shield, AlertTriangle, CheckCircle2, XCircle, Search, Clock, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useGetMe, useListScans, useCreateScan } from "@workspace/api-client-react";
import { getScoreColor, cn } from "@/lib/utils";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [repoUrl, setRepoUrl] = useState("");
  const [errorStr, setErrorStr] = useState("");
  
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useGetMe({
    query: { retry: false }
  });
  
  const { data: scans, isLoading: isScansLoading } = useListScans({
    query: { enabled: !!user }
  });
  
  const { mutate: createScan, isPending: isCreating } = useCreateScan({
    mutation: {
      onSuccess: (data) => {
        setLocation(`/scans/${data.id}/progress`);
      },
      onError: (err: any) => {
        setErrorStr(err.response?.data?.error || "Failed to start scan. Ensure you own this repository.");
      }
    }
  });

  if (isUserError) {
    setLocation("/");
    return null;
  }

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr("");
    if (!repoUrl.trim()) {
      setErrorStr("Please enter a valid GitHub URL");
      return;
    }
    if (!repoUrl.includes("github.com")) {
      setErrorStr("Only GitHub repositories are supported currently");
      return;
    }
    createScan({ data: { repoUrl } });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Create Scan */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 blur-2xl" />
              
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                New Security Scan
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a GitHub repository URL you own to begin an autonomous vulnerability assessment.
              </p>
              
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="repoUrl" className="text-sm font-medium">Repository URL</label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="repoUrl"
                      type="url"
                      placeholder="https://github.com/username/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className={cn(
                        "w-full h-11 pl-10 pr-4 rounded-lg bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm",
                        errorStr && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                      disabled={isCreating}
                    />
                  </div>
                  {errorStr && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> {errorStr}
                    </p>
                  )}
                </div>
                
                <Button type="submit" disabled={isCreating} className="w-full h-11 font-semibold">
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing Agent...</>
                  ) : (
                    <><Search className="w-4 h-4 mr-2" /> Start Autonomous Scan</>
                  )}
                </Button>
              </form>
            </div>
            
            <div className="bg-secondary/50 rounded-xl p-5 border border-white/5">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Authorization Required
              </h3>
              <p className="text-sm text-muted-foreground">
                For security and ethical reasons, Threat Legion will verify you are an owner or collaborator of the target repository via your connected GitHub account.
              </p>
            </div>
          </div>
          
          {/* Right Column: Scan History */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Scan History
            </h2>
            
            {isScansLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-card/50 rounded-xl border border-white/5 animate-pulse" />
                ))}
              </div>
            ) : !scans?.length ? (
              <div className="bg-card border border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-2">No scans yet</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  You haven't run any vulnerability assessments yet. Start your first scan using the form on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scans.map(scan => (
                  <Link 
                    key={scan.id} 
                    href={scan.status === 'completed' ? `/scans/${scan.id}` : `/scans/${scan.id}/progress`}
                    className="block bg-card rounded-xl border border-white/5 p-5 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block">
                          {getStatusIcon(scan.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {scan.repoOwner}/{scan.repoName}
                            </h3>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                              scan.status === 'completed' ? "bg-green-500/10 text-green-500" :
                              scan.status === 'failed' ? "bg-red-500/10 text-red-500" :
                              "bg-primary/10 text-primary"
                            )}>
                              {scan.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(scan.createdAt), 'MMM d, yyyy HH:mm')}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {scan.status === 'completed' && (
                          <div className="hidden md:flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-sm bg-red-500/10 text-red-500 px-2 py-1 rounded-md font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" /> {scan.criticalCount} Critical
                            </div>
                            <div className="flex items-center gap-1.5 text-sm bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" /> {scan.highCount} High
                            </div>
                            <div className="flex flex-col items-center ml-4">
                              <span className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Score</span>
                              <span className={cn("text-xl font-bold font-mono", getScoreColor(scan.score || 0))}>
                                {scan.score || 0}
                              </span>
                            </div>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
