from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_FILE = ROOT / "live-weather.js"
ENDPOINT = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"
KST = timezone(timedelta(hours=9))

REGION_GRID = {
    "4812100000": {"nx": 90, "ny": 77, "name": "창원시 의창구"},
    "4812300000": {"nx": 91, "ny": 76, "name": "창원시 성산구"},
    "4812500000": {"nx": 89, "ny": 76, "name": "창원시 마산합포구"},
    "4812700000": {"nx": 89, "ny": 76, "name": "창원시 마산회원구"},
    "4812900000": {"nx": 91, "ny": 75, "name": "창원시 진해구"},
    "4817000000": {"nx": 81, "ny": 75, "name": "진주시"},
    "4822000000": {"nx": 87, "ny": 68, "name": "통영시"},
    "4824000000": {"nx": 80, "ny": 71, "name": "사천시"},
    "4825000000": {"nx": 95, "ny": 77, "name": "김해시"},
    "4827000000": {"nx": 92, "ny": 83, "name": "밀양시"},
    "4831000000": {"nx": 90, "ny": 69, "name": "거제시"},
    "4833000000": {"nx": 97, "ny": 79, "name": "양산시"},
    "4872000000": {"nx": 83, "ny": 79, "name": "의령군"},
    "4873000000": {"nx": 86, "ny": 78, "name": "함안군"},
    "4874000000": {"nx": 87, "ny": 84, "name": "창녕군"},
    "4882000000": {"nx": 85, "ny": 71, "name": "고성군"},
    "4884000000": {"nx": 77, "ny": 68, "name": "남해군"},
    "4885000000": {"nx": 74, "ny": 73, "name": "하동군"},
    "4886000000": {"nx": 76, "ny": 81, "name": "산청군"},
    "4887000000": {"nx": 73, "ny": 83, "name": "함양군"},
    "4888000000": {"nx": 77, "ny": 86, "name": "거창군"},
    "4889000000": {"nx": 81, "ny": 84, "name": "합천군"},
}


def write_payload(payload: dict) -> None:
    json_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    OUT_FILE.write_text(f"globalThis.LIVE_WEATHER = {json_text};\n", encoding="utf-8")


def base_datetime() -> tuple[str, str]:
    now = datetime.now(KST)
    if now.minute < 45:
        now -= timedelta(hours=1)
    return now.strftime("%Y%m%d"), now.strftime("%H00")


def number(value: str) -> float:
    try:
        return float(str(value).strip() or 0)
    except ValueError:
        return 0.0


def fetch_region(service_key: str, code: str, grid: dict, base_date: str, base_time: str) -> dict:
    query = urllib.parse.urlencode(
        {
            "pageNo": "1",
            "numOfRows": "100",
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": grid["nx"],
            "ny": grid["ny"],
        }
    )
    url = f"{ENDPOINT}?serviceKey={urllib.parse.quote(service_key, safe='')}&{query}"
    with urllib.request.urlopen(url, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))

    header = data.get("response", {}).get("header", {})
    if header.get("resultCode") != "00":
        raise RuntimeError(header.get("resultMsg") or f"KMA resultCode={header.get('resultCode')}")

    items = data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    values = {item["category"]: item.get("obsrValue", "0") for item in items}
    return {
        "code": code,
        "name": grid["name"],
        "status": "ready",
        "source": "기상청 단기예보 초단기실황조회",
        "baseDate": base_date,
        "baseTime": base_time,
        "generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
        "temperature": number(values.get("T1H", 0)),
        "rain1h": number(values.get("RN1", 0)),
        "humidity": number(values.get("REH", 0)),
        "windSpeed": number(values.get("WSD", 0)),
        "precipitationType": str(values.get("PTY", "0")),
        "nx": grid["nx"],
        "ny": grid["ny"],
    }


def main() -> None:
    service_key = os.environ.get("KMA_SERVICE_KEY", "").strip()
    if not service_key:
        write_payload(
            {
                "status": "missing_key",
                "source": "기상청 단기예보 초단기실황조회",
                "generatedAt": None,
                "message": "KMA_SERVICE_KEY가 설정되면 실시간 기상청 초단기실황을 자동 갱신합니다.",
                "regions": [],
            }
        )
        return

    base_date, base_time = base_datetime()
    regions = []
    errors = []
    for code, grid in REGION_GRID.items():
        try:
            regions.append(fetch_region(service_key, code, grid, base_date, base_time))
            time.sleep(0.12)
        except Exception as error:  # noqa: BLE001 - keep one bad region from stopping the refresh.
            errors.append({"code": code, "name": grid["name"], "error": str(error)})

    write_payload(
        {
            "status": "ready" if regions else "error",
            "source": "기상청 단기예보 초단기실황조회",
            "generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
            "baseDate": base_date,
            "baseTime": base_time,
            "message": f"{len(regions)}개 지역 실황 갱신",
            "regions": regions,
            "errors": errors[:5],
        }
    )
    if not regions:
        sys.exit("No KMA weather rows were fetched.")


if __name__ == "__main__":
    main()
