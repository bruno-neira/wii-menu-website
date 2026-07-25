# Wii System Menu — Version History Reference

Research notes for recreating the Wii Menu (System Menu) in React. Compiled from WiiBrew (the
most authoritative fan-technical source for exact version numbers/IOS/build dates), Nintendo's
own support archive, and secondary wikis. Where sources conflicted or were thin, it's flagged
under **Uncertain / gaps** at the bottom — verify before treating as ground truth.

> Naming note: Nintendo's official term is **"System Menu"**; "Wii Menu" is the informal/UI name
> for the same software (the channel-grid home screen). Both are used interchangeably below.

---

## 1. Version timeline table

Version numbers below are the human-readable ones shown in Wii Settings. The raw internal
integer build numbers (per-region) are included where found, since WiiBrew keys most of its
pages by them and it's useful if you ever want to cross-reference.

| Version | Release date | Region(s) / internal build # | Headline change(s) | Source |
|---|---|---|---|---|
| **1.0** (unlabeled — no version shown in Settings) | Nov 19, 2006 (console launch) | JPN 64 / USA 33 / PAL 34 | Launch state. Only Disc Channel, Mii Channel, Photo Channel were functional; Forecast/News/Shop Channel were placeholder "dummy" banners. **No channels could be moved/dragged** — grid was fixed. No update button existed in Settings. Channel launches were faster (no transition delay) than later versions. | [WiiBrew: 1.0](https://wiibrew.org/wiki/1.0) |
| **2.0** | ~Nov–Dec 2006 | JPN 128 / USA 97 / PAL 130 | First real update. Added SD Card read/write (save data), Country Settings, an in-menu System Update option, Parental Controls, and — importantly — **channels (except Disc Channel) became movable/draggable** by grabbing an icon and dropping it on another slot. | [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu), [Nintendo Support update history](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522) |
| **2.1** | Jan 10, 2007 | PAL 162 (region-specific fix) | Minor/regional patch. | [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |
| **2.2** | Apr 11, 2007 | JPN 192 / USA 193 / PAL 194 | Fixed specific ISP/router connectivity issues (Internet Channel / WiiConnect24 networking). | [Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522) |
| **3.0** | Aug 6, 2007 | JPN 224 / USA 225 / PAL 226 | Notable UI update: **Forecast/News Channel tiles gained dynamic live icons** (weather/headlines) driven by WiiConnect24 data instead of static art; **clock added to the menu**; Message Board button now **flashes when a new message arrives**; Wii Friend address book became reorderable; Virtual Console search improved. | [WiiBrew: 3.0](https://wiibrew.org/wiki/3.0), [Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522) |
| **3.1** | Oct 10, 2007 | JPN 256 / USA 257 / PAL 258 | USB keyboard text input support; Internet Channel URL editing; Wii Message Board favorites raised to 56; general speed/stability improvements. | [Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522) |
| **3.2** | Feb 25, 2008 | JPN 288 / USA 289 / PAL 290 | Disc Channel gained an update-available notification overlay; disc slot LED/glow now indicates new WiiConnect24 data was received mid-game; performance tuning. | [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |
| **3.3** | Jun 17, 2008 | JPN 352 / USA 353 / PAL 354 / **KOR 326 (first Korean release)** | Mii movement between Mii Plaza and Mii Parade; unauthorized/tampered save-file removal; first documented attempt at blocking the **Twilight Hack** exploit. | [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |
| **3.4** | Nov 17, 2008 | JPN 384 / USA 385 / PAL 386 | Enhanced Parental Controls; USB keyboard support added to Mii Channel; updated User Agreement. | [WiiBrew](https://wiibrew.org/wiki/System_Menu), [Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522) |
| **3.5** (Korea only) | Mar 3, 2009 | KOR 390 | Korea-specific parity patch (region ran its own numbering track). | [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |
| **4.0** | Mar 25, 2009 (built Mar 3, 2009) | JPN 416 / USA 417 / PAL 418 — IOS60 | **Major functional/UI update.** Added SDHC support (cards up to 32GB) and a brand-new **SD Card Menu** for launching Virtual Console/WiiWare/channel titles directly from an SD card (titles are copied to NAND at runtime, then removed — the Wii's hardware couldn't execute directly from SD). Wii Shop Channel could now download purchases straight to SD. Data Management menu overhauled for easier SD↔NAND transfers. Wii Speak Channel bumped to 2.0 (SDHC support), Photo Channel to 1.1b. Also patched the Twilight Hack and stubbed IOS16 (anti-piracy). Default system date changed from 1/1/2006 to 1/1/2009. | [WiiBrew: 4.0](https://wiibrew.org/wiki/System_Menu_4.0), [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |
| **4.1** | Jul 16, 2009 | JPN 448 / USA 449 / PAL 450 / KOR 454 | Billed as "behind the scenes" performance/stability improvements; further exploit hardening. | [Nintendo Support](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522) |
| **4.2** | Sep 28, 2009 | JPN 480 / USA 481 / PAL 482 / KOR 486 | Primarily a security patch — performance enhancements plus removal of unauthorized channels/homebrew; "intended solely to block hacking/piracy attempts." | [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |
| **4.3** | Jun 21, 2010 | JPN 512 (4.3J) / USA 513 (4.3U) / PAL 514 (4.3E) / KOR 518 (4.3K) — IOS80 | **Final System Menu version for standard retail Wii consoles.** Patched Bannerbomb v2, removed the Homebrew Channel/BootMii-as-IOS if present. All regional variants (4.3J/U/E/K) are the same version number with region-specific title IDs/IOS — not functionally different menus. | [WiiBrew: 4.3](https://wiibrew.org/wiki/4.3), [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu) |

### 4.3's quiet "re-releases" (2010–2014)

Nintendo never shipped a "4.4" — instead it kept pushing new binary builds while leaving the
displayed version number at **4.3**, purely to shut down newer homebrew entry points. Good to
know if a "final version" claim needs precision:

| Build | Date | What it did |
|---|---|---|
| 4.3 rev01 | Jun 21, 2010 | Deleted Homebrew Channel / DVDX title IDs; IOS80; freezes with Error 004 if Bannerbomb v2 detected |
| 4.3 rev02 | Jun 21, 2010 | Stubbed IOS70/IOS254 (removed older BootMii-as-IOS installs) |
| 4.3 rev03 | Sep 8, 2010 | Installed out-of-region IOS across all regions; tightened Shop Channel enforcement |
| 4.3 rev04 | Nov 6, 2012 | Added IOS62 in preparation for the Wii→Wii U Transfer Tool |
| 4.3 rev05J | Nov 26, 2013 (Japan only) | Added IOS59 |
| 4.3 rev06J | Feb 25, 2014 (Japan only) | Updated IOS59 |

Source: [WiiBrew: 4.3](https://wiibrew.org/wiki/4.3). Homebrew community responded across this
period with LetterBomb, Indiana Pwns, Smash Stack, and other entry points, but none of that is
relevant to the visual/UX recreation.

---

## 2. Multi-page grid / channel dragging — correcting a common assumption

This is worth stating plainly since it's easy to mis-attribute:

- **Channel dragging/rearranging was added in version 2.0** (late 2006), not 4.0. From 2.0
  onward, grabbing a channel icon (any channel except the fixed Disc Channel) and dropping it on
  another grid slot became core interaction. Version 1.0 had a static, non-rearrangeable layout.
- **Version 4.0 (March 2009) did not introduce the multi-page grid or dragging** — it introduced
  the **SD Card Menu** (a new, separate screen for launching titles off SD/SDHC storage) and the
  SDHC storage overhaul. It's plausible this is what's remembered as "the 4.0 menu update" since
  it was the most visible/newsworthy System Menu release of the Wii's life, but the multi-page
  grid itself was already established well before 4.0.
- The Wii Menu's steady-state layout (present from the mid-life era onward, and the one most
  people remember/screenshot) is **4 pages, each a 4×3 grid = up to 48 total channel slots**
  (some sources round to "47 movable slots" since the Disc Channel slot is fixed/non-empty).
  Paging between the 4 screens is done with the Wii Remote **+ / − buttons** or D-pad.
  Source: [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu).
> **ℹ️ ADDENDUM (2026-07-24):** For the 4.3 target this project is recreating, the grid
> size is no longer uncertain — it is compile-time constant:
> `MAX_CHANNEL_ROW 4` × `MAX_CHANNEL_COLUMN 3` = `MAX_CHANNEL_INDEX 12`,
> `MAX_CHANNEL_PAGE 4`, `MAX_CHANNEL_TOTAL 48`, and `mMaxPages` is assigned
> `MAX_CHANNEL_PAGE` unconditionally — **never recomputed from how many channels you own.**
> So all four pages and both arrows exist even on a console with six channels installed.
> Index order is **row-major, 4 per row** (`index = row × 4 + col`) — note the constant
> names are transposed relative to what you would expect. The current page **persists to
> NAND** across channel launches and reboots.
> The open question below (when the grid *grew* to this size) is untouched: the decomp is
> 4.3-only. Evidence tier: decomp.

- **Uncertain / gap:** WiiBrew doesn't give an exact version number for when the grid grew from
  its original (smaller, launch-era) channel count up to the full 4-page/48-slot layout — it's
  described as a fact of "the System Menu" generally rather than pinned to one release. Given how
  few channels existed at launch (essentially Disc, Mii, Photo + placeholders), it's likely the
  grid was under-populated at 1.0 rather than physically smaller, and pages filled in organically
  as WiiWare, Virtual Console, and downloadable channels arrived (2008 onward). Treat "4 pages of
  4×3" as the target layout for a recreation representing **mid-to-late-life Wii (2008–2010)**,
  which is almost certainly the version most people nostalgically remember.

---

## 3. SD Card Menu, Wii Points, Message Board, WiiConnect24

| Feature | Introduced / changed | Notes |
|---|---|---|
| SD Card save-data read/write | 2.0 (2006) | Card slot could store/restore save games. |
| **SD Card Menu** (launch titles from SD/SDHC) | **4.0 (Mar 2009)** | New dedicated screen; titles copied to NAND at runtime since Wii hardware couldn't execute off SD directly, then auto-deleted after use. Shop Channel could download straight to SD from this point. |
| Message Board flashing/notification | 3.0 (Aug 2007) | Board icon at bottom of screen flashes on new message; address book reordering added same version. |
| Message Board favorites capacity | 3.1 (Oct 2007) | Favorites list raised to 56 entries; B-button text scroll added. |
| WiiConnect24 live channel tiles (Forecast/News dynamic icons) | 3.0 (Aug 2007) | Before this, Forecast/News Channel tiles were static; from 3.0 they show live-updating art (weather icon, headline ticker) pulled via WiiConnect24 while in standby. |
| Disc-slot LED glow for new WiiConnect24 data | 3.2 (Feb 2008) | Ambient notification while playing a disc game. |
| Wii Points / Shop Channel balance | Ongoing (Shop Channel itself, version 1.0→) | Balance shown inside the **Wii Shop Channel**, not on the main menu grid. In 2011, Nintendo began transitioning purchases from "Wii Points" to direct regional currency / eShop Card balances (part of a broader Nintendo-wide points-to-currency shift); this was a Shop Channel change rather than a System Menu version bump. **Uncertain / gap:** no source found describing a *System-Menu-level* visual change tied to this (e.g., no evidence the main grid's UI changed) — safe to treat Wii Points display as purely a Shop Channel–internal concern, not part of the Menu chrome you're recreating. |
| WiiConnect24 shutdown | Jun 27, 2013 | Nintendo discontinued WiiConnect24 server-side services (Forecast, News, Everybody Votes, Check Mii Out/Mii Contest, Nintendo Channel). No accompanying System Menu update — channels remained installed but non-functional/showing connection errors. |

Sources: [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu), [WiiBrew: 4.0](https://wiibrew.org/wiki/System_Menu_4.0), [WiiBrew: 3.0](https://wiibrew.org/wiki/3.0), [Nintendo Support update history](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2522).

---

## 4. Visual / theme differences across versions

This is the weakest-documented area in fan-technical sources (WiiBrew is written for
hackers/modders, so it logs functional/security diffs far more than pixel-level UI changes).
Based on available evidence:

> **⚠️ SUPERSEDED (2026-07-24): the Wii Menu's background is NOT a blue gradient.**
> Direct pixel sampling of a real capture gives a **near-white neutral light grey**
> (`#E4E4E4`–`#EFEFEF`, and `#E6E6E6` in the grid gutters). Blue appears only as a
> **targeted accent** — the ~1 px cyan divider stroke on the bottom bar's top edge, the
> two round buttons' rings, and individual channel tiles' own artwork. The remembered
> "Wii blue" is the console's box/branding blue, not the Menu UI. Tiles are also
> **landscape rounded rectangles (16:11 / 20:11), not squares**. The *stability* claim in
> this bullet is unaffected and still correct.
> See `context/visual-design.md` §3. Evidence tier: pixel measurement.

- **The core visual identity (blue gradient background, white/silver rounded-square channel
  tiles, bottom status bar) appears to have stayed consistent for the Wii's whole life** — there
  is no documented "menu redesign" the way, say, the Wii U Menu or 3DS HOME Menu got overhauls.
  This is a genuine, stable design language from 2006 through 2013, which is good news for a
  recreation project: there isn't a "pick the right era's color scheme" problem.
- **New bottom-bar icons were added as new channels/services launched**, growing the bar over
  time rather than restyling it:
  - Health and Safety icon (bottom-left corner, opens the legal/safety screen) — present from
    very early on.
  - **Wii Speak Channel** icon — added when the Wii Speak accessory/channel launched
    (Wii Speak Channel 2.0 shipped alongside System Menu 4.0, March 2009), part of the
    grid rather than the bottom bar itself, but its update is bundled with the 4.0 release.
  - **Wii Shop Channel / SD Card Menu** icon — SD Card Menu access point added at 4.0.
  - Message Board icon — present pre-3.0 but gained the flashing/notification behavior at 3.0.

> **⚠️ SUPERSEDED (2026-07-24): there is no Health and Safety bottom-bar icon, and no Wii
> Speak one either.** The bottom bar of the Wii Menu is only ever **three** things:
> `B_Bbs` (Message Board), `B_Set` (the Wii button), and the SD Card icon — the latter as
> a separate scene bolted on in 4.0. The other named panes in the shared layout
> (`B_Ch`, `B_Cal`, `B_Add`, `B_CalExit`, `B_AddExit`, `B_Add_R`, `B_Dust`) belong to the
> **Message Board / Calendar / letter-writing screens**, which reuse the same layout file.
> Health & Safety is a **pre-Menu boot screen** (`it_Has_a.brlyt` in `health.ash`), not a
> bar item; Wii Speak surfaces as its own grid tile. Nintendo's manual diagram labels
> exactly six things on this screen — Current Time, Wii Settings and Data Management,
> SD Card Menu, Wii Channels, Current Date, Wii Message Board — and no others.
> The 3.0 flashing-notification attribution below is **correct**, and now has exact
> numbers (a silent 6667 ms count loop plus a 2667 ms jingle flourish repeating every
> 3000 ms), though those are verified for 4.3 and extrapolated backwards.
> See `context/decomp-findings.md` §8.1, `context/system-ui.md` §0,
> `context/components/mail-button.md` §4.2 and §8. Evidence tier: decomp + official.
  - **Uncertain / gap:** exact iconography for the No-Cartridge/Wii Options/Wii Settings icons
    and their pixel-level appearance per version wasn't confirmed from text sources — recommend
    cross-checking against archived screenshots/video (YouTube retrospectives, e.g. "Wii Menu
    Evolution" style videos) rather than relying on wiki text for exact art.
- **1.0 had a visibly sparser grid** (essentially 3 real channels + 2 dummy placeholders) simply
  because so few channels/services existed yet — this is a content difference, not a stylistic
  one, but it's the most visually distinct "version" if you wanted to depict launch-day
  authentically.
- **Regional theme differences:** no evidence found of Japan/US/EU/Korea using different color
  schemes or layouts — differences were channel *content* (e.g., Korea's Wii didn't get
  WiiConnect24-dependent channels at the same cadence) and legal/region text, not visual theming.

---

## 5. Final version and end-of-life

- **4.3** (June 21, 2010, with quiet non-numbered rebuilds through Feb 2014 — see table above) is
  the **last System Menu version for retail Wii consoles.** No System Menu version bump ever
  shipped a visible "services are shutting down" notice baked into the menu chrome itself —
  shutdowns were communicated via in-channel messaging (e.g., a notice inside the Shop Channel or
  WiiConnect24-dependent channels) and Nintendo support pages, not a System Menu UI change.
- Timeline of service shutdowns (post-dates the last menu update, so **not reflected in any menu
  version**):
  - **WiiConnect24** discontinued **June 27, 2013** (Forecast, News, Everybody Votes, Check Mii
    Out, Nintendo Channel services affected).
  - **Wii Shop Channel** discontinued **January 30, 2019** (purchases, downloads, points balance
    all ended; channel remained installed but non-functional).
- **Wii Mini** (2012 budget revision, no WiiConnect24/online/GameCube support by design) and
  **vWii** (the Wii-compatibility mode inside Wii U, 2012+) both report **"4.3"** as their System
  Menu version, but are not identical binaries to retail Wii's 4.3:
  - vWii's 4.3 is a distinct ancast-signed image; it patches Letterbomb, and its "Wii Options"
    button skips System Settings entirely (routes straight to Data Management) because system
    settings moved to the Wii U Menu. WiiConnect24 is entirely non-functional on vWii since the
    Wii U doesn't run the underlying background service. Source:
    [WiiBrew: VWii](https://wiibrew.org/wiki/VWii).
  - This means "version 4.3" is not a single fixed artifact — treat retail Wii 4.3 (2010) as the
    canonical target, not vWii's variant.

---

## 6. Regional variants (brief)

| Region | Notes |
|---|---|
| Japan (JPN) | Generally led version releases by the same date as USA/PAL from 3.0 onward (simultaneous global rollout became standard practice). Got extra late-life rebuilds in 2013–2014 (4.3rev05J/06J) not pushed elsewhere. |
| USA | Standard "U" suffix builds (e.g. 4.3U); Nintendo's own official update-history page is USA-centric and was used as a primary source above. |
| Europe/PAL | "E" suffix builds (e.g. 4.3E); had at least one PAL-only early patch (2.1, Jan 2007) not shared with other regions. |
| Korea (KOR) | Joined later — first Korean System Menu release was **3.3 (as 3.3, June 2008)**, and Korea ran a partially independent numbering track for a while (e.g., 3.5 Korea-only patch, March 2009, with no 3.5 in other regions). Suffixed "K" builds from 4.1 onward (4.1K, 4.2K, 4.3K). |

No evidence of Japan/US/EU/Korea using different **visual** themes — differences are
release-timing, channel content, and legal/text localization only.

Source: [WiiBrew: System Menu](https://wiibrew.org/wiki/System_Menu), [WiiBrew: 4.3](https://wiibrew.org/wiki/4.3).

---

## 7. Recommended reference target for the recreation

**System Menu 4.x, most representative around the 4.0–4.3 era (2009–2010), is the best target.**
Reasoning:

1. It's the **final and most feature-complete state** of the menu (SD Card Menu present, full
   channel ecosystem — WiiWare, Virtual Console, Wii Speak, Wii Shop, Netflix/Internet
   Channel-era additions — all live).
   Version-locking to exactly "4.3" is defensible since it's literally the last version and the
   one most former-owners' consoles were sitting on when they stopped actively using them.
2. Visually there's **no reason to pick an earlier version for "authenticity"** — since the core
   look didn't change across the console's life, targeting the late-life full-featured state
   maximizes how much content/detail you can accurately depict (full grid of real channel icons,
   working paging, SD Card Menu, Message Board flashing state, WiiConnect24 live tiles) without
   sacrificing anything a purist would expect from "the Wii Menu" as most commonly remembered.
3. If you want to depict **launch-era** for historical flavor (e.g., an easter-egg "1.0 mode"),
   that's a legitimate secondary target given how documented and distinct it is (sparse grid,
   dummy channels, no drag, faster launch transitions) — but it should be secondary, not primary.

---

## Uncertain / gaps summary (for follow-up if higher precision is needed)

- Exact version at which the grid grew to its "full" 4-page/48-slot size — not pinned to a
  specific release; inferred to be a gradual/organic expansion through 2007–2009 as content grew.
- Pixel-level icon/typography changes version-to-version — text sources don't cover this;
  recommend a supplementary pass through archived screenshots or a video retrospective
  (search "Wii Menu evolution" / "System Menu versions" on YouTube) if pixel accuracy per-version
  matters.
- Whether the Wii Points balance had any on-grid (not just in-Shop-Channel) representation at any
  point — no evidence found; treated as Shop-Channel-internal only.
- The primary Wikipedia article ("Wii system software") did not yield a clean structured version
  table via automated fetch during this research pass (returned as sparse/unavailable) — WiiBrew
  and Nintendo's own support archive were used as primary sources instead and are considered more
  authoritative for exact version numbers regardless.
