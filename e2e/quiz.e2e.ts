import { expect, test } from "./fixtures";
import { openMap, waitForIdle } from "./helpers";

test.describe("Self-quiz", () => {
  test("hides marker names, takes an answer and reveals the facts", async ({ page }, info) => {
    await openMap(page);
    await page.getByRole("button", { name: "Start tour" }).click();
    await page.getByRole("button", { name: /quiz yourself/i }).click();
    const quiz = page.getByRole("dialog");
    await expect(quiz).toContainText("Which building is highlighted on the map?");

    // The highlighted marker is on screen, beside the panel, with its name hidden.
    const marker = page.locator(".stop-marker.is-selected");
    await expect(marker).toBeInViewport();
    await expect(marker.locator(".stop-marker-label")).toBeHidden();
    const [m, p] = [await marker.boundingBox(), await quiz.boundingBox()];
    const overlap = m!.x < p!.x + p!.width && p!.x < m!.x + m!.width && m!.y < p!.y + p!.height && p!.y < m!.y + m!.height;
    expect(overlap, "the highlighted building should not sit under the quiz panel").toBe(false);

    // Every choice is a full-size touch target.
    const choices = quiz.getByRole("list", { name: "Choices" }).getByRole("button");
    await expect(choices).toHaveCount(4);
    for (const box of await choices.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);

    await waitForIdle(page);
    await page.screenshot({ path: info.outputPath("quiz-question.png") });
    await choices.first().click();
    await expect(page.getByRole("status")).toContainText(/Correct!|Not quite/);
    await page.screenshot({ path: info.outputPath("quiz-answer.png") });
    await page.getByRole("button", { name: "Next question" }).click();
    await expect(quiz).toContainText(/question 2 of 10/i);
  });
});
