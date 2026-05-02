#!/usr/bin/env python3
"""Compare close-object tracker guard modes with the same tracker-stability sample."""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
import pathlib
import re
import subprocess
from typing import Any


ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_FILE = "imports/va_tracking_event_1280x720_30fps_h264.mp4"
VALID_MODES = {"off", "diagnostic", "enforce"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare close-object guard off/diagnostic/enforce tracker stability reports."
    )
    parser.add_argument("--file", default=DEFAULT_FILE, help="video root relative sample file token")
    parser.add_argument("--modes", default="off,diagnostic,enforce", help="comma-separated modes")
    parser.add_argument("--output-dir", default="", help="report output directory")
    parser.add_argument("--long", action="store_true", help="pass --long to verify-tracker-stability")
    parser.add_argument("--overlap-focus", action="store_true", help="pass --overlap-focus")
    parser.add_argument("--duration", default="", help="pass --duration seconds")
    parser.add_argument("--repeat", default="", help="pass --repeat count")
    parser.add_argument("--interval", default="", help="pass --interval seconds")
    parser.add_argument("--poll-count", default="", help="pass --poll-count count")
    parser.add_argument("--class-whitelist", default="", help="pass --class-whitelist csv")
    parser.add_argument("--max-fragmentation", default="", help="pass --max-fragmentation")
    parser.add_argument("--max-overlap-fragmentation", default="", help="pass --max-overlap-fragmentation")
    parser.add_argument("--max-id-switch-risk", default="", help="pass --max-id-switch-risk")
    parser.add_argument("--no-long-sample", action="store_true", help="pass --no-long-sample")
    return parser.parse_args()


def mode_list(raw: str) -> list[str]:
    modes = [item.strip().lower() for item in raw.split(",") if item.strip()]
    if not modes:
        raise SystemExit("modes must not be empty")
    invalid = [mode for mode in modes if mode not in VALID_MODES]
    if invalid:
        raise SystemExit(f"invalid mode(s): {', '.join(invalid)}")
    return modes


def tracker_args(args: argparse.Namespace) -> list[str]:
    out = ["verify-tracker-stability", "--file", args.file]
    if args.long:
        out.append("--long")
    if args.overlap_focus:
        out.append("--overlap-focus")
    for attr, flag in [
        ("duration", "--duration"),
        ("repeat", "--repeat"),
        ("interval", "--interval"),
        ("poll_count", "--poll-count"),
        ("class_whitelist", "--class-whitelist"),
        ("max_fragmentation", "--max-fragmentation"),
        ("max_overlap_fragmentation", "--max-overlap-fragmentation"),
        ("max_id_switch_risk", "--max-id-switch-risk"),
    ]:
        value = getattr(args, attr)
        if value:
            out.extend([flag, str(value)])
    if args.no_long_sample:
        out.append("--no-long-sample")
    return out


def run_tracker(mode: str, args: argparse.Namespace, output_dir: pathlib.Path) -> dict[str, Any]:
    env = os.environ.copy()
    env["MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE"] = mode
    command = [str(ROOT_DIR / "server.sh"), *tracker_args(args)]
    command_display = (
        f"MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE={mode} "
        + " ".join(command)
    )
    completed = subprocess.run(
        command,
        cwd=ROOT_DIR,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    log_path = output_dir / f"tracker-stability-{mode}.log"
    log_path.write_text(completed.stdout, encoding="utf-8")
    summary_path = extract_summary_path(completed.stdout)
    iterations = read_ndjson(summary_path) if summary_path else []
    aggregate = aggregate_iterations(iterations)
    aggregate.update(
        {
            "mode": mode,
            "ok": completed.returncode == 0,
            "exitCode": completed.returncode,
            "command": command_display,
            "summaryPath": str(summary_path) if summary_path else "",
            "logPath": str(log_path),
            "iterationCount": len(iterations),
        }
    )
    if completed.returncode != 0:
        aggregate["error"] = last_error_line(completed.stdout)
    mode_summary_path = output_dir / f"summary-{mode}.json"
    mode_report_path = output_dir / f"report-{mode}.md"
    aggregate["modeSummaryPath"] = str(mode_summary_path)
    aggregate["modeReportPath"] = str(mode_report_path)
    mode_summary_path.write_text(json.dumps(aggregate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_mode_report(mode, aggregate, mode_report_path)
    return aggregate


def extract_summary_path(text: str) -> pathlib.Path | None:
    matches = re.findall(r"summary=(\S+)", text)
    if not matches:
        matches = re.findall(r"summary log:\s*(\S+)", text)
    if not matches:
        return None
    path = pathlib.Path(matches[-1])
    return path if path.exists() else None


def read_ndjson(path: pathlib.Path | None) -> list[dict[str, Any]]:
    if not path or not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def number_values(items: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for item in items:
        value = item.get(key)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def counter_sum(items: list[dict[str, Any]], key: str) -> dict[str, int]:
    counter: collections.Counter[str] = collections.Counter()
    for item in items:
        payload = item.get(key) or {}
        if isinstance(payload, dict):
            for name, value in payload.items():
                if isinstance(value, (int, float)):
                    counter[str(name)] += int(value)
    return dict(sorted(counter.items()))


def aggregate_iterations(items: list[dict[str, Any]]) -> dict[str, Any]:
    def max_value(key: str, default: float = 0.0) -> float:
        values = number_values(items, key)
        return round(max(values), 6) if values else default

    def min_value(key: str) -> float | None:
        values = number_values(items, key)
        return round(min(values), 6) if values else None

    guard_counts = counter_sum(items, "guardDecisionCounts")
    issue_counts = counter_sum(items, "trackingIssueCounts")
    event_signature = latest_signature(items)
    track_rows: list[dict[str, Any]] = []
    for item in items:
        for row in item.get("trackIssueTable") or []:
            if len(track_rows) >= 200:
                break
            if isinstance(row, dict):
                row = dict(row)
                row["iteration"] = item.get("iteration")
                track_rows.append(row)

    return {
        "idSwitchRiskScore": max_value("idSwitchRiskScore"),
        "fragmentationRatio": max_value("fragmentationRatio"),
        "overlapFragmentationRatio": max_value("overlapFragmentationRatio"),
        "minAssociationConfidence": min_value("minAssociationConfidence"),
        "maxOverlapRisk": max_value("maxOverlapRisk"),
        "maxCenterJump": max_value("maxCenterJump"),
        "lostCount": int(max_value("lostCount", 0)),
        "reacquiredCount": int(max_value("reacquiredCount", 0)),
        "missedFrameSpikeCount": sum(int(item.get("missedFrameSpikeCount") or 0) for item in items),
        "directionChangeSpikeCount": sum(int(item.get("directionChangeSpikeCount") or 0) for item in items),
        "guardDecisionCounts": guard_counts,
        "closeObjectGuardAppliedCount": sum(int(item.get("closeObjectGuardAppliedCount") or 0) for item in items),
        "rejectedByCloseObjectGuardCount": sum(int(item.get("rejectedByCloseObjectGuardCount") or 0) for item in items),
        "trackingIssueCounts": issue_counts,
        "eventScenarioSignature": event_signature,
        "trackIssueTable": track_rows,
    }


def latest_signature(items: list[dict[str, Any]]) -> dict[str, Any]:
    for item in reversed(items):
        signature = item.get("eventScenarioSignature")
        if isinstance(signature, dict):
            return signature
    return {"eventState": {}, "scenarioState": {}}


def last_error_line(text: str) -> str:
    for line in reversed(text.splitlines()):
        if "ERROR:" in line or "[fail]" in line:
            return line.strip()
    return "tracker stability command failed"


def compute_deltas(modes: dict[str, dict[str, Any]], baseline_mode: str = "off") -> dict[str, Any]:
    baseline = modes.get(baseline_mode, {})
    deltas: dict[str, Any] = {}
    for mode, payload in modes.items():
        if mode == baseline_mode:
            continue
        delta: dict[str, Any] = {}
        for key in [
            "idSwitchRiskScore",
            "fragmentationRatio",
            "overlapFragmentationRatio",
            "maxOverlapRisk",
            "maxCenterJump",
            "lostCount",
            "reacquiredCount",
            "missedFrameSpikeCount",
            "directionChangeSpikeCount",
            "closeObjectGuardAppliedCount",
            "rejectedByCloseObjectGuardCount",
        ]:
            left = payload.get(key)
            right = baseline.get(key)
            if isinstance(left, (int, float)) and isinstance(right, (int, float)):
                delta[key] = round(float(left) - float(right), 6)
        delta["eventScenarioDelta"] = payload.get("eventScenarioSignature") != baseline.get(
            "eventScenarioSignature"
        )
        deltas[f"{mode}Vs{baseline_mode.capitalize()}"] = delta
    return deltas


def overall_judgement(mode_payloads: dict[str, dict[str, Any]], deltas: dict[str, Any]) -> tuple[str, list[str]]:
    reasons: list[str] = []
    for mode, payload in mode_payloads.items():
        if not payload.get("ok"):
            reasons.append(f"{mode} tracker stability failed")
    if reasons:
        return "fail", reasons

    warnings: list[str] = []
    for name, delta in deltas.items():
        if delta.get("eventScenarioDelta"):
            reasons.append(f"{name} event/scenario signature changed")
        for key in ["idSwitchRiskScore", "fragmentationRatio", "overlapFragmentationRatio"]:
            value = delta.get(key)
            if isinstance(value, (int, float)) and value > 0.001:
                warnings.append(f"{name} {key} increased by {value:.3f}")
    if reasons:
        return "hold", reasons
    if warnings:
        return "warning", warnings
    return "pass", ["mode comparison completed; default-on remains deferred"]


def write_mode_report(mode: str, payload: dict[str, Any], path: pathlib.Path) -> None:
    lines = [
        f"# Close-object Tracker Mode: {mode}",
        "",
        f"- ok: `{payload.get('ok')}`",
        f"- command: `{payload.get('command')}`",
        f"- tracker summary: `{payload.get('summaryPath') or '-'}`",
        f"- tracker log: `{payload.get('logPath') or '-'}`",
        "",
        "## Metrics",
        "",
        "| metric | value |",
        "| --- | --- |",
    ]
    for key in [
        "idSwitchRiskScore",
        "fragmentationRatio",
        "overlapFragmentationRatio",
        "minAssociationConfidence",
        "maxOverlapRisk",
        "maxCenterJump",
        "lostCount",
        "reacquiredCount",
        "missedFrameSpikeCount",
        "directionChangeSpikeCount",
        "closeObjectGuardAppliedCount",
        "rejectedByCloseObjectGuardCount",
    ]:
        lines.append(f"| {key} | {format_cell(payload.get(key))} |")
    lines.extend(["", "## Counters", ""])
    lines.append(f"- guard decisions: `{json.dumps(payload.get('guardDecisionCounts') or {}, ensure_ascii=False)}`")
    lines.append(f"- tracking issues: `{json.dumps(payload.get('trackingIssueCounts') or {}, ensure_ascii=False)}`")
    lines.extend(["", "## Track Issue Rows", ""])
    lines.append("| iteration | source | track | class | type | assoc | overlap | centerJump | applied | rejected |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    rows = payload.get("trackIssueTable") or []
    if not rows:
        lines.append("| - | - | - | - | no issue rows | - | - | - | - | - |")
    for row in rows[:80]:
        lines.append(
            "| {iteration} | {source} | {track} | {class_name} | {typ} | {assoc} | {overlap} | {jump} | {applied} | {rejected} |".format(
                iteration=format_cell(row.get("iteration")),
                source=format_cell(row.get("source")),
                track=format_cell(row.get("trackId")),
                class_name=format_cell(row.get("className")),
                typ=format_cell(row.get("type")),
                assoc=format_cell(row.get("associationConfidence")),
                overlap=format_cell(row.get("overlapRisk") or row.get("closeObjectRisk")),
                jump=format_cell(row.get("centerJump")),
                applied=format_cell(row.get("guardApplied")),
                rejected=format_cell(row.get("rejected")),
            )
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_report(summary: dict[str, Any], path: pathlib.Path) -> None:
    modes = summary["modes"]
    lines = [
        "# Close-object Tracker Guard Comparison",
        "",
        f"- sample: `{summary['sample']}`",
        f"- modes: `{', '.join(modes.keys())}`",
        f"- baseline: `{summary.get('baselineMode', 'off')}`",
        f"- judgement: `{summary['overallJudgement']}`",
        "",
        "## Mode Summary",
        "",
        "| mode | ok | idSwitchRisk | fragmentation | overlap fragmentation | min assoc | max overlap | max centerJump | lost/reacq | guard applied/rejected |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for mode, payload in modes.items():
        lines.append(
            "| {mode} | {ok} | {risk} | {frag} | {overlap_frag} | {assoc} | {overlap} | {jump} | {lost}/{reacq} | {applied}/{rejected} |".format(
                mode=mode,
                ok="PASS" if payload.get("ok") else "FAIL",
                risk=format_cell(payload.get("idSwitchRiskScore")),
                frag=format_cell(payload.get("fragmentationRatio")),
                overlap_frag=format_cell(payload.get("overlapFragmentationRatio")),
                assoc=format_cell(payload.get("minAssociationConfidence")),
                overlap=format_cell(payload.get("maxOverlapRisk")),
                jump=format_cell(payload.get("maxCenterJump")),
                lost=format_cell(payload.get("lostCount")),
                reacq=format_cell(payload.get("reacquiredCount")),
                applied=format_cell(payload.get("closeObjectGuardAppliedCount")),
                rejected=format_cell(payload.get("rejectedByCloseObjectGuardCount")),
            )
        )
    lines.extend(["", "## Guard Decisions", ""])
    lines.append("| mode | decisions | tracking issues |")
    lines.append("| --- | --- | --- |")
    for mode, payload in modes.items():
        lines.append(
            f"| {mode} | `{json.dumps(payload.get('guardDecisionCounts') or {}, ensure_ascii=False)}` | `{json.dumps(payload.get('trackingIssueCounts') or {}, ensure_ascii=False)}` |"
        )
    lines.extend(["", "## Event / Scenario Delta", ""])
    lines.append("| comparison | event/scenario delta | numeric delta |")
    lines.append("| --- | --- | --- |")
    for name, delta in summary.get("delta", {}).items():
        numeric = {key: value for key, value in delta.items() if key != "eventScenarioDelta"}
        lines.append(
            f"| {name} | `{delta.get('eventScenarioDelta')}` | `{json.dumps(numeric, ensure_ascii=False)}` |"
        )
    lines.extend(["", "## Track Issue Rows", ""])
    lines.append("| mode | iteration | source | track | class | type | assoc | overlap | centerJump | applied | rejected |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for mode, payload in modes.items():
        rows = payload.get("trackIssueTable") or []
        if not rows:
            lines.append(f"| {mode} | - | - | - | - | no issue rows | - | - | - | - | - |")
            continue
        for row in rows[:40]:
            lines.append(
                "| {mode} | {iteration} | {source} | {track} | {class_name} | {typ} | {assoc} | {overlap} | {jump} | {applied} | {rejected} |".format(
                    mode=mode,
                    iteration=format_cell(row.get("iteration")),
                    source=format_cell(row.get("source")),
                    track=format_cell(row.get("trackId")),
                    class_name=format_cell(row.get("className")),
                    typ=format_cell(row.get("type")),
                    assoc=format_cell(row.get("associationConfidence")),
                    overlap=format_cell(row.get("overlapRisk") or row.get("closeObjectRisk")),
                    jump=format_cell(row.get("centerJump")),
                    applied=format_cell(row.get("guardApplied")),
                    rejected=format_cell(row.get("rejected")),
                )
            )
    lines.extend(["", "## Notes", ""])
    for reason in summary.get("reasons") or []:
        lines.append(f"- {reason}")
    lines.append("- close-object guard default-on is not changed by this report.")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def format_cell(value: Any) -> str:
    if value is None or value == "":
        return "-"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value).replace("|", "\\|")


def main() -> int:
    args = parse_args()
    modes = mode_list(args.modes)
    output_dir = pathlib.Path(args.output_dir) if args.output_dir else pathlib.Path(
        f"/tmp/media_server_close_object_tracker_{int(dt.datetime.now().timestamp())}_{os.getpid()}"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    mode_payloads = {mode: run_tracker(mode, args, output_dir) for mode in modes}
    baseline_mode = "off" if "off" in mode_payloads else modes[0]
    deltas = compute_deltas(mode_payloads, baseline_mode)
    judgement, reasons = overall_judgement(mode_payloads, deltas)
    summary = {
        "kind": "close-object-tracker-comparison",
        "ok": judgement in {"pass", "warning"},
        "sample": args.file,
        "baselineMode": baseline_mode,
        "modes": mode_payloads,
        "delta": deltas,
        "overallJudgement": judgement,
        "reasons": reasons,
        "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    summary_path = output_dir / "summary.json"
    report_path = output_dir / "report.md"
    summary["summaryPath"] = str(summary_path)
    summary["reportPath"] = str(report_path)
    write_report(summary, report_path)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"[summary-json] {summary_path}")
    print(f"[report] {report_path}")
    print(f"[judgement] {judgement}")
    for reason in reasons:
        print(f"[reason] {reason}")
    return 0 if judgement in {"pass", "warning"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
