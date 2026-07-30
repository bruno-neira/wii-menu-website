# Component deep-dive: the Wii Remote pointer (the on-screen hand cursor)

**Research date:** 2026-07-24, extended 2026-07-25.
**Second-pass additions —** Part A: §5.4a the 5-frame click delay, §5.5 pinch-latch semantics, §6.1d
the hit-test boundary, §6.3 the 15° tilt confirmed a second time as a literal, §7.1–7.2 the full
B-scroller algorithm and where it is actually used, §9.1 the HOME Menu's separate cursor, §10.4 which
sounds are panned and how. Part B: corrected browser size caps (**Firefox's cap is 32, not 128**, and
the 32 px viewport-containment rule applies to all three engines), `pointerrawupdate` /
`getCoalescedEvents` / `getPredictedEvents`, an honest latency-floor discussion, `forced-colors`,
WCAG precision, the hybrid-device media-query pitfall, Pointer Lock, and a rewritten
screenshot-testing recommendation.
**Scope:** Part A — what the real Wii Menu hand cursor *is* (shape, colours, states, rotation,
smoothing, sound). Part B — how to actually replace the browser cursor with it on the web.

This doc supersedes and considerably deepens `context/animations-interactions.md` §2. Several
claims in that section are **corrected** here on the strength of new evidence — most importantly
the "index finger curls on A-press" fan memory (§5.4) and the assumption that per-player colour
coding exists (§4.3).

---

## 0. Sources and how they are tiered

| Tag | Meaning | Sources used here |
|---|---|---|
| **[Decomp — code evidence]** | Fan decompilation of Nintendo's *actual* System Menu 4.3 binary. Symbol-for-symbol Nintendo logic. Strongest behavioural source available. | `koopthekoopa/wii-ipl` — https://github.com/koopthekoopa/wii-ipl <br>Key files: `include/system/iplPointer.h`, `src/system/iplPointer.cpp`, `src/system/iplPointerCore.cpp`, `src/system/iplController.cpp`, `include/system/iplController.h`, `src/utility/iplUtility.cpp`, `src/system/iplSystem.cpp`, `src/homebutton/HBMBase.cpp`, `include/sound/IplSound.rsid` |
| **[Decomp — layout evidence]** | **Decompiled retail `.brlyt` layout binaries** — the actual pane geometry, material state and colour registers Nintendo authored. Added in the second pass; **strictly stronger than the sprite rip for anything involving colour, size or offset.** | `mkwcat/starling` — https://github.com/mkwcat/starling/tree/master/assets/blyt <br>`P1_Def.brlyt.json5` … `P4_Def.brlyt.json5` (P1/P2/P4 fetched and verified directly during this pass). **Covers `_Def` only** — no `_Cat`, no `my_BScroll_a`. |
| **[Asset — measured]** | Direct pixel measurement of the **ripped cursor texture atlas** from the real console. Objective about *shape*; **silent about colour** — see the caveat below. | *Pointer* sheet, Wii Menu, The Spriters Resource: https://www.spriters-resource.com/wii/wiimenu/asset/167191/ (image: `https://www.spriters-resource.com/media/assets/164/167191.png`, 129 × 259 RGBA PNG). Measured with PIL and, in the second pass, re-measured in-browser via canvas. |
| **[Official]** | Nintendo-authored | Nintendo Support — "Cursor is off-centre, jerky, erratic, disappears": https://www.nintendo.com/en-gb/Support/Wii/Troubleshooting/Wii-Remote-Controllers-amp-Sensor-Bar/Cursor-is-off-centre-jerky-erratic-disappears-etc-/Cursor-is-off-centre-jerky-erratic-disappears-etc-244285.html |
| **[Official/MDN]** | MDN, W3C specs, and browser-engine source | **Specs:** MDN [`cursor`](https://developer.mozilla.org/en-US/docs/Web/CSS/cursor) · [css-ui-4 §cursor](https://www.w3.org/TR/css-ui-4/#cursor) · MDN BCD [`css/properties/cursor.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/cursor.json)<br>**Engine source:** Chromium [`ui/base/cursor/cursor.cc`](https://source.chromium.org/chromium/chromium/src/+/main:ui/base/cursor/cursor.cc;l=93) and [`blink/.../event_handler.cc`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/input/event_handler.cc;l=261) · WebKit [`Source/WebCore/page/EventHandler.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/EventHandler.cpp#L220) · Gecko [`StaticPrefList.yaml`](https://searchfox.org/mozilla-central/source/modules/libpref/init/StaticPrefList.yaml#11403) and [`EventStateManager.cpp`](https://searchfox.org/mozilla-central/source/dom/events/EventStateManager.cpp#4866)<br>**APIs:** [`pointerrawupdate`](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerrawupdate_event) · [`getCoalescedEvents()`](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) · [`@media (pointer)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) · [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)<br>**A11y:** [WCAG 2.2 SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) · [W3C Low Vision Needs](https://www.w3.org/TR/low-vision-needs/) · [Windows](https://support.microsoft.com/en-us/windows/make-windows-easier-to-see-c97c2b0d-cadb-93f0-5fd1-59ccfe19345d) / [macOS](https://support.apple.com/guide/mac-help/change-pointer-display-settings-accessibility-mchl0ec8ce69/mac) pointer settings<br>**Perf:** [web.dev Animations guide](https://web.dev/articles/animations-guide) · **Security rationale:** [CVE-2019-11695 / Mozilla bug 1445844](https://bugzilla.mozilla.org/show_bug.cgi?id=1445844) |
| **[Fan/community]** | Wikis, cursor packs | WiiBrew — Wiimote/Pointing: https://wiibrew.org/wiki/Wiimote/Pointing |
| **[Inferred]** | My reasoning on top of the above | — |

> **Standing caveat about the decomp.** It gives *logic, names, constants and triggers* with near
> certainty. It does **not** ship the layout/animation binaries — those live in `cursor.ash` on the
> console's NAND. So "the cursor has no bound animations" is certain (§5.4); "the rotation pivot is
> the fingertip" is inference (§6.3). The repo is also explicitly WIP and some functions are marked
> `// non-matching`, so treat exact float constants as *very likely* rather than *proven*.
>
> **Standing caveat about the sprite sheet — and it burned this document once already.** It is a
> community rip, not an official release. Its internal consistency with the decomp (exactly two hand
> poses, exactly four numerals, a separate shadow silhouette pair — matching `P*_Def` / `P*_Cat` /
> `N_SRot`) is strong mutual corroboration for *structure*.
>
> **But a texture rip cannot contain material state.** The Wii composites textures through GX TEV
> stages with colour registers, and those registers live in the `.brlyt`, not the `.tpl`. The first
> pass measured the atlas correctly, found it entirely achromatic, and concluded the cursor has no
> per-player colours. **That conclusion was wrong** — the greyscale plates are *tint masks* and the
> colour comes from `tev color 0` (§4.2, §4.3). Two more first-pass figures moved for the same
> reason: the texture is drawn at **0.84** scale (§8) and the shadow has exact recovered values (§3.4).
>
> **Rule going forward: for shape, trust the rip. For colour, size or offset, trust the layout binary.**
>
> **The decomp is cloned locally.** Every `src/...` / `include/...` path in this document resolves
> under `reference/wii-ipl/` in this repository. **Read it from disk** — it is faster and more
> reliable than fetching from GitHub, and the line numbers cited below were taken from the local
> clone (commit as vendored on 2026-07-24).

---

## 1. Naming and architecture (what Nintendo actually called it)

**[Decomp — code evidence]** The cursor system is `ipl::Pointer`, a single global owned by
`System` (`System::getPointer()`), constructed in `src/system/iplSystem.cpp`:

```cpp
smArg.mpPointer = new (getMem1Sys(), 4) Pointer(getMem2Sys());
```

Internally it is a three-layer structure (`include/system/iplPointer.h`):

- **`ipl::Pointer`** — the public façade. Owns the layout archive, visibility, and the on-screen
  B-scroll arrow. Exposes `calc()`, `draw()`, `setState()`, `changeType()`, `setVisible()`.
- **`ipl::PointerCore`** — holds `PointerCoreObject mCursors[WPAD_MAX_CONTROLLERS]` — i.e. **four**
  independent cursor objects, one per Wii Remote channel.
- **`ipl::PointerCoreObject`** — one hand. Holds its layout, state, type and channel.

The header carries an explicit warning that only `ipl::Pointer` is public API:

```cpp
/** @warning Do not use `ipl::PointerCoreObject`, Please instead use `ipl::Pointer` */
```

Nintendo's user-facing vocabulary for the same thing is just **"the cursor"** or **"the pointer"**
([Official] — the Nintendo Support page is titled "Cursor is off-centre, jerky, erratic, disappears").

**Suggested component name for this codebase:** `WiiPointer` (or `WiiCursor`). Props:
`enabled`, `playerNumber`, `pose` (`'point' | 'grab'`), `tiltMode`. See §12 for a full component.

---

## 2. The asset: `cursor.ash` and nine layout files

**[Decomp — code evidence]** `src/system/iplPointer.cpp`, verbatim:

```cpp
#define MIN_LENGTH 32.f
#define MAX_LENGTH 128.f

static const char* scLayoutName[MAX_LAYOUT_FILES] = {
    #define LYT_INVALID_ID     -1

    // Point
    #define LYT_POINT_ID       0
    "P1_Def.brlyt",
    "P2_Def.brlyt",
    "P3_Def.brlyt",
    "P4_Def.brlyt",

    // Grab
    #define LYT_GRAB_ID        4
    "P1_Cat.brlyt",
    "P2_Cat.brlyt",
    "P3_Cat.brlyt",
    "P4_Cat.brlyt",

    // Scroller
    #define LYT_SCROLLER_ID    8
     "my_BScroll_a.brlyt"
};

Pointer::Pointer(EGG::Heap* heap) : ... {
    mpLayoutArchive = System::getNandManager()->readLayout(heap, "cursor.ash");
    for (int i = 0; i < MAX_LAYOUT_FILES; i++) {
        mpLayout[i] = new (heap, 4) layout::Object(heap, mpLayoutArchive, "arc", scLayoutName[i]);
        mpLayout[i]->finishBinding();
    }
}
```

Facts that fall straight out of this:

1. **Everything cursor-related lives in one NAND archive, `cursor.ash`** (ASH-compressed U8 archive).
2. There are exactly **two hand poses**, ×4 players: `Def` (default/pointing) and `Cat`
   (**[Inferred]** almost certainly Japanese-dev shorthand for "**cat**ch" = grab).
3. **There is a separate layout per player number.** This is *why* there are four files per pose —
   the numeral is baked into the layout, not switched at runtime. (§4.)
4. The ninth file is a completely separate widget, the **B-scroll arrow** (`my_BScroll_a.brlyt`), not
   a hand at all. See §7.
5. **`finishBinding()` is called with zero preceding `bind()` calls.** In this codebase
   `layout::Object::bind(...)` is what attaches a `.brlan` animation to a layout
   (`include/layout/iplLayout.h`). Compare `ChannelObj::initCursor()` in
   `src/scene/channelSelect/iplChannelObj.cpp`, which *does* bind three animations. **The hand cursor
   layouts have no animations bound to them at all.** This is the single most consequential finding in
   this document — see §5.4.

The `Pointer` class also exposes a third type that has no layout behind it:

```cpp
enum { TYPE_POINT = 0, TYPE_GRAB, TYPE_UNK2, TYPE_MAX };
```

`get_layout()` only maps `TYPE_POINT`→0 and `TYPE_GRAB`→4; anything else falls through with
`grabId = LYT_INVALID_ID (-1)`. **[Inferred]** `TYPE_UNK2` is dead/unused — most likely a cut third
pose. No call site anywhere in the repo passes it.

---

## 3. Exact visual design (measured from the real texture)

**[Asset — measured]** The ripped atlas is **129 × 259 px**, laid out as a **2 × 4 grid of 64 × 64
cells** (with 1 px gutters). Contents, top-left to bottom-right:

| Cell | Contents |
|---|---|
| (0,0) | **Pointing hand** — white fill, heavy black outline |
| (0,1) | **Closed fist** — white fill, heavy black outline |
| (1,0) | **Pointing-hand shadow** — pure white soft-edged silhouette |
| (1,1) | **Fist shadow** — pure white soft-edged silhouette |
| (2,0) / (2,1) | Numeral overlay tiles **1** and **3** |
| (3,0) / (3,1) | Numeral overlay tiles **2** and **4** |

### 3.1 Silhouette — the pointing (default) hand

**It is a fist with the index finger extended straight up.** Not an open palm, not a "pointing
right" hand. Measured tight bounding box: **43 px wide × 62 px tall** inside its 64 × 64 cell.

Per-row extents (cell coordinates, y down from the cell top):

| y | x-extent | what it is |
|---|---|---|
| 1 | 21–24 | rounded fingertip apex |
| 4–18 | 16–29 | the index finger — a **14 px-wide vertical column** with a rounded cap |
| 20 | 16–35 | first knuckle appears to the right |
| 22 | 16–42 | second knuckle |
| 24 | 16–49 | third knuckle — all three curled fingers now present |
| 36–44 | 10–52 | widest point (43 px) — the fist/palm, thumb bulge on the **left** |
| 50 | 13–50 | narrowing |
| 58 | 20–47 | wrist |
| 62 | 23–44 | flat-ish bottom edge (22 px wide) |

Reading that as a drawing: a chunky **cartoon fist seen from the back of the hand**, three
knuckle-bumps stepping down-right from the base of the index finger, a **thumb bump on the left
side** of the fist, and a slightly narrowed, blunt wrist at the bottom. The index finger is **not**
centred — it sits noticeably left of the hand's centre (finger centre ≈ x22.5 vs hand centre ≈ x31).

### 3.2 Silhouette — the grab (Cat) pose

**[Asset — measured]** Same 43 px width, but only **43 px tall**, occupying y20–62 of its cell —
i.e. **bottom-aligned to the pointing hand, with the extended finger simply removed.** The three
knuckle bumps and thumb are identical. So the two poses share the same fist and differ only by the
finger.

This is important for a web implementation: **the fist does not move between poses.** Draw one fist
and toggle the finger.

### 3.3 Colours and stroke

**[Asset — measured]** The *textures* are **pure achromatic** — every opaque pixel has R = G = B, and
there is no colour anywhere in the cursor atlas.

> ⚠️ **Do not conclude from this that the cursor is colourless.** It is not. The atlas is greyscale
> because the numeral plate is a **tint mask** and the colour is supplied at render time by the
> material's `tev color 0` register — which lives in the `.brlyt`, not the `.tpl`. **The hand body is
> genuinely white; the numeral and the wrist wash are the player colour.** See §4.2–4.3.

- **Fill:** `#FFFFFF`, flat, no gradient in the base sprite.
- **Outline:** `#000000`, hard, with a 1–2 px antialiased ramp (measured intermediate values
  `#111111`, `#222222`, `#333333`, `#444444`, `#666666`, `#888888`, `#AAAAAA`, `#CCCCCC` — a clean
  8-step blend, consistent with a downscaled/antialiased vector original).
- **Outline weight:** **≈3–4 px on a 42 × 62 hand** (measured at the fingertip: rows y2, y3, y4 are
  solid black at x22 before white begins at y5). Best expressed **relative to width**: **≈9.5 % of the
  hand's width**, or `stroke-width: 6` on a 43 × 62 viewBox with the stroke centred on the path.
  This is a *very* heavy outline — it is the single most defining visual trait, and it is what makes
  the cursor read against any background. **Do not thin it.**
- **Gloss/gradient:** **no gloss.** No specular highlight, no bevel, no rim light. The Frutiger-Aero
  gloss of the Wii Menu does *not* extend to the cursor — it is deliberately flat, high-contrast and
  readable. There *is* a soft gradient, but it is the **player-colour wash** rising from the wrist
  (§4.2), not a grey shading pass.

### 3.4 The drop shadow

**[Decomp — code evidence]** The shadow is a real, first-class thing, not a CSS afterthought.
`src/system/iplPointerCore.cpp` rotates it as a separate pane:

```cpp
nw4r::lyt::Pane* pRotatePane       = mpLayout->FindPaneByName("N_Rot");
nw4r::lyt::Pane* pRotateShadowPane = mpLayout->FindPaneByName("N_SRot");

pRotatePane->SetRotate(cursorRotateVec);
pRotateShadowPane->SetRotate(cursorRotateVec);
```

`src/homebutton/HBMBase.cpp` names the same three panes explicitly:

```cpp
const char* HomeButton::scCursorPaneName    = "N_Trans";
const char* HomeButton::scCursorRotPaneName = "N_Rot";
const char* HomeButton::scCursorSRotPaneName= "N_SRot";
```

**[Asset — measured]** The shadow sprites are **pure white, soft-edged silhouettes** of each pose,
**44 px wide × 62 px tall** (pointing) — i.e. **1 px larger than the hand and offset 1 px left**
(x9–52 vs x10–52), with a several-pixel alpha falloff at the edges. Being pure white means they are
**tinted at draw time by the layout's vertex/material colour** — almost certainly to a low-alpha
black.

**[Decomp — layout evidence] The exact shadow values are now recovered**, from the decompiled retail
`P1_Def.brlyt` ([`mkwcat/starling`](https://github.com/mkwcat/starling/tree/master/assets/blyt)) —
this supersedes the "not recoverable from the decomp" note that stood here after the first pass:

| Property | Value |
|---|---|
| Shadow pane | `N_SRot`, translate **`(x: 3.0, y: -3.0)`** relative to `N_Trans` |
| Shadow colour | `P1_DefS` material `tev color 0` = **`rgba(0, 0, 0, 90)`** → **35.3 % black** |
| Shadow texture | `defcursor_sd_a.tpl` (texture index 2) — a separate soft silhouette, not a filter |
| Quad size | **54 × 54** layout units, identical to the hand's quad |

In nw4r's Y-up layout space, `y: -3.0` is **downward on screen**. So the offset is **3 units right and
3 units down** on a 54-unit quad — i.e. **≈5.6 % of the cursor's size in each axis, down-and-right at
45°**. Note the shadow is **not** offset in the artwork; the *pane* is offset, which is why it rotates
about its own origin (§6.3) and the offset stays fixed in screen space while both silhouettes spin.

**[Asset — measured]** The shadow artwork is the hand silhouette **dilated ~1 px** with a soft feather
over ~3–4 px (measured alpha ramp 34 → 136 → 187 → 221 → 255).

**Render order per cursor:** `N_SRot` (soft 35 % black silhouette, offset +3/−3) → `N_Rot` (white hand
+ black outline) → the numeral/gradient tint composited into the same material.

**Web stand-in:** because it is a *separate offset silhouette* rather than a blur filter, the faithful
and cheaper approach is a second SVG `<path>` translated by ~5.6 % of the cursor size in x and y,
filled `rgba(0,0,0,0.353)`, with a small `feGaussianBlur` — **not** `filter: drop-shadow()` on the
rotating element, which re-rasterises every frame (§12.8).

---

## 4. The player-number badge

### 4.1 Where it sits

**[Asset — measured]** The four numeral tiles are 64 × 64 overlays that register **1:1 with the hand
cell**. The digit glyph occupies:

| Tile | glyph bbox (cell coords) | size |
|---|---|---|
| 1 | x30–35, y34–50 | 6 × 17 |
| 2 | x27–38, y34–50 | 12 × 17 |
| 3 | x27–38, y34–50 | 12 × 17 |
| 4 | x26–39, y34–50 | 14 × 17 |

All four share **y34–50** and are horizontally centred on **x ≈ 32.5**. Relative to the 43 × 62 hand
artwork that is:

- **horizontal centre ≈ 52 % of the hand's width** (essentially dead centre of the fist)
- **vertical centre ≈ 66 % of the hand's height**
- **glyph height = 17 / 62 ≈ 27 % of the hand's height**

In plain language: **the numeral is stamped on the back of the fist**, centred, in the lower-middle
of the hand. It is *not* a badge floating beside the cursor, not on the wrist, and not in a bubble.

### 4.2 How it's rendered — a **tint mask**, not a drawn badge

> ⚠️ **This section and §4.3 were rewritten on 2026-07-25 and now say the opposite of what they said
> before.** The first pass concluded from the sprite rip that the cursor is achromatic and that the
> numeral is black. The *pixels* were read correctly; the *conclusion* was wrong, because the colour
> is not in the texture at all — it is in the material's TEV colour register, which a texture rip
> cannot contain. See §4.3. This is a good cautionary example: **a sprite rip shows you the textures,
> not the material state that composites them.**

**[Asset — measured]** In the ripped atlas the numeral tiles look inside-out: the digit is
**alpha = 0 with RGB = 0**, and the surrounding plate is opaque and light. **RGB equals alpha at every
pixel** — the signature of a GameCube/Wii **intensity-only (I8/IA8) texture** that the ripper expanded
into RGBA.

Read as an intensity map, the tile is: **value 255 across the top ~60 %, ramping down to ~187 toward
the bottom, with the numeral punched to 0.**

**[Decomp — layout evidence]** The decompiled retail layout
([`mkwcat/starling`, `assets/blyt/P*_Def.brlyt.json5`](https://github.com/mkwcat/starling/tree/master/assets/blyt))
shows the `P{n}_Def` material binds **two** texture maps, plus a colour register:

| Slot | Texture | Role |
|---|---|---|
| index 0 | `defcursor_final_p{n}.tpl` | the **numeral + gradient tint mask** (the greyscale plate) |
| index 1 | `defcursor_final64_a.tpl` | the **white hand with the black outline** |
| `tev color 0` | — | the **player colour** (§4.3) |

So the intensity map is a **tint amount**, and the correct reading is `tint = (255 − value) / 255`:

| Plate value | Tint | Result |
|---|---|---|
| 255 (top ~60 % of the hand) | 0 % | pure white hand |
| 187 (at the base) | **26.7 %** | player colour washed over white |
| 0 (the numeral glyph) | **100 %** | numeral in solid player colour |

That `(255 − 187)/255 = 26.7 %` figure independently reproduces the **~25–27 % tint at the base of the
hand** measured directly off the composited artwork in a browser during the second pass, and the
resulting bottom-of-hand colour for P1 (`#008CFF` at 27 % over white ⇒ **`#BAE0FF`**) matches the
**`#BEE2FF`** sampled from PrimmR's vector recreation. **Three independent derivations agree**, so the
model is not a guess.

**Practical spec for redrawing:** numeral in the **player colour** at full strength; plus a vertical
linear gradient of the same colour over the lower ~38 % of the hand, from `0 %` alpha at ~62 % height
to `~27 %` alpha at the base. The hand itself stays `#FFFFFF` with a `#000000` outline.

### 4.3 Per-player colours: **they exist, and here they are**

**[Decomp — layout evidence]** `tev color 0` in each `P{n}_Def` material, quoted from the decompiled
retail BRLYTs. I fetched and verified P1, P2 and P4 directly from source during this pass; P3 is from
the same set:

| Player | `tev color 0` (RGBA) | Hex | Colour |
|---|---|---|---|
| **P1** | `0, 140, 255, 255` | **`#008CFF`** | azure blue |
| **P2** | `255, 56, 56, 255` | **`#FF3838`** | red |
| **P3** | `16, 189, 13, 255` | **`#10BD0D`** | green |
| **P4** | `255, 156, 0, 255` | **`#FF9C00`** | orange / amber |

**Corroboration:** sampling PrimmR's independent vector recreation gives
`#008DFF / #FE3839 / #11BD0D / #FF9B00` — **within ±1 per channel** of the decompiled registers. That
is not coincidence; it is two people arriving at the same numbers from different artefacts.

This is the standard **Nintendo player order** (blue → red → green → orange), the same as *Mario Kart
Wii*, *Smash*, Wii U and Switch — so the intuition that "P1 blue, P2 red…" applies here turns out to
be **correct after all**.

> **Do not confuse this with the Wii Remote's player LEDs.** **[Official]** Those are **positional,
> not chromatic** — all four LEDs on every Remote are the *same blue*, and the player number is
> conveyed by *which* LED is lit (leftmost = P1). The colour coding is a **software/on-screen
> convention only.** Both conventions are real; they just live in different places.

**[Decomp — code evidence] Why the code looked like there was no colour.** The first pass reasoned
that nothing in `Pointer` / `PointerCore` / `PointerCoreObject` ever sets a tint per channel — and
that is **true**. It simply is not where the colour lives. The colour is **baked into each of the four
layout files at authoring time**, which is precisely *why* Nintendo shipped four near-identical
`.brlyt`s per pose instead of one layout with a runtime parameter (§2, fact 3). The four-file design
is the evidence for per-player colour, not against it.

**[Inferred] Design implication for a single-player web clone:** draw the **1** in `#008CFF` with the
matching bottom gradient. Faithful is better — the numeral is a large part of what
makes the shape read as "Wii" rather than "generic pointing hand".

---

## 5. States and animation

### 5.1 The two state axes

**[Decomp — code evidence]** `include/system/iplPointer.h`:

```cpp
enum { STATE_NORMAL = 0, STATE_SCROLL };          // drawn / not drawn
enum { TYPE_POINT = 0, TYPE_GRAB, TYPE_UNK2, TYPE_MAX };  // which hand layout
```

`STATE_*` is *not* a visual variant — it is a draw gate. `PointerCoreObject::draw()`:

```cpp
void PointerCoreObject::draw() {
    if (!mpLayout) return;                          // no IR lock → nothing drawn
    if (mState != Pointer::STATE_NORMAL) return;    // scrolling → hand hidden
    mpLayout->draw();
}
```

So when you hold **B** to scroll (§7), the hand **disappears entirely** and is replaced by the arrow
widget. Not dimmed, not faded — gone.

### 5.2 Idle / pointing

`TYPE_POINT`, `STATE_NORMAL`. The default and the initial value set in `PointerCore`'s constructor:

```cpp
PointerCore::PointerCore() : mCursors() {
    int chan = 0;
    for (int i = WPAD_MAX_CONTROLLERS - 1; i >= 0; i--) {
        mCursors[chan].changeType(Pointer::TYPE_POINT);
        mCursors[chan].setChan(chan);
        chan++;
    }
}
```

### 5.3 Hovering an interactive element — **the target changes, the cursor does not**

**[Decomp — code evidence]** Hover is dispatched through the GUI event system
(`include/layout/GUIManager.h`):

```cpp
enum { ON_TRIG = 0, ON_POINT, ON_LEFT, ON_MOVE, ON_DRAG, ON_RELEASE };
```

`ON_POINT` = pointer entered a pane, `ON_LEFT` = pointer left it. Every hover handler in the codebase
animates **the target**, plays a sound and rumbles — none of them touch the cursor. Representative
example, `reference/wii-ipl/src/scene/button/iplButton.cpp:888-900` (verbatim, comments included):

```cpp
void OptOutButton::start_point_event(const char* paneName, controller::Interface* con) {
    if (strcmp(paneName, "B_Stop") == 0) {
        if (mbHovered == FALSE) {
            // Play hover in animation
            mpLayout->getAnim(ANIM_OPT_OUT_FOCUS_IN)->play();
            // Play nice sound
            snd::getSystem()->startSE("WIPL_SE_BT_TARGETTING");
            // Rumble!!... with no null check on `con`.
            con->rumble();
        }
        mbHovered++;
    }
}
```

Channel tiles do the same via `ChannelObj::onPoint()` → `setCursorAnim(1)`, which drives
`my_IplTop_d.brlyt` — **that is the selection *ring* drawn around a channel tile**, confusingly also
called "cursor" internally (`ANIM_CURSOR_FOCUS_ON / FOCUS_OFF / SELECT`). It is a completely separate
object from the hand. Don't conflate them.

Note `con->rumble()` here takes the **default argument 0**, whereas channel-tile hover passes **1**
(§10.3) — so buttons get the 200 ms lockout and channel tiles the 300 ms one. A small difference, but
it means sweeping across the bottom-bar buttons can buzz half again as often as sweeping across
channels.

**Conclusion:** **the hand cursor does not change on hover.** Hover feedback = target animation +
`WIPL_SE_*_TARGETTING` + a rumble pulse. **[Inferred]** The web analogue is: animate the *tile*, play
the blip, and leave the cursor element completely alone. Resist the near-universal web instinct to
scale or glow the cursor on hover — it is the one thing the console definitively does not do.

### 5.4 A-button press — **the finger does NOT curl.** Correcting the fan consensus.

`context/animations-interactions.md` §2 records, as fan consensus, that "on an A press the hand
pointer's index finger curls inward — a brief open-hand → pointing/curled-finger → open-hand cycle."

**[Decomp — code evidence] This does not happen in the Wii Menu.** Three independent lines of
evidence:

1. **No animations exist on the cursor layouts.** `Pointer::Pointer()` calls `finishBinding()`
   without a single `bind()` (§2). There is no `.brlan` attached to `P*_Def` or `P*_Cat`. The hand is
   a static image that can only be translated (`N_Trans`) and rotated (`N_Rot`).
2. **`changeType()` is called from exactly two places in the entire codebase**, and both are
   drag-related, not press-related:
   - `src/scene/channelSelect/iplChannelSelect.cpp` — `startDrag()` → `TYPE_GRAB`;
     `finishDrag()` → `TYPE_POINT` (channel reordering).
   - `src/scene/board/iplBoardObject.cpp` — `TYPE_GRAB` on pinch of a Message Board item,
     `TYPE_POINT` on release.
   A plain A-press (`BTN_INTERACT`) never changes the pose.
3. **`PointerCoreObject::calc()` reads nothing about buttons.** Its entire body is: pick the layout
   for `(chan, type)`, set `N_Trans` translate, set `N_Rot`/`N_SRot` rotation, `calc()`. No button
   state is consulted.

**What people are actually remembering** **[Inferred]** is almost certainly one of:
- the **grab pose** (§5.5) — a genuine open-finger → closed-fist swap, just triggered by A+B, not A;
- the **rumble pulse** on hover/press, which is tactile, not visual;
- the **target's** press animation (`_cntBtn_psh.brlan` etc. on buttons — `psh` = push);
- **other Wii software** — first-party games and later system software did animate their cursors. The
  System Menu specifically does not.

> **Recommendation for this project:** you are building a *feeling*, not a museum piece. A press
> animation is a nice web affordance and I would still implement one — but **know that it is an
> invention**, and if the goal is fidelity, the honest press feedback is *no cursor change at all*.
> Consider a very small scale-down (`scale(0.94)`, 60–80 ms) as a compromise: it reads as "click"
> without asserting a pose that never existed. Make it a flag.

### 5.4a The click itself is delayed by **exactly 5 frames** — and A+B *cancels* it

This is new to this pass and is one of the more useful "feel" findings in the whole document,
because it applies to the *interaction*, not just the cursor art.

**[Decomp — code evidence]** `reference/wii-ipl/src/system/iplController.cpp:19-40`
(`controller::Base::read()`):

```cpp
void Base::read() {
    if (isValidBtn()) {
        if (downTrg(BTN_INTERACT)) { mButton = 1; }   // A pressed this frame → arm
        if (pinch())               { mButton = 0; }   // A+B held    → disarm
        if (mButton != 0) {
            if (down(BTN_INTERACT)) { unk_0x08++; }   // A still held → count frames
            else { unk_0x08 = 0; mButton = 0; }       // A released  → reset
        } else { unk_0x08 = 0; }
    } else { mButton = 0; unk_0x08 = 0; }
    ...
}
```

and `reference/wii-ipl/src/system/iplController.cpp:121-123`:

```cpp
int Base::decide() const { return unk_0x08 == 5; }
```

`Manager::read()` is called **once per frame** from the main loop
(`reference/wii-ipl/src/system/iplSystem.cpp:799`, inside the render/update loop). So:

- **`decide()` is true on exactly the 5th consecutive frame that A is held** — not on the press
  edge. At 60 fps that is **≈83.3 ms after the button goes down**.
- It is a **one-frame pulse** (`== 5`, not `>= 5`). Holding A longer never re-fires it. Holding A
  for 4 frames and releasing fires *nothing*.
- Releasing A resets the counter to 0, so a rapid tap shorter than 5 frames is **swallowed
  entirely**.

`decide()` is the actual activation predicate for the things that matter. In
`reference/wii-ipl/src/scene/channelSelect/iplChannelSelect.cpp` the channel-launch handler is
`case ON_DRAG: if (... con->decide() ...) startChanTtlScene(chanObj);` — i.e. **launching a channel
requires A held for 5 frames**, not a press. The Message Board's focus handler
(`src/scene/board/iplBoardObject.cpp`, `case ON_DRAG`) uses the same predicate.

**[Inferred] Why Nintendo did this.** With a shaky IR pointer, the *press* of A physically nudges
the remote — the cursor jumps a few pixels at the instant of the click. Requiring five frames of
sustained hold lets the pointer settle and, more importantly, gives the A+B disarm
(`if (pinch()) mButton = 0;`) a window to fire first. **Starting a drag cancels the pending click** —
that is what that line is for. Without it, every A+B grab would also register as a click on whatever
was under the cursor.

**[Inferred] Web translation.** This explains the Wii Menu's slightly *deliberate*, un-twitchy click
feel, and it is cheap to reproduce and genuinely worth reproducing:

```js
// Activate on mouse-held, not on mousedown. ~83ms ≈ 5 frames at 60fps.
const DECIDE_MS = 83;
let armed = null;
el.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  armed = setTimeout(() => { armed = null; activate(); }, DECIDE_MS);
});
el.addEventListener('pointerup',     () => { clearTimeout(armed); armed = null; });
el.addEventListener('pointercancel', () => { clearTimeout(armed); armed = null; });
// Starting a drag disarms the pending click — this is the `if (pinch()) mButton = 0` line.
onDragStart(() => { clearTimeout(armed); armed = null; });
```

> **Caveat, and it is a real one.** 83 ms of hold-before-activate is *correct* but it is also
> measurably worse than an instant click on a mouse, where there is no IR jitter to settle. Web
> users have no shaky pointer, so the delay buys nothing and costs responsiveness. **Ship it behind
> a flag, defaulting off**, unless the project explicitly values feel-fidelity over responsiveness.
> The part that is unambiguously worth keeping is the *cancel-on-drag* behaviour.

### 5.5 Grab / drag (A + B held) — a real, distinct pose

**[Decomp — code evidence]** The A+B combination is a named constant,
`include/system/iplController.h`:

```cpp
BTN_INTERACT = REVO_BTN_A | CL_BTN_A,   /* 0x00100800 */
BTN_BACK     = REVO_BTN_B | CL_BTN_B,   /* 0x00400400 */
BTN_DRAG     = REVO_BTN_A | REVO_BTN_B, /* 0x00000C00 */
```

Grab start, `ChannelSelect::startDrag()`:

```cpp
System::getPointer()->changeType(con->getChannel(), Pointer::TYPE_GRAB);
mpMoveLytMask->getAnim(0)->play();
mpMoveLytObject->getAnim(0)->play();
getButton()->disableBtn();
...
snd::getSystem()->startSEwithPos("WIPL_SE_CH_HOLD", mDragPos.x);
mState = STATE_NORMAL_GRAB;
```

Grab end, `ChannelSelect::finishDrag()`:

```cpp
if (isReleasableArea(mMoveNewPage, mMoveNewIndex)) {
    ...
    snd::getSystem()->startSEwithPos("WIPL_SE_CH_SET", mDragPos.x);
    mState = STATE_NORMAL_MOVE_CHAN_IN;
} else {
    snd::getSystem()->startSEwithPos("WIPL_SE_CH_NOT_MOVE", mDragPos.x);
    mState = STATE_NORMAL_RELEASE_WAIT;
}
System::getPointer()->changeType(mConChan, Pointer::TYPE_POINT);
```

**The swap is instantaneous** — a layout switch, not a tween. The visual difference is exactly the
finger disappearing (§3.2). Also note the **positional audio**: `startSEwithPos(..., mDragPos.x)` pans
the sound to the cursor's horizontal position, and during the drag it holds a looping
`WIPL_SE_CH_DRAG` with pan *and* speed: `holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed)`. See §10.4
for the pan mapping.

**How "pinch" is actually latched** — new to this pass. **[Decomp — code evidence]**
`reference/wii-ipl/src/system/iplController.cpp:152-164` (`Revolution::read()`):

```cpp
unk_0x1E = unk_0x1D;                 // previous frame's pinch state
if (isValidBtn()) {
    if (unk_0x1E == 0) {
        if (down(REVO_BTN_A) && down(REVO_BTN_B)) { unk_0x1D = 1; }   // latch ON
    } else if (!down(REVO_BTN_A) || !down(REVO_BTN_B)) { unk_0x1D = 0; }  // latch OFF
} else { unk_0x1D = 0; }
```

So `pinch()` is a **latch with hysteresis, not an instantaneous AND**:

- It turns **on** only on a frame where the pinch was previously off *and* **both** A and B are down.
- It turns **off** as soon as **either** button is released.
- `pinchTrg()` / `pinchOffTrg()` are the rising/falling edges (`unk_0x1D` vs `unk_0x1E`), and
  `pinchTrg()` is what `ChannelSelect` uses to call `startDrag()`.

**[Inferred] Two consequences for a web port.** (1) The **order** of A and B does not matter — you
can press B then A, or A then B, and the drag starts on the frame both are held. (2) Release of
*either* button ends the drag, which is why a Wii user could let go of B and keep A held and the
channel would drop. If the clone maps drag to "hold left mouse button and move", the analogous rule
is: any pointerup or `pointercancel` ends the drag, and you should not require the release order to
match the press order.

**[Decomp] Note on `isValidBtn()`** (`iplController.cpp:177-181`): button reads are gated on the
WPAD error code, so a remote that has dropped its Bluetooth link reports **no buttons held** rather
than sticking. A latched pinch is therefore cleared on disconnect. The web analogue is the
`pointercancel` / `window.blur` handling already in §12.5 — treat both as "release everything".

### 5.6 Off-screen / lost IR tracking — it vanishes instantly

**[Decomp — code evidence]** `PointerCoreObject::calc()` gates on IR validity:

```cpp
void PointerCoreObject::calc(Pointer* pointer, const controller::Interface* pController) {
    mpLayout = NULL;                                    // <-- default is "nothing"
    if (pController && pController->isValidDpd()) {
        mpLayout = pointer->get_layout(mChan, mLayoutType);
        ...
    }
}
```

If the DPD (IR) is invalid, `mpLayout` stays `NULL` and `draw()` returns immediately. **No fade, no
edge indicator, no ghost — the hand simply is not drawn that frame, and reappears the frame tracking
returns.** `isValidDpd()` for a Wii Remote is:

```cpp
bool Revolution::isValidDpd() const {
    return (unk_0x20->wpad_err == 0 || unk_0x20->wpad_err == -7) && unk_0x20->dpd_valid_fg != 0;
}
```

**[Official]** Nintendo's own troubleshooting page attributes cursor disappearance/jerkiness to being
outside 3–8 ft (1–3 m) of the sensor bar and to IR interference (sunlight, heaters, candles) —
consistent with "IR lock lost → cursor gone."

Edge behaviour is separate and is handled in the *position* pipeline, not the draw gate — see §6.4.

### 5.7 Global visibility

**[Decomp — code evidence]** `Pointer::setVisible(bool)` hides all four hands *and* the scroll arrow
at once. Scenes that hide it: `iplHealth.cpp` (Health & Safety screen), `iplBackMenu.cpp`,
`iplChannelTitle.cpp` (during channel boot), `iplLimitOver.cpp`. `System::warning_run()` force-shows
it for the duration of a system warning dialog and restores the previous value afterwards:

```cpp
// Force pointer to be visible, and push it's old state
bool isVisible = System::getPointer()->isVisible();
System::getPointer()->setVisible(true);
... loop ...
if (isVisible) System::getPointer()->setVisible(true);
else          System::getPointer()->setVisible(false);
```

**[Inferred]** Web analogue: the cursor should be hidden during full-screen transitions (channel
launch zoom, boot sequence) and force-shown for any modal dialog.

---

## 6. Position, rotation, smoothing

### 6.1 The full position pipeline

**[Decomp — code evidence]** Three stages.

**(a) KPAD → projection space.** `Revolution::getDpdProjectionPos()` in `src/system/iplController.cpp`:

```cpp
Vec2 src = {unk_0x20->pos.x, unk_0x20->pos.y};   // already-smoothed KPAD position
System::getProjectionRect(&nw4r_rect);
kpad_rect = { nw4r_rect.left, nw4r_rect.top, nw4r_rect.right, nw4r_rect.bottom };
KPADGetProjectionPos(&dest, &src, &kpad_rect, 1.10132f);
if (SCGetAspectRatio() == 1) { dest.x *= 1.15f; dest.y *= 1.15f; }
```

Two magic numbers worth stealing: **`1.10132f`** (the sensitivity/scale argument — the pointer
travels ~10 % *more* than the raw IR range, so you can reach the screen edges without aiming past the
sensor bar) and **`1.15f`** (an extra 15 % gain applied in **16:9** mode).

**(b) Edge clamp.** Immediately after, with a **100-unit overshoot allowance**:

```cpp
// regswap
if      (nw4r_rect.left   - 100.0f > dest.x) dest.x = nw4r_rect.left;
else if (nw4r_rect.right  + 100.0f < dest.x) dest.x = nw4r_rect.right;
else if (nw4r_rect.top    - 100.0f > dest.y) dest.y = nw4r_rect.top;
else if (nw4r_rect.bottom + 100.0f < dest.y) dest.y = nw4r_rect.bottom;
```

So the hand is **allowed to drift up to 100 layout units past the screen edge** (≈16 % of the 608-unit
4:3 width — a lot) before it is snapped back onto the border. This is why the Wii cursor feels like it
"leans off the edge" rather than being hard-walled.

*(The decomp marks this block `// regswap`, meaning the exact instruction ordering is a
reconstruction; the else-if chaining may not be literal. Treat the 100-unit tolerance as solid, the
axis-independence as slightly uncertain.)*

**(c) Layout space.** `utility::get_cursor_pos()` in `src/utility/iplUtility.cpp`:

```cpp
math::VEC2 get_cursor_pos(const math::VEC2& basePos) {
    nw4r::ut::Rect rect16x9; System::getProjectionRect(&rect16x9);      // aspect-dependent
    nw4r::ut::Rect rect4x3;  System::getProjectionRect4x3(&rect4x3);    // always 608 wide
    return math::VEC2(basePos.x * (rect4x3.GetWidth() / rect16x9.GetWidth()), -basePos.y);
}
```

Two things: an **aspect compensation** on X (× 1.0 in 4:3, × 608/832 = **0.7308** in 16:9) and a **Y
axis flip** (KPAD is Y-down, nw4r lyt is Y-up).

Screen rects (`src/system/iplSystem.cpp`):

```cpp
void System::getProjectionRect4x3 (nw4r::ut::Rect* r) { r->left=-304; r->right=304; r->bottom=228; r->top=-228; }
void System::getProjectionRect16x9(nw4r::ut::Rect* r) { r->left=-416; r->right=416; r->bottom=228; r->top=-228; }
```

**The Wii Menu's layout space is 608 × 456 (4:3) or 832 × 456 (16:9), origin centred.** Every measured
pixel figure in §3 is in those units.

**(d) A separate, stricter clamp for hit-testing** — new to this pass, and it matters.
**[Decomp — code evidence]** `reference/wii-ipl/src/layout/iplGuiManager.cpp:17-43`
(`gui::PaneManager::update(int chan)`):

```cpp
nw4r::ut::Rect projRect(0.0f, 0.0f, 0.0f, 0.0f);
System::getProjectionRect(&projRect);

math::VEC2 conProjPos = con->getDpdProjectionPos();
if ((projRect.left > conProjPos.x || conProjPos.x > projRect.right) ||
    (projRect.top  > conProjPos.y && conProjPos.y > projRect.bottom)) {
    conProjPos.y = IPL_MATH_NULL_FLOAT;      // = +infinity (include/math/iplMathTypes.h:19)
    conProjPos.x = IPL_MATH_NULL_FLOAT;
}
::gui::Manager::update(chan, conProjPos.x, -conProjPos.y, ...);
```

So there are **two different boundaries**:

| Boundary | Rule | Effect |
|---|---|---|
| **Drawing** (§6.1b) | 100 units of overshoot allowed past the rect | The hand is still *visible* leaning off the edge |
| **Hit-testing** (here) | zero tolerance — outside the rect at all → position becomes ∞ | The hand *cannot hover or click anything* |

**[Inferred] Web translation:** the cursor element should be allowed to render partially off-viewport
(it looks right, and matches the console), but you should not synthesise hover/hit-test behaviour
from the *smoothed* cursor position at all — hit-testing must use the **real** pointer position from
the browser, which is the default anyway if you keep `pointer-events: none` on the cursor element
(§12.2). This is a good reason **not** to be clever and re-implement hover detection against the
lagged cursor: let the browser hit-test the true pointer, and let the drawn hand lag behind it. That
is exactly the split the console has.

*(Note the `&&` on the Y test where the X test uses `||` — almost certainly a Nintendo bug, since it
makes the Y check unsatisfiable for a normal rect. Flagged rather than "corrected"; it is what the
binary does.)*

### 6.2 Smoothing — Nintendo used the KPAD library defaults

**[Decomp — code evidence]** `KPADStatus` (`libs/RVL_SDK/include/revolution/kpad.h`) already carries
*filtered* values plus their derivatives:

```c
Vec2 pos;        // 0x20   smoothed pointer position
Vec2 vec;        // 0x28   velocity
f32  speed;      // 0x30
Vec2 horizon;    // 0x34   smoothed roll/horizon vector
Vec2 hori_vec;   // 0x3C
f32  hori_speed; // 0x44
f32  dist, dist_vec, dist_speed;
Vec2 acc_vertical;
```

The tuning entry point is `void KPADSetPosParam(s32 chan, f32 x, f32 y);`. A repo-wide GitHub code
search for `KPADSetPosParam` in `koopthekoopa/wii-ipl` returns **only the SDK header declaration — no
call site anywhere in the System Menu.** Likewise there is no `KPADSetHoriParam` call.

**Conclusion [Decomp + Inferred]: the Wii Menu does not tune pointer smoothing at all — it consumes
`KPADStatus.pos` with the library's stock filter.** The System Menu adds **zero** additional
smoothing of its own: `PointerCoreObject::calc()` writes `get_cursor_pos(getDpdProjectionPos())`
straight into `N_Trans` every frame.

So the smoothing everyone remembers is **entirely inside KPAD**, whose implementation is not in this
repo. For the actual algorithm shape we fall back to [Fan/community] WiiBrew
(https://wiibrew.org/wiki/Wiimote/Pointing):

- **Dragging-circle smoothing**, quoted verbatim: *"The software will draw an imaginary circle around
  the new pointing position. If the cursor is outside of this circle, it will immediately drag it to
  lie within this circle. However, if the cursor is already within the circle, it will move it towards
  the circle's center at a speed proportional to the distance from the center."* **WiiBrew gives no
  radius value.**
- **Velocity-adaptive smoothing** (the alternative it names): smooth *more* when the remote moves
  slowly (kills hand tremor while you hold on a target), *less* when it moves fast (keeps flicks
  responsive). Again, no parameters published.

**[Inferred] Web translation.** Both descriptions are the same family. A dragging-circle
implementation is ~8 lines and feels more "Wii" than a plain lerp because it has a dead-ish zone:

```js
// r = circle radius in px; k = ease factor inside the circle
function draggingCircle(cur, target, r, k) {
  const dx = target.x - cur.x, dy = target.y - cur.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return cur;
  if (d > r) {                              // outside: snap to the circle's rim
    const t = (d - r) / d;
    return { x: cur.x + dx * t, y: cur.y + dy * t };
  }
  return { x: cur.x + dx * k, y: cur.y + dy * k };  // inside: ease toward centre
}
```

Suggested starting values for a 1080p viewport: `r ≈ 6–10` px, `k ≈ 0.18–0.25` per frame at 60 fps.
Make `k` frame-rate independent (§12). A plain exponential lerp (`pos += (target - pos) * 0.25`) is a
perfectly good simpler substitute and is what `animations-interactions.md` already recommends.

### 6.3 Rotation / tilt — the signature behaviour

**[Decomp — code evidence]** `src/system/iplPointerCore.cpp`, verbatim, the whole of it:

```cpp
// Rotation
math::VEC2 cursorHorizon(pController->getHorizon());
math::VEC3 cursorRotateVec(0.f, 0.f, nw4r::math::Atan2Deg(-cursorHorizon.y, cursorHorizon.x));
nw4r::lyt::Pane* pRotatePane       = mpLayout->FindPaneByName("N_Rot");
nw4r::lyt::Pane* pRotateShadowPane = mpLayout->FindPaneByName("N_SRot");

pRotatePane->SetRotate(cursorRotateVec);
pRotateShadowPane->SetRotate(cursorRotateVec);
```

So: **`angle_degrees = atan2(-horizon.y, horizon.x)`**, applied as a Z rotation to both the hand and
its shadow. `horizon` is `KPADStatus.horizon` — the accelerometer-derived, KPAD-smoothed "which way is
up" unit vector.

**There is no clamping and no additional smoothing.** The clamp/filter is whatever KPAD already did to
`horizon`. A Remote rolled 90° gives a hand rolled 90°; a Remote pointed straight down gives a hand
pointing down — which is exactly what **[Official]** Nintendo Support says you should see when the
Remote works correctly.

**The resting-tilt constant — a genuinely useful find.** When a **Classic Controller** is used (no IR,
no meaningful roll), `Classic::getHorizon()` returns a hard-coded fallback:

```cpp
math::VEC2 Classic::getHorizon() const {
    if (Revolution::isValidDpd()) { ret.set(unk_0x20->horizon.x, unk_0x20->horizon.y); return ret; }
    else { return math::VEC2(1.0f, -0.2679492f); }
}
```

`atan2(0.2679492, 1.0)` = **exactly 15.000°** (tan 15° = 0.26794919…). **Nintendo's chosen "neutral"
cursor tilt, when there is no roll data to read, is 15 degrees.** That is a strong, citable answer to
"what angle should a mouse-driven Wii cursor sit at?" — see §11.

**And it is confirmed a second time, as a literal, in a completely independent code path.**
**[Decomp — code evidence]** The HOME Menu library keeps its own copy of the cursor system
(§9.1). `reference/wii-ipl/src/homebutton/HBMBase.cpp:1461-1472`:

```cpp
if (pController->wiiCon[i].kpad->wpad_err == WPAD_ERR_OK) {
    nw4r::math::VEC3 vec;
    if (pController->wiiCon[i].use_devtype == WPAD_DEV_CLASSIC &&
        pController->wiiCon[i].kpad->dev_type == WPAD_DEV_CLASSIC) {
        vec = nw4r::math::VEC3(0.0f, 0.0f, 15.0f);            // <-- literal 15 degrees
    } else {
        Vec2 v = pController->wiiCon[i].kpad->horizon;
        f32 rad = nw4r::math::Atan2Deg(-v.y, v.x);
        vec = nw4r::math::VEC3(0.0f, 0.0f, rad);
    }
    ...SetRotate(vec);  // N_Rot and N_SRot, same as the System Menu
}
```

Same condition (Classic Controller ⇒ no roll data), same result, but written **directly as `15.0f`**
rather than as a horizon vector to be `atan2`'d. Two independent Nintendo code paths, one derived and
one literal, both landing on 15°.

**This removes the sign ambiguity too.** Because the HOME Menu path passes `+15.0f` straight into
`SetRotate` as a Z rotation — the same call the System Menu makes with the `atan2` result — the two
are directly comparable, and the System Menu's fallback is unambiguously **positive 15°**, not −15°.
What "positive Z rotation" looks like on screen still depends on nw4r's convention (see the
[Inferred] note below), but the *sign of the number* is now certain rather than reconstructed.

> **Practical upshot:** `rotate(15deg)` is not a stylistic guess for this project. It is the value
> Nintendo hard-coded for exactly the situation a mouse-driven web clone is in: a pointing device
> with no roll axis. Use it (§12.4, Option 1).

**[Inferred]** Sign/direction: `get_cursor_pos` flips Y so the layout space is Y-up; under the
standard convention a positive Z rotation in a Y-up space is **counter-clockwise**, i.e. the fingertip
leans **left**. I am ~80 % confident in that direction — the magnitude (15°) is certain, the sign is
derived rather than observed. If it looks wrong on screen, negate it.

**[Inferred]** Pivot: `N_Trans` is set to the pointer position and `N_Rot` is a descendant pane, so
rotation happens about the pane origin, which must coincide with the point-of-aim — otherwise rolling
the Remote would move where you're aiming, which it demonstrably does not. **Rotate about the
fingertip.** (The exact pane offsets are inside `cursor.ash`; not recoverable here.)

### 6.4 Lost-dot estimation

**[Fan/community]** WiiBrew: when one of the two sensor-bar dots is occluded, the reference algorithm
keeps the last known dot-to-dot distance and reconstructs the missing dot's position from the
accelerometer angle. This is why a partially-occluded pointer *hunts* and jitters rather than cleanly
vanishing. Nintendo's own KPAD presumably does something equivalent (it exposes `dist`, `dist_vec`,
`dist_speed`). No web analogue; flavour only.

---

## 7. The B-scroll arrow (not a hand, but part of `Pointer`)

**[Decomp — code evidence]** Holding **B** on a scrollable surface hides the hand and draws a
stretchy arrow instead. `Pointer::calc()`:

```cpp
if (mScrollState >= SCROLL) {
    nw4r::lyt::Pane* pRootPane   = mpLayout[LYT_SCROLLER_ID]->FindPaneByName("N_BArw");
    nw4r::lyt::Pane* pLengthPane = mpLayout[LYT_SCROLLER_ID]->FindPaneByName("W_BArw");
    nw4r::lyt::Pane* pOriginPane = mpLayout[LYT_SCROLLER_ID]->FindPaneByName("BArwBase");

    pRootPane->SetTranslate(mOriginPos);
    pOriginPane->SetTranslate(mOriginPos);

    nw4r::lyt::Size arrowSize = pLengthPane->GetSize();
    arrowSize.height = IPL_MATH_CLAMP(mArrowLength, MIN_LENGTH, MAX_LENGTH);  // 32 .. 128
    pLengthPane->SetSize(arrowSize);

    // Y Scale:  1.0 = Down     Y Scale: -1.0 = Up
    f32 arrowDirection = (mPointDirection == POINT_DOWN) ? 1.0f : -1.0f;
    pRootPane->SetScale(math::VEC2(1.0f, arrowDirection));

    pRootPane  ->SetVisible(mbCursorScrolling);
    pOriginPane->SetVisible(!mbCursorScrolling);
}
```

Behaviour: press B → the cursor's current position becomes a **fixed anchor** (`setOrigin`,
`BArwBase` shown); drag away from it → an arrow (`N_BArw`) grows from the anchor toward the drag,
**length clamped 32–128 units**, **flipped vertically** for up vs down, and scroll speed follows the
arrow length. Note the two panes are mutually exclusive: `BArwBase` (a bare **origin dot**) is shown
while `mbCursorScrolling` is false, and `N_BArw` (the **stretched arrow**) replaces it the moment
scroll speed becomes non-zero. So the idle state of the widget is a dot, not a zero-length arrow.

### 7.1 The full driver algorithm — `ipl::utility::BScroller`

New to this pass. **[Decomp — code evidence]**
`reference/wii-ipl/src/utility/iplUtility.cpp:51-200`, `include/utility/iplScroller.h:13-46`.

**Acquisition** (`BScroller::calc()`, `iplUtility.cpp:73-107`). Every frame, if no channel currently
owns the scroller (`mState < 0`), it scans channels 0→3 and claims the **first** one that satisfies
*all three*:

```cpp
if (!ctrl->down(controller::REVO_BTN_B))  continue;   // B held
if (!ctrl->isValidDpd())                  continue;   // IR lock valid
if (!isYoungController(chan))             continue;   // and it's the "young" controller
```

On claiming it: records the anchor, sets `STATE_SCROLL` on that channel's hand (**hiding it**, §5.1),
sets `mScrollState = chan`, and sets the arrow origin to the current cursor position.

**Anchor and delta are in normalised DPD space, not layout space:**

```cpp
unk_0x08.x = math::abs_clamp<float>(ctrl->getDpdPos().x, 1.f);   // live position,  clamped to ±1
unk_0x08.y = math::abs_clamp<float>(ctrl->getDpdPos().y, 1.f);
unk_0x10   = unk_0x08;                                            // anchor, captured once
```

`getDpdPos()` is the **raw** KPAD `pos` (±1-ish across the screen), *not* the projected position — so
the pull distance is measured in remote-space, then converted to pixels only for the arrow length.

**Scroll speed is quadratic in the pull distance** (`_get()`, `iplUtility.cpp:149-158`):

```cpp
f32 diff = unk_0x08.y - unk_0x10.y;         // live − anchor, Y only
if      (diff < -0.01f) result = -10.0f * (diff * diff);
else if (diff >  0.01f) result =  10.0f * (diff * diff);
else                    result =  0.0f;      // ±0.01 dead zone
```

Three things fall straight out of this and they are all worth copying:

1. **Y only.** Horizontal pull does nothing. The B-scroll is a purely vertical gesture.
2. **A dead zone of ±0.01** normalised units around the anchor — small hand tremor produces
   *exactly zero* scroll, not a slow creep. This is the single most important detail for feel.
3. **Speed = 10 · Δy², sign-preserved.** Quadratic, so it starts very gently and accelerates hard;
   at full pull (Δy = 1) speed is 10 units/frame, at half pull it is 2.5 — a **4× difference for a
   2× pull**. A linear map feels completely different and noticeably worse.

**Arrow presentation** (`set_arw_param()`, `iplUtility.cpp:163-179`):

```cpp
System::getPointer()->setPointDirection(mSpeed < 0.0f ? 0 /*DOWN*/ : 1 /*UP*/);
f32 arrowLen = math::abs<float>(unk_0x10.y - unk_0x08.y) * rect.GetHeight();   // × 456
System::getPointer()->setArrowLength(arrowLen);
System::getPointer()->setCursorScrolling(math::abs<float>(mSpeed) > 0.0f);
```

The arrow length is the **raw** pull distance scaled by the screen height (456), *then* clamped to
32–128 by `Pointer::calc()`. So the arrow **saturates at a pull of 128/456 ≈ 0.28** normalised
units — roughly a quarter-screen pull — while the *speed* keeps growing quadratically past that
point. The arrow is a coarse indicator, not a linear gauge, and it deliberately stops growing long
before the speed does.

**Losing IR mid-scroll does not cancel the scroll** (`iplUtility.cpp:120-132`) — a genuinely
surprising behaviour:

```cpp
} else {   // still holding B, but isValidDpd() is now false
    if (math::abs<float>(unk_0x08.x) < math::abs<float>(unk_0x08.y)) {
        unk_0x08.y = (unk_0x08.y < 0.0f) ? -1.0f : 1.0f;    // pin to full deflection
        mSpeed = _get();
        set_arw_param();
    }
}
```

If tracking drops while you are pulling, and the pull was predominantly vertical
(`|x| < |y|`), the system **pins the pull to full deflection ±1.0 and keeps scrolling at maximum
speed** until B is released. It does *not* stop. **[Inferred]** This is a deliberate "you aimed off
the sensor bar while flinging the list, so keep flinging" affordance — but note the hand cursor is
simultaneously *not being drawn* (§5.6 — `isValidDpd()` false ⇒ `mpLayout == NULL`). So the user sees
a full-length arrow and no hand, scrolling at max speed. That is the real behaviour.

**Release** (`iplUtility.cpp:110-113`): letting go of B, or the controller becoming null, or losing
"young" status → `setState(STATE_NORMAL)` (hand comes back), `setScrollState(NO_SCROLL)`, full
`init()`. **There is no inertia or fling** — scrolling stops dead on release.

**The scroll tick sound** (`iplUtility.cpp:135-144`) is a genuine ratchet, driven by an accumulator
rather than by time:

```cpp
if (math::abs<float>(mSoundFreq) > 128) {
    snd::getSystem()->startSE("WIPL_SE_B_SCROLL");
    mSoundFreq += (mSoundFreq > 0.0f) ? -128 : +128;    // consume one tick's worth
}
```

`mSoundFreq` is fed by the *consumer* (`FocusObject`, `include/scene/board/iplFocusObject.h:70`:
`mBScroller.addSoundFreq(movable)`) with the number of units actually scrolled that frame — so the
tick fires **once per 128 units of real scroll travel**, regardless of speed. Scroll faster, the
ticks come faster; scroll a pinned list that cannot move, and no ticks fire at all because `movable`
is 0. That last property is why it never chatters at the end of a list.

### 7.2 Where it is actually used — **not** the channel grid

**[Decomp — code evidence]** Call sites for `BScroller` / `YoungBScroller`:

| File | Surface |
|---|---|
| `include/scene/board/iplFocusObject.h:49-108` | **Message Board** — the letter/day list |
| `src/scene/textWriter/iplTextWriter.cpp:100` | the **text writer** (typing a message) |
| `src/scene/letterWriter/iplLetterWriter.cpp:90` | the **letter writer** |

Nothing in `scene/channelSelect/` constructs one. **The channel grid pages with the ◀ ▶ arrows and
the +/− buttons; it has no B-scroll.** This corrects a plausible-sounding but wrong assumption — the
stretchy arrow is a *Message Board* widget that happens to be owned by the global `Pointer` object.

**`isYoungController` gating** (`iplUtility.cpp:194-200`) means **only one specific remote may
B-scroll at a time**:

```cpp
BOOL YoungBScroller::isYoungController(int chan) {
    controller::Interface* p = System::getYoungController();
    return (p != NULL && p->getChannel() == chan) ? TRUE : FALSE;
}
```

Base `BScroller::isYoungController()` returns `TRUE` unconditionally, so the restriction is opt-in
per surface — and the three real surfaces above all use `YoungBScroller`, i.e. all restricted.
**[Uncertain]** What "young" *means* is not recoverable: `controller::Manager` is not decompiled (its
body is `// u8 dummy[0x2F8];` in `include/system/iplController.h:207-209`), so
`getYoungController()` has no visible implementation. The name suggests "most recently connected" and
there is a parallel `getMasterController()`, but **this is a guess**. It does not matter for a
single-cursor web clone.

**[Inferred] Worth building only if the clone grows a Message Board or a settings list.** If you do
build it, the parameters above (±0.01 dead zone, `10·Δy²` speed, arrow saturating at ~0.28 of a
screen height, tick every 128 units of travel, no inertia) are the whole thing.

### 7.3 What the arrow *looks like* is genuinely unknown — a confirmed dead end

Stated plainly so nobody spends another research pass on it. **Its behaviour is fully recovered
(§7.1); its appearance is not, and I am not going to guess at it.**

Exhaustively searched during the second pass, all negative:

- A web search for **`my_BScroll` returns literally zero results** — no forum post, no wiki page, no
  video description, no texture rip.
- **Not on The Spriters Resource.** The "Buttons & Miscellaneous" sheet
  (https://www.spriters-resource.com/wii/wiimenu/asset/68370/) was opened and inspected directly: it
  has the +/− buttons and the small blue page-turn triangles, **but no B-scroll arrow**.
- **`mkwcat/starling` decompiled only the `_Def` layouts**, not `my_BScroll_a`.
- **ThemeMii's `cursor.ash` template deliberately omits `my_BScroll_a.brlyt`** — it exposes 8 of the 9
  layouts. **[Inferred]** This is almost certainly *why* it is undocumented: the theme-modding
  community, which is the source of nearly all Wii asset knowledge, never had a handle on it.

**What is known about its form**, purely from the pane manipulation in `Pointer::calc()` (§7):

- Three panes: `BArwBase` (the anchor marker), `N_BArw` (arrow root), `W_BArw` (the stretchy body —
  its `size.height` is what grows).
- **One graphic serves both directions.** Up vs down is `SetScale(VEC2(1.0f, ±1.0f))` — a **vertical
  mirror, not a rotation** — so the artwork must be symmetric about its horizontal axis in a way that
  survives flipping.
- Only `size.height` is ever written, so **the arrow stretches along one axis only**; a nine-slice or
  a stretchable middle segment is implied, not a uniformly scaled sprite.
- Two-phase visibility: anchor dot alone before movement, arrow alone once scrolling.

**[Inferred] If you build it,** the honest move is to draw something plausible in the Wii's visual
language (white fill, heavy black outline, soft shadow — matching the hand) and **label it in your own
notes as an invention**, exactly as §5.4 does for the press animation. Do not present it as
recovered.

---

## 8. Size on screen

> ⚠️ **Revised 2026-07-25 — the first pass's figures were ~16 % too large.** It assumed the layout
> drew the 64 px texture cell at 64 layout units (1:1) and flagged that assumption as open gap #2.
> **The gap is now closed, and the assumption was wrong.**

**[Decomp — layout evidence]** The decompiled retail `P*_Def.brlyt` gives the actual geometry:

```json5
RootPane   : size 640.0 × 480.0          // the layout canvas
N_Trans    : translate (0, 0)            // ← the pointer position is written here
N_SRot     : translate (3.0, -3.0)       // shadow, offset down-right
N_Rot      : translate (0, 0)
P1_Def     : translate (8.0, -20.0)  size 54.0 × 54.0   // the artwork quad
```

**The 64 × 64 texture cell is drawn into a 54 × 54 quad — a scale factor of 54/64 = 0.84375.** Every
size figure from §3 must be multiplied by it:

| Measure | In texture px | **On screen (layout units)** |
|---|---|---|
| Pointing hand, width | 42–43 | **≈ 35.4** |
| Pointing hand, height | 60–62 | **≈ 50.6** |
| Grab fist, height | 43 | **≈ 36.3** |
| Outline weight | ~4 | **≈ 3.4** |
| Numeral cap height | 17 | **≈ 14.3** |

**[Decomp]** The canvas is **640 × 480** layout units. Note that the cursor's *reachable* rect
(§6.1) is 608 × 456 — **exactly 95 % of the canvas in both axes**, i.e. a uniform 5 % overscan
safe-area inset. Same units, two different rectangles; don't mix them.

| Metric | Value |
|---|---|
| height as % of canvas height | 50.6 / 480 = **10.5 %** |
| width as % of canvas height | 35.4 / 480 = **7.4 %** |
| artwork aspect ratio | 35.4 : 50.6 ≈ **0.70** |

> **Use this:** **cursor height ≈ 10.5 % of viewport height**, width ≈ 7.4 % of viewport height,
> aspect ratio **0.70**.

On a 1920 × 1080 browser window that is **≈ 79 × 113 CSS px** (the first pass said 102 × 147).

**This does not change the Part B verdict.** 113 px is still far above the **32 px** viewport-
containment threshold that all three engines enforce (§12.1), so a `cursor: url()` implementation
would still flicker back to the arrow around the entire window perimeter — and 113 px would be
rejected outright in WebKit and Chromium the moment an OS "large cursor" accessibility setting scaled
it past 128. **`cursor: url()` remains unusable here**; the correction only makes the recommended DOM
follower a little smaller and cheaper.

**Does it scale?** **[Decomp]** In the System Menu, **no.** Nothing in `Pointer`/`PointerCore` ever
calls `SetScale` on a hand pane — only the scroll arrow gets a `SetScale`, and only to flip it.

*But there is one exception, in the HOME Menu* (§9.1). **[Decomp — code evidence]**
`reference/wii-ipl/src/homebutton/HBMBase.cpp:2479-2497` scales the HOME Menu's cursor layouts by the
**TV overscan "location adjust"** factor, in lockstep with the rest of its UI:

```cpp
if (mAdjustFlag) {
    scale = nw4r::math::VEC2(mpHBInfo->adjust.x, mpHBInfo->adjust.y);
    mpLayout->GetRootPane()->SetScale(scale);
    if (!mpHBInfo->cursor) {
        for (int i = 0; i < WPAD_MAX_CONTROLLERS; i++)
            mpCursorLayout[i]->GetRootPane()->SetScale(scale);
    }
} else { /* scale = (1,1), same two writes */ }
```

**[Inferred]** So the cursor's *size* was tied to the screen-safe-area calibration, not held
constant — which is more evidence that the intended mental model is "a fixed fraction of the visible
screen", not "a fixed pixel size". That is the behaviour a `vh`-based web sizing reproduces.

**[Inferred]** The Wii rendered at a fixed 480p-class resolution, so a fixed layout-unit size *was* a
fixed fraction of the screen.
On the web, scaling with `vh` reproduces that; scaling with a fixed `px` does not. **Use `vh`, and
clamp it** — an unclamped 10.5 vh on a 2160-tall display is a 227 px hand, which is comical.
`clamp(64px, 10.5vh, 132px)` for the height is a sane compromise **[Inferred]**.

---

## 9. Multiple cursors

**[Decomp — code evidence]** Four, always allocated, always calculated:

```cpp
void PointerCore::calc(Pointer* pointer) {
    for (int i = 0; i < WPAD_MAX_CONTROLLERS; i++)
        mCursors[i].calc(pointer, System::getController(i));
}

void PointerCore::draw() {
    layout::Object::setDefaultCamera();
    for (int i = WPAD_MAX_CONTROLLERS - 1; i >= 0; i--)   // note: reverse order
        mCursors[i].draw();
}
```

- Each channel's cursor draws only if that channel has a controller with valid IR — so unconnected
  Remotes cost nothing visually.
- **Draw order is reversed (3 → 0), so player 1's hand is drawn *last* and therefore sits on top.**
- Differentiation is **the numeral only** (§4.3).
- Grab type is per-channel: `changeType(int chan, int type)`. Two players can be dragging
  simultaneously, each with their own pose.
- The scroll arrow is a **single shared instance** on `Pointer`, not per-channel — `BScroller` grabs
  one channel (`mState = chan`) and only that player scrolls.

**[Inferred]** For the web clone this is almost certainly out of scope, but it is a cute idea: a
"local multiplayer" mode where extra cursors are driven by e.g. a WebSocket, or a demo cursor that
idles. If you build it, keep `zIndex` descending with player number.

### 9.1 There is a **second, independent** cursor implementation — the HOME Menu

New to this pass. **[Decomp — code evidence]** The HOME Button Menu (`libs`-style middleware living
in `reference/wii-ipl/src/homebutton/`) does **not** use `ipl::Pointer`. It builds and draws its own
four cursor layouts (`HBMBase.cpp:354-361`, `:1234`, `:1306`):

```cpp
const char* HomeButton::scCursorLytName[res::eCursorLyt_Max] = {
    "P1_Def.brlyt", "P2_Def.brlyt", "P3_Def.brlyt", "P4_Def.brlyt",
};
const char* HomeButton::scCursorPaneName     = "N_Trans";
const char* HomeButton::scCursorRotPaneName  = "N_Rot";
const char* HomeButton::scCursorSRotPaneName = "N_SRot";
```

Three things this tells us that the System Menu alone could not:

1. **The `.brlyt` names and the three pane names are a shared contract**, reused verbatim by
   separate Nintendo code against a different resource archive. So `N_Trans` / `N_Rot` / `N_SRot` is
   the canonical Wii cursor rig, not a `Pointer`-specific quirk. Good confidence that a web
   implementation mirroring that three-node structure (translate node → rotate node → art, plus a
   parallel rotate node for the shadow) is structurally faithful.
2. **`eCursorLyt_Max` covers only the four `_Def` layouts — there is no `_Cat`.** The HOME Menu has
   nothing to drag, so the grab pose is genuinely drag-specific rather than a general "button held"
   pose. Independent corroboration of §5.4's conclusion.
3. It also drives the same `KPADGetProjectionPos(&pos, &src, &bound, 1.10132f)` call
   (`HBMBase.cpp:1543`, `:1688`) — the **same `1.10132f` gain constant** (§6.1a) — so that number is
   a platform-wide convention, not a System-Menu tuning choice.

**[Decomp]** `mpHBInfo->cursor` is a caller-supplied flag: when it is set, the HOME Menu **suppresses
its own cursor** (every cursor write in `HBMBase.cpp` is guarded by `if (!mpHBInfo->cursor)`) on the
assumption that the host application is already drawing one. That is how the System Menu avoids two
hands on screen when you open HOME.

**[Fan/community]** This dovetails with the note quoted in `context/components/completeness-sweep.md`
that "the pointer does not blink when closing the HOME Menu on the System Menu" — there is no
handoff between two cursor systems to blink *through*, because the System Menu keeps ownership
throughout.

**[Inferred] Relevance to the web build:** none directly — but if the clone ever implements a HOME
overlay, the correct behaviour is to keep rendering the *same* cursor component above the overlay,
not to mount a second one.

---

## 10. Sound and rumble

### 10.1 Movement is silent — confirmed

**[Decomp — code evidence]** `include/sound/IplSound.rsid` in the decomp is a **complete generated
list of every sound ID in `IplSound.brsar`** — 90 entries. There is **no** `WIPL_SE_POINTER_*`,
`WIPL_SE_CURSOR_MOVE` or anything equivalent. Neither `Pointer`, `PointerCore` nor `PointerCoreObject`
contains a single `startSE` call.

This **corroborates `context/audio.md` §2 conclusively**: *plain cursor motion is silent.* Upgrade
that from "treat as silent unless better evidence surfaces" to **confirmed**.

### 10.2 Hover does blip — confirmed, and now with exact names

**[Decomp — code evidence]** Two distinct hover/"targeting" effects, fired from `ON_POINT`:

| ID | Fired by | Meaning |
|---|---|---|
| `WIPL_SE_BT_TARGETTING` (34) | `src/scene/button/iplButton.cpp` | pointer enters a **button** |
| `WIPL_SE_CH_TARGETTING` (35) | `src/scene/channelSelect/iplChannelSelect.cpp` | pointer enters a **channel tile** |

Two separate IDs for two kinds of target — worth mirroring in the web audio layer.
`context/audio.md` §3's "light metallic click/blip on focus" is confirmed; the naming Nintendo used is
"**targetting**" (their spelling, two Ts).

Other cursor-adjacent IDs from the same list: `WIPL_SE_CH_SELECT` (32), `WIPL_SE_CH_UNSELECT` (33),
`WIPL_SE_DECIDE` (36), `WIPL_SE_CH_HOLD` (62), `WIPL_SE_CH_DRAG` (63), `WIPL_SE_CH_SET` (64),
`WIPL_SE_CH_NOT_MOVE` (65), `WIPL_SE_B_SCROLL` (67), `WIPL_SE_BT_PUSH` (46), `WIPL_SE_CANCEL` (47),
`WIPL_SE_ERROR` (53), `WIPL_SE_GRAY_BUTTON` (57).

### 10.3 Rumble on hover — a detail worth knowing

**[Decomp — code evidence]** `controller::Base::read()` in `src/system/iplController.cpp`:

```cpp
const f32 lbl_8160D2C0[] = {0.2, 0.3, 0, 0};
...
u32 time = OSTicksToMilliseconds(OSGetTick() - mLastRumbleTime);
f32 f1 = (f32)time / 1000.0f;
if      (f1 < 7.0f / 120.0f)        WPADControlMotor(mChan, 1);   // motor ON for 58.3 ms
else if (f1 < lbl_8160D2C0[mRumbleType]) WPADControlMotor(mChan, 0);
```

A hover rumble is a **58.3 ms (7/120 s) motor pulse**, with a 200 ms or 300 ms lockout depending on
type. **[Inferred]** No web equivalent on desktop; the Gamepad Haptics API only applies to connected
gamepads. Mentioned because it explains why Wii hover *felt* like more than a blip.

Both channel-hover call sites pass rumble **type 1** —
`reference/wii-ipl/src/scene/channelSelect/iplChannelSelect.cpp:2079` and `:2276`, each
`snd::getSystem()->startSE("WIPL_SE_CH_TARGETTING"); con->rumble(1);` — so the channel-grid hover
lockout is `lbl_8160D2C0[1]` = **300 ms**. You cannot make it buzz continuously by sweeping the
cursor back and forth across a tile boundary; three hovers per second is the ceiling.

### 10.4 Which sounds are panned by cursor X — and the exact mapping

New to this pass, and directly actionable for a Web Audio implementation.

**[Decomp — code evidence]** The sound façade (`reference/wii-ipl/include/sound/iplSound.h:28,31`)
exposes two positional entry points alongside the plain one:

```cpp
int startSE(const char* sndName);
int startSEwithPos(const char* sndName, f32 pos);          // pan
int holdSEwithPosDis(const char* sndName, f32 x, f32 y);   // pan + "distance"/intensity
```

Grepping every call site in `src/` gives a **short and specific** list. This is the whole set:

| Sound | Call | Panned by | File |
|---|---|---|---|
| `WIPL_SE_CH_HOLD` | `startSEwithPos(…, mDragPos.x)` | **cursor X** at grab | `scene/channelSelect/iplChannelSelect.cpp:2159` |
| `WIPL_SE_CH_DRAG` | `holdSEwithPosDis(…, pos.x, speed)` | **cursor X**, + drag speed | `iplChannelSelect.cpp:2232` |
| `WIPL_SE_CH_SET` | `startSEwithPos(…, mDragPos.x)` | **cursor X** at drop | `iplChannelSelect.cpp:2171` |
| `WIPL_SE_CH_NOT_MOVE` | `startSEwithPos(…, mDragPos.x)` | **cursor X** at failed drop | `iplChannelSelect.cpp:2177` |
| `WIPL_SE_BOARD_HOLD` / `_RELEASE` | `startSEwithPos(…, boardObject->mBoardPos.x)` | **object X**, not cursor | `scene/board/iplBoard.cpp:393,400` |
| `WIPL_SE_BOARD_DRAG` | `holdSEwithPosDis(…, mBoardPos.x + mMoveSpeed.x, speed)` | object X **+ velocity lookahead** | `scene/board/iplBoardObject.cpp:415` |
| `WIPL_SE_MSG_DISP` | `startSEwithPos(…, mBoardPos.x)` | object X | `scene/board/iplBoardObject.cpp:352` |
| `WIPL_SE_MSG_HOUSE` | `startSEwithPos(…, ±300.0f)` | **hard-coded** ±300 | `scene/board/iplBoard.cpp:1095,1116` |

**The important negative result:** `WIPL_SE_CH_TARGETTING` and `WIPL_SE_BT_TARGETTING` — the hover
blips, by far the most frequently heard cursor sounds — are fired with **plain `startSE`**, i.e.
**centred, not panned** (`iplChannelSelect.cpp:2078, 2276`; `scene/button/iplButton.cpp`). So the
correct summary is narrower than "cursor sounds are positionally panned": **only the drag family is
panned.** Hovering is mono/centre no matter where on screen the tile is.

**The mapping.** The `pos` argument is an **X coordinate in layout units**, so its full range is the
projection rect: **−304 … +304 in 4:3**, **−416 … +416 in 16:9** (§6.1c). The `WIPL_SE_MSG_HOUSE`
call passing a literal `±300.0f` — essentially the 4:3 left/right edges — confirms the units.
**[Inferred]** In Web Audio that is a direct mapping to `StereoPannerNode.pan` (−1 … +1):

```js
// x: cursor position in CSS px; w: viewport width.
const panner = new StereoPannerNode(ctx, { pan: 0 });
panner.pan.value = Math.max(-1, Math.min(1, (x / w) * 2 - 1));
src.connect(panner).connect(ctx.destination);
```

**[Uncertain]** Whether Nintendo's `pos` → pan curve was linear, and whether it saturated before the
edge, is **not recoverable** — `snd::System` derives from `EGG::SimpleAudioMgrWithFx` and only
`shutup()` is decompiled (`src/sound/iplSound.cpp` is 10 lines). Assume linear; it is the obvious
choice and nothing contradicts it.

For `holdSEwithPosDis(name, x, y)` the second argument is a **speed/intensity** value, computed in
`iplChannelSelect.cpp:2216-2232` as the magnitude of the per-frame cursor delta
(`speed = val * FrSqrt(val)` where `val = dx² + dy²`, i.e. **|Δ|³**, a very aggressive curve).
**[Inferred]** Map it to gain and/or playback rate on a looping drag sound so that a fast drag is
louder/brighter — cube-law means it stays near-silent for slow drags and ramps sharply, which is
almost certainly the intent (a slow, careful reposition should be quiet).

---

## 11. Asset availability (and why you should still draw your own)

| Source | Licence | What's there | Notes |
|---|---|---|---|
| ⭐ **`mkwcat/starling` — decompiled retail BRLYTs** <br>https://github.com/mkwcat/starling/tree/master/assets/blyt | GPL-2.0 (code) — the TPLs are extracted Nintendo art | `P1_Def.brlyt.json5` … `P4_Def.brlyt.json5`: the **actual retail layout geometry, materials and colours** in readable JSON5 | **The single best source in this table, and new to the second pass.** It supplied the 640 × 480 canvas, the `N_Trans → {N_SRot, N_Rot}` chain, the 54 × 54 quad at (+8, −20), the (+3, −3) / 35 % shadow, and the four player hexes. **Read it as spec; do not ship the art.** Only `_Def` was decompiled — no `_Cat`, no `my_BScroll_a`. |
| ⭐ **`koopthekoopa/wii-ipl`** <br>https://github.com/koopthekoopa/wii-ipl | **CC0-1.0** | **No assets at all** — README states it "does **not** contain any assets or assembly of the executable whatsoever" | Code/behaviour only, which is what makes it safe to cite freely. Cloned locally at `reference/wii-ipl/`. |
| **The Spriters Resource — Wii Menu → "Pointer"** <br>https://www.spriters-resource.com/wii/wiimenu/asset/167191/ | Nintendo art, unlicensed rip | The ripped atlas: 2 hand poses + 2 shadow silhouettes + 4 numeral plates, 129 × 259 PNG | Best *artwork* reference. Direct image: `.../media/assets/164/167191.png`. **403s bare fetchers — a browser `User-Agent` gets through.** ⚠️ **The numeral plates are stored with inverted alpha** (opaque plate, digit punched out) *and* are tint masks, not final art (§4.2) — invert and tint before comparing. |
| ⭐ **WiiBrew "Wii Homebrew Cursors"** <br>https://wiibrew.org/wiki/Wii_Homebrew_Cursors | **PUBLIC DOMAIN** (author's grant on the page, June 2010, supersedes the LGPL note in the bundled readme) | 96 × 96 alpha PNGs on the same 640 × 480 canvas: pointer, drag, open hand, **per-player 1–4 variants**, a **B-button cursor**, and shadows for every type | **The only genuinely licence-clean set.** File: `https://wiibrew.org/w/images/1/1d/Wii_homebrew_cursors_1.1a.rar`. ⚠️ **Its hotspot is the centre (48,48) and it rotates about the centre — the retail cursor does neither** (§6.3). Do not inherit its pivot. |
| **Dolphin "WM4K" 4K texture pack** <br>https://github.com/Alan-bur/WM4K | **No LICENSE file** | Upscaled Wii Menu textures, ~1 GB. Pointer at `0000000100000002/USA/Pointer` — exactly 7 files at 64 × 64, matching the 7 non-shadow TPLs in `cursor.ash` | Useful for seeing the shapes at high resolution. Predecessor thread: https://forums.dolphin-emu.org/Thread-hd-wii-menu-texture-pack . The Dolphin *wiki* custom-texture pages now 404; current guide: https://forums.dolphin-emu.org/Thread-how-to-install-texture-packs-custom-textures-info |
| **PrimmR — Wii Pointer Cursors** <br>https://primmr.dev/projects/wii-pointer-cursors/ | ⚠️ **None stated** — treat as all-rights-reserved | High-quality vector recreation, all four colourways, SVGs offered | Independently corroborated the player hexes to ±1 per channel (§4.3). "Credit would be appreciated" is a request, not a grant, and there is no repo or LICENSE. **Permission is probably obtainable by asking** — worth doing if you want a shortcut. |
| **Theme tooling** <br>ThemeMii https://wiibrew.org/wiki/ThemeMii · CustomizeMii https://wiibrew.org/wiki/CustomizeMii · MyMenuify https://wiibrew.org/wiki/MyMenuify | — | Tools that repack `cursor.ash` | Confirmed the archive path `/layout/common/cursor.ash` (ASH|U8, root `arc/` with `arc/blyt/` + `arc/timg/`) and the TPL names. **ThemeMii's template exposes only 8 of the 9 layouts — it deliberately omits `my_BScroll_a.brlyt`**, which is why that widget is undocumented everywhere (§7). |
| **Real themes that retexture the cursor** <br>https://github.com/4rft5/WiiDarkTheme · https://github.com/emilydaemon/synthwiive_theme | Unlicense (synthwiive) | Working examples of a replaced `cursor.ash` | Useful if you want to see what the layout tolerates. |
| **rw-designer / custom-cursor.com** <br>https://www.rw-designer.com/cursor-set/wii-cursor-by-stefano-tinaglia · https://custom-cursor.com/en/collection/games/nintendo-wii-hand | Unclear | Fan `.cur`/`.ani` packs | Fan redraws of varying accuracy; the "idle/busy variants" they list are Windows cursor-role conventions, **not** Wii states. Do not treat their state list as evidence about the Wii. |

**Dead ends, recorded so nobody re-searches them:** The Textures Resource has a Wii Menu page but
reports **"Assets 0"**. **Wikimedia Commons has no Wii pointer at all.** There is **no open-licensed
Wii pointer SVG on GitHub**. There is **no WiiBrew page for `cursor.ash`**. A search for
`my_BScroll` returns **literally zero results** anywhere on the web.

### 11.1 Existing web recreations — nobody has built this properly

**[Fan/community]** Surveyed during the second pass. **None** uses SVG, **none** has a separate shadow
layer, **none** renders the player numeral, **none** has the B-scroll arrow, and only one rotates:

| Project | Technique | Rotation |
|---|---|---|
| [wii.dupa.gay](https://wii.dupa.gay/) ([write-up](https://dupa.gay/blog/2025-03-12-0)) | DOM follower, `position: fixed`, PNG hotlinked from archive.org | **Yes — but from mouse velocity, not roll:** `atan2(j,k)*(180/π)*0.3`, lerped 0.1/frame. Also fakes IR latency by hit-testing the *delayed* point. |
| [rekky1aws/wii-menu-recreation](https://github.com/rekky1aws/wii-menu-recreation) | DOM follower, `<img>` at `e.x+5, e.y+5`; **3 PNG states** swapped on hover + mousedown | No |
| [andrewplus/Wii.JS](https://github.com/andrewplus/Wii.JS) | Native `cursor: url(cursor.png), auto`; shadow baked into the PNG | **Impossible** — README even notes shadow-transparency bugs |
| [danintosh/Wii-Menu-HTML](https://github.com/danintosh/Wii-Menu-HTML) | `cursor: url()` at 7 selectors | No |

Checked and found to have no cursor at all: `cornetespoir/wii-menu-page`, `booper1/Wii-UI`,
`M4rc3lv/WiiMenu`.

**[Inferred] Two things to take from this.** (1) The `cursor: url()` projects are the ones with no
rotation and no layered shadow — **direct empirical support for §12.3's recommendation**. (2)
`wii.dupa.gay` independently arrived at *velocity-driven rotation* (§12.4 Option 2) and at
*deliberately lagging the hit-test*. The rotation is an invention (§12.4); **the lagged hit-test is
actively wrong** — the console hit-tests the true pointer position, not the drawn one (§6.1d). Do not
copy that part.

> **Recommendation — draw your own SVG.** The shape is simple (one fist outline, one finger, one
> numeral, one gradient) and §3 gives you every measurement needed to redraw it faithfully. Shipping
> Nintendo's ripped texture in a public repo is both a legal risk and unnecessary. Use the rip on
> screen, beside your SVG, as a visual diff target — never in `src/`.
>
> **Redraw spec, ready to use.** Draw in **texture space** (`viewBox 0 0 43 62`) — it is the space
> every §3 measurement is in — and let CSS scale the whole thing to 10.5 vh (§8). Do *not* redraw at
> 35 × 51; you would just be pre-applying the 0.84375 factor and losing precision.
>
> - **Silhouette:** fingertip apex at `(12.5, 0)`; index finger a vertical column x `6→19`, y `0→19`,
>   rounded cap; knuckles step in at y20 (to x25), y22 (to x32), y24 (to x39); widest point y36–44,
>   x `0→42` with the thumb bump on the left at x0; bottom edge y62, x `13→34`.
> - **The finger is perfectly vertical** — rows y8 and y14 have identical spans. No lean.
> - **Fill** `#FFF`; **stroke** `#000` at `stroke-width: 6` centred (≈3 px visible each side —
>   ~9.5 % of the hand's width; this heavy outline is *the* defining visual trait, do not thin it).
> - **Numeral** in the **player colour** (P1 `#008CFF`), glyph box centred at `(22.5, 41)`, cap
>   height `17`; bold, slightly condensed geometric sans (Helvetica/Arial Bold).
> - **Bottom tint:** linear gradient of the *same player colour*, `0 %` alpha at y≈38 → `27 %` alpha
>   at y62. (§4.2 — not a grey shading gradient.)
> - **Shadow:** duplicate silhouette, filled `rgba(0,0,0,0.353)`, translated `(+3.6, +3.6)` in this
>   viewBox — that is the retail `(+3, −3)` on a 54-unit quad converted to texture units
>   (`3 × 64/54 = 3.56`) — with a ~3 px feather. Draw it **first**, beneath the hand.
> - **Grab pose:** identical, minus the finger, `viewBox 0 0 43 43`, **bottom-aligned** to the
>   pointing hand (both are 42–43 wide and share a bottom edge, so the fist must not jump on swap).
> - **Hotspot and rotation pivot are the same point:** the fingertip, `(12.5, 0)`.

---

# PART B — Implementing a custom cursor on the web

## 12.1 Approach A — `cursor: url()`

**[Official/MDN]** Syntax (https://developer.mozilla.org/en-US/docs/Web/CSS/cursor):

```css
cursor: url("hand.png") 12 0, auto;
```

```
<cursor-image> = [<url> | <url-set>] <number>{2}?
```

- The two numbers are the **hotspot**, in *image pixels*, **relative to the image's top-left corner**,
  clamped to the image bounds. If omitted, read from the file (`.cur`) or defaulting to top-left.
  For our hand: `12 0`.
- **A keyword fallback at the end is mandatory.** `cursor: url(x.png);` is *invalid* and the whole
  declaration is dropped. `cursor: url(a.svg), url(b.png) 4 4, auto;` is valid — the list is tried in
  order.
- **Formats:** MDN, quoting the spec — *"User agents are required by the specification to support PNG
  files, SVG v1.1 files in secure static mode that contain a natural size, and any other non-animated
  image file formats that they support for images in other properties. Desktop browsers also broadly
  support the `.cur` file format."* Animated SVG is a *should*, not a *must*.
- **`url()` support** (MDN BCD `css/properties/cursor.json`): Chrome 1, Edge 12, Firefox 1.5 (macOS
  from Firefox 4), Safari 3, **Safari iOS 13.4**. The **`x y` positioning syntax** is separately
  tracked and is **`false` on Safari iOS** — "If this value is used, the iPad will display the
  `default` pointer instead."
- **SVG cursors — better than the folklore, but still not citable to a version table.** MDN documents
  the requirement, and Chromium's code explicitly branches on `image->IsSVGImage()`. BCD tracks no
  `svg` subfeature for `cursor`, so there is no official per-version table. **[Inferred, from release-branch
  source diffing]** `SVGImage` handling is **absent** from `event_handler.cc` at Chrome 80 and 85 and
  **present** at 86 and later, which puts Chromium SVG-cursor support at roughly **Chrome 86
  (Oct 2020)**. Treat that as a strong inference, not a cited fact — it comes from comparing source
  branches, not from a changelog or bug entry (Chromium's gitiles history now 403s without sign-in).
  **The common advice that "Chrome doesn't support SVG cursors" is stale.**
- **SVG cursors require an intrinsic size** — an explicit `width`/`height` on the root `<svg>`.
  Support for SVG *without* a natural size is only a spec "may". A `viewBox` alone is not enough.
- **Animated GIF does not animate.** Blink snapshots a single frame
  (`image->AsSkBitmapForCurrentFrame(...)`). Animated SVG is a spec *"should"*, not a *"must"*. There
  is **no reliable way to animate a `cursor: url()`** — another reason Approach A cannot express the
  press/grab states.
- **No CORS gate.** None of the three engines' cursor code paths check origin — they check only
  "did the image decode". Cursor images are ordinary CSS image subresources (no-cors fetch), so
  cross-origin cursor images load fine. The restrictions that matter are size and viewport
  containment, not origin.

### The size caps — the numbers, from engine source

This is the part that kills Approach A for this project.

| Engine | Constant | Behaviour |
|---|---|---|
| **Chromium/Blink** | `kMaximumCursorDIPSize = 128` in `ui/base/cursor/cursor.cc` (`Cursor::AreDimensionsValidForWeb`) | Anything **> 128 × 128 DIP** is rejected and the declaration is skipped — silently, moving to the next item in the cursor list. |
| **Chromium/Blink** | `kMaximumCursorSizeWithoutFallback = 32` in `third_party/blink/renderer/core/input/event_handler.cc` | For cursors **> 32 DIP** in either dimension, Blink additionally computes the cursor's rect and **drops it entirely if it is not fully contained in the visual viewport**. The comment: *"For large cursors below the max size, limit their ability to cover UI elements by removing them when they are not fully contained by the visual viewport."* |
| **WebKit** | `const int maximumCursorSize = 128;` in `Source/WebCore/page/EventHandler.cpp` | *"Limit the size of cursors (in UI pixels) so that they cannot be used to cover UI elements in chrome."* — over 128 → `continue` (skip this cursor). **And WebKit applies the containment check to *every* url() cursor regardless of size:** `if (!visibleContentRect.contains(cursorRect)) continue;` |
| **Gecko/Firefox** | **No 128 constant in current source.** The limit is the pref `layout.cursor.block.max-size`, **default 32** ([`StaticPrefList.yaml`](https://searchfox.org/mozilla-central/source/modules/libpref/init/StaticPrefList.yaml#11403)) | Cursors larger than the pref are blocked **only if** the cursor rect is not fully inside the top-level content viewport (`ShouldBlockCustomCursor`, [`EventStateManager.cpp`](https://searchfox.org/mozilla-central/source/dom/events/EventStateManager.cpp#4866)). |

> **Correction to the widely-repeated "128 × 128" figure — including MDN's own prose.** MDN's page
> says *"on Firefox and Chromium cursor images are restricted to 128x128 pixels by default."* MDN's
> **browser-compat-data** for the same property says something different: *"Starting in Firefox 67,
> the maximum size allowed for custom cursors is 32x32 pixels."*
> ([BCD `css/properties/cursor.json`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/cursor.json))
> Reading the engine source resolves the contradiction: **there are two different thresholds, and
> people collapse them into one.**
>
> - **128** is the absolute *reject* threshold — and it exists only in **Chromium and WebKit**.
> - **32** is the threshold above which **all three engines** additionally require the cursor's
>   bounding box to be **entirely inside the viewport**.
>
> The practical consequence is the one that actually bites: **a cursor larger than 32 px reverts to
> the keyword fallback whenever it approaches a screen edge.** You get a visible flicker back to the
> arrow all around the perimeter of the window. In **WebKit this is worse still** — the containment
> check sits *outside* the size branch, so **every** `url()` cursor of any size is dropped near an
> edge.

**Why these limits exist** — worth knowing, because it means they will never be relaxed. This is
anti-**cursorjacking** hardening: a large cursor bitmap whose visible arrow is far from its actual
hotspot lets a page make clicks appear to land on browser chrome. See
[Mozilla bug 1445844 / CVE-2019-11695](https://bugzilla.mozilla.org/show_bug.cgi?id=1445844); Blink's
own comment is *"Limit the size of cursors so that they cannot be used to cover UI elements in
chrome."* MDN adds that *"cursor changes that intersect toolbar areas are commonly blocked to avoid
spoofing."*

**No engine shrinks an oversized cursor.** The spec says a UA "must" scale proportionally if the OS
limits cursor size ([css-ui-4](https://www.w3.org/TR/css-ui-4/#cursor)), but all three engines simply
`continue` — silently skipping that `<cursor-image>` and moving to the next entry, ultimately the
mandatory keyword. Nothing is resized, and nothing is logged.

**DPI interaction.** Chromium applies the cap in **DIP**, computed as
`ceil(physical_px / image_scale_factor)`, where the factor comes from `StyleImage::ImageScaleFactor()`.
For a plain `url(x.png)` that factor is **1** — so **a 200 × 200 PNG is rejected even on a 2× display.**
The escape hatch is `image-set()`, which sets the factor explicitly:

```css
/* 256px bitmap counts as 128 DIP → accepted; the hotspot is scaled by the same factor. */
cursor: image-set(url(hand@2x.png) 2x) 64 16, pointer;
```

SVG is handled differently in both Chromium and WebKit: the scale is multiplied by the device scale
factor and the SVG is rasterised at native resolution, so **SVG cursors are crisp on HiDPI** and the
128 cap applies to the CSS-px intrinsic size.

Also from Blink: `static constexpr base::TimeDelta kCursorUpdateInterval = base::Milliseconds(20);`
— *"Set to 50Hz, no need to be faster than common screen refresh rate."* **Native cursor-shape updates
are throttled to 50 Hz**, so a `cursor: url()` that swaps images on state change has up to 20 ms of
built-in latency. And Chromium multiplies custom cursors by `cursor_accessibility_scale_factor_`
(Gecko: `LookAndFeel::FloatID::CursorScale`) — an **OS accessibility "large cursor" setting can push a
legal 100 px cursor over the cap and make it vanish for exactly the users who most need to see it.**
(§12.6 revisits this: the same fact is an *argument in Approach A's favour* on accessibility grounds.)

**Verdict on Approach A.** The authentic cursor is **≈79 × 113 CSS px at 1080p** (§8 — revised down
from the first pass's 102 × 147 once the layout's 0.84 texture scale was recovered). That is **under**
the 128 reject threshold, so unlike the first pass's conclusion it would not be rejected outright at
default settings — **but it still fails**, three ways:

1. At **113 px it is far over the 32 px containment threshold**, so it reverts to the keyword arrow
   near every window edge in **all three** engines — and in WebKit at any size at all.
2. An OS **"large cursor" accessibility setting** multiplies it past 128 and it vanishes entirely
   (Blink's `cursor_accessibility_scale_factor_`), for exactly the users who most need to see it.
3. **Rotation is impossible** — you would need a pre-rendered image per angle, swapped at a 50 Hz
   ceiling — and so is the layered shadow and the live player-colour tint.

**`cursor: url()` cannot do what this project wants.** The size correction narrows the margin; it does
not change the answer.

*(Where it **is** the right tool: a small, static, non-rotating cursor ≤ 32 × 32. If you want a
low-cost "Wii flavour" fallback, ship a 32 × 32 PNG of the hand for reduced-motion / low-power users —
see §12.6.)*

## 12.2 Approach B — `cursor: none` + a DOM element that follows the pointer

```css
html.wii-cursor, html.wii-cursor * { cursor: none; }
```

**[Official/MDN]** `cursor: none` — Chrome 5, Edge 12, Firefox 3, Safari 5. **Not supported on Safari
iOS** (BCD: `safari_ios: false`). Note the `, * ` — `cursor` inherits, but any element that sets its
own `cursor` (`pointer`, `text`, a library's `grab`) will override it, so you need the universal
selector or you get a native cursor flickering back on buttons and inputs.

### Why naive versions feel laggy, and the fixes

1. **Animating `top`/`left`.** These are layout properties: every mousemove triggers layout →
   paint → composite for the whole document. Use `transform: translate3d(x, y, 0)` — a
   compositor-only property. This is the single biggest win.
2. **Writing to the DOM inside the event handler.** `pointermove` fires *"at a very high rate"*
   (MDN) — on a 1000 Hz mouse that can be far more often than you paint. Worse, mixing a style write
   with any read (`getBoundingClientRect`, `offsetWidth`) in the same handler causes forced synchronous
   layout ("layout thrash"). **Store the coordinates in a ref in the handler; write the transform in a
   `requestAnimationFrame` loop.** One write per frame, always aligned with paint.
3. **React state.** Never put cursor coordinates in `useState` — that is a full render tree
   reconciliation per mouse move. Use `useRef` + direct `el.style.transform`.
4. **`will-change: transform`.** Promotes the element to its own compositor layer up front, so the
   browser doesn't re-promote/demote it. Set it once on a permanently-visible element (this is the
   textbook legitimate use; the usual "don't overuse `will-change`" warning is about applying it to
   many elements).
5. **The smoothing is a feature here.** Because we *want* Wii-style lag (§6.2), the rAF loop isn't a
   compromise — the interpolation is the point.

### `pointermove` vs `mousemove`

**Use `pointermove`.** **[Official/MDN]** It is Baseline / widely available since July 2020, unifies
mouse/pen/touch, and gives you `event.pointerType` so you can *ignore touch* in one line:

```js
if (e.pointerType === 'touch') return;
```

That alone justifies it. `mousemove` on a touchscreen fires synthesised events after a tap, which
makes a custom cursor teleport around on mobile.

Three extras worth knowing:

- **`event.getCoalescedEvents()`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents))
  returns the sub-frame samples the browser merged into this event. MDN: *"Instead of a stream of many
  `pointermove` events, user agents coalesce multiple updates into a single event… there is a
  reduction in the granularity and accuracy when tracking, especially with fast and large movements."*
  For a drawing app you want all of them; **here you want only the last one**, which is the freshest
  position available this frame:

  ```js
  const list = e.getCoalescedEvents?.();
  const s = list?.length ? list[list.length - 1] : e;   // freshest sample
  target.current.x = s.clientX; target.current.y = s.clientY;
  ```

  Support: **Limited availability, not Baseline**, secure context only — hence the `?.` and fallback.

- **`pointerrawupdate`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerrawupdate_event))
  — raw, un-coalesced, higher-frequency updates, *"intended for applications that require
  high-precision input handling."* **Chromium-only, not Baseline, secure context required**, and MDN
  explicitly warns *"listening to `pointerrawupdate` events can affect performance… add these
  listeners only if your JavaScript needs high-frequency events."* For a cursor whose output is capped
  at one draw per frame, the gain is real but small — it gets you the freshest sample *within* the
  frame. Feature-detect and fall back:

  ```js
  const moveEvent = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';
  ```

  **[Inferred]** For this project, marginal. The cursor is deliberately smoothed (§6.2), so
  sub-frame freshness is being thrown away downstream anyway. Reach for it only if the owner drops the
  smoothing and wants maximum responsiveness.

- **`getPredictedEvents()`** (same MDN page) returns the UA's **extrapolated future** positions. It is
  the only standard mechanism that can put a DOM follower *ahead* of its last known position, i.e.
  partially cancel the structural lag below. It **overshoots on direction changes**, so use it for the
  visual only and **never** for hit-testing. **[Inferred]** Mutually exclusive in spirit with the
  Wii-authentic smoothing — you would be predicting forward and then lerping backward. Pick one.

- **`setPointerCapture()`** — relevant if you build channel drag-and-drop, so the drag keeps receiving
  events when the pointer leaves the element.

### The latency floor — be honest about this

The native cursor is composited by the **OS/window server**, on most platforms as a hardware cursor
plane, entirely outside the browser's rendering pipeline; the renderer only *tells* the browser
process which cursor to show. A DOM element must go input → renderer main thread → style → composite
→ GPU → display. **It is structurally at least one frame (≈16.7 ms at 60 Hz) behind, usually more**,
and it does not benefit from the OS's above-vsync cursor update rate.

**[Uncertain]** I could not find a primary source that *quantifies* the delta — no reachable
Chromium/WebKit design doc states a number. Treat "one to three frames behind" as an engineering
expectation, not a cited fact.

> **The tension this project has to resolve, stated plainly.** General custom-cursor advice says
> *never add easing or trailing* — it deliberately adds lag on top of a technique that is already
> structurally laggier than native. But §6.2 establishes that the real Wii pointer **was** smoothed
> (inside KPAD), and the lag is a defining part of the feel. **Both are true.** The DOM follower's
> ~1–3 frames of unavoidable lag is *added to* whatever smoothing you dial in — so a lerp factor
> tuned by eye on a native cursor will feel noticeably heavier here. **[Inferred] Start the smoothing
> weaker than feels right** (`k` toward 0.3–0.4 rather than 0.18) and let the structural lag supply
> the rest, rather than stacking the two. And expose it as a constant you can tune, because this is
> the single parameter most likely to need adjusting against a real capture.

### Leaving and entering the window

Handle three cases:

| Event | Meaning | Do |
|---|---|---|
| `pointerleave` / `mouseleave` on `document.documentElement` | pointer left the viewport | hide the cursor element (`opacity: 0`) |
| `pointerenter` / `mouseover` | pointer came back | **snap** position (skip the smoothing for one frame) then show — otherwise the hand visibly flies in from wherever it was |
| `blur` on `window` | tab/window lost focus (alt-tab, devtools) | hide |

Also `document.visibilitychange` → hide and **stop the rAF loop** when hidden (browsers throttle rAF
in background tabs anyway, but stopping it is cleaner).

**[Inferred]** Nice touch of authenticity: the real cursor *vanishes instantly* when IR tracking is
lost (§5.6). So `opacity: 0` with **no** transition on leave is actually *more* faithful than a fade.

### `pointer-events: none`

Mandatory. Without it the cursor element sits under the physical pointer and swallows every click,
hover and `:hover` style on the page. It also breaks `document.elementFromPoint`. Add it to the
cursor element **and** any child.

## 12.3 Which approach — recommendation

**Use Approach B (`cursor: none` + DOM follower), unconditionally, for this project.**

Reasoning, against the three stated requirements:

| Requirement | `cursor: url()` | DOM follower |
|---|---|---|
| **(a) fairly large** (≈79 × 113 px at 1080p) | **Unusable.** Under the 128 reject threshold, but far over the **32 px** containment threshold → reverts to the arrow all around the window edge in all three engines, and vanishes entirely under an OS large-cursor setting. | Unlimited. |
| **(b) possibly rotate** | **Impossible** without pre-rendering N images and swapping — and shape swaps are throttled to 50 Hz. | `transform: rotate()` on the compositor, free. |
| **(c) change state on press** | Possible (`:active { cursor: url(fist.png) }`) but with up to 20 ms latency and a decode hitch on first use. | Instant, and animatable. |

Secondary wins for B: you get the **smoothing/lag** (§6.2) which is a defining characteristic and is
flatly impossible with `cursor: url()`; you get the **rotating drop shadow** (§3.4) as a real layer;
and you can render the **player numeral** as live text rather than four PNGs.

**Be honest about what the recommendation costs.** On one axis — respecting OS pointer-accessibility
settings — **Approach A is the better technique and Approach B is strictly worse** (§12.6.1):
`cursor: url()` still gets the user's accessibility scale applied by the engine; a DOM follower
bypasses size, colour, contrast and trails entirely, and **nothing in CSS can even detect that it has
done so**. This recommendation is "Approach A is technically incapable of the requirement, so we take
Approach B and pay an accessibility cost we cannot fully mitigate" — not "Approach B is better."
The user toggle in §12.6.6 is the only real remedy, which is why it is not optional.

The rest of the cost is everything in §12.6 (accessibility) and §12.9 (pitfalls). Budget for those —
they are not optional extras.

**Hybrid worth considering [Inferred]:** ship a 32 × 32 `cursor: url()` hand as the *fallback* for the
cases where the DOM cursor is disabled (reduced motion, user toggle off, low-end device). It stays
under every cap, needs no JS, and still reads as "Wii".

## 12.4 Rotation on the web — the options, with trade-offs

The real trigger (Wii Remote roll, §6.3) **has no mouse equivalent**. There is no way to recover it.
So this is a design decision, and the project has to make it. Four defensible options:

**Option 1 — Fixed 15° tilt (recommended default).**
Set `rotate(15deg)` (counter-clockwise, fingertip leaning left) and never change it.
- *For:* It is **Nintendo's own number**, and as of the second research pass it is confirmed **twice,
  independently** (§6.3): derived from the `Classic::getHorizon()` fallback vector in the System Menu,
  and written as a bare literal `15.0f` in the HOME Menu's own cursor code. Both fire under exactly
  the condition a web clone is permanently in — *a pointing device with no roll axis.* This is not an
  invention or a stylistic guess; it is the documented "no roll available" answer, twice over.
- *For:* Zero cost, zero motion, immune to `prefers-reduced-motion` concerns, deterministic for
  screenshot tests.
- *Against:* Loses the liveliness people remember.

**Option 2 — Velocity/direction-driven tilt.**
Map horizontal (or full 2D) pointer velocity to an angle, e.g.
`angle = clamp(vx * k, -25, 25)`, smoothed, with a spring back to 15° at rest.
- *For:* Reads as physical and playful; genuinely feels Wii-like in motion.
- *Against:* **It is an invention.** The real cursor's angle is completely independent of where the
  pointer is going — you can roll the Remote while holding still, and sweep across the screen with
  zero roll. This can read as *wrong* to someone who remembers the console.
- *Against:* Needs careful damping or it wobbles; needs a `prefers-reduced-motion` opt-out.
- *If you take it:* keep the range small (±15–25° around a 15° rest), smooth the angle with the same
  lerp as position, and treat it as a stylistic flourish, not a recreation.

**Option 3 — No rotation (0°).**
- *For:* Simplest; matches the raw sprite as authored.
- *Against:* The Wii cursor is *never* seen at a perfect 0° in practice (nobody holds a Remote
  perfectly level), so a bolt-upright hand actually looks less authentic than the tilted one.

**Option 4 — Device orientation on mobile.**
`DeviceOrientationEvent.gamma` is a literal roll angle. Faithful in spirit!
- *Against:* Mobile has no cursor at all (§12.7), requires a permission prompt on iOS
  (`DeviceOrientationEvent.requestPermission()`), and is a solution looking for a problem. Mention it
  only as a possible easter egg on a "point at the screen" demo page.

**My recommendation:** ship **Option 1** as the default (15°, static, honest, cheap), and put
**Option 2** behind a settings toggle labelled as a stylistic extra. Do not do Option 3.

## 12.5 Press state

```js
const onDown = (e) => { if (e.button === 0) pressRef.current = true;  };
const onUp   = ()  => { pressRef.current = false; };
window.addEventListener('pointerdown', onDown);
window.addEventListener('pointerup',   onUp);
window.addEventListener('pointercancel', onUp);   // don't forget this one
```

Keeping it responsive:
- Listen on `window` (capture phase optional) so a `stopPropagation()` deep in the tree can't
  swallow it, and so `pointerup` outside the original element still resets the pose.
- **Do not** route it through React state if you can avoid it — flip a class or a CSS custom property
  directly on the element inside the rAF loop. A `useState` round-trip adds a render before the visual
  change.
- **Apply the pose change immediately, not on the smoothed position.** Position lags (deliberately);
  the pose must not.
- `pointercancel` matters: on a trackpad-with-touch or when the browser takes over the gesture, you
  get `pointercancel` and never a `pointerup`, leaving the cursor stuck in the pressed pose.

What the pose *should* be — see §5.4. Authentic answer: **nothing changes on plain click**; the fist
is for **A+B drag**. If you want click feedback anyway, prefer `scale(0.94)` for 70 ms over a pose
swap, and reserve the fist for actual drags (`pointerdown` + movement over a channel tile).

**When the click should *fire* is a separate question — see §5.4a.** The console does not activate on
the press edge; it activates on the **5th consecutive frame** A is held (≈83 ms), and **starting a
drag cancels the pending activation**. The cancel-on-drag half is worth implementing unconditionally
(it is what stops a channel-reorder drag from also counting as a channel launch). The 83 ms delay is
authentic but costs responsiveness for no benefit on a jitter-free mouse — put it behind a flag,
default off.

## 12.6 Accessibility and UX — the honest version

This is where custom cursors earn their bad reputation. Be straight about it:

**A custom cursor is a genuine accessibility regression, and there is no way to make it a neutral
one.** The mitigations below reduce the harm; they do not eliminate it.

0. **What WCAG actually says: nothing directly.** Worth stating so nobody argues from a criterion
   that doesn't apply. **[Official]** [SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
   governs the **target** (≥ 24 × 24 CSS px), not the pointer — though it is *indirectly* relevant
   here, because a ~100 px hand makes precise aiming harder, so generous hit targets matter more in a
   Wii-style UI than they otherwise would. [SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
   requires 3:1 for "user interface components" and "graphical objects"; its Understanding document
   does not address author-supplied cursors. **[Inferred]** A replacement cursor is arguably a
   graphical object required to operate the page, so hold it to 3:1 against every background — which
   the Wii hand's heavy black outline and drop shadow already achieve by design (§3.3–3.4). **There is
   no success criterion that prohibits a custom cursor, and none that requires an opt-out.** The case
   for one (point 6) is a real-harm argument, not a compliance argument. Do not let anyone tell you
   otherwise in either direction.
1. **Users depend on the native cursor — and this is the one harm you cannot mitigate.** Operating
   systems let people enlarge the pointer, recolour it, outline it, add trails, or shake-to-locate it,
   precisely because pointer visibility is a real access need:
   [Windows](https://support.microsoft.com/en-us/windows/make-windows-easier-to-see-c97c2b0d-cadb-93f0-5fd1-59ccfe19345d)
   (pointer colour/size, pointer trails), [macOS](https://support.apple.com/guide/mac-help/change-pointer-display-settings-accessibility-mchl0ec8ce69/mac)
   (pointer size, outline/fill colour, shake to locate). W3C names it explicitly as a low-vision user
   need: *"Increase the size of the mouse pointer, which is usually done at the operating system
   level"* ([Accessibility Requirements for People with Low Vision](https://www.w3.org/TR/low-vision-needs/)).

   **The asymmetry that matters:** `cursor: url()` **still gets the OS accessibility scale applied**
   (Blink's `cursor_accessibility_scale_factor_`, Gecko's `LookAndFeel::FloatID::CursorScale` — §12.1).
   A `cursor: none` + DOM follower **bypasses all of it**: size, colour, high-contrast pointer and
   trails are simply gone. So on this specific axis **Approach A is the more accessible technique and
   Approach B is the less accessible one**, which is the honest cost of the recommendation in §12.3.

   **And there is no way to detect it.** There is no media query for "the user has enlarged or
   recoloured their pointer." You cannot adapt; you can only offer the toggle in point 6.

   *Note also:* people with motor impairments often move the pointer in small corrective increments —
   **and our smoothing (§6.2) actively fights that.** Lag that reads as charming to one user reads as
   "the computer is not responding to me" to another. This is the strongest argument for §12.6.6.
2. **`prefers-reduced-motion`.** The smoothing/lag *is* motion — an element moving independently of
   the user's input is exactly the class of thing the query is for. Under
   `@media (prefers-reduced-motion: reduce)`, drop the interpolation to 1:1 (`k = 1`), disable any
   velocity-driven rotation, and disable press animations. **[Inferred]** Also consider treating
   reduced-motion as a signal to fall back to the native cursor entirely — it is a reasonable, and
   defensible, reading.
   Docs: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

   **[Inferred] But be precise about what counts.** MDN describes the query as detecting a preference
   *"to minimize the amount of non-essential motion."* **1:1 cursor tracking is not non-essential
   motion** — it is the pointer doing its job, and disabling it would be absurd. What must go under
   `reduce` is everything *added*: the smoothing/lag, any velocity-driven rotation (§12.4 Option 2),
   press animations, idle bobbing, trails. The distinction is "motion the user did not command"
   versus "motion that is the user's own input rendered."

2a. **`forced-colors` / Windows High Contrast — a specific, concrete failure.** **[Official/MDN]** In
   forced-colors mode the UA overrides `color`, `background-color`, `border-color`, `outline-color`
   and SVG `fill`/`stroke`; **`box-shadow` and `text-shadow` are forced to `none`**; and
   `background-image` is forced to `none` for non-`url()` values
   ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)).

   For this cursor specifically that means an **inline SVG hand loses its white fill and black
   stroke, and the drop shadow disappears** — i.e. the exact two features (§3.3, §3.4) that make it
   legible. You would ship a shape that is invisible or wrong for users who have deliberately asked
   for a constrained palette. A `url()`-based `<img>`/`background-image` survives the override, but
   that is the wrong lesson. **The right response is to disable the custom cursor entirely:**

   ```css
   @media (forced-colors: active) {
     .wii-cursor { display: none; }
     .wii-cursor-active, .wii-cursor-active * { cursor: auto; }
   }
   ```

   A forced-colors user has explicitly configured a pointer they can see. Give it back to them. This
   is the cheapest high-value accessibility fix in this entire section and the reference
   implementation in §12.10 should include it.
3. **Visibility against all backgrounds.** The Wii's own solution is the ~3 px black outline plus a
   drop shadow (§3.3, §3.4) — that is *why* it is drawn that way. Keep both. Do not "modernise" the
   cursor into a thin-stroked or flat-white shape; it will disappear over the light-blue Wii Menu
   gradient. If you add a dark theme, verify against the darkest surface too — a white hand on a black
   background loses its shadow and needs the outline to carry it.
4. **Don't break text selection.** `cursor: none` on `*` also kills the I-beam, so users lose the
   affordance that tells them text is selectable. Options: swap the hand for a Wii-styled I-beam over
   text, or (simpler and safer) **exempt text-bearing regions**: `:where(input, textarea, [contenteditable]) { cursor: auto; }`
   and hide the DOM cursor while over them.
5. **Don't break form inputs or focus indicators.** Forms need their native cursors (text, pointer,
   `not-allowed` on disabled controls). And `pointer-events: none` is *not* enough on its own — make
   sure the cursor element is not focusable (`tabindex="-1"` is unnecessary if it's a plain `div`, but
   do add `aria-hidden="true"` so screen readers never announce it) and that it does not sit above a
   focus ring in a way that obscures it. Keyboard users get no cursor at all, which is correct — but
   make sure the cursor doesn't reappear at a stale position on the next keystroke.
6. **Provide an escape hatch. Yes, this is best practice.** A visible, persistent toggle ("Use normal
   cursor") that restores the native pointer, remembered in `localStorage`. Reasons: it costs almost
   nothing; it is the only genuine mitigation for points 1 and 4; and it turns an imposed change into
   a choice. Put it somewhere thematically appropriate (a Wii Settings-style panel) so it doesn't
   spoil the aesthetic. **[Inferred]** Default the toggle **on** (Wii cursor) — the whole point of the
   site — but honour `prefers-reduced-motion` as an automatic opt-out on first visit.
7. **Never hide the cursor without replacing it.** If the JS fails to load or throws, `cursor: none`
   applied from a stylesheet leaves the user with *no pointer at all*. **Apply `cursor: none` from
   JavaScript** (add a class to `<html>` in the effect), so the CSS-only state is always the native
   cursor. This is a genuine "site is unusable" failure mode and it is trivially avoidable.

## 12.7 Touch devices

There is no cursor on a touchscreen, and rendering one is actively harmful (it appears where the last
tap was, lags behind scrolls, and covers content).

**Detect capability, not device.** Use media queries, not user-agent sniffing:

```js
// true for mouse/trackpad/pen: a pointing device that can hover accurately
const hasFinePointer = window.matchMedia('(any-pointer: fine) and (any-hover: hover)').matches;
```

**[Official/MDN]** ([`@media (pointer)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer)) —
`pointer`/`hover` describe the **primary** input; `any-pointer`/`any-hover` describe **any available**
input.

- `(pointer: coarse)` — the *primary* input is imprecise (finger).
- `(pointer: fine)` — the primary input is accurate (mouse).
- `(any-pointer: fine)` — *some* input is precise.

**The hybrid pitfall, stated precisely — this is the common bug.** On a laptop with a touchscreen,
`(pointer: fine)` matches (mouse is primary) **and `(any-pointer: coarse)` also matches** (a touch
device exists). Therefore:

- Gating **off** with `@media (any-pointer: coarse)` **wrongly disables the cursor on every
  touchscreen laptop.** Do not do this — it is the single most common way this goes wrong.
- Gating **on** with `(pointer: fine) and (hover: hover)` is the correct *static* test, but it stays
  on while such a user is actually touching the screen.

**So use both layers.** CSS sets the initial state; JS `pointerType` tracks the live one:

```css
@media (pointer: coarse), (hover: none), (forced-colors: active) {
  .wii-cursor { display: none; }
  .wii-cursor-active, .wii-cursor-active * { cursor: auto; }
}
```

```js
// Live switching: handles a touchscreen laptop correctly in BOTH directions.
const onAnyPointer = (e) => {
  document.documentElement.dataset.cursor =
    (e.pointerType === 'mouse' || e.pointerType === 'pen') ? 'wii' : 'native';
};
```

Degradation is then trivially correct: never apply `cursor: none`, never mount the element, never
start the rAF loop.

**iPadOS is its own case.** **[Official/MDN]** *"By default, the iPad cursor is displayed as a circle,
and the only supported value that will change an appearance of the pointer is `text`."* BCD lists
`cursor: none` as **`false`** for Safari iOS. So on an iPad with a trackpad you would get **the system
circle *plus* your fake hand** — two cursors. The media-query gate above is what prevents that; the
CSS half silently no-opping is *not* a plan, because the DOM element would still mount.

## 12.8 Performance

The cost of a per-frame-updated element is small **if** it is confined to the compositor:

- **One rAF loop, one element, one `style.transform` write per frame.** That is a compositor-thread
  transform update — no layout, no paint. Budget: well under 0.1 ms/frame.
- **Keep the cursor out of the main document's paint work.** Give it `position: fixed`,
  `will-change: transform`, `pointer-events: none`, and a high `z-index`. `position: fixed` +
  compositing means scrolling does not repaint it.
- **Don't animate `filter: drop-shadow()` per frame.** A drop-shadow on a rotating element re-rasterises
  the layer whenever the rotation changes. Cheaper: bake the shadow into the SVG as a second, offset,
  blurred path (which is what the Wii does — a separate shadow sprite, §3.4), or use a static
  `filter` on a parent that doesn't rotate.
- **Prefer inline SVG or a single `<img>`, not a nested DOM tree.** Every extra element is another
  thing to composite. One `<svg>` with two paths (shadow + hand) plus one `<text>` is plenty.
- **`contain: layout paint size`** on the follower isolates it: its style/layout work cannot escape
  into the rest of the page, and the UA can skip it during unrelated invalidations. `contain: size`
  requires explicit `width`/`height`, which we have. Cheap, and worth adding alongside `will-change`.
- **Use `{ passive: true }`** on the pointer listeners so they can never block scrolling.
- **Never read layout in the move handler.** `getBoundingClientRect()`, `offsetWidth`, `scrollTop` all
  force synchronous layout. If you add a magnetic/snap-to-target effect, cache the rects and
  invalidate them with a `ResizeObserver` — never measure per frame.
- **Keep the layer small.** Compositor-layer GPU memory is proportional to layer *area*. The element
  should be the size of the hand (~100 × 150), never a full-viewport container with the hand
  positioned inside it — that is a full-screen layer for a hand-sized sprite.
- **Cancel the loop** on unmount, on `visibilitychange`, and when the cursor is hidden. A rAF loop that
  runs while nothing is visible is pure waste, and on battery it is measurable.
- **Don't re-render React.** Coordinates live in refs. If the component re-renders on every mouse
  move, you have already lost — that is 60+ reconciliations/second for a `div` that never changes.

## 12.9 Known pitfalls

1. **Flicker on page load.** Between first paint and the effect running, the user sees the native
   cursor; then it snaps away and the hand appears at `(0,0)` or wherever. Fixes: (a) render the
   cursor element with `opacity: 0` and only reveal it on the first `pointermove` (you genuinely do
   not know where the pointer is until then — there is no API for "current mouse position"); (b) apply
   the `cursor: none` class in the same effect that reveals it, never in static CSS (also §12.6.7).
2. **Cursor lag on heavy pages.** The rAF loop is starved by long main-thread tasks — a slow render,
   a big JSON parse, a layout-thrashing third-party script. The native cursor is drawn by the compositor
   (or the OS) and never lags; **yours will, and the contrast is very visible.** Mitigations: keep the
   main thread free, avoid synchronous work in event handlers, and consider hiding the custom cursor
   during known-heavy transitions (channel launch zoom) and letting the native one through.
   **[Inferred]** There is no way to fully solve this short of an off-main-thread animation, which is
   not available for pointer-following.
3. **Screenshot pollution — directly relevant to this repo.** `docs/methodology/visual-regression-tooling.md`
   plans Playwright `toHaveScreenshot()` baselines plus a `pixelmatch`/SSIM comparison against
   `reference_screen.png`. A cursor element **will** be captured by `page.screenshot()` (the *native*
   cursor is not, but a DOM element is), it will sit at a semi-arbitrary position, and it will produce
   diff noise on every run — and unlike the clock or the static canvas, this is noise with **no
   informational value whatsoever**, because the cursor's position in a screenshot is an artifact of
   where Playwright happened to leave the mouse.

   **Recommendation, in priority order — and note the methodology doc's own stance.**
   `visual-regression-tooling.md` argues (§"Masking dynamic regions") that *masking is the blunt
   instrument… Prefer freezing over masking, and reserve masking for things genuinely outside your
   control.* The cursor is the rare case where the **strongest option is neither** — it is
   *suppression*, because unlike the clock there is nothing about the cursor we want the reference
   comparison to verify. So:

   1. **Suppress it entirely in test builds — do this one.** The cleanest hook is a prop or context
      flag driven by a query param the harness appends, so the same production bundle is under test:

      ```jsx
      // App.jsx
      const showCursor = !new URLSearchParams(location.search).has('nocursor');
      return <>{showCursor && <WiiCursor />}<Menu /></>;
      ```
      ```js
      // playwright fixture
      await page.goto('/?nocursor=1');
      ```

      Prefer this over `import.meta.env.MODE === 'test'`, which diverges the bundle from production
      and can hide real bugs. Suppression also means `cursor: none` is never applied, so **the
      native pointer is absent from the capture too** (Playwright's `page.screenshot()` does not
      render the OS cursor) — giving a genuinely cursor-free image that is directly comparable to
      `reference_screen.png`, which has no cursor either.

   2. **Mask as the fallback**, for interactive/MCP-driven captures where you cannot control the URL.
      `toHaveScreenshot({ mask: [page.getByTestId('wii-cursor')] })` paints the region magenta in
      **both** baseline and candidate (`maskColor` default `#FF00FF`), so it can never differ — but
      per the methodology doc, it can never be verified either. Acceptable here precisely because
      there is nothing to verify.

   3. **For the standalone `reference_screen.png` scorer** (`sharp` → `pixelmatch` + SSIM), masking
      is not available — it is not a Playwright assertion. Use suppression (option 1) on the capture
      side. If for some reason you cannot, the methodology doc notes `odiff`'s
      `-i x1:y1-x2:y2,...` ignore-regions flag as the CLI-level equivalent, but a moving cursor has
      no fixed region to ignore, so this is a poor fit. **Suppression is the only clean answer for
      the reference-match path.**

   4. **Do not** try to solve this by parking the mouse in a corner. `page.mouse.move(0, 0)` still
      leaves the hand rendered at `(0,0)`, and the smoothing (§6.2) means its exact position depends
      on how many frames elapsed — nondeterministic by construction. This is a trap worth naming.

   Doing this from day one is much cheaper than debugging flaky diffs later.
4. **Iframe boundaries — two separate problems, often conflated.** Be precise, because the fixes
   differ:

   **(a) `cursor: none` does not cross into an iframe.** CSS inheritance operates within a *single*
   document tree. The child document's root element has no parent to inherit from, and the embedding
   `<iframe>` element's computed `cursor` is irrelevant to the nested document. So **the native
   cursor reappears over any iframe** — embedded video, maps, ads. Same-origin: inject the same
   stylesheet into the child document. **Cross-origin: impossible** — you will have two cursors
   visible simultaneously.

   **(b) Your follower paints fine but freezes.** Contrary to a common belief, a `position: fixed`
   element in the parent **can** paint over a cross-origin iframe — it is just a positioned element in
   the parent's stacking context, and nothing about iframes blocks compositing over them. **What
   breaks is input:** while the pointer is over a cross-origin iframe, pointer events are dispatched
   in the *child's* document and the parent receives no `pointermove`. So your hand is **drawn
   correctly but stale — frozen at the point it last had data** while the real pointer moves inside.
   This is a same-origin-policy consequence, not a paint-order one.

   **Fixes, in order:** avoid iframes (easily achievable for this project); or on `pointerenter` of
   the `<iframe>` element, hide the custom cursor and restore `cursor: auto` so the user gets one
   working native pointer inside it; or, same-origin only, inject the listeners into the child
   document and forward coordinates to the parent with the iframe's offset added.
5. **`cursor` inheritance leaks.** Any component or library that sets `cursor: pointer` /
   `grab` / `text` re-enables the native cursor on that element. The universal selector
   (`html.wii-cursor * { cursor: none; }`) fixes it but is a blunt instrument — remember to
   re-exempt inputs (§12.6.4) *after* it.
6. **Drag ghosting.** Native HTML5 drag, and text selection drags, both draw their own OS-level
   feedback and can force the native cursor back. If you implement channel reordering, use pointer
   events + `setPointerCapture`, **not** HTML5 drag-and-drop.
7. **Right-click / context menu.** The context menu is OS chrome; your cursor keeps following the
   pointer *behind* it and can look wrong. Minor, but hide on `contextmenu` if it bothers you.
8. **The 50 Hz native-cursor throttle** (`kCursorUpdateInterval`, §12.1) does not apply to the DOM
   follower — a mild point in Approach B's favour.
9. **Hotspot drift under `transform`.** If the hotspot is baked in as a negative margin (as in §12.10)
   and you later `scale()` or `rotate()` the sprite, **the hotspot moves** unless `transform-origin`
   is set to the hotspot point. Set `transform-origin` to the fingertip so scale and rotation pivot
   around the actual point of aim — which is also exactly what the console does (§6.3: rotation about
   a pane whose origin coincides with the point of aim). The §12.10 CSS already does this; the point
   is that it is load-bearing, not cosmetic.
10. **Pointer Lock is the wrong tool — but know why.** **[Official/MDN]**
   [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) *"gives you
   access to raw mouse movement, locks the target of mouse events to a single element, eliminates
   limits on how far mouse movement can go in a single direction, and removes the cursor from view."*
   While locked, `clientX`/`clientY` are *"held constant, as if the mouse is not moving"* — you
   integrate `movementX`/`movementY` yourself, optionally with `{ unadjustedMovement: true }` to
   bypass OS pointer acceleration.

   It is genuinely tempting: raw deltas, no OS round-trip, and it is arguably the *most* faithful
   analogue of a Wii Remote (a relative pointing device with its own gain curve). **Do not use it
   here.** It requires a user gesture to enter, shows a browser "press Esc to exit" notification,
   traps the pointer so it can never leave the window, and breaks every normal browsing affordance.
   Reserve it for a deliberate full-screen "point at the screen" demo mode, if ever.
11. **SPA remounts re-trigger the load flicker.** If the cursor component lives *inside* the router,
   every navigation unmounts and remounts it, replaying pitfall 1 (invisible until the next
   `pointermove`) on every page change. **Hoist it above the router**, as a sibling of the routed
   tree, so it mounts once for the session.

## 12.10 Reference implementation (React)

Drop-in, no dependencies, covers everything above. `src/components/WiiCursor.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import './WiiCursor.css';

// Measured from the real Wii Menu cursor texture — see context/components/cursor.md §3, §8.
const ART_W = 43;          // artwork width,  TEXTURE px (§3.1)
const ART_H = 62;          // artwork height, TEXTURE px  — CSS scales this to 10.5vh (§8)
const HOTSPOT_X = 12.5;    // fingertip, in artwork units — also the rotation pivot (§6.3)
const HOTSPOT_Y = 0;

// tev color 0 from the decompiled retail P{n}_Def.brlyt (§4.3).
const PLAYER_COLOR = ['#008CFF', '#FF3838', '#10BD0D', '#FF9C00'];
const REST_TILT_DEG = 15;  // Nintendo's own no-roll-data fallback (Classic::getHorizon)

// Dragging-circle smoothing (WiiBrew). r in px, k per-frame ease inside the circle.
const CIRCLE_R = 8;
const EASE_K = 0.22;

export default function WiiCursor({ playerNumber = 1, enabled = true }) {
  const rootRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const pressed = useRef(false);
  const seen = useRef(false);      // have we ever had a real pointer position?
  const raf = useRef(0);
  const last = useRef(0);

  // Only mount for precise pointing devices; flips to false on the first touch event.
  const [fine, setFine] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(any-pointer: fine) and (any-hover: hover)').matches
  );
  const [reduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Visual-regression escape hatch (§12.9.3). The test harness navigates to `/?nocursor=1`,
  // which suppresses both the element AND the `cursor: none` class — so captures contain
  // no cursor of any kind and stay comparable to reference_screen.png.
  const suppressed =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('nocursor');

  const active = enabled && fine && !suppressed;

  useEffect(() => {
    if (!active) return;
    const el = rootRef.current;
    if (!el) return;

    // Hide the native cursor from JS, never from static CSS — if this module fails to
    // load the user must still have a working pointer. (§12.6.7)
    document.documentElement.classList.add('wii-cursor-active');

    const onMove = (e) => {
      if (e.pointerType === 'touch') { setFine(false); return; }
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!seen.current) {                 // first sighting: snap, don't fly in
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;
        seen.current = true;
        el.style.opacity = '1';
      }
    };
    const onEnter = () => { if (seen.current) el.style.opacity = '1'; };
    const onLeave = () => { el.style.opacity = '0'; };   // instant, like losing IR lock (§5.6)
    const onDown = (e) => { if (e.button === 0) pressed.current = true; };
    const onUp = () => { pressed.current = false; };
    const onVis = () => { if (document.hidden) el.style.opacity = '0'; };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVis);
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerenter', onEnter);

    const tick = (t) => {
      raf.current = requestAnimationFrame(tick);
      const dt = last.current ? Math.min((t - last.current) / 16.667, 4) : 1; // in 60fps frames
      last.current = t;

      const p = pos.current, g = target.current;
      if (reduced) {
        p.x = g.x; p.y = g.y;                       // 1:1, no lag (§12.6.2)
      } else {
        const dx = g.x - p.x, dy = g.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > CIRCLE_R) {                          // outside the circle: catch up to the rim
          const s = (d - CIRCLE_R) / d;
          p.x += dx * s; p.y += dy * s;
        } else if (d > 0) {                          // inside: ease toward the centre
          const k = 1 - Math.pow(1 - EASE_K, dt);    // frame-rate independent
          p.x += dx * k; p.y += dy * k;
        }
      }

      // One compositor-only write per frame. Hotspot offset is applied in CSS via
      // transform-origin + a translate on the inner art, so rotate() pivots on the fingertip.
      el.style.transform =
        `translate3d(${p.x}px, ${p.y}px, 0) rotate(${REST_TILT_DEG}deg)` +
        (pressed.current && !reduced ? ' scale(0.94)' : '');
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
      document.documentElement.classList.remove('wii-cursor-active');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerenter', onEnter);
    };
  }, [active, reduced]);

  if (!active) return null;

  const tint = PLAYER_COLOR[(playerNumber - 1) % 4];

  return (
    <div ref={rootRef} className="wii-cursor" data-testid="wii-cursor" aria-hidden="true">
      <svg viewBox={`0 0 ${ART_W} ${ART_H}`} className="wii-cursor__art">
        {/* TODO: replace `d` with the redrawn path — see §11's redraw spec for every measurement.
            Layer order mirrors the console's pane order (§3.4):
              N_SRot shadow → N_Rot hand → tint mask (numeral + bottom gradient). */}
        <defs>
          {/* The player-colour wash up from the wrist: 0% at y38 → 27% at y62 (§4.2). */}
          <linearGradient id="wii-tint" x1="0" y1="38" x2="0" y2="62"
                          gradientUnits="userSpaceOnUse">
            <stop offset="0"   stopColor={tint} stopOpacity="0" />
            <stop offset="1"   stopColor={tint} stopOpacity="0.27" />
          </linearGradient>
          <clipPath id="wii-clip"><path d="…" /></clipPath>
        </defs>

        {/* Offset is the retail (+3,−3) on a 54-unit quad, converted to texture units (×64/54). */}
        <path className="wii-cursor__shadow" d="…" />
        <path className="wii-cursor__hand"   d="…" />
        <rect className="wii-cursor__tint" x="0" y="0" width={ART_W} height={ART_H}
              fill="url(#wii-tint)" clipPath="url(#wii-clip)" />
        <text className="wii-cursor__num" x={23.6} y={49} textAnchor="middle" fill={tint}>
          {playerNumber}
        </text>
      </svg>
    </div>
  );
}
```

`src/components/WiiCursor.css`:

```css
/* Applied from JS only — never let a stylesheet leave the user with no pointer. */
.wii-cursor-active,
.wii-cursor-active * { cursor: none; }

/* …but text entry keeps its native affordance. Must come after the rule above. */
.wii-cursor-active :where(input, textarea, select, [contenteditable]) { cursor: auto; }

.wii-cursor {
  position: fixed;
  top: 0;
  left: 0;
  /* §8: 50.6/480 of viewport height. Clamped so it stays sane on a 4K display,
     where an unclamped 10.5vh would be a 227px hand. */
  height: clamp(64px, 10.5vh, 132px);
  aspect-ratio: 43 / 62;                   /* texture aspect ≈ 0.70 — width follows */
  width: auto;
  pointer-events: none;                    /* mandatory (§12.2) */
  will-change: transform;                  /* one legitimate use: a permanent, always-moving layer */
  contain: layout paint size;              /* isolate from the page's invalidation work (§12.8) */
  z-index: 2147483647;
  opacity: 0;                              /* revealed on the first real pointermove (§12.9.1) */
  /* Pivot on the fingertip so rotation doesn't move the point of aim (§6.3). */
  transform-origin: 29.07% 0;              /* 12.5 / 43 */
  margin-left: -29.07%;                    /* place the fingertip on the pointer position */
}
.wii-cursor__art  { display: block; width: 100%; height: 100%; overflow: visible; }
.wii-cursor__hand   { fill: #fff; stroke: #000; stroke-width: 6; stroke-linejoin: round; }
/* Retail: rgba(0,0,0,90/255) = 35.3%, pane offset (+3,−3) on a 54-unit quad
   → (+3.56, +3.56) in this 64-unit texture space (§3.4). */
.wii-cursor__shadow { fill: rgba(0, 0, 0, 0.353); transform: translate(3.56px, 3.56px); }
.wii-cursor__num    { font-weight: 700; font-size: 17px; }   /* fill comes from the player colour */

@media (prefers-reduced-motion: reduce) {
  .wii-cursor { transition: none; }
}

/* Coarse pointer, no hover, or forced colours → give the native cursor back entirely.
   Note this gates OFF on (pointer: coarse), NOT (any-pointer: coarse) — the latter would
   wrongly disable the cursor on every touchscreen laptop (§12.7). */
@media (pointer: coarse), (hover: none), (forced-colors: active) {
  .wii-cursor { display: none; }
  .wii-cursor-active,
  .wii-cursor-active * { cursor: auto; }
}
```

**Three things in that CSS are load-bearing and easy to delete by accident:**

1. `transform-origin` + the matching negative `margin-left` put the **fingertip** on the pointer
   position *and* make rotation pivot there. Change one without the other and the point of aim drifts
   as the cursor rotates (§12.9.9).
2. The `forced-colors` block is not optional politeness — without it, an inline-SVG hand loses its
   fill, stroke and shadow in High Contrast mode and becomes invisible (§12.6.2a).
3. `(pointer: coarse)`, **not** `(any-pointer: coarse)`. See §12.7 for why this exact distinction is
   the most common bug in custom-cursor implementations.

Playwright, to keep it out of visual baselines (§12.9.3):

```js
await expect(page).toHaveScreenshot({
  mask: [page.getByTestId('wii-cursor')],
});
```

---

## 13. Spec summary (the numbers, in one place)

| Property | Value | Tag |
|---|---|---|
| Archive | `cursor.ash` (NAND), 9 `.brlyt` files | Decomp |
| Poses | `P{1..4}_Def` (point), `P{1..4}_Cat` (grab) | Decomp |
| Animations bound to cursor layouts | **zero** — static images only | Decomp |
| Artwork size (texture) | 42–43 × 60–62 px (point); 42 × 43 (grab, bottom-aligned) | Asset |
| Texture → screen scale | quad **54 × 54** for a **64 × 64** cell ⇒ **× 0.84375** | Decomp |
| Artwork size (on screen) | ≈ **35.4 × 50.6** layout units | Decomp + Asset |
| Layout canvas | **640 × 480**; cursor's reachable rect 608 × 456 = exactly 95 % of it | Decomp |
| Screen space | 608 × 456 (4:3) / 832 × 456 (16:9), origin centred | Decomp |
| On-screen height | **10.5 % of viewport height**; width 7.4 % of viewport height | Derived |
| Fill / outline | `#FFFFFF` / `#000000`, outline ≈4 texture px (**≈9.5 % of hand width**) | Asset |
| Numeral | **player colour**, centred at ~55 % width / ~68 % height, cap height ~28 % of hand height | Asset + Decomp |
| Bottom tint | **player colour**, 0 % → **27 %** alpha over the lower ~38 % of the hand | Asset + Decomp |
| **Per-player colour** | **P1 `#008CFF` · P2 `#FF3838` · P3 `#10BD0D` · P4 `#FF9C00`** (`tev color 0`) | Decomp |
| Remote LED convention | **positional, all-blue** — *not* colour-coded. Different thing entirely. | Official |
| Shadow | separate soft silhouette texture on pane `N_SRot`, offset **(+3, −3)** on a 54-unit quad, **`rgba(0,0,0,90/255)` = 35.3 % black** | Decomp |
| Hotspot | fingertip, artwork (12.5, 0) → **29 % across, 0 % down** | Asset |
| Rotation | `atan2Deg(-horizon.y, horizon.x)`, no clamp, applied to hand *and* shadow | Decomp |
| Rest tilt (no roll data) | **exactly 15°** | Decomp |
| Pointer gain | `KPADGetProjectionPos(..., 1.10132f)`, ×1.15 extra in 16:9 | Decomp |
| Edge overshoot | 100 layout units past the border before snapping back | Decomp |
| Smoothing | KPAD library default — System Menu adds none and tunes none | Decomp |
| Smoothing algorithm (reference) | dragging circle, or velocity-adaptive; **no published parameters** | Fan |
| Lost tracking | instantly not drawn, no fade | Decomp |
| Hover effect on cursor | **none** — target animates instead | Decomp |
| Press effect on cursor | **none** | Decomp |
| Grab trigger | `BTN_DRAG = A \| B` → instant pose swap | Decomp |
| Cursors on screen | 4 max, drawn 3→0 so P1 is on top | Decomp |
| Movement sound | **none** — no such ID exists in the 90-entry sound bank | Decomp |
| Hover sound | `WIPL_SE_BT_TARGETTING` (buttons) / `WIPL_SE_CH_TARGETTING` (channels) | Decomp |
| Hover sound panning | **none** — hover blips are centred; only the drag family is panned | Decomp |
| Panned sounds | `CH_HOLD`, `CH_DRAG`, `CH_SET`, `CH_NOT_MOVE`, `BOARD_*`, `MSG_*` | Decomp |
| Pan units | layout-space X: ±304 (4:3) / ±416 (16:9) → map linearly to pan −1…+1 | Decomp + Inferred |
| Hover rumble | 58.3 ms (7/120 s) motor pulse, 300 ms lockout on channel hover | Decomp |
| **Click activation** | `decide()` = A held **exactly 5 frames** ≈ **83.3 ms**; one-frame pulse | Decomp |
| **Click cancel** | starting an A+B pinch **disarms** the pending click | Decomp |
| Pinch latch | on when both A+B down; off when **either** released; order-independent | Decomp |
| Hit-test boundary | **zero** overshoot (position → ∞ outside the rect) vs 100 units for drawing | Decomp |
| B-scroll arrow | length clamped **32–128** units, Y-scale ±1 for down/up | Decomp |
| B-scroll dead zone | **±0.01** normalised DPD units — below it, speed is exactly 0 | Decomp |
| B-scroll speed law | `±10 · Δy²` (quadratic), **Y axis only**, no inertia on release | Decomp |
| B-scroll arrow saturation | pull of **≈0.28** screen-heights maxes the arrow; speed keeps rising | Decomp |
| B-scroll tick | `WIPL_SE_B_SCROLL` once per **128 units of actual scroll travel** | Decomp |
| B-scroll surfaces | Message Board, text writer, letter writer — **not** the channel grid | Decomp |

### Part B numbers

| Property | Value | Tag |
|---|---|---|
| `cursor:url()` hard reject | **128** DIP — Chromium (`kMaximumCursorDIPSize`) and WebKit (`maximumCursorSize`) only | Official |
| `cursor:url()` viewport-containment threshold | **32** — Chromium, WebKit **and Gecko** (`layout.cursor.block.max-size`) | Official |
| Gecko's cap | **32**, not 128 — no 128 constant exists in Gecko | Official |
| WebKit extra rule | containment enforced for **every** custom cursor, any size | Official |
| Behaviour when exceeded | silently skipped → next list item → the mandatory keyword. **Never scaled down.** | Official |
| DPI escape hatch | `image-set(url(x@2x.png) 2x)` — raises the effective scale factor | Official |
| Native cursor-shape update rate | throttled to **50 Hz** (`kCursorUpdateInterval = 20 ms`) | Official |
| Animated GIF cursor | **single frame only** in Chromium — no animation | Official |
| SVG cursor | needs an intrinsic `width`/`height`; Chromium ≈ **86+** | Official + Inferred |
| CORS on cursor images | **none** — ordinary no-cors CSS subresource | Official |
| DOM-follower latency floor | ≥ 1 frame (~16.7 ms), realistically 1–3 | **Uncertain** |
| Recommended approach | **`cursor: none` + DOM follower** — Approach A cannot do the size or the rotation | Inferred |
| Rotation default | `rotate(15deg)` — Nintendo's own no-roll-data value, confirmed twice | Decomp |
| Screenshot-test handling | **suppress** via `?nocursor=1`, mask only as fallback | Inferred |

---

## 14. Open gaps and things I could not verify

1. **The contents of `cursor.ash`.** Pane offsets, the exact shadow offset, the rotation pivot, and
   any material colours are inside layout binaries the decomp cannot ship. Everything in §3.4 about
   the shadow's *placement* (as opposed to its existence and its artwork) is inference.
2. ~~**Whether the `.brlyt` scales the texture.**~~ **RESOLVED 2026-07-25 — and the first pass's
   assumption was wrong.** The decompiled retail layout draws the 64 × 64 cell into a **54 × 54**
   quad (× 0.84375), so every size figure shrank by ~16 % (§8). This is exactly the failure mode the
   gap warned about; it is recorded here rather than deleted because it is a good reminder that
   "the atlas is authored at 64 × 64" was circumstantial evidence, not proof.
3. **Rotation sign.** *Partly resolved in the second pass.* The magnitude 15° is certain and now
   confirmed twice (a derived `atan2` in the System Menu, a literal `15.0f` in the HOME Menu — §6.3),
   and the **numeric** sign is positive. What remains unverified is what a positive Z rotation *looks
   like on screen*, which depends on nw4r's rendering convention and is derived, not observed. Verify
   against a screenshot before committing; if the hand leans the wrong way, negate it.
4. **KPAD's actual smoothing parameters.** Not in the decomp (KPAD is not decompiled here) and not
   published by WiiBrew. The dragging-circle radius in particular is a free parameter — tune by feel.
5. ~~**The numeral overlay's blend mode.**~~ **RESOLVED 2026-07-25 — and the first pass's conclusion
   was wrong in a way worth studying.** The greyscale plate is a **tint mask** for the material's
   `tev color 0` (the player colour), not a grey multiply overlay: the numeral is **coloured**, not
   black (§4.2, §4.3). The first pass read the *pixels* correctly and reasoned carefully, but a
   texture rip cannot contain material state, so the reconstruction silently substituted white for
   the colour register and produced a plausible-looking wrong answer. **Standing lesson: for anything
   involving colour, a sprite rip is not sufficient evidence — you need the layout binary.**
5a. **`P*_Cat.brlyt` internals are still unrecovered.** `mkwcat/starling` decompiled only the four
   `_Def` layouts. So the grab pose's quad geometry, its `tev color 0`, and which
   `defcursor_final64_*` texture it binds are **unknown**. **[Inferred]** it almost certainly mirrors
   `_Def` (same 54 × 54 quad, same player colour, `_b` or `_c` texture), but that is unverified. If
   the grab fist needs to be pixel-exact, this is the gap to close.
6. **Whether other Wii system software animated its cursor.** The Wii Shop Channel, Photo Channel and
   most games ran their own cursor code. The "finger curls on click" memory may well be accurate for
   *some* Wii software — it is just not true of the System Menu, which is what this project clones.
7. **Spriters Resource / primmr availability.** TSR requires a browser `User-Agent` and 403s otherwise;
   `primmr.dev` refused connection during this pass. Both may need manual browsing.
8. **SVG-as-cursor per-browser versions.** *Partly resolved in the second pass.* BCD still has no
   `svg` subfeature under `cursor`, so no official version table exists. Release-branch source diffing
   places Chromium support at **~Chrome 86 (Oct 2020)** — `SVGImage` handling is absent at 80/85 and
   present at 86+ — but that is an **inference from source, not a citable changelog entry**, and
   Chromium's gitiles history now 403s without sign-in, so it could not be confirmed. Safari/WebKit
   has the same SVG code path but no version was established. Moot for this project given the
   Approach B recommendation.
9. **The DOM-follower latency penalty is not quantified.** "One to three frames behind native" is an
   engineering expectation derived from the pipeline architecture, **not a measured or cited figure** —
   no reachable browser-engine design document states a number. This matters because it compounds
   with the deliberate smoothing (§6.2, §12.2), and the combined feel is the thing most likely to need
   tuning against a real capture. Measure it in the actual build rather than trusting the estimate.
10. **Whether the 5-frame `decide()` delay (§5.4a) feels right on a mouse is untested.** The finding
   itself is solid decomp evidence; the recommendation to ship it behind a default-off flag is a
   judgement call about web ergonomics, not something the decomp can settle.

---

## ADDENDUM — 2026-07-30: built, and two things the doc got wrong

Written while implementing `src/components/WiiCursor.jsx` on `bruno/cursor`. Part A/B research
above held up almost entirely; §12.3's "use Approach B" was correct and §8's revised sizing was the
number that made it work. Two corrections and one trap follow.

### C.1 ⚠️ The cursor rip in `reference/work2/amongus` is a THEME REPLACEMENT — do not draw from it

`reference/work2/amongus/ash/cursor.decompressed.ash_extracted/arc/timg/defcursor_final64_a.tpl`
decodes cleanly (64×64, RGB5A3) and looks plausible — a white hand with a heavy black outline. **It
is not the stock cursor.** Its index finger is drawn **diagonally, at ~45°**, and its bbox is 42×52,
where both §3.1 and every other source have a **vertical finger column** in a 43×62 hand.

The usable local source is **`reference/synthwiive/textures/cursor/cursor.png`** — a themer's
template, i.e. a *recolour* that preserves the stock silhouette (teal instead of white, so useless
for colour, authoritative for shape). Its per-row extents reproduce §3.1's table closely.

This is the same shape of trap as the half-pill textures: a local rip that decodes fine and is still
worthless, because the theme edited exactly the thing being measured. **For cursor art, the source
order is: sprite rip → synthwiive template → any `.mym`/ashpool rip (last, and only after checking
it has not been redrawn).**

### C.2 The artwork's aspect ratio: sources disagree ~5 %, and height wins

| Source | Hand bbox in the 64-cell | Aspect |
|---|---|---|
| §3.1 (Spriters Resource console rip) | 43 × 62 | 0.694 |
| synthwiive template, measured this pass (alpha > 110) | 41 × 56 | 0.732 |

Both cannot be right. **Height is the anchor**, because §8 derives the on-screen size from the
height via the decompiled 54×54 quad, and that chain is the one with layout-binary evidence in it.
So the implementation targets **hand height = 50.6 stage px** and lets width follow from the drawn
silhouette (≈37 stage px, vs §8's 35.4). Flagged rather than silently averaged.

### C.3 What was built

Clean-room: the paths are **drawn from the measured per-row extents**, not traced. Fit against the
template silhouette, resampled into the same 64-cell space: **IoU 0.949**, 9 stray pixels. The
residual is a ~1 px antialiasing band at the alpha threshold.

| Decision | Value | Why |
|---|---|---|
| Approach | `cursor: none` + DOM follower | §12.3. `cursor: url()` cannot do 50.6 stage px — every engine reverts to the arrow past **32 px** |
| Sizing unit | stage px × `--stage-scale` | The console ran at fixed 480p, so a fixed layout-unit size WAS a fixed screen fraction. Asserted by a test that halves the viewport |
| Placement | **sibling** of `.wii-menu`, not a child | The stage clips its overflow; a cursor that vanished at the letterbox would leave the user with no pointer at all |
| Hotspot | fingertip, 29.2 % across / 3.1 % down | Corner-anchoring is the classic version of this bug — subtly wrong rather than obviously broken |
| Shadow | separate offset silhouette, (+3,+3), 35.3 % black | Not `filter: drop-shadow()`, which re-rasterises every frame on a moving element |
| Visibility | hidden until first `pointermove` | Keeps it out of every screenshot baseline with no mask, for free |
| Hover response | **none** | §5.3 — the console never changes the cursor on hover. `cursor: none` on all descendants also suppresses the `pointer` hand, which is the authentic behaviour |

**DELIBERATE DIVERGENCE — no tilt.** By request. Nintendo's own no-roll-data value is **exactly
15°** (§12.4 Option 1), confirmed twice independently, and it is the documented answer for precisely
the situation a web port is permanently in. We render upright, which §12.4 calls Option 3 and
advises against. One-line revert: add `rotate(15deg)` to `.wii-cursor__art`.

### C.4 The cursor's hit-test assertion found a live bug in the bottom bar

`.bottom-bar-wrapper` and `.bar-left` / `.bar-right` are both `pointer-events: none` — correct, they
are decorative, and the decomp registers hit boxes on `B_Set` / `B_Bbs` / `B_Ch` and never on the
pill. But `pointer-events` **inherits**, and `.wii-button` / `.mail-button` never re-armed it, so
**both bar buttons had been completely unclickable.** `.sd-icon` set `pointer-events: all` and was
fine, which is why nothing looked wrong.

Nothing in the visual harness could have caught this — it is not a rendering difference. Fixed with
`pointer-events: auto` on the buttons, and `tests/visual/cursor.spec.js` now asserts that a point
over the button resolves to the button while the hand is drawn on top of it.

### C.5 Not implemented, and deliberately so

- **Smoothing / lag** (§6.2). The console's smoothing is KPAD's, and it exists to settle IR jitter
  that a mouse does not have. Adding it would cost responsiveness to reproduce a compensation for a
  problem we do not have. Direct 1:1 tracking.
- **The 5-frame (83 ms) click delay** (§5.4a). §5.4a already recommends shipping it off by default
  for the same reason. The *cancel-on-drag* half is worth revisiting when drag exists.
- **Grab pose, B-scroll arrow, players 2–4** (§5.5, §7, §9). Nothing to drag, scroll or share yet.
