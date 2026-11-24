import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { GuideNote, Stop } from "../content/types";
import { InfoCard, type CardTab } from "../components/InfoCard";
import { narrationFor } from "../tour/steps";
import { statusBadge, typeLabel } from "../stops/describe";
import { applyEdit, checkEdit, editableFrom, LIMITS, spokenWords, type StopEdit } from "./editable";
import { saveStop } from "./api";

type Props = {
  stop: Stop;
  total: number;
  onSaved: (stop: Stop) => void;
  onClose: () => void;
  onExpired: () => void;
};

type Saved = { kind: "saved"; commitUrl?: string } | { kind: "unchanged" } | { kind: "failed"; message: string } | null;

/** The editor panel for one building. Checks the same rules as the server as you type; the server checks again. */
export function StopEditor({ stop, total, onSaved, onClose, onExpired }: Props) {
  const [base, setBase] = useState<StopEdit>(() => editableFrom(stop));
  const [draft, setDraft] = useState<StopEdit>(base);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<CardTab>("info");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  const check = useMemo(() => checkEdit(stop, draft), [stop, draft]);
  const errors = { ...serverErrors, ...check.errors };
  const dirty = JSON.stringify(check.edit) !== JSON.stringify(checkEdit(stop, base).edit);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof StopEdit>(key: K, value: StopEdit[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(null);
    setServerErrors((e) => {
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  async function save() {
    setSaving(true);
    setSaved(null);
    const r = await saveStop(stop.id, base, check.edit, note);
    setSaving(false);
    if (r.ok) {
      const fresh = editableFrom(r.stop);
      setBase(fresh);
      setDraft(fresh);
      setNote("");
      setSaved(r.unchanged ? { kind: "unchanged" } : { kind: "saved", commitUrl: r.commitUrl });
      onSaved(r.stop);
      return;
    }
    if (r.status === 401) return onExpired();
    if (r.errors) setServerErrors(r.errors);
    setSaved({ kind: "failed", message: r.error });
  }

  const close = () => (dirty ? setConfirmClose(true) : onClose());
  const previewStop = applyEdit(stop, check.edit, stop.lastReviewed);
  const kicker = stop.order !== null ? `Stop ${stop.order} of ${total} · ${typeLabel(stop)}` : "Also on campus · Not on the driving route";
  const canSave = dirty && Object.keys(check.errors).length === 0 && !saving;

  if (preview)
    return (
      <InfoCard
        contentKey={`${stop.id}-preview`}
        kicker={`Preview · ${kicker}`}
        title={previewStop.name}
        badge={statusBadge(previewStop)}
        summary={previewStop.summary}
        stat={previewStop.stat}
        highlights={previewStop.highlights}
        impact={previewStop.impact}
        guideNotes={previewStop.guideNotes}
        script={{ text: narrationFor(previewStop) }}
        tab={previewTab}
        onTabChange={setPreviewTab}
        onClose={() => setPreview(false)}
        closeLabel="Back to editing"
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setPreview(false)}>
            Back to editing
          </button>
        }
      />
    );

  const spoken = spokenWords(check.edit);
  const target = stop.type === "featured" ? "40 to 90" : stop.type === "quick-pass" ? "35 or fewer" : null;

  return (
    <section className="panel stop-editor" role="dialog" aria-labelledby={titleId}>
      <header className="stop-editor-header">
        <div>
          <p className="info-card-kicker">Editing · {kicker}</p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="stop-editor-title">
            {stop.name}
          </h2>
        </div>
        <button type="button" className="icon-btn" onClick={close} aria-label={`Close editor for ${stop.name}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="stop-editor-body" tabIndex={0} role="group" aria-label="Fields">
        <p className="stop-editor-intro">
          Changes go live on the tour about a minute after you save. Every save is kept in the history, so nothing is lost. Map position and route order
          can't be changed here.
        </p>

        <Field label="Full official name" error={errors.name} hint='Use the full name from fiu.edu, for example "Academic Health Center 2: Herbert Wertheim College of Medicine".'>
          {(p) => <input {...p} value={draft.name} maxLength={LIMITS.name} onChange={(e) => set("name", e.target.value)} />}
        </Field>
        <Field label="Short map label (optional)" error={errors.label} hint="The small chip on the map. Leave empty to use the name.">
          {(p) => <input {...p} value={draft.label ?? ""} maxLength={LIMITS.label} onChange={(e) => set("label", e.target.value || null)} />}
        </Field>

        <fieldset className="stop-editor-group">
          <legend>Status</legend>
          <label className="stop-editor-radio">
            <input type="radio" name={`${titleId}-status`} checked={draft.status === "open"} onChange={() => set("status", "open")} /> Open
          </label>
          <label className="stop-editor-radio">
            <input type="radio" name={`${titleId}-status`} checked={draft.status === "under-construction"} onChange={() => set("status", "under-construction")} />{" "}
            Under construction
          </label>
          {draft.status === "under-construction" && (
            <Field label="Opens (optional)" error={errors.opens} hint='For example "2028" or "Fall 2027".'>
              {(p) => <input {...p} value={draft.opens ?? ""} maxLength={LIMITS.opens} onChange={(e) => set("opens", e.target.value || null)} />}
            </Field>
          )}
        </fieldset>

        <Field label="Summary" error={errors.summary} hint="One sentence on why this building matters.">
          {(p) => <textarea {...p} rows={3} value={draft.summary} maxLength={LIMITS.summary} onChange={(e) => set("summary", e.target.value)} />}
        </Field>

        <fieldset className="stop-editor-group">
          <legend>Key stat (optional)</legend>
          <div className="stop-editor-row">
            <Field label="Number" error={undefined}>
              {(p) => (
                <input
                  {...p}
                  value={draft.stat?.value ?? ""}
                  maxLength={LIMITS.statValue}
                  onChange={(e) => set("stat", { value: e.target.value, label: draft.stat?.label ?? "" })}
                />
              )}
            </Field>
            <Field label="What it counts" error={undefined}>
              {(p) => (
                <input
                  {...p}
                  value={draft.stat?.label ?? ""}
                  maxLength={LIMITS.statLabel}
                  onChange={(e) => set("stat", { value: draft.stat?.value ?? "", label: e.target.value })}
                />
              )}
            </Field>
          </div>
          {errors.stat && <p className="edit-error">{errors.stat}</p>}
        </fieldset>

        <ListField
          legend="Highlights"
          hint={`Up to ${LIMITS.maxHighlights} short facts.`}
          items={draft.highlights}
          max={LIMITS.maxHighlights}
          maxLength={LIMITS.highlight}
          error={errors.highlights}
          itemLabel="Highlight"
          onChange={(v) => set("highlights", v)}
        />

        <Field label="Impact of support" error={errors.impact} hint="The donors, partners or gifts behind this space, and what they made possible.">
          {(p) => <textarea {...p} rows={4} value={draft.impact} maxLength={LIMITS.impact} onChange={(e) => set("impact", e.target.value)} />}
        </Field>

        <Field
          label="Spoken narration (optional)"
          error={errors.narration}
          hint="What Tour Mode reads aloud. Leave empty to read the summary, highlights and impact. Write for the ear: no parentheses or abbreviations."
        >
          {(p) => <textarea {...p} rows={5} value={draft.narration ?? ""} maxLength={LIMITS.narration} onChange={(e) => set("narration", e.target.value || null)} />}
        </Field>
        <p className="stop-editor-count">
          Read aloud: {spoken} words{target ? ` (aim for ${target})` : ""}.
        </p>

        <Field
          label="Official FIU web page (optional)"
          error={errors.website}
          hint="The building's own page on fiu.edu, for example https://law.fiu.edu/about/. The card's link button opens it. Leave empty to hide the button."
        >
          {(p) => (
            <input
              {...p}
              type="url"
              inputMode="url"
              placeholder="https://…fiu.edu/…"
              value={draft.website ?? ""}
              maxLength={LIMITS.website}
              onChange={(e) => set("website", e.target.value || null)}
            />
          )}
        </Field>

        <ListField
          legend="Sources"
          hint='Where each fact comes from: "Handbook p.12" or an fiu.edu link.'
          items={draft.sources}
          max={LIMITS.maxSources}
          maxLength={LIMITS.source}
          error={errors.sources}
          itemLabel="Source"
          onChange={(v) => set("sources", v)}
        />

        <GuideNotesField notes={draft.guideNotes} error={errors.guideNotes} onChange={(v) => set("guideNotes", v)} />

        <ListField
          legend="Notes for the Foundation (optional)"
          hint="Facts still to confirm. Shown on the review page, never to guests."
          items={draft.reviewNotes}
          max={LIMITS.maxNotes}
          maxLength={LIMITS.note}
          error={errors.reviewNotes}
          itemLabel="Note"
          multiline
          onChange={(v) => set("reviewNotes", v)}
        />

        {check.warnings.length > 0 && (
          <div className="stop-editor-warnings">
            <p>
              <strong>Worth a look</strong> (you can still save):
            </p>
            <ul>
              {check.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <Field label="What did you change? (optional)" error={undefined} hint="Saved in the history with your name.">
          {(p) => <input {...p} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </div>

      <footer className="info-card-footer stop-editor-footer">
        <div role="status" className="stop-editor-status">
          {confirmClose ? (
            <span>You have unsaved changes.</span>
          ) : saved?.kind === "saved" ? (
            <span>
              Saved. Live in about a minute.{" "}
              {saved.commitUrl && (
                <a href={saved.commitUrl} target="_blank" rel="noreferrer">
                  See the change
                </a>
              )}
            </span>
          ) : saved?.kind === "unchanged" ? (
            <span>Nothing had changed.</span>
          ) : saved?.kind === "failed" ? (
            <span className="edit-error">{saved.message}</span>
          ) : Object.keys(check.errors).length > 0 && dirty ? (
            <span className="edit-error">Fix the fields marked in red to save.</span>
          ) : null}
        </div>
        {confirmClose ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmClose(false)}>
              Keep editing
            </button>
            <button type="button" className="btn btn-danger" onClick={onClose}>
              Discard changes
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(true)}>
              Preview
            </button>
            <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}

type InputProps = { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean };

function Field({ label, hint, error, children }: { label: string; hint?: string; error: string | undefined; children: (p: InputProps) => ReactNode }) {
  const id = useId();
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="edit-field">
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-describedby": described, "aria-invalid": error ? true : undefined })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <p id={`${id}-error`} className="edit-error">
          {error}
        </p>
      )}
    </div>
  );
}

function ListField(props: {
  legend: string;
  hint: string;
  items: string[];
  max: number;
  maxLength: number;
  error: string | undefined;
  itemLabel: string;
  multiline?: boolean;
  onChange: (items: string[]) => void;
}) {
  const { legend, hint, items, max, maxLength, error, itemLabel, multiline, onChange } = props;
  const hintId = useId();
  return (
    <fieldset className="stop-editor-group" aria-describedby={hintId}>
      <legend>{legend}</legend>
      <small id={hintId}>{hint}</small>
      {items.map((item, i) => (
        <div key={i} className="stop-editor-item">
          {multiline ? (
            <textarea
              rows={2}
              aria-label={`${itemLabel} ${i + 1}`}
              value={item}
              maxLength={maxLength}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ) : (
            <input
              aria-label={`${itemLabel} ${i + 1}`}
              value={item}
              maxLength={maxLength}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
          )}
          <button type="button" className="icon-btn" aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <TrashIcon />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="btn btn-secondary stop-editor-add" onClick={() => onChange([...items, ""])}>
          + Add {itemLabel.toLowerCase()}
        </button>
      )}
      {error && <p className="edit-error">{error}</p>}
    </fieldset>
  );
}

/** Handbook tips can be removed but not reworded (they're exact quotes). Details are free text with a source. */
function GuideNotesField({ notes, error, onChange }: { notes: GuideNote[]; error: string | undefined; onChange: (n: GuideNote[]) => void }) {
  const update = (i: number, patch: Partial<GuideNote>) => onChange(notes.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  const remove = (i: number) => onChange(notes.filter((_, j) => j !== i));
  return (
    <fieldset className="stop-editor-group">
      <legend>For ambassadors (optional)</legend>
      <small>Study notes under "For ambassadors" on the card. Never read aloud.</small>
      {notes.map((n, i) =>
        n.kind === "tip" ? (
          <div key={i} className="stop-editor-tip">
            <p>
              <strong>Tour guide tip</strong> ({n.source}, quoted from the handbook, so it can't be reworded here)
            </p>
            <p>{n.text}</p>
            <button type="button" className="btn btn-secondary" onClick={() => remove(i)}>
              Remove tip
            </button>
          </div>
        ) : (
          <div key={i} className="stop-editor-detail">
            <textarea rows={3} aria-label={`Detail ${i + 1}`} value={n.text} maxLength={LIMITS.note} onChange={(e) => update(i, { text: e.target.value })} />
            <div className="stop-editor-item">
              <input aria-label={`Source for detail ${i + 1}`} placeholder="Handbook p.12 or https://…fiu.edu/…" value={n.source} onChange={(e) => update(i, { source: e.target.value })} />
              <button type="button" className="icon-btn" aria-label={`Remove detail ${i + 1}`} onClick={() => remove(i)}>
                <TrashIcon />
              </button>
            </div>
          </div>
        ),
      )}
      <button type="button" className="btn btn-secondary stop-editor-add" onClick={() => onChange([...notes, { kind: "detail", text: "", source: "" }])}>
        + Add detail
      </button>
      {error && <p className="edit-error">{error}</p>}
    </fieldset>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}
