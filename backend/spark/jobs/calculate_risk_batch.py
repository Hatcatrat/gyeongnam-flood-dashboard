from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

from backend.app.repositories.file_repository import RiskFileRepository
from backend.spark.rdd import risk_score_engine
from backend.spark.utils.local_rdd import LocalRDD


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SAMPLE_DIR = ROOT / "data" / "sample"
DEFAULT_PROCESSED_DIR = ROOT / "data" / "processed"
SPARK_EVIDENCE_FILE = ROOT / "spark-evidence.js"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("risk_batch")


def read_csv_rows(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def local_rdd(rows: list[dict], partitions: int = 4) -> LocalRDD:
    return LocalRDD(rows, partitions=partitions)


def load_with_local(input_dir: Path):
    return {
        "engine": "local-rdd-compat",
        "weather": local_rdd(read_csv_rows(input_dir / "weather_sample.csv")),
        "water": local_rdd(read_csv_rows(input_dir / "water_level_sample.csv")),
        "flood": local_rdd(read_csv_rows(input_dir / "flood_history_sample.csv")),
        "terrain": local_rdd(read_csv_rows(input_dir / "terrain_sample.csv")),
        "partitions": 4,
    }


def load_with_spark(input_dir: Path):
    from pyspark.sql import SparkSession

    spark = (
        SparkSession.builder.appName("gyeongnam-flood-risk-batch")
        .master("local[*]")
        .config("spark.ui.enabled", "false")
        .config("spark.driver.bindAddress", "127.0.0.1")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    def load(name: str):
        return spark.read.option("header", True).option("inferSchema", True).csv(str(input_dir / name)).rdd.map(
            lambda row: row.asDict(recursive=True)
        )

    weather = load("weather_sample.csv")
    return {
        "engine": "spark-rdd",
        "spark": spark,
        "weather": weather,
        "water": load("water_level_sample.csv"),
        "flood": load("flood_history_sample.csv"),
        "terrain": load("terrain_sample.csv"),
        "partitions": weather.getNumPartitions(),
    }


def load_inputs(input_dir: Path, engine: str):
    if engine == "local":
        return load_with_local(input_dir)
    if engine == "spark":
        return load_with_spark(input_dir)
    try:
        return load_with_spark(input_dir)
    except ModuleNotFoundError:
        logger.warning("pyspark is not installed; using local RDD-compatible adapter for sample execution.")
        return load_with_local(input_dir)


def write_spark_evidence(rows: list[dict], *, engine: str, partitions: int, runtime_seconds: float) -> None:
    top = max(rows, key=lambda row: row["risk_score"])
    payload = {
        "status": "ready",
        "engine": "Apache Spark / PySpark RDD" if engine == "spark-rdd" else "Local RDD-compatible sample run",
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "source": "risk_latest/risk_history/risk_feature batch",
        "totalInputRows": len(rows),
        "partitions": partitions,
        "runtimeSeconds": round(runtime_seconds, 3),
        "topRainRegion": {
            "code": top["grid_id"],
            "name": top.get("sigungu", top["grid_id"]),
            "totalRain": top["features"].get("rain_3h", 0),
        },
        "rddOperations": ["map", "filter", "reduceByKey", "join", "mapValues", "takeOrdered"],
    }
    SPARK_EVIDENCE_FILE.write_text(
        f"globalThis.SPARK_EVIDENCE = {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )


def run_batch(input_dir: Path, output_dir: Path, engine: str, batch_id: str | None = None) -> list[dict]:
    started = datetime.now()
    batch_id = batch_id or started.strftime("batch-%Y%m%d%H%M%S")
    loaded = load_inputs(input_dir, engine)
    logger.info("running risk batch with %s", loaded["engine"])
    result_rdd = risk_score_engine.calculate_from_source_rdds(
        loaded["weather"],
        loaded["water"],
        loaded["flood"],
        loaded["terrain"],
        batch_id=batch_id,
        calculated_at=started.isoformat(timespec="seconds"),
    )
    rows = sorted(result_rdd.collect(), key=lambda row: row["risk_score"], reverse=True)
    RiskFileRepository(output_dir).save_batch(rows)
    runtime = (datetime.now() - started).total_seconds()
    write_spark_evidence(rows, engine=loaded["engine"], partitions=loaded["partitions"], runtime_seconds=runtime)
    if spark := loaded.get("spark"):
        spark.stop()
    logger.info("batch %s wrote %d risk rows in %.2fs", batch_id, len(rows), runtime)
    return rows


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Calculate flood risk scores with Spark RDD operations.")
    parser.add_argument("--input", type=Path, default=DEFAULT_SAMPLE_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_PROCESSED_DIR)
    parser.add_argument("--engine", choices=["auto", "spark", "local"], default="auto")
    parser.add_argument("--batch-id", default=None)
    args = parser.parse_args(argv)

    if not args.input.exists():
        sys.exit(f"input directory not found: {args.input}")
    run_batch(args.input, args.output, args.engine, args.batch_id)


if __name__ == "__main__":
    main()
