# Analysis Threshold Baselines

Korean detailed guide: [../analysis-threshold-baselines.md](../analysis-threshold-baselines.md)

These values are starting points for field tuning. They are not universal defaults.

| Scenario | Typical place | Starting focus |
| --- | --- | --- |
| Loitering | lobby, platform, entrance | dwell time, person confidence, zone size |
| ZoneOccupancy | indoor, park, queue area | max count, hold time, object class |
| LineCrossing | gate, road edge, corridor | direction, debounce, crossing segment |
| Intrusion | restricted zone, fence line | zone polygon, confidence, schedule |

## Tuning Notes

- Start with conservative thresholds.
- Log false positives and false negatives separately.
- Keep source/profile/rule bindings visible to operators.
- Explain why an event fired whenever possible.

## Verification

```bash
./server.sh verify-ops-scenario-presets
./server.sh verify-va-replay
```
