from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from backend.app.repositories.file_repository import RiskFileRepository
from backend.spark.rdd import risk_score_engine
from backend.spark.utils.local_rdd import LocalRDD


class RiskScoreEngineTest(unittest.TestCase):
    def test_normalize(self):
        self.assertEqual(risk_score_engine.normalize(40, 80), 50)
        self.assertEqual(risk_score_engine.normalize(120, 80), 100)
        self.assertEqual(risk_score_engine.normalize(-1, 80), 0)

    def test_classify_risk(self):
        self.assertEqual(risk_score_engine.classify_risk(10), "LOW")
        self.assertEqual(risk_score_engine.classify_risk(40), "CAUTION")
        self.assertEqual(risk_score_engine.classify_risk(60), "WARNING")
        self.assertEqual(risk_score_engine.classify_risk(80), "DANGER")

    def test_calculate_weighted_score(self):
        score, contributions = risk_score_engine.calculate_weighted_score(
            dynamic={"rain_1h": 80, "rain_3h": 180, "water_level": 8, "water_level_diff": 1.5},
            static={"flood_history_score": 100, "slope_score": 100},
        )
        self.assertEqual(score, 100)
        self.assertAlmostEqual(contributions["rain_1h"], 30)

    def test_rdd_input_creates_risk_results(self):
        weather = LocalRDD(
            [
                {"grid_id": "A", "sido": "경상남도", "sigungu": "테스트시", "observed_at": "2026-01-01T01:00:00", "rain_1h": 80, "rain_3h": 180, "rain_10m": 20},
                {"grid_id": "B", "sido": "경상남도", "sigungu": "낮음군", "observed_at": "2026-01-01T01:00:00", "rain_1h": 1, "rain_3h": 2, "rain_10m": 0},
            ]
        )
        water = LocalRDD(
            [
                {"grid_id": "A", "observed_at": "2026-01-01T01:00:00", "water_level": 8, "water_level_diff": 1.5},
                {"grid_id": "B", "observed_at": "2026-01-01T01:00:00", "water_level": 0.5, "water_level_diff": 0},
            ]
        )
        flood = LocalRDD(
            [
                {"grid_id": "A", "flood_history_score": 100},
                {"grid_id": "B", "flood_history_score": 10},
            ]
        )
        terrain = LocalRDD(
            [
                {"grid_id": "A", "slope_score": 100},
                {"grid_id": "B", "slope_score": 10},
            ]
        )
        rows = risk_score_engine.calculate_from_source_rdds(
            weather, water, flood, terrain, batch_id="test-batch", calculated_at="2026-01-01T01:00:00"
        ).collect()
        by_id = {row["grid_id"]: row for row in rows}
        self.assertEqual(by_id["A"]["risk_level"], "DANGER")
        self.assertEqual(by_id["B"]["risk_level"], "LOW")
        self.assertIn("rain_contribution", by_id["A"]["features"])


class RepositoryTest(unittest.TestCase):
    def test_risk_latest_storage(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = RiskFileRepository(Path(tmp), web_dir=Path(tmp))
            repo.save_batch(
                [
                    {
                        "grid_id": "A",
                        "sido": "경상남도",
                        "sigungu": "테스트시",
                        "risk_score": 81.2,
                        "risk_level": "DANGER",
                        "calculated_at": "2026-01-01T01:00:00",
                        "updated_at": "2026-01-01T01:00:00",
                        "batch_id": "test",
                        "features": {
                            "rain_10m": 10,
                            "rain_1h": 50,
                            "rain_3h": 100,
                            "water_level": 5,
                            "water_level_diff": 0.5,
                            "flood_history_score": 70,
                            "slope_score": 60,
                            "rain_contribution": 40,
                            "water_level_contribution": 25,
                            "flood_history_contribution": 4,
                            "terrain_contribution": 3,
                        },
                    }
                ]
            )
            latest = (Path(tmp) / "risk_latest.json").read_text(encoding="utf-8")
            self.assertIn('"risk_level": "DANGER"', latest)


if __name__ == "__main__":
    unittest.main()
