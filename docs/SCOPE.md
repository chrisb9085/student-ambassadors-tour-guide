# FIU Foundation Interactive Campus Tour: Project Scope

**Status:** Draft for review (revision 5)
**Owner:** Chris (FIU Foundation Student Ambassadors)
**Last updated:** 2026-11-19
**Source content:** *Student Ambassador Handbook (Text Draft)*, Chris's route description, official FIU web pages (Appendix A)
**Map references:** `reference/aerial-route.png` (aerial view with the driving route in red) and `reference/campus-map-labeled.png` (labeled campus map with building codes)

---

## 1. Summary

An interactive website built on a **satellite image of FIU's Modesto A. Maidique Campus (MMC)**, with the Student Ambassadors' VIP and donor **driving tour** route drawn on top of it. Each stop along the route is clickable and opens a small information card written for donors, VIPs and community partners. A guided **Tour Mode** follows the drive from start to finish, moving along the route stop by stop and reading each card aloud with text-to-speech.

The map imagery is realistic, while all of the interface (buttons, cards, route line, markers, controls) uses FIU's blue and gold and is designed to be simple and very easy to use.

Tours are tailored to each donor's interests: ambassadors highlight the buildings that matter most to that guest, and some stops are a quick pass or skipped entirely. The site supports this by marking stops as **featured** or **quick pass** and by letting the guide skip any stop.

## 2. Goals

1. Give VIP and donor guests a polished, memorable view of FIU that reinforces the Foundation's three tour themes: **student success and academic excellence**, **research, innovation and community impact**, and **FIU's growth and transformation**.
2. Show the impact of philanthropy at each stop (named spaces, donor-funded programs, partnerships).
3. Give ambassadors a consistent, accurate companion to the driving tour, built from the handbook.
4. Make the experience usable without a guide (for example, before or after a visit, or for guests who cannot join the drive).

### Non-goals (for now)

- A general-purpose campus map, wayfinding or turn-by-turn navigation.
- Prospective-student or admissions-focused content.
- User accounts, logins or donor data of any kind (no CRM integration).
- A native mobile app (the site should work well in mobile browsers instead).

## 3. Audience

| Audience | How they use it |
|---|---|
| **Donors, VIPs, alumni, corporate and community partners** (primary) | Browse the map, open stop cards, or listen to the full guided tour. |
| **Student Ambassadors** | Use it on a tablet or phone in the vehicle during a live driving tour, or to study the route. |
| **FIU Foundation staff** | Share a link with guests before or after a visit. |

**Content tone:** professional, warm and concise. Lead with impact and outcomes rather than student logistics. Each card should answer "why does this matter, and what does support make possible here?"

## 4. MVP scope

### 4.1 Satellite campus map

- A satellite (aerial) basemap of MMC, cropped and limited to campus so users cannot wander off.
- The **driving route** drawn as a bold FIU-gold line that follows the campus roads, with a direction arrow and a clear start/end marker at the loop between PG1 and PG2 in front of MARC.
- Every stop on the route has a numbered FIU-blue marker with a label. Tapping a marker or the building outline opens its card.
- **Under-construction stops** (Bell Chapel in the MVP; Shaham Academic Medical Center in a later phase) use a distinct marker style (for example a hard-hat icon, dashed outline and an "Under construction" badge). They are still clickable and show full information, including the expected opening date.
- **Quick-pass stops** (for example Bell Chapel, garages, Lot 9) use a smaller marker than featured stops.
- **Green Library** is shown as an "Also on campus" marker: clickable with a full card, but not part of the driving sequence.
- Pan and zoom on touch and desktop, a "reset view" button, and a "show whole route" button.
- Labels and markers stay readable over busy imagery (white halo or solid label chips).

### 4.2 Stop cards

Clicking a stop opens a small card (a popover on desktop, a bottom sheet on mobile). Proposed card fields:

| Field | Example (Graham Center) |
|---|---|
| Stop number and name | 2 · Graham Center |
| Status badge (when relevant) | "Under construction · Opens 2028" |
| Photo (optional in MVP) | Building exterior |
| One-line summary | The heart of student life at FIU, with more than 3.5 million visits a year. |
| 3 to 4 highlights | 29 Greek organizations; Student Government; Center for Leadership and Service; Disability Resource Center serving 3,500+ students |
| **Impact of support** | Donor-funded leadership programs and scholarships help students grow beyond the classroom. |
| Key stat | 3.5M+ visits a year |
| Listen button | Reads the card aloud |
| Previous / Next | Moves along the route |

Because this is a driving tour, cards are short: about 40 to 90 words, or 20 to 40 seconds of narration, so the narration roughly fits the time spent passing each building. Garages, fields and lots get even shorter "drive-by" cards. Longer handbook detail goes behind a "More" toggle.

### 4.3 Guided Tour Mode with text-to-speech

- A **Start Tour** button begins with a Welcome card (welcome and the FIU Foundation) at the PG1/PG2 loop, then visits each stop in route order, and ends with a Closing card (FIU by the numbers, recognition of support, thank you) back at the loop.
- A vehicle marker animates along the route line between stops, so the user sees the drive. At each stop the map follows the marker, highlights the building, opens its card and reads it aloud.
- Two ways to advance:
  - **Virtual tour** (guest at home or in a meeting): auto-advance on by default.
  - **Live ride-along** (ambassador in the vehicle): auto-advance off by default, and the ambassador taps Next as the vehicle reaches each building.
- Controls: large Play/Pause, Next and Previous buttons, **Skip this stop**, Exit tour, and a progress bar ("Stop 5 of 33").
- Quick-pass stops play a one- or two-sentence mention instead of the full card, so the guide can keep pace with the vehicle.
- Building a custom tour for a specific donor (choosing featured stops ahead of time) is planned for Phase 2. In the MVP the guide tailors the tour live by skipping stops.
- Settings: auto-advance, speech speed, and voice (where the browser offers a choice).
- Captions: the spoken text stays visible on the card, so the tour works muted.
- **TTS approach for MVP:** the browser's built-in Web Speech API. It is free, needs no server or API keys, and works offline. The trade-off is that voice quality varies by device. See Phase 2 for pre-recorded audio.

### 4.4 User-friendly FIU-themed interface

- FIU blue and gold color palette, FIU-approved typefaces and logos (pending brand approval).
- Large touch targets (at least 44 px) for use in a moving vehicle.
- One primary action on screen at a time: the map, a "Start Tour" button, and the stop list. No menus to dig through.
- A collapsible **stop list** panel (numbered, in route order) as an alternative to finding markers on the map.
- Works in portrait and landscape on iPad and phone.

### 4.5 Content management

- All stop content lives in one structured data file (for example `content/stops.json` or one Markdown file per stop) so that ambassadors can edit text without touching code.
- Each stop has an id, building code (for example `ZEB`, `RB`, `PCA`), route order, map coordinates, type (featured, quick pass, or also on campus), status (open or under construction, plus opening date), card fields, an optional narration script, and source links for its facts.
- The route line is stored as a separate GeoJSON file traced along campus roads.

### 4.6 Quality bar

- Works on current Safari (iPad and iPhone), Chrome and Edge.
- Accessible: keyboard navigation of stops, screen-reader labels on markers, sufficient color contrast over imagery, and visible captions for all audio.
- Loads quickly on campus Wi-Fi or cellular.

## 5. Tour route (driving)

The route below is Chris's real driving route, traced in red on `reference/aerial-route.png`. It starts and ends at the bottom of the loop between Gold Garage (PG1) and Blue Garage (PG2), in front of MARC. Codes match `reference/campus-map-labeled.png`.

**Type:** F = featured (full card and narration), Q = quick pass (short mention, often skipped depending on the donor). Featured vs quick pass is a first guess for Chris to adjust.

| # | Stop (code) | Type | Donor-facing angle | Content source |
|---|---|---|---|---|
| 0 | **Start: PG1/PG2 loop, MARC.** Welcome, the FIU Foundation, and MARC (home of the Foundation, Alumni Relations, StartUP FIU; 340,000+ alumni) | F | Who the Foundation is and what giving supports | Handbook |
| 1 | Student Academic Success Center (SASC) | F | Support from admission to career; retention and graduation | Handbook; Appendix A |
| 2 | Graham Center (GC) | F | Heart of student life; 3.5M visits a year; donor-funded leadership programs | Handbook |
| 3 | Trish and Dan Bell Chapel, **under construction** (behind the Reagan Presidential House, near the lake) | Q | Multifaith lakeside space; a named gift in progress | Handbook |
| 4 | AHC 1: Center for Children and Families | F | Children's mental health research and care | Handbook |
| 5 | AHC 2: Herbert Wertheim College of Medicine | F | South Florida's first public medical school; NeighborhoodHELP; Tano Simulation Center | Handbook |
| 6 | AHC 3: College of Nursing and Health Sciences | F | STAR Center hospital simulation | Handbook |
| 7 | AHC 5: Robert Stempel College of Public Health and Social Work | F | Community and global health | Handbook |
| 8 | Innovation Complex (Innovation 1, opened 2025) | F | AI, cybersecurity, robotics; LEED Gold; industry partners | Handbook; Appendix A |
| 9 | Market Station (PG5) | Q | Parking plus dining, classrooms and transit hub | Handbook (garages) |
| 10 | AHC 4: Science Classroom Complex | Q | Foundational science education | Handbook |
| 11 | Red Garage (PG4) | Q | Serves the east side of campus | Handbook (garages) |
| 12 | College of Arts, Sciences and Education (CASE) | F | Largest college; 26,000+ students; $60M+ research | Handbook |
| 13 | Tech Station (PG6) | Q | Tech classrooms, labs, MangoHacks | Handbook (garages) |
| 14 | Paul L. Cejas School of Architecture (PCA) | F | Bernard Tschumi design; ICAVE virtual reality | Handbook; Appendix A |
| 15 | Ryder Business Building (RB) | Q | Part of the College of Business; opened 1991 | Appendix A |
| 16 | Sanford L. Ziff Family Education Building (ZEB) | Q | Named for the Ziff family; opened 1997 | Appendix A |
| 17 | Intramural Fields | Q | NCAA-size turf field for intramurals and sport clubs | Appendix A |
| 18 | Lot 9 (the lot between the Intramural Fields, CBC and the College of Law) and College of Business Complex (CBC) | F | Capital Markets Lab; Bank of America Career Center; Ocean Bank Auditorium; industry ties | Handbook; Appendix A |
| 19 | MANGO (Management and New Growth Opportunities) | F | $35.7M business building opened 2014; College of Business and FIU Online | Appendix A |
| 20 | Rafael Díaz-Balart Hall, College of Law (RDB) | F | Robert A.M. Stern design; top Florida Bar pass rates | Handbook |
| 21 | Ocean Bank Convocation Center | F | 5,000 seats; basketball and commencement; FIU Athletics (18 NCAA Division I programs) | Handbook |
| 22 | Wellness and Recreation Center (WRC) | Q | Whole-student wellbeing | Handbook |
| 23 | Steven J. Green School of International and Public Affairs (SIPA) | F | 7,200+ students from 120+ countries | Handbook |
| 24 | Parkview Hall, Honors College (PVH) | Q | Honors College housing; sky bridge; overlooks the stadium | Appendix A |
| 25 | University Towers (UT) | Q | 10-story second-year housing; Veterans and Military Affairs if located here | Appendix A; handbook (VMA) |
| 26 | Lakeview Hall North and South (LH) | Q | 800 residents; BizLife business-themed community | Appendix A |
| 27 | Charles E. Perry Building, Primera Casa (PC) | F | FIU's first building (1972); *Las Cuatro Razas*; Deuxième Maison (1973) next door | Handbook |
| 28 | Back of MARC, then U-turn | Q | Transition; MARC's egg-shaped auditorium | Handbook (MARC) |
| 29 | Pitbull Stadium | F | School spirit and alumni engagement; premium seating, Hall of Fame, notable athlete alumni | Handbook |
| 30 | Tamiami Hall (opened 2022) | Q | 13-story, 676-resident apartment hall | Handbook; Appendix A |
| 31 | Patricia and Phillip Frost Art Museum | F | Free admission; cultural resource for South Florida | Handbook |
| 32 | Herbert and Nicole Wertheim Performing Arts Center (WPAC) | F | Premier performing arts venue since 1996 | Handbook |
| 33 | **End: back to the roundabout and PG1/PG2 loop.** Closing card | F | Admissions snapshot, R1 status, social mobility, recognition of support, thank you | Handbook |

### Off-route buildings

| Building | Phase |
|---|---|
| Stephen and Dorothea Green Library | **MVP:** clickable "Also on campus" marker with a full card, not in the driving sequence |
| Helen and Jacob Shaham Academic Medical Center (under construction, opens 2028) | Later phase |
| Ronald W. Reagan Presidential House | Later phase |
| Deuxième Maison | Later phase (mentioned on the Charles E. Perry card in the MVP) |
| Other important campus buildings | Later phase: all important buildings clickable |

### Content rewrite needed for the donor audience

The handbook is written for ambassadors, and some sections are student-logistics heavy (game room, meal plans, room layouts). For each card we will:

- Lead with impact and outcomes, then add one or two vivid facts.
- Add an "Impact of support" line naming the donors, partners or gifts behind the space where known (for example Green, Wertheim, Frost, Cejas, Bell, Ziff, Ryder, Ocean Bank, Tano Simulation Center).
- Use the official FIU web content gathered in Appendix A for stops the handbook doesn't cover, and have the Foundation approve it.
- Replace vague claims with verified numbers. The Ranking and Admissions pages currently say "ranked among the top public universities" without figures; the Foundation should supply current rankings and stats.

## 6. Technical approach (decided 2026-11-19)

Kept deliberately simple so a small student team can maintain it. **No backend and no database in the MVP.**

| Area | Choice | Notes |
|---|---|---|
| Framework | React + TypeScript on Vite | Static single-page app |
| Map | Mapbox GL JS with Mapbox satellite imagery | Smooth pan, zoom and camera animation for Tour Mode |
| Mapbox token | Public token in `VITE_MAPBOX_TOKEN`: `.env.local` locally (gitignored), Vercel environment variables in production | Never committed. Restrict the token by URL in the Mapbox dashboard. `.env.example` documents the variable. |
| Route | `content/route.geojson` LineString traced along campus roads | Drives the animated vehicle marker |
| Content | `content/stops.json` and `content/tour.json` in the repo | Editable by non-developers; schema in `.claude/CLAUDE.md` |
| Text-to-speech | Web Speech API (`speechSynthesis`) | Free, no keys, built into browsers |
| Hosting | Vercel | Deploys from the repo; preview deployments for review |
| Later (not MVP) | Supabase | Possible for ambassador logins, saved custom donor routes and ambassador notes |
| Analytics (optional) | Privacy-friendly page and tour-completion counts | No personal data |

## 7. Phases

### Phase 1: MVP

1. Set up the Mapbox account and URL-restricted public token, and confirm Mapbox satellite terms (attribution) for this use.
2. Trace the driving route from `reference/aerial-route.png` and plot all stop coordinates.
3. Write donor-focused card text for every route stop, Green Library, Welcome and Closing, using the handbook and Appendix A.
4. Build the FIU-themed interface: map, markers (featured, quick pass, under construction, also on campus), stop list and cards.
5. Build Tour Mode: animated route, Web Speech narration, virtual and ride-along modes, skip stop.
6. Accessibility and device testing (iPad Safari first, including in a moving vehicle).
7. Deploy and share a link with the Foundation for review.

**MVP is done when:** every stop on the driving route plus Green Library is clickable and shows its card, Bell Chapel is clearly marked as under construction and still shows its information, and a user can play the full tour from Welcome to Closing with narration, skipping any stop.

### Phase 2: Polish and tailoring (post-MVP)

- **Custom donor tours:** Foundation staff or ambassadors choose featured stops ahead of time based on a donor's interests (for example health sciences, athletics, arts), save it, and share a link. This matches how tours are run today and is the top post-MVP priority.
- **All important campus buildings clickable,** including Shaham Academic Medical Center (under construction), Reagan Presidential House, Deuxième Maison, and others off the route.
- **GPS ride-along:** during a live drive, the next card opens automatically as the vehicle approaches each building (uses the device location, with permission).
- Building photos, construction renderings, and short video or 360° images per stop.
- Pre-recorded or pre-generated high-quality narration audio (consistent voice across devices; could be a real ambassador's voice).
- Spanish narration and cards.
- "Your impact" closing card with a giving link to the FIU Foundation.

### Phase 3 (optional, undecided): Generative AI assistant

Chris is still deciding whether to include generative AI. Options to evaluate:

- **Ask-a-question assistant** grounded only in the approved handbook content, so guests can ask follow-ups during a virtual tour.
- **Personalized tour suggestions** that propose featured stops from a donor's stated interests (builds on Phase 2 custom tours).
- **AI-generated natural voices** for narration (this overlaps with Phase 2 pre-recorded audio).

Considerations before committing:

- **Accuracy and reputation:** answers to donors must be correct. Any assistant should be restricted to approved content and say "I'll connect you with someone" when it doesn't know, matching the handbook's guidance.
- **Cost and keys:** requires a server or serverless function (for example a Vercel function) to hold API keys, which the MVP deliberately avoids.
- **Privacy:** no donor personal information should be sent to a third-party model.
- **Approval:** FIU and Foundation policy on AI use in donor-facing materials.

A sensible middle ground is to use AI only behind the scenes (drafting card copy or generating narration audio that a person reviews), with nothing generated live in front of guests.

## 8. Decisions made

| Decision | Answer (2026-11-19) |
|---|---|
| Route type and order | Driving route, as listed in section 5 and traced in `reference/aerial-route.png` |
| Bell Chapel | On the route between Graham Center and AHC 1; a quick pass that is sometimes skipped. Located a little behind the Reagan Presidential House, near the lake |
| Route reading of the aerial | Confirmed: the SW 14th St spur is the drive to Charles E. Perry and the U-turn behind MARC; the top-middle loop is the drive through Lot 9; Ocean Bank, WRC and the Intramural Fields are seen from the road |
| Lot 9 | The parking lot between the Intramural Fields, College of Business Complex and Rafael Díaz-Balart Hall |
| Under-construction buildings | Shown as under construction, with full information still available |
| Tailored tours | Ambassadors highlight buildings based on each donor's interests; not every building is discussed on every tour |
| Off-route buildings | Green Library is clickable in the MVP; all other important buildings become clickable in a later phase |
| Content for stops not in the handbook | Taken from official FIU websites (Appendix A) |
| ZEB | Sanford L. Ziff Family Education Building |
| Map style | Satellite imagery, with an FIU-colored, very user-friendly interface |

## 9. Open questions for Chris

1. **Featured vs quick pass:** Is the first guess in section 5 right?
2. **Primary device:** Will ambassadors mostly hold an iPad in the vehicle, or will guests use their own phones?
3. **Branding:** Do we have permission and assets to use FIU and FIU Foundation logos, colors and fonts? Who at the Foundation approves content?
4. **Stats:** Can the Foundation provide current, citable rankings and admissions numbers for the Closing card?
5. **Donor recognition:** Are there naming or recognition guidelines for how donors are mentioned on cards?
6. **Generative AI:** Include it as Phase 3, use it only behind the scenes, or leave it out?

## 10. Risks

| Risk | Mitigation |
|---|---|
| Stale or inaccurate facts in front of donors | Single content file, a named content approver, a "last reviewed" date and source link per stop |
| Official FIU sources disagree with each other (see Appendix A) | Use the most recent source and have the Foundation confirm numbers before launch |
| Mapbox usage limits, token leaks or outdated imagery (construction sites may look different) | URL-restricted public token kept in env vars only; monitor usage on the free tier; construction renderings on cards |
| Labels hard to read over satellite imagery | Solid label chips, high-contrast FIU blue and gold markers, tested outdoors in sunlight |
| Narration out of sync with the moving vehicle | Ride-along mode defaults to manual Next; short cards; quick-pass stops; GPS triggers in Phase 2 |
| Browser TTS voices sound robotic on some devices | Pick the best available voice automatically; Phase 2 pre-recorded audio |
| iOS Safari speech quirks (audio needs a user tap to start, may pause when locked) | Start the tour only from a button press; test on iPad early |
| Brand or trademark issues | Confirm FIU brand guidelines and approvals before public launch |

## Appendix A: Facts from official FIU websites

Gathered 2026-11-19 for stops the handbook doesn't cover. These are raw facts for writing cards, not final copy. "Facilities list" means the [FIU buildings and year occupied list](https://facilities.fiu.edu/Planning/Documents/FIU_Buildings_GSF_and_Year_Occupied_Revised_1-8-2026.pdf).

| Stop | Facts | Sources |
|---|---|---|
| Sanford L. Ziff Family Education Building (ZEB) | 57,456 sq ft; opened 1997. FIU pages found don't describe what it houses. **Needs content.** | Facilities list; [calendar.fiu.edu/zeb](https://calendar.fiu.edu/zeb) |
| Ryder Business Building (RB) | College of Business building; 58,782 sq ft; opened 1991. The business school's site calls it "Ryder Center." | Facilities list; [business.fiu.edu locations](https://business.fiu.edu/about/locations/) |
| MANGO (Management and New Growth Opportunities) | Opened 2014; about 113,000 sq ft; $35.7M; houses College of Business and FIU Online classrooms; ground-floor food court | Facilities list; [FIU News, 2014](https://news.fiu.edu/2014/04/building-boom-at-fiu/76513) |
| College of Business Complex (CBC) | 103,000 sq ft; opened 2007 (plus handbook content) | Facilities list |
| Intramural Fields (Recreation Field) | Artificial turf, sized to an official NCAA soccer field; hosts all outdoor intramural and sport club practices and home games | [Wellness and Recreation courts and fields](https://dasa.fiu.edu/all-departments/wellness-recreation-centers/programs/reservations/courts-fields/) |
| Lot 9 | No FIU page found. Per Chris: the parking lot between the Intramural Fields, CBC and the College of Law. Suggest a one-line mention tied to CBC | Chris |
| Parkview Hall, Honors College (PVH) | Opened 2013; two 6-story buildings joined by a sky bridge; 596 residents; glassed common room overlooking the stadium. (A 2014 article says 620 beds and $55M.) | [Housing: Parkview](https://housing.fiu.edu/choose-your-room/honors-college-parkview-hall/); FIU News 2014 |
| University Towers (UT) | Opened 2000; 10 floors; 482 residents, mainly second-year students | [Housing: choose your room](https://housing.fiu.edu/choose-your-room/); facilities list |
| Lakeview Hall North and South (LH) | Opened 2006; 800 residents; home of the BizLife business-themed community | [Housing: Lakeview Village](https://housing.fiu.edu/choose-your-room/lakeview-village/index.html); facilities list |
| Tamiami Hall | Opened 2022; 13 floors; 676 residents; 11201 SW 17th St | [Housing: Tamiami Hall](https://housing.fiu.edu/choose-your-room/tamiami-hall/); facilities list |
| SASC | Opened 2016; 94,476 sq ft | Facilities list |
| Paul L. Cejas School of Architecture (PCA) | Opened 2003; 124,870 sq ft | Facilities list |
| Innovation 1 | Opened 2025; 137,306 sq ft; 800 SW 107th Ave | Facilities list |
