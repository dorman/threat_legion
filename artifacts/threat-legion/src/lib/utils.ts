import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "N/A";
  return score.toString();
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-500";
  if (score >= 70) return "text-yellow-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-500/10 text-red-500 border-red-500/30";
    case "high":
      return "bg-orange-500/10 text-orange-500 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    case "low":
      return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/30";
  }
}
