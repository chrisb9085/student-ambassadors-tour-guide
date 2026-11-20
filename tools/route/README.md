# Route tools

How `content/route.geojson` was made, so it can be rebuilt or extended (for example for Phase 2 custom tours).

The route follows real road geometry from the Mapbox Streets tiles the app already loads (OpenStreetMap data), routed through the hand-placed waypoints in `waypoints.json`, which follow Chris's red trace in `docs/reference/aerial-route.png`.

## Steps

All three scripts drive the running dev server, so start it first with `npx vite --port 5173`. They pass the token only through the app and never print request URLs.

1. **Extract** road, building and place-label features for campus from the live map:
   ```
   node tools/route/extract.mjs . <outDir>
   ```
   This writes `<outDir>/mapbox-features.json`. Keep it out of the repo: it's large and derived from Mapbox tiles.
2. **Route** through the waypoints along drivable roads (shortest path between consecutive waypoints; parking aisles cost more):
   ```
   node tools/route/router.mjs <outDir>/mapbox-features.json tools/route/waypoints.json <outDir>/route.geojson <outDir>/roads.geojson
   ```
   It prints the route length and any waypoint more than 25 m from a road. Move those waypoints onto the road.
3. **Check** the result over satellite imagery with a coordinate grid, the route, and optional numbered points (`[{ "n": "label", "c": [lng, lat] }]`):
   ```
   node tools/route/viz.mjs . out.png <lng> <lat> <zoom> <gridStep> <width> <height> [roads.geojson|-] [route.geojson|-] [points.json|-]
   ```
4. Copy the route into `content/route.geojson` as a FeatureCollection with one LineString, then run `npm run validate` and `npm test`.

## Tips

- To force the route down a particular road, add a waypoint on that road. To make a U-turn (like the Primera Casa loop), put a waypoint at the far end of the loop, then one back on the road you came from.
- Waypoints are in driving order. The first and last should both be the start loop in front of MARC.
