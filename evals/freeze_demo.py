"""
Freeze a single business-plan generation + critique + investor-questions
into lib/fixtures/demo-plan.json for use in the /demo route.

Usage:
    cd <repo root>
    python evals/freeze_demo.py [fixture-id]

Requires:
    - OPENAI_API_KEY in environment (or in .env loaded by FastAPI)
    - FastAPI running on http://localhost:8000

Defaults to fixture 006-childcare-coop. Pass any fixture id (e.g. "001-freelancer-scheduling")
to use a different one. Pass --idea "<text>" to use a free-text idea instead.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

API_BASE = "http://localhost:8000"
REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURES_DIR = REPO_ROOT / "evals" / "fixtures"
OUTPUT_PATH = REPO_ROOT / "lib" / "fixtures" / "demo-plan.json"
DEFAULT_FIXTURE_ID = "eval-006"


def load_fixture_by_id(fixture_id: str) -> dict:
    for f in sorted(FIXTURES_DIR.glob("*.json")):
        with open(f, encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("id") == fixture_id:
            return data
    available = []
    for f in sorted(FIXTURES_DIR.glob("*.json")):
        with open(f, encoding="utf-8") as fh:
            available.append(json.load(fh).get("id"))
    raise SystemExit(f"Fixture id '{fixture_id}' not found. Available: {available}")


def wait_for_api(retries: int = 20, delay: float = 1.0) -> None:
    for _ in range(retries):
        try:
            r = requests.get(f"{API_BASE}/api/health", timeout=2)
            if r.ok:
                return
        except requests.RequestException:
            pass
        time.sleep(delay)
    raise SystemExit(
        f"FastAPI did not respond at {API_BASE}/api/health after {retries * delay:.0f}s. "
        f"Start it with `npm run dev:api` (or `npm run dev:all`) and re-run."
    )


def generate_plan(payload: dict) -> dict:
    print(f"  POST {API_BASE}/api/generate ...")
    start = time.time()
    resp = requests.post(f"{API_BASE}/api/generate", json=payload, timeout=180)
    resp.raise_for_status()

    sections: dict = {}
    for line in resp.text.split("\n"):
        line = line.strip()
        if not line.startswith("data: "):
            continue
        body = line[6:]
        if body == "[DONE]":
            break
        try:
            event = json.loads(body)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "section_data":
            sections[event["section"]] = event["data"]
        elif event.get("type") == "error":
            raise SystemExit(f"  API error during generate: {event.get('message')}")

    elapsed = time.time() - start
    print(f"  generate: {len(sections)} sections in {elapsed:.1f}s")
    if not sections:
        raise SystemExit("  No sections returned from /api/generate")
    return sections


def critique_plan(plan: dict) -> list:
    print(f"  POST {API_BASE}/api/critique ...")
    start = time.time()
    resp = requests.post(f"{API_BASE}/api/critique", json={"plan": plan}, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    elapsed = time.time() - start
    critiques = data.get("critiques", [])
    print(f"  critique: {len(critiques)} critiques in {elapsed:.1f}s")
    return critiques


def investor_questions(plan: dict) -> list:
    print(f"  POST {API_BASE}/api/investor-questions ...")
    start = time.time()
    resp = requests.post(
        f"{API_BASE}/api/investor-questions", json={"plan": plan}, timeout=120
    )
    resp.raise_for_status()
    data = resp.json()
    elapsed = time.time() - start
    questions = data.get("questions", [])
    print(f"  investor-questions: {len(questions)} questions in {elapsed:.1f}s")
    return questions


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "fixture_id",
        nargs="?",
        default=DEFAULT_FIXTURE_ID,
        help=f"Fixture id from evals/fixtures/*.json (default: {DEFAULT_FIXTURE_ID})",
    )
    parser.add_argument(
        "--idea",
        type=str,
        default=None,
        help="Free-text business idea (overrides fixture)",
    )
    parser.add_argument(
        "--industry", type=str, default=None, help="Optional industry (with --idea)"
    )
    parser.add_argument(
        "--stage",
        type=str,
        default=None,
        choices=["idea", "validation", "growth"],
        help="Optional stage (with --idea)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output path (default: {OUTPUT_PATH.relative_to(REPO_ROOT)})",
    )
    args = parser.parse_args()

    wait_for_api()

    if args.idea:
        source = {"description": args.idea, "label": f"custom — {args.idea[:60]}"}
        payload = {"description": args.idea}
        if args.industry:
            payload["industry"] = args.industry
        if args.stage:
            payload["stage"] = args.stage
    else:
        fixture = load_fixture_by_id(args.fixture_id)
        source = {
            "fixture_id": fixture["id"],
            "label": fixture["description"],
        }
        payload = {"description": fixture["description"]}
        if fixture.get("industry"):
            payload["industry"] = fixture["industry"]
        if fixture.get("stage"):
            payload["stage"] = fixture["stage"]
        if fixture.get("market_context"):
            payload["market_context"] = fixture["market_context"]

    print(f"Freezing demo plan from: {source['label']}\n")

    plan = generate_plan(payload)
    critiques = critique_plan(plan)
    questions = investor_questions(plan)

    frozen = {
        "source": source,
        "input": payload,
        "plan": plan,
        "critiques": critiques,
        "investor_questions": questions,
        "frozen_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(frozen, fh, indent=2, ensure_ascii=False)

    rel = args.out.relative_to(REPO_ROOT)
    print(f"\nWrote {rel}")
    print(
        f"  plan sections: {len(plan)} | critiques: {len(critiques)} | investor Qs: {len(questions)}"
    )


if __name__ == "__main__":
    main()
