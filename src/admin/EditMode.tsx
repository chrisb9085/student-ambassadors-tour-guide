import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { App } from "../App";
import { allStops } from "../content";
import type { Stop } from "../content/types";
import { getSession, loadStops, signIn, signOut } from "./api";
import { StopEditor } from "./StopEditor";
import "./EditMode.css";

type Props = { token?: string | null };

type State =
  | { kind: "loading" }
  | { kind: "problem"; message: string }
  | { kind: "signed-out"; notice?: string }
  | { kind: "signed-in"; name: string };

/**
 * Edit mode (?view=edit): the map, where tapping a building opens an editor instead of its card. Signing in checks the
 * shared editor password on the server; see docs/ADMIN-HANDOVER.md.
 */
export function EditMode({ token }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [latest, setLatest] = useState<Record<string, Stop>>({});

  useEffect(() => {
    const previous = document.title;
    document.title = "Edit mode · FIU Campus Tour";
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    let live = true;
    getSession().then((s) => {
      if (!live) return;
      if (s.setupProblem) setState({ kind: "problem", message: s.setupProblem });
      else if (s.error) setState({ kind: "problem", message: s.error });
      else setState(s.signedIn ? { kind: "signed-in", name: s.name ?? "" } : { kind: "signed-out" });
    });
    return () => {
      live = false;
    };
  }, []);

  const signedIn = state.kind === "signed-in";
  const expired = useCallback(() => setState({ kind: "signed-out", notice: "Your sign-in expired. Sign in again to keep editing." }), []);

  // The deployed site can be a minute behind GitHub after a save, so edit from what GitHub has now.
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    loadStops().then((r) => {
      if (!live) return;
      if (r.status === 401) return expired();
      if (r.stops) setLatest(Object.fromEntries(r.stops.map((s) => [s.id, s])));
      else if (r.error) setState({ kind: "problem", message: r.error });
    });
    return () => {
      live = false;
    };
  }, [signedIn, expired]);

  const onSaved = useCallback((stop: Stop) => setLatest((m) => ({ ...m, [stop.id]: stop })), []);

  const edit = useMemo(
    () =>
      state.kind === "signed-in"
        ? {
            stops: latest,
            banner: (
              <div className="edit-banner" role="region" aria-label="Edit mode">
                <p>
                  <strong>Edit mode</strong> · {state.name}
                  <span className="edit-banner-hint"> · Tap a building to edit it</span>
                </p>
                <button
                  type="button"
                  className="btn btn-secondary edit-banner-btn"
                  onClick={async () => {
                    await signOut();
                    setState({ kind: "signed-out", notice: "You're signed out." });
                  }}
                >
                  Sign out
                </button>
              </div>
            ),
            renderEditor: (stop: Stop, close: () => void) => (
              <StopEditor key={stop.id} stop={stop} total={allStops.filter((s) => s.order !== null).length} onSaved={onSaved} onClose={close} onExpired={expired} />
            ),
          }
        : undefined,
    [state, latest, onSaved, expired],
  );

  if (state.kind === "loading") return <p className="edit-loading">Loading Edit mode…</p>;
  if (state.kind === "problem") return <Problem message={state.message} />;
  if (state.kind === "signed-out") return <SignIn notice={state.notice} onSignedIn={(name) => setState({ kind: "signed-in", name })} />;
  return <App token={token} edit={edit} />;
}

function Problem({ message }: { message: string }) {
  return (
    <main className="edit-page">
      <section className="edit-sheet" role="alert">
        <h1>Edit mode isn't available</h1>
        <p>{message}</p>
        <p>
          <a href="/">Back to the tour</a>
        </p>
      </section>
    </main>
  );
}

function SignIn({ notice, onSignedIn }: { notice?: string; onSignedIn: (name: string) => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await signIn(name, password);
    setBusy(false);
    if (r.ok) onSignedIn(r.name ?? name);
    else setError(r.error ?? "Sign-in failed.");
  }

  return (
    <main className="edit-page">
      <form className="edit-sheet" onSubmit={submit} aria-labelledby="sign-in-title">
        <p className="edit-eyebrow">
          <span className="edit-fiu">FIU</span> Campus Tour
        </p>
        <h1 id="sign-in-title">Edit mode</h1>
        <p>For Student Ambassador officers who keep the building cards up to date. Ask the current President for the editor password.</p>
        {notice && <p className="edit-notice" role="status">{notice}</p>}
        <div className="edit-field">
          <label htmlFor="edit-name">Your name</label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            maxLength={60}
            aria-describedby="edit-name-hint"
          />
          <small id="edit-name-hint">Saved with each change, so the history shows who edited what.</small>
        </div>
        <div className="edit-field">
          <label htmlFor="edit-password">Editor password</label>
          <input id="edit-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && (
          <p className="edit-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary edit-submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p>
          <a href="/">Back to the tour</a>
        </p>
      </form>
    </main>
  );
}
