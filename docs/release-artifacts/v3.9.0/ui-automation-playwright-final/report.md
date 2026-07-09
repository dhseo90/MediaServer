# v3.9.0 UI Automation Runner Report

schema: media-server.v390-ui-automation.v1
result: PASS
browserMode: playwright
manualIntervention: false
failedCaseId: 
evidenceBoundary: automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence

| case | status | route | control/action | expected | actual |
| --- | --- | --- | --- | --- | --- |
| UI-108 | PASS | /ops/sources | inspect-onvif-provider-status | provider status card shows primarySelection=none and credentialMaterialExposed=false | all expected UI markers found |
| UI-109 | PASS | /ops/sources | inspect-live-import-persist-decision | persist decision card shows manual form-save handoff and oneShotPersist=false | all expected UI markers found |
| UI-110 | PASS | /ops/rules | inspect-vlm-rule-draft-bridge | rule suggestion bridge shows manualSaveRequired=true and autoApply=false | all expected UI markers found |
| UI-111 | PASS | /ops/vlm | inspect-vlm-evaluation-promotion-guard | promotion guard shows operator-save-then-activation-review | all expected UI markers found |
| UI-113 | PASS | /ops | inspect-action-execution-deferral | action execution decision shows defer-all-action-writes | all expected UI markers found |
| UI-114 | PASS | /ops | inspect-field-evidence-bridge | field evidence bridge shows approval-only minimal evidence | all expected UI markers found |
| UI-115 | PASS | /ops | inspect-reid-assist-decision | Re-ID assist decision shows explicit opt-in provenance gate | all expected UI markers found |

