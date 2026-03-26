import { useState, useEffect, useRef } from "react";
import type { Finding } from "@workspace/api-client-react";

export type StreamEvent = 
  | { type: "log"; message: string }
  | { type: "finding"; finding: Finding }
  | { type: "complete"; score: number; summary: string }
  | { type: "error"; message: string };

export function useScanStream(scanId: number | undefined) {
  const [logs, setLogs] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [status, setStatus] = useState<"connecting" | "running" | "completed" | "error" | "idle">("idle");
  const [result, setResult] = useState<{ score: number; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!scanId) {
      setStatus("idle");
      return;
    }

    // Reset state on new scanId
    setLogs([]);
    setFindings([]);
    setResult(null);
    setError(null);
    setStatus("connecting");

    const url = `/api/scans/${scanId}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus("running");
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamEvent;
        
        switch (data.type) {
          case "log":
            setLogs((prev) => [...prev, data.message]);
            break;
          case "finding":
            setFindings((prev) => [...prev, data.finding]);
            // Also log the finding discovery
            setLogs((prev) => [...prev, `[ALERT] Found ${data.finding.severity.toUpperCase()} severity issue: ${data.finding.title}`]);
            break;
          case "complete":
            setResult({ score: data.score, summary: data.summary });
            setStatus("completed");
            es.close();
            break;
          case "error":
            setError(data.message);
            setStatus("error");
            es.close();
            break;
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE Error:", err);
      setError("Connection lost to scan stream.");
      setStatus("error");
      es.close();
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [scanId]);

  return { logs, findings, status, result, error };
}
