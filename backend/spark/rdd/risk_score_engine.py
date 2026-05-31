from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


CONFIG_FILE = Path(__file__).resolve().parents[1] / "config" / "risk_weights.json"


def load_config(path: Path = CONFIG_FILE) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize(value: Any, max_value: float, min_value: float = 0.0) -> float:
    """Normalize a raw value into a 0~100 score."""

    raw = to_float(value)
    if max_value <= min_value:
        return 0.0
    score = ((raw - min_value) / (max_value - min_value)) * 100
    return round(max(0.0, min(100.0, score)), 4)


def classify_risk(score: Any) -> str:
    value = to_float(score)
    if value >= 80:
        return "DANGER"
    if value >= 60:
        return "WARNING"
    if value >= 40:
        return "CAUTION"
    return "LOW"


def latest_row(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    return right if str(right.get("observed_at", "")) >= str(left.get("observed_at", "")) else left


def merge_dicts(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    merged = dict(left)
    merged.update(right)
    return merged


def normalize_feature(name: str, value: Any, limits: dict[str, float]) -> float:
    if name in {"flood_history_score", "slope_score"}:
        return max(0.0, min(100.0, to_float(value)))
    return normalize(value, limits.get(name, 100))


def calculate_weighted_score(
    dynamic: dict[str, Any],
    static: dict[str, Any],
    weights: dict[str, float] | None = None,
    limits: dict[str, float] | None = None,
) -> tuple[float, dict[str, float]]:
    config = load_config()
    active_weights = weights or config["batch"]
    active_limits = limits or config["normalization"]
    features = merge_dicts(dynamic, static)
    contributions = {}
    for name, weight in active_weights.items():
        normalized = normalize_feature(name, features.get(name, 0), active_limits)
        contributions[name] = round(normalized * weight, 4)
    score = round(sum(contributions.values()), 2)
    return score, contributions


def compact_contributions(contributions: dict[str, float]) -> dict[str, float]:
    return {
        "rain_contribution": round(contributions.get("rain_10m", 0) + contributions.get("rain_1h", 0) + contributions.get("rain_3h", 0), 2),
        "water_level_contribution": round(contributions.get("water_level", 0) + contributions.get("water_level_diff", 0), 2),
        "flood_history_contribution": round(contributions.get("flood_history_score", 0), 2),
        "terrain_contribution": round(contributions.get("slope_score", 0), 2),
    }


def build_dynamic_rdd(weather_rdd, water_level_rdd):
    weather_latest = (
        weather_rdd.filter(lambda row: bool(row.get("grid_id")))
        .map(lambda row: (row["grid_id"], row))
        .reduceByKey(latest_row)
    )
    water_latest = (
        water_level_rdd.filter(lambda row: bool(row.get("grid_id")))
        .map(lambda row: (row["grid_id"], row))
        .reduceByKey(latest_row)
    )
    return weather_latest.join(water_latest).mapValues(lambda pair: merge_dicts(pair[0], pair[1]))


def build_static_rdd(flood_history_rdd, terrain_rdd):
    flood_keyed = flood_history_rdd.filter(lambda row: bool(row.get("grid_id"))).map(lambda row: (row["grid_id"], row))
    terrain_keyed = terrain_rdd.filter(lambda row: bool(row.get("grid_id"))).map(lambda row: (row["grid_id"], row))
    return flood_keyed.join(terrain_keyed).mapValues(lambda pair: merge_dicts(pair[0], pair[1]))


def calculate_from_feature_rdds(
    dynamic_rdd,
    static_rdd,
    *,
    batch_id: str,
    calculated_at: str | None = None,
    weights: dict[str, float] | None = None,
):
    calculated_at = calculated_at or datetime.now().isoformat(timespec="seconds")
    config = load_config()
    active_weights = weights or config["batch"]
    limits = config["normalization"]

    def calculate(item):
        grid_id, (dynamic, static) = item
        score, raw_contributions = calculate_weighted_score(dynamic, static, active_weights, limits)
        compact = compact_contributions(raw_contributions)
        return {
            "grid_id": grid_id,
            "sido": dynamic.get("sido") or static.get("sido", ""),
            "sigungu": dynamic.get("sigungu") or static.get("sigungu", ""),
            "risk_score": score,
            "risk_level": classify_risk(score),
            "calculated_at": calculated_at,
            "updated_at": calculated_at,
            "batch_id": batch_id,
            "features": {
                "rain_10m": to_float(dynamic.get("rain_10m")),
                "rain_1h": to_float(dynamic.get("rain_1h")),
                "rain_3h": to_float(dynamic.get("rain_3h")),
                "water_level": to_float(dynamic.get("water_level")),
                "water_level_diff": to_float(dynamic.get("water_level_diff")),
                "flood_history_score": to_float(static.get("flood_history_score")),
                "slope_score": to_float(static.get("slope_score")),
                **compact,
            },
        }

    return dynamic_rdd.join(static_rdd).filter(lambda item: item[1][0] and item[1][1]).map(calculate)


def calculate_from_source_rdds(
    weather_rdd,
    water_level_rdd,
    flood_history_rdd,
    terrain_rdd,
    *,
    batch_id: str,
    calculated_at: str | None = None,
):
    dynamic_rdd = build_dynamic_rdd(weather_rdd, water_level_rdd)
    static_rdd = build_static_rdd(flood_history_rdd, terrain_rdd)
    return calculate_from_feature_rdds(dynamic_rdd, static_rdd, batch_id=batch_id, calculated_at=calculated_at)


def calculate_risk_with_rdd(dynamic_df, static_df, *, batch_id: str = "batch") -> Any:
    """Compatibility entry point for DataFrame -> RDD risk scoring.

    This intentionally converts DataFrames to key-value RDDs and uses join and
    mapValues so that RDD is the core risk-scoring path, not a side artifact.
    """

    dynamic_rdd = dynamic_df.rdd.map(lambda row: (row["grid_id"], row.asDict(recursive=True)))
    static_rdd = static_df.rdd.map(lambda row: (row["grid_id"], row.asDict(recursive=True)))
    return calculate_from_feature_rdds(dynamic_rdd, static_rdd, batch_id=batch_id)
