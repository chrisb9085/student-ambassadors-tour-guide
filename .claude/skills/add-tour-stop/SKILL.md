---
name: add-tour-stop
description: Add or edit a stop on the FIU donor driving tour (card content, coordinates, route order, type, construction status) in content/stops.json and content/route.geojson.
---

# Add or edit a tour stop

Use this when asked to add a building, change a card, reorder the route, or mark a stop as under construction.

## Steps

1. **Check the spec.** Find the stop in `docs/SCOPE.md` section 5 (route order, featured vs quick pass) or its "Off-route buildings" table. If it isn't listed, ask before adding it. Later-phase buildings use `"type": "also-on-campus"` and `"order": null`.
2. **Gather facts.** Use the handbook-derived notes in docs/SCOPE.md and Appendix A first. For anything missing, use official `fiu.edu` pages only, and record each URL in `sources`. Never invent numbers, dates, rankings or donor names. If a fact can't be sourced, leave it out and say so.
3. **Write the card** following the `write-donor-card` skill.
4. **Set coordinates** as `[lng, lat]` at the building's road-facing side, so the marker sits next to the route. Compare against `docs/reference/aerial-route.png` and `docs/reference/campus-map-labeled.png`. Coordinates must fall inside campus (roughly lng -80.386 to -80.366, lat 25.745 to 25.766).
5. **Set the order.** Route stops use consecutive integers starting at 1, in driving order. When you insert a stop, renumber the stops after it. Welcome and Closing live in `content/tour.json`, not here.
6. **Route line.** If the new stop isn't on the existing path in `content/route.geojson`, extend the LineString along the real roads. Don't draw straight lines across buildings.
7. **Construction status.** Set `"status": "under-construction"` and `"opens"` (if known). Keep the full card.
8. **Validate.** Run `npm run validate` and fix every error and warning, then `npm run content:review` to refresh the Foundation's review page, then `npm test`.
9. **Report.** Tell the user what changed and which facts still need Foundation review.
