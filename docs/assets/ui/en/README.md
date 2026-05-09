# English UI Screenshot Assets

This directory stores English-language product UI screenshots used by `README.en.md`.

Capture rule:

- Capture from the actual product UI with `mediaServerLanguage=en`.
- Do not edit Korean screenshots to fake English UI.
- Keep the same representative filenames as `docs/assets/ui/`.

Regenerate:

```bash
node scripts/internal/capture_docs_ui_assets.mjs --lang=en
```
