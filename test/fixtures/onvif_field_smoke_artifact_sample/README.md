# ONVIF Field Smoke Artifact Sample

This synthetic bundle shows the shape of a shareable ONVIF field smoke artifact.
It intentionally contains no real camera endpoint, stream URI, credential, raw
SOAP, raw diagnostic JSON, or customer/site identifier.

Expected files:

- `manifest.json`: bundle schema and required verification commands.
- `redacted_probe_summary.json`: sanitized result summary.
- `redaction-checklist.md`: completed redaction checklist sample.
- `field-smoke-report-template.md`: operator report template with verification
  status and evidence index placeholders.

Use this bundle as a layout reference only. A real field smoke artifact must be
reviewed against `docs/onvif-field-smoke-artifact-redaction.md` before sharing.
For this sample, `realDeviceEndpointSuccess=unverified` and
`realDeviceTestPerformed=false` are intentional.
