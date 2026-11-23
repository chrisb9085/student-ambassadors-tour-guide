// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Stop } from "../../src/content/types";
import { editableFrom } from "../../src/admin/editable.js";
import { buildContentReview } from "../../tools/content-review-lib.mjs";
import { login, logout, save, session, stops } from "./handlers.js";
import { COOKIE, type Env } from "./session.js";

const PASSWORD = "correct horse battery";
const env: Env = { EDITOR_PASSWORD: PASSWORD, GITHUB_TOKEN: "test-token-not-real" };
const NOW = Date.UTC(2026, 10, 23, 12);
const ORIGIN = "https://tour.example";

const stopsText = readFileSync("content/stops.json", "utf8");
const tourText = readFileSync("content/tour.json", "utf8");
const allStops = JSON.parse(stopsText) as Stop[];
const first = allStops[0];

/** A stand-in for the bits of GitHub's API the save uses, holding files in memory. */
function fakeGitHub() {
  const files: Record<string, string> = { "content/stops.json": stopsText, "content/tour.json": tourText };
  const state = { head: "c0", commits: [] as { message: string; files: Record<string, string> }[], refusals: 0, calls: [] as string[] };
  const pendingTrees: Record<string, Record<string, string>> = {};
  const pendingCommits: Record<string, { message: string; tree: string }> = {};
  const f = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, "");
    const method = init.method ?? "GET";
    state.calls.push(`${method} ${path}`);
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${env.GITHUB_TOKEN}`);
    const body = init.body ? JSON.parse(String(init.body)) : null;
    if (method === "GET" && path === "/git/ref/heads/main") return Response.json({ object: { sha: state.head } });
    if (method === "GET" && path.startsWith("/git/commits/")) return Response.json({ tree: { sha: `t-${state.head}` } });
    if (method === "GET" && path.startsWith("/contents/")) {
      const name = path.slice("/contents/".length);
      return name in files ? new Response(files[name]) : new Response("", { status: 404 });
    }
    if (method === "POST" && path === "/git/trees") {
      const id = `tree${Object.keys(pendingTrees).length}`;
      pendingTrees[id] = Object.fromEntries(body.tree.map((t: { path: string; content: string }) => [t.path, t.content]));
      return Response.json({ sha: id });
    }
    if (method === "POST" && path === "/git/commits") {
      const id = `c${state.commits.length + Object.keys(pendingCommits).length + 1}`;
      pendingCommits[id] = { message: body.message, tree: body.tree };
      return Response.json({ sha: id });
    }
    if (method === "PATCH" && path === "/git/refs/heads/main") {
      if (state.refusals > 0) {
        state.refusals--;
        return new Response("", { status: 422 });
      }
      const c = pendingCommits[body.sha];
      Object.assign(files, pendingTrees[c.tree]);
      state.commits.push({ message: c.message, files: pendingTrees[c.tree] });
      state.head = body.sha;
      return Response.json({});
    }
    return new Response("", { status: 500 });
  };
  return { fetch: f as typeof fetch, files, state };
}

const post = (path: string, body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: JSON.stringify(body),
  });
const get = (path: string, cookie?: string) => new Request(`${ORIGIN}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
const noDelay = async () => {};

async function signIn(e: Env = env): Promise<string> {
  const res = await login(post("/api/admin/login", { name: "Ana Ambassador", password: PASSWORD }), { env: e, now: () => NOW, delay: noDelay });
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0];
}

describe("sign in", () => {
  it("sets an HttpOnly, Secure, SameSite=Strict cookie for the right password", async () => {
    const res = await login(post("/api/admin/login", { name: "Ana", password: PASSWORD }), { env, now: () => NOW, delay: noDelay });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(new RegExp(`^${COOKIE}=`));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain(PASSWORD);
  });

  it("refuses a wrong password, after a pause", async () => {
    let paused = 0;
    const res = await login(post("/api/admin/login", { name: "Ana", password: "nope" }), { env, delay: async (ms) => void (paused = ms) });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(paused).toBeGreaterThan(0);
  });

  it("needs a name for the change history", async () => {
    const res = await login(post("/api/admin/login", { name: " ", password: PASSWORD }), { env, delay: noDelay });
    expect(res.status).toBe(400);
  });

  it("explains when Vercel isn't set up, and never accepts an empty password", async () => {
    const res = await login(post("/api/admin/login", { name: "Ana", password: "" }), { env: {}, delay: noDelay });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/EDITOR_PASSWORD/);
    const s = await session(get("/api/admin/session"), { env: {} }).json();
    expect(s).toMatchObject({ signedIn: false, setupProblem: expect.stringMatching(/isn.t set up/) });
  });

  it("rejects requests from other sites and non-JSON posts", async () => {
    const cross = await login(post("/api/admin/login", { name: "A", password: PASSWORD }, undefined, { Origin: "https://evil.example" }), { env, delay: noDelay });
    expect(cross.status).toBe(403);
    const form = new Request(`${ORIGIN}/api/admin/login`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
    expect((await login(form, { env, delay: noDelay })).status).toBe(415);
  });
});

describe("session", () => {
  it("reports who is signed in, and expires after 8 hours", async () => {
    const cookie = await signIn();
    expect(await session(get("/api/admin/session", cookie), { env, now: () => NOW }).json()).toEqual({ signedIn: true, name: "Ana Ambassador" });
    const later = NOW + 8 * 3600_000 + 1;
    expect(await session(get("/api/admin/session", cookie), { env, now: () => later }).json()).toEqual({ signedIn: false });
  });

  it("signs everyone out when the password is changed", async () => {
    const cookie = await signIn();
    const rotated = { ...env, EDITOR_PASSWORD: "a brand new password" };
    expect(await session(get("/api/admin/session", cookie), { env: rotated, now: () => NOW }).json()).toEqual({ signedIn: false });
  });

  it("rejects a tampered cookie", async () => {
    const cookie = await signIn();
    const [k, v] = cookie.split("=");
    const [, sig] = v.split(".");
    const forged = `${k}=${Buffer.from(JSON.stringify({ name: "Mallory", exp: NOW * 2 })).toString("base64url")}.${sig}`;
    expect(await session(get("/api/admin/session", forged), { env, now: () => NOW }).json()).toEqual({ signedIn: false });
  });

  it("signing out clears the cookie", async () => {
    const res = logout(post("/api/admin/logout", {}));
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("loading and saving", () => {
  const edit = { ...editableFrom(first), summary: "A new one-sentence summary for the card." };

  it("loads the stops from GitHub when signed in, and refuses otherwise", async () => {
    const gh = fakeGitHub();
    expect((await stops(get("/api/admin/stops"), { env, fetch: gh.fetch })).status).toBe(401);
    const cookie = await signIn();
    const res = await stops(get("/api/admin/stops", cookie), { env, fetch: gh.fetch, now: () => NOW });
    expect(res.status).toBe(200);
    expect((await res.json()).stops).toHaveLength(allStops.length);
  });

  it("commits stops.json and the refreshed review page together, naming the editor", async () => {
    const gh = fakeGitHub();
    const cookie = await signIn();
    const res = await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit, note: "New wording from the Foundation" }, cookie), {
      env,
      fetch: gh.fetch,
      now: () => NOW,
    });
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.changed).toEqual(["summary"]);
    expect(out.commitUrl).toMatch(/github\.com\/.+\/commit\/c1$/);
    expect(gh.state.commits).toHaveLength(1);
    const { message, files } = gh.state.commits[0];
    expect(message).toContain(`Edit mode: update ${first.name}`);
    expect(message).toContain("Edited-by: Ana Ambassador");
    expect(message).toContain("Note: New wording from the Foundation");
    const saved = JSON.parse(files["content/stops.json"]) as Stop[];
    expect(saved[0]).toEqual({ ...first, summary: edit.summary, lastReviewed: "2026-11-23" });
    expect(saved.slice(1)).toEqual(allStops.slice(1));
    // Same formatting as the hand-written file, so diffs show only the change.
    expect(files["content/stops.json"].split("\n").length).toBe(stopsText.split("\n").length);
    expect(files["docs/CONTENT-REVIEW.md"]).toBe(buildContentReview(saved, JSON.parse(tourText)).doc);
    expect(files["docs/CONTENT-REVIEW.md"]).toContain(edit.summary);
  });

  it("needs a sign-in", async () => {
    const gh = fakeGitHub();
    const res = await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit }), { env, fetch: gh.fetch });
    expect(res.status).toBe(401);
    expect(gh.state.calls).toHaveLength(0);
  });

  it("refuses edits that break the rules, and saves nothing", async () => {
    const gh = fakeGitHub();
    const cookie = await signIn();
    const res = await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit: { ...edit, sources: [], highlights: [] } }, cookie), {
      env,
      fetch: gh.fetch,
      now: () => NOW,
    });
    expect(res.status).toBe(422);
    expect(Object.keys((await res.json()).errors).sort()).toEqual(["highlights", "sources"]);
    expect(gh.state.commits).toHaveLength(0);
  });

  it("can't change ids, order or coordinates, even if the browser sends them", async () => {
    const gh = fakeGitHub();
    const cookie = await signIn();
    const sneaky = { ...edit, id: "hacked", order: 99, coordinates: [0, 0], type: "quick-pass" };
    await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit: sneaky }, cookie), { env, fetch: gh.fetch, now: () => NOW });
    const saved = (JSON.parse(gh.files["content/stops.json"]) as Stop[])[0];
    expect(saved).toMatchObject({ id: first.id, order: first.order, coordinates: first.coordinates, type: first.type });
  });

  it("won't overwrite someone else's newer save of the same building", async () => {
    const gh = fakeGitHub();
    const cookie = await signIn();
    const stale = { ...editableFrom(first), summary: "What this editor saw earlier." };
    const res = await save(post("/api/admin/save", { id: first.id, base: stale, edit }, cookie), { env, fetch: gh.fetch, now: () => NOW });
    expect(res.status).toBe(409);
    expect(gh.state.commits).toHaveLength(0);
  });

  it("retries once when another save lands at the same moment", async () => {
    const gh = fakeGitHub();
    gh.state.refusals = 1;
    const cookie = await signIn();
    const res = await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit }, cookie), { env, fetch: gh.fetch, now: () => NOW });
    expect(res.status).toBe(200);
    expect(gh.state.commits).toHaveLength(1);
  });

  it("makes no commit when nothing changed", async () => {
    const gh = fakeGitHub();
    const cookie = await signIn();
    const res = await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit: editableFrom(first) }, cookie), {
      env,
      fetch: gh.fetch,
      now: () => NOW,
    });
    expect(await res.json()).toMatchObject({ unchanged: true });
    expect(gh.state.commits).toHaveLength(0);
  });

  it("says the token may have expired when GitHub refuses it", async () => {
    const cookie = await signIn();
    const denied = (async () => new Response("", { status: 401 })) as unknown as typeof fetch;
    const res = await save(post("/api/admin/save", { id: first.id, base: editableFrom(first), edit }, cookie), { env, fetch: denied, now: () => NOW });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/GITHUB_TOKEN/);
  });
});
