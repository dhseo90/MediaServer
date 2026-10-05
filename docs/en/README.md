# English Documentation

Start with the [English product overview](../../README.en.md) or the
[Korean README](../../README.md). Detailed guides are maintained in Korean;
the [full topic index](../README.md) provides the complete navigation path.
Published versions are available on [GitHub Releases](https://github.com/dhseo90/MediaServer/releases/latest).

## Installers: Set Up and Run

| Task | Guide |
| --- | --- |
| Install dependencies, build, and run on macOS/Linux | [Development guide](../development-guide.md) |
| Configure ports, authentication, inputs, and storage | [Configuration reference](../config-reference.md) |
| Check source distribution and dependency terms | [Distribution policy](../distribution-policy.md), [Third-party notices](../../THIRD_PARTY_NOTICES.md) |

The default public distribution contains source code and documentation.
Runtime and model binaries are not included.

## Operators: Configure and Use the Product

| Task | Guide |
| --- | --- |
| Set up an administrator, assign access, and use Ops/Client | [UI guide](../ui-guide.md) |
| Enable continuous and event recording, browse the timeline, and play recordings | [Recording configuration](../config-reference.md#recording-env), [Recording UI](../ui-guide.md#녹화-조회와-재생-v410-s06) |
| Configure analytics rules and scenarios | [Video analytics](../video-analysis.md) |
| Diagnose live inputs and recover operational settings | [Source health runbook](../live-source-health.md#operator-runbook-and-reliability-handoff), [Backup and recovery](../ops-backup-recovery.md) |

Recording uses bounded retention and role/channel access controls. Natural-language
video search is part of the [future roadmap](../v410-v49-recording-search-roadmap.md).
The current product does not promise a complete VMS/NVR or indefinite video storage.

## Developers: Understand and Integrate

| Task | Guide |
| --- | --- |
| Understand RTSP/WebRTC/VA request flows | [Server architecture](../media-server-architecture.md) |
| Consume Event POST, WebRTC, SSE, and WS metadata | [Metadata contracts](../live-event-metadata-contracts.md), [Integrator samples](../integrator-contract-artifact.md) |
| Check ONVIF support and validation boundaries | [ONVIF support](../onvif-live-source-support.md), [Protocol matrix](../onvif-protocol-support-matrix.md) |
| Explore optional VLM and tracking research | [VLM opt-in contract](../vlm-runtime-opt-in-contract.md), [Research and integration index](../README.md#개발자-구조와-연동) |

VLM and Re-ID research features remain off by default. ONVIF Profile G
recording/replay is outside the supported ONVIF scope. Cloud provider calls,
external TURN/WHEP, and real ONVIF devices require their own field checks.

## Maintainers: Verify and Publish

| Task | Guide |
| --- | --- |
| Choose checks and find current feature test definitions | [Verification policy and commands](../stream-verification.md) |
| Review actual UI test requirements and documentation images | [UI fulltest criteria](../manual-ui-fulltest.md), [Image policy](../assets/ui/README.md) |
| Prepare a release and distinguish source from published versions | [Release policy](../release-policy.md), [Versioning policy](../versioning-policy.md) |
| Review unresolved work and future development | [Backlog](../development-backlog.md), [Recording and search roadmap](../v410-v49-recording-search-roadmap.md) |
| Read version changes | [v4.4.0 evidence package](../release-notes-v4.4.0.md), [v4.3.0 visual search development](../release-notes-v4.3.0.md), [v4.2.0 structured search candidate](../release-notes-v4.2.0.md), [v4.1.1 release candidate notes](../release-notes-v4.1.1.md), [v4.1.0 release notes](../release-notes-v4.1.0.md), [Earlier release notes](../README.md#유지보수자-검증과-배포) |

Documentation checks and representative screenshots do not establish product,
UI fulltest, 30-minute, or 120-minute test results. The verification guides define
each area separately; release publication is checked through the release policy.
