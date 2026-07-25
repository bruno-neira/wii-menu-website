# Aspect ratio, anamorphic output, and overscan — what the Wii Menu actually did on a TV

**Scope.** How the System Menu behaved across 4:3/16:9 console settings and TV shapes, what
the console actually put on the wire, how much of the frame a viewer really saw, and what all
that implies for a browser window of arbitrary size.

**Written:** 2026-07-25. Supersedes `technical-specs.md` §3 and §6 wholesale, and corrects two
load-bearing claims currently baked into the app (see §8).

**Evidence tags.** `[Decomp — code evidence]` = read out of `reference/wii-ipl` at the cited
`file:line`. `[Official]` = Nintendo document (`wii_design_specs.pdf`, RVL-06-0166-001-L).
`[Extracted]` = byte-level `.brlyt`/`.brlan` data via `context/brlan-extraction.md`.
`[Fan/community]` = wiki/forum. `[Inferred]` = my reasoning on top of the above, flagged.

> **Note on sourcing.** This session's web-search budget was exhausted before I could pull
> fresh community corroboration for §3 and §7. Every claim below therefore rests on the
> decomp, Nintendo's own spec PDF, the extracted layouts, or URLs already cited in this
> corpus. Where I would have wanted an independent community source, I say so.

---

## 0. The answer in one paragraph

The Wii Menu had **two genuinely different layouts**, not one layout stretched. A SYSCONF flag
(`SCGetAspectRatio()`, factory default **4:3**) selects a virtual coordinate space — **608×456**
or **832×456** — and every layout file, authored once at 608×456, is horizontally scaled ×1.36842
at the root while panes flagged *"target for position adjustment"* are counter-scaled back to
their authored size. The net effect is that **elements keep their physical size and shape and
spread out into 36.8% more horizontal room**; the channel grid stays 4×3 and never reflows;
channel icons are authored twice (128×96 and 170×96) so widescreen shows a genuinely wider
composition. At the same time the **signal is anamorphic**: both modes render into the same
640×456 framebuffer, so widescreen buys 36.8% more content at **73% of the horizontal pixel
density** — the TV stretches it back out. The console never letterboxes, pillarboxes, or
detects anything; all four setting/TV combinations are resolved entirely by the TV. Overscan
allowance is baked into the *video mode*, not the layout: the console paints only ~95% of the
analog raster in each axis and leaves a black border, then lets content run full-bleed to the
edge of that. **For the web build: a fixed, full-bleed 832×456 stage, letterboxed on black, is
the faithful choice — and it also happens to be the one that scales exactly 2.0000× at the
existing test viewport.**

---

## 1. What the console setting actually did

### 1.1 The flag

`SC_ASPECT_RATIO_4x3 = 0`, `SC_ASPECT_RATIO_16x9 = 1`
(`libs/RVL_SDK/include/revolution/sc.h:72-73`) `[Decomp — code evidence]`

It is a SYSCONF item, read with `SCGetAspectRatio()`. In the Wii Settings web UI it is
`WB_ID_DIS_WIDE` (`src/iplwww/www_wiisetting.cpp:339`). **The factory default is 4:3** — on
first boot the System Menu explicitly writes it:

```c
// src/system/iplSystem.cpp:490
SCSetAspectRatio(SC_ASPECT_RATIO_4x3);
```
`[Decomp — code evidence]` Every Wii shipped in 4:3 mode until the user changed it. Worth
remembering when someone calls 16:9 "the" Wii Menu.

### 1.2 What changes — five distinct mechanisms, not one

**(a) The projection rectangle.** The ortho volume swaps outright:

```c
// src/system/iplSystem.cpp:1187-1199
void System::getProjectionRect4x3(nw4r::ut::Rect* rect) {
    rect->left = -304.0;  rect->right = 304.0;
    rect->bottom = 228.0; rect->top = -228.0;      // 608 × 456
}
void System::getProjectionRect16x9(nw4r::ut::Rect* rect) {
    rect->left = -416.0;  rect->right = 416.0;
    rect->bottom = 228.0; rect->top = -228.0;      // 832 × 456
}
```
`getProjectionRect()` (`:1173-1185`) dispatches on the flag. That rect is fed straight into
`MTXOrtho` with the viewport pinned to the whole framebuffer:

```c
// src/utility/iplGraphics.cpp:35-45
System::getProjectionRect(&projRect);
MTXOrtho(mArg.mProjMtx, ...projRect.top..., ...projRect.bottom...,
                        ...projRect.left..., ...projRect.right..., -100.0f, 100.0f);
// src/system/iplSystem.cpp:776 (and :867, :932, :988, :1068)
GXSetViewport(0.0f, 0.0f, rMode->fbWidth, rMode->efbHeight, 0.0f, 1.0f);
```
`[Decomp — code evidence]` **Vertical extent is identical (456) in both modes; only width
changes, by exactly 832/608 = 1.368421.**

**(b) Per-layout root scale + per-pane counter-scale — the real mechanism.** Every layout
object runs this on creation *and every frame* (`iplLayout.cpp:164`, `:228`):

```c
// src/layout/iplLayout.cpp:361-383
void Object::initLocationAdjust() {
    if (SCGetAspectRatio() == SC_ASPECT_RATIO_16x9) {
        // root pane stretched to fill the wider frustum
        nw4r::math::VEC2 rootScale(rect16x9.GetWidth() / rect4x3.GetWidth(), 1.0f);  // 1.36842
        mLayout.GetRootPane()->SetScale(rootScale);
        // panes flagged for adjustment get the stretch cancelled
        nw4r::math::VEC2 adjustScale(rect4x3.GetWidth() / rect16x9.GetWidth(), 1.0f); // 0.73077
        mDrawInfo.SetLocationAdjustScale(adjustScale);
        mDrawInfo.SetLocationAdjust(true);
    } else { /* identity, adjust off */ }
}
```

and NW4R applies the counter-scale per pane:

```c
// libs/NW4R/src/lyt/lyt_pane.cpp:228-231
if (drawInfo.IsLocationAdjust() && IsLocationAdjust()) {
    scale.x *= drawInfo.GetLocationAdjustScale().x;
    scale.y *= drawInfo.GetLocationAdjustScale().y;
}
```
`[Decomp — code evidence]`

This is the whole game, and it is worth stating precisely:

- Layouts are **authored once, in the 608×456 4:3 space** (`[Extracted]`
  `brlan-extraction.md` §1.4: "Layout canvas for the main menu files: 608 × 456, centered =
  true, origin at screen centre, +X right, +Y up").
- In 16:9 the root scale multiplies **every descendant's translate** by 1.36842, so authored
  positions map to the same *fraction* of screen width.
- A pane carrying `BIT_LOCATION_ADJUST` gets `scale.x × 0.73077`, exactly cancelling the root
  stretch **for its own geometry**. Its shape and size are preserved; only its anchor moved.
- A pane *without* the flag is genuinely stretched 1.36842× — which is what you want for
  backgrounds and full-bleed plates.

Nintendo's spec confirms this is the documented authoring model, calling the flag "Target for
position adjustment": "In 16:9 mode, icons for which *Target for position adjustment* is not
selected in the Layout Editor are **stretched** to fill the Channel aperture. When this
parameter is selected, the image is displayed **without stretching**; thus, a 170 x 96 image
must be prepared in advance." (`wii_design_specs.pdf` §2.3) `[Official]`

**(c) Hand-authored re-anchoring, overriding (b).** Some elements are not left to the
mechanism. The SD Card button's root translate is set from a literal per mode:

```c
// src/scene/sdButton/iplSDMenuButton.cpp:50-60
f32 posX;
if (SCGetAspectRatio() == SC_ASPECT_RATIO_16x9) posX = -245.0f;
else                                            posX = -152.0f;
newPos.x = posX; newPos.y = -172.0f;
mpLayout->GetRootPane()->SetTranslate(newPos);
```
`[Decomp — code evidence]` −152 of ±304 is **25.00%** from the left edge; −245 of ±416 is
**20.55%**. Had it been left to the root-scale mechanism it would sit at −208 (25.00%). So
Nintendo deliberately pushed it 37 units further out in widescreen. This is the "re-anchoring"
`decomp-findings.md` flagged — now located exactly.

**(d) Texture swaps from hidden donor panes.** Where the *art* differs, the layout ships both
textures and the code re-points the material:

```c
// src/scene/channelSelect/iplChannelSelect.cpp:667-675  (the page background + edge vignette)
if (SCGetAspectRatio() == SC_ASPECT_RATIO_16x9) {
    mpLayout->FindPaneByName("ChangeTex16x9")->GetMaterial()->GetTexture(&texObj[1], GX_TEXMAP0);
    mpLayout->FindPaneByName("Picture_16")  ->GetMaterial()->GetTexture(&texObj[0], GX_TEXMAP0);
    for (int i = 0; i < CHAN_SCROLL_MAX; i++) {
        mpLayout->FindPaneByName(mscUnk0PaneNames[i])->GetMaterial()->SetTexture(GX_TEXMAP0, texObj[1]);
        mpLayout->FindPaneByName(mscUnk1PaneNames[i])->GetMaterial()->SetTexture(GX_TEXMAP0, texObj[0]);
    }
}
```
The donors are parked off-screen: `Picture_16` 128×64 at (0, +517.46) → `IplTopMaskEdge16x9.tpl`;
`ChangeTex16x9` 128×64 at (0, +759.00) → `IplTopMask16x9.tpl` `[Extracted]`. Same trick in the
disc-insert layout (`iplChannelSelect.cpp:730-734`, pane `16x9` → pane `DiskIn`), the drag ghost
(`:1805-1810`, pane `16x9` → panes `4x3` **and** `4x3_dummy` — the live pane is always the one
named `4x3`, only its texture changes), and the parental-controls timer
(`src/scene/limitOver/iplLimitOver.cpp:184-195`, three textures across a table of panes).
`[Decomp — code evidence]`

**(e) Wholly duplicate authored panes, picked by code.** In the channel-edit / SD-copy screens
the layout carries a complete second set of geometry per aspect and the code shows one:

```c
// src/scene/channelEdit/iplChanAppEdit.cpp:60, 196, 235-243, 249-250, 373
set_visible(SCGetAspectRatio() == SC_ASPECT_RATIO_16x9 ? "N_Mask4x3" : "N_Mask16x9", false);
mpLayout->draw(SCGetAspectRatio() == SC_ASPECT_RATIO_16x9 ? "N_Mask16x9" : "N_Mask4x3");
// different text boxes entirely:  T_Title_02/03 + BlockLine01  vs  T_Title_00/01 + BlockLine
mpThumbnail->getLytObj()->GetRootPane()->SetTranslate(
    get_translate(SCGetAspectRatio() == SC_ASPECT_RATIO_16x9 ? "N_Atari16x9" : "N_Atari4x3"));
```
`[Decomp — code evidence]` So in these screens the two aspect modes are, quite literally,
different artwork with different text-box positions — not a transform of one another.

**(f) Framebuffer geometry.** Covered in §2; the short version is that the framebuffer width
does **not** change, only the analog display window does, and only by 2.4%.

**(g) Pointer sensitivity.** A small but real behavioural change:

```c
// src/system/iplController.cpp:203-214
System::getProjectionRect(&nw4r_rect);              // aspect-dependent
KPADGetProjectionPos(&dest, &src, &kpad_rect, 1.10132f);
if (SCGetAspectRatio() == 1) { dest.x *= 1.15f; dest.y *= 1.15f; }
```
`[Decomp — code evidence]` In 16:9 the pointer position is scaled **1.15× in both axes** on top
of the wider projection — the cursor travels further per unit of wrist motion, vertically as
well as horizontally. Not something a web build needs, but it disproves "widescreen was purely
a display concern."

**(h) Home Menu.** `HBMSetAdjustFlag(SCGetAspectRatio() == SC_ASPECT_RATIO_16x9)`
(`src/system/iplHomeButtonMenu.cpp:75`, `:100`) — the SDK's Home Menu uses the identical
location-adjust scheme (`src/homebutton/HBMBase.cpp:474-475`). `[Decomp — code evidence]`

### 1.3 Validating the model against a pixel measurement

The bottom bar's corner clusters give a clean falsifiable test. `[Extracted]` (`my_IplTop_e.brlyt`,
`brlan-extraction.md` §8.1): `N_BtnR` sits at x = **+294**; its plate is three pictures
(64 + 92 + 64) whose outer edge lands at **+110.33** relative to the cluster. `iplButton.cpp`
performs **no** `SetTranslate` on the bar root — unlike `SDMenuButton` — so the bar is positioned
purely by the (b) mechanism. `[Decomp — code evidence]`

| | plate outer edge | screen half-width | **visible plate width** |
|---|---|---|---|
| 4:3 (no scaling) | 294 + 110.33 = 404.33 | 304 | 304 − 183.67 = **120.3 u = 19.8% of 608** |
| 16:9, plate **location-adjusted** | 294×1.36842 = 402.3, +110.33 = 512.7 | 416 | 416 − 292.0 = **124.0 u = 14.9% of 832** |
| 16:9, plate **not** adjusted (control) | 402.3 + 151.0 = 553.3 | 416 | **164.7 u = 19.8% of 832** |

`components/bottom-bar-half-pills.md` §4a measured **14.6% of screen width** from the 16:9
capture. The location-adjusted prediction is 14.9% (0.3 pp off); the unadjusted control is
19.8% (5.2 pp off, decisively rejected). `[Inferred, but strongly corroborated]`

Three things fall out:

1. The root-scale + counter-scale model is **confirmed against an independent pixel
   measurement**. Use it.
2. `brlan-extraction.md` §8's open caveat — "the bar's clusters are not usable at these raw
   coordinates in 4:3 and the System Menu must re-anchor them at runtime… treat the absolute X
   anchors as 16:9-authored values pending code-side confirmation" — is now **resolved**. They
   are 4:3-authored, no runtime re-anchor exists, and the plate deliberately overshoots the
   screen edge by ~100 units in *both* modes. That overshoot **is** why they are half-pills.
3. It yields a checkable prediction for open question #3 (4:3 geometry, currently unmeasured):
   **the half-pills are proportionally wider in 4:3 — 19.8% of screen width vs 14.9% in 16:9** —
   because they keep their absolute size while the screen gets wider.

---

## 2. Anamorphic vs. true widescreen — confirming and correcting

The corpus's earlier claim (`technical-specs.md` §1) was "the Wii outputs a 640/720-wide
anamorphic frame that the display stretches, rather than rendering more horizontal detail."
**Both halves need splitting apart. The pixel claim is right; the content claim is wrong.**

### 2.1 The render modes — 640×**456**, not 640×480

```c
// src/system/iplFramework.cpp:14-33   NTSC interlaced
static GXRenderModeObj sRMO_Ntsc_640x456IntDf = {
    VI_TVMODE_NTSC_INT,
    640,   // fbWidth
    456,   // efbHeight
    456,   // xfbHeight
    25,    // viXOrigin
    12,    // viYOrigin
    670,   // viWidth
    456,   // viHeight
    VI_XFBMODE_DF, ...
    7,7, 12,12,12, 7,7,        // vertical deflicker filter
};
```
`[Decomp — code evidence]` and the flag is applied at `:192-253`:

```c
// src/system/iplFramework.cpp:209-214   (NTSC / MPAL)
if (aspectRatio == SC_ASPECT_RATIO_16x9) mpRMode->viWidth = 686;
else                                     mpRMode->viWidth = 670;
mpRMode->viXOrigin = (VI_MAX_WIDTH_NTSC - mpRMode->viWidth) / 2;
```

Full table (`VI_MAX_WIDTH_NTSC = 720`, `VI_MAX_HEIGHT_NTSC = 480`, `VI_MAX_WIDTH_PAL = 720`,
`VI_MAX_HEIGHT_PAL = 574` — `libs/RVL_SDK/include/revolution/vi/vitypes.h:12-22`):

| Mode | fbWidth | efbHeight | xfbHeight | viWidth 4:3 | viWidth 16:9 | viHeight | viYOrigin |
|---|---|---|---|---|---|---|---|
| NTSC 480i (`:14`) | 640 | 456 | 456 | 670 | 686 | 456 | 12 |
| NTSC 480p (`:36`) | 640 | 456 | 456 | 670 | 686 | 456 | 12 |
| PAL60 480i (`:80`) | 640 | 456 | 456 | 670 | 686 | 456 | 12 |
| PAL50 576i (`:58`) | 640 | 456 | **542** | 666 | 682 | 542 | 16 |

`[Decomp — code evidence]`

### 2.2 So: is it anamorphic?

**At the pixel level, unambiguously yes — and more so than the folk description.** The
framebuffer is 640 wide in *both* modes. The ortho volume is 608 or 832 wide. Therefore:

| | horizontal px per virtual unit | vertical px per virtual unit |
|---|---|---|
| 4:3 | 640/608 = **1.0526** | 456/456 = **1.0000** |
| 16:9 | 640/832 = **0.7692** | 456/456 = **1.0000** |

Widescreen renders the same UI at **73.1% of the horizontal sampling rate** of 4:3. It does not
gain horizontal detail; it *loses* it, and the display stretches the result back out. This is
independently visible in the scissor arithmetic, which uses `fbW / projRect.GetWidth()` for x
and **nothing at all** for y — because 1 virtual unit is exactly 1 EFB scanline:

```c
// src/scene/channelEdit/iplChanAppEdit.cpp:185-188
f32 scisL = (translate.x - fScisHalfW) * (fbW / projRect.GetWidth()) + fbW / 2.f;
f32 scisT = efbH / 2.f - translate.y - fScisHalfH;          // no x-style scale
f32 scisW = fScisHalfW * 2.f * (fbW / projRect.GetWidth());
f32 scisH = fScisHalfH * 2.f;
```
`[Decomp — code evidence]`

Note that the *analog* window barely moves: 686/670 = **1.0239**. Only 2.4% of the widening
comes from the console. **The other ~33% is the 16:9 display's own stretch of a signal it
believes is 4:3.** That is the honest sense in which the Wii is anamorphic.

### 2.3 But: is it "the same content, wider"? No.

**The Menu renders into a genuinely wider layout space and shows genuinely more.** This is where
the old claim fails:

- The projection is 832 units wide vs 608 — **36.8% more layout room**, at the same vertical
  extent.
- Because location-adjusted panes keep their authored size while their anchors spread out,
  **elements stay the same physical size and just get further apart**. Nothing is stretched
  except deliberately-unflagged backgrounds.
- Channel icons are authored **twice**. `[Decomp — code evidence]`:

```c
// src/scene/channelSelect/iplChannelObj.cpp:151-158  (and iplChannelSelect.cpp:140-149,
//                                                     iplChanAppEdit.cpp:10-13 — three copies)
const float cfChanThumbOfss[][2] = { {64.0f, 48.0f},    // 4:3   → 128 × 96
                                     {85.0f, 48.0f} };  // 16:9  → 170 × 96
mThumbWidth (cfChanThumbOfss[SCGetAspectRatio()][0]),
mThumbHeight(cfChanThumbOfss[SCGetAspectRatio()][1])
```
  and Nintendo mandates it: "a 170 x 96 image must be prepared in advance… in 4:3 mode the
  superfluous pixels on the left and right edges of the 170 x 96 image are not displayed"
  (`wii_design_specs.pdf` §2.3, Figures 2-1 – 2-7) `[Official]`. If the developer *didn't*
  author a wide icon, the flag is left off and the 4:3 art is simply stretched — Nintendo's
  Figure 2-4/2-6 show exactly that failure mode.

So the correct formulation is: **anamorphic signal, genuinely wider composition.** A tile is
128 units wide on a 608-wide screen (21.05%) and 170 units on an 832-wide screen (20.43%) —
same physical height, ~33% more physical width, filled with a wider crop of the icon art.

**Consistency check that this is a real design, not an accident.** Ask whether one virtual unit
is the same physical size in both modes. Content-per-analog-sample is 608/670 = 0.9075 u/sample
in 4:3 and 832/686 = 1.2128 u/sample in 16:9; the ratio is **1.3365**, against the 4/3 = 1.3333
that a 16:9 display's stretch supplies. Agreement to **0.24%**. `[Inferred]` Nintendo's numbers
are calibrated so that switching to widescreen changes *how much you see*, not *how big it is*.

---

## 3. The four real-world combinations

**The single most important fact: the console never letterboxes, pillarboxes, crops, or
detects.** It always paints a full 480i/480p (or 576i) raster and hands it over. Every framing
decision below belongs to the TV. There is no aspect handshake — the AV connector's pin-16
SCART aspect signalling is documented as **not actually driven** by the console
([WiiBrew — Video output](https://wiibrew.org/wiki/Video_output)) `[Fan/community]`, and nothing
in `reset_render_mode()` touches it `[Decomp — code evidence]`.

| # | Console setting | TV | What the console outputs | What the viewer sees |
|---|---|---|---|---|
| 1 | 4:3 | 4:3 | 608×456 layout in a 640×456 buffer, displayed at 670×456 of the raster | **Correct.** The baseline the layouts were authored against. |
| 2 | 16:9 | 16:9 (anamorphic/"Full") | 832×456 layout in the *same* 640×456 buffer, displayed at 686×456 | **Correct.** Same element sizes as #1, ~37% more horizontal content. |
| 3 | **16:9 setting, 4:3 TV** | 4:3 | identical to #2 | **Horizontally squashed by ~4/3, full screen, nothing letterboxed.** The 4:3 set has no idea the signal is anamorphic, so the 832-wide composition is crushed into a 4:3 window: circles become tall ellipses, the grid becomes narrow and the channel icons are ~25% too thin. Not letterboxed — the console does not offer that, and a 4:3 CRT has no "16:9 squeeze" mode to trigger. |
| 4 | **4:3 setting, 16:9 TV** | 16:9 | identical to #1 | **Entirely the TV's choice.** In "Normal / 4:3" the TV pillarboxes with black side bars and the image is geometrically correct. In "Full / Wide / Stretch" — the factory default on a great many mid-2000s sets — the TV stretches the 608-wide composition to 16:9 and everything is ~33% too fat. In "Zoom" it crops top and bottom. The Wii contributes nothing to this decision. |

`[Decomp — code evidence]` for the "what the console outputs" column; `[Inferred]` for the
viewer column, which is standard display behaviour rather than anything Wii-specific.

Combination #3 is the one users reported as "the horizontal buttons look more squished," and the
squash direction in that report matches the model
([GBAtemp — Noob question Wii 16:9 mode](https://gbatemp.net/threads/noob-question-wii-16-9-mode.338956/))
`[Fan/community]`.

**Consequences worth internalising for the web build.** Because framing was the TV's job and TV
defaults varied wildly, **there was no single canonical on-screen appearance.** A large fraction
of real-world Wii owners in 2007-2012 were looking at case #4-stretched or case #3-squashed — a
geometrically wrong picture — simply because they never opened Wii Settings (which, recall,
defaults to 4:3). "The authentic look" therefore means *what Nintendo designed*, i.e. cases #1
and #2, not what a median household saw.

### 3.1 Screen Position — the one user knob the Menu ignored

Wii Settings > Screen also carried a horizontal **Screen Position** slider, stored as
`SCGetDisplayOffsetH()` (range −16…+16, mapped in `www_wiisetting.cpp:543`, `:790`, `:794`)
`[Decomp — code evidence]`. But `Framework::reset_render_mode()` centres unconditionally —
`viXOrigin = (VI_MAX_WIDTH_NTSC - viWidth) / 2` (`iplFramework.cpp:214`) — and never adds the
offset. So **the slider did not move the Wii Menu itself**, only titles that read it.
*Caveat:* the SDK's `vi` module is **not** decompiled in this repo (`libs/RVL_SDK/src/` has no
`vi/`), so I cannot rule out `VIConfigure()` applying the offset internally. Flagging this as
**genuinely uncertain**; it does not affect any web decision.

---

## 4. Overscan — where the corpus's 810×456 comes from, and what is actually right

### 4.1 The claim under test

`src/useStageScale.js:44-50` currently says: *"810x456 is the visible area of the Wii's 16:9
layout space. The full authored space is 832x456, but the outer ~11px per side fell into TV
overscan and was never seen… Note for anyone porting decomp coordinates: those are in the
832-wide space, so subtract 11 from x."*

**The number 810 is defensible. The mechanism and the conversion rule are both wrong.**

### 4.2 Where 810 really comes from — Nintendo's own document

`wii_design_specs.pdf` §3.4.1, Code 3-1 "Rendering Settings" gives the Viewer configuration
developers were told to preview banners against: `[Official]`

```
# Frame buffer size
/system/video/fb_width  = 608
/system/video/fb_height = 456
# Screen size
/system/video/vi_width  = 670
/system/video/vi_height = 456
```

Two things: `608×456` is Nintendo calling the **layout space** the frame buffer, independently
confirming the decomp's 4:3 projection rect; and `670×456` is **exactly** the decomp's 4:3
`viWidth`/`viHeight`. Two independent sources, same numbers.

Elsewhere the same document gives the banner *display area* as **590×332 (4:3) / 810×332 (16:9)**
(`visual-design.md` §468, `components/channel-tile.md` §511 quoting §3.4.2 Fig. 3-3/3-4)
`[Official]`. That is the origin of 810 — it is Nintendo's **16:9 banner content aperture**, a
figure about banners, not about overscan. 810/832 = 0.9740 and 590/608 = 0.9704 — i.e. the
banner window is inset ~3% inside the layout space in both modes, which is a banner-framing
decision (there is a black frame and buttons around it, per Figure 3-1).

### 4.3 What the console actually gives up

Nothing is cropped by the console. The **entire** 832×456 (or 608×456) ortho volume maps to the
**entire** 640×456 viewport — `GXSetViewport(0, 0, fbWidth, efbHeight)` `[Decomp — code
evidence]`. The safe-area allowance lives one layer down, in the video mode:

| | drawn / analog raster | margin per edge |
|---|---|---|
| Horizontal, 4:3 NTSC | 670 / 720 = **93.06%** | 3.47% |
| Horizontal, 16:9 NTSC | 686 / 720 = **95.28%** | 2.36% |
| Vertical, NTSC | 456 / 480 = **95.00%** | 2.50% |
| Horizontal, 4:3 PAL50 | 666 / 720 = **92.50%** | 3.75% |
| Horizontal, 16:9 PAL50 | 682 / 720 = **94.72%** | 2.64% |
| Vertical, PAL50 | 542 / 574 = **94.43%** | 2.79% |

`[Decomp — code evidence]` Outside that window the VI outputs black. **So the Wii Menu was
letterboxed and pillarboxed — by ~2.5–3.5% per edge — by the console itself.** On a CRT that
band sits inside overscan and is invisible; on a zero-overscan path (480p into a flat panel with
1:1 or "Just Scan") a thin black frame is genuinely present. This is the same reason
standard-render-mode GameCube/Wii captures show side bars.

**Nintendo did respect a safe area, and it is ~95% per axis** — comfortably inside the
action-safe ~90% convention, nowhere near title-safe ~80%
([Wikipedia — Overscan](https://en.wikipedia.org/wiki/Overscan);
[NAB — Television Safe Areas Redefined](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf))
`[Fan/community]` for the conventions. Note that 456 is not an EFB-budget choice: 640×480 fits
the 2 MB EFB fine. 480 − 456 = 24 lines = exactly 5%. It is a deliberate margin. `[Inferred]`

**Inside that margin, the layout is emphatically not safe-area-conscious.** `[Extracted]`:
the bottom bar runs full-bleed with square corners; the half-pill plates *overshoot* the screen
edge by ~100 units by design (§1.3); the edge page containers `N_Ch_a`/`N_Ch_e` exist solely to
feed the one column that peeks past the screen edge; `ChMask`, the launch-zoom veil, is exactly
608×456, i.e. exactly the drawn region and not one unit more. Nintendo put the whole safe-area
budget in the video mode and then designed edge-to-edge inside it.

### 4.4 The residual 2.6%, and why I cannot close it

There is one genuinely unresolved question, worth stating plainly because it is exactly the
832-vs-810 gap.

608/456 = **1.3333** — exactly 4:3. But 832/456 = **1.8246** — **2.6% wider than 16:9**
(1.7778). Whether the 832 space appears square-pixel on a real 16:9 set depends on how many of
the 720 analog samples per line constitute the visible picture:

- **Model A — 720 samples = the full picture.** Then the drawn region occupies 95.28% W ×
  95.00% H of a 16:9 screen, its physical aspect is 1.7830 ≈ 16:9, and the 832-wide layout is
  rendered **~2.2% horizontally compressed** relative to square. 4:3 comes out at 1.3060 (2.0%
  compressed). Under this model, **"810×456" is the right shape** and the reason is the
  anamorphic squash, not a crop.
- **Model B — 704 samples = the 4:3/16:9 clean aperture** (BT.601's convention; the outer 8
  samples per side are nominal blanking). Then 670/704 = 95.17% W against 95.00% H → 4:3 renders
  at 1.3357, and 686/704 = 97.44% W → 16:9 renders at 1.8235 against a layout of 1.8246.
  **Square pixels in both modes, agreement to 0.06% and 0.18%.** Under this model the layout
  space is 1.8246 and a full-screen 16:9 frame is 2.6% narrower than the truth.

Model B is better broadcast engineering and fits both constants far more tightly (0.06%/0.18%
vs 2.0%/2.2%), which is real evidence for it. Model A is what the SDK constant literally says
and what `viXOrigin` centres against. **I cannot settle this from the decomp; it needs a
calibrated capture off real hardware.** `[Inferred — flagged uncertain]`

**What settles the practical question anyway:** emulators do not reproduce the VI border. Dolphin
renders the EFB into the chosen aspect, so a Dolphin/Wikipedia 16:9 capture *is* the 832×456
layout squeezed into 1.7778 — Model A's picture — whatever real hardware did. I verified
`reference_screen.png` (420×236, ratio 1.7797) has **no black border**: every edge pixel is
content (`(233,233,233)` top corners, `(205,207,215)` bottom corners). So every pixel measurement
in this corpus is anchored to a 16:9-framed, Model-A-shaped image.

### 4.5 Two corrections to `useStageScale.js`

1. **"the outer ~11px per side fell into TV overscan and was never seen"** — false as stated.
   Nothing in the 832 space is cropped by the console. Under Model A the 22 units are a 2.6%
   *horizontal compression* applied uniformly, not a crop; under Model B they are simply on
   screen. (A real CRT's own overscan, ~3–5% per edge, *did* crop — but that is the viewer's TV
   eating into the console's black margin and then some, and it varied per set.)
2. **"subtract 11 from x"** — wrong operation. The relationship is multiplicative:
   `x_810 = x_832 × (810.67 / 832) = x_832 × 0.97436`. For the SD button at x = −245 the
   subtract rule gives −234 (57.8% of the 405 half-width) where the correct answer is −238.7
   (58.9%). That is ~4.5 stage px of error at the edges, growing linearly from centre — exactly
   where the bar clusters, half-pills, arrows and SD button live.

**Nothing in the corpus expressed as a *percentage* of screen width is affected** by the
832/810 question — a uniform horizontal scale leaves fractions untouched. Only absolute-unit
figures and shape-aspect claims move.

### 4.6 A coincidence worth knowing about

`components/channel-tile.md` §0 validates the 810 space by measuring the grid pitch in
`reference_screen.png` and finding scales of 1.929 H / 1.932 V — "square pixels, matching to
0.15%" — on the assumption that the 16:9 slot pitch is 170. But `[Extracted]` gives the authored
grid as columns at x = −192, −64, +64, +192, **pitch 128**, in the 608 space
(`brlan-extraction.md` §9.1) — which the root scale turns into a pitch of 128 × 1.36842 =
**175.2** in the 832 space. And 175.2/832 = 21.05% while 170/810 = 20.99%. **The two models
predict grid pitches 0.3% apart**, i.e. 0.13 px in a 420-px screenshot. That measurement cannot
distinguish them and does not corroborate 810; it corroborates "21.0% of screen width," which
both models agree on. Worth flagging so nobody treats it as settled evidence.

---

## 5. Did anything reflow? No.

**The grid is hard-coded, with no aspect term anywhere.**

```c
// include/system/iplChannelManager.h:27-33
#define MAX_CHANNEL_COLUMN 3
#define MAX_CHANNEL_ROW    4
#define MAX_CHANNEL_INDEX  (MAX_CHANNEL_ROW * MAX_CHANNEL_COLUMN)   // 12
#define MAX_CHANNEL_PAGE   4
#define MAX_CHANNEL_TOTAL  (MAX_CHANNEL_PAGE * MAX_CHANNEL_INDEX)   // 48
```
`[Decomp — code evidence]` Verified rather than restated: these are preprocessor constants, not
computed, and `grep` finds no `SCGetAspectRatio` anywhere near them. `mscChanPaneNames` is a
fixed `[5][12]` table of literal pane names (`iplChannelSelect.cpp:35-106`) — you could not add
a column without new panes in the `.brlyt`.

What changes and what does not:

| Property | 4:3 | 16:9 | Reflow? |
|---|---|---|---|
| Columns × rows | 4 × 3 | 4 × 3 | **No** |
| Pages | 4 | 4 | **No** |
| Slot pitch (authored) | 128 × 96 | 128 × 96 → root-scaled to **175.2** × 96 | No — same **21.05% × 21.05%** of screen in both |
| Row pitch | 96 (21.05% of height) | 96 (21.05% of height) | **No — identical** |
| Icon canvas | 128 × 96 | **170 × 96** | Wider *aperture*, same count |
| Icon art | 4:3 composition | separately authored wide composition | **Different art** |
| Page-slide travel | ±512 authored units | ±512 × 1.36842 = ±700.6 | Same **84.2%** of screen width both modes |
| Half-pill visible width | ~19.8% of width | ~14.9% of width | Element **shrinks proportionally** (keeps absolute size) |
| SD button anchor | 25.00% from left | 20.55% from left | **Hand re-anchored** |

Sources: constants `[Decomp]`; pitch and travel `[Extracted]` (`brlan-extraction.md` §6, §9.1)
combined with the root-scale mechanism `[Decomp]`; icon canvases `[Decomp]` + `[Official]`;
half-pill and SD figures derived in §1.2(c) and §1.3.

So: **tiles keep the same on-screen *height* and the same grid *fractions*; the aperture aspect
changes (128×96 → 170×96, i.e. 1.333 → 1.771) and the art with it.** The corpus's "fixed 4×3 in
both modes" is confirmed. Its implication that widescreen was therefore cosmetically inert is
not — the tile really does get ~33% physically wider and shows different art.

One correction while I am here: `brlan-extraction.md` §6 says the page travel of ±512 units is
"61.5% of the 832-wide 16:9 space." That treats the authored value as unscaled. `N_ChAll` is a
descendant of the root pane, so its animated translate **is** multiplied by 1.36842 in 16:9 →
700.6 units = **84.2%**, the same fraction as 4:3. `[Inferred from the §1.2(b) mechanism]` The
page slide covers the same proportion of the screen in both modes, which is also the only
behaviour consistent with a carousel whose page containers sit at x = ±512, ±1024.

---

## 6. Non-standard displays

**480p / component / D-terminal.** `sRMO_Ntsc_640x456Prog` (`iplFramework.cpp:36-55`) is
**geometrically identical** to the interlaced mode — same 640×456, same 670/686 viWidth, same
viXOrigin/viYOrigin. Selected when `VIGetDTVStatus() == TRUE && SCGetProgressiveMode() ==
SC_PROGRESSIVE_MODE_ON` (`:204-208`). Two things differ: `VI_XFBMODE_SF` instead of `DF`, and
the vertical filter coefficients go from `7,7 / 12,12,12 / 7,7` to **`0,0 / 21,22,21 / 0,0`** —
i.e. the deflicker filter is switched off. `[Decomp — code evidence]` **Framing: no difference.
Sharpness: 480i output is vertically blurred by a 3-tap filter; 480p is not.** If a reference
capture came off 480i it carries that softening, which is a capture artifact, not a design
choice — do not reproduce it in CSS.

**PAL 576i.** `sRMO_Pal50_640x456IntDf` renders the **same 456-line EFB** and vertically
upscales it to a **542-line XFB** on copy-out (`GXSetDispCopyYScale`, `iplFramework.cpp:174-176`),
displayed at viHeight 542 of the 574-line PAL raster, viWidth 666/682. `[Decomp — code
evidence]` So PAL shows **exactly the same composition, resampled 1.1886× vertically** — no
letterbox, no PAL border, no lost content. This is unusual and worth saying out loud: many PAL
Wii/GC *games* letterbox or run at 5/6 height; **the System Menu does not.** The only PAL
differences are the vertical resample (slightly softer) and `DELTA_50 = 1.2f`
(`iplFramework.cpp:9`, `:248`) — the animation clock runs 20% slower in wall-clock terms because
frame counts are unchanged at 50 Hz, which `decomp-findings.md` already records.

**PAL60 / EURGB60.** Falls back to the NTSC-identical `sRMO_Pal60_640x456IntDf` /
`sRMO_Pal60_640x456Prog` with `DELTA_60`. `[Decomp — code evidence]`

**HDTVs and external upscalers.** There is **no console-side difference** — the Wii has no HD
mode, and the Menu emits 480i/480p/576i and nothing else
([WiiBrew — Video output](https://wiibrew.org/wiki/Video_output);
[Wikipedia — Wii](https://en.wikipedia.org/wiki/Wii)) `[Fan/community]`. What varied was the
*display's* handling: line-doubling quality, whether the set applied its own overscan zoom
(commonly ~2.5–5% per edge on 2000s HDTVs, on top of the console's own black margin), and which
aspect mode was selected. An upscaler set to 1:1 reveals the console's black border; one set to
"overscan"/"zoom" hides it and crops content. **No documentation was found of the Menu being
framed differently on any specific display class, and the decomp contains no display-detection
path beyond `VIGetDTVStatus()` (progressive capability only).** `[Decomp — code evidence]` for
the absence; treat "no HDTV-specific behaviour" as **well-supported but proven only by absence**.

---

## 7. Synthesis for the web build — the deliverable

### 7.1 What "authentic" can even mean here

The console produced a fixed-size, fixed-shape image and had no opinion about the display. So
there is no authentic answer to "what should happen when the browser window is 21:9" — the
question never existed. What we *can* be faithful to is: **a single, fixed composition, shown
whole, at correct proportions, on black, with no chrome of the console's own.**

### 7.2 The options

**Option A — fixed stage, letterbox/pillarbox on black (what the project does now).**
Faithful to the composition and to how the console framed itself: the console literally
letterboxed and pillarboxed its own output with a black border (§4.3), so black bars are the
*correct* colour and a defensible visual. Stable for screenshot diffing. Cost: bars on
non-matching windows. **This is the right default.**

**Option B — swap the 4:3 and 16:9 layouts by window aspect.**
Superficially the most faithful ("the console genuinely did this") but it is not what the
console did. The console read a **manual SYSCONF flag that defaulted to 4:3** (§1.1) and never
detected anything; auto-swapping on window resize is a modern invention wearing period costume.
It also has a hard blocker: **4:3 geometry is entirely unmeasured** (README open question #3 —
every pixel measurement in this corpus comes from one 16:9 capture) and §1.2(c) proves elements
were hand-re-anchored between modes, so it cannot be derived from the 16:9 layout. You would be
inventing the 4:3 layout, which is worse than not shipping it.

**Option C — stretch to fill.**
Reproduces combination #4-on-a-badly-configured-TV. Authentic to a very common
*misconfiguration*, not to the design. It also destroys the tile superellipse work, the
half-pill radii and the balloon geometry at every non-matching window size. Reject as a default;
tolerable only as a joke toggle.

**Option D — crop / simulate overscan.**
The crop was the *viewer's TV*, varied per set, and is precisely what Nintendo's ~95% render-mode
margin was designed to survive. Simulating it throws away content the console deliberately
protected. At most an opt-in cosmetic filter alongside scanlines; never the layout model.

### 7.3 Recommendation

**Ship Option A: a fixed 832×456 stage, full-bleed, uniformly scaled, centred on black.**

Four concrete changes:

1. **Move the coordinate space from 810×456 to 832×456.** This is the highest-value change and
   it is about correctness, not aesthetics. 832×456 is the space every decomp constant, every
   extracted `.brlyt` coordinate and every percentage in this corpus lives in. Working in 810
   requires a ×0.97436 on every x — and the codebase currently documents the *wrong* rule
   (subtract 11, §4.5), which is itself the argument: the conversion is error-prone and has
   already gone wrong once. In 832 space there is no conversion.
2. **Stage box aspect = 832/456 = 1.8246, uniform scale, square pixels.** Under Model B this is
   physically exact; under Model A it is 2.6% wider than a real 16:9 set showed. Given the
   uncertainty is 2.6% and the cost of the alternative is a permanent per-coordinate fudge plus
   non-uniform text rasterisation, take the clean space. In a 16:9 browser window this
   letterboxes by 1.3% of height at top and bottom — barely visible, and black, which is what
   the console itself output around its picture.
   *If a future calibrated hardware capture settles Model A*, the fix is a one-line change of
   the stage aspect to 16:9 with `scaleX = 0.97436 × scaleY`; nothing else moves.
3. **Remove the MacBook bezel** (see §8).
4. **Do not auto-swap layouts on window aspect.** Ever.

**Should the app expose a 4:3/16:9 toggle mirroring Wii Settings?**
**Eventually yes, as a manual setting; not now.** It is genuinely authentic — it is the actual
console affordance, it lived in Wii Settings > Screen > Widescreen Settings, and 4:3 was the
factory default. Done properly it is a lovely piece of fidelity: the same UI, re-anchored, with
4:3 icon crops. But it is blocked on measuring the 4:3 layout, and shipping a guessed 4:3 mode
would be worse than shipping none. Specification for when it is unblocked:

- The toggle sets a mode flag, exactly like SYSCONF. **It must not react to window size** — that
  is the whole point.
- 4:3 mode = stage 608×456 (exactly 4:3, no aspect ambiguity), pillarboxed on black.
- Layout translation, derived from §1.2(b): author every coordinate in the **608 space**; in
  16:9 multiply x by **1.36842** and, for elements that should keep their shape, divide their
  own width by 1.36842. In CSS that is a `scaleX(1.36842)` on the stage root plus
  `scaleX(0.73077)` on each "position-adjusted" element — a direct, honest transcription of
  Nintendo's mechanism, and it gets the half-pill and SD-button behaviour right for free.
- Known 4:3 deltas to implement: SD button at **25.00%** from the left instead of 20.55%
  (`iplSDMenuButton.cpp:50-55`); half-pills **~19.8%** of screen width instead of ~14.9%
  (§1.3); channel icons crop to a **128×96** aperture instead of 170×96
  (`wii_design_specs.pdf` §2.3 — "the superfluous pixels on the left and right edges… are not
  displayed").
- Default the toggle to **16:9**. Yes, the console defaulted to 4:3 — but the corpus's entire
  measured ground truth is the 16:9 layout, and 16:9 is what a browser window is. Note the
  discrepancy in the UI copy rather than in the geometry.

### 7.4 The bezel

**A decorative TV bezel is not authentic framing, and it is not neutral.** The console output no
chrome of its own; a viewer saw the Menu edge-to-edge on their television with, at most, the
console's own ~2.5–3.5% black margin. Full-bleed is correct. Concretely:

- A **MacBook** bezel is period-inappropriate on top of being non-authentic — the Menu was never
  seen on a laptop.
- The genuinely authentic border is **black, ~2.5% of height and ~2.4% of width per edge** (the
  VI's own, §4.3). If a frame is wanted for its own sake, *that* is the one with a citation
  behind it — and it is so thin it reads as a hairline, not as chrome.
- A CRT-shaped bezel would at least be period-correct, but it still asserts something the corpus
  cannot support (which TV? what overscan?) and it costs the same scale-factor penalty.

**Recommendation: remove it.** If the owner wants presentation chrome for a portfolio shot, make
it an explicit, off-by-default "display frame" toggle that is documented as a presentation
device, and keep the visual-regression baselines on the bare stage.

---

## 8. Where authenticity and the scale factor agree — and where they don't

They **agree**, cleanly, and this is the pleasant part.

Current state: an **810×456** stage inside a `.tv-frame` of aspect **1512/982** whose
`.stage-area` is **86.56%** of the frame height (`src/components/WiiMenu.css:16-46`). At the
configured test viewport of **1664×912** (`playwright.config.js:24`) that yields
`min(1404.2/810, 789.4/456)` = **1.7311×** — a non-integer scale, so every stage pixel lands on
a fractional device pixel, text is resampled, and screenshot diffs sit on a knife edge.

| Configuration | Scale at 1664×912 | Fill |
|---|---|---|
| 810 stage + bezel (today) | **1.7311×** | bezel-limited |
| 810 stage, no bezel | **2.0000×** (height-limited) | 1620×912 — 22 px pillars each side |
| **832 stage, no bezel** | **2.0000×** | **1664×912 exactly — zero bars** |

The test viewport is already 1664×912, and `playwright.config.js:5-8` says why: *"the viewport
is pinned to an exact integer multiple of it (832x456 x2 = 1664x912)."* **The harness was
configured for an 832 stage; the stage was then built at 810 and the two drifted apart.** Note
also that 1664/912 = 1.8246 — the viewport's own aspect is already the native 832×456 shape, not
16:9.

So the recommendation in §7.3 is over-determined:

- **Authenticity** wants 832×456 (the decomp's actual space, no conversion, no wrong subtraction
  rule) and full-bleed (the console had no chrome).
- **Engineering** wants 832×456 and full-bleed too — it is the only configuration that gives
  exactly **2.0000×**, exact viewport fill, no letterbox in the harness, integer device-pixel
  alignment for every coordinate, and therefore crisp text and byte-stable screenshots.

**The only conflict** is with `reference_screen.png`: a 832-wide stage renders 2.6% wider than
that capture, so a naive overlay diff against it will show a horizontal drift growing from the
centre. Two mitigations, both cheap: compare in **percentages** (which are model-independent,
§4.5), or pre-stretch the reference by 832/810.67 = 1.02633 before overlaying. Neither touches
the app.

**If the 810 space is kept anyway**, then at minimum: (a) fix the conversion rule from
`x − 11` to `x × 0.97436`, and (b) change the test viewport to **1620×912**, which restores an
exact 2.0000× and exact fill for an 810-wide stage.

---

## 9. Corrections this document makes to the existing corpus

| Doc | Claim | Status |
|---|---|---|
| `technical-specs.md` §3 | "widescreen is handled at the video-output/stretch level, not by the UI reflowing" | **Half right.** Grid does not reflow ✓; but the UI *does* change — different projection, root scale + counter-scale, hand re-anchoring, texture swaps, duplicate panes, wider icon art. §1, §5. |
| `technical-specs.md` §3 marker | "widescreen is implemented as a **texture swap, not a scale**" | **Incomplete.** Texture swap is one of five mechanisms and the *least* structural. The primary mechanism is the root-scale/location-adjust pair, `iplLayout.cpp:361-383`. §1.2. |
| `technical-specs.md` §1 | 640×480 output; 16:9 uses a 720-px-wide frame | **Wrong.** The Menu's render mode is **640×456** in every region and mode; 16:9 changes `viWidth` 670→686 (2.4%), not 640→720. §2.1. |
| `technical-specs.md` §6 | safe-area margins are "unsourced/inferred" | **Now sourced.** ~95% per axis, in the render mode, `iplFramework.cpp:14-99`. §4.3. |
| `src/useStageScale.js:44-50` | 832−810 is overscan crop; convert with `x − 11` | **Both wrong.** Nothing is cropped by the console; the conversion is `× 0.97436`. §4.5. |
| `components/channel-tile.md` §0 | 420×236 capture proves the 810 space (square to 0.15%) | **Non-probative.** 175.2/832 and 170/810 differ by 0.3%; the measurement cannot separate them. §4.6. |
| `brlan-extraction.md` §6 | page travel = 84.2% of 608 but "61.5% of the 832-wide space" | **Wrong.** Root scale applies: 700.6/832 = **84.2%** in both. §5. |
| `brlan-extraction.md` §8 | bar cluster absolute X "must be re-anchored at runtime… treat as 16:9-authored" | **Resolved.** 4:3-authored, no runtime re-anchor (`iplButton.cpp` has no root `SetTranslate`); the overshoot past the screen edge is by design and predicts the measured 14.6%. §1.3. |
| README open question #3 | "4:3 geometry is entirely unmeasured" | **Still open, but narrowed.** The transform rule is now exact, and three specific 4:3 deltas are derived (SD button 25.0%, half-pills ~19.8%, 128×96 icon aperture). §7.3. |

---

## 10. Sources

**Decompilation** (`reference/wii-ipl`, System Menu 4.3) — cited inline by `file:line`. Key
files: `src/system/iplSystem.cpp`, `src/system/iplFramework.cpp`, `src/layout/iplLayout.cpp`,
`libs/NW4R/src/lyt/lyt_pane.cpp`, `src/utility/iplGraphics.cpp`,
`src/scene/channelSelect/iplChannelSelect.cpp`, `src/scene/channelSelect/iplChannelObj.cpp`,
`src/scene/sdButton/iplSDMenuButton.cpp`, `src/scene/channelEdit/iplChanAppEdit.cpp`,
`src/scene/limitOver/iplLimitOver.cpp`, `src/system/iplController.cpp`,
`src/iplwww/www_wiisetting.cpp`, `libs/RVL_SDK/include/revolution/vi/vitypes.h`,
`libs/RVL_SDK/include/revolution/sc.h`, `include/system/iplChannelManager.h`.

**Official** — `wii_design_specs.pdf`, *Icon and Banner Specifications*, RVL-06-0166-001-L,
released 2008-02-26: §2.3 (icon canvases, position adjustment), §3.4.1 Code 3-1 (rendering
settings), §3.4.2 Figs. 3-3/3-4 (display area by screen mode).

**Extracted layouts** — `context/brlan-extraction.md` §1.4, §6, §8.1, §9.1, §10.2, §10.3.

**Web** —
[WiiBrew — Video output](https://wiibrew.org/wiki/Video_output) ·
[Wikipedia — Wii](https://en.wikipedia.org/wiki/Wii) ·
[Wikipedia — Overscan](https://en.wikipedia.org/wiki/Overscan) ·
[NAB — Television Safe Areas Redefined (PDF)](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf) ·
[GBAtemp — Noob question Wii 16:9 mode](https://gbatemp.net/threads/noob-question-wii-16-9-mode.338956/)

**Measured here** — `reference_screen.png` edge-pixel sampling (no black border present);
scale arithmetic against `playwright.config.js` and `src/components/WiiMenu.css`.
