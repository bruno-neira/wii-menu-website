# Wii Menu — Message Board / Mail Button (bottom-right)

Deep-dive on the round envelope button in the bottom-right of the Wii Menu bottom bar: the
control that opens the Wii Message Board and blinks when new mail arrives.

**Sourcing tags used throughout:**

- **[Official]** — Nintendo-authored (printed Operations Manual, support pages, dev specs).
- **[Decomp]** — *new source tier introduced by this pass.* Read directly out of the
  **Wii Menu decompilation** ([`koopthekoopa/wii-ipl`](https://github.com/koopthekoopa/wii-ipl)),
  a matching-decompilation of the retail System Menu **4.3** binary (targets `43U`/`43E`/`43J`/`43K`
  = US/EU/JP/KR). Claims tagged this way are quoted from actual System Menu source logic —
  animation frame ranges, sound-effect identifiers, pane names, timers. This is **stronger than
  [Official]** for behavioral/timing questions, because it is the shipping code itself rather than
  a consumer-facing description of it. Its one limitation: it contains **code, not assets** — the
  `.brlyt`/`.brlan` layout binaries that hold the actual motion *curves* live in the console's NAND
  and are not in the repo. So the decomp gives exact **durations and trigger logic** but not exact
  **easing or transform curves**.
- **[Texture]** — measured from the **WM4K** Wii Menu texture pack
  ([`Alan-bur/WM4K`](https://github.com/Alan-bur/WM4K)), a Dolphin texture-dump-and-upscale pack
  organised per System Menu screen. Filenames encode the *original* Wii texture dimensions
  (`tex1_<W>x<H>_<hash>_<fmt>.png`), so shape and proportion are trustworthy; the PNGs themselves
  are AI-upscaled, so **do not** treat their pixel-level edges as ground truth.
- **[Screenshot]** — pixel-measured directly from this repo's `reference_screen.png`
  (420×236, 16:9). Independent of the two above, and used here mainly as cross-validation.
- **[Fan/community]** — wikis, forums, fan analysis.
- **[Inferred]** — my reasoning, flagged as such.

> **Research-conditions note:** the WebSearch budget for this session was exhausted before this
> doc's research began, so everything below comes from direct fetches of known URLs, plus two
> repositories cloned and analysed locally. `nintendo.fandom.com/wiki/Wii_Message_Board` returned
> **HTTP 402 again** (same failure `system-ui.md` hit) — but it no longer matters much, because the
> decompilation answers most of what that page was wanted for, and answers it better.

---

## 1. Identity, internal naming, and where it lives in the code

The Wii Menu does not call this "the mail button". Internally it is the **BBS (bulletin board)
button**. **[Decomp]**

| Concept | Internal identifier | Source |
|---|---|---|
| Button enum | `BTN_BBS_BOARD = 0` (first entry in `Button::BTN_MAX`) | `include/scene/button/iplButton.h` |
| Layout pane name | `B_Bbs` | `Button::smButtonName[]` |
| Animation group | `G_Bbs` | `Button::mscGroupName[]` |
| Unread-count text pane | `T_BbsMark1` | `src/scene/board/iplBoard.cpp:232` |
| Persistent unread signal anim group | `G_BbsSignal` | `iplButton.cpp:226` |
| New-arrival flourish anim group | `G_BbsSignal_new` | `iplButton.cpp:232` |
| Hover tooltip string ID | `MESG_BUTTON_BBS_BOARD` (= 15) | `include/system/MESGEntries.h:108` |
| Layout archive / files | `cmnBtn.ash` → `my_IplTop_e.brlyt` + `my_IplTop_e.brlan` | `iplButton.cpp:198,204` |
| Target scene | `SCENE_BOARD` → `board.ash` → `my_IplTop_c.brlyt` | `src/scene/board/iplBoard.cpp:78,84` |

Two structural facts worth internalising before implementing:

1. **The button is not owned by the channel grid.** The bottom bar (`Button` scene) is its **own
   persistent scene** that survives across the Channel Select ↔ Message Board transition. Only the
   *content* layers swap. **[Decomp]** This is why the bar appears to morph rather than cut.
2. **The button and the Message Board are separate scenes with a shared owner.** The unread-count
   badge is written by the **Board** scene into the **Button** scene's text pane
   (`button->setText("T_BbsMark1", numStr)`), meaning the Message Board scene is alive and counting
   messages even while you are looking at the channel grid. **[Decomp]** Practical consequence for a
   web clone: model unread state as app-level state, not as state owned by the button component.

---

## 2. Exact visual design

### 2.1 Overall construction

The button is a stack of four layers, drawn bottom-to-top: **[Texture] + [Screenshot]**

1. **Recessed socket / contact shadow** — a soft darker-gray halo in the bar surface directly
   behind the circle, ~2 px wide at 420-px scale, reading as the button sitting in a shallow well.
2. **Circular button body** — a light-gray glossy disc with a vertical gradient.
3. **Bright cyan ring** — a thin outline stroked around the disc's circumference.
4. **Envelope glyph** — a single-colour medium-gray silhouette, centred.

### 2.2 The envelope glyph — settled definitively

The task asked whether the flap is *"a V-fold line or a filled triangle"*, and what the *"colors of
envelope body vs. flap"* are. **Both parts of that framing turn out to be slightly wrong, and the
real answer is a third thing.** I located the actual source texture:

**`0000000100000002/USA/Wii Menu/tex1_48x32_439cb2f08718e55c_0.png`** — a **48×32** texture (3:2),
which matches the 21×14 px glyph I independently measured in `reference_screen.png` (also 3:2).
**[Texture]**

The texture is **pure white `#FFFFFF` with an alpha channel** — 814 of its opaque pixels sample as
exactly `(255,255,255)`. The gray you see on screen is **not in the texture**; it is a tint applied
by the layout's material/vertex colour at draw time. **[Texture]**

Alpha map, downsampled to the native 48×32 (`#` = opaque, `+` = partial, `.` = faint, space = clear):

```
    .........................................
   .#########################################.
   .#########################################+
   .#########################################+
   .#########################################+
   .#########################################.
    .+######################################+
      .+##################################+.
        .+#############################+.
   .+.    .+#########################+.     ..
   .##+.    .+#####################+.     +##+
   .####+.    .+#################+.    .+####+
   .######+.    .+#############+.    .+######+
   .########+.    .+#########+.    .+########+
   .##########+.    .+#####+.    .+##########+
   .############+.    .+#+.    .+############+
   .##############+.         .+##############+
   .################+.     .+################+
   .##################+. .+##################+
   .#########################################+
   .#########################################+
   .#########################################+
   .#########################################+
   .#########################################+
   .#########################################+
   .#########################################+
   .#########################################+
   .+########################################.
     .......................................
```

**Reading of that map — the answer to the flap question:**

- The glyph is a **single flat silhouette in one colour**. There is **no second colour**: the
  envelope body and the flap are the *same* fill. Any description claiming "body colour vs. flap
  colour" is wrong.
- The flap is a **filled downward-pointing triangle** — not a stroked line. Its apex is at the
  centre, pointing down.
- The flap is separated from the body by a **thin fully-transparent V-shaped slit** (~2 px wide at
  native 48×32). **The light "V line" you perceive on screen is not drawn at all** — it is the
  button's own pale glossy fill showing *through* the cut-out.

So: **filled triangle, same colour as the body, delineated by a transparent gap rather than by a
colour change or a stroke.** In web terms this is naturally an SVG path with `fill-rule` producing
the notch, or a single-colour mask — **not** two shapes in two colours, and **not** a `stroke`.

**Cross-validation.** I measured the same glyph independently in `reference_screen.png` at 21×14 px
and got the identical construction: a `#A6A6A6`-ish silhouette with a `#DCDCDC`–`#E4E4E4` V running
through it — i.e. the underlying button fill, exactly as predicted by a transparent slit.
**[Screenshot]**

### 2.3 Envelope geometry (normalised, implementation-ready)

Measured from the texture alpha at native 48×32 and confirmed against the screenshot. **[Texture] +
[Screenshot]**

| Feature | Texture (48×32 canvas) | Normalised to envelope box |
|---|---|---|
| Envelope silhouette bbox | x 3–45, y 2–30 (≈41×27 solid) | — |
| Aspect ratio | 41 : 27 | **≈ 1.52 : 1 (essentially 3:2)** |
| Corner treatment | square / very slightly softened | negligible radius |
| V-slit meets left & right edges at | y ≈ 10 | **≈ 26 % down from envelope top** |
| V-slit apex (centre) | (24, 19) | **≈ 59 % down, horizontally centred** |
| Slit width | ~2 px of 48 | ≈ 4 % of envelope width |

Independent screenshot measurement gave the slit meeting the edges at ~25 % down and the apex at
~57 % down — agreement within a pixel of quantisation error at 420-px capture width. **[Screenshot]**

Note the consequence: **the flap's hinge line sits about a quarter of the way down the envelope, not
at the very top edge.** A naive envelope icon drawn with the V starting at the top corners will look
subtly wrong.

### 2.4 Colours

| Element | Value | Source |
|---|---|---|
| Envelope glyph (as rendered) | `#A6A6A6` upper band → `#A1A1A1` lower band | [Screenshot] |
| Envelope source texture | `#FFFFFF` + alpha (tinted at draw time) | [Texture] |
| Button fill — top | `≈ #DFDFDF` | [Screenshot] |
| Button fill — bottom | `≈ #BEBEBE` | [Screenshot] |
| Button fill — gloss highlight (upper-left) | `≈ #E7E7E7` | [Screenshot] |
| Cyan ring — most saturated on-screen sample | `#3ABEEB` | [Screenshot] |
| Cyan ring — source-texture colour | `≈ #1AC3FE` (sampled `(26,195,254)`) | [Texture] |
| Socket / contact shadow just outside ring | `≈ #BBC0C6` | [Screenshot] |
| Bottom-bar background behind button | `#D7D8DD` (very slightly blue-tinted) | [Screenshot] |
| Screen background above the bar | `#EFEFEF` | [Screenshot] |

The on-screen ring reads lighter and less saturated than the texture because it is a thin
antialiased stroke blending into a pale background. **For a web clone, `#1AC3FE` is the colour to
author with; `#3ABEEB` is what a 1-px antialiased render of it looks like.** [Inferred]

### 2.5 Gradient and gloss direction

Sampling the disc reveals the light source is **upper-left**, not straight-down: **[Screenshot]**

- Horizontal scan through the centre: left side `#E7E7E7` → right side `#C0C0C0`.
- Vertical scan through the centre: top `#DFDFDF` → bottom `#BEBEBE`.

So the fill is a **diagonal gradient from upper-left (lightest) to lower-right (darkest)**, with a
distinct soft elliptical **specular highlight in the upper-left quadrant** sitting on top of it. The
WM4K button-base texture (`tex1_80x80_f9e8c70464c02577_3.png`, a plain glossy circle with no glyph
and no ring) shows the same: `(229,229,229)` at the upper-left gloss vs `(205,205,205)` at bottom
and right. **[Texture]**

**The ring is a separate layer from the disc.** The `80x80` bottom-bar circle textures contain
**no** cyan — sampling them for saturation returns a maximum channel spread of 1 (pure grayscale).
The cyan-ringed `80x80` textures in the pack (the `+` and `−` buttons) have their rings baked in and
peak at `(26,195,254)`. **[Texture]** So the bottom-bar Wii/mail buttons compose ring + disc at
runtime — which is convenient, since in CSS the ring is simply a `border` or `box-shadow` on the
disc element. [Inferred]

---

## 3. Proportions and placement

All figures measured from `reference_screen.png` (420×236, 16:9) by locating the cyan ring
pixels of each button. **[Screenshot]**

| Measurement | Mail button | Wii button (left) |
|---|---|---|
| Ring bounding box (x) | 362 – 401 | 19 – 56 |
| Ring bounding box (y) | 178 – 218 | 179 – 217 |
| Diameter | **≈ 40 px** | ≈ 38 px |
| Centre | **(381.5, 198)** | (37.5, 198) |
| Distance from its own screen edge | **38.5 px (9.17 % of width)** | 37.5 px (8.93 % of width) |

### 3.1 Symmetry with the Wii button — confirmed

The two buttons are **mirror-symmetric to within measurement error**:

- **Vertical centres are identical** — both at `y = 198`. Not approximately; exactly.
- **Horizontal insets differ by 1 px** (38.5 vs 37.5 from their respective edges), i.e. 0.24 % of
  screen width — indistinguishable from rounding at a 420-px capture.
- **Diameters differ by 2 px** (40 vs 38), which is the same order as the antialiasing spread on a
  thin ring; the two are almost certainly authored at the same size.

They are also **visually identical in construction** — same disc, same gloss, same cyan ring, same
mid-gray glyph. The only difference is the glyph: `Wii` wordmark vs. envelope. **[Screenshot]**

**Recommendation: build one `<RoundBarButton>` component and pass the glyph in.** The asymmetry
people sometimes remember is not in these two buttons — it comes from the **SD Card Menu icon**,
which is a small squarish glyph sitting *beside* the Wii button on the left, with no counterpart on
the right. [Inferred, consistent with `system-ui.md` §1]

### 3.2 Relative sizing

| Ratio | Value |
|---|---|
| Button diameter ÷ screen width | **9.5 %** |
| Button diameter ÷ screen height | 17 % |
| Envelope glyph width ÷ button diameter | **≈ 53 %** (21 / 40) |
| Envelope glyph height ÷ button diameter | ≈ 35 % (14 / 40) |
| Button centre, as % across screen | 90.8 % |
| Button centre, as % down screen | 83.9 % |

The bottom bar's top edge sits at `y ≈ 177` at screen centre but `y ≈ 171` at the buttons' x —
because the bar is capped by the **cyan divider curve**, which dips lower in the middle (behind the
clock) and rises toward both edges. At the mail button's x, the bar is ~65 px tall, so the button
occupies **~62 % of the bar's height** and its centre sits ~42 % down the bar. **[Screenshot]**

### 3.3 Aspect-ratio caveat — important for a web clone

The System Menu authors its layouts in a **16:9 projection** and squeezes horizontally for 4:3
displays. The decomp shows this explicitly: `TextBalloon::updatePos()` rescales x by
`proj4x3.GetWidth() / proj16x9.GetWidth()`. **[Decomp]** So the *circle stays circular* but
horizontal *positions* compress in 4:3. If the clone is 16:9-only this is moot; if it supports 4:3,
positions — not sizes — are what need adjusting. [Inferred]

---

## 4. The blink / notification state — corrected and greatly expanded

This is the most distinctive behaviour, and it is where existing project docs are **wrong**. The
decompilation resolves it precisely.

### 4.1 Correcting `context/audio.md`

`audio.md` §6 states: *"New mail ... indicated by a **pulsing blue glow** around the Message Board
channel/notification icon plus, per general fan description, **'a pinging sound'**"*, flagged as
fan-consensus-only.

- The **"pinging sound" is corroborated and now has a name**: the System Menu plays the sound effect
  **`WIPL_SE_NEW_ARRIVAL`**, called directly from `Button::startNewMailAnm_()`. The decomp's own
  comment on that line reads `// Play nice jingle`. **[Decomp]**
  (`src/scene/button/iplButton.cpp:761`)
- The **"pulsing blue glow" is not supported by anything I could find**, and I consider it likely
  **incorrect**. No blue-glow asset appears in the Wii Menu texture set; the notification path in
  code drives *layout animation groups* plus a *numeric text pane*, with no glow/bloom material
  involved. It reads like a conflation with the console's physical **disc-slot LED**, which the
  System Menu genuinely does drive on new mail (§4.5). **Recommend removing the "pulsing blue glow"
  claim from `audio.md`, or re-scoping it to the hardware LED.** [Inferred, from absence in
  [Decomp] + [Texture]]

### 4.2 There are TWO distinct animations, not one

This is the key structural finding and no existing project doc captures it. **[Decomp]**
(`src/scene/button/iplButton.cpp:226–235, 730–773`)

| | **Persistent unread signal** | **New-arrival flourish** |
|---|---|---|
| Animation group | `G_BbsSignal` | `G_BbsSignal_new` |
| Internal anim slot | `ANIM_BOARD_BBS_NUM_LOOP` | `ANIM_BOARD_BBS_NEW` |
| Started by | `Button::startMailNumAnm()` | `Button::startNewMailAnm()` |
| Frame range | **1 → 400** | **1 → 160** |
| Duration @ 60 Hz (NTSC) | **≈ 6.67 s per cycle** | **≈ 2.67 s** |
| Duration @ 50 Hz (PAL) | ≈ 8.0 s per cycle | ≈ 3.2 s |
| Playback mode | `ANIM_TYPE_LOOP`, speed 1.0 | `ANIM_TYPE_FORWARD` (one-shot), speed 1.0 |
| Plays a sound? | **No** | **Yes — `WIPL_SE_NEW_ARRIVAL`** |
| Trigger condition | `mailCount != 0` | a *newly arrived* message |
| Stop state | min 0 / max 1 / **speed 0.0** (frozen at frame 0) | same |

So the button's notification behaviour is **two-tier**:

- **Tier 1 — "you have unread mail"**: a slow, silent, continuously looping animation. At **~6.7
  seconds per cycle** this is *much* slower than the word "blink" suggests. It is a **languid pulse,
  not a fast flash.** This is the steady-state you see whenever unread mail exists.
- **Tier 2 — "mail just arrived"**: a short **~2.7 s** one-shot flourish that plays *with* the
  jingle, layered on top of tier 1.

Both are stopped by freezing the animator at frame 0 with **speed 0.0** rather than by hiding a
pane — a detail worth mirroring if you want the "off" state to be the animation's own rest pose
rather than a separately-authored idle. [Inferred from [Decomp]]

### 4.3 The new-arrival flourish repeats on a 3-second timer

`Button::startNewMailAnm_()` does three things — play the animation, play the jingle, and
**`mTimer.set_msec(3000)`**, with the decomp's comment reading
`// Wait for 3 seconds to start the animation again`. **[Decomp]** (`iplButton.cpp:757–764`)

`Button::calc()` then re-fires it every time that timer expires:

```cpp
if (unk_0x104 && !unk_0x105 && mTimer()) {
    startNewMailAnm_();
}
```
(`iplButton.cpp:334–336`)

So while the new-arrival state is active, the flourish **repeats every 3 seconds — and replays
`WIPL_SE_NEW_ARRIVAL` each time.** With a 2.67 s animation on a 3.0 s period, that is a ~2.67 s
flourish followed by a ~0.33 s gap, cycling. **This gives you the exact blink rhythm the task asked
for.**

The `unk_0x105` gate suppresses it; the only callers are in
`src/scene/channelTitle/iplChannelTitle.cpp` (set `true` at :367, `false` at :844) — i.e. **the
repeating flourish and its jingle are silenced while a channel-preview/launch is on screen**, and
resume afterwards. **[Decomp]**

### 4.4 There IS a numeric badge — a genuinely new finding

No existing project doc mentions this. The button carries a **text pane `T_BbsMark1` displaying the
unread message count**. **[Decomp]** (`src/scene/board/iplBoard.cpp:210–241`)

```cpp
if (mMsgCount >= 0) {
    mailCount = 99;
    if (mMsgCount <= 99) { mailCount = mMsgCount; }
} else { mailCount = 0; }

if (mailCount >= 10) { index = 1; numStr[0] = scNumber[(mailCount / 10) % 10]; }
numStr[index++] = scNumber[mailCount % 10];

button->setText("T_BbsMark1", numStr);

if (mailCount != 0) { button->startMailNumAnm(); }
else                { button->stopMailNumAnm();  }
```

Behaviour this pins down exactly:

- The count is **clamped to a maximum of 99** and rendered as **at most two digits**.
- There is **no "99+" affordance** — a 150-message backlog displays as a flat `99`.
- Leading zeros are suppressed (counts under 10 render one digit).
- The count and the tier-1 loop animation are **driven together from the same branch**: non-zero
  count ⇒ badge populated *and* `G_BbsSignal` looping; zero ⇒ animation frozen. So the "blink" and
  the number are one combined notification state, not two independent features.
- The badge is **written by the Board scene into the Button scene**, and is refreshed whenever
  `mbNewMsgAnimCount` is set.

The pane name `T_BbsMark1` (`T_` = TextBox prefix in this codebase, matching `T_Balloon`,
`T_CalExit`, `T_Day_a`) implies a **`Mark`-prefixed graphic pane group** behind it — i.e. a badge
plate/backing that the `G_BbsSignal` animation most likely animates in and out. I could not confirm
the badge's **shape, colour, or position on the button** — that lives in the `.brlyt`, which is not
in the decomp, and `reference_screen.png` shows a zero-mail state so no badge is visible there.
**This is the single biggest remaining visual gap in this doc.** [Inferred + explicit gap]

### 4.5 The physical disc-slot LED

The notification also drives console hardware. `src/scene/board/iplBoard.cpp` calls
`System::getNwc24Manager()->enableLedNotification(FALSE)` / `(TRUE)` around the mail-receive
handling. **[Decomp]** This is the **blue disc-slot light** on the console glowing when WiiConnect24
delivers a message — a real, sourced part of the "you have mail" experience, though obviously not
reproducible in a browser. It is also the most plausible origin of the mis-remembered "pulsing blue
glow" in `audio.md`. [Inferred]

### 4.6 What the official manual says

**[Official]** The printed **Wii Operations Manual — Channels and Settings**
([archive.org `wii-opmanual-chset`](https://archive.org/stream/wii-opmanual-chset/WiiRVKChEng_djvu.txt))
confirms the behaviour but not its mechanics:

> *"This icon will blink if you have a message waiting for you."*

and, on the annotated Wii Menu diagram, the Message Board callout notes it *"will blink when you
have received a message."*

Note the manual says **"blink"** for what the code implements as a ~6.7-second loop. Consumer
documentation using "blink" loosely is exactly why the fan-consensus picture drifted toward a fast
flash. **Trust the frame counts over the word.** [Inferred]

---

## 5. States

### 5.1 Hover / point-at

**[Decomp]** (`Button::startPointEvent()`, `iplButton.cpp:396–426`; frame table at `:63–68`)

On the pointer entering the button:

| Aspect | Value |
|---|---|
| Hover-**in** animation frames | `900 → 906` = **6 frames ≈ 0.10 s @60 Hz** |
| Hover-**out** animation frames | `930 → 938` = **8 frames ≈ 0.13 s @60 Hz** |
| Playback mode | `ANIM_TYPE_FORWARD` |
| Sound | **`WIPL_SE_BT_TARGETTING`** |
| Haptics | **`con->rumble()`** — the Wii Remote gives a short rumble pulse |
| Tooltip | `show_balloon(BALLOON_BBS_BOARD, "B_Bbs")` |

Three things worth noting:

- **Hover-out is deliberately slower than hover-in** (8 frames vs 6). The button snaps to focus and
  relaxes out of it. Easy to replicate and easy to get backwards.
- The **hover sound name is `BT_TARGETTING`** ("button targetting"), corroborating `audio.md` §3's
  claim that hover/focus is its own discrete SFX category — and giving it a confirmed identifier
  where `audio.md` only had a proxy from the Wii Shop Channel.
- Hover **rumbles the Wii Remote.** No project doc mentions this. Irrelevant to a browser build
  unless you want a Gamepad-API flourish, but it is real.

**The hover tooltip ("balloon"):** **[Decomp]** (`iplButton.cpp:715–727`,
`src/scene/textBalloon/iplBalloon.cpp:132–137`, `include/scene/textBalloon/iplBalloon.h:14`)

- Positioned at the button's transformed origin **+50 layout units in Y** (i.e. floating above it).
- Appears only after a **hover dwell of `WAIT_UNTIL_FADE_IN = 15` frames ≈ 0.25 s** — it is *not*
  instant.
- Plays its own sound on appearing: **`WIPL_SE_BALLOON`**.
- Text is string ID `MESG_BUTTON_BBS_BOARD` (= 15), i.e. a localised "Wii Message Board" label.

### 5.2 Pressed / activated

There is **no separate press-down visual state** for this button in the code path. **[Decomp]**
Selecting it goes straight from the hovered state into the scene-transition animation
(`IDANIM_FROM_CH_SEL_TO_BOARD`) on the same frame as the click sound. The click handler
(`src/scene/channelSelect/iplChannelSelect.cpp:2309–2321`) does:

```cpp
mpInstance->setSomething();
mpInstance->mState = ChannelSelect::STATE_START_BOARD_SCENE;
mpInstance->tryToStartBoardScene();
TVRCManager::getHandle()->setEnable(FALSE);
snd::getSystem()->startSE("WIPL_SE_DECIDE");
```

Contrast with launching a **channel**, which does use a distinct push sound `WIPL_SE_BT_PUSH`
(`iplChannelSelect.cpp:1527`). So the mail button gets `DECIDE`, not `PUSH`. **[Decomp]**

For a web clone, an `:active` depress of a few pixels is reasonable **creative licence** but is not
documented behaviour — flag it as such rather than as recreation. [Inferred]

### 5.3 Disabled state (Safe Mode / recovery)

**[Decomp]** Both `startPointEvent()` and `startLeftEvent()` guard with
`(btnNo != BTN_BBS_BOARD || !System::isSafeMode())` — meaning in **Safe Mode the mail button does not
hover at all**: no hover animation, no sound, no rumble, no tooltip.

If clicked in Safe Mode it plays **`WIPL_SE_GRAY_BUTTON`** (a distinct "this is disabled" tone) and
raises dialog `MESG_CHAN_SEL_SAFE_MODE` for 180 frames (3 s) instead of opening the board.
(`iplChannelSelect.cpp:2311–2315`)

The sound's *name* — `GRAY_BUTTON` — is strong evidence that the disabled treatment is a
**desaturated/grayed-out** rendering, matching the documented grayed-out SD Card Menu icon.
[Inferred from [Decomp] + [Official] Ops Manual SD icon text]

---

## 6. Animation on click — closing the `system-ui.md` gap

`system-ui.md` §3 flagged the "flips up like a folder" transition as **[Fan consensus]** with no
primary source, and `component-inventory.md` item 9 ranked closing that gap as priority #4. Here is
how far the decompilation closes it.

### 6.1 What is now confirmed

**[Decomp]** `ChannelSelect::tryToStartBoardScene()` (`iplChannelSelect.cpp:1481–1502`) is the
entire transition trigger:

```cpp
Button* button = getButton();
button->animation(Button::IDANIM_FROM_CH_SEL_TO_BOARD);
if (mbLeftArrowVisible)  { button->animation(Button::IDANIM_ARROW_LEFT_DISAPPEAR);  }
if (mbRightArrowVisible) { button->animation(Button::IDANIM_ARROW_RIGHT_DISAPPEAR); }
button->animation(Button::IDANIM_SD_BUTTON_BTN_OUT);
button->setEventHandler(NULL);
button->get_sd_menu_btn()->setEventHandler(NULL);

mpLayout->setMinFrame(70.0f);
mpLayout->setMaxFrame(90.0f);
mpLayout->setAnmType(ANIM_TYPE_FORWARD);
mpLayout->start();
```

Which yields exact timings:

| Layer | Animation | Frames | Duration @60 Hz | Duration @50 Hz |
|---|---|---|---|---|
| Channel-grid layer (`my_IplTop_a`) | scene-exit | **70 → 90** (20 f) | **≈ 0.33 s** | ≈ 0.40 s |
| Bottom bar (`my_IplTop_e`) | `IDANIM_FROM_CH_SEL_TO_BOARD` | **1000 → 1040** (40 f) | **≈ 0.67 s** | ≈ 0.80 s |
| Page arrows | `ARROW_*_DISAPPEAR` | 10100 → 10110 (10 f) | ≈ 0.17 s | ≈ 0.20 s |
| SD Card button | `SD_BUTTON_BTN_OUT` | (SDMenuButton-local) | — | — |
| **Reverse (board → grid)** | `IDANIM_FROM_BOARD_TO_CH_SEL` | **6000 → 6040** (40 f) | **≈ 0.67 s** | ≈ 0.80 s |

**Four solid new conclusions:**

1. **The transition is ~0.33 s of content motion inside a ~0.67 s bar morph.** The grid clears
   first; the bar keeps morphing for another third of a second after it. They are **deliberately
   desynchronised**, which is a big part of why the transition reads as "unfolding" rather than
   "cutting". This staggering is the most implementation-relevant fact in this whole section.
2. **It is NOT a fade.** The Message Board path issues **no** `Fader` call. The sibling
   **Settings** transition, in the very next `else if` branch of the same handler, explicitly calls
   `System::getFader()->fadeOut()` (`iplChannelSelect.cpp:2325`). `ChannelSelect::calcFadeout()`
   then completes the board transition purely on `!mpLayout->isPlaying(0)` — i.e. **when the layout
   animation finishes**, with no fade gate (`:509–527`). **This definitively rules out
   crossfade/fade-to-black** and is fully consistent with a geometric fold/flip reveal.
3. **The board is a static reveal target, not an animated entrant.** `Board::create()`
   (`iplBoard.cpp:81–101`) builds `my_IplTop_c.brlyt` and binds `my_IplTop_c.brlan`, but starts **no
   entry animation**. The board's only `.brlan` playback is `cmn_start_scroll()` for *day-to-day
   calendar scrolling* (frame table `{30,50}, {0,20}, {100,131}, {60,91}`), which is a different
   feature entirely. **All the transition motion belongs to the channel-grid layer moving away.**
   This corroborates WiiBrew's *"The Wii Message Board is drawn under the Wii Menu"*
   ([WiiBrew](https://wiibrew.org/wiki/Wii_Message_Board)) — the board genuinely sits underneath as
   a static layer and is uncovered. **[Decomp]** + **[Fan/community]**
4. **The bottom bar persists and morphs through the transition.** It is not torn down and rebuilt;
   the same `Button` scene animates from its channel-grid arrangement to its board arrangement,
   which is why the mail button appears to travel/transform rather than disappear.

### 6.2 What is still NOT confirmed

**The direction, axis, and easing remain unverified.** The transform curves live in
`my_IplTop_a.brlan` frames 70–90, a layout binary in console NAND that is **not present in the
decompilation** (the repo contains code only). I searched the entire source tree for
`flip`/`fold`/`rotate` and found nothing relevant — only `flip_xfb()`, an unrelated framebuffer
swap in `iplFramework.cpp`. **[Decomp]**

So, honestly stated:

- **"Flips/folds up like a folder"** remains **[Fan/community]**. I have *bounded* it — it is a
  0.33 s geometric layout animation with no fade, revealing a static layer beneath — but I have
  **not** proven it is a rotation rather than, say, a slide-and-scale.
- **Direction** (up vs. down) is genuinely undetermined by anything I found. Note the two readings
  pull opposite ways: "drawn **under** the Wii Menu" most naturally means *z-order beneath*, but is
  routinely read by fans as *positioned below*. Do not treat either as settled.
- **Easing** is entirely in the `.brlan` curves. Unknown.

**How to actually close this gap** (concrete next step, in priority order):

1. Extract `my_IplTop_a.brlan` from a System Menu 4.3 NAND dump or the `wiimenu1.0U` WAD on Internet
   Archive and read frames 70–90 in **BrawlCrate/BrawlBox** — this is the only route to the *exact*
   transform curves and would settle direction, axis, and easing outright.
2. Failing that, step a screen-capture video frame-by-frame; at 0.33 s you have ~20 NTSC frames to
   inspect, which is plenty to determine the axis.

**Interim recommendation for the clone:** implement as a **CSS 3D rotation about a horizontal axis
over ~330 ms**, with the bottom bar running its own ~670 ms morph on a separate, longer timeline,
and **no opacity fade on either**. That reproduces every property that *is* confirmed, and isolates
the one unconfirmed property (the axis) to a single tunable. Comment it as unverified. [Inferred]

---

## 7. Audio

All three sounds the task asked about are now confirmed **at source level** with exact
identifiers — a significant upgrade over `audio.md`, which had only descriptions.

| Event | Sound identifier | Source |
|---|---|---|
| **Hover / point at** | **`WIPL_SE_BT_TARGETTING`** | `iplButton.cpp:411` **[Decomp]** |
| Hover tooltip appears (after 0.25 s dwell) | `WIPL_SE_BALLOON` | `iplBalloon.cpp:135` **[Decomp]** |
| **Click / select** | **`WIPL_SE_DECIDE`** | `iplChannelSelect.cpp:2320` **[Decomp]** |
| **New mail arrives** | **`WIPL_SE_NEW_ARRIVAL`** | `iplButton.cpp:761` **[Decomp]** |
| Click while disabled (Safe Mode) | `WIPL_SE_GRAY_BUTTON` | `iplChannelSelect.cpp:2314` **[Decomp]** |
| Persistent unread loop | *(none — silent)* | `iplButton.cpp:730–736` **[Decomp]** |

Notes:

- **`WIPL_SE_NEW_ARRIVAL` re-plays every 3 seconds** for as long as the new-arrival state is
  active (§4.3) — it is not a single one-shot. It is suppressed during channel preview/launch.
- The **persistent "you have unread mail" loop is silent.** Only the *arrival* event makes noise.
  This matters: a clone that loops a ping alongside a permanent unread badge would be wrong.
- `audio.md` §8 lists only **two** confirmed `WIPL_SE_*` identifiers (`WII_START`,
  `CHAR_DELETE_ERROR`) and calls a complete catalogue unobtainable. **That is now obsolete** — the
  decomp exposes the full named set. `include/sound/IplSound.rsid` additionally enumerates
  Message-Board-screen sounds by numeric ID: `WIPL_SE_BOARD_SELECT` (24), `WIPL_SE_BOARD_FOCUS`
  (38), `WIPL_SE_BOARD_DRAG` (40), `WIPL_SE_BOARD_UNSELECT` (43), `WIPL_SE_BOARD_DUMP` (54),
  `WIPL_SE_BOARD_HOLD` (55), `WIPL_SE_BOARD_RELEASE` (56). **Recommend updating `audio.md` §8.**
- `audio.md` §3's inference — that hover and select are separate SFX, extrapolated from the Wii Shop
  Channel — is **confirmed correct** for the Wii Menu proper (`BT_TARGETTING` vs `DECIDE`).

---

## 8. Version differences

**Confirmed: the blink-on-new-message behaviour was added in System Menu 3.0.** **[Fan/community,
strong]** [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu) changelog:

> *"The Wii Message Board button will now flash when a message arrives."*

A direct re-fetch of the WiiBrew changelog for this pass returned **exactly one** entry across all
System Menu versions mentioning the message board, mail, envelope, flashing, or notification — the
3.0 line above. So `system-ui.md` §7's claim is confirmed, and there is **no evidence of any
subsequent change** to the notification behaviour in 3.1–4.3.

Caveats to be explicit about:

- **The decompilation is 4.3 only.** Everything in §§1–7 describes System Menu **4.3**. The 400-frame
  loop, the 3-second repeat, the 99-cap badge, and the specific sound IDs are **verified for 4.3 and
  extrapolated backward to 3.0** on the strength of the changelog wording. That extrapolation is
  reasonable but unproven. [Inferred]
- **Pre-3.0 behaviour is genuinely unknown.** The 3.0 changelog says flashing was *added*, so 1.0–2.x
  presumably had a static button — but whether the numeric badge (`T_BbsMark1`) also arrived in 3.0,
  or existed earlier, or arrived later, **is not established by any source I found.** Flagged.
- **No icon redesign found.** I found **no evidence of any visual redesign** of the envelope glyph
  across System Menu versions. The 48×32 envelope texture appears once in the WM4K dump. Note this is
  a **negative finding from absence of evidence**, not proof of no change. [Inferred]
- **Regional variation:** the decomp builds four regional targets (`43U`/`43E`/`43J`/`43K`) from
  shared scene code, so the button's geometry and behaviour are region-independent; only string IDs
  (e.g. `MESG_BUTTON_BBS_BOARD`) localise. Frame-based durations do differ in wall-clock terms
  between 60 Hz and 50 Hz regions (see tables in §4.2 and §6.1). **[Decomp]**
- **System Menu 3.0 also introduced the "Clock display"** per the same WiiBrew changelog — relevant
  to the unresolved `clock.md` ↔ `system-ui.md` date-display contradiction in
  `component-inventory.md` item 11, though outside this doc's scope. **[Fan/community]**

---

## 9. What the Message Board screen itself looks like (brief)

Kept short deliberately — this is a separate component.

**[Official]** From the Wii Operations Manual — Channels and Settings:

- A **calendar** — *"Select a date on the calendar to open the Message Board for that day."*
- A **bulletin-board list of messages**, with two distinct visual states for entries:
  **"New message (Less than 6 hours old.)"** vs **"Message (More than 6 hours old.)"** — i.e. the
  board has a **6-hour freshness threshold** with its own icon treatment. This is a specific,
  officially-documented detail worth capturing in the Message Board component doc.
- Pinned messages have a lit pin: *"The pin will light on newly attached messages."*
- Primary actions: **Reply to messages**, **Open the Calendar**, **Create a message**.

**[Decomp]** Structurally: `SCENE_BOARD` loads `board.ash` → `my_IplTop_c.brlyt` for the board
surface plus `my_BbsMask_a.brlyt` for a **focus mask** with paired
`my_BbsMask_a_MaskIn.brlan` / `my_BbsMask_a_MaskOut.brlan` animations — so **focusing a letter dims
/ masks the rest of the board.** Day-to-day scrolling uses the frame table
`{30,50}, {0,20}, {100,131}, {60,91}` against three scroll panes named `TopBack_a/_b/_c`, implying a
**three-panel horizontally-recycled scroller** for the day view.

Existing coverage in `system-ui.md` §3 (calendar strip, letter list, "Today's Accomplishments",
photo-attachment icons, B-button scroll, LetterBomb trivia) remains accurate and is not repeated
here.

---

## 10. Implementation recommendations for the web clone

Derived from the above; ✅ = confirmed by [Decomp]/[Texture]/[Official], ⚠️ = judgement call.

**Structure**

- ✅ Build **one shared round-button component**; the Wii and mail buttons differ only by glyph (§3.1).
- ✅ Author the envelope as a **single-colour SVG silhouette with a transparent V notch** — one path,
  one fill, no stroke, no second colour (§2.2). Use `currentColor` so the tint is themeable, mirroring
  how the real texture is white-plus-alpha and tinted at draw time.
- ✅ Hold unread state **at app level**, not inside the button (§1).

**Geometry**

- ✅ Button diameter **9.5 % of screen width**; centre inset **9.2 %** from the right edge; vertical
  centre **identical** to the Wii button's.
- ✅ Envelope **3:2**, **53 %** of the button diameter wide.
- ✅ Flap hinge at **26 %** down the envelope, apex at **59 %** — *not* from the top corners.

**Colour**

- ✅ Ring `#1AC3FE`; disc gradient `#DFDFDF` → `#BEBEBE` on a **diagonal (upper-left → lower-right)**
  with a soft upper-left specular highlight; glyph `#A6A6A6`; bar background `#D7D8DD`.

**Motion**

- ✅ Hover-in **100 ms**, hover-out **130 ms** — asymmetric, and easy to get backwards.
- ✅ Tooltip after a **250 ms** dwell, positioned above the button.
- ✅ Unread pulse: **6.7 s loop, silent**.
- ✅ New arrival: **2.67 s flourish on a 3.0 s repeat**, jingle each repeat.
- ✅ Badge: two digits, **hard-capped at 99**, no "99+".
- ✅ Open transition: content **330 ms**, bar **670 ms**, **staggered**, **no fade**.
- ⚠️ Open transition **axis/direction/easing** — pick one, comment it as unverified (§6.2).
- ⚠️ Pressed state — undocumented; any depress effect is creative licence (§5.2).

**Deliberate omissions**

- Wii Remote rumble on hover (§5.1) and the console's disc-slot LED (§4.5) are real but not
  reproducible in a browser.

---

## 11. Gaps and explicit uncertainties

Ranked by how much they would affect a faithful recreation.

1. **The unread-count badge's appearance is unknown.** Confirmed to exist via pane `T_BbsMark1`
   (§4.4), but its shape, colour, size, and position on the button are in the `.brlyt` and are not
   visible in `reference_screen.png` (a zero-mail state). **This is the largest visual unknown in
   this doc.** Resolve with a screenshot/video of a Wii with unread mail, or by opening
   `my_IplTop_e.brlyt` in BrawlCrate.
2. **The open transition's axis, direction, and easing** (§6.2). Bounded but not proven. Resolve by
   reading `my_IplTop_a.brlan` frames 70–90, or by frame-stepping a capture.
3. **What `G_BbsSignal` actually animates.** I have its exact duration and loop mode but not the
   properties it drives — scale? opacity? the badge sliding in? colour tint? Same `.brlyt`/`.brlan`
   extraction resolves it.
4. **Pre-3.0 appearance and behaviour.** Everything verified here is 4.3; backward extrapolation to
   3.0 rests solely on one WiiBrew changelog line (§8).
5. **`audio.md`'s "pulsing blue glow" is probably wrong** (§4.1). I could not find supporting
   evidence and suspect conflation with the disc-slot LED — but I am arguing partly from *absence*,
   so this is a recommended correction rather than a proven refutation.
6. **`nintendo.fandom.com` remains inaccessible** (HTTP 402, second consecutive research pass). Low
   priority now — the decomp supersedes what it was wanted for.
7. **Exact acoustics of `WIPL_SE_NEW_ARRIVAL`** are still undescribed. The *identifier* is confirmed;
   its timbre/pitch is not, and `IplSound.brsar` extraction tooling remains unreliable per
   `audio.md` §8.

---

## Source list

**Primary (new this pass)**

- [koopthekoopa/wii-ipl — Wii Menu decompilation](https://github.com/koopthekoopa/wii-ipl) — System
  Menu 4.3 (43U/43E/43J/43K). Files cited: `include/scene/button/iplButton.h`,
  `src/scene/button/iplButton.cpp`, `src/scene/board/iplBoard.cpp`,
  `src/scene/channelSelect/iplChannelSelect.cpp`, `src/scene/textBalloon/iplBalloon.cpp`,
  `include/scene/textBalloon/iplBalloon.h`, `include/sound/IplSound.rsid`,
  `include/system/MESGEntries.h`.
- [Alan-bur/WM4K — Wii Menu 4K texture pack](https://github.com/Alan-bur/WM4K) — envelope glyph
  `0000000100000002/USA/Wii Menu/tex1_48x32_439cb2f08718e55c_0.png`; button bases
  `tex1_80x80_f9e8c70464c02577_3.png`, `tex1_80x80_32802973ae1739b5_3.png`; cyan-ring reference
  `tex1_80x80_4055fe3dbcf49db8_5.png`.

**Official**

- [Wii Operations Manual — Channels and Settings (Internet Archive, OCR text)](https://archive.org/stream/wii-opmanual-chset/WiiRVKChEng_djvu.txt)
  — item [`wii-opmanual-chset`](https://archive.org/details/wii-opmanual-chset).

**Fan/community**

- [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu) — 3.0 changelog.
- [WiiBrew — Wii Message Board](https://wiibrew.org/wiki/Wii_Message_Board) — *"drawn under the Wii Menu"*.
- [Wikipedia — Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu).

**In-repo**

- `reference_screen.png` (420×236) — direct pixel measurement.
- `context/component-inventory.md`, `context/system-ui.md`, `context/audio.md`.

**Checked, not useful**

- `nintendo.fandom.com/wiki/Wii_Message_Board` — HTTP 402.
- [The Spriters Resource — Wii Menu](https://www.spriters-resource.com/wii/wiimenu/) — only two
  sheets ("Empty Channel Spaces", "Pointer"); no bottom-bar assets.

---

## ADDENDUM (2026-07-29) — envelope construction from the cmnBtn layout decode

See `wii-button.md` ADDENDUM (2026-07-29) for the full `my_IplTop_e.brlyt` decode. Mail-specific
facts, evidence tier **layout bytes**:

- Face is `my_TopBtn_a.tpl` — the blank ball, identical construction to the Wii button.
- The envelope is `BbsMark0`: a 48×32 pane at **pane alpha 180**, texture tinted **grey
  (140,140,140)** by TevColors. Composite over the ~210 face predicts 161; the capture measures
  the envelope body at **161–166** — the construction is verified byte-to-photo.
  Implementable as `fill: rgba(140,140,140,0.706)` over the face rather than a flat opaque grey.
- Fold lines are holes in the glyph (the face shows through, capture ≈ 222), not painted strokes.
- New-mail pulse primitive: `BtnR_a0_BbsSig1` (`my_TopBtn_h.tpl`), scale 1.1, alpha 0 at rest.
- Ring = the 84×84 `_00` plate behind the 80×80 face (not an arc texture); visible ring outer
  ≈ 74–75 stage px, face ≈ 71 stage px after the 70.9/80 artwork fill factor.
