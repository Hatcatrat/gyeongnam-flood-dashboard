from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "Desktop"

SOURCE_FILES = {
    "flood": "5. rim022.csv",
    "rain_history": "강수량.csv",
    "rain_2024": "강수량_20240930.csv",
    "admin_gyeongnam": "경상남도_행정동코드.csv",
    "admin_all": "행정동코드.csv",
}


def source_path(name: str) -> Path:
    path = DESKTOP / SOURCE_FILES[name]
    if not path.exists():
        raise FileNotFoundError(path)
    return path


def normalize(series: pd.Series) -> pd.Series:
    max_value = float(series.max()) if len(series) else 0.0
    if max_value <= 0:
        return series.astype(float) * 0
    return series.astype(float) / max_value


def clean_float(value: object) -> float:
    if pd.isna(value):
        return 0.0
    return round(float(value), 3)


def build() -> dict:
    rain_history = pd.read_csv(
        source_path("rain_history"),
        encoding="cp949",
        dtype={"행정동코드": str},
    )
    rain_2024 = pd.read_csv(
        source_path("rain_2024"),
        encoding="cp949",
        dtype={"행정동코드": str},
    )
    admin = pd.read_csv(
        source_path("admin_gyeongnam"),
        encoding="cp949",
        dtype={"행정동코드": str},
    )
    flood = pd.read_csv(
        source_path("flood"),
        encoding="cp949",
        usecols=["하천관리코드", "빈도"],
        dtype={"하천관리코드": str},
    )

    rain = pd.concat([rain_history, rain_2024], ignore_index=True)
    rain["측정일"] = pd.to_datetime(rain["측정일"], errors="coerce")
    rain["강수량"] = pd.to_numeric(rain["강수량"], errors="coerce").fillna(0)
    rain["행정동코드"] = rain["행정동코드"].astype(str).str.zfill(10)
    rain = rain.dropna(subset=["측정일"])

    admin["행정동코드"] = admin["행정동코드"].astype(str).str.zfill(10)
    admin_lookup = admin.set_index("행정동코드")[["시도", "시군구", "행정동"]].to_dict("index")

    daily = (
        rain.groupby(["행정동코드", "측정일"], as_index=False)["강수량"]
        .sum()
        .rename(columns={"강수량": "일강수량"})
    )
    daily["year"] = daily["측정일"].dt.year
    daily["month"] = daily["측정일"].dt.month
    daily["ym"] = daily["측정일"].dt.strftime("%Y-%m")
    rain["year"] = rain["측정일"].dt.year
    rain["month"] = rain["측정일"].dt.month
    rain["ym"] = rain["측정일"].dt.strftime("%Y-%m")

    summary = rain.groupby("행정동코드").agg(
        totalRain=("강수량", "sum"),
        maxHourly=("강수량", "max"),
        heavy30=("강수량", lambda s: int((s >= 30).sum())),
        heavy50=("강수량", lambda s: int((s >= 50).sum())),
        recentRain=("강수량", lambda s: float(s[rain.loc[s.index, "year"] == 2024].sum())),
        records=("강수량", "size"),
    )

    daily_summary = daily.groupby("행정동코드").agg(
        rainyDays=("일강수량", lambda s: int((s > 0).sum())),
        maxDaily=("일강수량", "max"),
    )
    summary = summary.join(daily_summary, how="left").fillna(0)

    monthly_by_region = (
        rain.groupby(["행정동코드", "month"], as_index=False)["강수량"].sum()
    )
    timeline_by_region = (
        rain.groupby(["행정동코드", "ym"], as_index=False)["강수량"].sum()
    )
    top_daily_by_region = (
        daily.sort_values(["행정동코드", "일강수량"], ascending=[True, False])
        .groupby("행정동코드")
        .head(20)
    )

    summary["rainScore"] = (
        normalize(summary["totalRain"]) * 0.35
        + normalize(summary["maxHourly"]) * 0.30
        + normalize(summary["heavy30"]) * 0.25
        + normalize(summary["recentRain"]) * 0.10
    )
    summary["floodProxyRaw"] = (
        normalize(summary["maxDaily"]) * 0.35
        + normalize(summary["heavy50"]) * 0.30
        + normalize(summary["heavy30"]) * 0.20
        + normalize(summary["maxHourly"]) * 0.15
    )
    summary["floodProxyScore"] = normalize(summary["floodProxyRaw"])
    summary["baseRiskScore"] = summary["rainScore"] * 0.55 + summary["floodProxyScore"] * 0.45
    summary = summary.sort_values("baseRiskScore", ascending=False)

    regions = []
    for code, row in summary.iterrows():
        lookup = admin_lookup.get(code, {})
        sigungu = lookup.get("시군구")
        admin_name = lookup.get("행정동")
        display_name = admin_name if isinstance(admin_name, str) and admin_name.strip() else sigungu
        if not isinstance(display_name, str) or not display_name.strip():
            display_name = code

        monthly_rows = monthly_by_region[monthly_by_region["행정동코드"] == code]
        monthly_map = {
            int(r["month"]): clean_float(r["강수량"])
            for _, r in monthly_rows.iterrows()
        }
        monthly = [
            {"month": f"{month}월", "rain": monthly_map.get(month, 0.0)}
            for month in range(1, 13)
        ]

        timeline_rows = timeline_by_region[timeline_by_region["행정동코드"] == code]
        monthly_timeline = [
            {"month": str(r["ym"]), "rain": clean_float(r["강수량"])}
            for _, r in timeline_rows.iterrows()
        ]

        daily_rows = top_daily_by_region[top_daily_by_region["행정동코드"] == code]
        daily_top = [
            {
                "date": r.측정일.strftime("%Y-%m-%d"),
                "rain": clean_float(r.일강수량),
            }
            for r in daily_rows.itertuples(index=False)
        ]

        top_day = daily_top[0]["date"] if daily_top else "-"
        regions.append(
            {
                "code": code,
                "name": display_name,
                "sido": lookup.get("시도") if isinstance(lookup.get("시도"), str) else "경상남도",
                "sigungu": sigungu if isinstance(sigungu, str) else display_name,
                "totalRain": clean_float(row["totalRain"]),
                "maxHourly": clean_float(row["maxHourly"]),
                "heavy30": int(row["heavy30"]),
                "heavy50": int(row["heavy50"]),
                "recentRain": clean_float(row["recentRain"]),
                "rainyDays": int(row["rainyDays"]),
                "maxDaily": clean_float(row["maxDaily"]),
                "topDay": top_day,
                "records": int(row["records"]),
                "rainScore": round(float(row["rainScore"]), 5),
                "floodProxyScore": round(float(row["floodProxyScore"]), 5),
                "baseRiskScore": round(float(row["baseRiskScore"]), 5),
                "monthly": monthly,
                "monthlyTimeline": monthly_timeline,
                "dailyTop": daily_top,
            }
        )

    flood["빈도"] = pd.to_numeric(flood["빈도"], errors="coerce").fillna(0).astype(int)
    weight_map = {10: 5.0, 20: 4.5, 30: 4.0, 50: 3.0, 80: 2.5, 100: 2.0, 120: 1.8, 150: 1.5, 200: 1.0}
    flood["weight"] = flood["빈도"].map(weight_map).fillna(1.0)
    flood["weighted"] = flood["weight"]

    frequency_counts = (
        flood.groupby("빈도").size().reset_index(name="count").sort_values("빈도")
    )
    river_risk = (
        flood.groupby("하천관리코드")
        .agg(zoneCount=("빈도", "size"), weightedScore=("weighted", "sum"), minFrequency=("빈도", "min"))
        .sort_values(["weightedScore", "zoneCount"], ascending=False)
        .head(20)
        .reset_index()
    )

    low_frequency = int(flood[flood["빈도"] <= 50].shape[0])
    flood_summary = {
        "totalZones": int(len(flood)),
        "lowFrequencyZones": low_frequency,
        "lowFrequencyShare": round(low_frequency / len(flood), 5),
        "weightedScore": round(float(flood["weighted"].sum()), 2),
        "frequencyCounts": [
            {"frequency": int(r["빈도"]), "count": int(r["count"])}
            for _, r in frequency_counts.iterrows()
        ],
        "riverRiskTop": [
            {
                "riverCode": str(r.하천관리코드),
                "zoneCount": int(r.zoneCount),
                "weightedScore": round(float(r.weightedScore), 1),
                "minFrequency": int(r.minFrequency),
            }
            for r in river_risk.itertuples(index=False)
        ],
        "frequencyWeights": {str(k): v for k, v in weight_map.items()},
    }

    all_daily = (
        daily.groupby("측정일", as_index=False)["일강수량"]
        .sum()
        .sort_values("일강수량", ascending=False)
        .head(20)
    )
    all_monthly = rain.groupby("month", as_index=False)["강수량"].sum()
    all_timeline = rain.groupby("ym", as_index=False)["강수량"].sum()

    return {
        "generatedAt": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sources": SOURCE_FILES,
        "dateRange": {
            "start": rain["측정일"].min().strftime("%Y-%m-%d"),
            "end": rain["측정일"].max().strftime("%Y-%m-%d"),
        },
        "recordCounts": {
            "rain": int(len(rain)),
            "rainHistory": int(len(rain_history)),
            "rain2024": int(len(rain_2024)),
            "regions": int(summary.shape[0]),
            "floodZones": int(len(flood)),
        },
        "formula": {
            "rainRisk": "0.35*누적강수량 + 0.30*최대시간강수량 + 0.25*30mm이상횟수 + 0.10*2024강수량",
            "floodProxy": "0.35*최대일강수량 + 0.30*50mm이상횟수 + 0.20*30mm이상횟수 + 0.15*최대시간강수량",
            "floodFrequency": "낮은 빈도일수록 큰 가중치(10년=5.0, 20년=4.5, 30년=4.0, 50년=3.0)",
        },
        "regions": regions,
        "overall": {
            "monthly": [
                {"month": f"{int(r['month'])}월", "rain": clean_float(r["강수량"])}
                for _, r in all_monthly.iterrows()
            ],
            "monthlyTimeline": [
                {"month": str(r["ym"]), "rain": clean_float(r["강수량"])}
                for _, r in all_timeline.iterrows()
            ],
            "dailyTop": [
                {"date": r.측정일.strftime("%Y-%m-%d"), "rain": clean_float(r.일강수량)}
                for r in all_daily.itertuples(index=False)
            ],
        },
        "flood": flood_summary,
    }


def main() -> None:
    data = build()
    output = ROOT / "data.js"
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    output.write_text(f"window.FLOOD_DASHBOARD_DATA = {payload};\n", encoding="utf-8")
    print(f"wrote {output}")
    print(f"regions: {len(data['regions'])}, rain records: {data['recordCounts']['rain']}, flood zones: {data['recordCounts']['floodZones']}")
    print("top regions:")
    for row in data["regions"][:5]:
        print(row["name"], row["code"], row["baseRiskScore"])


if __name__ == "__main__":
    main()
