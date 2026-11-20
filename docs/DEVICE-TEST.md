# Device test checklist: iPad and phone

The site is a **preparation tool**: ambassadors use it to study the route before a tour, not in the vehicle (Chris, 2026-11-20). Automated tests cover the logic and layout in Chrome and in WebKit, the engine behind Safari. These checks need a real device, because they involve real voices, audio, the lock screen and the share sheet. Run them before ambassadors start using the site, and again after big changes.

**You need:** an iPad and an iPhone with current iPadOS/iOS and Safari, and the deployed link. One run on cellular data is useful.

Mark each item ✅ or ❌, and note anything odd in the last column.

## Loading and layout

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 1 | The site loads in a few seconds and shows the satellite map, not a blank or grey map. | | |
| 2 | iPad portrait and landscape both look right. Rotate with a card open, and again mid-tour. | | |
| 3 | iPhone portrait: the whole route fits when the page opens; cards slide up from the bottom. | | |
| 4 | iPhone landscape: cards and Tour Mode sit in a side panel with the map beside them, and the Stops and Start tour buttons aren't hidden. | | |
| 5 | Every button is easy to hit with a thumb, and taps act at once (no zoom on double-tap). | | |
| 6 | Safari's "Aa" text size (bigger and smaller) keeps the layout usable. | | |

## Cards and study tools

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 7 | Tapping a marker opens its card. Tapping next to a building also works. | | |
| 8 | Bell Chapel and Shaham show the orange dashed marker and the "Under construction" badge. | | |
| 9 | **For ambassadors** opens and closes on each card, and shows the tour guide tip with its handbook page. | | |
| 10 | **Copy link** on a card, then paste it in Messages or Notes. Opening the link shows the same card. (On a plain `http://` address, Safari shows the link in a box to copy instead.) | | |
| 11 | **Stops → Printable study guide** opens. Print to PDF from the share sheet: every stop is readable, with no buttons and no stop split across pages. | | Pages: |
| 12 | Off-route buildings (Reagan House, Deuxième Maison, Veteran and Military Affairs, Shaham) are where you expect on the map. | | Move: |

## Narration

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 13 | **Settings → Voice:** pick the most natural voice on the list. For better voices, download one under Settings → Accessibility → Spoken Content → Voices → English, then choose an "Enhanced" or "Premium" voice. | | Voice used: |
| 14 | **Start tour → Virtual tour.** Welcome narration starts right after the tap, with no second tap needed. | | |
| 15 | After Welcome, the tour moves to stop 1 by itself and keeps narrating stop after stop. This is the iOS check: speech must keep working when it isn't started by a tap. | | |
| 16 | The short pause between sentences sounds natural, not choppy. | | |
| 17 | Names sound right, especially "MARC" (should be "Mark"), "Díaz-Balart", "Cejas", "Wertheim", "Mango", "Deuxième Maison" and "Shaham". | | Mispronounced: |
| 18 | Pause stops the voice right away. Play restarts that stop from the beginning. Slower, Normal and Faster all work. | | Best speed: |
| 19 | The screen stays on during a virtual tour (it no longer dims after the usual timeout). | | |
| 20 | Narration is audible with the side switch on silent. If it isn't, note it. | | |
| 21 | The progress strip fills in as you go, and skipped stops look different. | | |

## Recorded narration (only once recordings exist)

Skip this section until `public/audio/` has clips (see `tools/narration-audio/README.md`).

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 22 | Welcome plays the recorded voice, and **Settings → Narration voice** shows "Recorded". | | |
| 23 | Captions highlight roughly the sentence being spoken. | | |
| 24 | Lock the screen mid-narration: the recording keeps playing, and the lock screen shows the stop name with play, pause and next. | | |
| 25 | Switching to "This device" uses the device voice from the next stop (or after Pause and Play). | | |

## Optional: drive the route once

Only needed if markers or the route look wrong.

| # | Check | ✅/❌ | Notes |
|---|---|---|---|
| 26 | Marker positions match the buildings you see from the car. | | Move: |
| 27 | The route on screen matches the roads you drive, especially the SW 112th Ave boulevard loop, E Campus Cir past Lot 9, the Primera Casa U-turn and SW 17th St. | | |

## After testing

- Send the notes column, with stop numbers, to whoever maintains the site.
- Marker moves and copy edits go through the `add-tour-stop` skill. Route changes go through `tools/route/` (see its README).
