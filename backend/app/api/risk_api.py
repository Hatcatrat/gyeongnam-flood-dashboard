from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[3]
PROCESSED_DIR = ROOT / "data" / "processed"


def read_json(name: str) -> list[dict]:
    path = PROCESSED_DIR / f"{name}.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def find_by_grid(rows: list[dict], grid_id: str) -> list[dict]:
    return [row for row in rows if str(row.get("grid_id")) == grid_id]


class RiskApiHandler(BaseHTTPRequestHandler):
    def send_json(self, payload, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.strip("/")
        parts = path.split("/")
        if path == "api/risk/latest":
            self.send_json({"rows": read_json("risk_latest")})
            return
        if len(parts) == 4 and parts[:3] == ["api", "risk", "latest"]:
            rows = find_by_grid(read_json("risk_latest"), parts[3])
            self.send_json(rows[0] if rows else {"error": "not found"}, 200 if rows else 404)
            return
        if len(parts) == 4 and parts[:3] == ["api", "risk", "history"]:
            self.send_json({"rows": find_by_grid(read_json("risk_history"), parts[3])})
            return
        if path == "api/risk/ranking":
            rows = sorted(read_json("risk_latest"), key=lambda row: row.get("risk_score", 0), reverse=True)
            self.send_json({"rows": rows[:10]})
            return
        if len(parts) == 4 and parts[:3] == ["api", "risk", "features"]:
            self.send_json({"rows": find_by_grid(read_json("risk_feature"), parts[3])})
            return
        self.send_json({"error": "not found"}, 404)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8010), RiskApiHandler)
    print("Risk API running at http://127.0.0.1:8010")
    server.serve_forever()


if __name__ == "__main__":
    main()
