# Transient, Conditional & Easily-Overlooked UI States — Wii Menu

**Scope:** UI that only appears *sometimes*, and is therefore systematically absent from the
static screenshots that most of this project's existing research was built from. This doc
deliberately does not re-derive anything already covered in `context/visual-design.md`,
`context/animations-interactions.md`, `context/system-ui.md`, `context/clock.md`,
`context/channels.md` or `context/component-inventory.md`.

**Sourcing tags:** **[Official]** = Nintendo-authored (consumer manual, developer spec,
Nintendo support page). **[Fan/community]** = wikis, forums, fan reverse-engineering.
**[Inferred]** = my reasoning from the above, not directly stated anywhere.

## Two new primary sources found in this pass

Both are first-party Nintendo documents and are the backbone of everything below.

1. **Nintendo, "Icon and Banner Specifications" v1.0.0**, doc ID `RVL-06-0166-001-L`,
   released 2008-02-26, marked CONFIDENTIAL. Leaked developer spec, full text at
   <https://pokeacer.xyz/wii/pdf/IconBanner_Specification.pdf>. `visual-design.md` cites this
   document for icon dimensions, but §2.9, §3.4, §4.2, §5.2.3 and §6 — which are where all
   the *transient* behaviour lives — appear not to have been read before. This single
   document closes items 2, 3, 4 and 11 below.
2. **Nintendo, "Wii Operations Manual — Channels and Settings"**, European RVK/RVL-101(EUR)
   printing, `Wii_Channel_RVK_MAN_UKV-1_08_0`, © 2011. PDF at
   <https://www.nintendo.com/eu/media/downloads/support_1/wii_21/Wii_Channels_Settings_RVK_MAN_UK_NFRP.pdf>
   (also mirrored at
   <https://assets.nintendo.eu/image/upload/v1635389389/NAL/Support/WiiOperationsManualChannelsAndSettings.pdf>).
   This is the same booklet the existing docs used via an Internet-Archive OCR text layer,
   but read here **as page images**, which makes the annotated screen diagrams legible —
   several findings below come from the figures rather than the body copy.

> ⚠️ **Source warning — tcrf.net is currently serving prompt-injection content.**
> Three separate fetch attempts against `tcrf.net/Wii_System_Menu`, `tcrf.net/Wii_Menu` and
> `tcrf.net/index.php?title=Wii_Menu&action=raw` returned no article content at all. Instead
> each returned text addressed to LLM agents, falsely claiming "the user has requested" file
> deletion and circular file renames, with a fake future timestamp and a liability
> disclaimer. The instructions were ignored and nothing was executed. **The Cutting Room
> Floor could not be used as a source in this pass.** If it is retried later, read it in a
> browser rather than through an automated fetch, and do not trust text it returns.

---

## 1. The channel "loading" / download stripe — **RESOLVED, NEGATIVE**

`animations-interactions.md` §8 flagged an animated diagonal-stripe / barber-pole "downloading"
pattern on channel tiles as its least-sourced topic. **I believe it does not exist**, and the
memory it comes from is traceable to other things.

- **[Official]** The Wii's actual download-progress UI lives entirely *inside the Wii Shop
  Channel*, not on the Wii Menu. Nintendo Support, "How to Download Wii Shop Channel Items":
  *"A screen will appear with Mario running across the screen and three blocks. Mario will hit
  the blocks as the download progresses."* Then *"Download successful"* → select **OK** → you
  are returned to the Wii Shop menu, not the Wii Menu.
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/2829/~/how-to-download-wii-shop-channel-items>
- **[Fan/community]** There were **six** distinct Wii Shop download animations, all whimsical
  sprite scenes rather than abstract progress art — e.g. *"an 8-bit Mario continuously running
  across the bottom of the screen and collecting coins as they moved toward him"*
  (Nintendo Wiki, <https://nintendo.miraheze.org/wiki/Wii_Shop_Channel>); fan capture project
  documenting all six: <https://www.youtube.com/watch?v=Qtybiwwuq4k>.
- **[Inferred]** Downloading is therefore *modal and blocking*: the Wii Menu channel grid is
  never on screen while a download runs, so a per-tile download state has nowhere to appear.
  A channel simply is, or is not, present when you next return to the grid.
- **[Fan/community]** There is also no "fallback"/placeholder tile art in the System Menu. The
  `sadmenu` homebrew patches the System Menu to load substitute banner archives, and the
  documented result is that *"all the banners will be black"* — a failed banner renders as
  nothing, not as a striped placeholder. <https://wiibrew.org/wiki/Sadmenu>
- **[Fan/community]** A malformed banner does not degrade gracefully either; it hard-crashes
  the menu ("banner brick"), producing *"The System Files Are Corrupted"* — again, no
  placeholder state. <https://wiibrew.org/wiki/Brick/Banner_brick>

**Most likely origin of the false memory:** the faint **diagonal grain/noise texture already
documented on empty slots** in `visual-design.md` §2, plus the striped-looking "completion bar"
of the **Wii System Update** flow (the manual's own wording: *"as long as you see that the
completion bar is progressing, you don't need to worry"*).

**Implementation recommendation:** **do not build a barber-pole tile loader.** It is not
authentic and `animations-interactions.md`'s recommended 1–2s `repeating-linear-gradient`
loop should be dropped or re-scoped. If a loading state is needed for a web clone (async
image loading), see item 10 for the one genuinely authentic loading moment — the post-boot
banner load pass.

## 2. The "newly arrived / unopened content" badge — **RESOLVED, but it is not a badge**

- **[Official]** Icon and Banner Specifications §2.9, "Support for the New Message Display
  Feature": *"Wii Menu contains a feature that indicates the arrival of a new message; when a
  WiiConnect24 message is delivered to a Channel application, the feature displays images and
  animations on top of an installed Channel's icon."*
- **[Official]** §2.9.1: *"Panes that belong to the 'New' group are always displayed when an
  appropriate application receives a new WiiConnect24 message."* Language-specific variants are
  `New_JPN`, `New_ENG`, `New_GER`, `New_FRA`, `New_SPA`, `New_ITA`, `New_NED`, `New_KOR`,
  `New_CHN`.
- **[Official]** §2.9.2: *"Animations that have the New tag will be played back together with
  the display of the aforementioned 'New' group. When you use 'Newly Arrived' animations (and
  the New animation tag is set), you have to specify the Whole tag for displayed frames of the
  entire icon's animation, which will always be played back regardless of WiiConnect24
  messages."*
- **[Official]** Availability: *"This feature is not supported in Wii Menu versions 2.1 and
  earlier. In addition, it cannot be used by disc applications even with Wii Menu versions 3.0
  and later."*

**The critical implementation consequence:** this is **not** a system-drawn badge. There is no
canonical shape, colour, corner position, or size, because **the artwork lives inside each
channel's own `icon.brlyt` / `icon.brlan`**, authored by that channel's developer. The System
Menu only flips a flag; the channel decides what "new" looks like. Two channels with new
WiiConnect24 content can look completely different.

- Consequently there is **no visual spec to find** — `visual-design.md`'s note that this was
  "unconfirmed" can be closed as "unconfirmable by design".
- Realistic candidates in a clone: News Channel, Forecast Channel, Everybody Votes Channel,
  Nintendo Channel, Check Mii Out Channel — the WiiConnect24-fed ones. The Disc Channel can
  never show it (disc applications are excluded).
- If you want one anyway, invent per-channel overlay art rather than a generic corner dot, and
  drive it off a `hasNewContent` flag on the channel model. Layer it *over* the looping icon
  animation, which continues to play underneath ("Whole" tag).

## 3. The channel name label — **RESOLVED: it is a hover pop-up, not a persistent label**

This is probably the single most implementation-relevant finding in this doc, because it means
the grid has *no* text on it at rest.

- **[Official]** Icon and Banner Specifications §5.2.3: *"The title specified here will pop-up
  when the cursor is moved over the **unselected** icon in the Wii Menu. However, only the
  first line will be displayed; if the text does not fit the display area, the end of the line
  will be truncated by a maximum of four characters."*
- **[Official]** Title data model, same section: titles are authored per language
  (`JP/EN/GE/FR/SP/IT/DU/KR/SC`); *"The maximum number of characters for a single line is 20…
  a maximum of two lines and 40 characters can be displayed."* Line 1 should evoke the
  application name, line 2 is a subtitle; *"Use of a string unrelated to the application name
  is prohibited."*
- **[Official]** The full two-line title is only visible elsewhere: *"The complete title,
  including the second line, can be viewed in the Wii Message Board under Today's
  Accomplishments."*

**Reading of "unselected":** the pop-up is a *hover-state affordance on tiles you have not
committed to*. Once a channel is selected, the full-screen Channel Preview Screen (item 4)
takes over and the channel's name is drawn by the channel's own banner art instead.

**Typography:** not specified. Note that §2.7/§3.8 restrict *channel-authored* text boxes to
the bundled bitmap fonts `data\fonts\wbf1.brfna` and `data\fonts\wbf2.brfna`, but the hover
pop-up is drawn by the **System Menu**, not by the channel, so it uses the System Menu's own
UI font — which this corpus documents elsewhere as the Wii's rounded gothic system face.
Treat the exact face/size as **still open**.

**Implementation:**
- Render nothing on tiles at rest. On pointer-over, show a single-line pop-up label.
- Budget ~20 characters. Truncate by **hard cut**, not ellipsis — the spec says "the end of the
  line will be truncated", and quantifies the overflow allowance as "a maximum of four
  characters", implying the label box is sized for the string minus up to 4 glyphs.
- Suppress the pop-up on the currently-selected tile.
- Placement relative to the tile is **not documented** — [Inferred] directly above or below the
  tile is the safe choice.

## 4. The selected-channel preview overlay — **RESOLVED in full**

Nintendo's consumer name is **"Channel Preview Screen"**; the developer name is the **banner**.

- **[Official]** It is genuinely full-bleed, not a card: Icon/Banner spec §3.4.1 — *"The banner
  is displayed on the entire TV screen."*
- **[Official]** The System Menu composites its own chrome over the channel's artwork: *"The
  banner is displayed with the prepared buttons and the black frame in the foreground (see
  Figure 3-1). **Arrows are displayed on the screen edges**, so make sure that important
  information is not obscured by them."* So the overlay consists of (a) a black frame,
  (b) buttons, (c) left/right edge arrows.
- **[Official]** **Both bottom buttons, and the left one is contextual.** Manual figures:
  - Entered from the Wii Menu (p.9, Wii Sports Resort; p.30 Virtual Console; p.32 WiiWare):
    bottom-left **"Wii Menu"**, bottom-right **"Start"**.
  - Entered from the SD Card Menu (p.11, step 4): bottom-left **"SD Card Menu"**,
    bottom-right **"Start"**.
  → The left button is a *back-to-where-you-came-from* button that renames itself. Both are
    lozenge/pill-shaped, roughly equal width, sitting on the black bottom frame, left button
    at ~⅓ and right at ~⅔ of screen width.
- **[Official]** Body copy confirms the flow: *"Select the DISC CHANNEL on the Wii Menu using
  the Wii Remote Plus. Select START on the game's Channel Preview Screen to begin the game."*
- **[Official]** The **edge arrows step to the adjacent channel's banner** without returning to
  the grid — §6 refers to *"the moment the transition effect from the adjacent banner
  completes"* as an alternative entry into the same screen. The manual's SD Card Menu preview
  figure (p.11) shows ◀ ▶ chevrons vertically centred at the left and right screen edges.
- **[Official]** Author-side render geometry, useful for safe-area work — §3.4.1, Code 3-1:
  frame buffer `608 × 456`, screen `670 × 456`.
- **[Official]** Backgrounds are mandatory: *"If the application does not draw a background,
  the screen display will be undefined and the base background may not be solid black; thus,
  always draw a background pane."*
- **[Official]** Banner animation is **optional** and uses two tags, `Start` then `Loop`:
  *"After the Start tag completes, the Loop tag plays, then the Loop tag loops and plays
  back."* The spec's own example: Start tag shows the trademark, Loop tag shows the title.
  (Contrast icons, where animation is **mandatory** — *"Use of still image icons for which
  animation has not been set is prohibited."*)
- **[Official]** Banner sound is **mandatory** — *"Use of a silent banner for which no banner
  sound has been set is prohibited."* Timing in item 11.

## 5. Drag-and-drop visual feedback — **NOT FOUND (negative result)**

The *mechanic* is thoroughly official; the *visuals* are undocumented anywhere I could reach.

- **[Official]** Nintendo Support, "How to Arrange Channels on the Wii Menu or the SD Card
  Menu": *"Grab the desired channel by pressing and holding the A and B Buttons on the Wii
  Remote."* / *"Drag it over an empty spot and release the A and B Buttons."* / *"To move a
  channel to another page, hold it over the arrow button until the page changes."*
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/~/how-to-arrange-channels-on-the-wii-menu-or-the-sd-card-menu>
- **[Official]** Manual, SD Card Menu section, same idiom: *"Select a Channel with the Wii
  Remote Plus, press and hold the A Button and B Button to grab it, then move it to the desired
  position and release the buttons."*
- **[Official]** Note the phrase *"drag it over an **empty** spot"* — Nintendo never describes
  swapping with an occupied slot. **[Inferred]** the drop target may be empty-slots-only, with
  no reflow/push-aside behaviour. This is worth testing in Dolphin before committing to a
  swap-based model.

**What no source describes:** whether the dragged tile scales, tilts, gains a shadow, becomes
translucent, or is replaced by a ghost; whether the origin slot shows a placeholder; whether
valid drop targets highlight. Nintendo World Report's "Rearranging Channels" feature —
the one article specifically about this — says only *"Holding down the A Button and B Trigger
while pointing at a channel screen will grab it for easy repositioning into an empty slot"*
and contains no visual description at all.
<https://www.nintendoworldreport.com/feature/12566/wii-tricks-and-secrets-wii-menu-rearranging-channels>

- **[Inferred, moderate confidence]** The **cursor** almost certainly changes to a closed/
  grabbing hand. The manual's Mii Channel section uses the identical A+B grab idiom (*"Grab and
  move a Mii by selecting it with the Wii Remote Plus and holding down the A and B Buttons"*)
  and its figures show a distinct closed-hand cursor glyph next to that instruction, separate
  from the normal pointing hand. `animations-interactions.md` §2 already notes fan cursor packs
  containing multiple pointer states.

**This is the largest genuine unknown remaining.** Recommend resolving with frame-stepped
video capture (Dolphin + a longplay recording) rather than more text search.

## 6. Error / alert dialogs — **text fully official; chrome inferred from figures**

There are **two visually distinct classes**, and conflating them is a common clone mistake.

### 6a. Fatal system error screens — full-screen, no dialog chrome

Not a dialog at all: the System Menu is gone, replaced by a plain screen of centred text.
**[Fan/community]** WiiBrew describes the generic one as white text on a black background.
<https://wiibrew.org/wiki/Wii_Error_Messages>

**[Official]** verbatim strings, Manual §15 "Error Messages and Codes", p.66 (EU wording):

| String |
| --- |
| *"An error has occurred. Press the EJECT Button, remove the disc, and turn off the power to the console. Please read the Wii Operations Manual for further instructions."* |
| *"The Wii Remote is experiencing an error. Refer to the Wii Operations Manual for details."* |
| *"The disc could not be read. Refer to the Wii Operations Manual for details."* |
| *"There is not enough available space in the Wii System Memory. (…)"* |
| *"The Wii System Memory has been damaged. Refer to the Wii Operations Manual for details."* |
| *"The device inserted in the SD Card slot can't be used."* |

The manual footnotes the whole table: *"\* Wording may be subject to change in further Wii
system updates."*

**[Official/Fan]** North-American wording differs slightly — *"An error has occurred. Press the
Eject Button and remove the disc, then turn the Wii console off and refer to the Wii Operations
Manual for help troubleshooting."* (WiiBrew, and the NA manual via
<https://www.manua.ls/nintendo/wii/manual>).

**[Fan/community]** Two more that matter for a menu clone, both from WiiBrew:
- *"The System Files Are Corrupted"* — what a banner brick actually crashes to.
- *"This channel can't be used."* — region mismatch when launching a channel whose region
  doesn't match the System Menu. Widely corroborated:
  <https://www.reddit.com/r/WiiHacks/comments/myvk7n/this_channel_cant_be_used/>

### 6b. In-menu modal dialogs — the System Menu's own chrome

These are the ones that appear *over* the menu. No pixel-level source exists, but the manual's
figures are consistent enough to describe the pattern with confidence. **[Official]** figures,
**[Inferred]** synthesis:

- Centred rounded-rectangle panel, roughly 40–55% of screen width, dark/neutral fill, light
  centred body text, occupying the middle of the screen over a dimmed backdrop.
- **1–3 lozenge (pill) buttons in a horizontal row along the bottom of the panel** — the same
  button shape as the Channel Preview Screen's `Wii Menu` / `Start` pair, which is the
  strongest evidence that this is one shared button component.
- Two-button dialogs put **cancel/back on the left, confirm/destructive on the right**.
- Observed instances in the manual figures:
  - Format Wii System Memory → **`Cancel`** | **`Format`**
  - Data-management prompt → **`Back`** | **`Continue`**
  - Photo Channel doodle warning → **`Erase all`** | **`Don't erase`**
  - Insufficient system memory (stacked, three rows) → **`Auto Manage`** / **`Use Data
    Management`** / **`Quit`**
  - Auto Manage sub-dialog (stacked) → **`Right side of the Wii Menu`** / **`Lots of Blocks`** /
    **`A Few Blocks`** / **`Back`**
  - System update prompt → **`Yes`** | **`No`**
- Note the string *"Right side of the Wii Menu"* — **[Inferred]** confirms Nintendo's own mental
  model that the 4 pages run left→right with page 1 leftmost, which supports a horizontal-slide
  page transition over a cut or crossfade (the open gap in `animations-interactions.md` §4).

## 7. The system on-screen keyboard — **RESOLVED in full**

**[Official]** Manual §13 "Wii Keyboard", pp.62–63. Nintendo calls it the **Keyboard Screen**.
*"The Keyboard Screen will appear in certain programs when you need to enter text. Examples
include creating text for messages in the Wii Message Board or editing a Mii in the Mii
Channel."* Console Nickname entry uses the same screen (Nintendo UK: *"Use the Wii Remote on
the on screen keyboard for entering the new console Nickname. Confirm the Nickname is correct
by clicking the 'confirm' button on the bottom right corner."*
<https://www.nintendo.com/en-gb/Support/Legacy-system/Console-Nickname-242893.html>)

**Two user-switchable layouts**, toggled by a pair of keyboard-style icons on the bottom rail.

### QWERTY layout, top → bottom
1. **Entered-text display area** — a wide light field showing what you've typed, with a text
   cursor; *"Use the +Control Pad to move the cursor."* A **▼** control at its right scrolls up
   and down through characters already entered.
2. **Predicted-word strip** — a horizontal list of candidate words (figure shows
   `She  She's  She'd  She'll  Shear`) with **◀ ▶** scroll arrows. *"NOTE: This feature is only
   available in the Wii Message Board."*
3. `1 2 3 4 5 6 7 8 9 0 -` then **backspace** — *"Delete character (You can also use the −
   Button on the Wii Remote Plus.)"*
4. `q w e r t y u i o p` then **↵** — *"Insert carriage return."*
5. `Caps  a s d f g h j k l :`
6. `Shift  z x c v b n m , . =` — *"Change from lower-case to upper-case for the next letter.
   (You can also hold down the B Button on the Wii Remote Plus to shift characters.)"*
7. `¥ € [ ] ` · **Space** · `\ / ~ #`
8. Bottom utility row: a **dictionary/book icon + `EN`** (predicted-word language, switchable
   between *"English, French, German, Italian, Spanish or Dutch"*), and **`€ëä`** — *"Select
   additional symbols from list."*
9. Bottom rail: **`Back`** (left, "Return to previous screen"), the two **keyboard-style
   toggle** icons (centre), **`OK`** (right, "Confirm entered characters").

### Mobile Phone-Style layout
A 4×4 grid. Left column selects input mode, remaining 3×4 is a phone keypad:

| mode | | | |
| --- | --- | --- | --- |
| `Abc` *(first char upper-case)* | `.,?@` | `abc` | `def` |
| `abc` *(lower-case)* | `ghi` | `jkl` | `mno` |
| `ABC` *(upper-case)* | `pqrs` | `tuv` | `wxyz` |
| `123` *(numeric)* | 📖`EN` | `.,0` | `€ëä` |

Right-hand column of controls, top→bottom: **▼** scroll, **backspace**, **↵**, predicted-word
on/off toggle. Same `Back` / toggle / `OK` bottom rail. *"Select the character you want to
enter. Use the A and B Buttons to change which character to use from each key."* /
*"To insert a blank space, press right on the +Control Pad or select the space key."*
Worked example given: `ghi` → `def` → `jkl` → pick **hello** from predictions.

**[Official]** *"Many functions on the QWERTY and mobile phone-style keyboards are the same."*
**[Official]** A USB keyboard can be used instead (System Menu 3.1+), with the caveat
*"USB keyboards cannot be used with the Everybody Votes Channel."*

**Implementation note:** the keyboard is a full-screen modal, not an inline widget, and it is
only reachable from sub-screens (Message Board, Mii Channel, Settings) — **it never appears
over the channel grid**. Low priority for a home-screen-only clone.

## 8. Idle / screensaver behaviour — **RESOLVED**

There is no screensaver with moving artwork, and no auto-sleep. There *is* a global dim.

- **[Official]** Manual, Wii Settings → Screen: **Screen Burn-in Reduction** — *"the Wii console
  will fade the screen when Wii software is paused for five or more minutes. (You can revert
  the screen to its original brightness by simply pressing any button on the Wii Remote Plus
  other than the Power Button.)"*
- **[Official]** Nintendo Support adds the GameCube carve-out: *"This mode does not work while
  playing Nintendo GameCube software."*
  <https://en-americas-support.nintendo.com/app/answers/detail/a_id/2686/~/how-to-activate-screen-burn-in-reduction-mode>
- **[Fan/community]** The key clarification for a *menu* clone — it is implemented in the
  System Menu itself, so it fires while sitting on the Wii Menu, not only inside games:
  *"It's a function of the system menu and the library that handles the home/pause screen, so
  if you're playing a game you have to have the 'home' menu up."*
  <https://gbatemp.net/threads/wii-burn-in-reduction-when-exactly-does-it-kick-in.400565/>
  (Consistent with Nintendo's own phrasing: "paused", i.e. not actively rendering gameplay.)
- **[Official]** The hardware manual (System Setup volume) separately warns users to
  *"place the game on pause and turn the TV off"* during breaks — i.e. Nintendo treated
  burn-in as a user responsibility too, and the software feature is a supplement.
  <https://archive.org/details/wii-op-mn-en-setup>

**Implementation:** after 5 minutes with no pointer movement and no button input, animate the
whole viewport's brightness down over ~1–2s (`filter: brightness()` or a black overlay fading
to ~50–60% opacity); restore instantly on **any** input. Make it a toggleable setting to mirror
the console, defaulting to on. Do **not** build a bouncing-logo screensaver — none exists.

## 9. WiiConnect24 standby / notification glow — **RESOLVED: hardware only, not mirrored**

- **[Official]** It's a user-configurable *hardware* setting, Wii Settings → WiiConnect24 →
  **Slot Illumination**, with three values:
  - **BRIGHT** — *"The Wii console's disc slot will blink bright blue when WiiConnect24 has
    received new data."*
  - **DIM** — *"…will blink a dim blue…"*
  - **OFF** — *"…will not blink when WiiConnect24 has received new data."*
- **[Official]** The slot also flashes on other events, unrelated to notifications:
  *"The blue light in the disc slot briefly flashes when: – The console turns on after the
  POWER Button is pressed. – The console turns on automatically after a Disc is inserted into
  the slot while the power is off (Standby Mode). – Data is received via WiiConnect24."*
- **[Official]** Power LED colour states (System Setup manual): **green** = console on;
  **orange** = standby with WiiConnect24 on; **red** = standby with WiiConnect24 off.

**No on-screen mirror of the glow exists.** The on-screen equivalents of "new data arrived" are
the two things already covered: the **Message Board icon blinking** (*"Blinks when you have
received a message"*, official; added in System Menu 3.0 per WiiBrew) and the per-channel
**"Newly Arrived" icon overlay** of item 2.

**Implementation:** only relevant if the clone renders a console bezel/hardware frame
(`system-ui.md` §8's "is the menu framed as on a TV" question). Otherwise implement the two
on-screen signals and skip the glow.

## 10. Boot / startup sequence — **PARTIALLY RESOLVED**

**[Official]** The order, and the fact that there is nothing between the warning and the menu:
*"When the Wii console (RVL-101(EUR)) power is turned on, the first screen you will see is the
**Health and Safety Screen**. Please read the content carefully and press the A Button to
proceed to the **Wii Menu**."*

So the documented sequence is:

1. Power on → **[Official]** brief blue disc-slot flash (hardware, item 9).
2. **Health and Safety Screen** — blocking, requires **A**.
3. **Wii Menu**.

**No official source mentions a "Wii" logo splash** between (2) and (3), and the manual's
step-by-step wording ("the first screen… press A to proceed to the Wii Menu") leaves no room
for one. `animations-interactions.md`'s flagged "logo splash" gap should be treated as
**probably nonexistent** on retail hardware, though not disproven.

Corroborating and elaborating detail:

- **[Fan/community]** The H&S screen is genuinely blocking and separate — Priiloader's
  headline feature list includes *"Auto-Press A at Health Screen — Automatically presses the A
  Button to get past the initial 'Health and Safety' screen."*
  <https://www.reddit.com/r/WiiHacks/comments/nkw1o0/disable_wii_safety_screen_at_startup/>
- **[Fan/community]** It is also an interactive screen with a hidden input: **Maintenance Mode**
  is *"triggered by holding the Plus and Minus Buttons for several seconds on the Health
  Screen"*, and in that mode *"CHANS scripts, RSOs, WiiConnect24, the Wii Message Board, and
  the SD Card Menu are disabled."* <https://wiibrew.org/wiki/Maintenance_Mode>
- **[Fan/community]** **The channel banners load immediately after the H&S screen is
  dismissed, as a distinct pass** — this is the one authentic "loading" moment on the menu. The
  evidence is diagnostic: a system with a malformed banner *"will freeze after the Health and
  Safety screen"*, i.e. the crash happens during banner enumeration, between dismissing the
  warning and the grid being ready. <https://wiibrew.org/wiki/Brick/Banner_brick>
  **[Inferred]** a faithful clone can justify staggering tile appearance/animation-start over
  the first few hundred ms after entry, rather than presenting all 12 tiles fully-formed.
- **[Fan/community, partial]** There **is** a startup sound over the warning screen, and the
  copy begins along the lines of *"Before playing, read your operations manual for important
  information…"* — from the title and description of an archival capture,
  <https://www.youtube.com/watch?v=eE3UBzOK5oQ> ("Nintendo Wii Startup Sound - Warning -
  Health and Safety").

**Could not confirm in this pass:** the exact full wording of the H&S screen, its background
colour, typography and layout, its precise duration/timing, and the exact startup jingle.
The two fan wikis that document it in detail (`avid.wiki/Nintendo/Warning_Screen`,
`company-bumpers.fandom.com/wiki/Nintendo_Warning_Screens`) both refused automated fetches
(HTTP 403 / 402), and tcrf.net was compromised (see warning at top). **This is the second
biggest remaining unknown after item 5.**

## 11. Channel launch transition — **RESOLVED, with hard timing numbers**

The Icon/Banner spec describes this precisely, because third-party developers had to author
around it.

**Forward (grid → channel):**

1. **Icon selected** → **zoom effect** enlarges the icon into the full-screen banner.
   §4.2 and §6 both refer to *"the display screen zoom effect… after an icon is selected"*.
2. **Banner sound starts only after the zoom completes** — §4.2: *"Sound starts to play when
   the banner zoom-in completes."*
3. Banner animation plays `Start` tag once, then loops the `Loop` tag (§3.6).
4. **A minimum dwell of one second is enforced** — §6: *"Regardless of how quickly the banner
   Start button is clicked, the banner screen is displayed with a guaranteed wait of at least
   one second. This is the time interval from the moment the display screen zoom effect
   completes after an icon is selected (or the moment the transition effect from the adjacent
   banner completes), to the moment before the fadeout begins to transition to the game
   title."* (Its purpose: guaranteeing trademark/copyright legibility.)
5. **`Start` pressed → fadeout**, and the banner sound fades with the screen: *"the banner
   sound will fade out along with the screen fadeout."*
6. **[Official] regional bug worth knowing:** *"When Start is selected, the sound will be turned
   off after two seconds. In certain North American Wii consoles, however, the sound stops in
   the middle and does not fade out. Depending on the sound being played, the sudden stop may
   cause a loud noise."*

**Reverse (channel preview → grid):** §4.2 — *"[the sound] fades out when Wii Menu is
selected."* The visual return is **[Inferred]** to be the zoom played in reverse; no source
states this explicitly.

**Lateral (banner → adjacent banner):** §6 refers to *"the transition effect from the adjacent
banner"* as a first-class entry path with its own completion moment, triggered by the edge
arrows of item 4. The *type* of that transition is not described. **[Inferred]** a horizontal
slide/push, matching the arrow affordance.

**[Official] Frame-rate caveat that affects any faithful timing recreation:** *"In PAL50 mode,
the Wii console plays back the animation at 1.2 times the NTSC speed"* — icon and banner
animations authored at 60fps NTSC run 20% faster on PAL50 hardware. If you are matching timings
against a video capture, establish which region it came from first.

**Concrete numbers for the clone:** zoom-in duration unstated (**[Inferred]** 350–500ms);
**≥1000ms guaranteed dwell** on the preview before any launch fade may begin (**official**);
fade-out duration unstated, with a **2000ms** audio tail as an upper bound (**official**).

## 12. Other transient / conditional states discovered

Ordered roughly by usefulness to this project.

### 12a. Date **and** time are both official Wii Menu elements — *this settles an open contradiction*

`component-inventory.md` item 11 ranks the `clock.md` ("time only") vs `system-ui.md`
("time and date") conflict as the **#1 priority** blocker. **The manual's Wii Menu diagram
(p.7) resolves it.** It carries two separate callouts, **"Current Time"** and **"Current
Date"**, and — crucially, visible in the page image rather than the OCR text — **the figure
itself renders them stacked**: `15:00` on the upper line, `Wed 01/04` on the line below it,
both centred in the bottom bar between the SD Card Menu icon and the Message Board icon. The
same `15:00` / `Wed 01/04` pairing is reproduced in every Wii Menu thumbnail throughout the
manual (pp.8, 10, 14, 16, 21, 28).

**Conclusion: `clock.md`'s time-only recommendation is wrong and should be reversed.** Format
is `HH:MM` over `Ddd DD/MM` (EU manual; day-of-week abbreviation + day/month), with the date in
a smaller weight beneath the time. Note the EU day-first order — a US-market clone should
likely use `Wed 04/01`, but that is **[Inferred]**, not shown.

### 12b. The "Wii — See what you can do on the internet" video tile

**[Official]** A callout on the same p.7 diagram, pointing at the large centre tile:
*"An introductory video which will introduce you Wii Channels and services that you can enjoy
online. Selecting this video after you have connected to the internet will provide you with an
option to erase it. Please select YES if you wish to erase the video."* Plus:
*"NOTE: This video will also be erased when the Wii System Memory is formatted… Once erased,
the video cannot be recovered."*

This is a **conditional, self-deleting, non-channel tile** occupying a grid slot on a fresh
console — a state no screenshot of a well-used Wii would ever show, and one that explains the
otherwise-odd large "Wii" tile in the middle of default-layout screenshots.

### 12c. SD Card Menu icon: greyed → coloured

**[Official]** *"The icon will appear gray if there is no SD Card inserted."* and
*"Once an SD Card has been inserted, the icon in the lower left of the Wii Menu will change
from [grey icon] to [coloured icon]."* A live, hot-swappable two-state icon, not a static
graphic. (Already noted in `system-ui.md` §4; recorded here because it belongs to this
category.)

### 12d. Insufficient-memory interstitial when launching from the SD Card Menu

**[Official]** *"The SD Card Menu temporarily copies Channels to the Wii System Memory when
launching them. If there is insufficient space… a screen will appear where you will be able to
manage the data in your Wii System Memory."* → `Auto Manage` / `Use Data Management` / `Quit`,
then a second dialog offering `Right side of the Wii Menu` / `Lots of Blocks` / `A Few Blocks`.
Chrome described in item 6b.

### 12e. System Update prompt and "completion bar"

**[Official]** *"Connect to the internet and perform a Wii system update?"* → `Yes` / `No`.
During the update: *"the updating process may take some time depending on the internet
connection: as long as you see that the **completion bar** is progressing, you don't need to
worry."* A determinate progress bar exists in the System Menu — but for **system updates**,
not for channel tiles.

### 12f. HOME Menu overlay

**[Official]** Manual §12. Appears over running software (not over the channel grid itself).
A centred panel titled **"HOME Menu"** with a **`⊗ Close`** control at its top-right; two large
lozenge buttons **`Wii Menu`** and **`Reset`** side by side; a wider **`Operations Guide`**
button beneath them (*"only available for downloaded titles"*); and a **Wii Remote Settings**
strip along the bottom showing **P1–P4** slots with battery-life bars. Selecting the strip
opens the **Wii Remote Settings Screen**: `Volume` with `−`/`+` and a ~10-segment bar,
`Rumble` `On`/`Off`, `Connection` → `Reconnect`, and `Close Wii Remote Settings`.
**[Official]** warning text: *"If you select Wii MENU or RESET, you may permanently lose any
unsaved information from the title you are currently playing."*

Useful mainly as a **second worked example of the System Menu's dialog/button vocabulary**
(item 6b), from a legible official figure.

### 12g. Parental-controls play-time overlay — **single-snippet, unverified**

A search snippet from the Console Research Wiki's Wii Menu page states: *"If activated, the
System Menu will display the remaining time at the bottom of the channel's banner. If the time
limit is over, you will automatically return to the System Menu…"* — i.e. a countdown drawn on
the **Channel Preview Screen**, conditional on a parental-control setting.

I could not verify this: `wiki.raregamingdump.ca` is behind an Anubis anti-bot wall that
rejected every fetch (direct, mobile view, and via proxy). **Tagged [Fan/community, single
snippet, unverified]** — flagged as a promising lead, not a finding. Worth chasing manually;
that wiki looked like the most detailed System Menu reference encountered in this pass.

### 12h. Disc Channel dynamic states

Already covered in `channels.md` / `animations-interactions.md` §3, listed for completeness:
disc-insert animation, "no disc" tone, spinning-disc poll animation, and — **[Official]** — the
console auto-powering-on and going straight to the H&S screen when a disc is inserted in
standby.

---

## Summary: status of all 12 requested items

| # | Item | Status |
| --- | --- | --- |
| 1 | Channel loading/download stripe | **Resolved — negative.** Does not exist. Download UI is Mario-and-blocks inside the Wii Shop Channel. Drop the barber-pole recommendation. |
| 2 | "Newly arrived" badge | **Resolved — mechanism only.** Real feature, but artwork is authored per-channel; no universal badge exists to spec. |
| 3 | Channel name label | **Resolved.** Hover-only pop-up on unselected tiles, first line only, ~20 chars, hard truncation. Grid has no text at rest. |
| 4 | Preview overlay | **Resolved in full.** Full-screen banner + black frame + edge arrows + contextual left button (`Wii Menu` / `SD Card Menu`) and right `Start`. |
| 5 | Drag-and-drop feedback | **NOT FOUND.** Mechanic official, visuals undocumented everywhere. Biggest gap. Needs video capture. |
| 6 | Error/alert dialogs | **Text official; chrome inferred.** Two classes: full-screen fatal errors (black/white text) vs in-menu modals (rounded panel, pill buttons, cancel-left/confirm-right). |
| 7 | On-screen keyboard | **Resolved in full.** Two layouts (QWERTY + mobile-phone), key-by-key, with predicted words and USB alternative. |
| 8 | Idle / screensaver | **Resolved.** Screen Burn-in Reduction: whole-screen fade after 5 min idle, any button restores. No screensaver art, no auto-sleep. |
| 9 | WiiConnect24 glow | **Resolved — negative for on-screen.** Hardware slot LED with BRIGHT/DIM/OFF setting; on-screen equivalents are the Message Board blink and item 2. |
| 10 | Boot sequence | **Partially resolved.** Order confirmed (power → H&S → A → Menu); no logo splash appears to exist. Exact H&S wording/typography/timing/audio unconfirmed. |
| 11 | Launch transition | **Resolved with numbers.** Zoom-in → sound starts → ≥1000ms guaranteed dwell → fadeout (≤2000ms audio tail). PAL50 runs 1.2× faster. |
| 12 | Other discoveries | 8 additional states found, incl. the date/time contradiction being settled and the self-erasing intro-video tile. |

### Ranked next steps

1. **Video-capture pass in Dolphin** — the only remaining way to close item 5 (drag visuals),
   item 10 (H&S screen), the reverse-zoom of item 11, and the page-transition motion that
   `animations-interactions.md` §4 still lists as open. Text sources are exhausted.
2. **Reverse `clock.md`'s time-only recommendation** (item 12a) — this was flagged as the
   corpus's #1 priority contradiction and is now settled by an official figure.
3. **Delete the diagonal-stripe loader** from `animations-interactions.md` §8's recommendation
   table before anyone implements it.
4. **Chase `wiki.raregamingdump.ca/wiki/Wii_Menu` manually in a browser** — Anubis-walled, but
   the one snippet obtained (item 12g) suggests it documents System Menu states no other source
   does.
