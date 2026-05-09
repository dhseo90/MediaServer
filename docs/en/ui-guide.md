# UI Guide

Korean detailed guide: [../ui-guide.md](../ui-guide.md)

## Main Rule

Users open the same main URL:

```text
http://127.0.0.1:8081/
```

The server routes them by account role and scope.

## Account Views

| Role | View | Notes |
| --- | --- | --- |
| `admin` | Ops | Full channel, rule, user, dashboard, diagnostics access |
| `operator` | Ops | Operational management without owner-only actions |
| `viewer` | Client | Assigned channel/client views only |
| `integrator` | Scoped API | API integration role, not a daily UI operator |

`/lab` screen routes stay closed. Lab APIs can remain available for verification and integration checks.

## Ops Screens

- Home: operational summary and health signals.
- Channels: source registration, source status, bulk actions, and diagnostics.
- Rules: rule list, rule editor, channel binding, source/profile validation, and preview editing.
- Users: role/scope management, invites, requests, and account lifecycle.
- Dashboard: source lifecycle, stale/reconnect signals, and operator-facing root-cause hints.

## Client Screens

Client users see assigned live views and event-oriented status only. Raw source URLs, internal JSON diagnostics, and rule/profile editors are not exposed.

## Table Behavior

Channels, Rules, and Users share the same responsive table pattern.

- Text must not overlap adjacent cells.
- Action buttons must stay reachable on mobile widths.
- Detail buttons and drawers must work after tab navigation.
- Browser resizing must not create clipped, hidden, or duplicated content.

Run:

```bash
./server.sh verify-ops-client-ui
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
```
