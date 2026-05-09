# YouTube Import Experiment

Korean detailed guide: [../youtube-import.md](../youtube-import.md)

This is an experiment path for source/import validation. It is not a core public product feature.

## Boundary

- Keep downloaded or imported third-party media out of the public repository.
- Use generated fixtures for repeatable tests.
- Do not attach imported videos to source-only releases.
- Verify license and redistribution rights before any external media is shared.

## Recommended Use

Use local imports to test pipeline behavior, then normalize the result into a generated fixture only if it can be safely shared.

## Public Check

`verify-public-repo-readiness` denies unallowlisted `video/imports/*` files.

```bash
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```
