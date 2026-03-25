import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Github, AlertTriangle, CheckCircle2, XCircle, Search, Clock, ChevronRight, Loader2, Shield, Lock } from "lucide-react";
import { NinjaHoodIcon } from "@/components/ui/NinjaHoodIcon";
import { format } from "date-fns";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { DisclaimerModal } from "@/components/ui/DisclaimerModal";
import { useGetMe, useListScans, useCreateScan, getGetMeQueryKey, getListScansQueryKey } from "@workspace/api-client-react";
import type { CreateScanMutationError } from "@workspace/api-client-react";
import { getScoreColor, cn } from "@/lib/utils";

type RepoCheck = "idle" | "checking" | "public" | "private" | "not_found";

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [repoUrl, setRepoUrl] = useState("");
  const [errorStr, setErrorStr] = useState("");
  const [repoCheck, setRepoCheck] = useState<RepoCheck>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: user, isLoading: isUserLoading, isError: isUserError } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false }
  });

  const { data: scans, isLoading: isScansLoading } = useListScans({
    query: { queryKey: getListScansQueryKey(), enabled: !!user }
  });

  const { mutate: createScan, isPending: isCreating } = useCreateScan({
    mutation: {
      onSuccess: (data) => {
        setLocation(`/scans/${data.id}/progress`);
      },
      onError: (err: CreateScanMutationError) => {
        setErrorStr(err.data?.error ?? "Failed to start scan. Ensure you own or collaborate on this repository.");
      }
    }
  });

  useEffect(() => {
    if (!isUserLoading && isUserError) {
      setLocation("/");
    }
  }, [isUserLoading, isUserError, setLocation]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const parsed = parseGithubUrl(repoUrl);
    if (!parsed) {
      setRepoCheck("idle");
      return;
    }

    setRepoCheck("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
          { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }
        );
        if (res.status === 404) {
          setRepoCheck("private");
          return;
        }
        if (!res.ok) {
          setRepoCheck("not_found");
          return;
        }
        const data = (await res.json()) as { private?: boolean };
        setRepoCheck(data.private ? "private" : "public");
      } catch {
        setRepoCheck("not_found");
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [repoUrl]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const hasAcceptedDisclaimer = !!user.acceptedDisclaimerAt;

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
    if (repoCheck === "private") {
      setErrorStr("Private repositories cannot be scanned due to data privacy restrictions.");
      return;
    }
    if (repoCheck === "checking") {
      setErrorStr("Please wait while we verify the repository...");
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
      {!hasAcceptedDisclaimer && (
        <DisclaimerModal onAccepted={() => {}} />
      )}

      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Create Scan */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 blur-2xl" />

              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <NinjaHoodIcon className="w-5 h-5 text-primary" />
                New Security Scan
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a GitHub repository URL you own or collaborate on to begin an autonomous vulnerability assessment.
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
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setErrorStr("");
                      }}
                      className={cn(
                        "w-full h-11 pl-10 pr-10 rounded-lg bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm",
                        (errorStr || repoCheck === "private") && "border-destructive focus:border-destructive focus:ring-destructive/20",
                        repoCheck === "public" && "border-green-500/60 focus:border-green-500 focus:ring-green-500/20"
                      )}
                      disabled={isCreating}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {repoCheck === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {repoCheck === "public" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {repoCheck === "private" && <Lock className="w-4 h-4 text-destructive" />}
                    </div>
                  </div>

                  {repoCheck === "private" && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 mt-2">
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-destructive">Private repository — cannot scan</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            ThreatLegion sends code to a third-party AI provider (Claude AI by Anthropic) for analysis. To protect your privacy, only <strong>public repositories</strong> are permitted. Private source code is never shared with external AI services.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {repoCheck === "public" && !errorStr && (
                    <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Public repository confirmed — safe to scan
                    </p>
                  )}

                  {errorStr && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> {errorStr}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isCreating || repoCheck === "private" || repoCheck === "checking"}
                  className="w-full h-11 font-semibold"
                >
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing Agent...</>
                  ) : repoCheck === "checking" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking Repository...</>
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
                For security and ethical reasons, Threat Legion verifies you are an owner or collaborator of the target repository via your connected GitHub account.
              </p>
            </div>

            <div className="bg-secondary/30 rounded-xl p-5 border border-yellow-500/10">
              <h3 className="font-medium mb-2 flex items-center gap-2 text-yellow-400/80">
                <Shield className="w-4 h-4" /> Scanner Limitation Notice
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan results are not a security guarantee. Threat Legion may miss vulnerabilities. Always complement AI scanning with manual review and professional security testing.
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
      <Footer />
    </div>
  );
}
