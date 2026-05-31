# 경남 홍수 범람 빅데이터 위험 모니터링 대시보드

기존 CSV 기반 홍수 범람 위험 시각화를 “실시간·준실시간 데이터를 주기적으로 수집하고 Spark RDD로 지역별 위험 점수를 지속 계산해 웹 대시보드에 반영하는 빅데이터 위험 모니터링 시스템”으로 확장한 프로젝트입니다.

## 핵심 기능

- `risk_latest`, `risk_history`, `risk_feature` 저장 구조 기반 대시보드
- Spark RDD 핵심 연산(`map`, `filter`, `join`, `reduceByKey`, `mapValues`) 기반 위험 점수 계산
- 행정동코드 기준 현재 위험 지도, 위험 순위, 시간대별 변화, 원인 분해 표시
- 기상청 초단기실황조회 연동 준비 및 브라우저 ServiceKey 수동 갱신 지원
- API 키 없이도 실행 가능한 sample 데이터와 mock 배치 파이프라인 제공
- Structured Streaming `foreachBatch` 확장 포인트 제공

## 구조

```text
backend/
  app/api/risk_api.py
  app/repositories/file_repository.py
  spark/jobs/calculate_risk_batch.py
  spark/rdd/risk_score_engine.py
  spark/streaming/risk_streaming_job.py
data/
  sample/
  processed/
docs/
  architecture.md
  data_schema.md
tests/
```

## 로컬 실행

```bash
npm start
```

브라우저에서 `http://localhost:8000`을 엽니다.

## 샘플 데이터로 배치 실행

PySpark가 있으면 Spark RDD로 실행되고, 없으면 동일한 RDD 연산 인터페이스의 로컬 샘플 어댑터로 실행됩니다.

```bash
python -m backend.spark.jobs.calculate_risk_batch --engine auto
```

생성 파일:

- `data/processed/risk_latest.json`
- `data/processed/risk_history.json`
- `data/processed/risk_feature.json`
- `risk-latest.js`
- `risk-history.js`
- `risk-feature.js`

## PySpark 설치 후 실제 Spark RDD 실행

```bash
python -m pip install pyspark
python -m backend.spark.jobs.calculate_risk_batch --engine spark
```

## API 실행

```bash
npm run api
```

주요 엔드포인트:

- `GET /api/risk/latest`
- `GET /api/risk/latest/{grid_id}`
- `GET /api/risk/history/{grid_id}`
- `GET /api/risk/ranking`
- `GET /api/risk/features/{grid_id}`

## 기상청 연동

GitHub Pages는 서버가 없어 API 키를 숨길 수 없습니다. 공개 링크에서 실시간 값을 갱신하려면 브라우저의 `기상청 ServiceKey` 입력칸에 키를 저장하고 `실시간 갱신`을 누릅니다.

자동 갱신은 GitHub Actions Secret에 `KMA_SERVICE_KEY`를 추가하면 동작합니다.

```bash
python scripts/fetch_kma_weather.py
```

## 테스트 실행

```bash
npm test
```

또는:

```bash
python -m unittest discover -s tests
```

## 배포

GitHub Pages는 `gh-pages` 브랜치 루트를 사용합니다.

배포 주소: https://hatcatrat.github.io/gyeongnam-flood-dashboard/
