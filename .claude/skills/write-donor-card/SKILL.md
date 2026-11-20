---
name: write-donor-card
description: Write or rewrite FIU tour stop cards and narration for donors and VIPs, in the FIU Foundation's voice, from handbook or fiu.edu facts.
---

# Write a donor-facing stop card

The readers are donors, VIPs, alumni and community partners on an FIU Foundation tour. They want to know why a place matters and what support makes possible there.

## Structure

| Field | Guidance |
|---|---|
| `summary` | One sentence. What the place is and why it matters. No jargon. |
| `highlights` | 3 to 4 short facts, each under 15 words. Lead with outcomes, scale, firsts and distinctions. |
| `impact` | One sentence on philanthropy or partnership: the named donors, gifts, partners or donor-funded programs connected to the space. If none is sourced, describe what support enables there, without naming anyone. |
| `stat` | One striking, sourced number with a short label. |
| `narration` | Only if the spoken version should differ. Featured: 40 to 90 words (20 to 40 seconds). Quick pass: 35 words or fewer. |

## Voice

- Professional, warm and confident. Write as a proud current student speaking to a guest.
- Tie stops back to the three tour themes: student success and academic excellence; research, innovation and community impact; FIU's growth and transformation.
- Leave out student logistics (meal plans, room layouts, game rooms) unless they show impact.
- Use full donor names as they appear on the building (for example "Herbert and Nicole Wertheim").
- Spell out numbers for speech when it helps ("more than three and a half million visits"), in `narration` only.
- Write for the ear: short sentences, no parentheses, no abbreviations a listener won't know (say "the Academic Health Center", not "AHC").

## Accuracy

- Every number, date and name must come from the handbook or an official fiu.edu page, listed in `sources`.
- When sources disagree, use the most recent one and flag it for Foundation review.
- Never guess at rankings or gift amounts.

## Example (featured)

```json
{
  "summary": "The Graham Center is the heart of student life at FIU, with more than 3.5 million visits a year.",
  "highlights": [
    "Home to Student Government and hundreds of student organizations",
    "Center for Leadership and Service runs leadership and service programs",
    "Disability Resource Center supports more than 3,500 students a year"
  ],
  "impact": "Donor-funded leadership programs and scholarships help students grow beyond the classroom.",
  "stat": { "value": "3.5M+", "label": "visits a year" }
}
```
