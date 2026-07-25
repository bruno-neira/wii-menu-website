# Wii Menu — Default/Built-in Channels Reference

Research reference for recreating the Nintendo Wii "Wii Menu" (System Menu) and its
built-in/first-party channels. Compiled from fan wikis (WiiBrew, Wiikipedia/Fandom,
StrategyWiki, MiiWiki), Wikipedia, and homebrew technical docs. Where a claim is not
independently sourced, it is flagged as **fan consensus** rather than confirmed fact.

---

## Grid layout & general Wii Menu structure

- The Wii Menu is organized into **4 pages**, each a **4-column × 3-row grid**, for a
  total of **48 channel slots**. [Wikipedia: Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu),
  corroborated by search snippets citing "48 Channel slots spanning four screens, with
  each screen having 12 Channel slots."
- Users page between the 4 screens using the **+ / − buttons** on the Wii Remote (also
  mappable to the D-pad).
- Channels/games can be freely rearranged into any of the 48 slots **except the Disc
  Channel**, which is permanently anchored to the top-left slot of page 1 and cannot be
  moved (without homebrew/hacking). [Wikipedia: Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu)
- To move a tile: hold **A+B** on the Wii Remote while pointing at a channel, drag it to
  an empty (or occupied, to swap) slot, and release. [How to Arrange Channels — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/~/how-to-arrange-channels-on-the-wii-menu-or-the-sd-card-menu)
- A separate, similarly-gridded **SD Card Menu** exists for channels/games copied to an
  SD card; it is reached via a dedicated "SD Card" slot/shortcut integrated into the main
  grid system in later System Menu versions.
- **Empty slots**: appear as plain, unlabeled placeholder tiles (no icon, no text) — the
  Spriters Resource archives them as a distinct "Empty Channel Spaces" sprite sheet
  separate from populated channel banners, confirming they render as a static blank/gray
  tile rather than any animated placeholder. [Empty Channel Spaces — Spriters Resource](https://www.spriters-resource.com/wii/wiimenu/asset/68562/)
  **Fan consensus / visual memory** (not independently text-sourced here): the blank
  tile is a flat medium-gray rounded-rectangle with a subtle inset bevel and no
  "+"/insert glyph rendered by default — the "+" affordance most people associate with
  empty slots is really just the cursor/hand pointer hovering, not printed on the tile
  itself. Treat this specific claim as **fan consensus, verify against screenshots**
  before pixel-matching.
- Each populated tile is a **channel "banner"**: a small (~128×96 px icon-resolution)
  animated 3D/2D scene rendered from `icon.bin`/`banner.bin` data — U8 archive containing
  `arc/`, `anim/` (`.brlan`), `blyt/` (`.brlyt`), and `timg/` (`.tpl` textures), LZ77/IMD5
  compressed. The same format (larger canvas) drives the full-screen banner shown when a
  channel is highlighted/selected. [Opening.bnr — WiiBrew](http://wiibrew.org/wiki/Opening.bnr), [Icon and Banner Specification PDF](https://pokeacer.xyz/wii/pdf/IconBanner_Specification.pdf)
- Selecting (single-click) a tile enlarges/highlights it and plays its ambient
  animation/sound preview; a second click/press of A launches the channel.

---

## 1. Disc Channel

- **Position**: permanently fixed to the **top-left slot of page 1** — the one tile that
  cannot be relocated. [Wikipedia: Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu)
- **Function**: launches Wii optical-disc games and (on GameCube-compatible models)
  GameCube discs inserted in the front-loading slot drive. [Wikipedia: Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu)
- **Tile appearance — no disc inserted**: shows a generic animated graphic of a Wii disc
  spinning/glinting (plus a GameCube disc graphic on GameCube-compatible hardware). Some
  fan sources describe a grey disc silhouette with a question mark when nothing is
  inserted. [Search summary of WiiBrew/Fandom/Nintendo Support Disc Channel pages]
- **Tile appearance — disc inserted**: swaps to a **per-game animated preview graphic**
  (the game's own banner/cover art with motion and sound) baked into the disc's own
  banner data; **GameCube discs**, lacking this Wii-specific banner data, fall back to
  showing only the generic GameCube logo. [Search summary of WiiBrew/Nintendo Support]
- **Sources**: [Disc Channel — WiiBrew](https://wiibrew.org/wiki/Disc_Channel), [Disc Channel Overview — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2543/~/disc-channel-overview)

---

## 2. Mii Channel

- **Pre-installed** at launch (one of the four original day-one channels, alongside
  Photo, Wii Shop). [Wiikipedia list search summary]
- **Function**: Nintendo's avatar ("Mii") creation and management tool. Users build
  custom caricature avatars (face shapes, hair, colors, accessories) from scratch or
  premade templates; Miis are then usable across compatible Wii software (Wii Sports,
  etc.). [Mii Channel — WiiBrew](https://wiibrew.org/wiki/Mii_Channel)
- **Storage**: up to ~10 Miis per Wii Remote, up to 100 Miis on the console itself; Miis
  can be beamed to other Wii consoles or later transferred to Nintendo 3DS.
  [Mii Channel — WiiBrew](https://wiibrew.org/wiki/Mii_Channel)
- **Mii Parade / WiiConnect24**: the console can exchange Miis with other Wiis over
  WiiConnect24, and unfamiliar Miis received this way (or newly created ones) can appear
  as background spectators in some games. [Mii Channel — WiiBrew](https://wiibrew.org/wiki/Mii_Channel)
- **Tile/interior quirk — "Mii Plaza"**: inside the channel, all your saved Miis stand in
  a white sandbox-like plaza. Left idle, Miis run ambient idle animations — falling
  asleep standing up (with "Z"s over their head) then jolting awake, sneezing, or pairing
  up to "talk" with speech bubbles. [Search summary of MiiWiki/Nintendo/Fandom Mii Channel & Mii Plaza pages]
  **Fan consensus**: the Wii Menu *tile itself* is commonly remembered as showing a
  small live/rendered peek of a couple of your Miis standing on the plaza floor (not
  merely a static logo), consistent with the "banner" tech being a rendered 3D scene —
  but no single source above explicitly confirms the outdoor-tile framing distinct from
  the in-channel plaza view; treat the tile-preview specifics as **fan consensus,
  verify against footage**.
- Officially unveiled September 2006. [Mii Channel — WiiBrew](https://wiibrew.org/wiki/Mii_Channel)

---

## 3. Photo Channel (and Photo Channel 1.1)

- **Pre-installed** at launch as **Photo Channel 1.0** (shipped with System Menu 1.0,
  Title ID `HAAA`). [Photo Channel — WiiBrew](https://wiibrew.org/wiki/Photo_Channel)
- **Function**: view, edit, and share digital photos loaded via SD card or received
  through the Wii Message Board; supports JPEG stills (up to 8192×8192), OpenDML
  MotionJPEG `.MOV`/`.AVI` video, and MP3/AAC/M4A audio playback as a slideshow
  soundtrack. Edited photos can be saved back to the console or mailed out via Wii Mail.
  [Photo Channel — WiiBrew](https://wiibrew.org/wiki/Photo_Channel)
- **Photo Channel 1.1**: released as a free, separate downloadable update/channel
  (its own Title ID) after System Menu update 3.1. Added the ability to use a custom SD
  photo as the channel's own Wii Menu icon, plus AAC audio support.
  [Photo Channel — WiiBrew](https://wiibrew.org/wiki/Photo_Channel); rollout timing
  corroborated by [Wiikipedia list search summary] ("Photo Channel 1.1 — December 10,
  2007").
- **Note**: a distinct v65280 build shipped on some 2007 retail game discs but was
  blocked from installing by the console's WAD-install safeguards.
  [Photo Channel — WiiBrew](https://wiibrew.org/wiki/Photo_Channel)
- **Tile appearance**: no textual description found in sourced pages beyond the presence
  of a dedicated icon graphic; **fan consensus** holds the default (pre-1.1) icon is a
  simple stylized camera/photo-stack graphic, swapped for a user's own SD photo once
  Photo Channel 1.1's custom-icon feature is used. Verify visually before implementing.

---

## 4. Wii Shop Channel

- **Pre-installed** at launch (one of the four original day-one channels).
  [Wiikipedia list search summary]
- **Function**: Nintendo's digital storefront — purchase and download Virtual Console
  games, WiiWare titles, and additional channels using "Wii Points" (bought via points
  cards or credit card). [Wii Shop Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Shop_Channel)
- **Download UX quirk**: while a purchase downloads, the channel displays an animated
  **8-bit Mario sprite collecting coins** as the progress indicator.
  [Wii Shop Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Shop_Channel)
- **Shutdown**: officially closed January 31, 2019; post-shutdown only the Wii U
  Transfer Tool and a Zelda: Skyward Sword save-data updater remained downloadable before
  final removal. [Wii Shop Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Shop_Channel)
- **Title ID**: `HABA` (standard), `HABK` (Korean Wii). [Wii Shop Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Shop_Channel)
- **Tile appearance**: sourced pages reference a thumbnail image file
  (`Wiishopchannel.jpg`) without textual description. **Fan consensus**: red/orange
  shopping-bag-and-Wii-remote motif on a red gradient background — verify against actual
  screenshots before pixel-matching.

---

## 5. Mii Contest Channel / Check Mii Out Channel

- **Regional naming**: called **Check Mii Out Channel** in North America, **Mii Contest
  Channel** in Europe/Oceania. [Search summary of MiiWiki/Wikipedia/rc24.xyz pages]
- **Function**: submit your own Miis to themed contests and browse/rate Miis submitted
  by other players worldwide, downloaded via WiiConnect24. [Search summary of MiiWiki/Wikipedia]
- **Release**: November 12, 2007 (per Wiikipedia list). [Wiikipedia list search summary]
- **Tile live-update quirk**: when a new contest update is available, the tile shows a
  **scrolling headline of the current contest plus an image above it**, similar in spirit
  to the News/Forecast channel live-tile behavior. [Search summary citing Spriters
  Resource / rc24.xyz Check Mii Out Channel pages]
- **Shutdown & revival**: went offline with WiiConnect24's June 28, 2013 shutdown; later
  restored by the fan-run WiiLink (formerly RiiConnect24) service.
  [Search summary of MiiWiki/RiiConnect24 pages]

---

## 6. Everybody Votes Channel

- **Function**: vote on one of two options for a wide range of user- and
  Nintendo-submitted questions, then compare your answer and your *prediction* of the
  popular answer against results from players worldwide (and, later, your own Mii
  Plaza/regional stats). [Everybody Votes Channel — WiiBrew](https://wiibrew.org/wiki/Everybody_Votes_Channel)
- **Release**: launched February 2007/13, distributed as a free download through the Wii
  Shop Channel. [Wiikipedia list search summary]; [Everybody Votes Channel — WiiBrew](https://wiibrew.org/wiki/Everybody_Votes_Channel)
- **Tile live-update quirk**: the Wii Menu thumbnail shows a **scrolling preview of the
  latest poll question and its two answer choices**, updating as new polls are published
  — directly analogous to the News Channel ticker. [Search summary citing Fandom/MiiWiki
  Everybody Votes Channel pages]
- **Technical**: Title ID `HAJx`; ~54 blocks channel storage + 2 blocks save data; polls
  delivered as small (1–5 KB) RSA-2048-SHA1-signed, LZ10-compressed files.
  [Everybody Votes Channel — WiiBrew](https://wiibrew.org/wiki/Everybody_Votes_Channel)
- **Shutdown & revival**: discontinued with the June 28, 2013 WiiConnect24 shutdown;
  revived by the WiiLink/RiiConnect24 community project.
  [Everybody Votes Channel — WiiBrew](https://wiibrew.org/wiki/Everybody_Votes_Channel)

---

## 7. Forecast Channel

- **Function**: downloads localized weather data via WiiConnect24 and presents it on an
  interactive rotating 3D globe (Wii Remote pointer to spin/zoom); selecting a region
  opens a detail view with current conditions, a 5-day forecast, and (region-dependent)
  UV index or Japan's "laundry index." Ambient background music changes between
  day/night tracks. [Forecast Channel — WiiBrew](https://wiibrew.org/wiki/Forecast_Channel)
- **Release**: first available December 19, 2006 (one day earlier than originally
  announced), added via system update rather than pre-installed at launch.
  [Forecast Channel — WiiBrew](https://wiibrew.org/wiki/Forecast_Channel)
- **Live-tile behavior (the defining quirk)**: starting with **System Menu 3.0 (August 6,
  2007 update)**, the Forecast Channel's Wii Menu tile itself displays a **live current-
  weather icon** for the user's selected "local" location — sun, clouds, rain, etc. — so
  the weather is visible without opening the channel. If the channel isn't opened
  periodically, the icon eventually disappears from disuse (though it tolerates a longer
  idle period than the News Channel's ticker before doing so).
  [Forecast Channel — WiiBrew](https://wiibrew.org/wiki/Forecast_Channel); [Search
  summary confirming "As of Wii Menu 3.0, the Forecast Channel displays the current
  conditions of the user's area on the Channel's Wii Menu icon."]
- **Regional icon art styles**: Japanese weather icons are more cartoonish/stylized;
  international (NOA-requested) icons are more photorealistic — NOA also requested the
  current conditions be shown on the console's startup/menu screen, which produced the
  live-tile feature. [Search summary of Wii Wiki/Nintendo Fandom Forecast Channel pages]
- **Technical**: Title ID `HAFA`/`HAFx`, version 0.7, RSA-2048-SHA1 signed / LZ10
  compressed data; unavailable in South Korea.
  [Forecast Channel — WiiBrew](https://wiibrew.org/wiki/Forecast_Channel)
- **Shutdown & revival**: official servers ended June 28, 2013; restored by
  RiiConnect24/WiiLink. [Forecast Channel — WiiBrew](https://wiibrew.org/wiki/Forecast_Channel)

---

## 8. News Channel

- **Function**: delivers world/regional news headlines and photos to the console via
  WiiConnect24, with clickable news images linking to full articles inside the channel.
  [News Channel — WiiBrew](https://wiibrew.org/wiki/News_Channel)
- **Release**: added via system update (per Wiikipedia list, January 26, 2007), not
  present at Wii launch. [Wiikipedia list search summary]
- **Live-tile behavior (the defining quirk)**: as of **System Menu 3.0 (August 6, 2007
  update)**, the News Channel tile on the Wii Menu shows **two scrolling headlines at
  once directly on the icon**; once the tile is selected/highlighted, it expands to show
  **three scrolling headlines**. [Search summary citing Wii Menu Fandom/HandWiki/TCRF
  News Channel details]
- **Disuse fallback**: if the channel isn't opened regularly, the ticker stops updating
  and the tile instead displays the message *"You must use the News Channel regularly
  for news to be displayed on this screen."* [Search summary citing RiiConnect24/TCRF
  News Channel pages]
- **Technical**: Title ID `HAGA`/`HAGx`, version 0.7, plain-HTTP delivery from Nintendo
  servers, RSA-2048-SHA1 signed / LZ10 compressed payloads.
  [News Channel — WiiBrew](https://wiibrew.org/wiki/News_Channel)
- **Shutdown & revival**: ended with WiiConnect24's June 28, 2013 shutdown; restored by
  RiiConnect24/WiiLink. [News Channel — WiiBrew](https://wiibrew.org/wiki/News_Channel)

---

## 9. Internet Channel (Opera browser)

- **Function**: a Wii Remote–pointer-driven build of the **Opera 9** web browser,
  co-developed by Opera Software and Nintendo, for general web browsing on the TV;
  supports a USB keyboard as an input option. Cannot download/upload files, and the
  on-screen text box for editing long-form text fields is cramped.
  [Internet Channel — WiiBrew](https://wiibrew.org/wiki/Internet_Channel)
- **Release/pricing timeline**: free trial from December 22, 2006; full paid version
  (500 Wii Points) from April 11, 2007; made permanently free September 1, 2009.
  [Internet Channel — WiiBrew](https://wiibrew.org/wiki/Internet_Channel)
- **2009 update**: bundled Flash upgraded from Flash 7 to **Flash Lite 3.1**.
  [Internet Channel — WiiBrew](https://wiibrew.org/wiki/Internet_Channel)
- **Technical**: Title ID `HADx`, version 4.0 (build 1024); ~203 blocks channel storage /
  37 blocks save data. [Internet Channel — WiiBrew](https://wiibrew.org/wiki/Internet_Channel)
- **Tile appearance**: sourced pages reference the standard Internet Channel branding
  thumbnail without further textual description; **fan consensus** — a globe/"e"-style
  icon on a blue gradient, consistent with Opera-era browser iconography. Verify visually.

---

## 10. Wii Message Board

- **Not technically a downloadable "channel"** with a Title ID in the same sense as the
  others, but it occupies a fixed tile on the Wii Menu grid and functions like one.
- **Position/appearance**: accessed via the icon in the **lower-right corner of the Wii
  Menu**, depicted as an **envelope**. [Search summary citing Nintendo UK Support "Accessing the Message Board" page]
- **Function**: inbox for three letter types — **Game Letters** (requested by/sent from
  games), **Channel Letters** (posted by channels, e.g. new-content notices), and
  **Notice Letters** (system notifications, e.g. new channel availability or important
  updates). Also supports composing/sending photo mail via the Photo Channel, and shows
  system update notifications. [Search summary citing Fandom Wii Message Board pages]
- **Message tile quirk**: individual letters inside the board are shown as white,
  rounded-rectangle icons with the message's opening line rendered on a blue strip, and
  the sender's Mii face (if applicable) shown in the icon's upper-left corner. [Search
  summary citing Fandom Wii Message Board pages]
- **Sources**: [Accessing the Message Board — Nintendo UK Support](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Message-Board/Accessing-the-Message-Board/Accessing-the-Message-Board-240088.html)

---

## 11. Wii Fit Channel

- **Not pre-installed by default** — only appears if the **Wii Fit** game disc has been
  run at least once; it installs itself onto the Wii Menu grid so users can access
  limited functionality without the disc inserted.
  [Wii Fit Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Fit_Channel)
- **Function without the disc**: view/change user profiles, run body tests, and view
  progress charts. **Requires the disc** for actual training activities, the trial mode,
  and changing settings. [Wii Fit Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Fit_Channel)
- **Peripherals**: Wii Remote + Wii Balance Board. Title ID `RFNx` (game channel type).
  [Wii Fit Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Fit_Channel)
- Marked a stub on WiiBrew — exact release date and detailed tile description not found
  in sourced material; treat visual specifics as unverified.

---

## 12. Nintendo Channel

- **Function**: watch game trailers, interviews, and commercials; download playable
  demos to a Nintendo DS via local wireless (functioning like a DS Download Station);
  browse game info pages with user ratings and a search feature; jump directly into the
  Wii Shop Channel to purchase featured titles. [Nintendo Channel — WiiBrew](https://wiibrew.org/wiki/Nintendo_Channel)
- **Release**: Japan November 27, 2007; North America May 7, 2008; Europe/Australia May
  30, 2008 — installed via the Wii Shop Channel, not pre-loaded.
  [Nintendo Channel — WiiBrew](https://wiibrew.org/wiki/Nintendo_Channel)
- **2009 redesign**: rolled out July–December 2009 by region; added a new interface,
  smaller file sizes, selectable video quality, game bookmarking, recommendation
  sharing, and play-history tracking. [Nintendo Channel — WiiBrew](https://wiibrew.org/wiki/Nintendo_Channel)
- **Technical**: Title ID `HATx`, "preview channel" type, version 3.1 (build 769); ~103
  blocks channel storage / 11 blocks save data; supports Wii Remote, USB keyboard, and
  Nintendo DS connectivity. [Nintendo Channel — WiiBrew](https://wiibrew.org/wiki/Nintendo_Channel)

---

## 13. Other first-party / default-experience-adjacent channels

- **Original four launch channels** (November 19, 2006 launch date, per general Wii
  history): **Disc Channel, Mii Channel, Photo Channel, Wii Shop Channel** — these are
  the only channels present on a Wii Menu screenshot taken before any system updates or
  Shop downloads. [Wiikipedia list search summary]; [Wikipedia: Wii Menu](https://en.wikipedia.org/wiki/Wii_Menu)
- **Forecast Channel** and **News Channel** followed as free system-update add-ons
  (December 2006 / January 2007) — commonly grouped with the original four as the "six
  primary channels" fans consider part of the core, non-optional Wii Menu experience,
  even though neither shipped day-one. [Wiikipedia list search summary]
- **WiiWare** (launched 2008) titles and **Virtual Console** games purchased from the
  Shop Channel install as ordinary tiles into the 48-slot grid, indistinguishable in
  placement/behavior from first-party channels — they simply use their own game-specific
  banner art and, for most, a static (non-animated) icon rather than a live-updating one.
  This is a **shop-driven customization layer**, not part of the "default" out-of-box
  grid, but relevant to recreating the general tile system faithfully.
- **SD Card Menu**: a secondary, same-format grid for channels/saves copied to an SD
  card, reached from a dedicated system icon; not a "channel" itself but shares the
  identical 4×3-page visual grid system. [How to Arrange Channels — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/~/how-to-arrange-channels-on-the-wii-menu-or-the-sd-card-menu)

---

## Summary table (fan-consensus defaults on a fresh, unpatched Wii)

| Slot | Channel | Present at launch? | Live tile content? |
|---|---|---|---|
| Page 1, top-left (fixed) | Disc Channel | Yes | Yes — swaps to inserted game's own banner art |
| Page 1 | Mii Channel | Yes | Rendered 3D Mii Plaza preview (fan consensus) |
| Page 1 | Photo Channel | Yes | Static icon; custom SD photo icon after v1.1 |
| Page 1 | Wii Shop Channel | Yes | Static icon |
| Page 1, bottom-right | Wii Message Board | Yes (system UI, not a Shop download) | Envelope icon; no live preview sourced |
| — | Forecast Channel | No (Dec 19, 2006 update) | Yes — live local-weather icon since SysMenu 3.0 |
| — | News Channel | No (Jan 26, 2007 update) | Yes — live 2-headline scroll since SysMenu 3.0 |
| — | Internet Channel | No (trial Dec 2006, full Apr 2007) | Static icon |
| — | Everybody Votes Channel | No (Feb 2007, Shop download) | Yes — scrolling current poll question |
| — | Check Mii Out / Mii Contest Channel | No (Nov 2007, Shop download) | Yes — scrolling contest headline + image |
| — | Nintendo Channel | No (Nov 2007 JP / May 2008 NA, Shop download) | Static icon |
| — | Wii Fit Channel | No (installs from Wii Fit disc) | Static icon |

Empty slots (all remaining positions across the 4 pages, 48 total) render as **plain,
unlabeled placeholder tiles** — confirmed to exist as a distinct visual asset separate
from populated banners, though the exact color/bevel styling should be checked against
reference screenshots rather than taken as certain from text sources alone.

---

## Gaps / things to verify visually before pixel-matching

- Exact default *positions* of Mii/Photo/Wii Shop Channel relative to each other on a
  factory-fresh page 1 (only the Disc Channel's top-left position is explicitly and
  consistently sourced; the other three's mutual ordering is inferred, not confirmed by
  a single authoritative source here).
- Precise color/iconography of the empty-slot placeholder tile (gray tone, corner
  radius, presence/absence of any "+"-like glyph) — flagged above as fan consensus only.
- Static tile artwork for Photo Channel (pre-1.1), Wii Shop Channel, Internet Channel,
  Nintendo Channel, and Wii Fit Channel — sourced pages reference thumbnail image files
  but provide no textual/descriptive detail; recommend sourcing actual screenshots or
  the Spriters Resource sprite sheets (several 403'd during this research pass and
  should be revisited, e.g. `spriters-resource.com/wii/wiimenu/`,
  `.../everybodyvoteschannel/`, `.../checkmiioutchannel/`).
- Wii Fit Channel's exact release date was not found in sourced material.
- Whether the Message Board tile shows any live badge/counter for unread letters on the
  Wii Menu grid itself (vs. only inside the board) was not confirmed.

---

## Sources consulted

- [Wii Menu — Wikipedia](https://en.wikipedia.org/wiki/Wii_Menu)
- [Wii/List of Wii Channels — Wiikipedia (Fandom)](https://wiikipedia.fandom.com/wiki/Wii/List_of_Wii_Channels)
- [Wii/Wii Channels — StrategyWiki](https://strategywiki.org/wiki/Wii/Wii_Channels)
- [Wii Menu — WiiBrew](https://wiibrew.org/wiki/Wii_Menu)
- [Disc Channel — WiiBrew](https://wiibrew.org/wiki/Disc_Channel)
- [Mii Channel — WiiBrew](https://wiibrew.org/wiki/Mii_Channel)
- [Photo Channel — WiiBrew](https://wiibrew.org/wiki/Photo_Channel)
- [Wii Shop Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Shop_Channel)
- [Everybody Votes Channel — WiiBrew](https://wiibrew.org/wiki/Everybody_Votes_Channel)
- [Forecast Channel — WiiBrew](https://wiibrew.org/wiki/Forecast_Channel)
- [News Channel — WiiBrew](https://wiibrew.org/wiki/News_Channel)
- [Internet Channel — WiiBrew](https://wiibrew.org/wiki/Internet_Channel)
- [Nintendo Channel — WiiBrew](https://wiibrew.org/wiki/Nintendo_Channel)
- [Wii Fit Channel — WiiBrew](https://wiibrew.org/wiki/Wii_Fit_Channel)
- [Check Mii Out Channel — MiiWiki](https://miiwiki.org/wiki/Check_Mii_Out_Channel)
- [Accessing the Message Board — Nintendo UK Support](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Message-Board/Accessing-the-Message-Board/Accessing-the-Message-Board-240088.html)
- [Disc Channel Overview — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2543/~/disc-channel-overview)
- [How to Arrange Channels on the Wii Menu or SD Card Menu — Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/1520/~/how-to-arrange-channels-on-the-wii-menu-or-the-sd-card-menu)
- [Opening.bnr — WiiBrew](http://wiibrew.org/wiki/Opening.bnr)
- [Icon and Banner Specification (PDF)](https://pokeacer.xyz/wii/pdf/IconBanner_Specification.pdf)
- [Empty Channel Spaces asset — Spriters Resource](https://www.spriters-resource.com/wii/wiimenu/asset/68562/)
- Wii Channel Menu — Nintendo Fandom, Wii Menu — Wii Wiki (Fandom), Wii Message Board —
  Nintendo Fandom, Mii Plaza — Nintendo Fandom, WaraWara Plaza — MiiWiki, Everybody Votes
  Channel — Wii Wiki/MiiWiki, Check Mii Out Channel — Wikipedia/TCRF/rc24.xyz — these
  Fandom/rc24 pages returned HTTP 402/403 to direct fetch during this research pass;
  content above attributed to them comes from WebSearch result snippets only and should
  be re-verified by a follow-up pass with direct access (e.g. a logged-in browser tool)
  if higher confidence is required.
