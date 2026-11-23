import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditMode } from "./EditMode";
import { FakeMap } from "../test/mapboxMock";
import { allStops } from "../content";
import type { Stop } from "../content/types";
import { EDIT_MODE_SEARCH, viewFor } from "../lib/view";

type Reply = { status?: number; body: unknown };

/** Answers Edit mode's /api/admin calls from a table, and records what was sent. */
function server(routes: Record<string, Reply | ((body: unknown) => Reply)>) {
  const sent: { path: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace("/api/admin/", "");
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      sent.push({ path, body });
      const r = routes[path];
      const reply = typeof r === "function" ? r(body) : (r ?? { status: 404, body: { error: "not found" } });
      return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
    }),
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

const first = allStops[0];

async function openEditor(routes: Record<string, Reply | ((body: unknown) => Reply)> = {}) {
  const sent = server({ session: { body: { signedIn: true, name: "Ana" } }, stops: { body: { stops: allStops } }, ...routes });
  const user = userEvent.setup();
  render(<EditMode token="pk.fake-test-value" />);
  await screen.findByRole("region", { name: "Edit mode" });
  act(() => FakeMap.last.emit("load"));
  await user.click(screen.getByRole("button", { name: /^1 student success center/i }));
  return { user, sent, editor: screen.getByRole("dialog", { name: first.name }) };
}

describe("Edit mode", () => {
  it("opens from ?view=edit", () => {
    expect(viewFor(EDIT_MODE_SEARCH)).toBe("edit");
  });

  it("asks for a name and the editor password, and shows the server's answer", async () => {
    const sent = server({ session: { body: { signedIn: false } }, login: { status: 401, body: { error: "That password isn't right." } } });
    const user = userEvent.setup();
    render(<EditMode token="pk.fake-test-value" />);
    await user.type(await screen.findByLabelText("Your name"), "Ana");
    await user.type(screen.getByLabelText("Editor password"), "guess");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That password isn't right.");
    expect(sent.find((s) => s.path === "login")?.body).toEqual({ name: "Ana", password: "guess" });
  });

  it("explains when the site isn't set up for editing", async () => {
    server({ session: { body: { signedIn: false, setupProblem: "Edit mode isn't set up on this site yet." } } });
    render(<EditMode token="pk.fake-test-value" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't set up");
  });

  it("opens an editor instead of the card, and hides Tour Mode", async () => {
    const { editor } = await openEditor();
    expect(within(editor).getByLabelText("Full official name")).toHaveValue(first.name);
    expect(within(editor).getByLabelText("Summary")).toHaveValue(first.summary);
    expect(screen.queryByRole("button", { name: /start tour/i })).not.toBeInTheDocument();
    expect(within(editor).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves a change and says when it will be live", async () => {
    const summary = "A fresh summary for this building.";
    const { user, sent, editor } = await openEditor({
      save: (body) => ({ body: { stop: { ...first, summary: (body as { edit: Stop }).edit.summary }, commitUrl: "https://github.com/x/y/commit/abc" } }),
    });
    const field = within(editor).getByLabelText("Summary");
    await user.clear(field);
    await user.type(field, summary);
    await user.type(within(editor).getByLabelText(/what did you change/i), "Foundation update");
    await user.click(within(editor).getByRole("button", { name: "Save" }));
    expect(await within(editor).findByText(/Saved\. Live in about a minute/)).toBeInTheDocument();
    const save = sent.find((s) => s.path === "save")!.body as { id: string; edit: Stop; base: Stop; note: string };
    expect(save.id).toBe(first.id);
    expect(save.edit.summary).toBe(summary);
    expect(save.base.summary).toBe(first.summary);
    expect(save.note).toBe("Foundation update");
    expect(within(editor).getByRole("link", { name: "See the change" })).toHaveAttribute("href", "https://github.com/x/y/commit/abc");
  });

  it("blocks saving while a required field is empty", async () => {
    const { user, editor } = await openEditor();
    await user.clear(within(editor).getByLabelText("Summary"));
    expect(within(editor).getByText("Write a one-sentence summary.")).toBeInTheDocument();
    expect(within(editor).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the server's reason when a save fails", async () => {
    const { user, editor } = await openEditor({ save: { status: 409, body: { error: "Someone else changed this building after you opened it." } } });
    await user.type(within(editor).getByLabelText("Summary"), " More.");
    await user.click(within(editor).getByRole("button", { name: "Save" }));
    expect(await within(editor).findByText(/Someone else changed this building/)).toBeInTheDocument();
  });

  it("previews the card as guests will see it", async () => {
    const { user, editor } = await openEditor();
    await user.type(within(editor).getByLabelText("Summary"), " Updated.");
    await user.click(within(editor).getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: first.name });
    expect(preview).toHaveTextContent(`${first.summary} Updated.`);
    await user.click(within(preview).getAllByRole("button", { name: "Back to editing" })[0]);
    expect(screen.getByLabelText("Summary")).toHaveValue(`${first.summary} Updated.`);
  });

  it("asks before throwing away unsaved changes", async () => {
    const { user, editor } = await openEditor();
    await user.type(within(editor).getByLabelText("Summary"), " Draft.");
    await user.click(within(editor).getByRole("button", { name: /close editor/i }));
    expect(screen.getByRole("dialog", { name: first.name })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns to sign-in when the session has expired", async () => {
    const { user, editor } = await openEditor({ save: { status: 401, body: { error: "expired" } } });
    await user.type(within(editor).getByLabelText("Summary"), " More.");
    await user.click(within(editor).getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/sign-in expired/i)).toBeInTheDocument();
  });
});
