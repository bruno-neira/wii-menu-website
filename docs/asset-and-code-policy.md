# Asset and Code Policy

**Status:** Project policy. Applies to every implementation pass, human or agent.

## The rule

**Where it is not legal to copy directly: look at references, write our own spec, then build from our spec.**

The `context/` corpus is that spec layer. It is deliberately written as *measurements and derived values* — frame counts, durations, easing curves, coordinates, colors — rather than as copied assets or transcribed code. That is what makes it safe to build from.

The pipeline is one-directional:

```
reference material  →  context/*.md (our spec)  →  src/ (our implementation)
   (look at)              (write ourselves)          (build from spec)
```

Never skip the middle step for anything we don't own.

## What this means concretely

### Assets (art, audio, fonts)

- **Do not ship Nintendo's bytes.** No extracted textures, sound files, layout binaries, or the Rodin NTLG / Rodin Bokutoh / Shin Go typefaces — not in `src/`, `public/`, or anywhere the build outputs.
- **Do use them locally as reference.** Measuring a ripped texture to derive a color, a proportion, or a noise distribution is exactly the intended workflow. The measurement goes in `context/`; the file stays in `reference/`, which is git-ignored.
- **Redraw, don't extract.** Cursor, icons, wordmarks, and tile art should be authored by us (SVG/CSS) from measurements, not converted from Nintendo assets.
- **Fonts:** use a free substitute (see `context/technical-specs.md`) and self-host it. Do not serve a proprietary face.

### Code from other projects

- **Read for technique, not for transcription.** Understanding *how* another project solved a problem, and why, is legitimate and useful. Copying its components is not.
- **Check the license before reusing anything**, and note that a permissive license does not launder content the author had no right to grant. Several Wii recreations ship MIT-licensed repos containing ripped Nintendo assets; the license covers their code, not Nintendo's material.
- Known status of projects referenced in `context/tech-prior-art.md`:
  - `koopthekoopa/wii-ipl` — CC0 decompilation, **code only, no assets**. Safe to read and cite. This is why it has never been DMCA'd.
  - `booper1/Wii-UI` — study techniques; **serves proprietary OTFs**, do not copy assets.
  - `Fraulk/Wii-Menu` — **unlicensed**; reference only, no code reuse.

### Where the enforcement line actually falls

Empirically, from `context/tech-prior-art.md`: Nintendo's HeavenStudio DMCA removed `Sprites/` and `Sfx/` across 291 forks, while the CC0 `wii-ipl` decompilation has never been touched. The operative test is:

> **Does the repository contain Nintendo's bytes?**

Not "is this a Wii project," and not "did you look at Nintendo material." Looking, measuring, and documenting are fine. Redistributing is not.

## Practical checklist for an implementation pass

1. Is the value I need already in `context/`? Use it.
2. If not, derive it from reference material into `context/` first, with a citation and evidence tier.
3. Write the implementation from `context/`, not from the reference.
4. Nothing Nintendo-authored lands outside `reference/` (git-ignored).
5. If a shortcut would mean shipping someone else's bytes, it is not a shortcut — it is the thing this policy exists to prevent.

## Note for agents

Subagents doing research may download and inspect reference material. They must place it under `reference/` and report only derived measurements into `context/`. Research prompts on this project state this constraint explicitly; keep doing that.
