from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "Desktop"

RAIN_FILES = [
    DESKTOP / "강수량.csv",
    DESKTOP / "강수량_20240930.csv",
]
CODE_FILES = [
    (DESKTOP / "경상남도_행정동코드.csv", "cp949"),
    (DESKTOP / "행정동코드.csv", "utf-8-sig"),
]
FLOOD_FILE = DESKTOP / "5. rim022.csv"
OUT_FILE = ROOT / "dashboard-data.js"


def number(value: str) -> float:
    try:
        return float(str(value).replace(",", "").strip() or 0)
    except ValueError:
        return 0.0


def rounded(value: float, digits: int = 1) -> float:
    return round(float(value), digits)


def max_or_one(values) -> float:
    value = max(values) if values else 0
    return value if value > 0 else 1


def normalize(value: float, max_value: float) -> float:
    return min(value / max_value, 1) if max_value else 0


def flood_weight(freq: float) -> float:
    if freq <= 0:
        return 0.0
    if freq <= 10:
        return 5.0
    if freq <= 20:
        return 4.5
    if freq <= 30:
        return 4.0
    if freq <= 50:
        return 3.0
    if freq <= 80:
        return 2.0
    if freq <= 100:
        return 1.5
    if freq <= 150:
        return 1.0
    return 0.5


def read_code_map() -> tuple[dict[str, dict[str, str]], dict[str, int]]:
    code_map: dict[str, dict[str, str]] = {}
    source_rows: dict[str, int] = {}
    for path, encoding in CODE_FILES:
        rows = 0
        with path.open("r", encoding=encoding, newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                code = row["행정동코드"].strip()
                code_map[code] = {
                    "sido": row.get("시도명", "").strip(),
                    "sigungu": row.get("시군구명", "").strip(),
                    "dong": row.get("행정동명", "").strip(),
                }
                rows += 1
        source_rows[path.name] = rows
    return code_map, source_rows


def read_rain() -> tuple[dict, list[str], list[str], dict]:
    metrics = defaultdict(
        lambda: {
            "totalRain": 0.0,
            "recentRain": 0.0,
            "maxHourly": 0.0,
            "heavy30Hours": 0,
            "heavy50Hours": 0,
            "recordCount": 0,
        }
    )
    daily = defaultdict(float)
    monthly = defaultdict(float)
    all_dates: set[str] = set()
    all_months: set[str] = set()
    source_rows = {}

    for path in RAIN_FILES:
        rows = 0
        with path.open("r", encoding="cp949", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                code = row["행정동코드"].strip()
                date = row["측정일"].strip()
                rain = number(row["강수량"])
                month = date[:7]
                item = metrics[code]

                item["totalRain"] += rain
                item["recordCount"] += 1
                item["maxHourly"] = max(item["maxHourly"], rain)
                item["heavy30Hours"] += 1 if rain >= 30 else 0
                item["heavy50Hours"] += 1 if rain >= 50 else 0
                if date >= "2024-01-01":
                    item["recentRain"] += rain

                daily[(code, date)] += rain
                monthly[(code, month)] += rain
                all_dates.add(date)
                all_months.add(month)
                rows += 1
        source_rows[path.name] = rows

    date_list = sorted(all_dates)
    month_list = sorted(all_months)

    for code, item in metrics.items():
        item["maxDaily"] = max(daily.get((code, date), 0.0) for date in date_list)
        item["maxMonthly"] = max(monthly.get((code, month), 0.0) for month in month_list)
        item["rainDays"] = sum(1 for date in date_list if daily.get((code, date), 0.0) > 0)
        item["heavy30Days"] = sum(1 for date in date_list if daily.get((code, date), 0.0) >= 30)
        item["heavy50Days"] = sum(1 for date in date_list if daily.get((code, date), 0.0) >= 50)

    return metrics, date_list, month_list, {
        "daily": daily,
        "monthly": monthly,
        "sourceRows": source_rows,
    }


def read_flood() -> dict:
    freq_counts: Counter[str] = Counter()
    river_stats = defaultdict(lambda: {"zoneCount": 0, "lowFreqCount": 0, "weightedScore": 0.0})
    total = 0
    low = 0
    weighted_total = 0.0

    with FLOOD_FILE.open("r", encoding="cp949", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            river_code = row["하천관리코드"].strip()
            freq = number(row["빈도"])
            key = "미상" if freq <= 0 else str(int(freq)) if freq.is_integer() else str(freq)
            weight = flood_weight(freq)
            total += 1
            low += 1 if 0 < freq <= 50 else 0
            weighted_total += weight
            freq_counts[key] += 1
            river_stats[river_code]["zoneCount"] += 1
            river_stats[river_code]["weightedScore"] += weight
            river_stats[river_code]["lowFreqCount"] += 1 if 0 < freq <= 50 else 0

    top_rivers = sorted(
        (
            {
                "riverCode": code,
                "zoneCount": stat["zoneCount"],
                "lowFreqCount": stat["lowFreqCount"],
                "weightedScore": rounded(stat["weightedScore"], 1),
            }
            for code, stat in river_stats.items()
        ),
        key=lambda item: (item["weightedScore"], item["zoneCount"]),
        reverse=True,
    )[:12]

    return {
        "totalZones": total,
        "lowFrequencyZones": low,
        "lowFrequencyRatio": rounded(low / total if total else 0, 4),
        "weightedTotal": rounded(weighted_total, 1),
        "frequencyCounts": [
            {"frequency": key, "count": freq_counts[key]}
            for key in sorted(freq_counts, key=lambda value: 9999 if value == "미상" else float(value))
        ],
        "topRivers": top_rivers,
    }


def build_payload() -> dict:
    code_map, code_sources = read_code_map()
    metrics, date_list, month_list, series = read_rain()
    flood = read_flood()

    max_total = max_or_one(item["totalRain"] for item in metrics.values())
    max_recent = max_or_one(item["recentRain"] for item in metrics.values())
    max_hourly = max_or_one(item["maxHourly"] for item in metrics.values())
    max_daily = max_or_one(item["maxDaily"] for item in metrics.values())
    max_heavy30 = max_or_one(item["heavy30Hours"] for item in metrics.values())
    flood_pressure = flood["lowFrequencyRatio"]

    regions = []
    for code, item in metrics.items():
        code_info = code_map.get(code, {})
        name = code_info.get("sigungu") or code_info.get("dong") or code
        rain_risk = (
            normalize(item["totalRain"], max_total) * 0.30
            + normalize(item["maxDaily"], max_daily) * 0.25
            + normalize(item["maxHourly"], max_hourly) * 0.20
            + normalize(item["heavy30Hours"], max_heavy30) * 0.15
            + normalize(item["recentRain"], max_recent) * 0.10
        )
        flood_exposure = flood_pressure * (
            normalize(item["maxDaily"], max_daily) * 0.60
            + normalize(item["heavy30Hours"], max_heavy30) * 0.40
        )
        final_score = rain_risk * 0.75 + flood_exposure * 0.25

        regions.append(
            {
                "code": code,
                "name": name,
                "sido": code_info.get("sido", ""),
                "totalRain": rounded(item["totalRain"]),
                "recentRain": rounded(item["recentRain"]),
                "maxHourly": rounded(item["maxHourly"]),
                "maxDaily": rounded(item["maxDaily"]),
                "maxMonthly": rounded(item["maxMonthly"]),
                "rainDays": item["rainDays"],
                "heavy30Hours": item["heavy30Hours"],
                "heavy50Hours": item["heavy50Hours"],
                "heavy30Days": item["heavy30Days"],
                "heavy50Days": item["heavy50Days"],
                "rainRiskScore": rounded(rain_risk * 100),
                "floodExposureScore": rounded(flood_exposure * 100),
                "finalScore": rounded(final_score * 100),
                "monthly": [
                    rounded(series["monthly"].get((code, month), 0.0))
                    for month in month_list
                ],
                "daily": [
                    rounded(series["daily"].get((code, date), 0.0))
                    for date in date_list
                ],
            }
        )

    regions.sort(key=lambda item: item["finalScore"], reverse=True)

    return {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sources": {
            "rainRows": series["sourceRows"],
            "codeRows": code_sources,
            "rainStartDate": date_list[0],
            "rainEndDate": date_list[-1],
            "regionCount": len(regions),
            "dateCount": len(date_list),
            "monthCount": len(month_list),
        },
        "dates": date_list,
        "months": month_list,
        "regions": regions,
        "flood": flood,
    }


def main() -> None:
    payload = build_payload()
    json_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    OUT_FILE.write_text(f"globalThis.FLOOD_DASHBOARD_DATA = {json_text};\n", encoding="utf-8")
    print(f"Wrote {OUT_FILE} ({OUT_FILE.stat().st_size:,} bytes)")
    print(f"Regions: {payload['sources']['regionCount']}, dates: {payload['sources']['dateCount']}")


if __name__ == "__main__":
    main()
