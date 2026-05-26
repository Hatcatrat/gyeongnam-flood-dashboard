# 경남 홍수 범람 위험 지역 대시보드

경남 홍수 범람 노출 분석 프로젝트를 바탕으로 행정동별 위험 점수를 산출하고, 위험도가 높은 지역을 큰 빨간 타일로 표시하는 정적 웹 대시보드입니다.

## 반영 데이터

- `강수량.csv`
- `강수량_20240930.csv`
- `경상남도_행정동코드.csv`
- `행정동코드.csv`
- `5. rim022.csv`

원본 CSV는 로컬에서 `scripts/build_data.py`로 집계해 `data.js`에 반영합니다.

## 로컬 실행

```bash
npm start
```

브라우저에서 `http://localhost:8000`을 열면 됩니다.

## GitHub Pages 배포

이 프로젝트는 빌드 과정이 없는 정적 사이트입니다. GitHub Pages는 `gh-pages` 브랜치의 루트 경로를 통해 배포합니다.

- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`

배포 주소는 보통 `https://사용자명.github.io/저장소명/` 형태입니다.
