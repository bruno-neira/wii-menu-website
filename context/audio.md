# Wii Menu — Audio Design Reference

> **⚠️ THIS DOC CONTAINS SUPERSEDED MATERIAL (annotated 2026-07-24).** Its central
> premise — that no complete `WIPL_SE_*` catalogue is obtainable and only two identifiers
> are confirmed — is no longer true. `include/sound/IplSound.rsid` in the System Menu
> decompilation is a **complete, auto-generated dump of the BRSAR's sound-ID table: all
> 90 entries**, with exact trigger points recoverable from the calling code. The full
> catalogue and a consolidated main-menu sound map live in `context/decomp-findings.md`
> §11. The *aesthetic* material below (composer, timbre, mood, the startup chime's
> character) is unaffected and still the best available. Stale claims are marked inline
> with `⚠️ SUPERSEDED`.

Research notes on the sound design of the Nintendo Wii Menu (System Menu), compiled for building an accurate web recreation. Sourced from fan wikis, soundtrack archives, modding/reverse-engineering communities, and sound-design commentary. **Primary Nintendo documentation of the Wii Menu's audio is essentially nonexistent** — there is no dedicated Iwata Asks interview, developer blog, or official credits sheet for the System Menu's UI sounds specifically (the closest official material, Iwata Asks: Wii Fit Vol. 4 "Sound, Design and Planning," covers Wii Fit's audio team, not the Menu). Almost everything below is fan-documented, reverse-engineered from ripped system files, or inferred from soundtrack archive metadata. Claims that are fan-consensus-only (not corroborated by Nintendo or file-level evidence) are explicitly flagged.

## 1. Background Ambient Menu Music

- The Wii Menu's idle background music is a looping ambient track, commonly just called **"Wii Menu"** in ripped soundtrack archives (see §8). A separate, shorter clip titled **"Wii Menu Startup"** exists alongside a **"Wii Menu (No Startup)"** variant — strong file-level evidence that the boot chime and the looping ambience are two distinct audio assets stitched together at runtime, not one continuous file. [Internet Archive: Wii System Soundtrack](https://archive.org/details/wii-system-soundtrack-flac)
- Composition character: soft, slowly modulating pad/chime chords with a bell/marimba-like timbre, generally described as "soft, playful chimes layered over warm, looping synths." One detailed fan sound-design writeup ([beyondthebeep, Tumblr](https://www.tumblr.com/beyondthebeep/41170831979/the-nintendo-wiis-ui-sounds)) describes the loop as "mellow, slowly modulating chords" engineered specifically to "sustain engagement without causing listener fatigue" — i.e., deliberately non-repetitive-sounding and low-fatigue for a screen users may sit on for a long time.
- Mood: calm, minimal, ambient/new-age — intentionally unobtrusive rather than a foreground "theme song." Reviewers/retrospectives describe the broader Wii Channels' music family (Photo Channel, Forecast/Weather Channel, News Channel, etc., all sharing the same sonic palette as the Menu) as "ambient IDM that Eno or Aphex Twin would give a thumbs-up to," with "bleepy, trance-y synths" and a "blissed-out downbeat." [Vice: Replaying the Pretty Synthwave Tunes of the Wii Channels](https://www.vice.com/en/article/replaying-the-pretty-synthwave-tunes-of-the-wii-channels/)
- **Composer**: **Kazumi Totaka** is the composer most closely and consistently credited with the Wii Menu/Mii Channel/Wii Shop Channel/Check Mii Out Channel music. Totaka is Nintendo's longtime ambient/UI-music specialist (also known for the recurring "Totaka's Song" easter egg across his works). Individual channels beyond the core Menu had other composers (e.g., Toshiyuki Sudo for Everybody Votes Channel; Kenji Yamamoto possibly involved in Photo/Forecast Channel in an unclear capacity) — full official credits for the System Menu itself were never published by Nintendo, so channel-by-channel attribution is partly reconstructed by fans from style/register rather than confirmed credits. [NIWA Network: Kazumi Totaka](https://niwanetwork.org/wiki/Kazumi_Totaka), [Nintendo Fandom: Kazumi Totaka](https://nintendo.fandom.com/wiki/Kazumi_Totaka)
- Loop length: **not precisely documented anywhere found**. One offhand soundtrack-site comment cites "15 minutes" for an extended/no-loop-seam release of the Menu + Mii Plaza theme, but this reads as a compiled long-play rip rather than the native loop point baked into the game engine — treat as **unconfirmed / fan approximation**, not the actual seamless loop length used in hardware.
- Instrumentation is generally described (by ear, via covers/arrangements) as marimba/bell-mallet-percussion plus warm pad synths; multiple fan sheet-music transcriptions arrange the "Mii Channel"/Wii theme material for marimba specifically, reinforcing the chime/mallet-percussion character, though this is adaptation-driven evidence rather than a confirmed original instrument list. [MuseScore: Wii Theme (Solo Marimba)](https://musescore.com/ikemusics/wii-theme)

## 2. Cursor Movement Sound

- No dedicated "pointer glides through empty space" sound is documented anywhere in the sources reviewed. The Wii Remote pointer/hand cursor appears to move silently across the Menu grid; audio only triggers on **focus** (landing on/highlighting a channel) and **activation** (selecting it) — see §3–4.
- **Uncertain/fan-consensus note**: some general UI-sound retrospectives mention a "light and slightly metallic click... when your Wii hand focuses on a UI element," but this is describing the *focus/hover* event (§3), not continuous cursor-movement audio. Treat plain cursor motion as silent unless/until better evidence surfaces.

## 3. Channel Select / Highlight (Hover/Focus) Sound

- When the pointer/cursor moves onto a channel and it becomes focused (the channel "wobbles"/enlarges slightly in the real Wii Menu), a short **light, metallic click/blip** plays. Described in fan sound-design analysis as a lightweight "focus" tick distinct from the heavier "launch" sound. [beyondthebeep: The Nintendo Wii's UI Sounds](https://www.tumblr.com/beyondthebeep/41170831979/the-nintendo-wiis-ui-sounds)
- The related Wii Shop Channel (which reuses the same system sound family/engine conventions) documents an explicit **"Hover/Target"** effect as "the sound played when hovering over buttons," corroborating that hover/focus is its own discrete SFX category system-wide, separate from selection. [OSCWii docs: Wii Shop Channel sound](https://docs.oscwii.org/wii-shop-channel/js/sound)
- Some write-ups also describe a companion **"bloop" that rises in pitch as the menu item visually inflates/enlarges** on focus — i.e., the pitch-rising blip is treated as tightly synced to (and metaphorically reinforcing) the channel's "puff up" hover animation. [beyondthebeep](https://www.tumblr.com/beyondthebeep/41170831979/the-nintendo-wiis-ui-sounds)

> **⚠️ SUPERSEDED (2026-07-24): there is no single "hover sound" — there are two parallel
> families, and they must not be conflated.**
>
> | Event | Sound (Nintendo's own spelling, two T's) | ID |
> |---|---|---|
> | Point at a **channel tile** | `WIPL_SE_CH_TARGETTING` | 35 |
> | Point at a **bottom-bar button / arrow / SD icon** | `WIPL_SE_BT_TARGETTING` | 34 |
> | **Un**-hover anything | *silence* — there is no un-hover sound at all | — |
> | Name balloon pops in (267 ms / 333 ms after hover) | `WIPL_SE_BALLOON` | 42 |
> | Click a channel | `WIPL_SE_BT_PUSH` (46), then `WIPL_SE_CH_SELECT` (32) as the zoom starts |
> | Back out of a channel preview | `WIPL_SE_CH_UNSELECT` | 33 |
> | Click a **bar button** (Message Board / Wii / SD) | `WIPL_SE_DECIDE` — **not** `BT_PUSH` | 36 |
> | Page turn (arrow, +/−, or drag-hold) | `WSD_SELECT`, fired on trigger *before* any motion | 22 |
> | Press a **disabled** control | `WIPL_SE_GRAY_BUTTON` | 57 |
>
> Hover also fires a **rumble pulse of 7/120 s ≈ 58.3 ms** — undocumented anywhere else in
> this corpus. There is a **third** cue this doc did not predict: un-select is its own
> sound, distinct from both hover and select.
> The "pitch-rising bloop synced to the tile puffing up" is doubly wrong: the tile does
> not inflate on hover (the icon layout is never touched), and the blip is a fixed sample.
> See `context/decomp-findings.md` §2.3 and §11. Evidence tier: decomp.

## 4. Channel Launch Sound

- Clicking/selecting a channel to launch it triggers a distinct, sharper sound than the hover blip — described as a "quick zap effect with sharp texture and rapid attack," i.e., a crisper, more percussive confirmation tone than the soft hover click. [beyondthebeep](https://www.tumblr.com/beyondthebeep/41170831979/the-nintendo-wiis-ui-sounds)
- The Wii Shop Channel's documented sound set again corroborates the general pattern system-wide: a **"Decide/Select"** effect described as "a success-like sound, played upon button selection," separate from hover. [OSCWii docs](https://docs.oscwii.org/wii-shop-channel/js/sound)
- Visually, launching a channel is accompanied by the channel's banner zooming/expanding to fill the screen before the channel loads; fan discussion describes an ascending **"woosh"** sound tied to this forward navigation/zoom-in transition, and a corresponding descending "woosh" (high-to-low filter sweep) when backing out of a channel/closing it. These transition-woosh sounds are **less firmly sourced** than the click/select tones above — flagged as fan-analysis-level detail rather than confirmed via file extraction.
- A GBAtemp modding thread titled "Extract Wii Menu sound when you click on a game" confirms hobbyists specifically go after this sound as an isolable asset, implying it is indeed a single discrete sound file within the system sound archive — but the thread's technical content could not be retrieved (403/blocked) to confirm the exact filename. **Gap**: exact internal identifier for the launch sound not confirmed (see §8 for the naming convention it likely follows).

## 5. Wii Remote Connect/Disconnect (Sync) Sound, Low-Battery Sound

- **Sync/connect chime**: There is a distinct, commonly-clipped "Wii Remote connected" sound (widely uploaded to soundboard sites, e.g. Myinstants), used both at console boot (when remotes auto-reconnect) and when manually syncing a new remote via the SYNC button flow. Exact acoustic description was not found in a reliable technical source — commonly characterized informally as a short two-to-three-note ascending confirmation chime, consistent in style with the Menu's other confirmation tones, but this specific characterization is **fan-consensus/unconfirmed**, not sourced to an official or file-level document in this research pass.
- **Disconnect**: no distinct documented disconnect-specific sound was found separate from the general Wii Remote's small onboard piezo speaker beeps (used for in-game rumble-adjacent feedback); the Remote itself has a "small low-quality 21mm piezo-electric speaker... used for short sound effects," per WiiBrew hardware documentation, but that's Remote hardware in general, not confirmation of a specific Menu-level disconnect jingle. [WiiBrew: Wiimote](https://wiibrew.org/wiki/Wiimote)
- **Low battery**: research found **no evidence of an audible low-battery warning** in the Wii Menu context. Low battery is communicated purely visually — the 4 blue Player LEDs on the Remote step down (4 lit = full, 1 flashing = critically low, none lit = dead), and in-game a text banner ("Warning: Wii Remote batteries are low") appears periodically. No beep/chime is documented anywhere searched. Treat Wii Remote low-battery as a **silent, LED/text-only indicator** for the purposes of this clone unless further evidence emerges.

## 6. Message Board / Mail Notification Sound

- New mail on the Message Board is indicated by a **pulsing blue glow** around the Message Board channel/notification icon plus, per general fan description, **"a pinging sound"** when a new message arrives. The precise timbre/pitch of this ping was not documented in any technical source found — flagged as **fan-consensus description only** ("pinging sound"), not a sourced acoustic breakdown.

> **⚠️ SUPERSEDED (2026-07-24) — the sound is confirmed and named; the "pulsing blue glow"
> is probably a conflation:**
> - **The ping is `WIPL_SE_NEW_ARRIVAL` (ID 66)**, fired from `Button::startNewMailAnm_()`
>   — the decompiler's own comment on the line reads `// Play nice jingle`. It **repeats
>   every 3000 ms** for as long as the state persists.
> - The notification is actually **two distinct animations**, not one blink:
>   `G_BbsSignal` (frames 1→400 = **6667 ms**, looping, **silent**, shown whenever the
>   mail count is non-zero) and `G_BbsSignal_new` (frames 1→160 = **2667 ms**, one-shot,
>   **plays the jingle**, re-fired on a 3000 ms timer). So the rhythm is a ~2.67 s flourish
>   with a ~0.33 s gap. Nintendo's manual word "blink" is misleading — trust the frames.
>   There is also a **numeric unread badge** (pane `T_BbsMark1`), clamped to 99, with no
>   "99+" affordance.
> - **No blue-glow asset exists** in the Wii Menu texture set, and the notification path
>   drives layout animation groups plus a text pane — no glow or bloom material is
>   involved. This reads as a conflation with the console's **physical disc-slot LED**,
>   which really does pulse blue for WiiConnect24 data and is user-configurable to
>   Bright / Dim / Off. Recommend removing the claim or re-scoping it to the hardware LED.
>   *(Honest caveat: this is partly an argument from absence — a recommended correction,
>   not a proven refutation.)*
> See `context/components/mail-button.md` §4.1–4.4 and `context/visual-design.md` §6.
> Evidence tier: decomp (sound + animation), inference (the glow).
- Individual mail messages can carry **custom sender-attached sounds** as part of their "stationery" (a custom envelope/letterhead/sound bundle chosen by the sender), meaning the *system's* default open-message sound can be overridden per-message — this is a Nintendo-documented feature of Message Board stationery, not just a notification detail. Worth noting for a clone: the "opening a letter" sound is not fixed, unlike the core Menu SFX.

## 7. Startup Chime (Boot Sound)

- The startup sound is a **short (roughly one-second), distinct sampled jingle**, separate from the looping ambient menu music — confirmed at the file level: the Wii's system sound archive contains a specific identifier **`WIPL_SE_WII_START`**, distinct from the BGM sequence data, and community rippers note "the startup sound is surprisingly not part of the actual BGM" — it's a standalone sample that plays once, immediately before/as the looping ambience begins. [HCS64 forum: Ripping Wii Startup Sound from BRSAR](https://hcs64.com/mboard/forumlong.php?showthread=54710)
- This is corroborated by the soundtrack-rip file list showing **"Wii Menu Startup"** as its own track, separate from **"Wii Menu"** and **"Wii Menu (No Startup)"** — i.e., three separate assets: the chime alone, the loop alone, and (likely) a combined convenience rip. [Internet Archive: Wii System Soundtrack](https://archive.org/details/wii-system-soundtrack-flac)
- Sonic description (fan sound-design analysis): a brief **orchestral/synth "micro-overture"** — "gentle synth sounds with a soft attack" and notable reverb/delay, harmonically moving between an inverted G major and a Gadd2 chord, intended to establish "the console's personality" in under two seconds before handing off into the ambient loop. [beyondthebeep: The Nintendo Wii's UI Sounds](https://www.tumblr.com/beyondthebeep/41170831979/the-nintendo-wiis-ui-sounds)
- Colloquially/anecdotally (widely repeated online, e.g. NeoGAF discussion) the startup + menu audio was perceived by many users as unusually **loud relative to in-game audio levels** — a UX/tuning complaint rather than a description of the sound's content, but useful context for how prominent this moment was meant to feel. [NeoGAF: Why is the startup sounds and menu music so LOUD on the Wii?](https://www.neogaf.com/threads/why-is-the-startup-sounds-and-menu-music-so-loud-on-the-wii/)
- Note: this Wii startup chime is a **different, more minimal** sound than the more famous, fuller GameCube startup jingle that preceded it in Nintendo's console lineage — the Wii's is intentionally smaller/softer, consistent with its "quiet ambient" menu identity rather than a triumphant fanfare.

## 8. Known Filenames / System Sound Archive Structure

- All Wii Menu (System Menu / "IPL") sound effects and the startup chime live in a single audio archive: **`sound/IplSound.brsar`** (or `iplsound.brsar`), a BRSAR (Binary Revolution Sound Archive) — the same container format used for Super Smash Bros. Brawl and other late-2000s Nintendo titles, which is why Brawl-modding tools (BrawlBox/BrawlCrate) are the tools fans use to try to open it. [GBAtemp: IplSound.brsar thread](https://gbatemp.net/threads/iplsound-brsar.238302/), [GBAtemp: How to add custom sound to your Wii Menu](https://gbatemp.net/threads/how-add-custom-sound-to-your-wii-menu.632574/)
- The Menu's looping background music is **not** a single linear audio file — it's implemented as a **MIDI-like sequence driven by a soundfont/bank inside the BRSAR** (i.e., dynamically sequenced, not a straight PCM loop), which is part of why it's been hard for the modding community to cleanly rip a single "menu music" WAV/BRSTM file. The one-shot startup chime, by contrast, does appear to be a plain sampled/streamed clip. [HCS64 forum thread](https://hcs64.com/mboard/forumlong.php?showthread=54710)
- Confirmed/documented sound effect identifiers follow a **`WIPL_SE_<NAME>`** naming convention (IPL = the Wii's boot loader-derived internal name for the System Menu; SE = sound effect). Confirmed examples found in this research:
  - `WIPL_SE_WII_START` — the startup chime (§7).
  - `WIPL_SE_CHAR_DELETE_ERROR` — an error tone, also reused by the on-screen keyboard's character-delete-error case.
  - Extraction tooling is reported as immature/unreliable for this archive: contributors note VGMToolbox/VGMTrans/BrawlBox/generic BRSAR extractors all fail or only partially work on `IplSound.brsar` (stereo audio handling in particular is broken in most public tools), so **no complete, verified list of every `WIPL_SE_*` identifier was found** — only the two above plus the general existence of a Menu-wide sound set covering hover/select/cancel/error categories (§3–4).

> **⚠️ SUPERSEDED (2026-07-24): the complete list exists and has been recovered — all 90
> IDs.** You do not need to extract the BRSAR to get the *names*: the decompilation ships
> `include/sound/IplSound.rsid`, an auto-generated dump of the archive's sound-ID table.
> (You still cannot get the *samples* that way — the audio itself remains in NAND.)
> Everything in the code passes these as **string literals**, so the identifiers are
> quotable verbatim. Highlights beyond §3–4's marker:
> - `WIPL_SE_WII_START` (26) fires **exactly once per power-on**, gated by a static flag,
>   alongside the looping `WIPL_BGM_MENU` (58). Returning from a channel replays only the
>   BGM — confirming this doc's "two distinct assets stitched at runtime" reading.
> - Drag family: `WIPL_SE_CH_HOLD` (62), `CH_DRAG` (63), `CH_SET` (64), `CH_NOT_MOVE` (65)
>   — and **they are stereo-panned by the pointer's X position**, with the held drag loop
>   additionally **modulated by per-frame movement magnitude**
>   (`holdSEwithPosDis("WIPL_SE_CH_DRAG", pos.x, speed)`). Reproducible with a
>   `StereoPannerNode`. Board messages are hard-panned to ±300 as they fly to the envelope.
> - `WIPL_SE_SDCARD_IN` / `_OUT` (68/69) announce card insertion/removal on the menu.
> - `WIPL_ME_*` are jingles ("music entry"): `NO_DISC_BANNER` (27), `GC_BANNER` (29),
>   `INVALID_DISC_BANNER` (30). **The "no disc" cue is a jingle, not a beep** — it occupies
>   the slot a real game's banner music would and is killed with a 28-frame fade.
> - There is **no `WIPL_SE_DISC_*`** anywhere: an audible disc-insert cue would be an
>   addition, not a restoration.
> - **Cursor movement is confirmed silent** — no `WIPL_SE_POINTER_*` / `CURSOR_MOVE` in
>   the table, and no `startSE` call anywhere in `Pointer`/`PointerCore`. Upgrade §2 from
>   "treat as silent unless better evidence surfaces" to **confirmed**.
> - Sixteen separate **players** (voice channels) are enumerated — `PLAYER_FOCUS`,
>   `PLAYER_BGM`, `PLAYER_WII_START`, `PLAYER_SDCARD`, … — so the focus tick, the decide
>   sound and the BGM never cut each other off. Mirror with independent audio nodes.
>
> The estimate of "~8–15 stingers" was low, and the Wii Shop Channel proxy is no longer
> needed. See `context/decomp-findings.md` §11 for the full table and the consolidated
> main-menu sound map. Evidence tier: decomp.
- A close analog with a fully-documented SFX list is the **Wii Shop Channel**, which shares the Menu's general system-sound conventions/engine lineage and has been reverse-engineered into an open-source JS reimplementation with a clean, named list of **15 sound effects**: Push (near-silent), Hover/Target, Decide/Select, Cancel, Choice Change (radio-button-style option switch), Error, Add Point, Copy Finished, plus several reused classic-Mario stingers (Small/Large Jump, Fire Ball, Coin, Hit Block), a "Copying" loop, and a "Loading" spinner sound — this is the **best available proxy** for how many distinct, purpose-built UI SFX categories exist in this generation of Wii system software, even though it documents the Shop Channel rather than the core Menu itself. [OSCWii docs: Wii Shop Channel sound](https://docs.oscwii.org/wii-shop-channel/js/sound)
- Practical implication for reconstruction: expect the real Wii Menu to have on the order of **~8–15 short, purpose-specific UI stingers** (hover, select, cancel/back, error, a couple of transition wooshes, plus the one-shot startup chime) layered over one continuously-sequenced ambient bed — not a single monolithic "menu sound." Exact counts/names beyond what's listed above remain **unconfirmed** without direct access to a working `IplSound.brsar` extraction.

## Summary of Confidence Levels

| Element | Confidence |
|---|---|
| Composer = Kazumi Totaka (Menu/Mii Channel core) | Well-corroborated across multiple fan-wiki/database sources, no official Nintendo credit sheet found |
| Startup chime is a separate asset from the loop | High — confirmed both by file-naming (`WIPL_SE_WII_START`) and by separate soundtrack-rip tracks |
| Hover vs. select being two distinct SFX | High — corroborated by both direct Menu analysis and the sibling Wii Shop Channel's documented SFX set |
| Exact acoustic descriptions (chord names, "zap," "woosh") | Medium — sourced to one detailed fan sound-design blog post, not officially confirmed |
| Loop length/duration of ambient bed | Low — no reliable figure found |
| Message Board "ping" sound detail | Low — description only, no acoustic specifics |
| Wii Remote sync chime description | Low — sound exists and is widely clipped online, but no technical/acoustic writeup found |
| Low-battery sound | None found — appears to be visual-only |
| Complete `WIPL_SE_*` catalog | Low — only 2 identifiers confirmed; archive is not cleanly extractable with current public tools |

> **⚠️ SUPERSEDED (2026-07-24) — three rows of this table have moved:**
> | Row | New confidence |
> |---|---|
> | Complete `WIPL_SE_*` catalog | **High** — all 90 IDs recovered verbatim from `IplSound.rsid`; see the §8 marker. |
> | Hover vs. select being two distinct SFX | **Confirmed**, and it is finer-grained than stated: hover splits into `CH_`/`BT_` families, and un-select is a third cue. |
> | Message Board "ping" | **High for the sound** (`WIPL_SE_NEW_ARRIVAL`, 3000 ms repeat); the accompanying "pulsing blue glow" is **likely wrong** — see the §6 marker. |
>
> Unchanged and still Low/None: loop length of the ambient bed, the Wii Remote sync
> chime's acoustics, and the low-battery silence. Evidence tier: decomp.
