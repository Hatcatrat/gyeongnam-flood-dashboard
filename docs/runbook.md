# Runbook

## 1. 배치 실행

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

## 5. 기상 보정

웹 대시보드는 지역별 강수 특성과 위험 점수 순위를 반영해 기상 보정값을 갱신하고 위험점수에 반영한다.
