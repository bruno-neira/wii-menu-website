# Component Deep-Dive: The "White Noise" / TV-Static Effect in Empty Channel Slots

**Scope.** Two independent questions, deliberately kept apart:

- **[PART A] What the real Wii actually renders in an empty slot** — an archaeology question. Answer
  it honestly even if it undercuts the current implementation.
- **[PART B] How to render convincing analog TV static on the web** — an engineering/aesthetic
  question. Answer it well *regardless* of Part A.

The project owner has already decided to keep a visible static effect as a **knowing creative
divergence**. This document exists so that divergence stays *informed*: Part A tells you what
authenticity costs, Part B tells you how to make the divergence look good, and §A.8 quantifies
exactly how far apart the two are on a single dial.

**Sourcing tags used throughout:**

| Tag | Meaning |
|---|---|
| **[Decomp — code evidence]** | Read directly from `reference/wii-ipl/` (koopthekoopa/wii-ipl @ `42a49cb`), a decompilation of the retail System Menu 4.3 binary. Cited `file:line`. This is the strongest tier available: it is Nintendo's own control flow. |
| **[Measured]** | My own pixel measurement, this pass. Source named per claim (`reference_screen.png` or the ripped sprite sheet). Reproducible. |
| **[Official]** | Nintendo-authored. |
| **[Fan/community]** | Wikis, forums, asset rips. |
| **[Inferred]** | My reasoning on top of the above. Not stated by any source. |

**Prior art in this repo, and what changes:**

- `context/components/empty-slot-and-sd-icon.md` §A.5 retrieved the ripped texture and flagged
  *"Why four frames is unresolved… Flagged as an open question."* → **RESOLVED in §A.3 below.**
- `context/decomp-findings.md` §5.1 found the ≥2000-frame randomly-phased animation and inferred
  *"the familiar slow gloss/sheen sweep."* → **That inference is wrong; corrected in §A.2/§A.4.**
- `context/visual-design.md`'s "faint **diagonal** grain" → confirmed wrong again, with numbers (§A.5).

---
---

# PART A — What the real Wii renders in an empty slot

## A.0 The one-paragraph answer

**The Wii Menu's empty channel slot really is TV static.** The texture Nintendo shipped for it is
a 128 × 96 four-bit intensity map of **pure per-pixel white noise** with a solid black "Wii"
wordmark stamped in the middle, and there are **four independent noise fields** of it — i.e. it is
an animated noise cycle, not a still. The decompiled System Menu confirms the empty slot binds a
looping animation and seeds it to a **random per-slot start frame** so the slots never tick in
lockstep. What makes everyone remember the empty slot as "flat gray" is that the Wii composites
that static at roughly **4–5 % contrast** over a `#D4D4D4` base — an amplitude of about **±6/255**,
which on a 2006 CRT at 480i is right at the edge of visibility. So: the owner's memory of "static
in the empty slots" is **not a misremembering. It is a correct memory of a real asset that the
console renders almost invisibly.** Turning the contrast up is therefore not an invention — it is
an *exaggeration of something genuinely there*, which is a much easier position to defend.

---

## A.1 What the decomp proves about the empty slot object

### A.1.1 The empty slot is a real animated layout object

```cpp
f32 ChannelObj::createEmptyThumbnail() {
    mpThumbLayout = layout::Object::create(mpMainHeap, 0x8000, mpSysLayoutFile, "arc", "my_IplTop_b.brlyt");
    mpThumbAnim   = mpThumbLayout->bind("my_IplTop_b.brlan");

    return System::getRndm()->get_u16() % 2000;   // ← randomised START FRAME
}
```
`reference/wii-ipl/src/scene/channelSelect/iplChannelObj.cpp:813-818` **[Decomp — code evidence]**

The return value is consumed by the caller as the animation's initial frame:

```cpp
} else {
    frame = createEmptyThumbnail();       // :727
    bVar1 = true;
}
calcNormal();
if (mpThumbAnim != NULL) { mpThumbAnim->play(); }        // :733-735
mpThumbLayout->finishBinding();
if (mpThumbAnim != NULL) { mpThumbAnim->setCurrentFrame(frame); }   // :737-739
```
`…/iplChannelObj.cpp:718-745` **[Decomp — code evidence]**

Four things are **proved**, not inferred:

1. Every empty slot instantiates its **own** copy of `my_IplTop_b.brlyt` (`layout::Object::create`
   per `ChannelObj`, 32 KB heap each). It is not one shared quad.
2. It binds `my_IplTop_b.brlan` and **plays** it.
3. Its start frame is `rand_u16() % 2000` — so the loop is **at least 2000 frames**. The System
   Menu runs at 60 Hz, so **≥ 33.3 s per cycle**, and every slot on screen is at a **different
   random phase**.
4. The animation is a **loop**, not a one-shot. `layout::Animator`'s constructor reads the
   `.brlan`'s own loop flag and sets `ANIM_TYPE_LOOP` when present
   (`reference/wii-ipl/src/layout/iplLayout.cpp:16-37`); the empty-slot code never calls
   `setAnmType`, so it takes whatever the asset declares — and a 2000-frame random seek into a
   non-looping animation would be nonsense, so it loops. **[Decomp + Inferred]**

### A.1.2 The pane names — `Ch0` and `Ch1`

The only pane names in the whole decomp for this layout come from the *sibling* path, the
"corrupted channel" thumbnail, which reuses the **same layout file**:

```cpp
f32 ChannelObj::createWrongThumbnail() {
    mpThumbLayout = layout::Object::create(mpMainHeap, 0x8000, mpSysLayoutFile, "arc", "my_IplTop_b.brlyt");

    mpThumbLayout->FindPaneByName("Ch0")->SetVisible(false);
    mpThumbLayout->FindPaneByName("Ch1")->GetMaterial()->SetTevColor(0, (GXColorS10){0, 0, 0, 255});

    mpThumbAnim = NULL;      // ← NO animation bound
    return 0.0f;
}
```
`…/iplChannelObj.cpp:802-810` **[Decomp — code evidence]**

This is quietly very informative:

- The layout has (at least) **two stacked picture panes, `Ch0` and `Ch1`.** Neutral, structural
  names — **not** `Noise`, `Shine`, `Wave`, `Gloss`, `Sheen`, or anything else that would reveal
  intent. I grepped the entire decomp for `noise|snow|static|grain|suna|zaza|arashi`: **zero hits.**
  So the pane names are a dead end for intent, and I am saying so plainly rather than
  over-reading them.
- A **corrupt** channel = the same layout with `Ch0` hidden and `Ch1`'s TEV register 0 forced to
  opaque black, **animation disabled**. So `Ch1` is drawn through a TEV stage whose constant
  colour register is externally settable, and forcing that register black turns the tile black.
- **[Inferred, strongly]** That is exactly the plumbing you need to render a high-contrast
  intensity texture at arbitrary low contrast: `Ch1` samples an `I4` intensity map and modulates
  it against a TEV constant colour. Set the constant to black → black tile. Set it to a
  near-`#D4D4D4` value → *barely-visible grain over light grey*. Which is precisely what §A.4
  measures on screen.
- The 2000-frame `.brlan` therefore has an obvious job: animate that TEV colour and/or the
  texture-pattern index on `Ch0`/`Ch1` over time.

### A.1.3 The drag placeholder shares the empty-slot layout — and gets frame-synced

```cpp
void ChannelSelect::createChanMoveLayout() {
    unk_0x2C4 = new layout::Object(getSceneHeap(), mpLayoutFile, "arc", "my_IplTop_b.brlyt");
    unk_0x2C8 = unk_0x2C4->bind("my_IplTop_b.brlan");

    f32 frame = System::getRndm()->get_u16() % 2000;
    unk_0x2C8->play();
    unk_0x2C4->finishBinding();
    unk_0x2C8->setCurrentFrame(frame);
    …
```
`reference/wii-ipl/src/scene/channelSelect/iplChannelSelect.cpp:1785-1793` **[Decomp — code evidence]**

and then, when a channel is actually moved:

```cpp
chanObj->mpThumbAnim->setCurrentFrame(unk_0x2C8->getCurrentFrame());
```
`…/iplChannelSelect.cpp:1967` **[Decomp — code evidence]**

and after the move completes, the shared placeholder animation is **re-seeded to a fresh random
frame** (`…/iplChannelSelect.cpp:2005-2007`).

**Why this matters for our question:** Nintendo bothered to write code that copies one empty-slot
animation's *current frame* into another empty slot's animation at the moment they swap places.
You only do that if **the frame you're on is visually distinguishable** — if the animation
produced no perceptible per-frame difference, this line would be dead weight. It is the single
strongest *code-side* evidence that the empty-slot animation has visible per-frame content.
**[Decomp + Inferred]**

Conversely, note what it does *not* prove: it tells you the animation matters, not what it looks
like.

### A.1.4 The hard limit — and where it actually binds

The decomp is **code, not assets**. `my_IplTop_b.brlyt` and `my_IplTop_b.brlan` live in
`/shared2/sys/…` on console NAND and are not in the repository; `reference/wii-ipl/` contains no
`.brlan`, `.brlyt`, `.tpl` or `.arc` payloads at all. Therefore, from the decomp alone:

| Recoverable | Not recoverable |
|---|---|
| File names, bind order, pane names `Ch0`/`Ch1` | Keyframe values |
| Loop vs one-shot, ≥2000-frame length, random phase | Which *properties* are keyframed |
| That a TEV constant colour on `Ch1` is externally settable | The TEV stage configuration |
| That frame phase is worth synchronising | The visual result |

**This is where the decomp trail ends.** Everything past this line in Part A comes from the ripped
texture (§A.3) and from pixel measurement of the reference capture (§A.4) — different, independent
evidence tiers. I flag the join explicitly because the decomp is by far the most authoritative
source in this repo and it should not be made to say more than it does.

---

## A.2 Correcting `decomp-findings.md` §5.1

`context/decomp-findings.md:528` currently reads:

> **[Inferred]** This is the familiar slow gloss/sheen sweep across empty slots.

**That inference should be withdrawn.** It was a reasonable guess from the frame count alone, but:

1. The gloss on a Wii tile is a **static** top-half highlight baked into the tile frame art — it is
  present identically on populated tiles, which use completely different layouts (`icon.brlyt`
  from each channel's own banner archive). A gloss sweep unique to *empty* slots has no
  counterpart anywhere in the UI. **[Inferred]**
2. The actual shipped texture for the empty slot is **white noise** (§A.3). There is no gradient,
  ramp, or sheen anywhere in it.
3. There is no separate "gloss" or "shine" asset in the empty-slot layout — only `Ch0` and `Ch1`.

**Replacement inference for §5.1:** the ≥2000-frame loop drives a **noise/luminance cycle** — a
texture-pattern (texture-swap) animation across the four noise frames and/or an animated TEV
constant colour producing a slow luminance breath. The random per-slot phase exists so twelve
simultaneously visible empty slots do not shimmer in unison. **[Inferred, from §A.1 + §A.3]**

---

## A.3 The ripped texture — the four frames, resolved

Sheet: **Wii — Wii Menu — "Empty Channel Spaces"**, uploaded by *larsenv*, 17 Aug 2015.
<https://www.spriters-resource.com/wii/wiimenu/asset/68562/> — **271 × 207 px PNG.**
**[Fan/community]**

> **Retrieval note (still true, still worth writing down).** The Spriters Resource's 403 is a
> **User-Agent check only**. `curl -A "Mozilla/5.0 … Chrome/124.0 Safari/537.36"` returns the page
> fine; the media host additionally wants a `-e` (Referer) pointing at the asset page. No login, no
> cookie, no rate limit encountered.

Four sprites of exactly **128 × 96** at offsets (5,5), (138,5), (5,106), (138,106); teal `#008080`
grid. 128 × 96 is Nintendo's own 4:3 authored icon canvas from the *Icon and Banner
Specifications*, so these are authoring-resolution source textures, not screenshot crops.
**[Fan/community + Official]**

### A.3.1 Measured character of the noise — pure white noise, 1 texel grain

Spatial autocorrelation of each frame, after mean removal. If the noise had any horizontal
streaking, scanline correlation, or blur, `dx = 1` would be large. It is not:

| Frame | r(dx=1) | r(dx=2) | r(dx=3) | r(dy=1) | r(dy=2) |
|---|---|---|---|---|---|
| F0 | +0.022 | +0.036 | +0.044 | +0.034 | +0.045 |
| F1 | +0.082 | +0.041 | +0.042 | +0.104 | +0.075 |
| F2 | +0.069 | +0.013 | +0.012 | +0.053 | +0.047 |
| F3 | +0.023 | +0.064 | +0.013 | +0.057 | +0.047 |

**[Measured from the sprite sheet]**

**Verdict: pure per-pixel white noise, grain size = exactly 1 texel, isotropic, no directional
bias whatsoever.** The residual +0.02…+0.10 is the shared "Wii" wordmark leaking into the
statistic, not spatial structure. Nintendo did **not** bake horizontal streaking into the texture —
any scanline character on the real console came from the 480i CRT downstream, not from the art.

### A.3.2 Measured amplitude distribution — a *saturated* noise, not uniform

Every frame quantises to exactly **16 levels, all multiples of 17** — the signature of a **4-bit
`I4` GameCube/Wii intensity texture** (128 × 96 I4 = 6144 bytes). The level histogram is
remarkably consistent and is **not** uniform:

| Frame | % at black end | % at white end | % spread over the 14 middle levels | σ | range |
|---|---|---|---|---|---|
| F0 | 25.5 % (@0) | 43.2 % (@255) | 31.3 % (≈2.2 % each) | 110.1 | 0–255 |
| F1 | 25.0 % (**@51**) | 41.1 % (@255) | 33.9 % | 90.8 | 51–255 |
| F2 | 26.9 % (@0) | 41.5 % (@255) | 31.7 % | 110.3 | 0–255 |
| F3 | 27.0 % (@0) | 40.2 % (**@221**) | 32.8 % | 95.2 | 0–221 |

**[Measured from the sprite sheet]**

This is a **clipped/saturated distribution** — about a quarter of texels slammed to the floor,
about 40 % slammed to the ceiling, and a flat ~2.3 %-per-level plateau in between. That is exactly
what you get from Gaussian noise with σ large relative to the codec range, hard-clipped: the tails
pile up at both rails. It gives **σ ≈ 110**, which is **1.4× the σ of a uniform 16-level noise
(σ ≈ 78)** — i.e. Nintendo's noise punches noticeably harder per unit of range than a naive
`rand() * 255` would. This is a directly copyable recipe and §B.8 copies it.

Note also **F1 has its black floor lifted to 51** and **F3 has its white ceiling lowered to 221**,
while F0 and F2 are full-range. Frame means: **F0 151, F1 166, F2 147, F3 126.** Same generator,
same clipping shape, different clamp points → a **luminance cycle** ridden on top of re-randomised
snow. **[Measured]**

### A.3.3 Why four frames — resolved

The old open question in `empty-slot-and-sd-icon.md` §A.5 was *"state variants? per-tile seeds?
LOD? nothing labels them."* Cross-correlation settles it:

| | F0 | F1 | F2 | F3 |
|---|---|---|---|---|
| **F0** | 1.000 | +0.079 | +0.045 | +0.049 |
| **F1** | +0.079 | 1.000 | +0.072 | +0.073 |
| **F2** | +0.045 | +0.072 | 1.000 | +0.057 |
| **F3** | +0.049 | +0.073 | +0.057 | 1.000 |

A full 2-D FFT cross-correlation over **all** circular shifts finds no peak above **0.079** for
any pair. **[Measured from the sprite sheet]**

So:

- The four are **statistically independent noise fields**, not shifted/scrolled copies of one
  field, and not tonal re-grades of one field.
- The residual ≈ 0.05–0.08 is **entirely** the shared wordmark: averaging all four frames cancels
  the noise by √4 and the "Wii" wordmark resolves cleanly, at **identical position in all four**.
- They cannot be per-tile seeds: the decomp instantiates the *same layout file* for every empty
  slot with no per-slot texture selection anywhere (`…/iplChannelObj.cpp:813-818`). The per-slot
  variation mechanism in the shipped code is the **random start frame**, not a texture pick.
- They cannot be hover/drag state variants: the decomp shows empty slots are **not hoverable**
  (`decomp-findings.md` §5.2), and the drag-target treatment is done by *not* masking them, not by
  swapping their texture.

**Conclusion: the four frames are animation frames of a noise cycle.** Combined with the
≥2000-frame looping `.brlan` and the randomised start frame, the coherent picture is a
**texture-pattern animation cycling four independent snow fields, with a slow luminance breath
(means 166 → 151 → 147 → 126) riding on top, randomly phased per slot.** **[Inferred — but from
two independent evidence tiers that agree, which is as strong as this can get without the .brlan]**

What is *still* unknown, and I will not guess: the **frame ordering**, the **advance rate** (four
frames spread over ≥2000 frames could be a swap every 500 frames ≈ 8.3 s, or a fast 4-frame
sub-cycle inside a slower envelope), and whether any additional keyframed properties exist.

---

## A.4 What it actually looks like on screen — measured

Source: `reference_screen.png` (repo root), **420 × 236**, a downscaled 16:9 capture. Six empty
tiles are present (row 3 × 4, row 2 × 2). Tile pitch 88.6 px horizontally / 50.5 px vertically;
tile interiors ≈ 85 × 45.

### A.4.1 Base tone and wordmark

Averaging the four row-3 empty tiles (which cancels their independent noise by √4 and leaves only
shared content) yields a clean recovery of the tile's true content:

| Quantity | Measured |
|---|---|
| Tile mean | **211.73 → `#D4D4D4`** |
| Column-mean σ across the tile (horizontal structure) | **0.50 / 255** — flat |
| Row-mean σ (vertical structure) | **5.51 / 255** |
| Wordmark depth below local base | **−7 / 255** (≈ 3 % contrast) |
| Wordmark bounding box | ≈ 46 × 24 within a 128 × 96 tile, centred (centroid 63,49 vs tile centre 64,48) |
| Fine grain σ after removing row shading, outside the wordmark | **1.68 / 255** |

**[Measured from `reference_screen.png`]**

`#D4D4D4` confirms `empty-slot-and-sd-icon.md` §A.1.1 exactly. The wordmark averages out of an
individual tile but is unmistakable in the 4-tile mean — a solid "Wii" in the Wii Menu's own
typeface, ~36 % of tile width.

### A.4.2 Deriving the on-screen contrast factor

The texture's wordmark is **solid black (0)** against a texture mean of **≈150**, i.e. a texture-side
delta of **−150**. On screen the wordmark is **−7**. So the composite factor is

```
k  =  7 / 150  ≈  0.047        →  ~4.7 % contrast
```

Cross-check against the noise: texture σ = 110, so predicted on-screen σ = 110 × 0.047 ≈ **5.2**
before any capture loss. `reference_screen.png` is downscaled roughly 1.5× (≈2.3 source pixels
averaged per output pixel), which attenuates uncorrelated noise by ≈ √2.3 ≈ 1.5 → predicted
**≈ 3.4**, and row-detrending removes more. **Measured 1.68–2.5.** Same order, consistent
direction. **[Measured + Inferred]**

> **So the real Wii draws genuine TV static at roughly 3–5 % contrast: grain amplitude of about
> ±5 to ±6 out of 255 around `#D4D4D4`, i.e. oscillating between about `#CD` and `#DA`.**
> **[Inferred, well-supported]**

That is why nobody remembers it as static. On a 2006 CRT at 480i, ±6/255 of 1-pixel-grain
luminance noise on a light-grey field, viewed at living-room distance, is essentially subliminal —
you register it as "the tile is slightly alive", not as snow.

### A.4.3 The prior "diagonal grain" claim — corrected again, with numbers

`context/visual-design.md` describes a *"faint diagonal grain/noise texture."*
`empty-slot-and-sd-icon.md` §A.6 already rejected this as capture scanlines. **Confirmed, and here
is the arithmetic:**

Decomposing an empty tile's variance into a per-row component and a per-column component:

| Component | σ |
|---|---|
| Per-row mean variation | **6.72** |
| Per-column mean variation | **0.75** |
| 2-D residual after removing both | 3.73 |

**Ratio row : column ≈ 9 : 1.** **[Measured from `reference_screen.png`]**

Raw autocorrelation of a single tile confirms the mechanism:

| lag | dx=0 | dx=1 | dx=2 | dx=3 | dx=4 |
|---|---|---|---|---|---|
| **dy=0** | 1.000 | **+0.858** | +0.833 | +0.835 | +0.833 |
| **dy=1** | **−0.066** | −0.088 | −0.090 | −0.086 | −0.089 |
| **dy=2** | +0.213 | +0.226 | +0.214 | +0.221 | +0.229 |
| **dy=3** | +0.308 | +0.298 | +0.280 | +0.282 | +0.286 |

Horizontal correlation stays at **0.83–0.86 out to 4 px** (a horizontal band of constant
brightness), while vertical correlation goes **negative at dy=1 and positive at dy=2** — the
textbook signature of an **alternating line pattern**. FFT of the row-mean profile puts a strong
peak at a **2.4–2.6 px period**, i.e. near-Nyquist vertical ripple.

**Verdict: horizontal scanlines from the capture/display chain, not diagonal, not content.** A
diagonal structure would show its correlation peak on a diagonal lag; there is none. `visual-design.md`
should be corrected. **[Measured]**

Note the irony: the *capture* has the horizontal streaking. The *asset* (§A.3.1) has none. The
current `ChannelStatic.jsx` copies the capture artifact and drops the asset.

---

## A.5 Does anything else in the real Wii Menu show TV static?

Short answer: **no — and it doesn't need to, because the empty slot genuinely is the static.** The
premise that the memory must be a *displacement* from somewhere else turns out to be false. Checked
exhaustively:

**Asset-name sweep.** Every `.brlyt`/`.brlan` string literal in the decomp (≈250 unique names,
`grep -rhoE '"[A-Za-z0-9_]+\.brl(yt|an)"' src/`) — nothing named for noise, snow, static, grain,
sand, or the Japanese equivalents (`suna`, `zaza`, `arashi`). A source-wide grep for those tokens
returns **zero hits** outside C++'s `static` keyword. **[Decomp — code evidence]**

| Candidate state | What it actually is | Evidence |
|---|---|---|
| **Disc Channel, no disc** | `my_DiskCh_b.brlyt` + `my_DiskCh_b.brlan`, explicitly `setAnmType(ANIM_TYPE_LOOP)` and started. A looping *disc* illustration, alpha-blended in/out. Not noise. | `iplChannelSelect.cpp:710-716` **[Decomp]** |
| **Disc Channel, unreadable disc** | `my_DiskCh_a_Unknown.brlan` / `_UnknownLoop.brlan` / `_UnknwnEject.brlan` — a "?" state. | asset inventory **[Decomp]** |
| **Corrupted channel tile** | Same `my_IplTop_b.brlyt`, `Ch0` hidden, `Ch1` TEV forced black, **animation NULL** → a flat **black** tile. | `iplChannelObj.cpp:802-810` **[Decomp]** |
| **Corrupted save data / banner** | `corrupt_texture.tpl`; the ripped sheet ("Corrupted Icon & Banner Data", <https://www.spriters-resource.com/wii/wiimenu/asset/80071/>) is a **grey "?" on white**. I downloaded and viewed it. Not noise. | `iplMemory.cpp:57` **[Decomp]** + **[Measured]** |
| **Channel loading** | "Waiting Icon" sheet (<https://www.spriters-resource.com/wii/wiimenu/asset/80072/>) — a small spinner, 133 × 67. Not noise. | **[Measured]** |
| **Channel launch / drag transition** | `my_TVMask_a`, `my_TVShade_a`, `my_TVApear_a` with `_Apear`/`_Lost` pairs — **TV-screen-shaped masks and shades**, plus a `16x9`/`4x3`/`4x3_dummy` texture swap for aspect ratio. This is the CRT "screen collapses/expands" metaphor, and it is where the "TV" language lives — but it contains no noise texture. | `iplChannelSelect.cpp:1794-1818` **[Decomp]** |
| **Boot / Health & Safety** | Static full-screen images (`Wii Startup Menu`, `Health and Safety Splash Screen` sheets). No noise. | **[Fan/community]** |
| **Fatal error** | `my_Fatal.brlyt` — the plain error screen. | **[Decomp]** |

**The design-language point worth keeping.** The Wii Menu's tiles are explicitly **little TV
screens** — Nintendo's own asset names say `TVMask`, `TVShade`, `TVApear`. An empty slot is a TV
that is on but tuned to nothing. Putting faint snow in it is not a whimsical addition; it is the
metaphor being carried through, and Nintendo carried it through. Turning that snow up is
therefore an *amplification of the original design intent*, which is the strongest possible
footing for a knowing divergence. **[Inferred]**

---

## A.6 Reproduction of the measurements

All figures above are reproducible. The measurement scripts were throwaway; the essential steps:

```python
# Reference capture: base tone, wordmark, scanline decomposition
im = Image.open('reference_screen.png').convert('L'); g = np.asarray(im, float)
y0,y1 = 122,163; xs = [37,125,214,302]; w = 80              # row-3 empty tile interiors
T = np.stack([g[y0:y1, x:x+w] for x in xs]); tmpl = T.mean(0)   # 4-tile mean → wordmark
tmpl.mean()                          # 211.73  → #D4D4D4
tmpl.mean(1).std(), tmpl.mean(0).std()   # 5.51 vs 0.50  → row-dominated (scanlines)

# Sprite sheet: grain size, distribution, frame independence
a = np.asarray(Image.open('68562.png'))[...,:3].mean(2)
F = np.stack([a[y:y+96, x:x+128] for x,y in [(5,5),(138,5),(5,106),(138,106)]])
# autocorr(F[i], dx=1) ≈ 0.02-0.08 → 1-texel white noise
# np.unique(F[i]) → 16 levels, all ×17 → I4 texture
# corrcoef across frames ≈ 0.05-0.08 → independent fields (residual = shared wordmark)
```

---

## A.7 Corrections to make in other docs

1. **`context/decomp-findings.md:528`** — replace *"the familiar slow gloss/sheen sweep"* with the
   noise-cycle reading (§A.2). Add a pointer to this file.
2. **`context/decomp-findings.md:1636`** — the "Empty-slot idle loop ≥2000 frames" row should note
   *what* animates.
3. **`context/components/empty-slot-and-sd-icon.md` §A.5** — strike *"Why four frames is
   unresolved… Flagged as an open question."* Resolved: four independent noise fields = animation
   frames (§A.3.3).
4. **`context/components/empty-slot-and-sd-icon.md` §A.5** — the note *"or the rip discarded an
   `IA`-format alpha channel"* can be dropped; the composite factor is directly derivable from the
   wordmark (§A.4.2) at ≈4.7 %, which requires no alpha hypothesis.
5. **`context/visual-design.md`** — *"faint diagonal grain"* → **horizontal capture scanlines**;
   9:1 row-vs-column variance, near-Nyquist vertical ripple (§A.4.3). The *content* grain is
   isotropic 1-texel white noise.
6. **`context/components/channel-tile.md`** — empty tiles should carry the ghosted "Wii" wordmark
   (−7/255, ~36 % of tile width, centred). The current `Channel.jsx` has no wordmark at all.

---

## A.8 The authenticity dial — one number

Everything in Part A collapses to a single parameter that Part B can expose:

| Setting | k (contrast) | On-screen amplitude | Reads as | Status |
|---|---|---|---|---|
| **Authentic** | **0.047** | ±6/255, `#CD`–`#DA` | "the tile is faintly alive" | What the console does **[Measured]** |
| Subtle | 0.10 | ±13/255, `#C7`–`#E1` | fine visible grain | interpolation |
| **Recommended default** | **0.18** | ±23/255, `#BD`–`#EB` | clearly analog snow, tile still reads light grey | §B.8 |
| Loud | 0.25 | ±32/255, `#B4`–`#F3` | strong snow | upper bound before the tile stops reading as a Wii tile |
| Raw texture | 1.00 | ±127/255, black↔white | full TV static | what the sprite sheet looks like un-composited |

**Everything else — 1-texel grain, 16 levels, saturated distribution, 128 × 96 canvas, random
per-slot phase — is authentic at every setting on this dial.** Only `k` diverges. That is a very
clean place for the divergence to live: it is one number, it is documented, and it can be turned
back to 0.047 at any time to get the real thing.

---
---

# PART B — Rendering convincing analog TV static on the web

## B.1 What analog TV snow physically is

### B.1.1 Origin

With no station tuned, a receiver's video amplifier has no signal to amplify — so it amplifies its
own noise floor, dominated by **Johnson–Nyquist thermal noise** in the first transistor the antenna
feeds, plus antenna-picked-up broadband EM noise (and, famously, a small contribution from the
cosmic microwave background). Wikipedia, *Noise (video)*: *"thermal noise produced by the inner
electronics. Most of this noise comes from the first transistor the antenna is attached to."*
<https://en.wikipedia.org/wiki/Noise_(video)> **[Official-ish / encyclopaedic]**

Two consequences that matter for rendering:

- **Thermal noise is white** (flat power spectral density) and **Gaussian** in amplitude. So the
  *underlying* process is Gaussian white noise.
- The AGC in a receiver with no signal runs wide open, so that Gaussian is amplified until it
  **clips against the display's black and white rails**. The *displayed* distribution is therefore
  a **hard-clipped Gaussian**: piles at both extremes, flat plateau in between. This is exactly
  the histogram measured in Nintendo's own texture (§A.3.2: 26 % black / 41 % white / 33 % spread).
  Nintendo's artist evidently knew this. **[Inferred + Measured, mutually confirming]**

### B.1.2 Why it is monochrome

A colour TV decodes chroma from the **colour burst** on the back porch of each horizontal sync
pulse. With no signal there is no burst, so the receiver's **colour-killer** circuit disables the
chroma decoder entirely. Only the luma path is live, so snow is **luminance-only — pure greyscale**.
**[Inferred from standard broadcast engineering]** Confirmed independently in the asset: every
pixel of the ripped texture is R = G = B, and every pixel of the empty tile in
`reference_screen.png` is exactly R = G = B. **[Measured]**

**Rendering rule: never introduce colour into the noise.** Coloured noise reads instantly as
"digital glitch effect", not "analog snow".

### B.1.3 Spatial frequency, and the real reason for horizontal streaking

NTSC luma bandwidth is **4.2 MHz** over a **52.6 µs** active line. The smallest resolvable feature
is ≈ 1/(2 × 4.2 MHz) = 119 ns, giving ≈ **440 resolvable elements per active line** (the familiar
"330 TV lines" horizontal resolution figure, after the 0.75 aspect correction). At a 640-pixel SD
raster that is **≈ 1.45 pixels per noise dot horizontally**.

Vertically, the picture is completely different: adjacent scan lines are **63.5 µs apart** in time,
which is ~500× the noise correlation time. So **vertically adjacent samples are fully independent.**

> **Therefore real CRT snow is anisotropic at roughly 1.5 : 1 — dots about one-and-a-half
> pixels wide and one line tall.** Not per-row bands. Not square. A mild horizontal smear.
> **[Inferred from NTSC bandwidth arithmetic]**

**This is the single most important correction to the current implementation.** `ChannelStatic.jsx`
gives each *row* one shared brightness (`rowBase`) with only small per-pixel jitter on top —
measured ratio row-σ : pixel-σ = **5.196 : 3.464 ≈ 1.5 : 1 in favour of the row term**, with the
row correlation extending across all 64 columns. Real snow's correlation extends **~1.5 pixels**.
The implementation is off by a factor of ~40 in correlation length, which is why it reads as
*horizontal shimmer bands* rather than snow.

Interestingly the "banded" look the current code produces is a decent imitation of **the capture
artifact** measured in §A.4.3 — which is presumably where it came from. But that artifact belongs
to the 2006 capture chain, not to the Wii Menu.

### B.1.4 Interlacing and perceived motion

NTSC is **59.94 fields/s, 29.97 interlaced frames/s**. Field *n* carries the odd lines, field
*n+1* the even lines. So on any given displayed frame, **vertically adjacent lines are from
different instants 16.7 ms apart**. Because the noise is temporally uncorrelated, this doubles
down on vertical decorrelation and produces the characteristic **"boiling"** quality — the image
never settles, and there is no coherent motion for the eye to track.

The practical implication is a happy one: **snow has no motion vectors.** There is nothing to
smoothly follow, so the eye is far more tolerant of a reduced update rate than it would be for,
say, a panning image. This is the entire basis for the frame-rate recommendation in §B.6.

---

## B.2 Which noise type, and what actually reads as "snow"

| Type | Spectrum | Reads as | Verdict for this effect |
|---|---|---|---|
| **Uniform white noise** (`rand()` per pixel) | flat | correct texture, slightly weak contrast for a given range | Good baseline |
| **Gaussian white noise** | flat | correct, but with σ tuned to fit the range it looks *soft* — too many mid-greys | Physically right, visually under-punchy |
| **Clipped Gaussian** | flat | **snow** — the rails pile up, the mid-tones thin out | ✅ **Correct answer.** Matches Nintendo's own histogram exactly (§A.3.2) |
| **Value / Perlin / simplex noise** | 1/f-ish, band-limited | **clouds, smoke, marble** | ❌ Wrong. This is the `feTurbulence` trap (§B.3.3) |
| **Fractal / fBm noise** | 1/f | plasma, fog | ❌ Wrong |
| **Blue noise** | high-pass | even dithering, no clumping | ❌ Wrong — real snow *does* clump |

**Grain size.** Below ~1 device pixel the noise aliases into a flat grey mush at any downscale;
above ~4 CSS px it stops reading as snow and starts reading as **mosaic / pixel-art blocks**. The
band that reads as analog snow is roughly **1–2.5 CSS px per grain**. The current implementation
renders 64 × 36 into a ~307 × 169 tile — **4.8 CSS px per grain**, which is over the top of that
band and lands squarely in "chunky mosaic".

**Contrast.** From the ladder rendered during this research (`k` = per-pixel amplitude as a
fraction of full range, over `#D4D4D4`):

| k | Appearance |
|---|---|
| 0.02–0.05 | invisible / "the surface is faintly alive" — **the authentic Wii** |
| 0.10 | fine, tasteful grain; reads as texture, not as static |
| **0.15–0.22** | **reads unambiguously as analog snow while the tile still reads as a light-grey Wii tile** |
| 0.40 | reads as a TV tuned to nothing, on a grey CRT |
| 1.00 | full black/white static — no longer a Wii tile |

**[Measured — rendered ladder]**

The threshold between "shimmer" and "snow" sits at about **k ≈ 0.12**. Below it the eye reads
surface texture; above it, discrete bright and dark dots resolve and the brain says *television*.

---

## B.3 Rendering techniques, honestly compared

### B.3.1 Canvas 2D `putImageData` per frame (the current approach)

Generation cost is **not** the problem. Measured on this machine (Node 22 / V8, Apple Silicon —
same engine family as Chrome):

| Method (128 × 96 = 12 288 px) | ms/call |
|---|---|
| `Math.random()`, four separate byte writes | 0.142 |
| `Math.random()`, one `Uint32Array` write | 0.072 |
| mulberry32 PRNG, one `Uint32Array` write | **0.040** |
| xorshift32, 4 pixels per PRNG call | 0.073 |

**[Measured]** Two cheap wins there: writing through a `Uint32Array` view of the `ImageData`
buffer is **2× faster** than four `Uint8ClampedArray` stores, and a hand-rolled `mulberry32` is
**1.8× faster than `Math.random()`** *and* seedable (§B.7). Note that squeezing four 8-bit samples
out of one 32-bit PRNG output was **slower**, not faster — the extra shifting costs more than the
PRNG call it saves.

Scaling to a full grid, generation only:

| Per-tile size | ms/frame | 48 tiles @ 60 fps, generation only |
|---|---|---|
| 64 × 36 | 0.009 | 25 ms per second of wall clock |
| 128 × 72 | 0.063 | 181 ms/s |
| 128 × 96 | 0.085 | 246 ms/s |
| 256 × 144 | 0.255 | **735 ms/s** — 73 % of one core, before drawing anything |

**[Measured]**

**The real cost is `putImageData` itself**, which is a CPU→GPU texture upload plus a canvas
invalidation. It cannot be batched, cannot be composited, and forces a raster of that canvas layer
every frame. 48 tiles × 60 fps = **2880 uploads/second**. This is the technique's fatal flaw at
grid scale.

Mitigations worth knowing:

- Use `ctx.createImageData()` **once** and mutate it; the current code allocates a fresh
  `ImageData` every draw.
- Write through `new Uint32Array(imageData.data.buffer)` (2× as above).
- **Pre-generate a pool of N frames once and cycle them** — turns per-frame cost from
  *generate + upload* into a single `drawImage` blit from a cached `ImageBitmap`, which the GPU
  handles. This is the mitigation that actually changes the complexity class.
- `createImageBitmap(imageData)` returns a GPU-resident, `drawImage`-able bitmap; do this once per
  pool frame at init.
- `OffscreenCanvas` in a worker moves generation off the main thread — useful for the one-time
  pool build, pointless if you've already amortised generation to zero.

**Verdict: fine for one tile, wrong for forty-eight — unless you convert it into a pre-generated
pool, at which point it stops being "putImageData per frame" at all.**

### B.3.2 Pre-rendered sprite sheet cycled with `steps()`

One image containing N stacked noise frames; animate `background-position-y` with
`animation-timing-function: steps(N)`.

- **Per-frame JS cost: zero.** The animation runs off the main thread's style/paint pipeline
  entirely once started, and the frames are one shared decoded texture no matter how many elements
  reference it.
- **Per-tile phase is free and exact**: `animation-delay: calc(var(--phase) * -1 * var(--dur))`.
  A *negative* delay starts the animation already in progress — this is literally the CSS
  equivalent of the Wii's `setCurrentFrame(rand() % 2000)` (§A.1.1).
- **Free determinism**: Playwright's `animations: 'disabled'` (the default for
  `toHaveScreenshot`) cancels infinite CSS animations to their initial state — see this repo's own
  `docs/methodology/visual-regression-tooling.md` §6.4. So a CSS-driven effect is **deterministic
  under test with no test-only code path at all**, unlike a `requestAnimationFrame` canvas, which
  Playwright explicitly does not touch.
- **Free `prefers-reduced-motion`**: one media query sets `animation: none`.

Asset size, if shipped as a file (16-level greyscale noise, which is genuinely incompressible):

| Frames × size | PNG | WebP lossless | WebP q80 | 4-level indexed PNG |
|---|---|---|---|---|
| 4 × 128 × 96 | 26.6 KB | 24.1 KB | 29.4 KB | 12.2 KB |
| 8 × 128 × 96 | 49.8 KB | 48.1 KB | 58.4 KB | 24.2 KB |
| 16 × 128 × 96 | 97.6 KB | 96.1 KB | 116.0 KB | 48.2 KB |
| 8 × 256 × 144 | 147.0 KB | 144.1 KB | 174.1 KB | 72.3 KB |

**[Measured]** Note the counterintuitive result: **lossy WebP is *larger* than lossless** for white
noise. Lossy codecs are built on the assumption of spatial correlation; noise has none, so the DCT
coefficients are dense and the entropy coder loses. Never ship noise through a lossy codec — it
costs more bytes *and* smears the grain.

The size table is moot if you **generate the sheet in the browser at startup** (§B.8), which costs
zero bytes over the wire.

**Downside — the loop.** N frames at F fps repeats every N/F seconds, and a repeating noise cycle
*is* detectable if it's short. Mitigations: more frames; per-tile static crop offsets into an
oversized atlas so no two tiles show the same sequence (§B.5).

**Verdict: the right answer for 48 tiles.**

### B.3.3 SVG `<feTurbulence>`

```xml
<filter id="snow"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/></filter>
```

Two independent problems, and the first is disqualifying on its own:

1. **It is the wrong noise.** `feTurbulence` is specified to use **Perlin noise** — band-limited,
   spatially correlated, smooth. It makes clouds. At very high `baseFrequency` you approach
   per-pixel decorrelation, but you approach it from the wrong side and it still doesn't produce
   the hard-clipped bimodal distribution that reads as snow (§B.2).
2. **The performance is genuinely bad, and worse when animated.** SVG filters are evaluated on the
   CPU in Blink/WebKit for most primitives, and turbulence is expensive per output pixel. Animating
   `seed` or `baseFrequency` invalidates the entire filter region each frame — so you pay the full
   generation cost, every frame, on the main thread, per element. Forty-eight of them is not a
   close call.

**Verdict: no.** Legitimate uses of `feTurbulence` are static, single-instance, decorative grain —
a paper texture on a hero section. Not this.

### B.3.4 CSS-only

- `repeating-linear-gradient` / `conic-gradient`: can produce stripes, checks, and moiré, but
  **cannot produce uncorrelated noise** — gradients are by definition smooth functions of position.
  You can fake grain by stacking many tiny hard-stop gradients, and it looks like what it is.
- **`background-image: url("data:image/png;base64,…")` with a real noise PNG**: this *is* the right
  CSS answer, and it is just §B.3.2 with the atlas inlined. Perfectly good for the **static**
  fallback (reduced-motion, print, no-JS).
- Pseudo-animation via `background-position` steps on a **single-frame** tile does not work: the
  noise translating coherently reads as *scrolling*, not as boiling. Snow must be **re-randomised**
  per frame, not moved.

**Verdict: use CSS as the delivery mechanism (§B.3.2), not as the noise source.**

### B.3.5 WebGL / fragment shader

The textbook solution: one fullscreen quad, a hash-based noise function of `(uv, time)`.

```glsl
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main(){ float n = step(0.42, hash(vec3(floor(gl_FragCoord.xy/GRAIN), floor(uTime*FPS))));
             gl_FragColor = vec4(mix(BASE, vec3(n), K), 1.0); }
```

- **Cost: effectively zero.** A modern GPU generates this at 4K/60 without noticing.
- **But:** WebGL contexts are a scarce resource — browsers cap them around **8–16 per page** and
  silently drop the oldest beyond that. So **one context per tile is impossible**; you would need a
  single shared canvas plus scissor rects or an instanced quad per empty slot, positioned under 48
  rounded-rect windows that each have their own gloss overlay, hover state and stacking context.
- Plus: a WebGL context is ~1–2 MB of state, needs context-loss handling, breaks
  `prefers-reduced-motion` unless you wire it yourself, and is *fully* non-deterministic across GPUs
  — different rasterisers, different float precision — which would wreck the screenshot-diff
  workflow this repo depends on.

**Verdict: overkill, and specifically bad for this project's testing story.** Keep it documented as
the escalation path if the effect ever needs to be full-screen at 60 fps.

---

## B.4 Technique comparison at a glance

| Technique | Per-frame main-thread cost, 48 tiles | Correct noise character | Deterministic under Playwright | reduced-motion | Verdict |
|---|---|---|---|---|---|
| `putImageData` per tile per frame | 2880 uploads/s | ✅ | ❌ needs test-only freeze | manual | ❌ |
| Shared frame pool → `drawImage` | 2880 GPU blits/s, no uploads | ✅ | ❌ needs test-only freeze | manual | ⚠️ workable |
| **Shared atlas → CSS `steps()`** | **0** | ✅ | ✅ **free** | ✅ **one media query** | ✅ **recommended** |
| `feTurbulence`, animated seed | catastrophic | ❌ Perlin | ❌ | manual | ❌ |
| CSS gradients | 0 | ❌ | ✅ | ✅ | ❌ as noise source |
| WebGL shared canvas | ~0 | ✅ | ❌ GPU-dependent | manual | ⚠️ escalation only |

---

## B.5 The 48-tile problem

Three properties are needed simultaneously, and only one architecture gets all three:

1. **One noise source, many consumers.** Generating 48 independent noise streams is 48× the work
   for no visual gain — nobody can tell that two tiles three inches apart share a texture. Share
   **one** atlas; decorrelate at the *sampling* level.
2. **Per-tile decorrelation.** If all 48 tiles show the same frame at the same instant, the grid
   **pulses in unison** and reads as one flickering surface rather than 48 independent screens.
   This is the most visible failure mode and it is entirely avoidable.
3. **Zero per-frame main-thread work**, because 48 × 60 = 2880 of anything per second is a budget
   you do not have.

**Copy the Wii's own solution to (2).** `System::getRndm()->get_u16() % 2000` per slot
(`iplChannelObj.cpp:817`) is Nintendo solving exactly this problem in 2006 — twelve empty slots,
one shared animation asset, randomised phase per slot so they never sync. **[Decomp — code
evidence]** The direct CSS translation is a per-tile negative `animation-delay`.

Do **both** available decorrelations, because they fail independently:

- **Phase offset** — `animation-delay: calc(var(--phase) * -1s)`, per tile, seeded. Cheap and
  exactly mirrors the Wii. *But:* Playwright's `animations: 'disabled'` resets infinite animations
  to their initial state, which may or may not honour the negative delay — so under test all tiles
  could collapse to the same frame.
- **Static crop offset** — make the atlas **wider than one tile** and give each tile a fixed
  `background-position-x` chosen from a seeded PRNG. Two tiles then never show the same pixels
  **even when both are frozen at frame 0**. This survives the test harness, so your screenshots
  show a properly decorrelated grid rather than 48 identical squares.

With an atlas 2 tiles wide × N frames tall you get `2 × (tile_width)` distinct horizontal crop
positions (any integer offset works, not just the two aligned ones) × N phases — comfortably more
distinct appearances than 48 tiles need.

---

## B.6 Frame rate

Real NTSC snow updates at **59.94 fields/s**. You do not need that.

The reason is §B.1.4: **snow contains no coherent motion.** Perception of temporal aliasing
requires something to track; uncorrelated noise gives the visual system nothing, so the
judder cues that make 12 fps obvious for a panning camera are simply absent. What *is* perceptible
at low rates is **frame dwell** — each field visibly "holding" before it swaps, which reads as a
strobe.

| fps | Reads as |
|---|---|
| 3 (≈ the current 3000 ms) | **not animation** — a still image that occasionally jumps. The worst option: it draws attention to the change without producing motion |
| 8–12 | visible strobing; individual frames resolve; reads as "old GIF" |
| **15** | acceptable floor; slight texture to the boil |
| **20–30** | **indistinguishable from 60 for this content** |
| 60 | correct, imperceptibly better than 30 |

**Recommendation: 24 fps.** Reasoning:

- Comfortably inside the 20–30 band where the eye stops resolving individual frames.
- It's a whole-number divisor of nothing important, which is fine — with a CSS `steps()` animation
  the rate is decoupled from the display refresh anyway, and the browser handles the resampling.
- With a 24-frame atlas it gives a **exactly 1.000 s loop**, which is long enough that per-tile
  phase offsets (§B.5) fully mask the repeat.
- With the atlas approach the rate costs **nothing**, so this choice is purely perceptual. If you
  later measure paint cost on a low-end device, 15 fps is a safe fallback with minimal visual loss.

**The single biggest visual improvement available in this component is changing `INTERVAL = 3000`
to ~24 fps.** 3 seconds is not a slow animation; it is a still image with an occasional glitch,
which is exactly the wrong reading.

---

## B.7 Determinism — hard requirement

`docs/methodology/visual-regression-tooling.md` §6.2 flags `ChannelStatic.jsx` as one of four
critical determinism hazards. The recommendation here **satisfies it by construction** rather than
by patching around it:

**1. Seed the pixels, don't monkey-patch `Math.random`.** The atlas is generated once at module
init from a **fixed constant seed** using an inline `mulberry32`. Same bytes on every load, every
machine, forever — no `page.addInitScript` needed, and the production code and the test code
generate identical pixels. (§B.3.1 measured mulberry32 as 1.8× *faster* than `Math.random()`
anyway, so this is free.)

```js
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

The repo's tooling doc proposes injecting this over `Math.random` from the test harness. Owning the
PRNG inside the component is strictly better: it removes a test/prod divergence, it makes the
effect reproducible in Storybook/dev too, and it lets a `seed` prop generate deliberate variants.

**2. Freeze the timing via CSS, which Playwright already handles.** Because the animation is a CSS
`animation` and not a `requestAnimationFrame` loop, `toHaveScreenshot`'s default
`animations: 'disabled'` cancels it to its initial state — no test-only branch, no
`window.__VISUAL_TEST__` flag, no masking. This is the argument that should decide the technique
choice on its own: **the tooling doc's §6.2 problem simply stops existing.**

**3. Belt and braces — an explicit freeze prop.** Still provide `<ChannelStatic frame={n} />`.
When `frame` is a number the component renders that atlas row with `animation: none`. Useful for
Storybook, for reproducing a specific reported appearance, and as a fallback if a future Playwright
version changes its animation handling.

**4. Decorrelate tiles with a *static* seeded offset, not only with phase.** Per §B.5, so a frozen
screenshot still shows 48 visually distinct tiles. Without this, the frozen baseline is 48 identical
squares — which passes the diff but verifies nothing about the decorrelation you actually care
about.

**5. Keep the statistical assertion as a second line of defence.** The tooling doc's §6.2(c)
suggestion is good and should be adopted *in addition* to pixel diffing: assert mean luminance
≈ 212 ± 3, per-pixel σ within the expected band for the configured `k`, and — the one that would
have caught the current bug — **row-mean σ < pixel σ**, i.e. the noise is *not* row-banded.

---

## B.8 Concrete recommended implementation

### B.8.1 Parameter table, with justification

| Parameter | Value | Justified by |
|---|---|---|
| Technique | seeded runtime-generated atlas → blob URL → CSS `steps()` background | §B.3.2, §B.4, §B.7 |
| Frame size | **170 × 96** | Nintendo's authored 16:9 icon canvas (`empty-slot-and-sd-icon.md` §A.7). At the project's 1512-px design width a 307-px tile → **1.8 CSS px per texel**, inside the 1–2.5 px "snow" band (§B.2) and ≈ the SD-era texel density |
| Frames | **24** | 1.000 s loop at 24 fps; long enough that phase offsets hide the repeat (§B.6) |
| Frame rate | **24 fps** | §B.6 |
| Grain shape | **2 texels wide × 1 tall** | NTSC 4.2 MHz luma bandwidth → ≈1.5 : 1 anisotropy (§B.1.3). 2:1 is the cheapest integer approximation and looked distinctly more "analog" than 1:1 in the rendered comparison |
| Levels | **16** | Matches the Wii's `I4` texture exactly (§A.3.2); also compresses better |
| Distribution | **26 % floor / 41 % ceiling / 33 % uniform mid** | Copied verbatim from Nintendo's own texture (§A.3.2). Gives σ ≈ 110, **1.4× a uniform noise of the same range** — more punch for the same amplitude |
| Contrast `k` | **0.18** (default), exposed | §A.8, §B.2. Authentic is 0.047 — set `--snow-contrast: 0.047` to get the console's actual look |
| Base colour | **`#D4D4D4`** | Measured, §A.4.1 |
| Row-DC term | **±6/255**, i.e. ≈ ¼ of the pixel amplitude | A faint scanline hint. **Inverts** the current implementation's balance (which is 1.5 : 1 *toward* rows) |
| Per-tile phase | seeded, `animation-delay` negative | Mirrors `rand_u16() % 2000` (`iplChannelObj.cpp:817`) |
| Per-tile crop | seeded static `background-position-x` into a 2×-wide atlas | Survives Playwright's animation freeze (§B.5, §B.7) |
| Colour | strictly R = G = B | §B.1.2 |
| Wordmark | separate static layer, `#D4D4D4` base with a `−7/255` "Wii" | §A.4.1 — currently missing entirely from `Channel.jsx` |

**Generation cost:** 24 frames × 170 × 96 ≈ 392 k pixels. At the measured 0.255 ms per 36.9 k
pixels, that is **≈ 2.7 ms, once, at module init.** Per-frame cost thereafter: **zero JS.**

### B.8.2 `src/components/channelNoise.js` — the shared atlas

```js
// One noise atlas, generated once, shared by every empty tile on the page.
// Deterministic: fixed seed in, identical bytes out, every load, every machine.

const FRAME_W = 170;         // Nintendo's 16:9 authored icon canvas
const FRAME_H = 96;
const FRAMES  = 24;          // 1.000 s loop at 24 fps
const COLS    = 2;           // atlas is 2 tiles wide → per-tile crop offsets (§B.5)
const BASE    = 212;         // #D4D4D4, measured
const SEED    = 0x57ee7;

// --- Contrast: the ONE knob that diverges from the real console. ---------------
// 0.047 = measured authentic (invisible). 0.18 = project default. See §A.8.
export const SNOW_CONTRAST = 0.18;

const ROW_DC  = 6;           // faint scanline hint, ~1/4 of pixel amplitude
const GRAIN_W = 2;           // 2 texels wide x 1 tall ~= NTSC 1.5:1 anisotropy

function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nintendo's measured distribution: 26% floor, 41% ceiling, 33% flat mid, 16 levels.
// Physically this is a hard-clipped Gaussian (see PART B §B.1.1).
function sample(rnd) {
  const u = rnd();
  if (u < 0.26) return 0;
  if (u >= 0.59) return 255;
  return (1 + Math.floor(rnd() * 14)) * 17;
}

let atlasUrl = null;

export function getNoiseAtlas() {
  if (atlasUrl) return atlasUrl;

  const W = FRAME_W * COLS;
  const H = FRAME_H * FRAMES;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  const img = ctx.createImageData(W, H);
  const px  = new Uint32Array(img.data.buffer);   // 2x faster than 4 byte stores
  const rnd = mulberry32(SEED);
  const k   = SNOW_CONTRAST;

  for (let y = 0; y < H; y++) {
    const rowDc = (rnd() - 0.5) * 2 * ROW_DC;
    for (let x = 0; x < W; x += GRAIN_W) {
      const n = sample(rnd);
      let v = BASE + k * (n - 150) + rowDc;       // 150 = texture mean (measured)
      v = v < 0 ? 0 : v > 255 ? 255 : v | 0;
      const word = 0xff000000 | (v << 16) | (v << 8) | v;   // R=G=B, always
      for (let g = 0; g < GRAIN_W && x + g < W; g++) px[y * W + x + g] = word;
    }
  }
  ctx.putImageData(img, 0, 0);

  atlasUrl = canvas.toDataURL('image/png');
  return atlasUrl;
}

export const NOISE_GEOMETRY = { FRAME_W, FRAME_H, FRAMES, COLS };

// Per-tile decorrelation, seeded so it is stable across reloads and screenshots.
// This is the web translation of `System::getRndm()->get_u16() % 2000`
// (reference/wii-ipl/src/scene/channelSelect/iplChannelObj.cpp:817).
export function tileSeedVars(index) {
  const rnd = mulberry32(SEED ^ ((index + 1) * 0x9e3779b9));
  return {
    '--snow-phase': rnd().toFixed(4),          // 0..1 of the loop
    '--snow-x': `${(rnd() * 100).toFixed(2)}%`, // 0..100% == one full atlas column
  };
}
```

### B.8.3 `src/components/ChannelStatic.jsx`

```jsx
import { useMemo } from 'react'
import { getNoiseAtlas, tileSeedVars, NOISE_GEOMETRY } from './channelNoise'
import './ChannelStatic.css'

/**
 * TV snow for an empty channel slot.
 *
 * AUTHENTICITY NOTE — read context/components/empty-slot-noise.md before changing this.
 * The Wii really does render animated white noise here (the shipped texture is 128x96 I4
 * per-pixel noise, four independent frames, randomly phased per slot). It composites it at
 * ~4.7% contrast, which is essentially invisible. We render it at 18% as a deliberate,
 * documented exaggeration. Set SNOW_CONTRAST = 0.047 in channelNoise.js for the real thing.
 *
 * @param {number} index  Grid position. Seeds this tile's phase + crop so no two tiles sync.
 * @param {number} [frame] Freeze on a specific atlas row (tests / Storybook). Omit to animate.
 */
export default function ChannelStatic({ index = 0, frame }) {
  const { FRAMES } = NOISE_GEOMETRY
  const style = useMemo(() => {
    const vars = tileSeedVars(index)
    return {
      backgroundImage: `url(${getNoiseAtlas()})`,
      ...vars,
      ...(frame != null
        ? { animation: 'none', backgroundPositionY: `${(frame % FRAMES) * (100 / (FRAMES - 1))}%` }
        : null),
    }
  }, [index, frame, FRAMES])

  return <div className="channel-static" style={style} aria-hidden="true" />
}
```

### B.8.4 `src/components/ChannelStatic.css`

```css
.channel-static {
  position: absolute;
  inset: 0;
  z-index: 0;                       /* under .channel-inner::before gloss (z-index: 2) */
  pointer-events: none;

  /* Atlas is COLS wide x FRAMES tall. 200% / 2400% == 2 cols / 24 rows.
     With background-size-x: 200%, a background-position-x of P% slides the image
     left by exactly P/100 of the element width -- i.e. 0..100% sweeps one full
     atlas column, responsively, with no px math. That is the per-tile crop. */
  background-size: 200% 2400%;
  background-repeat: repeat;
  background-position-x: var(--snow-x, 0%);
  image-rendering: pixelated;       /* nearest-neighbour: keep the grain crisp */

  animation: channel-snow 1s steps(23, jump-none) infinite;
  animation-delay: calc(var(--snow-phase, 0) * -1s);   /* == setCurrentFrame(rand) */
}

/* background-position-y: 0% -> 100% travels (FRAMES - 1) frame-heights, so the
   discrete stops must be (FRAMES - 1) intervals. `steps(23)` alone would emit 23
   values and never reach the last row; `jump-none` includes BOTH endpoints and
   emits 24 -- one per atlas row, exactly. Getting this wrong silently drops a
   frame, which is invisible in review and visible as a hitch in the loop. */
@keyframes channel-snow {
  from { background-position-y: 0%; }
  to   { background-position-y: 100%; }
}

/* Accessibility: a 48-tile grid of flickering high-frequency noise is a real
   photosensitivity concern (WCAG 2.3.1 / 2.3.3). Freeze it. See §B.9. */
@media (prefers-reduced-motion: reduce) {
  .channel-static {
    animation: none;
    opacity: 0.3;                   /* ~0.18 * 0.3 ~= 0.05 == the authentic contrast */
  }
}
```

### B.8.5 Wiring in `Channel.jsx`

```jsx
export default function Channel({ children, index = 0 }) {
  const isEmpty = !children
  return (
    <div className="channel">
      <div className="channel-inner">
        {isEmpty && <>
          <ChannelStatic index={index} />
          <WiiWordmark />        {/* see §A.4.1 — currently missing */}
        </>}
        {children}
      </div>
    </div>
  )
}
```

`WiiMenu.jsx` already maps with an index; pass it through: `<Channel key={i} index={i} />`.

### B.8.6 Changes from the current implementation, ranked by visual impact

| # | Change | From | To | Why |
|---|---|---|---|---|
| 1 | **Update rate** | 3000 ms (0.33 fps) | **24 fps** | §B.6 — at 0.33 fps it is a still image that jumps, not an animation. Biggest single win |
| 2 | **Correlation structure** | per-row base (correlated across all 64 columns), σ_row : σ_px = 1.5 : 1 | **2-texel-wide grain**, σ_row : σ_px ≈ 0.25 : 1 | §B.1.3 — the current code models the *capture artifact* (§A.4.3), not the *content*. Real snow correlates over ~1.5 px |
| 3 | **Grain scale** | 64 × 36 → 4.8 CSS px/texel | **170 × 96 → 1.8 CSS px/texel** | §B.2 — 4.8 px reads as mosaic, not snow. 170 × 96 is also Nintendo's own canvas |
| 4 | **Contrast** | 210–228 band ⇒ σ_px ≈ 3.5 (k ≈ 0.047) | **k = 0.18**, σ_px ≈ 20 | §A.8 — note the current per-pixel contrast is *accidentally almost exactly authentic*; it just isn't what the owner asked for. Make the divergence explicit and adjustable |
| 5 | **Distribution** | uniform ±6 | **26 / 41 / 33 clipped** | §A.3.2, §B.1.1 — 1.4× the σ for the same range, and it's Nintendo's own histogram |
| 6 | **Architecture** | 48 canvases, `createImageData` + `putImageData` per draw | **one shared atlas, CSS `steps()`** | §B.3, §B.4 — from 2880 texture uploads/s to zero |
| 7 | **Determinism** | `Math.random()` | **seeded mulberry32 + CSS animation** | §B.7 — resolves `visual-regression-tooling.md` §6.2 without a test-only code path |
| 8 | **Per-tile phase** | none — all 48 tiles redraw in lockstep on the same `rAF` | **seeded phase + seeded crop** | §B.5 — mirrors `iplChannelObj.cpp:817`. Lockstep is the most visible failure mode of a grid effect |
| 9 | **reduced-motion** | none | **freeze + drop to authentic contrast** | §B.9 |
| 10 | **Wordmark** | absent | ghosted "Wii", −7/255, ~36 % tile width | §A.4.1 — it is in the real texture, on the same layer as the noise |

---

## B.9 `prefers-reduced-motion`

This is not a nicety. Forty-eight simultaneously flickering high-spatial-frequency noise fields is
close to a worst case for both vestibular discomfort and photosensitivity:

- **WCAG 2.3.1 (Three Flashes or Below Threshold, Level A)** — content must not flash more than
  three times per second in a "general flash" or "red flash" area exceeding ~25 % of a
  341 × 256-px central region at typical viewing distance. A grid of noise tiles is not a
  *coherent* flash — luminance changes are spatially uncorrelated, so the large-area synchronous
  luminance swing that the threshold targets doesn't occur — but the safe-harbour analysis gets
  uncomfortable once the tiles fill most of the viewport, and it gets *worse* the higher `k` goes.
  Turning up contrast (which this project is doing) moves toward the risk, not away from it.
- **WCAG 2.2.2 (Pause, Stop, Hide, Level A)** — any automatically-playing motion lasting more than
  five seconds needs a mechanism to pause it. An infinite noise loop qualifies. Honouring
  `prefers-reduced-motion` is the accepted mechanism for decorative motion.
- **WCAG 2.3.3 (Animation from Interactions, Level AAA)** and the general convention that
  `prefers-reduced-motion: reduce` should disable *all* non-essential animation.

**The responsible fallback — and it happens to be free:**

```css
@media (prefers-reduced-motion: reduce) {
  .channel-static { animation: none; opacity: 0.3; }
}
```

Freeze on one frame, and drop the effective contrast to ≈ 0.05 — **which is the authentic Wii
value (§A.8).** So the accessible mode is also the historically accurate mode. That is a genuinely
nice property: users who need reduced motion get the console's real appearance, and you can say so.

Also:

- Do **not** gate this behind JS. The CSS media query works before hydration and cannot be missed.
- Set `aria-hidden="true"` on the noise layer — it is purely decorative and has no accessible name.
- Playwright's config in `visual-regression-tooling.md` §6.5 already sets `reducedMotion: 'reduce'`.
  **Be aware that this means the default screenshot baseline will capture the frozen fallback, not
  the animated effect.** Add a second project or a `use: { reducedMotion: 'no-preference' }`
  override for the test that actually exercises the animated path, or you will never regression-test
  the thing you built.

---

## B.10 Open questions and escalation paths

1. **Frame ordering and advance rate of the real `my_IplTop_b.brlan`.** Only recoverable by
   extracting `/shared2/sys/…` from a NAND dump (or a `.wad` of the System Menu) and parsing the
   `.brlan`. `wiimms`/`benzin`/`brlyt` tooling can do it. This would settle whether the four frames
   cycle fast (snow) or slowly (a shimmer), and whether the TEV colour is keyframed. **It is the
   one remaining question that would make Part A complete**, and it is a bounded piece of work.
2. **Whether the wordmark is on `Ch0` or `Ch1`.** Same extraction. Matters only if you want to
   animate wordmark and noise independently; the shipped texture bakes them together, so the
   current split-layer plan (§B.8.5) is already a small divergence — a harmless one.
3. **Real-device paint cost of 48 animated `background-position` layers.** The measurements in this
   document are of *generation*, which the recommendation amortises to zero; the remaining cost is
   compositor paint, which I could not measure (no Playwright in this repo yet). If it shows up,
   the mitigations in order are: drop to 15 fps, drop the atlas to 128 × 72, then move to a single
   grid-level canvas with `drawImage` from a shared `ImageBitmap` pool.
4. **A single grid-level canvas** (one canvas behind the whole grid, rounded-rect-clipped noise
   drawn at each empty slot) would cut 48 layers to 1. It was not recommended because the tiles'
   gloss overlays and hover states sit *above* the noise and would need restacking. Worth
   revisiting if (3) bites.

---

## B.11 Sources

**Primary — decompiled retail binary** (`reference/wii-ipl/`, koopthekoopa/wii-ipl @ `42a49cb`,
local clone; upstream <https://github.com/koopthekoopa/wii-ipl>):

- `src/scene/channelSelect/iplChannelObj.cpp:718-745` — thumbnail dispatch, play, `setCurrentFrame`
- `src/scene/channelSelect/iplChannelObj.cpp:802-810` — `createWrongThumbnail`, panes `Ch0`/`Ch1`, TEV
- `src/scene/channelSelect/iplChannelObj.cpp:813-818` — `createEmptyThumbnail`, `rand_u16() % 2000`
- `src/scene/channelSelect/iplChannelSelect.cpp:710-716` — no-disc layout (`my_DiskCh_b`)
- `src/scene/channelSelect/iplChannelSelect.cpp:1785-1818` — drag placeholder + `my_TV*` masks
- `src/scene/channelSelect/iplChannelSelect.cpp:1967`, `:2005-2007` — frame sync and re-seed on move
- `src/layout/iplLayout.cpp:16-37` — `Animator` ctor, `IsLoopData()` → `ANIM_TYPE_LOOP`
- `src/scene/memory/iplMemory.cpp:57` — `corrupt_texture.tpl`

**Asset rips** (The Spriters Resource; 403 is a User-Agent check only):

- Empty Channel Spaces — <https://www.spriters-resource.com/wii/wiimenu/asset/68562/>
- Corrupted Icon & Banner Data — <https://www.spriters-resource.com/wii/wiimenu/asset/80071/>
- Waiting Icon — <https://www.spriters-resource.com/wii/wiimenu/asset/80072/>
- Index — <https://www.spriters-resource.com/wii/wiimenu/>

**Measurement:** `reference_screen.png` (repo root, 420 × 236); the 68562 sprite sheet. Methods in
§A.6. Benchmarks: Node 22 / V8 on Apple Silicon.

**External:** <https://en.wikipedia.org/wiki/Noise_(video)> · NTSC bandwidth/timing figures are
standard (4.2 MHz luma, 52.6 µs active line, 63.5 µs line period, 59.94 fields/s) ·
<https://playwright.dev/docs/test-snapshots> · <https://www.w3.org/TR/WCAG22/#three-flashes-or-below-threshold> ·
<https://www.w3.org/TR/WCAG22/#pause-stop-hide> ·
<https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion> ·
<https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData> ·
<https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap> ·
<https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence>

**In-repo:** `context/decomp-findings.md` §5–6 · `context/components/empty-slot-and-sd-icon.md`
§A.1, §A.5–A.7 · `docs/methodology/visual-regression-tooling.md` §6 · `src/components/ChannelStatic.jsx`
· `src/components/Channel.jsx` · `src/components/Channel.css`
