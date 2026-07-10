# v3.9.0 UI Automation Runner Report

schema: media-server.v390-ui-automation.v1
result: PASS
browserMode: playwright
manualIntervention: false
failedCaseId: (none)
evidenceBoundary: automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence

| case | status | route | control/action | expected | actual |
| --- | --- | --- | --- | --- | --- |
| UI-108 | PASS | /ops/sources | inspect-onvif-provider-status | provider status card shows primarySelection=none and credentialMaterialExposed=false | control action executed and expected UI state captured |
| UI-109 | PASS | /ops/sources | inspect-live-import-persist-decision | persist decision card shows manual paired save rollback and oneShotPersist=false | control action executed and expected UI state captured |
| UI-110 | PASS | /ops/rules | inspect-vlm-rule-draft-bridge | rule suggestion bridge shows manualSaveRequired=true and autoApply=false | control action executed and expected UI state captured |
| UI-111 | PASS | /ops/vlm | inspect-vlm-evaluation-promotion-guard | promotion guard shows server-verified candidate save | control action executed and expected UI state captured |
| UI-112 | PASS | /ops/sources | inspect-staging-restore-validation-handoff | staging restore checklist and result artifact keep production restore disabled | control action executed and expected UI state captured |
| UI-113 | PASS | /ops/dashboard | inspect-action-execution-deferral | action execution decision shows defer-all-action-writes | control action executed and expected UI state captured |
| UI-114 | PASS | /ops/dashboard | inspect-field-evidence-bridge | field evidence bridge shows approval-only minimal evidence | control action executed and expected UI state captured |
| UI-115 | PASS | /ops/dashboard | inspect-reid-assist-decision | Re-ID assist decision shows server-owned file/SHA/provenance/runtime preflight without execution claim | control action executed and expected UI state captured |
