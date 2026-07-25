# Wii Menu — Animations & Interactions Reference

Research reference for the fan-made React recreation of the Nintendo Wii "Wii Menu"
(System Menu). Focused specifically on **motion, timing, and interaction feel** — the
things a frontend developer needs to actually write `transition`/`keyframes`/pointer-
event code, as opposed to static layout facts (see `channels.md` and
`technical-specs.md` for those).

**Sourcing note on this topic in particular:** unlike resolution/font/grid facts, the
*exact* timing curves and trigger conditions of Wii Menu micro-animations were never
published by Nintendo and are not documented in technical detail anywhere that search
engines surface — WiiBrew's binary-format pages describe *that* the banner animation
system supports position/scale/alpha keyframe tracks, but not the specific values
Nintendo's designers used. A large fraction of what circulates about "the Wii Menu
wobble" is collective visual memory rather than a citable spec. Every section below is
explicit about which claims are **sourced** (with a URL) vs. **fan consensus / inferred**
(reasonable but unverified from a primary source) vs. an outright **gap**. Treat the fan
consensus material as "build it this way unless you find a screen capture that
contradicts it," not as ground truth.

---

## 1. Channel "wobble"/jiggle animation

**What's actually confirmed, sourced:**
- Channels are rendered as animated banners (`icon.bin`/`banner.bin`, U8 archives
  containing `.brlan` animation data, `.brlyt` layout data, `.tpl` textures). The
  `.brlan` animation format explicitly supports **alpha/transparency tracks** (RLVC/RLMC)
  and **coordinate tracks** for position/scale (RLPA/RLTS) — i.e., the underlying format
  Nintendo used *could* drive a squash/stretch or bounce, but WiiBrew's format docs stop
  at describing the binary layout and don't name or describe the actual per-channel
  animation clips Nintendo authored. ([WiiBrew — Wii Animations](https://wiibrew.org/wiki/Wii_Animations); [WiiBrew — Opening.bnr](http://wiibrew.org/wiki/Opening.bnr))
- The one clearly-documented state change is on **click, not hover**: a single
  press/click on a channel tile enlarges/highlights it in place and plays its full
  ambient banner animation + sound preview (this is the "zoomed in, showing Start / Wii
  Menu buttons at the bottom" state); a second press of A (or clicking "Start") actually
  launches it. ([How to Arrange Channels — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/); cross-referenced in this project's own `channels.md`)
- Mere **hovering** (pointer over an unselected tile, no click) is described by one
  outside UX-critique source as having almost no visual affordance at all — "a slight
  vibration or noise coming from the remote" is the only feedback noted when passing
  over a selectable item, i.e. **rumble + a soft blip sound**, not a visible shake.
  ([Medium — "Everyday UI: Wii would not like to play"](https://medium.com/@andrew_rickert/everyday-ui-wii-would-not-like-to-play-559d05f5aff))

**Fan consensus / likely origin of the "wobble" impression (not independently
text-sourced — flag before treating as fact):**
- The "jiggle like a TV channel" feeling most people remember is very likely conflating
  two *different*, better-attested behaviors:
  1. The **click-to-preview pop** above (tile scales up in place, its banner starts
     animating/playing sound) — this reads as "the channel coming alive," which is
     probably what gets remembered as a wobble.
  2. The **drag-to-reorder elastic lag**: when you grab a channel with A+B and move the
     Remote, community/community-clone implementations and general recollection agree
     the dragged tile does **not** snap 1:1 to the cursor — it trails with a springy,
     slightly-overshooting follow (the classic "rubber band" feel), which is what
     genuinely looks like a jelly/wobble motion. Treat this as **fan consensus**, not a
     documented spec.
- **Recommendation for the React build:** don't implement a continuous idle "shake on
  hover" (no source supports that). Instead implement:
  - **Hover:** cursor changes to the open hand, tile gets a subtle glow/lift
    (box-shadow or scale ~1.02–1.03), plus a soft UI blip sound. Keep it fast/subtle —
    150–200ms ease-out.
  - **Click (select):** tile scales up (e.g. `transform: scale(1.15–1.3)`) and its
    banner animation/audio starts, other tiles dim slightly. ~250–400ms ease-out feels
    right for a "pop."
  - **Drag (reorder):** apply spring/elastic easing (CSS `cubic-bezier` overshoot, e.g.
    `cubic-bezier(0.34, 1.56, 0.64, 1)`, or a JS spring like Framer Motion's default
    spring) to the dragged tile's follow-position rather than 1:1 cursor tracking — this
    is the best implementable analog of the "wobble" memory.

## 2. Cursor/pointer behavior

**Sourced — how the real hardware computes pointer position:**
- The Wii Remote has no absolute position sense on its own; it locates the two IR LEDs
  on the **Sensor Bar** via its onboard IR camera, then converts that to a screen-space
  cursor position. WiiBrew's pointer documentation lays out the reference algorithm:
  1. Identify two IR dots at least a minimum distance apart and roughly horizontal
     relative to each other.
  2. Compute the Remote's roll from the accelerometer: `rotation = atan2(accel.z,
     accel.x) - π/2`.
  3. Rotate the sensor field by that angle so the two dots read as horizontal, then take
     the midpoint between them as the raw pointer position, transforming through
     `(coord - 0.5)`, rotate, `+ 0.5`, then invert the X axis.
  4. If one dot is temporarily lost (occlusion, out of range), estimate its position by
     keeping the last known dot-to-dot distance and using the accelerometer-derived
     angle — this is why the pointer can visibly "hunt"/jump slightly rather than just
     vanish when you tilt too far.
  ([WiiBrew — Wiimote/Pointing](https://wiibrew.org/wiki/Wiimote/Pointing))
- **Smoothing:** the same WiiBrew page documents a "dragging circle" smoothing scheme —
  an invisible circle is centered on the current smoothed cursor position; if the new
  raw IR reading falls *outside* that circle the cursor snaps to the circle's edge
  (fast catch-up), if it falls *inside* the circle the cursor eases toward the new point
  proportionally to distance (soft correction for small jitter). An alternative
  documented approach is straightforward **velocity-based smoothing** — apply more
  filtering/lag at low velocity (kills hand-tremor jitter when holding still over a
  target) and less filtering at high velocity (keeps fast swipes responsive).
  ([WiiBrew — Wiimote/Pointing](https://wiibrew.org/wiki/Wiimote/Pointing))
  - **Implementation takeaway for the web clone:** don't set `cursor` position 1:1 to
    raw `mousemove`/pointer coordinates — run it through a simple **exponential
    smoothing / lerp** each animation frame (`pos += (target - pos) * factor`, factor
    ~0.25–0.4 for a snappy-but-soft feel), which approximates the real hardware's
    filtered feel far better than a raw 1:1 cursor.
- **Range/reliability constraints (sourced, informs "what breaks the pointer" flavor
  text if wanted, not core to the animation):** Nintendo's own troubleshooting guidance
  says the Remote must stay roughly **3–8 feet (1–3 m)** from the sensor bar, and IR
  interference (heaters, fireplaces, direct sunlight) causes jerky/erratic cursor
  behavior; a correctly-working Remote pointed straight down should show the on-screen
  hand pointing down, confirming pointer rotation is accelerometer-tilt-driven, not just
  IR-position-driven. ([Nintendo Support — Cursor is off-centre, jerky, erratic, disappears](https://www.nintendo.com/en-gb/Support/Wii/Troubleshooting/Wii-Remote-Controllers-amp-Sensor-Bar/Cursor-is-off-centre-jerky-erratic-disappears-etc-/Cursor-is-off-centre-jerky-erratic-disappears-etc-244285.html))

**Cursor visual design (sourced via asset archaeology, fan-recreation-confirmed):**
- The pointer is the well-known **white gloved hand** shape, archived as a sprite sheet
  by fan preservation sites and re-used verbatim in multiple cursor packs and web
  recreations. ([Pointer — Wii Menu, Spriters Resource](https://www.spriters-resource.com/wii/wiimenu/asset/167191/); [Wii Pointer Cursors project](https://primmr.dev/projects/wii-pointer-cursors/))
- Fan cursor-pack projects that recreate it note the set includes **multiple pointer
  states** beyond the default open hand — e.g. distinct "background"/idle and "busy"
  variants — implying the real system swaps the pointer graphic for different
  interaction states rather than using a single static image throughout. ([Wii Cursors — rw-designer.com](https://www.rw-designer.com/cursor-set/wii-cursor-by-stefano-tinaglia); [Nintendo Wii Hand cursor — Custom Cursor](https://custom-cursor.com/en/collection/games/nintendo-wii-hand))
- **Fan consensus (widely recalled, not independently text-sourced here):** on an A
  ("click") press, the hand pointer's **index finger curls inward** — a brief
  open-hand → pointing/curled-finger → open-hand cycle — providing tactile-feeling
  click feedback without any cursor-position change. This is one of the most
  consistently-remembered Wii Menu details across fan communities and is safe to
  implement as a 2–4-frame swap (or a quick CSS clip/transform fake) timed to the
  button-down/button-up of a click, roughly 80–150ms per phase.
- **Tilt/rotation response (inferred from the pointer math above, sourced
  indirectly):** because on-screen pointer rotation is derived from
  `atan2(accel.z, accel.x)`, physically rolling the Wii Remote left/right visibly rotates
  the on-screen hand to match — this is a **real, documented mechanic**, not
  speculation, though a mouse-driven web recreation has no direct hardware analog for
  it (a stretch option: rotate the cursor slightly based on horizontal mouse velocity to
  fake a "flick" feel, but this is an invented web-only substitute, not a recreation of
  the real trigger).

## 3. Channel launch animation

**Sourced — the Disc Channel case, which is the most thoroughly documented launch
sequence:**
- On opening the Disc Channel with no disc inserted, an animated Wii disc graphic (plus
  a GameCube disc graphic on GameCube-compatible models) begins **spinning** while the
  system polls the drive.
- If no disc is found, the discs **stop spinning** and a distinct tone plays, signaling
  "no disc."
- Once a disc is detected: an animation plays of the disc **sliding into a slot**
  on-screen, and the channel transitions to a **per-game animated preview graphic**
  (baked into the disc's own banner data) — or, for GameCube discs (which carry no
  Wii-format banner), it falls back to a static GameCube logo.
- If a system update is required, the game's preview graphic is replaced by a
  **"Wii System Update" banner** instead of launching normally.
  ([WiiBrew — Disc Channel](https://wiibrew.org/wiki/Disc_Channel))
- The general (non-Disc-Channel) launch pattern documented by Nintendo Support/community
  sources is: **click once to zoom/pop the tile into a large preview** (banner
  animation + audio plays, "Wii Menu" and "Start" buttons appear at the bottom), then a
  second click on **Start** actually launches the channel's content, with the screen
  presumably transitioning fully into the channel/game at that point. ([How to Arrange Channels — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/); this project's `channels.md`)
- **Gap:** no source documents a literal "TV static/tuning noise" visual effect playing
  during the transition *into* a channel or *back out* to the Menu for the general case.
  The closest sourced analog is the Disc Channel's own "no disc" audio tone and the
  distinct "System Update" banner swap — neither is a static/noise transition effect.
  If a CRT-tuning-static wipe is desired for the clone, treat it as a **deliberate
  stylistic embellishment**, not a historically-verified recreation.

**Fan-implementation precedent (useful for concrete timing/easing, explicitly NOT an
official source — this is a community web clone's own design choice, included only
because it's a reasonable, tested "feel"):**
- The open-source Vue.js recreation `Fraulk/Wii-Menu` implements its channel-launch zoom
  using a fork of `zoom.js` (Hakim El Hattab): clicking a channel computes its bounding
  rect and CSS-transforms (`translate` + `scale`) the whole document to "zoom into" that
  element, using an **800ms `ease` transition**, then reverses the same transform to
  zoom back out on exit. ([Fraulk/Wii-Menu — `src/helpers/zoom.js`](https://github.com/Fraulk/Wii-Menu/blob/main/src/helpers/zoom.js), [`src/components/Channels.vue`](https://github.com/Fraulk/Wii-Menu/blob/main/src/components/Channels.vue))
- That same component fades in a "bottom bar" (Wii Menu / Start buttons) with a simple
  `opacity 0→1` over ~1s once a channel is opened. This is a reasonable, implementable
  reference point for "how long should the pop-in feel," even though it's one fan's
  interpretation rather than a measured value from the original hardware.
- **Recommendation:** a launch animation of **scale + slight upward translate over
  ~300–500ms ease-out** for the "select/pop" step, and a **full-bleed
  scale/opacity transition of 500–800ms** for the "Start → actually enter the channel"
  step, is a defensible middle ground between the sourced click-to-preview behavior and
  the fan-clone's tested 800ms zoom feel.

## 4. Grid paging animation

**Sourced facts:**
- The Menu is fixed at **4 pages, each a 4×3 grid** (12 slots/page, 48 total, minus the
  fixed Disc Channel slot). ([Wikipedia — Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu); also documented in this project's `channels.md`/`technical-specs.md`)
- Paging is triggered by the **+ / − buttons** on the Wii Remote (or D-pad).
- Dragging a channel (A+B held) **over the page-turn arrow and holding it there**
  triggers a page change as part of the drag-and-drop flow, confirming the page-arrow
  itself is a live drop-target, not just a static nav button. ([How to Arrange Channels — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/))

**Gap — no authoritative source describes the page-transition motion itself:**
- Nothing found documents whether the grid **cuts instantly**, **slides
  horizontally**, or **crossfades** between pages. This is a genuine documentation gap;
  it wasn't surfaced by any fan wiki, technical doc, or design retrospective in this
  research pass.
- **Fan consensus / safest inference:** general recollection and the existence of visible
  **page-indicator dots** at the bottom of the Menu (confirmed structurally in
  `technical-specs.md`'s footer description) strongly implies a **horizontal slide**
  paradigm (dots + directional buttons is the classic "carousel" pattern), consistent
  with the drag-to-page-arrow mechanic above (you're pulling a channel *toward* the next
  page, which reads more naturally as a slide than a cut). Recommend implementing a
  **horizontal slide transition, ~300–450ms ease-in-out**, with the dot indicator
  updating in sync — this is a reasonable, common-sense default rather than a sourced
  spec, and should be labeled as such if precision matters to the project.

## 5. Drag-and-drop channel reordering

**Sourced, and this section corrects a common assumption worth flagging explicitly:**
- To pick up a channel: **hold A + B** on the Wii Remote while pointing at it. This
  "grabs" the tile for repositioning.
- Drag it to an **empty slot** and release A+B to drop it there.
- To move a channel to a **different page**, drag it over the page-turn arrow and hold
  until the page flips, then continue dragging to the target slot.
- The **Disc Channel cannot be moved** — it's permanently pinned to the top-left slot of
  page 1.
- This same A+B grab mechanic is reused elsewhere in the system (e.g. Mii Channel, Wii
  Message Board) for repositioning items, suggesting it's a **system-wide reordering
  convention**, not a Menu-specific one-off.
  ([Nintendo Support — How to Arrange Channels](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/); [Nintendo World Report — Wii Menu: Rearranging Channels](http://www.nintendoworldreport.com/feature/12566/wii-tricks-and-secrets-wii-menu-rearranging-channels))
- **Important correction to the "shuffle" assumption in the brief:** every sourced
  description of this mechanic specifies dropping onto an **empty** slot — none mention
  channels automatically shuffling/reflowing to make room the way, say, an iOS
  springboard does when you drop an icon onto an occupied one. If the target slot is
  occupied, the implication (not explicitly stated, but consistent across all sourced
  descriptions) is that the drop simply doesn't take effect there, or at most swaps the
  two tiles directly — not a cascading reflow of the whole grid. **Recommend NOT
  building an auto-reflow/shuffle system**; instead: (a) allow drop only on empty
  slots, ghosting/highlighting valid empty targets while dragging, and (b) optionally
  support a direct two-tile swap when dropping on an occupied slot, as the closest
  defensible "shuffle" behavior — but this swap behavior itself is an inference, not
  sourced.
- **Visual feel while dragging (fan consensus, not sourced in text form — no source
  described the drag visual explicitly):** the picked-up tile is generally recalled as
  scaling up slightly (a "lifted off the grid" feel) and following the cursor with a
  soft elastic lag rather than rigid 1:1 tracking (see Section 1's wobble discussion).
  Other tiles are commonly recalled as staying static (no live reflow preview) until the
  drop actually completes. Implement the lift with `transform: scale(1.08)` +
  `box-shadow` increase, and the elastic follow via a spring/lerp on cursor position
  rather than instant `left/top` binding.

## 6. Idle/ambient animation

**Sourced:**
- **Forecast (Weather) Channel:** after the relevant system update, the Forecast
  Channel's Menu tile **displays the current weather icon** for the user's saved
  location(s) — i.e., its grid icon is a live, data-driven asset, not a static logo.
  It also has **time-of-day-aware audio** — a distinct music track for daytime vs.
  nighttime, and separate tracks for local vs. "globe" (world) view within the channel
  itself. ([WiiBrew — Forecast Channel](https://wiibrew.org/wiki/Forecast_Channel))
- **News Channel:** a **scrolling ticker** appears directly on the News Channel's Menu
  tile once the channel has been used regularly enough (a usage-gated feature, not
  present by default) — confirming at least one channel icon does run a continuously
  scrolling ticker animation live on the grid.
- **Clock/date:** the Menu displays the **current time and date**, live-updating, on
  every page's footer — added as a system feature in **System Menu v3.0 (August
  2007)**, alongside message-board notification icons that **flash** when a new message
  arrives. ([Wikipedia — Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu); [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu))
- **General principle (sourced from Nintendo's own design commentary):** Nintendo
  explicitly designed the always-on channels (Forecast Channel in particular) early in
  development specifically to **prove Wii would feel "on 24/7"** — i.e., ambient
  motion/live-updating tiles were a deliberate design goal of the Menu, not an
  afterthought. ([Iwata Asks — Wii Channels](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii/Iwata-Asks-Wii-Channels/1-Fun-For-the-Entire-Family/1-Fun-For-the-Entire-Family-213500.html))
- **Technical grounding for "banners can animate at rest":** the underlying banner
  format (`.brlan`) supports looping alpha and position/scale animation tracks per the
  WiiBrew format docs cited in Section 1/3 — confirming the *engine* underneath every
  channel tile is capable of a continuous idle loop (e.g. a subtle bob or glow),
  independent of any specific channel's data-driven content like weather/news.
  ([WiiBrew — Wii Animations](https://wiibrew.org/wiki/Wii_Animations))
- Some official channel banners are recalled/described in aggregate search results as
  having **logos that gently bob up and down / float**, as a generic idle-loop treatment
  distinct from the data-driven Forecast/News examples above — supports implementing a
  slow (~2–4s cycle), small-amplitude (~2–4px) vertical bob as a safe default idle
  animation for channels that don't have bespoke live content.

**Gap / fan consensus:**
- **Mii Channel Miis "wandering":** widely recalled in fan communities that the Mii
  Channel's Menu tile shows some of your created Miis milling about on a plaza-like
  background, but this was **not confirmed by an independently fetched, citable source**
  in this research pass (search results only confirmed the Mii Channel's general
  purpose, not its idle Menu-tile animation specifically). Treat as **fan
  consensus/plausible-but-unverified** — recommend visually spot-checking a period
  screenshot/video before committing pixel-level detail here, but it's reasonable to
  implement a small looping "Miis idling in a room" animation for that tile given how
  consistently this is recalled.

## 7. Startup animation

**Sourced:**
- On boot, the Wii displays the **Health and Safety warning screen**: black background,
  white text reading "WARNING – HEALTH AND SAFETY," followed by "BEFORE PLAYING, READ
  YOUR HEALTH AND SAFETY PRECAUTIONS BOOKLET FOR IMPORTANT INFORMATION ABOUT YOUR HEALTH
  AND SAFETY," plus a phone number and `www.nintendo.com/healthsafety/`.
- Pressing **A** to dismiss it plays a distinct **laser-like sound effect**, and the
  screen **fades out**, transitioning to the Wii Menu.
- A **light synth tune** plays on the Wii Menu itself, picking up right after the
  warning screen's dismissal. ([aggregated from "Nintendo Wii Startup Sound" search results](https://m.youtube.com/watch?v=eE3UBzOK5oQ); corroborated by [Nintendo Warning Screens — Company Bumpers Wiki](https://company-bumpers.fandom.com/wiki/Nintendo_Warning_Screen))
- At the system level, WiiBrew's System Menu documentation confirms the boot flow reads
  a stored configuration/flags value that can direct the System Menu to, among other
  options, **"display the Health/Safety screen before normal boot"** as one of several
  possible boot actions (others include booting a cached disc, shutting down, entering
  recovery mode, etc.) — i.e. this warning screen is a first-class, config-controlled
  step in the actual boot sequence, not just marketing/incidental. ([WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu))

**Gap:**
- No source in this research pass confirmed or denied an animated **"Wii" logo splash /
  swirl sequence** playing before or after the Health and Safety screen on real
  hardware boot. This is easy to conflate with Wii marketing material (TV commercials,
  the Wii Shop Channel intro, etc.), so it should **not** be assumed present in an
  accurate recreation without a verified capture. If a startup flourish is wanted for
  the clone regardless (reasonable for a portfolio piece), treat it as a **deliberate
  creative addition**, not a historical recreation, and consider keeping it skippable
  (as the real Health and Safety screen is, via A button) to match the real system's
  respect for the user's time on repeat boots.
- **Recommendation for the React build:** implement, in order: (1) black screen, (2)
  Health and Safety text fade/cut in, dismissible via click/Enter (mirroring the A
  button), (3) fade-to-black or quick fade transition (~300–500ms) on dismiss with an
  accompanying "confirm" sound, (4) Wii Menu fades/scales in as its ambient synth music
  starts. This sequence is directly supported by sourced material above.

## 8. Channel loading state

**Gap — this is the least-sourced topic in this document:**
- No fetched source in this research pass explicitly describes a diagonal-stripe
  "loading" pattern on channel tiles. This is a widely-recalled visual from personal
  Wii use (an animated diagonal barber-pole-style striped placeholder shown on a
  channel tile while its content is being downloaded/installed/updated, e.g. during a
  WiiWare/Virtual Console purchase from the Wii Shop Channel, or on a tile pending a
  System Update), but it should be flagged honestly as **fan consensus /
  community-recalled, not independently text-sourced here** — verify against an actual
  screenshot or video capture before pixel-matching stripe angle/width/color.
- **Adjacent sourced fact that supports the general concept (channels do visually
  signal "not ready" states):** the Disc Channel replaces a game's normal preview
  graphic with a distinct **"Wii System Update" banner** when an update is required
  before that disc can be played — confirming the Menu does use dedicated
  placeholder/banner swaps for "this isn't in its normal playable state" conditions,
  even though the *specific* diagonal-stripe visual for in-progress downloads wasn't
  independently confirmed. ([WiiBrew — Disc Channel](https://wiibrew.org/wiki/Disc_Channel))
- **Implementable CSS approach (recommendation, not sourced):** a diagonal stripe
  loading state is straightforward to build as a `repeating-linear-gradient(45deg, …)`
  background with an animated `background-position` (looping translate along the
  gradient's axis) — this is the standard "barber pole progress" CSS technique and will
  read as authentically "downloading" regardless of exact original stripe
  angle/spacing. A fan Wii Menu web clone (`Fraulk/Wii-Menu`) uses a related but
  simpler technique for its own generic "unpopulated/loading" channel placeholder: a
  stack of horizontal line divs continuously translated upward
  (`animation: linesGoesUppp 1s linear infinite { 100% { transform: translateY(-12px); } }`)
  to fake a scrolling/loading texture — a useful, tested reference for "how to fake
  continuous motion cheaply in CSS" even though it isn't diagonal. ([Fraulk/Wii-Menu — `src/components/Channels.vue`](https://github.com/Fraulk/Wii-Menu/blob/main/src/components/Channels.vue))
- **Recommendation:** implement the diagonal-stripe loader as a ~1–2s linear-looping
  `repeating-linear-gradient` background animation (no easing — constant-speed loops
  read as "system busy," not as a designed micro-interaction), and reserve it
  specifically for (a) channels installed from SD/download in a not-yet-ready state and
  (b) the Disc Channel's "Wii System Update" banner-swap case described above.

---

## Cross-cutting recommendations for the React implementation

> Original synthesis for this project — not sourced fact, flagged per this doc's own
> convention.

- **Framerate/timing baseline:** per `technical-specs.md`'s inference, target 60fps
  CSS/JS animation throughout (matches the console's NTSC v-sync default).
- **Global easing personality:** favor **ease-out** for anything that appears/enlarges
  (hover lift, click-pop, page-in), **ease-in** for anything that disappears/shrinks,
  and a **spring/overshoot easing** specifically for drag-follow and the
  click-to-preview "pop" — this combination is what most consistently produces the
  "friendly, slightly bouncy, never harsh" feel widely associated with the Wii Menu,
  even where individual timing values are inferred rather than measured.
  See timing table below for reference values.
- **Sound-paired micro-interactions:** several sourced behaviors above (hover blip,
  A-button laser/confirm sound, Disc Channel "no disc" tone) suggest animation and
  audio should be implemented together, not animation-only — even a rough placeholder
  sound design (short synth blips) sells the "Wii-ness" as much as the motion curves do.

### Timing quick-reference (mix of sourced and recommended values)

| Interaction | Duration | Easing | Source |
|---|---|---|---|
| Tile hover lift | 150–200ms | ease-out | Recommended (unsourced) |
| Tile click → preview pop | 250–400ms | ease-out / slight overshoot | Recommended; feel informed by fan-clone's 800ms full-zoom (see §3) |
| Start → full channel launch | 500–800ms | ease-out, scale+opacity | Recommended; fan-clone reference used 800ms ease (§3) |
| Drag-follow (grabbed tile) | continuous, spring | spring/lerp, not linear | Fan consensus (§1, §5) |
| Page transition (slide) | 300–450ms | ease-in-out | Recommended (gap — no sourced motion type, §4) |
| Cursor smoothing (per-frame) | n/a (continuous) | exponential/lerp ~0.25–0.4 factor | WiiBrew Wiimote/Pointing dragging-circle/velocity smoothing (§2) |
| A-button click "finger curl" | 80–150ms per phase | linear/quick | Fan consensus (§2) |
| Health & Safety dismiss fade | 300–500ms | ease | Sourced: "screen fades out" (§7) |
| Idle channel bob (generic) | 2–4s cycle | ease-in-out, ping-pong | Fan consensus (§6) |
| Diagonal loading stripe loop | 1–2s cycle | linear (no ease) | Recommended (gap, §8) |

---

## Sources

- [WiiBrew — Wii Animations (.brlan format)](https://wiibrew.org/wiki/Wii_Animations)
- [WiiBrew — Opening.bnr](http://wiibrew.org/wiki/Opening.bnr)
- [WiiBrew — Disc Channel](https://wiibrew.org/wiki/Disc_Channel)
- [WiiBrew — Forecast Channel](https://wiibrew.org/wiki/Forecast_Channel)
- [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu)
- [WiiBrew — Wiimote/Pointing](https://wiibrew.org/wiki/Wiimote/Pointing)
- [Nintendo Support (Americas) — How to Arrange Channels on the Wii Menu or the SD Card Menu](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/~/how-to-arrange-channels-on-the-wii-menu-or-the-sd-card-menu)
- [Nintendo Support (UK) — Cursor is off-centre, jerky, erratic, disappears, etc.](https://www.nintendo.com/en-gb/Support/Wii/Troubleshooting/Wii-Remote-Controllers-amp-Sensor-Bar/Cursor-is-off-centre-jerky-erratic-disappears-etc-/Cursor-is-off-centre-jerky-erratic-disappears-etc-244285.html)
- [Nintendo World Report — Wii Menu: Rearranging Channels](http://www.nintendoworldreport.com/feature/12566/wii-tricks-and-secrets-wii-menu-rearranging-channels)
- [Iwata Asks — Wii Channels: 1. Fun For the Entire Family](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii/Iwata-Asks-Wii-Channels/1-Fun-For-the-Entire-Family/1-Fun-For-the-Entire-Family-213500.html)
- [Wikipedia — Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu)
- [Medium — Andrew Rickert, "Everyday UI: Wii would not like to play"](https://medium.com/@andrew_rickert/everyday-ui-wii-would-not-like-to-play-559d05f5aff)
- [Spriters Resource — Pointer, Wii Menu asset](https://www.spriters-resource.com/wii/wiimenu/asset/167191/)
- [primmr.dev — Wii Pointer Cursors project](https://primmr.dev/projects/wii-pointer-cursors/)
- [rw-designer.com — Wii Cursor set](https://www.rw-designer.com/cursor-set/wii-cursor-by-stefano-tinaglia)
- [Custom Cursor — Nintendo Wii Hand cursor](https://custom-cursor.com/en/collection/games/nintendo-wii-hand)
- [GitHub — Fraulk/Wii-Menu (fan Vue.js recreation, referenced for implementation timing only)](https://github.com/Fraulk/Wii-Menu)
- [Company Bumpers Wiki — Nintendo Warning Screens](https://company-bumpers.fandom.com/wiki/Nintendo_Warning_Screen)
- [YouTube (via search aggregation) — "Nintendo Wii Startup Sound - Warning - Health and Safety"](https://m.youtube.com/watch?v=eE3UBzOK5oQ)
- This project's own [`channels.md`](./channels.md) and [`technical-specs.md`](./technical-specs.md) — cross-referenced for consistency, not re-derived independently.

### Notable gaps for future research

- No primary/measured timing values for any Wii Menu animation (all durations in this
  doc are either inferred from format capability, borrowed from a fan clone's tested
  feel, or flagged as outright recommendations).
- No confirmed source for: hover-triggered visible wobble (vs. click-triggered pop),
  page-transition motion type (slide vs. cut vs. crossfade), Mii Channel idle-tile
  animation, or the diagonal-stripe loading pattern's exact visual.
- Best next step if higher fidelity is needed: frame-by-frame analysis of an actual
  Wii Menu screen-capture/YouTube video (e.g. search "Wii Menu ambience" or "Wii Menu
  1 hour" style long-form capture videos) rather than further text search — this is an
  inherently visual topic that text sources under-document.
