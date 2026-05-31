# Architecture

## 발표 핵심 메시지

기존 프로젝트를 2024/2025 데이터 기반 일회성 RDD 분석에서, 실시간·준실시간 데이터를 주기적으로 수집하고 Spark RDD로 지역별 홍수 범람 위험 점수를 지속 계산해 웹 대시보드에 반영하는 빅데이터 위험 모니터링 시스템으로 발전시켰다.

## 전체 흐름

```text
기상·강우·수위·침수 이력·지형 데이터
  -> 수집기 또는 sample 파일
  -> Spark Batch Job
  -> RDD 위험 점수 엔진
  -> risk_latest / risk_history / risk_feature
  -> 정적 대시보드와 선택 API
```

## 왜 RDD인가

이 프로젝트에서 RDD는 단순한 실행 증거가 아니라 위험 점수 계산의 핵심 경로다. `backend/spark/rdd/risk_score_engine.py`는 동적 피처 RDD와 정적 피처 RDD를 `grid_id` 기준 key-value 구조로 만들고, `join`, `mapValues`, `reduceByKey`, `filter`를 사용해 지역별 위험 점수를 산출한다.

## Batch 우선, Streaming 확장

1차 목표는 안정적인 자동 갱신 배치다. `backend/spark/jobs/calculate_risk_batch.py`는 sample 또는 실제 적재 파일을 읽고 RDD 엔진을 실행해 결과 저장소를 갱신한다.

Streaming 확장은 `backend/spark/streaming/risk_streaming_job.py`에 분리했다. Structured Streaming의 `foreachBatch`에서 micro-batch DataFrame을 `.rdd`로 변환한 뒤 같은 RDD 엔진을 재사용한다.

## 저장 구조

- `risk_latest`: 현재 지도 색상과 위험 순위에 사용
- `risk_history`: 최근 1시간, 3시간, 6시간 등 시간 변화 그래프에 사용
- `risk_feature`: 위험 점수 원인 분해와 입력 피처 확인에 사용

## 위험 점수 공식

배치 분석 기본 가중치:

- `rain_1h`: 0.30
- `rain_3h`: 0.25
- `water_level`: 0.25
- `water_level_diff`: 0.10
- `flood_history_score`: 0.05
- `slope_score`: 0.05

각 피처는 0~100으로 정규화한 뒤 가중합으로 계산한다.

## 위험 단계

- `LOW`: 0 이상 40 미만
- `CAUTION`: 40 이상 60 미만
- `WARNING`: 60 이상 80 미만
- `DANGER`: 80 이상

## 실행

```bash
python -m backend.spark.jobs.calculate_risk_batch --engine auto
npm start
```
