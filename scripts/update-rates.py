#!/usr/bin/env python3
"""Fetch USD FX rates and write data/rates.json for GitHub Pages fallback."""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "rates.json"
URL = "https://open.er-api.com/v6/latest/USD"


def main() -> None:
    with urllib.request.urlopen(URL, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("result") != "success":
        raise SystemExit(f"FX API failed: {payload}")
    out = {
        "provider": "open.er-api.com",
        "base": "USD",
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timeLastUpdateUtc": payload.get("time_last_update_utc"),
        "rates": payload.get("rates", {}),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    cny = out["rates"].get("CNY")
    print(f"wrote {OUT}  USD/CNY={cny}")


if __name__ == "__main__":
    main()
