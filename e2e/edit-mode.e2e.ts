import type { Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";
import { waitForMap } from "./helpers";
import stops from "../content/stops.json" with { type: "json" };

/**
 * Edit mode against a stand-in for its server functions (api/admin/), which `vite` doesn't run. The functions
 * themselves are unit-tested in api/_lib/handlers.test.ts.
 */
async function fakeServer(page: Page) {
  const saves: unknown[] = [];
  let signedIn = false;
  await page.route("**/api/admin/*", async (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/admin/", "");
    const body = route.request().postDataJSON?.() ?? null;
    if (path === "session") return route.fulfill({ json: signedIn ? { signedIn, name: "Ana" } : { signedIn } });
    if (path === "login") {
      if (body.password !== "test password 123") return route.fulfill({ status: 401, json: { error: "That password isn't right." } });
      signedIn = true;
      return route.fulfill({ json: { name: body.name } });
    }
    if (path === "stops") return route.fulfill({ json: { stops } });
    if (path === "save") {
      saves.push(body);
      const stop = stops.find((s) => s.id === body.id)!;
      return route.fulfill({ json: { stop: { ...stop, ...body.edit }, commitUrl: "https://github.com/example/commit/abc" } });
    }
    return route.fulfill({ status: 404, json: { error: "no route" } });
  });
  return saves;
}

test("sign in, edit a building, preview and save", async ({ page }, info) => {
  const saves = await fakeServer(page);
  await page.goto("/?view=edit");
  await page.getByLabel("Your name").fill("Ana");
  await page.getByLabel("Editor password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("That password isn't right.");
  await page.getByLabel("Editor password").fill("test password 123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await waitForMap(page);
  await expect(page.getByRole("region", { name: "Edit mode" })).toContainText("Ana");
  await expect(page.getByRole("button", { name: /start tour/i })).toHaveCount(0);

  await page.getByRole("button", { name: /2 graham center, stop 2 of 32/i }).click();
  const editor = page.getByRole("dialog", { name: "Graham Center" });
  await editor.getByLabel("Summary").fill("An updated summary for Graham Center.");
  await editor.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("dialog")).toContainText("An updated summary for Graham Center.");
  await page.getByRole("dialog").getByRole("button", { name: "Back to editing" }).last().click();

  const shot = info.outputPath("edit-mode.png");
  await page.screenshot({ path: shot });
  await info.attach("edit-mode", { path: shot, contentType: "image/png" });

  // Every control in the editor meets the touch-target size, and the form passes an accessibility check.
  for (const b of await editor.getByRole("button").all()) {
    const box = await b.boundingBox();
    if (box) expect(Math.min(box.width, box.height), await b.innerText()).toBeGreaterThanOrEqual(40);
  }
  const axe = await new AxeBuilder({ page }).include(".stop-editor").analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  await editor.getByRole("button", { name: "Save" }).click();
  await expect(editor).toContainText("Saved. Live in about a minute.");
  expect(saves).toHaveLength(1);
  expect(saves[0]).toMatchObject({ id: "graham-center", edit: { summary: "An updated summary for Graham Center." } });
});
