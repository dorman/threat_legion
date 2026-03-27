import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Github, AlertTriangle, CheckCircle2, XCircle, Search, Clock,
  ChevronRight, Loader2, Shield, Trash2, Key, Settings, Eye, EyeOff,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { NinjaHoodIcon } from "@/components/ui/NinjaHoodIcon";
import { format } from "date-fns";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  useGetMe, useListScans, useCreateScan, useDeleteScan, useSaveAiSettings,
  getGetMeQueryKey, getListScansQueryKey,
} from "@workspace/api-client-react";
import type { CreateScanMutationError } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getScoreColor, cn } from "@/lib/utils";

import { useDebouncer } from '@tanstack/pacer/react'
import { useThrottler } from '@tanstack/pacer/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

// inside Dashboard():
const [open, setOpen] = useState(true) // true = open on mount

// JSX:
<>
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>How to use Threat Legion</DialogTitle>
      </DialogHeader>

<p>
  <br>Open the dashboard and go to AI Settings.</br>
  <br>Choose your AI provider (Anthropic, OpenAI, DeepSeek, or Groq) and enter your API key.</br>
  <br>Paste a public GitHub repository URL into the scan input (e.g. https://github.com/owner/repo).</br>
  <br>Start the scan. The five agents will begin analyzing the repository in parallel.
  <br>Watch findings stream in as each agent reports vulnerabilities.</br>
  <br>Review the full report — each finding includes severity, affected file, line numbers, a code snippet, and remediation steps.</br>
  </p>
  
  </Dialog>



const [repoUrlError, setRepoUrlError] = useState("")

const debouncedValidate = useDebouncer(
  (url: string) => {
    if (url && !url.includes("github.com")) {
      setRepoUrlError("Only Github repos are allowed currently")
    } else {
      setRepoUrlError("")
    }
  },
  {wait: 400}
)

// in the input onChange:
onChange={(e) => {
  setRepoUrlError(e.target.value)
  setErrorStr("")
  debouncedValidate.maybeExecute(e.target.value)
}}

const throttledCreateScan = useThrottler(
  (url: string) => createScan({ data: { repoUrl: url } }),
  { wait:3000, leading: true, trailing :false }
)

//. replace createScan({ data: { repoUrl } }) in handleScanSubmit:
throttledCreateScan.maybeExecute(repoUrl)




const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai",    label: "OpenAI (GPT-4)" },
  { value: "deepseek",  label: "DeepSeek" },
  { value: "groq",      label: "Groq" },
] as const;
type ProviderValue = (typeof AI_PROVIDERS)[number]["value"];

const DEFAULT_MODELS: Record<ProviderValue, string> = {
  anthropic: "claude-opus-4-5",
  openai:    "gpt-4o",
  deepseek:  "deepseek-chat",
  groq:      "llama-3.3-70b-versatile",
};

const PROVIDER_KEY_HINTS: Record<ProviderValue, string> = {
  anthropic: "sk-ant-...",
  openai:    "sk-...",
  deepseek:  "sk-...",
  groq:      "gsk_...",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [repoUrl, setRepoUrl] = useState("");
  const [errorStr, setErrorStr] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderValue>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false }
  });

  const { data: scans, isLoading: isScansLoading } = useListScans({
    query: { queryKey: getListScansQueryKey() }
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

  const { mutate: deleteScan, isPending: isDeleting } = useDeleteScan({
    mutation: {
      onSuccess: () => {
        setConfirmDeleteId(null);
        void queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
      }
    }
  });

  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveAiSettings({
    mutation: {
      onSuccess: (updatedUser) => {
        void queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
        setApiKey("");
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      },
    }
  });

  useEffect(() => {
    if (user?.aiProvider) {
      setSelectedProvider(user.aiProvider as ProviderValue);
    }
    if (user?.aiModel) {
      setModel(user.aiModel);
    }
  }, [user?.aiProvider, user?.aiModel]);

  useEffect(() => {
    if (!settingsOpen || model) return;
    setModel(DEFAULT_MODELS[selectedProvider]);
  }, [selectedProvider, settingsOpen]);

  useEffect(() => {
    if (!model) setModel(DEFAULT_MODELS[selectedProvider]);
  }, [selectedProvider]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasApiKey = user?.hasApiKey ?? false;

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStr("");
    if (!hasApiKey) {
      setErrorStr("Configure your AI provider and API key in Settings below before scanning.");
      setSettingsOpen(true);
      return;
    }
    if (!repoUrl.trim()) { setErrorStr("Please enter a valid GitHub URL"); return; }
    if (!repoUrl.includes("github.com")) { setErrorStr("Only GitHub repositories are supported currently"); return; }
    createScan({ data: { repoUrl } });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    saveSettings({
      data: {
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        model: model.trim() || null,
      }
    });
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

          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Scan Form */}
            <div className="bg-card rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 blur-2xl" />

              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <NinjaHoodIcon className="w-5 h-5 text-primary" />
                New Security Scan
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a GitHub repository URL to begin an autonomous multi-agent vulnerability assessment.
              </p>

              {!hasApiKey && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Key className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">API key required</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add your AI provider key in <button onClick={() => setSettingsOpen(true)} className="underline hover:text-foreground transition-colors">Settings below</button> to start scanning.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      onChange={(e) => { setRepoUrl(e.target.value); setErrorStr(""); }}
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

                <Button
                  type="submit"
                  disabled={isCreating}
                  className="w-full h-11 font-semibold"
                >
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing Agents...</>
                  ) : (
                    <><Search className="w-4 h-4 mr-2" /> Start Autonomous Scan</>
                  )}
                </Button>
              </form>
            </div>

            {/* AI Settings Panel */}
            <div className="bg-card rounded-2xl border border-white/5 shadow-xl overflow-hidden">
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  <span className="font-medium">AI Provider Settings</span>
                  {hasApiKey && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                      {user?.aiProvider ?? "configured"}
                    </span>
                  )}
                </div>
                {settingsOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {settingsOpen && (
                <form onSubmit={handleSaveSettings} className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your key is stored encrypted and only used to call the selected provider during scans. It is never returned to the browser after saving.
                  </p>

                  {/* Provider */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Provider</label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => {
                        setSelectedProvider(e.target.value as ProviderValue);
                        setModel(DEFAULT_MODELS[e.target.value as ProviderValue]);
                      }}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      {AI_PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      API Key
                      {hasApiKey && (
                        <span className="ml-2 text-xs text-green-400 font-normal">• saved — enter new key to replace</span>
                      )}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showKey ? "text" : "password"}
                        placeholder={PROVIDER_KEY_HINTS[selectedProvider]}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full h-10 pl-10 pr-10 rounded-lg bg-background border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Model */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Model
                      <span className="ml-2 text-xs text-muted-foreground font-normal">optional — uses default if blank</span>
                    </label>
                    <input
                      type="text"
                      placeholder={DEFAULT_MODELS[selectedProvider]}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingSettings || !apiKey.trim()}
                    className="w-full h-10"
                  >
                    {isSavingSettings ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : settingsSaved ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> Saved!</>
                    ) : (
                      <><Key className="w-4 h-4 mr-2" /> Save API Key</>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Warning card */}
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
            <h2 className="text-2xl font-bold flex items-center gap-2">Scan History</h2>

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
                  You haven't run any vulnerability assessments yet. {!hasApiKey ? "Configure your AI provider key in Settings, then start" : "Start"} your first scan using the form on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scans.map(scan => {
                  const isConfirming = confirmDeleteId === scan.id;
                  const isDeletingThis = isDeleting && isConfirming;
                  const canDelete = scan.status === 'completed' || scan.status === 'failed';

                  return (
                    <div key={scan.id} className="relative group/card">
                      <Link
                        href={scan.status === 'completed' ? `/scans/${scan.id}` : `/scans/${scan.id}/progress`}
                        className={cn(
                          "block bg-card rounded-xl border border-white/5 p-5 hover:border-primary/30 transition-all group",
                          isConfirming && "border-destructive/40 hover:border-destructive/60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:block">{getStatusIcon(scan.status)}</div>
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

                          <div className="flex items-center gap-4">
                            {scan.status === 'completed' && (
                              <div className="hidden md:flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-sm bg-red-500/10 text-red-500 px-2 py-1 rounded-md font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" /> {scan.criticalCount} Critical
                                </div>
                                <div className="flex items-center gap-1.5 text-sm bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" /> {scan.highCount} High
                                </div>
                                <div className="flex flex-col items-center ml-2">
                                  <span className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Score</span>
                                  <span className={cn("text-xl font-bold font-mono", getScoreColor(scan.score || 0))}>
                                    {scan.score || 0}
                                  </span>
                                </div>
                              </div>
                            )}

                            {canDelete && (
                              <div className="flex items-center gap-2 ml-2" onClick={(e) => e.preventDefault()}>
                                {isConfirming ? (
                                  <>
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }}
                                      className="text-xs px-2.5 py-1 rounded-md border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                                      disabled={isDeletingThis}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteScan({ id: scan.id }); }}
                                      className="text-xs px-2.5 py-1 rounded-md bg-destructive/90 hover:bg-destructive text-white font-medium transition-colors flex items-center gap-1"
                                      disabled={isDeletingThis}
                                    >
                                      {isDeletingThis
                                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting…</>
                                        : <><Trash2 className="w-3 h-3" /> Confirm</>
                                      }
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(scan.id); }}
                                    className="opacity-0 group-hover/card:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                    title="Delete scan"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}

                            {!isConfirming && (
                              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
