from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable


class RiskFileRepository:
    def __init__(self, processed_dir: Path | str, web_dir: Path | str | None = None):
        self.processed_dir = Path(processed_dir)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.web_dir = Path(web_dir) if web_dir is not None else Path.cwd()

    def _json_path(self, name: str) -> Path:
        return self.processed_dir / f"{name}.json"

    def _js_path(self, name: str) -> Path:
        return self.web_dir / f"{name.replace('_', '-')}.js"

    def _read_list(self, name: str) -> list[dict]:
        path = self._json_path(name)
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))

    def _write(self, name: str, payload: list[dict], global_name: str) -> None:
        self._json_path(name).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        js_payload = {"status": "ready", "rows": payload}
        self._js_path(name).write_text(
            f"globalThis.{global_name} = {json.dumps(js_payload, ensure_ascii=False, separators=(',', ':'))};\n",
            encoding="utf-8",
        )

    def save_latest(self, rows: Iterable[dict]) -> None:
        latest = {}
        for row in self._read_list("risk_latest"):
            latest[row["grid_id"]] = row
        for row in rows:
            previous = latest.get(row["grid_id"], {})
            row = dict(row)
            row["previous_risk_score"] = previous.get("risk_score")
            row["score_delta"] = round(row["risk_score"] - float(previous.get("risk_score", row["risk_score"])), 2)
            latest[row["grid_id"]] = row
        ordered = sorted(latest.values(), key=lambda item: item["risk_score"], reverse=True)
        self._write("risk_latest", ordered, "RISK_LATEST")

    def append_history(self, rows: Iterable[dict]) -> None:
        history = self._read_list("risk_history")
        for row in rows:
            history.append(
                {
                    "id": f"{row['batch_id']}:{row['grid_id']}",
                    "grid_id": row["grid_id"],
                    "sido": row.get("sido", ""),
                    "sigungu": row.get("sigungu", ""),
                    "risk_score": row["risk_score"],
                    "risk_level": row["risk_level"],
                    "calculated_at": row["calculated_at"],
                    "batch_id": row["batch_id"],
                }
            )
        self._write("risk_history", history[-1000:], "RISK_HISTORY")

    def append_features(self, rows: Iterable[dict]) -> None:
        features = self._read_list("risk_feature")
        for row in rows:
            features.append(
                {
                    "id": f"{row['batch_id']}:{row['grid_id']}",
                    "grid_id": row["grid_id"],
                    "sido": row.get("sido", ""),
                    "sigungu": row.get("sigungu", ""),
                    "calculated_at": row["calculated_at"],
                    "batch_id": row["batch_id"],
                    **row["features"],
                }
            )
        self._write("risk_feature", features[-1000:], "RISK_FEATURE")

    def save_batch(self, rows: Iterable[dict]) -> None:
        materialized = list(rows)
        self.save_latest(materialized)
        self.append_history(materialized)
        self.append_features(materialized)
