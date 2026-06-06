# 경남 홍수 범람 빅데이터 위험 모니터링 대시보드

기존 CSV 기반 홍수 범람 위험 시각화를 “실시간·준실시간 데이터를 주기적으로 수집하고 Spark RDD로 지역별 위험 점수를 지속 계산해 웹 대시보드에 반영하는 빅데이터 위험 모니터링 시스템”으로 확장한 프로젝트입니다.

## 핵심 기능

- `risk_latest`, `risk_history`, `risk_feature` 저장 구조 기반 대시보드
- Spark RDD 핵심 연산(`map`, `filter`, `join`, `reduceByKey`, `mapValues`) 기반 위험 점수 계산
- 행정동코드 기준 현재 위험 지도, 위험 순위, 시간대별 변화, 원인 분해 표시
- 기상청 초단기실황조회 시연 모드 지원: ServiceKey 오류와 무관하게 발표용 실황값 생성
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

## 기상청 연동 시연 모드

GitHub Pages는 서버가 없어 API 키를 숨길 수 없습니다. 또한 공공데이터포털 ServiceKey 인코딩, 승인 상태, 호출 제한 때문에 발표 중 오류가 날 수 있습니다.

현재 대시보드는 발표 안정성을 위해 기본적으로 **시연 모드**로 동작합니다. `시연 갱신`을 누르면 선택 지역의 `risk_latest` 점수와 지역 순위를 반영한 기상청 초단기실황 형태의 강수량, 기온, 습도, 풍속 값이 생성되고 위험점수에 즉시 반영됩니다.

ServiceKey 입력칸은 선택 사항입니다. 값을 넣어도 화면은 안정적인 시연 모드로 갱신됩니다.

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
