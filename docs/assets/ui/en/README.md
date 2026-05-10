# English UI Screenshot Assets

This directory stores English-language product UI screenshots used by `README.en.md`.

Capture rule:

- Capture from the actual product UI with `mediaServerLanguage=en`.
- Do not edit Korean screenshots to fake English UI.
- Keep the same representative filenames as `docs/assets/ui/`.
- Before updating README English screenshots, review visible text for v1.1.0
  live-only wording. Non-goal terms such as VMS, NVR, long-term recording,
  playback/search, and Profile G must appear only as explicit non-goals or
  short event evidence/debug context.
- Do not use screenshots where Client UI exposes source URLs, ONVIF endpoints,
  raw diagnostic JSON, or rule/profile editors.

Regenerate:

```bash
node scripts/internal/capture_docs_ui_assets.mjs --lang=en
```
