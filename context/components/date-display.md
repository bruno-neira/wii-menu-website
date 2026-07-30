# Wii Menu — Date Display (component deep-dive)

**Status: contradiction RESOLVED.** The date **is** displayed on the main Wii Menu home
screen, as a **separate element from the clock**. `context/clock.md` §3 is **wrong** and its
recommendation ("show time-only on the main menu (no date chip)") should be **reversed**.
`context/component-inventory.md` item 11 was **correct**, and its official-manual finding is
independently reconfirmed below across **three** separate Nintendo manual editions
(two US, one UK/PAL).

Sourcing tags: **[Official]** = Nintendo-authored primary document. **[Screenshot]** =
direct pixel measurement of a real capture (this repo's `reference_screen.png`, plus the
screenshot catalogue in `context/pinterest-board.md`). **[Fan/community]** = wikis, forums.
**[Inferred]** = my reasoning from the above, not directly stated by any source.

---

## 1. Does the date appear on the main Wii Menu? — **Yes. Settled.**

### 1a. Official evidence (three independent manual editions)

Nintendo's printed **Wii Operations Manual — Channels and Settings** contains an annotated
diagram of the Wii Menu home screen. In **every English edition I could obtain**, that
diagram carries **two distinct callout labels**, `Current Time` **and** `Current Date`,
alongside the callouts for the other home-screen elements:

| Edition | Model code / region | `Current Time` | `Current Date` | Source |
|---|---|---|---|---|
| Channels & Settings (RVK, Wii Family Edition era) | `MAB-RVK-S-USZ-CO` — **USA/Canada** | line 241 | lines 270–271 (`Current` / `Date`) | [archive.org `wii-opmanual-chset` → `WiiRVKChEng_djvu.txt`](https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt) |
| Channels & Settings (RVL, © 2009) | `RVL-S-GL-USZ` — **USA/Canada** | line 169 | lines 198–199 | [archive.org `wii-ch-eng` → `WiiChEng_djvu.txt`](https://archive.org/download/wii-ch-eng/WiiChEng_djvu.txt) |
| Channels & Settings (RVK, UKV) | `Wii_Channel_RVK_MAN_UKV-1_08_0` — **UK / PAL** | line 326 | line 352 | [archive.org `nintendo-dsi-complete-manual` → `Wii_Channels_Settings_RVK_MAN_UK_NFRP_djvu.txt`](https://archive.org/download/nintendo-dsi-complete-manual/Wii_Channels_Settings_RVK_MAN_UK_NFRP_djvu.txt) |

**[Official]** Verbatim from the US RVK manual's "Using the Wii Menu" diagram, in OCR reading
order (I pulled the raw OCR and read the section directly rather than relying on a summary):

```
Current Time

Wii Settings and Data Management
Change console settings or organize the contents of an SD Card (see page 40).

SD Card Menu
Open the SD Card Menu (see page 66).

Wii Channels
Play a Wii Game Disc, ...
The Wii Menu can have up to 48 Channels at one time. If you have more Channels than
can be shown on the screen at one time, these can be accessed by selecting the blue
scroll arrows.

Current
Date

Wii Message Board
Open the Wii Message Board (see page 30).
- Blinks when you have received a message.
```

The UK/PAL manual has the same two callouts with a slightly different callout ordering
(`Current Time` appears after the Message Board block, `Current Date` immediately before
`SD Card Menu`), reflecting a re-laid-out diagram — but both labels are present.

### 1b. Screenshot evidence — decisive and independent

**[Screenshot]** This repo's `/Users/brunoneira/orchids-projects/wiimenu-website/reference_screen.png`
(420×236, 16:9) shows, dead centre at the bottom of the screen:

```
        12:00 AM        ← above the cyan divider, on the light panel
   ─────────────────    ← cyan curved divider (#47BCE5)
         Fri 1/1        ← below the divider, on the grey bottom bar
```

**[Screenshot]** `context/pinterest-board.md` independently catalogues **five more** real Wii
Menu captures with the same construction: `11:36 PM Mon 8/10`, `12:00 AM Fri 1/1`,
`1:14 PM Sat 1/29`, `9:49 AM Fri 7/21`, `6:18 AM Wed 3/25`.

**[Inferred] Sanity check that these are real, not mocked-up:** every day-of-week matches a
real calendar date — Jan 1 was a Friday in 2010/2016/2021; Mar 25 a Wednesday in
2009/2015/2020; Aug 10 a Monday in 2009/2015/2020; Jul 21 a Friday in 2017/2023; Jan 29 a
Saturday in 2011/2022. The weekday is genuinely computed from the system date.

### 1c. Corroborating secondary sources

- **[Fan/community]** Wikipedia, *Wii system software*: *"It has four pages, each with a 4x3
  grid, and each displaying the current time and date."*
  <https://en.wikipedia.org/wiki/Wii_system_software>
- **[Fan/community]** `context/system-ui.md` §2 already reached the same conclusion
  independently.

### 1d. Why `clock.md` got it wrong — two traps to avoid re-stepping into

1. **The forum quote was misread.** `clock.md` §3 leans on a paraphrased GBAtemp comment —
   *"they couldn't have put it beside the date, or in the corner?"* — read as "the date is
   absent." Read against the actual screenshot, the complaint parses the other way: the
   commenter is annoyed the clock **isn't beside the date** (it's above it, split across the
   divider line) and isn't tucked in a corner. It's a **layout** gripe, not an
   absence claim. This is the entire evidentiary basis for `clock.md`'s conclusion and it
   does not survive contact with the screenshot.

2. **A naive OCR grep produces a false negative.** In the two **US** manuals the Wii Menu
   callout is line-wrapped as `Current` / `Date` on separate lines, so
   `grep -i "current date"` **misses it** — and instead hits an unrelated
   `Current date` callout at US-RVK line 2252, which belongs to the **Message Board
   Create Message / Calendar screen**, a completely different screen:

   ```
   Calendar
   Select the Calendar icon to open the Calendar. ...
   Current date
   Open the Wii Message Board for a particular date.
   ```

   Anyone re-verifying this must read the "Using the Wii Menu" section (≈lines 200–300 in
   `WiiRVKChEng_djvu.txt`) directly, not grep. **Do not conflate these two callouts.**

3. **`clock.md`'s "MM/DD" citation is misattributed.** It cites
   <https://www.mariowiki.com/Wii_Menu> as tangential evidence "from a Wii-menu-styled tech
   demo on 3DS." That page is actually about **a microgame in *WarioWare Gold*** (3DS) —
   its opening line is *"This article is about the microgame in WarioWare Gold."* See §3c;
   the conclusion it supports happens to be right, but the provenance in `clock.md` is wrong.

---

## 2. Exact format

**[Screenshot]** Rendering the reference screenshot's date row as a pixel map (dark pixels
only, `y=202..214`) shows unambiguously typographic glyphs:

```
 F      r     i        1       /      1
.#######.........##...........###.......##.....##.
.########........##..........####.......##....###.
.#######.........##.........#####.......##..#####.
.##.........................#####......##...#####.
.##.......#####..##.........#.###......##.....###.
.###......#####..##...........###.....###.....###.
.#######..###....##...........###.....##......###.
.#######..##.....##...........###.....##......###.
.##.......##.....##...........###....##.......###.
.##.......##.....##...........###....##.......###.
.##.......##.....##...........###....##.......###.
.##.......##.....##...........###...##........###.
.##.......##.....##............#....##.........##.
```

### Format specification (NTSC-U / English)

| Property | Value | Tag |
|---|---|---|
| Overall pattern | `DDD M/D` | [Screenshot] |
| Day-of-week | **3-letter abbreviation**, Title Case (`Fri`, `Mon`, `Thu`, `Wed`, `Sat`) | [Screenshot] |
| Separator, day↔date | **single space** (≈6px at 420px width ≈ 1.4% of screen width) | [Screenshot] |
| Month/day order | **Month first** (`M/D`) | [Screenshot] |
| Date separator | **forward slash `/`**, no spaces around it | [Screenshot] |
| Leading zeros — month | **None.** `1/1`, `3/25`, `7/21`, `8/10`, `1/29` — never `01/…` | [Screenshot] |
| Leading zeros — day | **None.** `1/1`, not `1/01` | [Screenshot] |
| **Year** | **Never shown** on the menu | [Screenshot] |
| Trailing punctuation | None | [Screenshot] |

**Proof of M/D (not D/M) for NTSC-U:** the catalogued capture `Wed 3/25` — `25` cannot be a
month, so the first field is the month. Independently, `8/10` is paired with `Mon`, and
Aug 10 was a Monday in 2009/2015/2020 whereas Oct 8 was not. **[Inferred]**

**Contrast with the Settings screen (do not copy this format to the menu):**
**[Official]** the Calendar → Date Setting screen in the US manual is illustrated as
`01/01/2009` — **MM/DD/YYYY with leading zeros and a year**. The on-menu readout is a
*different, shorter* format. Same manual, US RVK, Calendar section:
> *"Change the date by pointing at the up/down arrow that corresponds to the year, month,
> or day, then pressing A until you see the correct number."*

**Related clock-format corrections** (belongs to `clock.md`, but resolved here because the
same evidence settles it):

- **[Screenshot] The NTSC-U menu clock is 12-hour and DOES show an AM/PM suffix.** The
  reference screenshot reads `12:00 AM`; the Pinterest catalogue adds `11:36 PM`, `1:14 PM`,
  `9:49 AM`, `6:18 AM`. `clock.md` §2's advice to render "no AM/PM suffix" is **wrong for
  NTSC-U** and should be corrected.
- **[Screenshot]** Hours have **no leading zero** (`1:14 PM`, `6:18 AM`); minutes are always
  two digits. No seconds. Confirms `clock.md` on seconds.
- **[Official]** The manual's *"NOTE: The Wii console uses a 24 hour clock. For example,
  1:00 pm is displayed as 13:00."* appears in **both** the US (line 2955) **and** UK
  (line 2933) manuals, and in both it sits inside the **Calendar → Time Setting** section —
  it describes the **settings input screen**, not the menu readout. `clock.md` §2 already
  drew this distinction correctly; the screenshot now confirms the menu genuinely differs.

---

## 3. Regional / locale variation

### 3a. Does the date appear in PAL? — **Yes** [Official]
The UK/PAL Channels & Settings manual (`Wii_Channel_RVK_MAN_UKV-1_08_0`) carries the same
two `Current Time` / `Current Date` callouts on its Wii Menu diagram (lines 326 and 352).
The date is not an Americas-only feature.

### 3b. Time format by region
**[Fan/community]** Per `clock.md` §2 and community reports: **12-hour + AM/PM in the
Americas (NTSC-U), 24-hour in Europe (PAL)**. The NTSC-U half is now **[Screenshot]-confirmed**
(see §2). The PAL 24-hour half remains fan-sourced — **I could not obtain a PAL Wii Menu
screenshot in this pass.**

### 3c. Date *order* by region — **the weakest link in this doc**

**[Fan/community]** The only direct statement I found comes from Super Mario Wiki's page on
the **WarioWare Gold** microgame that recreates the Wii Menu — i.e. a *Nintendo-authored
recreation of Nintendo's own UI*, which makes it better-than-average fan evidence but still
not the console itself:

> *"The clock under the channel list shows the system time of the Nintendo 3DS, as what an
> actual Wii with system update 3.0 and higher does. The time format reflects the system
> region (12-hour for The Americas, 24-hour for Europe), but the date format in the English
> version will always be MM/DD."*

and, as a gallery caption:

> *"The PAL version showing the 24-hour clock format, though the date format remains that of
> the NA version"*

<https://www.mariowiki.com/Wii_Menu>

**[Inferred] Net reading:** PAL switches the **time** to 24-hour but keeps the **date** in
**M/D** order — i.e. Nintendo localised the clock but not the date ordering, at least in
English. This is counter-intuitive for a European product and rests on a single fan-wiki
page about a *different* piece of software, so treat it as **low confidence**.

### 3d. Japan / Korea — **unknown, flagged**
**No evidence found in this pass.** The only Japanese Nintendo manual I located on Internet
Archive (`nintendo-dsi-complete-manual` → `Japanese Wii manual.pdf`) is the **System Setup
(準備編)** volume, which contains no Wii Menu diagram. A Japanese *Channels & Settings*
volume was not found. Japanese convention would suggest `M/D` with a kanji day-of-week
(e.g. `金` for Friday) and possibly `YYYY/M/D`, but **this is pure speculation and should not
be implemented as fact.** Korea likewise unresearched.

**Practical recommendation:** ship **`DDD M/D`** as the single format. If a locale toggle is
ever added, change the **time** (12h↔24h) and leave the date order alone unless better
evidence surfaces.

---

## 4. Placement

All measurements are my own, taken from `reference_screen.png` (420×236, 16:9) via pixel
analysis, and expressed as **percentages of screen width/height** so they scale. **[Screenshot]**

### 4a. Vertical stack

```
 y = 72.5%  ┌ bottom bar's top edge AT THE SCREEN EDGES (y=171px)
            │   ...the edge curves DOWNWARD toward the centre...
 y = 73.3%  │  ┌ clock digit cap-top          (y=173px)
 y = 80.1%  │  └ clock digit baseline         (y=189px)
 y = 83.1%  ├──── CYAN DIVIDER, centre trough (y=196px)  #47BCE5
 y = 85.6%  │  ┌ date cap-top                 (y=202px)
 y = 90.7%  │  └ date baseline                (y=214px)
 y = 100%   └ bottom of screen
```

**The single most important structural fact: the clock and the date sit on *opposite sides*
of the cyan divider line.** The clock is **above** it on the light panel (`#EDEDED`); the
date is **below** it on the grey bottom bar (`#C5C6CD`).

### 4b. The divider is a curve, and the clock sits in its trough

Traced cyan-line y-position across the screen width:

| x (px / %) | 0 / 0% | 60 / 14% | 100 / 24% | 140 / 33% | 200 / 48% | 260 / 62% | 320 / 76% | 380 / 90% |
|---|---|---|---|---|---|---|---|---|
| divider y (px) | 171 | 171 | 181 | 195 | **196** | **196** | 180 | 171 |

The bottom bar's top edge is **flat and high at the left/right ends** (where the Wii button
and Message Board button live) and **scoops down ~25px (10.6% of screen height) in the
middle**. That scoop is what creates room for the clock. Flat trough spans roughly
x = 35%–67%; the shoulders ramp between x ≈ 15%–35% and x ≈ 67%–86%.

### 4c. Horizontal

| Element | Ink extent (px) | As % of width | Centre |
|---|---|---|---|
| Clock digits `12:00` (advance box) | ≈180 → 241 | 42.9% → 57.4% | **50.1%** |
| `AM` suffix | 249 → 261 | 59.3% → 62.1% | — |
| Date `Fri 1/1` (advance box) | ≈184 → 234 | 43.8% → 55.7% | **49.8%** |

Both readouts are **horizontally centred on the screen's midline**, one directly above the
other, straddling the divider.

**[Inferred, single-sample]** In the reference screenshot the **numeric time block alone**
(`12:00`) is what's centred on the midline — the `AM` suffix hangs off to the **right**
without being included in the centring calculation. With only one screenshot measured I
cannot rule out that the whole `12:00 AM` string is centred and the coincidence is
accidental; verify against a second capture before hard-coding it. The **date** centring is
unambiguous.

### 4d. Relative to the channel grid
The date is **outside** the 4×3 channel grid entirely — it is persistent screen chrome on
the bottom bar, not a grid cell, and does not move when paging between the menu's 4 pages.
It sits below the grid and below the clock. **[Inferred from screenshot + `clock.md` §1]**

---

## 5. Typography & styling

### 5a. The date and the clock use **different typefaces** — this is the headline finding

**[Screenshot]** Compare the numeral `1` in each:

| | Clock (`12:00`) | Date (`Fri 1/1`) |
|---|---|---|
| Glyph `1` | a **bare vertical bar**, no flag, no foot | a **proper typographic `1`** with an angled top flag and a stem |
| Glyph `2` | built from **discrete segments**: top bar (y173–174) → upper-right vertical (175–179) → **middle bar with visible gaps** (180–181) → lower-left vertical (182–186) → bottom bar (187–189) | n/a |
| Glyph `0` | a rectangular ring with **visible breaks between segments** | n/a |
| Verdict | **seven-segment / LCD-style digital face** | **standard rounded system sans** |

The clock is a bespoke seven-segment "digital clock" face with visible inter-segment gaps.
The date is set in the ordinary Wii system UI typeface — **Rodin NTLG / FOT-RodinNTLG**
(Fontworks), per `clock.md` §6's font research. **[Fan/community]** for the font *name*;
**[Screenshot]** for the fact that the two elements are typographically distinct.

**Implementation note:** do **not** reuse the clock's font for the date. A generic rounded
humanist sans (Rodin substitute) is correct for the date; the clock needs a segmented face.
`clock.md` §6 notes a homebrew developer found **no** off-the-shelf font matched Nintendo's
clock rendering — that difficulty applies to the clock only, not the date.

### 5b. Size

| Metric | Clock digits | Date | `AM` suffix |
|---|---|---|---|
| Ink height (px @ 420-wide) | 17 | 13 (cap height) | 7 |
| As % of screen height | 7.2% | **5.5%** | 3.0% |
| Ratio vs. clock digits | 1.00 | **0.76** | 0.41 |
| Approx. at native 480-line output | ≈35px | ≈26px | ≈14px |
| Stroke weight | 2px | 2px | 1–2px |

**The date is ~76% the height of the clock digits** — noticeably smaller, subordinate.
Clock digit pitch is 14px = **3.33% of screen width** (monospaced advance); the date's font
is proportional, not monospaced.

### 5c. Colour

| Element | Fill | Background it sits on | Note |
|---|---|---|---|
| Clock digits + `AM` | **`#9B9B9B`** (flat) | `#EDEDED` light panel | very low contrast — deliberately "faint LCD" |
| Date text | **`#747476` at cap-top → `#7D7D7E` at baseline** (subtle top-to-bottom gradient) | bottom bar, `#C5C6CD` at the date's row | slightly **darker** and higher-contrast than the clock |
| Divider line | **`#47BCE5`** (cyan), ~1–2px | — | separates the two |
| Bottom bar | vertical gradient, **`#B3B5BB` at its top → `#CFD1D8` lower down** | — | date sits on the lighter part |

Both readouts are **neutral grey — not white, not blue.** The date is the *darker* of the
two despite being smaller.

### 5d. Drop shadow — **contradicts `clock.md` §6**

**[Screenshot]** I sampled vertical and horizontal slices through the glyph stems of both
elements. Backgrounds are uniform on all sides of both:

- Clock stem at `x=185`: background `#EEEEEE`/`#F3F3F3` above (y170–171), `#F0F0F0`/`#EFEFEF`
  below (y190–191). Ink is a flat `#9B9B9B`. The only asymmetry is the antialiased edge —
  top edge `#D1D1D1`, bottom edge `#C7C7C7` — a ≤1px hint of a downward shadow at most.
- Date stem at `x=186`: background left (`x=184`) is `#C9CAD1`, identical to the far
  background; right (`x=187`) is `#C2C3C9`, a marginal darkening. Above/below the glyph the
  gradient is the **bottom bar's own** top-to-bottom gradient, not a text shadow.

**Conclusion [Inferred]:** at this capture resolution there is **no prominent drop shadow**
on either the date or the clock. `clock.md` §6 asserts a "non-removable drop shadow behind
the digits" sourced to a GBAtemp **USBLoaderGX theme** thread — that almost certainly
describes **USBLoaderGX's own** clock rendering (the `88:88` placeholder is a theming
artifact of that loader), **not** the Wii System Menu's. Render the date as **flat grey text
with no shadow**; if any shadow is added for polish, keep it to ≤1px, ~10% opacity,
straight down.

*Caveat:* the reference screenshot is 420px wide and downscaled from a ≥480-line source, so
a sub-pixel shadow could have been averaged away. Confidence: moderate-high, not absolute.

---

## 6. One widget with the clock, or separate? — **Separate. Confidently.**

Five independent lines of evidence, all pointing the same way:

1. **[Official]** Nintendo's own manual diagram gives them **two distinct callout labels**
   (`Current Time`, `Current Date`) in three separate editions — Nintendo itself treats them
   as two elements. In the US editions they are not even adjacent in the callout ordering
   (`Current Time` is first; `Current Date` comes after the `Wii Channels` block).
2. **[Screenshot]** They are **physically separated by the cyan divider line** — one above
   the bar's top edge, one on the bar.
3. **[Screenshot]** **Different typefaces** (seven-segment vs. proportional sans) — §5a.
4. **[Screenshot]** **Different sizes** (0.76×) and **different colours** (`#9B9B9B` vs.
   `#747476`) on **different backgrounds**.
5. **[Screenshot]** Different centring behaviour — the `AM` suffix belongs to the clock and
   breaks the clock's symmetry; the date is cleanly centred.

**Implementation guidance:** build these as **two independent React components**
(`<MenuClock />` and `<MenuDate />`), each absolutely positioned, **not** one
`<DateTimeWidget />`. They share only a time source. A shared `useSystemTime()` hook feeding
both is the right factoring.

---

## 7. Interaction — **decorative, not clickable**

- **[Official]** In the manual's Wii Menu callout list, **every interactive element gets a
  described action** — "Change console settings or organize the contents of an SD Card",
  "Open the SD Card Menu", "Play a Wii Game Disc…", "Open the Wii Message Board". The
  `Current Time` and `Current Date` callouts are **bare labels with no body text and no
  described action whatsoever.** Nintendo documented what every clickable thing does and
  said nothing about these two. **[Inferred]** This is a strong structural argument that they
  are passive readouts.
- **[Official]** The documented route to the date is always a menu traversal —
  Wii button → Wii Settings → **Calendar** → **Date** / **Time**. UK manual:
  *"You can change your Wii console's Calendar settings by selecting the DATE or TIME
  options."* No source anywhere describes clicking the on-menu date.
- **[Fan/community]** `clock.md` §4 reached the same negative finding for the clock; the
  same reasoning applies to the date, which is if anything *less* prominent.

**Verdict [Inferred, high confidence]:** purely decorative. No hover state, no cursor change,
no click target. If the project wants clicking the date to open a settings screen, that is a
**deliberate enhancement**, not fidelity — and it should probably match whatever the clock
does, since the two read as a unit to users even though they're separate elements.

---

## 8. Version history

- **[Fan/community]** WiiBrew's System Menu changelog lists **"Clock display."** under
  **System Menu 3.0** (Japan 224 / USA 225 / PAL 226, released **6 August 2007**) — and
  under **no other version**. The alternate WiiBrew 3.0 page phrases it as
  *"The current time will now be displayed in the Wii Menu."*
  <https://wiibrew.org/wiki/System_Menu>, <https://wiibrew.org/wiki/3.0>
- **[Fan/community]** System Menu **1.0** (launch, Nov/Dec 2006) had no clock.
  <https://wiibrew.org/wiki/System_Menu_1.0> — note this page has **no screenshot**, so it
  cannot be used to visually confirm the date's absence either.
- **[Inferred]** The date almost certainly **arrived together with the clock in 3.0**, as one
  feature:
  - No System Menu changelog entry, in any version 1.0→4.3, separately mentions a date.
  - The scooped divider trough that houses both is a single piece of layout — adding a date
    to it later, without a changelog note, is implausible.
  - Every Channels & Settings manual scan I found is **2009 or later** (post-3.0), and all
    carry both callouts.
- **Remaining uncertainty, flagged:** I **could not obtain a pre-3.0 (2006-era) Channels &
  Settings manual** to confirm the callouts were *absent* before 3.0, and could not find a
  dated 1.x/2.x menu screenshot. The "added in 3.0" claim is inference from absence of
  contrary evidence, not positive confirmation. All the manuals I did find are System Setup
  volumes, which defer Wii Menu content to the Channels volume and contain no diagram.
- **[Inferred]** No source documents any redesign of the date readout between 3.0 and 4.3.
  Treat its appearance as stable across that span.

**Implication:** if the project ever models a specific System Menu version, render the date
only for **3.0 and later**, in lockstep with the clock.

---

## 9. Implementation spec (condensed)

```
Content:   `${dayAbbrev} ${month}/${day}`     // "Fri 1/1"
           dayAbbrev ∈ Sun Mon Tue Wed Thu Fri Sat
           month, day: NO leading zeros.  Year: NEVER shown.

Position:  horizontally centred on screen midline (50%)
           cap-top    at 85.6% of screen height
           baseline   at 90.7% of screen height
           i.e. below the cyan divider, on the bottom bar

Type:      Rodin NTLG (or a rounded humanist sans substitute)
           cap height 5.5% of screen height  (= 0.76 × clock digit height)
           proportional spacing, regular weight, stroke ≈2px @420w

Colour:    #747476 → #7D7D7E, subtle top-to-bottom gradient
           (flat #787879 is an acceptable simplification)
           on bottom-bar grey ≈#C5C6CD

Shadow:    none (≤1px / ~10% straight-down at most)

Update:    once per minute is sufficient; recompute the day-of-week on
           date rollover. No animation, no transition on change.

Component: separate from the clock. Shared time source only.
Interaction: none — pointer-events: none.
```

---

## 10. Actions required on other docs in this corpus

1. **`context/clock.md` §3 ("Date Display") — rewrite.** Its central conclusion and its
   "show time-only on the main menu (no date chip)" recommendation are **incorrect**. Also
   fix §2 (NTSC-U **does** show an AM/PM suffix), §6 (drop-shadow claim is likely a
   USBLoaderGX artifact, not the System Menu), and the misattributed
   `mariowiki.com/Wii_Menu` citation (that page is about a *WarioWare Gold* microgame).
   `context/clock.md`'s "Open Gaps" items 2 and 4 are now both closed.
2. **`context/component-inventory.md` item 11 — mark RESOLVED**, verdict "date IS shown",
   and downgrade it from "highest-priority deep-dive" to "done." Its official-manual finding
   was correct and now has two additional corroborating manual editions.
3. **`context/component-inventory.md` item 14b** — incidentally confirmed while reading the
   UK manual: *"Current page number and total number of pages"* is indeed an **SD Card Menu**
   callout only (UK manual line 544), **not** a main-Wii-Menu element. The main menu has
   `blue scroll arrows` and no documented page indicator.
4. **`context/visual-design.md`** — the cyan divider (`#47BCE5`) and the ~10.6%-deep central
   downward scoop in the bottom bar's top edge are load-bearing for this component and worth
   recording there as bottom-bar geometry.

---

## 11. Remaining uncertainty — explicit list

| Question | Status |
|---|---|
| Does the date appear on the main Wii Menu? | **SETTLED — yes.** [Official] ×3 + [Screenshot] ×6 |
| Is it separate from the clock? | **SETTLED — yes.** [Official] + [Screenshot] |
| NTSC-U format `DDD M/D`, no year, no leading zeros | **SETTLED.** [Screenshot] ×6 |
| Does PAL show a date at all? | **SETTLED — yes.** [Official] UK manual |
| PAL date *ordering* (M/D vs D/M) | **LOW CONFIDENCE.** Single fan-wiki page about *WarioWare Gold*, claiming PAL keeps M/D. No PAL Wii Menu screenshot obtained. |
| PAL 24-hour time | **[Fan/community] only.** Not screenshot-confirmed. |
| Japan / Korea format | **UNKNOWN.** No Japanese *Channels & Settings* manual found; the JP manual on Archive is the System Setup volume with no Wii Menu diagram. Do not guess. |
| Added in 3.0 alongside the clock? | **LIKELY but [Inferred].** No pre-3.0 Channels manual or dated 1.x/2.x screenshot obtained. |
| Drop shadow present? | **LIKELY NOT [Inferred]** — measured absent at 420px capture resolution; a sub-pixel shadow can't be fully excluded. |
| Is `12:00` alone centred, or `12:00 AM` as a whole? | **UNVERIFIED** — single sample. Date centring is certain; clock centring is not. |
| Exact typeface of the date | **[Fan/community]** Rodin NTLG, inherited from `clock.md`'s research; not independently verified here. |

**Method note:** WebSearch quota was exhausted during this pass and DuckDuckGo/Bing/Mojeek
all returned CAPTCHAs or empty results, so §1–§3 rest on **direct retrieval of primary
documents** (raw `curl` of Internet Archive OCR text, read in full context rather than via
summarisation) plus **first-party pixel analysis** of the repo's own screenshot. I found and
corrected at least one hallucinated detail that a summarisation-based fetch had introduced
(a claimed manual sentence about the 24-hour clock was real, but a claimed clean
`Current Date` callout list was reconstructed rather than quoted) — **read the raw OCR, not
a summary, when re-verifying any of this.**

---

## Sources

**Official (Nintendo primary documents)**
- Wii Operations Manual — Channels and Settings, `MAB-RVK-S-USZ-CO` (USA/Canada) — <https://archive.org/details/wii-opmanual-chset> · raw OCR: <https://archive.org/download/wii-opmanual-chset/WiiRVKChEng_djvu.txt>
- Wii Operations Manual — Channels and Settings, `RVL-S-GL-USZ` (USA/Canada, © 2009) — <https://archive.org/details/wii-ch-eng> · raw OCR: <https://archive.org/download/wii-ch-eng/WiiChEng_djvu.txt>
- Wii Operations Manual — Channels and Settings, `RVK_MAN_UKV` (UK / PAL) — <https://archive.org/download/nintendo-dsi-complete-manual/Wii_Channels_Settings_RVK_MAN_UK_NFRP_djvu.txt> (within <https://archive.org/details/nintendo-dsi-complete-manual>)
- Wii Operations Manual — System Setup, `MAA-RVK-S-AUS-CO` (Australia) — <https://archive.org/details/manualzilla-id-5809175> (checked; no Wii Menu diagram)
- Japanese Wii 取扱説明書 準備編 (System Setup) — <https://archive.org/download/nintendo-dsi-complete-manual/Japanese%20Wii%20manual.pdf> (checked; no Wii Menu diagram)
- Nintendo Support — How to Change the System Date and Time — <https://en-americas-support.nintendo.com/app/answers/detail/a_id/1776/>

**Screenshot / first-party measurement**
- `/Users/brunoneira/orchids-projects/wiimenu-website/reference_screen.png` (420×236) — all pixel measurements in §4 and §5
- `/Users/brunoneira/orchids-projects/wiimenu-website/context/pinterest-board.md` — catalogue of 5 additional real Wii Menu captures

**Fan / community**
- WiiBrew — System Menu (changelog) — <https://wiibrew.org/wiki/System_Menu>
- WiiBrew — 3.0 — <https://wiibrew.org/wiki/3.0>
- WiiBrew — System Menu 1.0 — <https://wiibrew.org/wiki/System_Menu_1.0>
- Wikipedia — Wii system software — <https://en.wikipedia.org/wiki/Wii_system_software>
- Super Mario Wiki — Wii Menu (**the *WarioWare Gold* microgame**, not the console) — <https://www.mariowiki.com/Wii_Menu>
- GBAtemp — Time on wii menu — <https://gbatemp.net/threads/time-on-wii-menu.133294/>
- GBAtemp — Accurate Wii Menu USBLoaderGX Theme — <https://gbatemp.net/threads/accurate-wii-menu-usbloadergx-theme.665889/>
