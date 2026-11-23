/**
 * Reads and writes the content files in the GitHub repository with a fine-grained token (GITHUB_TOKEN) that can
 * only read and write this one repository's contents. Every save is an ordinary commit on the live branch: Vercel
 * redeploys the site from it, and GitHub keeps the full history, so any edit can be seen and undone.
 */
import type { Env } from "./session.js";

export const DEFAULT_REPO = "chrisb9085/student-ambassadors-tour-guide";
export const DEFAULT_BRANCH = "main";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type FileChange = { path: string; content: string };

export function github(env: Env, fetchImpl: typeof fetch = fetch) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const base = `https://api.github.com/repos/${repo}`;

  async function call<T>(path: string, init: RequestInit = {}, accept = "application/vnd.github+json"): Promise<T> {
    const res = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "fiu-tour-edit-mode",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) throw new GitHubError(`GitHub ${init.method ?? "GET"} ${path} failed: ${res.status}`, res.status);
    return (accept.endsWith("raw+json") ? await res.text() : await res.json()) as T;
  }

  return {
    repo,
    branch,
    /** The commit the branch points at now. */
    async head(): Promise<{ commit: string; tree: string }> {
      const ref = await call<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`);
      const commit = await call<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
      return { commit: ref.object.sha, tree: commit.tree.sha };
    },
    /** A file's text at a commit. */
    readFile(path: string, commit: string): Promise<string> {
      return call<string>(`/contents/${path}?ref=${commit}`, {}, "application/vnd.github.raw+json");
    },
    /**
     * Commits several files at once on top of `parent`. Fails with status 422 if someone else committed in the
     * meantime (the branch only moves forward), so nothing is ever overwritten.
     */
    async commit(parent: { commit: string; tree: string }, files: FileChange[], message: string): Promise<string> {
      const tree = await call<{ sha: string }>(`/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: parent.tree,
          tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
        }),
      });
      const commit = await call<{ sha: string }>(`/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [parent.commit] }),
      });
      await call(`/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return commit.sha;
    },
    commitUrl: (sha: string) => `https://github.com/${repo}/commit/${sha}`,
  };
}
