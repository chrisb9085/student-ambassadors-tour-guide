# Edit mode: handover guide for administrators

Edit mode lets Student Ambassador officers update building cards on the live tour without writing code. This page is for whoever looks after the site: how it works, where the secrets live, and what to do at each handover. Editors themselves only need the link and the password (section 4).

## 1. How it works

- **Open it at** `https://<your-site>/?view=edit` (for example `https://<project>.vercel.app/?view=edit`). It isn't linked from the tour, so guests and ambassadors won't stumble on it.
- An editor types **their name** and the **editor password**. Tapping a building on the map opens a form instead of its card. **Preview** shows the card as guests will see it; **Save** publishes it.
- Each save becomes a commit on the `main` branch of the GitHub repository, labelled `Edit mode: update <building>` with an `Edited-by: <name>` line. Vercel sees the commit and redeploys, so the change is live in **about a minute**.
- The same commit refreshes `docs/CONTENT-REVIEW.md` (the Foundation's review page), so it never falls out of date.
- **What can be edited:** name, map label, open or under construction (and opening date), summary, key stat, highlights, impact of support, spoken narration, sources, ambassador details, and notes for the Foundation. Handbook tour guide tips can be removed but not reworded, because they are exact quotes.
- **What still needs code:** adding or removing stops, moving a building on the map, changing the route or stop order, photos, and the Welcome and Closing cards. See `.claude/skills/add-tour-stop/` or ask someone who codes.
- **Safety nets:** the server checks every save against the same content rules as `npm run validate` (required fields, length limits, sources from the handbook or fiu.edu). If two people edit the same building, the second save is stopped instead of overwriting the first. Every earlier version stays in the GitHub history.

## 2. Where the secrets live

There is **no database and no separate backend**. A few small Vercel serverless functions in `api/admin/` do the server-side work, and they read two secrets from Vercel's environment variables:

| Variable | What it is | Where it lives |
| --- | --- | --- |
| `EDITOR_PASSWORD` | The shared editor password, at least 12 characters. A short phrase of 4 or more random words is easy to type and hard to guess. | Vercel only |
| `GITHUB_TOKEN` | A GitHub fine-grained token that can read and write **this repository's contents and nothing else**. It's how saves become commits. | Vercel only |
| `GITHUB_REPO` (optional) | `owner/name` of the repository, if it moves. Default `chrisb9085/student-ambassadors-tour-guide`. | Vercel |
| `GITHUB_BRANCH` (optional) | Branch that saves go to. Default `main`. | Vercel |

**Why these are safe:** none of them starts with `VITE_`. Vite only copies `VITE_` variables into the JavaScript that visitors download (that's why the public Mapbox token is `VITE_MAPBOX_TOKEN`). These stay on Vercel's servers, where only the functions can read them. The browser never sees the password after it's typed, nor the GitHub token at all.

**Rules:**
- Never put the password or token in the repository, in a `VITE_` variable, in a group chat, or in a shared doc. Hand the password over in person or through a password manager.
- In Vercel, add `EDITOR_PASSWORD` and `GITHUB_TOKEN` to the **Production** environment only, and mark them **Sensitive**. If Preview deployments had them, a save from a preview link would still commit to `main`.
- After a correct password, the browser keeps a signed sign-in cookie for 8 hours. JavaScript on the page can't read it and other sites can't use it. Changing either secret signs everyone out at once.

## 3. First-time setup (once)

1. **Create the GitHub token.** Signed in as the account that owns the repository, go to GitHub, Settings, Developer settings, Personal access tokens, **Fine-grained tokens**, Generate new token.
   - Name: `FIU tour Edit mode`.
   - Expiration: the longest GitHub offers (up to a year). **Put a reminder in the calendar** a week before it expires.
   - Repository access: **Only select repositories**, then pick this repository.
   - Permissions: **Contents: Read and write**. Leave everything else as No access.
   - Generate, and copy the token straight into Vercel (next step). Don't save it anywhere else.
2. **Add the variables in Vercel.** Open the project, Settings, Environment Variables. Add `EDITOR_PASSWORD` and `GITHUB_TOKEN` for **Production**, marked Sensitive.
3. **Redeploy** (Deployments, the latest production deployment, Redeploy) so the functions pick up the new values.
4. **Test it:** open `/?view=edit`, sign in, change one word on a card, save, and check that the change appears on the tour a minute later and in the repository's commit history. Undo it the same way.

## 4. Handover checklist (each new President or web lead)

1. **Change the editor password:** in Vercel, edit `EDITOR_PASSWORD`, save, and redeploy. Everyone is signed out; share the new password only with current officers.
2. **Check who owns the repository and the Vercel project.** The GitHub token belongs to a person's account. If that person is leaving, either transfer the repository and Vercel project to the new administrator (or, better, to a shared organization account for the Student Ambassadors), then create a new token from the new owner (section 3, step 1), replace `GITHUB_TOKEN` in Vercel, redeploy, and delete the old token on GitHub.
3. **Check the token's expiry date** on GitHub, and move the calendar reminder to whoever is responsible now.
4. **Pass on this page** and the Edit mode link.

## 5. Undoing a change

Every save is a commit. To undo one, open the repository on GitHub, find the commit (`Edit mode: update <building>`), and use **Revert** (or ask someone who codes). Vercel redeploys the reverted version. Alternatively, open Edit mode and type the old text back in; the commit page shows exactly what changed.

## 6. When something goes wrong

| Message in Edit mode | What to do |
| --- | --- |
| "Edit mode isn't set up on this site yet" | `EDITOR_PASSWORD` or `GITHUB_TOKEN` is missing in Vercel's Production environment. Add it (section 3) and redeploy. |
| "The editor password set in Vercel is too short" | Use at least 12 characters. |
| "That password isn't right" | Check the password with the current administrator. Each wrong try is slowed down on purpose. |
| "The site couldn't reach the content on GitHub. The GITHUB_TOKEN in Vercel may have expired" | The token expired, was deleted, or lost access to the repository. Create a new one (section 3, step 1), replace it in Vercel, redeploy. |
| "Someone else changed this building after you opened it" | Reload the page to see their version, then make your change again. |
| "Edit mode's server isn't running here" | You're on `npm run dev`, which doesn't run Vercel functions. Use the live site, or `vercel dev` (below). |

## 7. For developers

- Server code: `api/admin/*.ts` (routes) and `api/_lib/` (sign-in in `session.ts`, GitHub commits in `github.ts`, the logic in `handlers.ts`). Tests: `api/_lib/handlers.test.ts`, which runs with `npm test` and uses a fake GitHub, so it never commits.
- Shared rules for what's editable: `src/admin/editable.ts` (used by both the form and the server). The form is `src/admin/StopEditor.tsx`.
- To try the whole thing locally: install the Vercel CLI, run `vercel link` once, add `EDITOR_PASSWORD` and `GITHUB_TOKEN` to `.env.local` (no `VITE_` prefix; Vite won't expose them), set `GITHUB_BRANCH` to a test branch so saves don't go to `main`, and run `vercel dev`.
- Saves commit straight to `main`, which skips the usual review. That's deliberate for non-coders; the rules in `editable.ts` and the history are the safeguards. Handbook-tip quotes can't be changed through Edit mode, so the unit test that checks them keeps passing.
