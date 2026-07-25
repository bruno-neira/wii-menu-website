# Brainstorm: Ways to Collect More Context for This Project

A survey of methods to gather reference material for recreating the Wii Menu, beyond "search agent hits Google and fan wikis" — which is what most of the research so far has used, and which has hit real limits (see "What we've tried" below). Organized by category, with an honest note on effort/yield for each.

## What we've tried so far

- **Web search/fetch agents** (WebSearch/WebFetch) against fan wikis (WiiBrew, Fandom, Super Mario Wiki, GBAtemp, HandWiki), Wikipedia, and Nintendo's own support pages. Productive, but repeatedly blocked: multiple docs (`channels.md`, `system-ui.md`, `clock.md`, `technical-specs.md`) note **HTTP 402/403 responses** from `nintendo.fandom.com`, `wii.fandom.com`, `spriters-resource.com`, and the AVID warning-screen wiki — meaning a real slice of the best fan documentation was *found* but never actually *read*, only guessed at from search-engine snippets.
- **Direct pixel inspection** of the project's own `reference_screen.png` — this is what caught the biggest correction so far (clock position, actual background color) and is more trustworthy than any web source for anything the screenshot actually shows.
- **`wii_design_specs.pdf`** already sitting in the repo root — an apparent Nintendo-internal icon/banner spec doc, only read once so far (by the visual-design agent). Worth a dedicated close read.
- **Pinterest board catalog** (browser automation, since Pinterest doesn't render for headless fetch) — captured what's pinned, but only at thumbnail/catalog resolution, not full-size images.

## Untapped methods, roughly ranked by expected value

### 1. Ask if you still have a physical Wii (highest fidelity, zero research risk)
If you own a working Wii (or know someone who does), 10 minutes with a phone camera recording the actual System Menu — paging through screens, opening the Message Board, watching a channel launch, listening to the ambient loop — beats every fan-wiki paraphrase in this project's `context/` folder combined. This is the one method that resolves *every* "fan consensus, unverified" flag in one shot. Worth asking about directly rather than assuming it's not an option.

### 2. Dolphin emulator + a System Menu image
The Wii's System Menu exists as an extractable/emulatable NAND image (the `version-history.md` doc already links an Internet Archive WAD dump). Running it in Dolphin (a legitimate, widely-used open-source GameCube/Wii emulator) gives pixel-perfect, interactive access to the real UI — full page-paging behavior, real animation timing, real audio — without needing a physical console. This is the second-best fidelity option and is fully within reach with tools already referenced in the research.

### 3. Read existing open-source Wii Menu recreations directly
`animations-interactions.md` already surfaced one: **`Fraulk/Wii-Menu`**, an open-source Vue.js recreation, cited for its zoom-transition timing. Rather than treating it as a footnote, clone it and actually read the source — CSS values, asset choices, and animation curves another hobbyist already reverse-engineered are a shortcut past a lot of "unconfirmed, fan consensus" flags in the current docs. A GitHub search for "wii menu clone/recreation" would likely surface more (Vue, React, plain JS, even Godot/Unity ports) — each one is a data point on how other people resolved the same ambiguities this project's research hit.

### 4. Re-fetch the blocked fan-wiki pages through the browser (not headless fetch)
The Chrome extension is connected in this session (already used for the Pinterest board). The same 402/403-blocked pages that stumped WebFetch — `nintendo.fandom.com/wiki/Wii_Channel_Menu`, `wii.fandom.com/wiki/Wii_Menu`, `spriters-resource.com/wii/wiimenu/` — are likely readable through an actual logged-in/cookied browser session. This directly resolves several explicitly flagged gaps (Message Board flip animation specifics, exact bottom-bar icon artwork, empty-slot tile styling) without needing new search angles.

### 5. YouTube video frame-by-frame analysis
Several docs recommend this but none of the research agents can watch video. A longplay or "Wii Menu ambience" video, paused frame-by-frame at key moments (hover wobble, channel launch zoom, page transition, Message Board flip), would settle most of the animation-timing gaps flagged in `animations-interactions.md` as "no primary source, text-only." This needs either the browser tool (scrub a YouTube player, screenshot frames) or you doing a quick capture and sharing frames/a clip.

### 6. Archive.org / Wayback Machine for dead official Nintendo pages
Several citations in the research are to Nintendo support pages that may not survive much longer (Wii support content has been getting quietly pruned as the platform ages) or that never existed in the searched form. The Wayback Machine can pull older, sometimes more detailed versions of `nintendo.com/en-gb/Wii/...` and `en-americas-support.nintendo.com` pages — useful both to shore up existing citations and to find content already deleted from the live web.

### 7. WAD/ISO asset extraction
`channels.md` and `audio.md` already document the container formats (`icon.bin`/`banner.bin` for tiles, `IplSound.brsar` for audio) and name the tools the homebrew community uses (Wii.cs Tools for fonts, BrawlBox/BrawlCrate for BRSAR, though both docs note current tooling is flaky for this specific archive). If a System Menu WAD/NAND dump is legally sourced (e.g. via Dolphin's own supported workflows), extracting the actual font file, icon animations, and sound effects directly would be the most authoritative source of all for anything visual/audio — no more "fan consensus" flags needed. This is more effort than the others and has the murkiest legal footing (redistributing extracted Nintendo assets is not okay; using them locally as a personal reference to eyeball/recreate is the safer line), so treat it as a last-resort precision tool, not a first move.

### 8. Font identification on the clock/menu text specifically
`clock.md` and `technical-specs.md` both flag the exact clock font as "very likely Rodin NTLG, but no pixel-perfect free match found — a homebrew dev hand-tweaked something close and still wasn't satisfied." Running a cropped screenshot of clock digits through a font-identification tool (WhatTheFont, Font Squirrel's matcher, or just asking an image-capable research pass to compare candidate Google Fonts side-by-side against the crop) could narrow the free-substitute choice with actual evidence instead of the current "Quicksand/Comfortaa/M PLUS Rounded 1c, pick one" hand-wave.

### 9. Community sourcing (Discord/Reddit/forums directly, not via search snippets)
Multiple docs relied on search-engine *summaries* of GBAtemp/WiiBrew forum threads rather than reading the threads themselves (rate limits or blocks during fetch). The WiiBrew Discord, r/wiihacking, and r/wii communities are active and would likely answer specific, narrow questions (e.g. "does the Wii Menu clock ever show seconds?") faster and more reliably than another round of search-agent guessing — but this requires a human to actually post and wait, not something an agent can do autonomously.

## Recommendation

Given how much of the *existing* research is already solid, the highest-value next moves are the ones that resolve specific flagged gaps rather than re-running broad web search again:

1. **Ask about physical Wii / Dolphin access** (#1/#2) — settles almost every remaining animation/timing/audio ambiguity in one move, if available.
2. **Browser-reload the specific blocked fan-wiki URLs** (#4) — cheap, fast, directly targets named gaps already in the docs.
3. **Clone and read `Fraulk/Wii-Menu`'s source** (#3) — cheap, gives concrete implementation-grade answers other hobbyists already settled on.
4. Everything else (video frame analysis, WAD extraction, font ID, community sourcing) is worth doing but higher-effort or needs something from you (a video clip, a Discord post, a "yes I have a Wii") to move forward.
