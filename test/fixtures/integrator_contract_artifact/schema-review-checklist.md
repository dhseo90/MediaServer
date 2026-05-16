# Integrator Contract Schema Review Checklist

Use this checklist only when a proposed change would modify an existing live
contract. Documentation wording, sample formatting, and artifact verifier
changes are not enough to approve a payload mutation.

- [ ] The change is still inside the live Event POST/WebRTC/SSE/WS product
      boundary.
- [ ] The change does not introduce recorded archive, playback, search, VMS, or
      NVR scope.
- [ ] The proposed schema identifier change, if any, is explicit and reviewed.
- [ ] Event POST payload field additions, removals, renames, and type changes
      are listed.
- [ ] WebRTC `va-metadata` DataChannel label and payload compatibility impact is
      listed.
- [ ] SSE and WebSocket runtime metadata compatibility impact is listed.
- [ ] WebSocket control acknowledgement compatibility impact is listed.
- [ ] Source locators, endpoint userinfo, credentials, token hashes, raw JSON,
      and debug counters remain excluded from client/viewer payloads.
- [ ] `./server.sh verify-integrator-contract-artifact` was run.
- [ ] Runtime delivery smoke was run when runtime delivery is claimed.
