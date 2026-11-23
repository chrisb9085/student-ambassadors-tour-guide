# FIU Foundation Interactive Campus Tour

An interactive site for FIU Foundation Student Ambassadors' VIP and donor **driving** tours of the Modesto A. Maidique Campus. It shows a Mapbox satellite map with the tour route, clickable stop cards written for donors, and a guided Tour Mode with text-to-speech.

**Purpose (Chris, 2026-11-20):** the site is a **preparation tool**: ambassadors use it to study the route and what to say before a tour, not in the vehicle. Card copy stays donor-facing (it's what they say on the tour). Study features and narration quality come before ride-along or in-vehicle features.

**Facts and names:** official FIU sources win over SCOPE.md, the handbook and Chris's own answers. Use the FIU version and note the difference. Use full official building names on cards and in narration ("Academic Health Center 2: Herbert Wertheim College of Medicine"); map label chips keep their short `label`.

**Read `docs/SCOPE.md` before starting any feature.** It is the spec: route order, MVP vs later phases, card fields, open questions and the content facts (Appendix A). Reference images are in `docs/reference/`.

## Stack (decided)

- React + TypeScript on Vite
- Mapbox GL JS with the Mapbox satellite style (`mapbox://styles/mapbox/satellite-streets-v12` or `satellite-v9`)
- Stop content as JSON in the repo (`content/`)
- Web Speech API (`window.speechSynthesis`) for narration
- Hosting on Vercel
- **No database.** The only server code is the small Vercel functions behind Edit mode (`api/admin/`, see below). Supabase may come later for logins, saved custom routes and ambassador notes. Don't add it until asked.

## Commands

- `npm run dev`: local dev server
- `npm run build`: type-check and build
- `npm run lint`
- `npm test`: Vitest unit and component tests (jsdom)
- `npm run validate` (same as `node .claude/skills/validate-tour-content/scripts/validate.mjs`): validate `content/` (run after any content change). It also warns about narration that text-to-speech reads badly.
- `node tools/narration-audio/generate.mjs --provider <openai|elevenlabs|azure> [--dry-run]`: generate recorded narration into `public/audio/` (see its README). Keys come from environment variables only. Never generate without Chris's go-ahead: it's billed, and using an AI voice is his decision.
- `npm run content:review`: regenerate `docs/CONTENT-REVIEW.md`, the Foundation's review page. Run after any content change; a unit test fails if it's stale.
- `npm run test:e2e`: Playwright end-to-end tests in Chromium (desktop, iPad landscape, iPad portrait, phone landscape). Mapbox's servers are replaced by a local stand-in (`e2e/fixtures.ts`), so runs cost no map loads. Import `test` and `expect` from `./fixtures` in new specs.
- `npm run test:e2e:webkit`: the same specs in WebKit (Safari's engine) on iPad and iPhone profiles, run serially because headless WebKit is slow. Run it before a release.
- `npm run test:e2e:real`: the only tests that load real Mapbox tiles (tagged `@real-map`, two map loads). Run before a release, not on every change. **Keep Mapbox usage low:** don't add real-tile tests unless the imagery itself is under test.
- On Windows, run `npm test` from PowerShell. From Git Bash, a drive-letter case mismatch makes Vitest load twice and every file fails.

## Workflow

- Work in sprints from `docs/BACKLOG.md`: one branch per sprint (`sprint-N/<name>`), merged with `git merge --no-ff`. Phase 2 sprints branch from `phase-2` and merge back into `phase-2`, never into `main`.
- Before merging: build, lint, unit tests (`npm test`), end-to-end tests (`npm run test:e2e`) and validate pass, and the sprint entry in `.claude/sprints/TRACE.md` is updated.

## Secrets: Mapbox token

- The public Mapbox token is read from `import.meta.env.VITE_MAPBOX_TOKEN`.
- Locally it lives in `.env.local` (gitignored). On Vercel it is an environment variable.
- **Never write a token value into any tracked file, code, test, fixture or commit message.** Never read or print `.env.local`. If the variable is missing, show a clear on-screen message instead of the map.
- Restrict the token by URL in the Mapbox dashboard (Vercel domain and localhost).

## Edit mode (admin console)

- Non-coders edit stop cards at `/?view=edit`. Vercel functions in `api/admin/` check the shared `EDITOR_PASSWORD` and commit edits to `main` through the GitHub API with `GITHUB_TOKEN`. No database. Handover and secrets: `docs/ADMIN-HANDOVER.md`.
- Both secrets are server-only. **Never give them a `VITE_` prefix, read them in `src/`, or write their values anywhere tracked.**
- What Edit mode may change, and its rules, live in `src/admin/editable.ts`, shared by the form and the server. Keep it in line with the validate script when content rules change.
- Edit mode commits regenerate `docs/CONTENT-REVIEW.md` through `tools/content-review-lib.mjs`.

## Content model

`content/stops.json` is an array of stops:

```jsonc
{
  "id": "graham-center",              // kebab-case, unique
  "order": 2,                         // route position; null for "also-on-campus"
  "code": "GC",                       // building code from docs/reference/campus-map-labeled.png
  "name": "Graham Center",
  "label": "Graham Center",           // optional short name for the map label chip
  "type": "featured",                 // "featured" | "quick-pass" | "also-on-campus"
  "status": "open",                   // "open" | "under-construction"
  "opens": null,                      // e.g. "2028" when under construction
  "coordinates": [-80.3733, 25.7563], // [lng, lat], GeoJSON order
  "summary": "One sentence on why it matters.",
  "highlights": ["3 to 4 short facts"],
  "impact": "Impact of support: donors, partners or gifts behind the space.",
  "stat": { "value": "3.5M+", "label": "visits a year" },
  "narration": null,                  // optional spoken text if it should differ from the card
  "photo": null,                      // optional path under public/
  "sources": ["Handbook", "https://..."],
  "lastReviewed": "2026-11-19",
  "reviewNotes": ["optional: facts the Foundation must confirm; never shown to guests"],
  "guideNotes": [                     // optional: study notes, never spoken. Tips show under the Script tab, details under Info ("Good to know")
    { "kind": "tip", "text": "A handbook Tour Guide Tip, quoted exactly", "source": "Handbook p.12" },
    { "kind": "detail", "text": "A fuller fact for answering questions", "source": "Handbook p.13 or an fiu.edu URL" }
  ]
}
```

- `content/tour.json` holds the Welcome card (start at the PG1/PG2 loop by MARC) and the Closing card.
- `content/route.geojson` is a FeatureCollection with a single LineString following campus roads in driving order. Rebuild or extend it with `tools/route/` (see its README).
- The handbook is in `docs/HANDBOOK.md`; cite it as `Handbook p.N` using the page markers in that file.
- Featured cards: 40 to 90 words of narration. Quick-pass: one or two sentences (35 words or fewer).
- `guideNotes` tips are quoted word for word from the handbook page they cite (a unit test checks this). Details are short, sourced and may include student logistics, since only ambassadors see them.

## Content rules

- The audience is donors and VIPs. Lead with impact and outcomes, not student logistics. Use the `write-donor-card` skill.
- Every fact needs a source (the handbook or an official fiu.edu page). Don't invent numbers, rankings or donor names.
- Under-construction buildings keep their full card and get a badge.
- Only stops listed in docs/SCOPE.md section 5 (plus Green Library) are in the MVP.

## UI rules

- FIU blue and gold. Define colors as CSS variables in one place.
- Very user-friendly: large touch targets (44px minimum), one primary action at a time, works in portrait and landscape on iPad Safari first.
- Accessible: keyboard navigation of stops, aria labels on markers, captions visible during narration.
- iOS Safari only plays speech after a user tap, so start narration from a button press.

## Git

- Work locally. Don't push or open pull requests unless Chris asks.
- Small commits with clear messages.

## Project skills

- `add-tour-stop`: add or edit a stop (card, coordinates, route order).
- `validate-tour-content`: check `content/` against the rules above.
- `write-donor-card`: tone and structure for donor-facing card copy.
