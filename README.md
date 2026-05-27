# 경남 홍수 범람 위험 지역 대시보드

경상남도 강수량, 2024년 강수량, 행정동코드, 홍수범람구역 CSV를 종합해 지역별 홍수 범람 위험 점수를 계산하고 시각화하는 정적 웹 대시보드입니다.

## 주요 기능

- 행정동코드 기준 22개 지역 위험점수 산출
- 위험점수가 높은 지역은 큰 빨간 타일, 낮은 지역은 작은 녹색 타일로 표시
- 지역 선택 후 월별 강수량, 날짜별 강수량 바 차트 확인
- 2024년, 상위 강수일, 최근 관측일 등 날짜별 보기 전환
- 홍수범람구역 빈도 분포와 주요 하천관리코드 현황 표시
- 기상청 초단기실황조회 연동으로 현재 1시간 강수량을 위험점수에 보정
- PySpark RDD 분석 증거 패널 표시

## 반영 데이터

- `강수량.csv`
- `강수량_20240930.csv`
- `행정동코드.csv`
- `경상남도_행정동코드.csv`
- `5. rim022.csv`

홍수범람구역 CSV에는 행정동코드가 직접 포함되어 있지 않아, 지역별 점수에는 강수 극값과 관측 패턴을 중심으로 반영하고 범람구역 빈도는 경남 전체 보정값 및 별도 현황 그래프로 함께 표시합니다.

## 데이터 갱신

원본 CSV가 바뀌면 아래 명령으로 `dashboard-data.js`를 다시 생성합니다.

```bash
python scripts/build_data.py
```

기상청 실시간 파일은 `KMA_SERVICE_KEY` 환경변수를 설정한 뒤 생성합니다.

```bash
python scripts/fetch_kma_weather.py
```

PySpark RDD 분석 증거 파일은 PySpark가 설치된 환경에서 생성합니다.

```bash
python -m pip install pyspark
python scripts/build_spark_summary.py
```

## 로컬 실행

```bash
npm start
```

브라우저에서 `http://localhost:8000`을 열면 됩니다.

## 배포

GitHub Pages는 `gh-pages` 브랜치의 루트 경로를 사용합니다.

저장소 Settings > Secrets and variables > Actions에 `KMA_SERVICE_KEY`를 추가하면 GitHub Actions가 30분마다 `live-weather.js`와 `spark-evidence.js`를 갱신합니다.

배포 주소: https://hatcatrat.github.io/gyeongnam-flood-dashboard/
