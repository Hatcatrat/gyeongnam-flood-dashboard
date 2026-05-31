# Runbook

## 1. 샘플 배치 실행

```bash
python -m backend.spark.jobs.calculate_risk_batch --engine auto
```

## 2. Spark 강제 실행

```bash
python -m pip install pyspark
python -m backend.spark.jobs.calculate_risk_batch --engine spark
```

## 3. 대시보드 확인

```bash
npm start
```

`http://localhost:8000`에서 현재 위험 지도, 위험 순위, 위험 점수 변화, 원인 분해를 확인한다.

## 4. API 확인

```bash
npm run api
```

예:

```bash
curl http://127.0.0.1:8010/api/risk/latest
curl http://127.0.0.1:8010/api/risk/ranking
```

## 5. 기상청 ServiceKey

로컬 또는 Actions 환경변수:

```bash
set KMA_SERVICE_KEY=...
python scripts/fetch_kma_weather.py
```

GitHub Actions에서는 저장소 Secret `KMA_SERVICE_KEY`를 사용한다.
