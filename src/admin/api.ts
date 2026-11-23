/** Browser side of Edit mode's server functions (api/admin/). The password and GitHub token never reach this code. */
import type { Stop } from "../content/types";
import type { StopEdit } from "./editable";

export type SessionInfo = { signedIn: boolean; name?: string; setupProblem?: string };

export type SaveResult =
  | { ok: true; stop: Stop; commitUrl?: string; unchanged?: boolean }
  | { ok: false; status: number; error: string; errors?: Record<string, string>; stop?: Stop };

const BASE = "/api/admin";

async function call<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T & { error?: string } }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, {
      credentials: "same-origin",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    return { status: 0, body: { error: "Can't reach the site. Check your internet connection and try again." } as T & { error: string } };
  }
  let body: T & { error?: string };
  try {
    body = await res.json();
  } catch {
    // For example `npm run dev`, which serves the app without Vercel's functions.
    body = { error: "Edit mode's server isn't running here. Use the live site, or `vercel dev` on a computer." } as T & { error: string };
  }
  return { status: res.status, body };
}

export async function getSession(): Promise<SessionInfo & { error?: string }> {
  const { body } = await call<SessionInfo>("session");
  return body;
}

export async function signIn(name: string, password: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  const { status, body } = await call<{ name: string }>("login", { method: "POST", body: JSON.stringify({ name, password }) });
  return status === 200 ? { ok: true, name: body.name } : { ok: false, error: body.error ?? "Sign-in failed." };
}

export async function signOut(): Promise<void> {
  await call("logout", { method: "POST", body: "{}" });
}

export async function loadStops(): Promise<{ stops?: Stop[]; error?: string; status: number }> {
  const { status, body } = await call<{ stops: Stop[] }>("stops");
  return { status, stops: body.stops, error: body.error };
}

export async function saveStop(id: string, base: StopEdit, edit: StopEdit, note: string): Promise<SaveResult> {
  const { status, body } = await call<{ stop: Stop; commitUrl?: string; unchanged?: boolean; errors?: Record<string, string> }>("save", {
    method: "POST",
    body: JSON.stringify({ id, base, edit, note }),
  });
  if (status === 200) return { ok: true, stop: body.stop, commitUrl: body.commitUrl, unchanged: body.unchanged };
  return { ok: false, status, error: body.error ?? "Saving failed.", errors: body.errors, stop: body.stop };
}
