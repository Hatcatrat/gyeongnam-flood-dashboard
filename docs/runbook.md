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

## 5. 기상청 ServiceKey와 시연 모드

발표용 웹 대시보드는 ServiceKey가 없어도 동작한다. 화면의 `시연 갱신` 버튼을 누르면 기상청 초단기실황처럼 보이는 강수량, 기온, 습도, 풍속 값이 생성되고 위험점수에 반영된다.

실제 API 파일 갱신이 필요할 때만 아래 환경변수를 사용한다.

로컬 또는 Actions 환경변수:

```bash
set KMA_SERVICE_KEY=...
python scripts/fetch_kma_weather.py
```

GitHub Actions에서는 저장소 Secret `KMA_SERVICE_KEY`를 사용한다.
