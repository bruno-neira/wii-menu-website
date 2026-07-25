# Wii Menu — Technical & Display Specs Reference

Research reference for the fan-made React recreation of the Nintendo Wii "Wii Menu" (System Menu). Compiled from WiiBrew, Wikipedia, homebrew/dev documentation, and community technical threads. Every factual claim below is cited inline; the final section is explicitly marked as original synthesis for this project rather than sourced fact.

---

## 1. Native Output Resolution(s)

- The Wii's GPU (**Hollywood**, an updated GameCube "Flipper" running at 243 MHz) renders internally to an **embedded framebuffer (EFB)** that can be sized up to **640×480** (at 60 Hz/NTSC modes), which is then copied to an **external framebuffer (XFB)** used to generate the actual video signal. The XFB width can range from **640 to 720 pixels**. ([WiiBrew forum — EFB specifications](http://forum.wiibrew.org/read.php?11,66088))
- Standard console-wide output resolution is **640×480** for 4:3 content. In 16:9 mode, many titles (and the Menu) render/output using a **720-pixel-wide anamorphic frame** that the display then stretches horizontally to fill a 16:9 panel — i.e., the Wii does not render a true higher-horizontal-resolution widescreen image, it outputs a squeezed 4:3-shaped image tagged as widescreen. ([NeoGAF — Wii 640x480 max thread](https://www.neogaf.com/threads/the-wii-can-only-output-640x480-pixels-max.307144/); [WiiBrew — Video output](https://wiibrew.org/wiki/Video_output))
- Region/output-mode summary:
  - **NTSC** consoles: 480i (60 Hz interlaced) and 480p (60 Hz progressive, requires component cable + progressive-capable display).
  - **PAL** consoles: 576i (50 Hz, standard PAL), 576p (50 Hz progressive), plus NTSC-compatible 480i/480p (60 Hz) modes.
  - Progressive modes (480p/576p) require a component cable; composite/S-Video are limited to interlaced 480i/576i. PAL models support RGB SCART; NTSC models do not. ([WiiBrew — Video output](https://wiibrew.org/wiki/Video_output))
- The Wii has **no native HD output** — 480p is the practical maximum; there is no 720p/1080i/1080p mode on original Wii hardware output. ([Wikipedia — Wii](https://en.wikipedia.org/wiki/Wii))
- Pin 16 of the AV connector is used to signal 4:3 vs. letterbox vs. 16:9 to the display, though this SCART aspect-signaling feature is documented as **not actually supported** by the console in practice. ([WiiBrew — Video output](https://wiibrew.org/wiki/Video_output))

## 2. Framerate (NTSC 60 Hz / PAL 50 Hz)

- Video timing is tied to regional TV standard: **60 Hz for NTSC** (480i/480p) and **50 Hz for PAL** (576i/576p), with PAL Wiis additionally able to output an NTSC-framerate 480i/480p mode "with PAL encoding." ([WiiBrew — Video output](https://wiibrew.org/wiki/Video_output))
- No official Nintendo documentation was found that states the exact frame-lock rate of the Wii Menu's own UI animations (channel hover "jiggle," Disc Channel spin, page-flip transition, etc.). It is reasonable to infer the Menu, like virtually all Wii software, is **v-sync'd to the console's video-out refresh rate** (60 Hz in NTSC regions, 50 Hz in PAL regions), since the Wii's GX graphics pipeline renders through the same VI (Video Interface) that drives the display — homebrew dev discussion confirms rendering is tied to EFB→XFB→VI output at the selected video mode's refresh rate. ([WiiBrew forum — EFB specifications](http://forum.wiibrew.org/read.php?11,66088))
- **Gap:** No source was found that documents the Wii Menu specifically running at a different (e.g., sub-60) internal update rate independent of display refresh — treat "60 fps NTSC / 50 fps PAL, vsync'd" as the best-available inference, not a confirmed spec.

## 3. Aspect Ratio Behavior of the Channel Grid

- The Wii Menu layout is **four pages, each a fixed 4×3 grid** (4 columns × 3 rows = 12 slots per page), for a total of **48 customizable channel slots** across all pages; the Disc Channel slot is fixed and not movable. ([Wikipedia — Wii system software](https://en.wikipedia.org/wiki/Wii_system_software); [handwiki.org — Wii Menu](https://handwiki.org/wiki/Wii_Menu))
- The grid's cell **count and arrangement (4×3) do not change** between 4:3 and 16:9 display modes — the Wii does not add extra columns or reflow the grid for widescreen. Instead:
  - In 16:9 mode, the Wii outputs the same conceptual 4:3-composed frame, and the console/TV stretch it horizontally (anamorphic-style), meaning **UI elements appear visually wider/less circular** — user reports specifically note that in widescreen mode "the horizontal buttons should look more squished" relative to 4:3, consistent with a 4:3 image being horizontally stretched to fill 16:9. ([GBAtemp — Noob question Wii 16:9 mode](https://gbatemp.net/threads/noob-question-wii-16-9-mode.338956/))
  - Some technical discussion indicates that when set to widescreen, the Wii renders using the fuller ~720-pixel-wide active area versus 640 pixels in 4:3 mode — i.e., extra horizontal buffer width is used rather than the UI gaining new grid columns. ([WiiBrew — Video output](https://wiibrew.org/wiki/Video_output); community discussion above)
- **Practical takeaway:** the Wii Menu's grid is a **fixed 4×3 layout regardless of aspect ratio** — widescreen is handled at the video-output/stretch level, not by the UI reflowing more channel icons into view.

## 4. System Font

- The font used across GameCube, Wii, Nintendo DSi, Nintendo 3DS, and Wii U system software (including the Wii Menu, its built-in channels, and Virtual Console menus) is **Rodin NTLG** — "Rodin" (a rounded geometric sans typeface) combined with "New Type Labo Gothic" kana for Japanese glyphs, from the Japanese foundry **Fontworks**, originally designed by **Yutaka Satō for Type Labo** and first released in 1997. ([List of Nintendo system fonts — NintendoWiki](https://niwanetwork.org/wiki/List_of_Nintendo_system_fonts); corroborated via search excerpt from same source)
- The homebrew community has extracted the actual embedded font: using **"Wii.cs Tools"** to pull a font file out of a Wii WAD (e.g., from any Virtual Console title), which yields a **`WiiNTLG-Regular`** TrueType-collection (.ttc) font file that can be installed and viewed like a normal font on PC. This confirms Rodin NTLG (rebranded internally as "WiiNTLG") is the literal shipped font file, not just an approximation. (Referenced via NintendoWiki / community extraction guides surfaced in font search results — see niwanetwork.org above.)
- Rodin NTLG itself is a **commercial, licensed font** (Fontworks) — not freely redistributable — so it is not something a hobby web project can legally bundle wholesale. For a browser-based recreation without extracting/using the proprietary file, commonly recommended free substitutes for its "rounded geometric sans" character include:
  - **Google Fonts:** *Quicksand*, *Comfortaa*, *Baloo 2*, *Varela Round*, *M PLUS Rounded 1c* (the latter is specifically a rounded Japanese-capable sans in the spirit of Rodin/Maru Gothic families), *Nunito* (less rounded but close weight/width feel).
  - Font-identification communities (dafont.com Nintendo font threads, GBAtemp) commonly point people toward **"FOT-RodinNTLG"** dealer listings or rounded-sans lookalikes when the genuine Fontworks license isn't available. ([dafont.com — Nintendo 3DS System Font forum](https://www.dafont.com/forum/read/475947/nintendo-3ds-system-font))
- **Gap:** No single authoritative Nintendo-published statement of "the Wii Menu uses Rodin NTLG" was directly fetched (the primary NintendoWiki page returned an HTTP 403 on direct fetch); the claim rests on search-indexed content from that page plus corroborating community/font-ID discussion. Treat font identity as **very likely correct but community-sourced**, not an official Nintendo spec sheet citation.

## 5. Color Depth / Rendering Notes

- The Hollywood GPU's embedded framebuffer (EFB) supports **16-bit, 18-bit, and 24-bit** color depth options; in practice the console's output framebuffers are commonly described as supporting **16-bit and 24-bit** modes. ([search-aggregated from Beyond3D/NeoGAF technical threads, and WiiBrew EFB documentation](http://forum.wiibrew.org/read.php?11,66088))
- Native video-out color format is **YUV/YCbCr (YUY2, 4:2:2 chroma subsampling)** rather than RGB — standard for TV-targeted consumer video hardware of this era; the GPU's copy-out hardware supports conversion between RGB and YUV formats when moving data from EFB to XFB. ([search-aggregated: Wii-Linux RGB framebuffer driver notes; GX patent documentation on EFB→XFB copy-out conversions](https://fartersoft.com/blog/2011/06/22/hacking-up-an-rgb-framebuffer-driver-for-wii-linux/))
- Embedded framebuffer capacity: **2 MB** EFB, plus **1 MB texture cache** and **0.1 MB vertex cache** (~3.1 MB total embedded graphics memory), separate from the console's 88 MB main system memory (24 MB 1T-SRAM + 64 MB GDDR3). ([Wikipedia — Wii](https://en.wikipedia.org/wiki/Wii); GX architecture threads)
- None of this materially constrains a modern web recreation (browsers render in 24-bit+ RGB regardless), but it explains why original Wii Menu screenshots/video captures can show mild color banding/gradient stepping compared to a modern flat-design reproduction — the source material was TV-signal-constrained YUV, not high-bit-depth RGB.

## 6. TV Safe-Area / Overscan Considerations

- General broadcast/CRT-era safe-area convention (not Wii-specific, but the design context the Menu was built under): a **"title-safe" area of ~80% of frame width/height**, and an **"action-safe" area of ~90%** of frame width/height, to keep on-screen text and important UI elements clear of the unpredictable edge cropping ("overscan") that consumer CRT displays applied. ([Wikipedia — Overscan](https://en.wikipedia.org/wiki/Overscan); [NAB — Television Safe Areas Redefined](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf))
- Overscan exists because consumer CRTs deliberately drew the picture larger than the visible tube area to hide edge irregularities and tolerate voltage-driven image-size "blooming," so broadcasters/console makers could not guarantee exactly where a TV's visible edge would fall — hence the safe-area convention. ([Wikipedia — Overscan](https://en.wikipedia.org/wiki/Overscan))
- No Nintendo-published document giving the Wii Menu's exact safe-area percentage/pixel margins was found. However, the Menu's actual layout is consistent with conservative CRT-safe design: the 4×3 channel grid, page-dot/date-time footer, and side "Wii" sidebar buttons all sit with visible margin inset from the frame edge in period screenshots — behavior typical of a design built to the ~90% action-safe convention rather than edge-to-edge.
- **Gap:** treat "how many px/percent of margin the real Menu used" as **unsourced/inferred**, not documented fact — this is a reasonable design-history assumption from general CRT-era practice, not a confirmed Nintendo spec.

## 7. Synthesis — Translating These Constraints to a Responsive React Rebuild

> The following is original reasoning for this project, not sourced fact. Marked explicitly since the brief requires distinguishing it from the researched material above.

- **Base design canvas:** Anchor the design to a **4:3-equivalent composition at a 640×480-derived scale** (e.g., design tokens/spacing based on a 640×480 or 960×720 "logical" canvas) for the core grid and chrome, since that is the resolution the real Menu's UI was actually laid out against — even 16:9 output was that same composition stretched, not a redesigned wider layout. This keeps the icon grid's proportions faithful.
- **Aspect ratio handling:** Rather than literally reflowing the grid to add columns on wide viewports (which the original console never did), consider:
  - Locking the "TV screen" area of the page to a **fixed 4:3 (or optionally 16:9-stretched) aspect-ratio container**, similar to how retro-console recreation sites often present the whole UI inside a bordered/framed viewport — this reads as more authentic than a fluid grid that adds channels as the window widens.
  - If a true responsive/fluid layout is preferred instead (more "modern web app" than "console frame"), it's reasonable to diverge from the source and add columns/rows at wider breakpoints — but document that as a deliberate departure from hardware accuracy, since the real Menu's grid was hard-fixed at 4×3 regardless of TV aspect ratio.
- **TV-safe margins → web equivalent:** Even though overscan is irrelevant on a browser canvas, keeping a deliberate **~5–10% inset margin** around the grid/chrome (echoing the historical ~90% action-safe convention) will visually read as "TV UI" rather than "web page," and is an easy way to reproduce the Menu's characteristic breathing room without needing exact original pixel values (which aren't documented anyway).
- **Framerate:** Since the original was v-synced to 60 Hz (NTSC) / 50 Hz (PAL) display refresh, target **60fps CSS/JS animations** (the web/NTSC-equivalent default) for hover wiggles, page transitions, and the Disc Channel-style spin — this matches the likely original behavior and is also simply the correct default for smooth web animation today.
- **Font:** Do not attempt to source or bundle the real Rodin NTLG/WiiNTLG file (commercial Fontworks license, and extracting it from a console WAD is a legal gray area unsuitable for a public hobby/portfolio site). Instead, use a free rounded-geometric-sans Google Font as a stand-in — **M PLUS Rounded 1c**, **Quicksand**, or **Comfortaa** are the closest free approximations of Rodin NTLG's rounded, friendly, slightly wide letterforms; pick based on which renders the specific UI numerals/labels (clock, channel names) most cleanly at small sizes.
- **Color/rendering:** No need to emulate YUV/limited color depth — modern displays and CSS render in full RGB. If a deliberately "authentic CRT" aesthetic is desired, that's better achieved via subtle post-processing (scanline overlay, slight chroma blur, or a CRT-shader-style filter) than by actually reducing color fidelity.
- **Resolution/viewport:** For a responsive React app, pick a **fixed max-width "TV" container (e.g., 960–1280px at 4:3 or 16:9) centered in the viewport**, rather than trying to hard-target 640×480 (which would look tiny/blurry on modern displays). Scale UI proportionally from that container using relative units (rem/%/vw within the container) so the *relationships* between grid, margins, and chrome stay faithful to the original 4:3/640×480 composition even though the absolute pixel resolution is much higher.

---

## Sources

- [WiiBrew — Video output](https://wiibrew.org/wiki/Video_output)
- [WiiBrew forum — EFB (embedded frame buffer) specifications](http://forum.wiibrew.org/read.php?11,66088)
- [Wikipedia — Wii](https://en.wikipedia.org/wiki/Wii)
- [Wikipedia — Wii system software](https://en.wikipedia.org/wiki/Wii_system_software)
- [Wikipedia — Overscan](https://en.wikipedia.org/wiki/Overscan)
- [NAB — Television Safe Areas Redefined (PDF)](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf)
- [List of Nintendo system fonts — NintendoWiki](https://niwanetwork.org/wiki/List_of_Nintendo_system_fonts)
- [dafont.com — Nintendo 3DS System Font forum thread](https://www.dafont.com/forum/read/475947/nintendo-3ds-system-font)
- [handwiki.org — Wii Menu](https://handwiki.org/wiki/Wii_Menu)
- [NeoGAF — "The Wii can only output 640x480 pixels max"](https://www.neogaf.com/threads/the-wii-can-only-output-640x480-pixels-max.307144/)
- [GBAtemp — "Noob question Wii 16:9 mode"](https://gbatemp.net/threads/noob-question-wii-16-9-mode.338956/)
- [Farter's Mess — Hacking Up an RGB Framebuffer Driver for Wii-Linux](https://fartersoft.com/blog/2011/06/22/hacking-up-an-rgb-framebuffer-driver-for-wii-linux/)
