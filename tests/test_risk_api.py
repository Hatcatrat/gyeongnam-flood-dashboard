from __future__ import annotations

import unittest

from backend.app.api.risk_api import find_by_grid


class RiskApiShapeTest(unittest.TestCase):
    def test_find_by_grid_response_shape(self):
        rows = [{"grid_id": "A", "risk_score": 50}, {"grid_id": "B", "risk_score": 80}]
        result = find_by_grid(rows, "B")
        self.assertEqual(result, [{"grid_id": "B", "risk_score": 80}])


if __name__ == "__main__":
    unittest.main()
