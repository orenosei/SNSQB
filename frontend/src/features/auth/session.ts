import { useSyncExternalStore } from "react";
import type { Tokens } from "./types";

// Tokens never enter localStorage/sessionStorage or the URL.
let state: { tokens: Tokens | null; notice: string | null; revision: number } =
  { tokens: null, notice: null, revision: 0 };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSession = () => state;
export function setSession(
  tokens: Tokens | null,
  notice: string | null = null,
) {
  state = { tokens, notice, revision: state.revision + 1 };
  listeners.forEach((listener) => listener());
}
export function rotateTokens(tokens: Tokens) {
  state = { ...state, tokens };
  listeners.forEach((listener) => listener());
}
export const useSession = () => useSyncExternalStore(subscribe, getSession);

let fallbackDeviceId: string | undefined;
export function getDeviceId() {
  try {
    const stored = localStorage.getItem("snsqb.device_id");
    if (stored) return stored;
    const id = `web-browser-${crypto.randomUUID()}`;
    localStorage.setItem("snsqb.device_id", id);
    return id;
  } catch {
    // Storage may be disabled by the browser; authentication must still work.
    return (fallbackDeviceId ??= `web-browser-${crypto.randomUUID()}`);
  }
}
