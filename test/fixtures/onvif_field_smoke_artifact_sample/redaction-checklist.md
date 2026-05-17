# ONVIF Field Smoke Redaction Checklist Sample

- [x] Endpoint host is represented only as `<redacted-host>`.
- [x] Credential state is represented only as `credentialReferencePresent=true`.
- [x] Plaintext secret, token, cookie, Authorization header are omitted.
- [x] Stream URI is represented only by `streamUriRedacted=true`.
- [x] Raw SOAP request/response and raw diagnostic JSON are omitted.
- [x] Client API redaction result is summarized as `clientRedaction=pass`.
- [x] Ops copy parity result is summarized as `opsCopyParity=pass`.
- [x] Probe error wording result is summarized as `probeErrorWording=pass`.
- [x] Real device status is explicit as `realDeviceEndpointSuccess=unverified`
  when no ONVIF camera was used.
- [x] Operator checklist status is explicit as `operatorChecklistStatus=skipped`
  for this no-device sample.
- [x] Failure wording uses sanitized values and keeps Digest/WS-Security outside
  the current live source scope.
- [x] Each required verification command has an explicit status or skip reason.
- [x] Evidence index paths point only to redacted files in this bundle.
- [x] Screenshot filenames and directory names use redacted site placeholders.
- [x] Verification commands are listed in `manifest.json`.
