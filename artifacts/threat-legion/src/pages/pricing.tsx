import { Link } from "wouter";
import { Check, X, Shield, Zap, Lock, ArrowLeft, Crown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  useGetMe,
  getGetMeQueryKey,
  useGetSubscription,
  getGetSubscriptionQueryKey,
  useUpgradeTier,
  useDowngradeTier,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  { text: "Unlimited repository scans", included: true },
  { text: "Low severity findings", included: true },
  { text: "Medium severity findings", included: true },
  { text: "Security score & summary", included: true },
  { text: "High severity findings", included: false },
  { text: "Critical severity findings", included: false },
  { text: "Full remediation details", included: false },
  { text: "Code snippets for all findings", included: false },
];

const PRO_FEATURES = [
  { text: "Unlimited repository scans", included: true },
  { text: "Low severity findings", included: true },
  { text: "Medium severity findings", included: true },
  { text: "Security score & summary", included: true },
  { text: "High severity findings", included: true },
  { text: "Critical severity findings", included: true },
  { text: "Full remediation details", included: true },
  { text: "Code snippets for all findings", included: true },
];

export default function Pricing() {
  const { data: user } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });
  const { data: subscription } = useGetSubscription({
    query: { queryKey: getGetSubscriptionQueryKey(), retry: false, enabled: !!user },
  });

  const queryClient = useQueryClient();

  const { mutate: upgrade, isPending: isUpgrading } = useUpgradeTier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubscriptionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
    },
  });

  const { mutate: downgrade, isPending: isDowngrading } = useDowngradeTier({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubscriptionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
    },
  });

  const currentTier = subscription?.tier ?? user?.tier ?? "free";
  const isPaid = currentTier === "paid";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-4">
          <Link
            href={user ? "/dashboard" : "/"}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Simple, Transparent <span className="text-primary text-glow">Pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start scanning for free. Upgrade to unlock the full picture of your security posture.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={cn(
              "rounded-2xl border p-8 flex flex-col",
              !isPaid
                ? "bg-card border-primary/30 ring-1 ring-primary/20"
                : "bg-card/50 border-white/5"
            )}
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold">Free</h2>
                {!isPaid && (
                  <span className="ml-auto text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold font-mono">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Scan repositories and view low & medium severity findings.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {f.included ? (
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <span className={cn(!f.included && "text-muted-foreground/50")}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            {isPaid ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => downgrade()}
                disabled={isDowngrading}
              >
                {isDowngrading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Downgrade to Free
              </Button>
            ) : user ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Button asChild className="w-full">
                <a href="/api/auth/login">Get Started</a>
              </Button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={cn(
              "rounded-2xl border p-8 flex flex-col relative overflow-hidden",
              isPaid
                ? "bg-card border-primary/30 ring-1 ring-primary/20"
                : "bg-card/50 border-white/5"
            )}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Pro</h2>
                {isPaid && (
                  <span className="ml-auto text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold font-mono">$10</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Full access to all severity levels including high & critical findings.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            {isPaid ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : user ? (
              <Button
                className="w-full font-semibold"
                onClick={() => upgrade()}
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Upgrade to Pro
              </Button>
            ) : (
              <Button asChild className="w-full font-semibold">
                <a href="/api/auth/login">
                  <Zap className="w-4 h-4 mr-2" />
                  Sign in to Upgrade
                </a>
              </Button>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 p-4 rounded-xl bg-card/50 border border-white/5 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            Free tier users can see that high & critical vulnerabilities exist, but details are locked until you upgrade.
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
