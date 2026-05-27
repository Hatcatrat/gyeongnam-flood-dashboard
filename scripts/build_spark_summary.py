from __future__ import annotations

import csv
import json
import time
from datetime import datetime
from io import StringIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "Desktop"
RAIN_FILES = [DESKTOP / "강수량.csv", DESKTOP / "강수량_20240930.csv"]
FLOOD_FILE = DESKTOP / "5. rim022.csv"
OUT_FILE = ROOT / "spark-evidence.js"
DASHBOARD_DATA = ROOT / "dashboard-data.js"


def write_payload(payload: dict) -> None:
    json_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    OUT_FILE.write_text(f"globalThis.SPARK_EVIDENCE = {json_text};\n", encoding="utf-8")


def safe_float(value: str) -> float:
    try:
        return float(str(value).replace(",", "").strip() or 0)
    except ValueError:
        return 0.0


def parse_csv_line(line: str) -> list[str]:
    return next(csv.reader(StringIO(line)))


def decode_binary_file(item: tuple[str, bytes], encoding: str) -> list[str]:
    return item[1].decode(encoding, errors="replace").splitlines()


def read_dashboard_payload() -> dict:
    text = DASHBOARD_DATA.read_text(encoding="utf-8")
    prefix = "globalThis.FLOOD_DASHBOARD_DATA = "
    if not text.startswith(prefix):
        raise ValueError("dashboard-data.js 형식을 읽을 수 없습니다.")
    return json.loads(text[len(prefix) :].rstrip(";\n"))


def build_with_pyspark() -> dict:
    from pyspark import SparkConf, SparkContext

    conf = (
        SparkConf()
        .setAppName("gyeongnam-flood-dashboard-rdd")
        .setMaster("local[*]")
        .set("spark.ui.enabled", "false")
        .set("spark.driver.bindAddress", "127.0.0.1")
    )
    sc = SparkContext.getOrCreate(conf=conf)
    sc.setLogLevel("ERROR")
    started = time.perf_counter()

    dashboard = read_dashboard_payload()
    code_names = {region["code"]: region["name"] for region in dashboard["regions"]}
    rain_paths = [str(path) for path in RAIN_FILES if path.exists()]

    if not rain_paths:
        rows = [
            (region["code"], region["name"], date, float(rain))
            for region in dashboard["regions"]
            for date, rain in zip(dashboard["dates"], region["daily"])
        ]
        rain = sc.parallelize(rows, numSlices=8).map(
            lambda row: {"code": row[0], "name": row[1], "date": row[2], "rain": row[3]}
        )
        rain_count = sum(dashboard["sources"]["rainRows"].values())
        partitions = rain.getNumPartitions()
        region_count = rain.map(lambda row: row["code"]).distinct().count()
        total_by_code = rain.map(lambda row: (row["code"], row["rain"])).reduceByKey(lambda a, b: a + b)
        heavy_hours = sum(region["heavy30Hours"] for region in dashboard["regions"])
        daily = rain.map(lambda row: ((row["code"], row["date"]), row["rain"])).reduceByKey(lambda a, b: a + b)
        max_daily = daily.takeOrdered(1, key=lambda item: -item[1])[0]
        top_total = total_by_code.takeOrdered(1, key=lambda item: -item[1])[0]
        flood_count = dashboard["flood"]["totalZones"]
        low_freq_count = dashboard["flood"]["lowFrequencyZones"]
        runtime = time.perf_counter() - started
        sc.stop()
        return {
            "status": "ready",
            "engine": "Apache Spark / PySpark RDD",
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "source": "dashboard-data-js",
            "rainRows": rain_count,
            "floodRows": flood_count,
            "totalInputRows": rain_count + flood_count,
            "rddExpandedRows": len(rows),
            "regionCount": region_count,
            "partitions": partitions,
            "runtimeSeconds": round(runtime, 3),
            "heavyRainHours30mm": heavy_hours,
            "lowFrequencyFloodZones": low_freq_count,
            "topRainRegion": {
                "code": top_total[0],
                "name": code_names.get(top_total[0], top_total[0]),
                "totalRain": round(top_total[1], 1),
            },
            "maxDailyRain": {
                "code": max_daily[0][0],
                "name": code_names.get(max_daily[0][0], max_daily[0][0]),
                "date": max_daily[0][1],
                "rain": round(max_daily[1], 1),
            },
            "rddOperations": ["parallelize", "map", "filter", "reduceByKey", "takeOrdered"],
        }

    rain_lines = (
        sc.binaryFiles(",".join(rain_paths), minPartitions=max(2, len(rain_paths) * 2))
        .flatMap(lambda item: decode_binary_file(item, "cp949"))
        .filter(lambda line: line and not line.startswith("행정동코드"))
    )

    def parse_rain(line: str):
        row = parse_csv_line(line)
        if len(row) < 4:
            return None
        return {
            "code": row[0].strip(),
            "date": row[1].strip(),
            "hour": row[2].strip(),
            "rain": safe_float(row[3]),
        }

    rain = rain_lines.map(parse_rain).filter(lambda row: row is not None and row["code"])
    rain_count = rain.count()
    partitions = rain.getNumPartitions()
    region_count = rain.map(lambda row: row["code"]).distinct().count()
    total_by_code = rain.map(lambda row: (row["code"], row["rain"])).reduceByKey(lambda a, b: a + b)
    heavy_hours = rain.filter(lambda row: row["rain"] >= 30).count()
    daily = rain.map(lambda row: ((row["code"], row["date"]), row["rain"])).reduceByKey(lambda a, b: a + b)
    max_daily = daily.takeOrdered(1, key=lambda item: -item[1])[0]
    top_total = total_by_code.takeOrdered(1, key=lambda item: -item[1])[0]

    flood_count = 0
    low_freq_count = 0
    if FLOOD_FILE.exists():
        flood_lines = (
            sc.binaryFiles(str(FLOOD_FILE), minPartitions=2)
            .flatMap(lambda item: decode_binary_file(item, "cp949"))
            .filter(lambda line: line and not line.startswith("공간아이디"))
        )

        def parse_freq(line: str) -> float:
            row = parse_csv_line(line)
            return safe_float(row[5]) if len(row) > 5 else 0.0

        flood = flood_lines.map(parse_freq)
        flood_count = flood.count()
        low_freq_count = flood.filter(lambda freq: 0 < freq <= 50).count()

    runtime = time.perf_counter() - started
    sc.stop()

    return {
        "status": "ready",
        "engine": "Apache Spark / PySpark RDD",
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "source": "raw-csv",
        "rainRows": rain_count,
        "floodRows": flood_count,
        "totalInputRows": rain_count + flood_count,
        "regionCount": region_count,
        "partitions": partitions,
        "runtimeSeconds": round(runtime, 3),
        "heavyRainHours30mm": heavy_hours,
        "lowFrequencyFloodZones": low_freq_count,
        "topRainRegion": {
            "code": top_total[0],
            "name": code_names.get(top_total[0], top_total[0]),
            "totalRain": round(top_total[1], 1),
        },
        "maxDailyRain": {
            "code": max_daily[0][0],
            "name": code_names.get(max_daily[0][0], max_daily[0][0]),
            "date": max_daily[0][1],
            "rain": round(max_daily[1], 1),
        },
        "rddOperations": ["binaryFiles", "flatMap", "map", "filter", "reduceByKey", "takeOrdered"],
    }


def main() -> None:
    try:
        payload = build_with_pyspark()
    except ModuleNotFoundError:
        payload = {
            "status": "pending",
            "engine": "Apache Spark / PySpark RDD",
            "generatedAt": None,
            "message": "pyspark 패키지가 없어 로컬 RDD 실행은 대기 중입니다.",
            "rddOperations": ["binaryFiles", "flatMap", "map", "filter", "reduceByKey", "takeOrdered"],
        }
    write_payload(payload)


if __name__ == "__main__":
    main()
