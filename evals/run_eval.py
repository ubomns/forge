"""
Forge Evaluation Suite

Runs the generator and critic for each fixture and produces a report.

Usage:
    cd evals
    python run_eval.py

Requires OPENAI_API_KEY and FastAPI running on localhost:8000.
"""

import json
import sys
import time
from pathlib import Path

import requests

API_BASE = "http://localhost:8000"

FIXTURES_DIR = Path(__file__).parent / "fixtures"

SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2}


def load_fixtures():
    fixtures = []
    for f in sorted(FIXTURES_DIR.glob("*.json")):
        with open(f, encoding='utf-8') as fh:
            fixtures.append(json.load(fh))
    return fixtures


def run_generate(fixture):
    payload = {
        "description": fixture["description"],
    }
    if fixture.get("industry"):
        payload["industry"] = fixture["industry"]
    if fixture.get("stage"):
        payload["stage"] = fixture["stage"]
    if fixture.get("market_context"):
        payload["market_context"] = fixture["market_context"]

    resp = requests.post(f"{API_BASE}/api/generate", json=payload, timeout=120)
    resp.raise_for_status()

    sections = {}
    for line in resp.text.split("\n"):
        line = line.strip()
        if not line.startswith("data: "):
            continue
        payload_str = line[6:]
        if payload_str == "[DONE]":
            break
        try:
            event = json.loads(payload_str)
            if isinstance(event, dict) and event.get("type") == "section_data":
                if "section" in event and "data" in event:
                    sections[event["section"]] = event["data"]
                else:
                    print(f"  WARNING: section_data event missing required fields: {event}")
            elif isinstance(event, dict) and event.get("type") == "error":
                print(f"  ERROR from API: {event.get('message', 'unknown')}")
                return None
        except json.JSONDecodeError:
            continue

    return sections


def run_critique(plan_data):
    resp = requests.post(f"{API_BASE}/api/critique", json={"plan": plan_data}, timeout=60)
    resp.raise_for_status()
    return resp.json().get("critiques", [])


def evaluate_section_completeness(plan_data):
    issues = []
    for section_id, section_data in plan_data.items():
        if section_data is None:
            issues.append(f"  {section_id}: MISSING (null)")
            continue

        trivial_fields = 0
        total_fields = 0
        for field_name, value in section_data.items() if isinstance(section_data, dict) else []:
            total_fields += 1
            if value is None or (isinstance(value, str) and len(value.strip()) < 10):
                trivial_fields += 1
            if isinstance(value, list) and len(value) == 0:
                trivial_fields += 1

        if total_fields > 0 and trivial_fields > total_fields // 2:
            issues.append(f"  {section_id}: MOSTLY TRIVIAL ({trivial_fields}/{total_fields} fields are empty/short)")

    return issues


def evaluate_critiques(critiques):
    severity_counts = {"low": 0, "medium": 0, "high": 0}
    for c in critiques:
        sev = c.get("severity", "low")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return severity_counts


def main():
    fixtures = load_fixtures()
    if not fixtures:
        print("No fixtures found in evals/fixtures/")
        sys.exit(1)

    print(f"Running evaluation on {len(fixtures)} fixtures...\n")

    results = []
    all_pass = True

    for fixture in fixtures:
        fid = fixture["id"]
        print(f"[{fid}] {fixture['description'][:60]}...")

        start = time.time()
        plan_data = run_generate(fixture)
        gen_time = time.time() - start

        if plan_data is None:
            print(f"  FAILED — generation returned no data")
            all_pass = False
            results.append({"id": fid, "status": "FAILED_GENERATE"})
            continue

        # Schema compliance
        section_count = len(plan_data)
        empty_sections = sum(1 for v in plan_data.values() if v is None)
        print(f"  Generated {section_count} sections in {gen_time:.1f}s (empty: {empty_sections})")

        # Section completeness
        completeness_issues = evaluate_section_completeness(plan_data)
        if completeness_issues:
            print(f"  Section completeness issues:")
            for issue in completeness_issues:
                print(f"    {issue}")
        else:
            print(f"  Section completeness: PASS")

        # Critique
        start = time.time()
        critiques = run_critique(plan_data)
        crit_time = time.time() - start

        severity_counts = evaluate_critiques(critiques)
        print(f"  Critiques in {crit_time:.1f}s: {severity_counts}")

        has_medium_or_high = severity_counts.get("medium", 0) + severity_counts.get("high", 0) > 0
        if not has_medium_or_high:
            print(f"  WARNING: No medium+ critiques — critic may be too soft")
            all_pass = False

        results.append({
            "id": fid,
            "status": "PASS" if not completeness_issues else "WEAK",
            "section_count": section_count,
            "empty_sections": empty_sections,
            "severity_counts": severity_counts,
            "gen_time": round(gen_time, 1),
            "crit_time": round(crit_time, 1),
            "completeness_issues": completeness_issues,
        })
        print()

    # Summary
    print("=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in results if r["status"] == "PASS")
    weak = sum(1 for r in results if r["status"] == "WEAK")
    failed = sum(1 for r in results if r["status"] == "FAILED_GENERATE")

    print(f"Total: {len(results)} fixtures")
    print(f"  PASS:  {passed}")
    print(f"  WEAK:  {weak}")
    print(f"  FAIL:  {failed}")

    total_high = sum(r.get("severity_counts", {}).get("high", 0) for r in results if isinstance(r.get("severity_counts"), dict))
    total_medium = sum(r.get("severity_counts", {}).get("medium", 0) for r in results if isinstance(r.get("severity_counts"), dict))
    print(f"\nAggregate critique severities:")
    print(f"  HIGH:   {total_high}")
    print(f"  MEDIUM: {total_medium}")

    if total_high == 0:
        print("\n  ⚠ No high-severity critiques across any fixture — critic may be too soft.")
        all_pass = False

    print()

    # Grading table
    checks = {
        "Schema compliance": passed + weak == len(results) - failed,
        "Section completeness": weak <= 2,
        "Critique coverage (medium+)": all(r.get("severity_counts", {}).get("medium", 0) + r.get("severity_counts", {}).get("high", 0) > 0 for r in results if r["status"] != "FAILED_GENERATE"),
        "Severity calibration (high)": total_high > 0,
    }
    for check, result in checks.items():
        print(f"  {'PASS' if result else 'FAIL'} — {check}")

    if all(checks.values()):
        print("\n✅ All evaluation checks passed.")
    else:
        print("\n❌ Some evaluation checks failed.")

    sys.exit(0 if all(checks.values()) else 1)


if __name__ == "__main__":
    main()