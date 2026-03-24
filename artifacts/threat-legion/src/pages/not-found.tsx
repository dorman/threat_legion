import { Link } from "wouter";
import { Home, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { NinjaHoodIcon } from "@/components/ui/NinjaHoodIcon";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="relative inline-flex mb-8">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <NinjaHoodIcon className="w-12 h-12 text-primary opacity-60" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <span className="text-destructive text-xs font-bold font-mono">404</span>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-3">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            This page went dark. The URL you're looking for doesn't exist or may have been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-semibold">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <Shield className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
