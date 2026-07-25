# Wii Menu — Bottom Bar & Surrounding System UI Reference

Research notes for recreating the Wii Menu (System Menu) chrome: the bottom bar, top-left clock, Message Board,
SD Card Menu, Wii Options, and the Health and Safety boot screen. Compiled from Nintendo's own support pages,
the official printed Wii Operations Manual, WiiBrew, and community sources. Every claim below is tagged:

- **[Sourced]** — backed by an official Nintendo document/support page or WiiBrew (a technically authoritative
  fan-run wiki used by the homebrew community).
- **[Fan consensus]** — repeated across fan wikis/forums but not tied to a single primary source I could verify.
- **[Unclear/Conflicting]** — sources disagree or coverage was too thin to be confident; flagged explicitly so
  the implementation can make a deliberate choice rather than accidentally asserting a myth as fact.

---

## 0. Important correction to the assumed bottom-bar inventory

Before the per-item breakdown: the brief for this doc assumed the bottom bar contains a Wii Remote sync icon,
a Wii Speak icon, separate "SD Card slot" and "Disc slot" indicator icons, and a gear/Health-and-Safety icon.
Research does **not** support that inventory. What's actually documented **[Sourced]**:

- The bottom bar of the main Wii Menu (Channel grid) has historically been described as containing only
  **two or three interactive elements**: the **Wii button** (bottom-left, opens Wii Options), the
  **Message Board** icon, and — from System Menu 4.0 onward — the **SD Card Menu** icon next to the Wii button.
  [Nintendo World Report: SD Card Menu walkthrough](http://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough),
  [Nintendo UK — Wii Menu](https://www.nintendo.com/en-gb/Wii/Wii-Channels/Wii-Menu/Wii-Menu-749371.html)
- The **Disc Channel** is not a bottom-bar icon at all — it is a fixed tile in the **top-left of the channel
  grid itself** (page 1, slot 1), not part of the bottom chrome. It shows a spinning disc animation while
  identifying inserted media and a "no disc" graphic when the drive is empty.
  [Nintendo UK — Wii Menu](https://www.nintendo.com/en-gb/Wii/Wii-Channels/Wii-Menu/Wii-Menu-749371.html)
- There is **no evidence** of an on-screen Wii Remote sync/speaker icon, or a Wii Speak status icon, living in
  the bottom bar. Wii Speak instead adds its own **channel tile** to the grid; any connection status is shown
  via an LED on the physical peripheral, not the menu chrome. **[Fan consensus / gap]** — I could not find a
  primary source either confirming or ruling out a small Wii Speak glyph; treat any such icon as invented if
  used and note it as decorative license, not documented fact.
- There is **no evidence** of Wii Points balance being shown anywhere on the main Wii Menu. Wii Points balance
  and purchasing are entirely inside the **Wii Shop Channel**, which is itself just a grid tile like any other
  channel. **[Sourced, by omission]** — multiple searches turned up Wii Points UI only in Shop Channel context,
  never Wii Menu top-right. Treat "Wii Points in the corner of the Wii Menu" as a myth to avoid recreating.

**Recommendation for the clone:** model the bottom bar as **Wii button (bottom-left) → Message Board icon →
SD Card Menu icon (bottom-left cluster, appearing once storage/firmware conditions are met)**, and keep the
Disc Channel as a grid tile, not bottom-bar chrome. This matches sourced material far better than the
speaker/Wii-Speak/points-balance assumption.

---

## 1. Bottom bar inventory (left to right)

| Element | Position | Behavior | Confidence |
|---|---|---|---|
| **Wii button** (stylized "Wii" logo/button, not a generic gear icon) | Bottom-left corner | Opens the **Wii Options** screen (Data Management / Wii Settings). Manual instruction: "select the Wii icon on the bottom left of the Wii Menu screen." | **[Sourced]** — official Wii Operations Manual, via [Yumpu transcription](https://www.yumpu.com/en/document/view/364031/wii-operations-manual); confirmed independently by [Nintendo UK support](https://www.nintendo.com/en-gb/Support/Legacy-system/Accessing-the-Wii-Menu-and-System-Settings-242881.html): "Locate the 'Wii' button positioned in the bottom-left corner of the screen." |
| **Message Board icon** (envelope/letter graphic) | Bottom-right corner of the Channel Menu | Opens the **Wii Message Board**. Flashes/blinks when a new message has arrived. | **[Sourced]** — Operations Manual: "will blink when you have received a message"; corroborated by fan-wiki summary that "The Wii Message Board button will now flash when a message arrives" (System Menu 3.0 changelog) via [WiiBrew System Menu](https://wiibrew.org/wiki/System_Menu). |
| **SD Card Menu icon** | Bottom-left, next to the Wii button | Opens a separate full-screen **SD Card Menu** listing channels/games stored on the SD card. Introduced in **System Menu 4.0** (2009). | **[Sourced]** — [WiiBrew System Menu](https://wiibrew.org/wiki/System_Menu) changelog ("SD launching" in 4.0); position confirmed by [Nintendo World Report](http://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough): "appears as an icon in the bottom-left corner of the Wii Menu after applying the latest firmware update." |
| ~~Wii Remote sync/speaker icon~~ | — | Not documented as menu chrome. Wii Remote sync uses a physical **SYNC button** inside the battery cover of both console and remote — not a screen icon. | **[Fan consensus / likely myth]** |
| ~~Wii Speak status icon~~ | — | Not documented as bottom-bar chrome; Wii Speak instead surfaces as its own channel tile. | **[Fan consensus / gap]** |
| ~~Wii Points balance~~ | — | Not shown on the Wii Menu; lives only inside the Wii Shop Channel. | **[Sourced, by omission]** |

Additional bottom-chrome behavior:

- Selecting the **Wii button** or the **SD Card Menu** icon changes the background from white to **black**
  while that overlay/menu is active — a visual "mode switch" cue. **[Sourced]** — repeated across search
  summaries citing the SD Card Menu walkthrough and Wii Channel Menu fan-wiki content; treat the black
  background as a strong pattern but the fan-wiki page itself (`nintendo.fandom.com/wiki/Wii_Channel_Menu`)
  could not be directly fetched (HTTP 402 during this research pass) — flagged as **[Fan consensus, page
  itself unverified]**.

---

## 2. Top bar: clock and Wii Points

- **Clock/date**: every page of the 4-page, 4×3 channel grid displays the **current time and date** in the
  top-left corner. **[Sourced]** — [WiiBrew System Menu](https://wiibrew.org/wiki/System_Menu) and multiple
  encyclopedic summaries: "four pages, each with a 4:3 grid, and each displaying the current time and date."
- **Time format**: **[Unclear/Conflicting]**. Official Nintendo support copy for at least one region states
  the Wii "uses a 24-hour clock" with no AM/PM (1:00 pm shown as 13:00) — see
  [Nintendo Support — Time settings](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2861/~/time-settings-on-the-system-are-incorrect)
  paraphrase found via search. However, community discussion (GBAtemp) references a **12-hour AM/PM format**
  being present/introduced via system update on some regions/versions. It's likely this is a **region-based
  setting** (many PAL/European consoles default to 24-hour "military" time while NTSC-U consoles commonly show
  12-hour AM/PM) rather than a single universal format, and it may also be **user-configurable** under Wii
  Settings → Calendar since a date/time-set flow exists. **Recommendation:** implement both formats behind a
  region/setting toggle rather than hard-coding one, since evidence supports the format not being universal.
- **Wii Points / Shop Channel balance in the top-right**: **not supported by any source found.** No sourced
  or fan material places a persistent points/currency readout on the Wii Menu itself. This appears to be a
  conflation with the **Wii Shop Channel's own screen**, which does show a points balance within its own UI.
  Do not add a top-right points display to the main Wii Menu clone; if a "Shop balance" display is wanted for
  flavor, it belongs inside a Shop Channel-style page, not the system menu chrome.

---

## 3. Message Board ("envelope" panel)

- **Access**: click/point at the envelope icon in the bottom-right of the Channel Menu.
  **[Sourced]** — Operations Manual (via Yumpu transcription).
- **Open animation**: fan-wiki and WiiBrew material consistently describe the Message Board as
  "drawn under the Wii Menu" — i.e., it exists as a layer beneath the channel grid that becomes visible when
  triggered, consistent with the commonly-described **flip/fold-up "folder" transition** where the channel
  grid appears to lift/flip away to reveal the board underneath.
  **[Fan consensus]** — [WiiBrew Wii Message Board](https://wiibrew.org/wiki/Wii_Message_Board) (found via
  search summary: "The Wii Message Board is drawn under the Wii Menu and contains a calendar and a bulletin
  board for letters and notes.") The specific "flips up like a folder" visual language is well-known from
  screen-capture videos and widely repeated in fan descriptions, but I did not find a primary text source
  describing the animation itself frame-by-frame — treat the exact flip mechanics as **[Fan consensus]**,
  not officially documented.
- **Contents**:
  - A **calendar strip** across the top for picking a day.
  - A **bulletin-board list of messages/letters**, including system-generated notes and messages received via
    **WiiConnect24** from friends, other consoles, or Nintendo. **[Sourced]** —
    [HandWiki Wii Menu](https://handwiki.org/wiki/Wii_Menu): "calendar-based message board allowing users to
    exchange messages, pictures, and Mii attachments," using WiiConnect24 "to trade messages and pictures with
    other Wii owners, conventional email accounts... and mobile phones (through text messages)."
  - **"Today's Accomplishments"**: an automatically generated entry logging which games/channels were played
    and for how long that day. Notably **cannot be deleted or hidden** without a full system-memory format.
    **[Sourced]** — HandWiki, same article.
  - Messages with photo attachments show a **photo icon** on the message entry; message text can be scrolled
    with the **B button** (added in System Menu 3.0). **[Sourced]** — Yumpu Operations Manual transcription;
    WiiBrew System Menu changelog.
  - WiiConnect24-delivered mail (the online component) stopped functioning after Nintendo shut down
    WiiConnect24 on **June 27, 2013** — relevant only as a historical/inactive-service note, not a UI detail.
    **[Sourced]** — HandWiki.
- **Notable exploit history (flavor/trivia, not UI)**: the Message Board was the entry point for the
  **LetterBomb** homebrew exploit, which used a crafted "letter" opened from an SD card to run unsigned code.
  **[Sourced]** — [WiiBrew LetterBomb](https://wiibrew.org/wiki/LetterBomb).

---

## 4. SD Card Menu

- **Access**: bottom-left SD Card icon (next to the Wii button), available from **System Menu 4.0** onward
  when an SD card is inserted. **[Sourced]** — WiiBrew System Menu changelog; Nintendo World Report walkthrough.
- **Layout**: a separate full-screen grid, visually similar to the main Channel Menu but scoped to SD-card
  content. Reported capacity: **20 pages, 12 slots per page** — deliberately larger than the main menu's 4
  pages × 12 slots (48 total) since it's meant to hold overflow content.
  **[Fan consensus, moderately strong]** — sourced to a Nintendo World Report walkthrough summary
  ([link](http://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough)); treat exact page
  count as fan-reported rather than an official spec sheet, though NWR is a credible outlet with hands-on
  testing.
- **Contents**: Virtual Console games, WiiWare titles, and Wii Channels that have been moved to the SD card
  via Data Management. **[Sourced]** — HandWiki: version 4.0 let users "run Virtual Console games, WiiWare
  games, and Wii Channels directly from the SD card," with an "Automanager" that freed internal memory
  automatically as needed.
- **Launch behavior**: content isn't run directly off the card — the system copies ("phantom copies") the
  title into internal memory at launch time and clears it afterward, which is why unsigned/homebrew content
  generally can't be launched this way. **[Sourced]** — WiiBrew System Menu ("titles cannot be directly
  launched from the SD card... Nintendo's workaround involved copying channels to internal storage at
  runtime"); Nintendo World Report ("a progress bar shows players how long it will take before the game is
  ready to play").
- **Background color**: switches to **black** while the SD Card Menu is active, distinguishing it from the
  white main Channel Menu background. **[Fan consensus]**, same caveat as in Section 1 (source page returned
  HTTP 402 during this pass and could not be directly verified).

---

## 5. Wii Options / Wii Settings / Data Management

Reached via the **Wii button** in the bottom-left of the Channel Menu. **[Sourced]** structure, per the
official Wii Operations Manual (Yumpu transcription) and Nintendo UK support pages:

- **Wii Options** (top-level screen) branches into at least:
  - **Data Management** — organize/delete data across:
    - Wii System Memory (shows free space as "Blocks Open")
    - SD Cards (back up saves/Message Board data)
    - Nintendo GameCube Memory Cards (Slot A / Slot B)
    - Channels (per-channel data management)
    [Nintendo UK — Data Management](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Data-Management/Data-Management-242887.html)
  - **Wii Settings** — general console configuration, at minimum covering:
    - Console Nickname
    - Calendar (date/time)
    - Screen
    - Sound
    - Parental Controls
    - Sensor Bar
    - Internet
    - WiiConnect24
    - Language
    - Country
    - Wii System Update
    - Format Wii System Memory
    (Official Wii Operations Manual, via [Yumpu](https://www.yumpu.com/en/document/view/364031/wii-operations-manual).
    Note the manual actually splits these across two "Wii Settings" pages in the real UI — this list is the
    combined top-level set of categories, not necessarily a single unbroken page.)
- A shortcut into the **Wii Shop Channel** is also commonly reachable from the Wii Options area.
  **[Fan consensus]** — referenced in passing by search summaries but not confirmed against a primary source
  in this pass; treat as likely-but-unverified.

This doc intentionally does **not** enumerate every individual setting under Screen/Sound/Parental
Controls/etc. per the task's scope (top-level structure only).

---

## 6. Health and Safety screen

- **When shown**: every time the console boots, **before** the Wii Menu loads — a mandatory gate screen.
  **[Sourced/well-established]** — near-universally confirmed across support threads and video capture;
  see [AVID — Nintendo/Warning Screen](https://www.avid.wiki/Nintendo/Warning_Screen) (fan-run
  audiovisual-identity database specializing in exactly this kind of boot bumper) and multiple Nintendo
  support/troubleshooting threads referencing it as a fixed, un-skippable stage.
- **Appearance**: black background, white text. **[Fan consensus / widely observed]**, consistent with the
  task's own framing and every screen-capture/video reference found; I did not locate an official Nintendo
  document that specifies exact hex colors (unsurprising — that's implementation detail Nintendo wouldn't
  publish), so treat "pure black background, white text" as the strong visual consensus rather than a spec.
- **Text content**: varies slightly by SKU/region but the substance is consistent:
  - Heads with something like **"Important Safety Information"** framing (search-summarized paraphrase — not
    a verified verbatim quote for the on-screen boot text specifically, since the AVID page could not be
    directly fetched — HTTP 403 during this pass).
  - References the printed **Health and Safety Precautions booklet** (or, in some regional variants, the
    "Operations Manual"), directing users to read it before setup/use, and notes where to get an extra copy
    online.
  - Ends with a **"Press A to continue"** (some regional variants: "Press any button to continue").
  **[Fan consensus, page unverified this pass]** — this phrasing breakdown came from a search-engine summary
  of the AVID Warning Screen page rather than a direct fetch (blocked). Recommend a follow-up direct check of
  <https://www.avid.wiki/Nintendo/Warning_Screen> or a YouTube capture (e.g.
  ["Nintendo Wii Startup Sound - Warning - Health and Safety (2006)"](https://www.youtube.com/watch?v=eE3UBzOK5oQ))
  before finalizing exact on-screen copy.
- **Sound**: a distinctive **rising, laser-like electronic sweep/chime** plays as the screen transitions in
  (and/or when advancing past it with A). Widely described in fan sources as a "laser-like sound."
  **[Fan consensus]**.
- **Interaction**: press **A** (or, per regional manual language, "any button") to dismiss and proceed to the
  Wii Menu. **[Fan consensus, strongly corroborated]** across support-forum troubleshooting threads describing
  normal vs. stuck ("frozen at Health and Safety screen") behavior — e.g.
  [GBAtemp — Wii stuck at Health and Safety screen](https://gbatemp.net/threads/wii-stuck-at-health-and-safety-screen.159988/).

---

## 7. Regional / version differences

- **SD Card Menu**: did not exist before **System Menu 4.0** (2009); earlier system menu versions lack the
  bottom-bar SD icon entirely. **[Sourced]** — WiiBrew System Menu changelog.
- **Message Board blink-on-new-message + B-button scroll**: added in **System Menu 3.0**. **[Sourced]** —
  WiiBrew System Menu.
- **Korea**: received its first System Menu (3.3) notably later, in 2008, reflecting staggered regional
  console launches. **[Sourced]** — WiiBrew System Menu changelog summary.
- **PAL video fix**: System Menu 2.1 shipped a PAL-specific video correction, implying at least minor
  region-specific rendering differences existed historically. **[Sourced]** — WiiBrew System Menu.
- **Clock format (12h vs 24h)**: likely differs by region/default locale (see Section 2) — **[Unclear]**,
  flagged for a settings-driven implementation rather than one hard-coded format.
- **Wii Speak / Wii Points conditional UI**: the task's premise that these appear conditionally in the bottom
  bar is **not supported** by sourced material (see Section 0). If regional/peripheral conditionality is
  wanted for flavor, the more defensible sourced pattern is: **SD Card Menu icon appears only when the
  console has System Menu 4.0+ and (per some fan accounts) an SD card inserted**; Wii Speak and Shop
  Points do not have bottom-bar presence to gate at all.

---

## 8. Framing device: is the Wii Menu shown "on a TV"?

- The real Wii Menu, as experienced on actual hardware, is **not** framed with an in-UI television bezel —
  it renders as a plain full-screen interface (white background, 4×3 icon grid, bottom bar) meant to fill
  whatever display it's connected to. There is no chrome simulating "you are looking at a TV" from within the
  system software itself.
- However, **Nintendo's own marketing and box art** frequently depicted the Wii Menu appearing on a TV
  illustration/photo as a presentation device (i.e., screenshots composited into a TV mockup for print/web),
  which is likely the source of the "TV bezel" framing intuition. This is a **marketing/presentation
  convention**, not a feature of the menu software itself.
  **[Fan consensus + inference]** — I did not find a source explicitly stating "the Wii Menu has no TV bezel,"
  since this is essentially a negative claim (absence of a feature); it's inferred from the consistent
  description of the Wii Menu across every source as a full-bleed grid/UI with no mention of any surrounding
  simulated hardware frame.
- **Recommendation for the web clone**: if a "TV framing" concept is desired for portfolio/presentation flair
  (e.g., displaying the whole app inside a stylized television/monitor graphic as a container), treat that as
  an intentional creative addition/homage to Nintendo's own marketing style — not a recreation of the actual
  system menu's own internal UI, which fills the screen edge-to-edge with no bezel.

---

## Gaps and follow-ups

1. **Exact bottom-bar icon artwork/order** could not be pinned to a single authoritative diagram — all
   evidence is textual (manuals, support pages) rather than an annotated screenshot. A direct frame-by-frame
   look at a System Menu 4.3 boot video (e.g. via the [Internet Archive Wii Menu 1.0 WAD](https://archive.org/details/wiimenu1.0U)
   or a longplay/teardown video) is recommended before pixel-matching icon shapes.
2. **Message Board flip/fold animation** — direction of "fandom.com" wiki pages returned HTTP 402
   (paywalled/blocked) during this research pass; a browser-based re-check of
   `nintendo.fandom.com/wiki/Wii_Message_Board` and `wii.fandom.com/wiki/Wii_Menu` would likely add detail.
3. **Health and Safety screen verbatim text** — summarized via search snippet, not a direct fetch (AVID page
   returned 403). Recommend pulling exact copy from a video capture before finalizing in-app text.
4. **Clock 12h/24h default per region** — genuinely conflicting signals; a direct look at archived
   NTSC-U vs PAL boot screenshots would resolve this definitively.
5. **Wii Speak bottom-bar icon** — no evidence found either way; recommend treating its absence from the
   bottom bar as correct unless a primary source surfaces.

---

## Source list

- [WiiBrew — System Menu](https://wiibrew.org/wiki/System_Menu)
- [WiiBrew — System Menu 3.1](https://wiibrew.org/wiki/System_Menu_3.1)
- [WiiBrew — Wii Message Board](https://wiibrew.org/wiki/Wii_Message_Board) (via search summary)
- [WiiBrew — LetterBomb](https://www.wiibrew.org/wiki/LetterBomb)
- [Nintendo UK — Wii Menu](https://www.nintendo.com/en-gb/Wii/Wii-Channels/Wii-Menu/Wii-Menu-749371.html)
- [Nintendo UK — Accessing the Wii Menu and System Settings](https://www.nintendo.com/en-gb/Support/Legacy-system/Accessing-the-Wii-Menu-and-System-Settings-242881.html)
- [Nintendo UK — Wii Menus and System Settings](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Wii-Menus-and-System-Settings/Wii-Menus-and-System-Settings-242875.html)
- [Nintendo UK — Data Management](https://www.nintendo.com/en-gb/Support/Wii/Usage/Wii-Menus/Data-Management/Data-Management-242887.html)
- [Official Wii Operations Manual — Channels and Settings (via Yumpu)](https://www.yumpu.com/en/document/view/364031/wii-operations-manual)
- [Nintendo World Report — The Wii SD Card Menu: A Walkthrough](http://www.nintendoworldreport.com/news/18036/the-wii-sd-card-menu-a-walkthrough)
- [HandWiki — Wii Menu](https://handwiki.org/wiki/Wii_Menu)
- [AVID — Nintendo/Warning Screen](https://www.avid.wiki/Nintendo/Warning_Screen) (indirect, via search summary)
- [GBAtemp — Wii stuck at Health and Safety screen](https://gbatemp.net/threads/wii-stuck-at-health-and-safety-screen.159988/)
- [GBAtemp — Time on Wii menu](https://gbatemp.net/threads/time-on-wii-menu.133294/)
- [Nintendo Support — Time settings are incorrect](https://en-americas-support.nintendo.com/app/answers/detail/a_id/2861/~/time-settings-on-the-system-are-incorrect)
- [Internet Archive — Wii Menu 1.0 WAD (NTSC-U)](https://archive.org/details/wiimenu1.0U)
- [YouTube — Nintendo Wii Startup Sound: Warning / Health and Safety (2006)](https://www.youtube.com/watch?v=eE3UBzOK5oQ)
