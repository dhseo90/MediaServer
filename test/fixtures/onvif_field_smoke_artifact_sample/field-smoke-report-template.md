# ONVIF Field Smoke Report Template

## Scope

- artifact: `onvif-field-smoke-<date>-<redacted-site>`
- realDeviceTestPerformed: `<true|false>`
- realDeviceEndpointSuccess: `<pass|fail|unverified>`
- endpoint: `<redacted-host>/onvif/device_service`
- credential: `credentialReferencePresent=<true|false>`, `plaintextSecretIncluded=false`

## Probe Summary

- services: `Device=<yes|no>`, `Media=<yes|no>`, `Media2=<yes|no>`
- selectedProfile: `token=<redacted-token>`, `api=<Media|Media2>`, `encoding=<H264|H265>`
- streamUriRedacted: `true`
- draft: `sourceId=<redacted-source-id>`, `viewId=<redacted-view-id>`, `tags=onvif/live`

## Verification Status

| command | status | note |
| --- | --- | --- |
| `verify-onvif-field-smoke-redaction` | `<pass|fail>` | `<sanitized note>` |
| `verify-onvif-field-http-probe` | `<pass|fail|skipped>` | `<skip reason when skipped>` |
| `verify-onvif-probe-draft-api` | `<pass|fail>` | `<sanitized note>` |
| `verify-onvif-ops-sources-ui` | `<pass|fail>` | `<sanitized note>` |

## Evidence Index

| type | path | redaction |
| --- | --- | --- |
| `summary` | `redacted_probe_summary.json` | `endpoint and stream URI redacted` |
| `checklist` | `redaction-checklist.md` | `completed before sharing` |
| `screenshot` | `<redacted-screenshot-name>` | `client locator and credential values absent` |

## Notes

`<sanitized operational note>`
