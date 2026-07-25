# Pinterest Moodboard — brunowolneira/wii-menu

**Source:** https://www.pinterest.com/brunowolneira/wii-menu/ (public board, "wii menu", 35 pins, curated by the project owner)

This is the project owner's own curated visual reference board, not third-party research — treat it as a statement of *intended direction* (what look/feel is being aimed for), not as verified fact about the original hardware. Catalogued by browsing the board directly on 2026-07-24; no images were downloaded, only observed and described.

## What's on the board

**Disc Channel ("Please insert a disc") screens — the most-repeated pin type (~10+ pins)**
- Several near-identical captures of the classic light blue/white Disc Channel screen (grey disc icon left, blue Wii Menu button center, navy "Start" pill right).
- At least one dark/near-black themed variant of the same layout (same composition, inverted to a black bezel) — signals interest in a possible dark-mode take on the Disc Channel.
- One teal-accented variant.
- One version with a PlayStation logo swapped in for the disc icon — appears to be a meme/joke pin, not a literal reference.

**Main channel grid screenshots (~6 pins)**
- Full Wii Menu grids showing the real default/common channel set: News Channel, Photo Channel, Wii Shop Channel, Forecast Channel, Internet Channel, Wii Speak, plus homebrew entries (Cave Story, an N64 emulator/VC-style icon, "Homebrew Channel").
- Clock readouts visible directly in these screenshots (useful ground truth for format): `11:36 PM Mon 8/10`, `12:00 AM Fri 1/1`, `1:14 PM Sat 1/29`, `9:49 AM Fri 7/21`, `6:18 AM Wed 3/25` — all consistently **12-hour, AM/PM, 3-letter day abbreviation + numeric month/day**, no seconds shown.
- Bottom bar consistently shows: small Wii logo/speaker icon (bottom-left), pill-shaped "Wii Menu"/"Start" buttons (center), envelope/mail icon (bottom-right) — matches what the independent web-research docs describe.

**Mii Channel (2 pins)**
- A crowd-of-Miis screenshot and a separate "Mii" channel logo/wordmark pin.

**Homebrew / fan recreations (2 pins) — reference for alternate takes, not canonical**
- **"Wii Menu+"** — a grayscale reinterpretation of the menu with a `9:49 AM Fri 7/21` clock overlay.
- **"Wii Menu (Beta 1.0)"** — a Scratch (MIT, block-coding platform) project recreation dated `Sunday 2/25/24`, using a purple-tinted bottom bar instead of the original blue/white — shows how another hobbyist reinterpreted the palette.

**Aesthetic touchstone**
- A pin explicitly labeled **"Frutiger Aero"** — this is a strong signal: the user associates the Wii Menu's look with the broader 2004–2013 Frutiger Aero design movement (glossy/glassy surfaces, soft gradients, light skeuomorphism, nature/tech optimism). Worth treating as a direction-setting cue for the whole project's visual language, not just the literal Wii screenshots.

**Input/cursor reference**
- A hand-shaped pointer glove icon with a "1" player-number badge — matches the known real Wii Remote pointer design (see `context/animations-interactions.md` for behavior).
- A button-layout diagram (looks like a Wii Classic Controller/GameCube-style mapping) — likely saved for input reference rather than menu visuals.

**Secondary channel reference**
- "Wii Shop Channel" screenshot — shopping-bag icon motif, same bottom bar "Wii Menu"/"Start" pattern, useful if a Shop-style channel gets built.

**Misc / loosely related (don't over-index on these)**
- A blank/faded "Wii Menu PC Wallpaper" pin.
- A "wii ui - Google Search" results-page screenshot (montage, not a single source).
- A Google Images result pointing to a DeviantArt-hosted asset (`wixmp-ed30a86b8c4ca887773594c2.wixmp.com/.../dh3mea4-...png`) — likely fan art or an icon pack; not inspected further.
- A few tangential, probably-stray saves not literally about the Wii Menu: Mii wordmark logo, "Super Smash Bros. Ultimate" (possibly saved for its Mii character render), old iTunes app icon, a "Max Volume" sticker, and a Lazytown product listing. These read as incidental Pinterest algorithm noise rather than intentional references.

## Takeaways for implementation

1. The clock format seen across every real screenshot on this board is consistent and matches `context/clock.md` findings — good corroboration, use 12-hour + AM/PM + day abbreviation + M/D.
2. The repeated emphasis on Disc Channel variants (including a dark version) suggests the user may want to support/explore a themed or dark variant of that screen, beyond the single default.
3. "Frutiger Aero" is called out explicitly and should inform broader styling decisions (glossiness, gradients, soft light skeuomorphism) — not just literal pixel-matching of one screenshot.
4. The homebrew "Wii Menu+" and "Wii Menu Beta 1.0" pins are alternate fan takes, not ground truth — useful for seeing how others adapted the palette, but the plain official-style screenshots should remain the primary reference.
