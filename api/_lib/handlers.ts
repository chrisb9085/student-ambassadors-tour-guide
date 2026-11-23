/**
 * Edit mode's server side: sign in, sign out, load the latest stops, and save one stop. Each route file in
 * api/admin/ is a thin wrapper around one of these, so tests can call them with a fake GitHub and fake secrets.
 */
import type { Stop, Tour } from "../../src/content/types.js";
import { applyEdit, changedFields, checkEdit, editableFrom, formatStops } from "../../src/admin/editable.js";
import { buildContentReview } from "../../tools/content-review-lib.mjs";
import { GitHubError, github } from "./github.js";
import { clearedCookie, configProblem, passwordMatches, readSession, sessionCookie, signSession, type Env } from "./session.js";

export type Deps = {
  env: Env;
  fetch?: typeof fetch;
  now?: () => number;
  /** Pause after a wrong password, to slow down guessing. Tests pass a no-op. */
  delay?: (ms: number) => Promise<void>;
};

const STOPS = "content/stops.json";
const TOUR = "content/tour.json";
const REVIEW = "docs/CONTENT-REVIEW.md";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

/**
 * Only JSON from this site. Browsers can't send a cross-site JSON POST without asking first (CORS), and the session
 * cookie is SameSite=Strict, so another site can't make a signed-in editor's browser save something.
 */
function rejectForeign(request: Request): Response | null {
  if (request.method !== "POST") return fail(405, "Use POST.");
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return fail(415, "Send JSON.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail(403, "Edit mode only accepts requests from this site.");
  return null;
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const today = (now: number) => new Date(now).toISOString().slice(0, 10);

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function login(request: Request, deps: Deps): Promise<Response> {
  const bad = rejectForeign(request);
  if (bad) return bad;
  const problem = configProblem(deps.env);
  if (problem) return fail(503, problem);
  const b = await body(request);
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  if (!name) return fail(400, "Type your name, so the change history shows who edited what.");
  if (!passwordMatches(deps.env, b.password)) {
    await (deps.delay ?? wait)(1000);
    return fail(401, "That password isn't right.");
  }
  const now = (deps.now ?? Date.now)();
  return json({ name }, 200, { "Set-Cookie": sessionCookie(signSession(deps.env, name, now)) });
}

export function logout(request: Request): Response {
  const bad = rejectForeign(request);
  if (bad) return bad;
  return json({ ok: true }, 200, { "Set-Cookie": clearedCookie() });
}

export function session(request: Request, deps: Deps): Response {
  const problem = configProblem(deps.env);
  if (problem) return json({ signedIn: false, setupProblem: problem });
  const s = readSession(deps.env, request.headers.get("cookie"), (deps.now ?? Date.now)());
  return json(s ? { signedIn: true, name: s.name } : { signedIn: false });
}

/** The stops as they are on GitHub now, which can be newer than the deployed site for a minute after a save. */
export async function stops(request: Request, deps: Deps): Promise<Response> {
  const s = readSession(deps.env, request.headers.get("cookie"), (deps.now ?? Date.now)());
  if (!s) return fail(401, "Please sign in again.");
  try {
    const gh = github(deps.env, deps.fetch);
    const head = await gh.head();
    return json({ stops: JSON.parse(await gh.readFile(STOPS, head.commit)) as Stop[] });
  } catch (e) {
    return gitHubFailure(e);
  }
}

/**
 * Saves one stop. Body: { id, base, edit, note? }. `base` is the stop's editable fields as the editor first saw them:
 * if someone else saved that stop since, the save stops with 409 rather than overwrite their work.
 */
export async function save(request: Request, deps: Deps): Promise<Response> {
  const bad = rejectForeign(request);
  if (bad) return bad;
  const now = (deps.now ?? Date.now)();
  const s = readSession(deps.env, request.headers.get("cookie"), now);
  if (!s) return fail(401, "Your sign-in has expired. Copy anything you typed, sign in again, and save.");
  const b = await body(request);
  const id = typeof b.id === "string" ? b.id : "";
  const note = typeof b.note === "string" ? b.note.trim().replace(/\s+/g, " ").slice(0, 200) : "";
  const gh = github(deps.env, deps.fetch);

  // If another save lands between our read and our write, GitHub refuses the write (422). Read again and retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const head = await gh.head();
      const [stopsText, tourText] = await Promise.all([gh.readFile(STOPS, head.commit), gh.readFile(TOUR, head.commit)]);
      const all = JSON.parse(stopsText) as Stop[];
      const i = all.findIndex((x) => x.id === id);
      if (i < 0) return fail(404, "That building isn't in the tour any more.");
      const current = all[i];
      if (JSON.stringify(editableFrom(current)) !== JSON.stringify(b.base))
        return fail(409, "Someone else changed this building after you opened it. Reload Edit mode to see their version, then make your change again.", {
          stop: current,
        });
      const { edit, errors } = checkEdit(current, b.edit);
      if (Object.keys(errors).length) return fail(422, "Some fields need fixing before this can be saved.", { errors });
      const next = applyEdit(current, edit, today(now));
      const fields = changedFields(current, next);
      if (fields.length === 0) return json({ unchanged: true, stop: current });
      all[i] = next;
      const review = buildContentReview(all, JSON.parse(tourText) as Tour).doc;
      const message = [
        `Edit mode: update ${next.name}`,
        "",
        `Changed: ${fields.join(", ")}.`,
        ...(note ? [`Note: ${note}`] : []),
        "",
        `Edited-by: ${s.name}`,
      ].join("\n");
      const sha = await gh.commit(head, [
        { path: STOPS, content: formatStops(all) },
        { path: REVIEW, content: review },
      ], message);
      return json({ stop: next, commitUrl: gh.commitUrl(sha), changed: fields });
    } catch (e) {
      if (attempt === 0 && e instanceof GitHubError && e.status === 422) continue;
      return gitHubFailure(e);
    }
  }
  return fail(503, "The save kept colliding with other saves. Try again in a minute.");
}

function gitHubFailure(e: unknown): Response {
  console.error(e);
  if (e instanceof GitHubError && (e.status === 401 || e.status === 403 || e.status === 404))
    return fail(502, "The site couldn't reach the content on GitHub. The GITHUB_TOKEN in Vercel may have expired (see docs/ADMIN-HANDOVER.md).");
  return fail(502, "GitHub didn't answer. Nothing was saved. Try again in a minute.");
}
