import type { ScanEvent } from "./scan-engine";

type Listener = (event: ScanEvent) => void;

const listeners = new Map<number, Set<Listener>>();

export function subscribeScan(scanId: number, listener: Listener): () => void {
  const existing = listeners.get(scanId);
  if (existing) {
    existing.add(listener);
  } else {
    listeners.set(scanId, new Set([listener]));
  }
  return () => {
    const set = listeners.get(scanId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) listeners.delete(scanId);
    }
  };
}

export function publishScanEvent(scanId: number, event: ScanEvent): void {
  const set = listeners.get(scanId);
  if (set) {
    for (const l of set) {
      l(event);
    }
  }
}
