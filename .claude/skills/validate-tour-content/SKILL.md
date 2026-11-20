---
name: validate-tour-content
description: Validate the tour content files (content/stops.json, content/tour.json, content/route.geojson) and check that no Mapbox token was committed. Run after any content or route change, and before committing.
---

# Validate tour content

Run:

```
node .claude/skills/validate-tour-content/scripts/validate.mjs
```

The script has no dependencies and exits non-zero on errors. It checks:

- `stops.json` is valid JSON, and every stop has the required fields with allowed values (see the content model in CLAUDE.md).
- Stop ids are unique and kebab-case.
- Route stops have consecutive `order` values starting at 1. `also-on-campus` stops have `order: null`.
- Coordinates are `[lng, lat]` and inside the campus bounds.
- Narration length: featured 40 to 90 words, quick pass 35 words or fewer (a warning, not an error).
- Under-construction stops still have a summary and highlights.
- Every stop lists at least one source and a `lastReviewed` date.
- `route.geojson` is a single LineString with points inside campus.
- `tour.json` has `welcome` and `closing`.
- No tracked text file contains something that looks like a Mapbox token (`pk.` or `sk.` followed by a long string).

Fix every error. Report the warnings to the user rather than silently rewriting content, because card text needs Foundation approval.
