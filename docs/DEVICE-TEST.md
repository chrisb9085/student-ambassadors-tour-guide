# Device test checklist: iPad in the vehicle

Automated tests cover the logic and the layout in Chrome and in WebKit, the engine behind Safari. These checks need a real iPad, a real voice and a moving vehicle. Run them before the first donor tour, and again after big changes.

**You need:** an iPad with current iPadOS and Safari, cellular data (turn campus Wi-Fi off for one run), the deployed link, and a second person to drive.

Mark each item ✅ or ❌, and note anything odd in the last column.

## Before the drive (parked)

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 1 | The site loads on cellular in a few seconds and shows the satellite map, not a blank or grey map. | | |
| 2 | Portrait and landscape both look right. Rotate mid-tour too. | | |
| 3 | Labels, markers and the gold route are readable in direct sunlight, at full and at half brightness. | | |
| 4 | Every button is easy to hit with a thumb: Stops, Start tour, Next, Pause, Skip. | | |
| 5 | Tapping a marker opens its card. Tapping next to a building also works. | | |
| 6 | Bell Chapel shows the orange dashed marker and the "Under construction" badge, and its card still has full information. | | |
| 7 | **Settings → Voice:** pick the most natural voice on the list. For better voices, download one under iPadOS Settings → Accessibility → Spoken Content → Voices → English, then choose an "Enhanced" or "Premium" voice. | | Voice used: |

## Narration (parked)

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 8 | **Start tour → Virtual tour.** Welcome narration starts right after the tap, with no second tap needed. | | |
| 9 | After Welcome, the tour moves to stop 1 by itself and keeps narrating stop after stop. This is the iOS check: speech must keep working when it isn't started by a tap. | | |
| 10 | Narration is audible with the side switch on silent. If it isn't, note it: guests may need the switch off. | | |
| 11 | Names sound right, especially "MARC" (should be "Mark"), "Díaz-Balart", "Cejas", "Wertheim", "Tschumi" (not narrated) and "Mango". | | |
| 12 | Pause stops the voice right away. Play restarts that stop from the beginning. | | |
| 13 | Speech speed: Slower, Normal and Faster all work. Pick the one that best fits the drive. | | Best speed: |
| 14 | Lock the screen mid-narration, then unlock. Note what happens (it may pause; SCOPE §10 lists this risk). | | |

## Ride-along (moving)

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 15 | **Start tour → Ride-along.** The tour waits on each stop until Next is tapped. | | |
| 16 | Each narration finishes before you reach the next building. Note any stop where it runs long. | | Long stops: |
| 17 | Skip works for buildings you don't want to cover with this donor. | | |
| 18 | Marker positions match the buildings you see from the car. Note any marker to move. | | Move: |
| 19 | The route on screen matches the roads you drive, especially the SW 112th Ave boulevard loop, Lot 9, the Primera Casa U-turn and SW 17th St. | | |
| 20 | **Open question:** does the drive go *through* Lot 9, or along E Campus Cir past it? The app currently follows E Campus Cir (see `.claude/sprints/TRACE.md`, Sprint 2). | | Answer: |
| 21 | Closing narration plays back at the MARC loop, then Restart and Exit appear. | | |

## After the drive

- Send the notes column, with stop numbers, to whoever maintains the site.
- Marker moves and copy edits go through the `add-tour-stop` skill. Route changes go through `tools/route/` (see its README).
