import { Link } from "wouter";
import { Shield, Github, LogOut, Loader2, LayoutDashboard } from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export function Navbar() {
  const { data: user, isLoading } = useGetMe({
    query: { retry: false, refetchOnWindowFocus: false }
  });
  
  const queryClient = useQueryClient();
  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        window.location.href = "/";
      }
    }
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-glow">
              Threat<span className="text-primary">Legion</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-secondary" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium hidden sm:block">{user.login}</span>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.login} className="h-8 w-8 rounded-full border border-border" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold">
                      {user.login.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                    className="text-muted-foreground hover:text-destructive"
                    title="Log out"
                  >
                    {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <Button asChild variant="default" className="font-semibold">
                <a href="/api/auth/github">
                  <Github className="mr-2 h-4 w-4" />
                  Sign in with GitHub
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
