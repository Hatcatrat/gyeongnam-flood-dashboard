const SAMPLE_ROWS = [
  {
    region: "거제시",
    adminName: "장목면",
    adminCode: "4831039000",
    totalRain: 5612.4,
    maxHourly: 74.2,
    heavy30: 27,
    heavy50: 5,
    recentRain: 1542.8,
    flood10: 84,
    flood20: 56,
    flood30: 38,
    flood50: 24,
    riverCode: "20244802013F01Q0101",
  },
  {
    region: "거제시",
    adminName: "일운면",
    adminCode: "4831031000",
    totalRain: 5318.9,
    maxHourly: 69.4,
    heavy30: 25,
    heavy50: 4,
    recentRain: 1498.5,
    flood10: 52,
    flood20: 44,
    flood30: 31,
    flood50: 18,
    riverCode: "20244802013F01Q0101",
  },
  {
    region: "남해군",
    adminName: "남해읍",
    adminCode: "4884025000",
    totalRain: 5486.2,
    maxHourly: 70.1,
    heavy30: 26,
    heavy50: 5,
    recentRain: 1516.7,
    flood10: 61,
    flood20: 47,
    flood30: 29,
    flood50: 22,
    riverCode: "20235102019F02Q0101",
  },
  {
    region: "남해군",
    adminName: "창선면",
    adminCode: "4884038000",
    totalRain: 5202.8,
    maxHourly: 65.3,
    heavy30: 22,
    heavy50: 4,
    recentRain: 1444.3,
    flood10: 48,
    flood20: 35,
    flood30: 28,
    flood50: 19,
    riverCode: "20235102019F02Q0101",
  },
  {
    region: "산청군",
    adminName: "산청읍",
    adminCode: "4886025000",
    totalRain: 4978.4,
    maxHourly: 76.5,
    heavy30: 21,
    heavy50: 4,
    recentRain: 1385.2,
    flood10: 42,
    flood20: 38,
    flood30: 27,
    flood50: 20,
    riverCode: "20234202019F01Q0101",
  },
  {
    region: "의령군",
    adminName: "의령읍",
    adminCode: "4872025000",
    totalRain: 4516.6,
    maxHourly: 79.0,
    heavy30: 18,
    heavy50: 4,
    recentRain: 1264.8,
    flood10: 39,
    flood20: 31,
    flood30: 25,
    flood50: 18,
    riverCode: "20234202019F01Q0101",
  },
  {
    region: "하동군",
    adminName: "하동읍",
    adminCode: "4885025000",
    totalRain: 4824.1,
    maxHourly: 66.8,
    heavy30: 20,
    heavy50: 3,
    recentRain: 1312.5,
    flood10: 57,
    flood20: 41,
    flood30: 32,
    flood50: 21,
    riverCode: "20249402013F01Q0101",
  },
  {
    region: "김해시",
    adminName: "진영읍",
    adminCode: "4825025000",
    totalRain: 4242.9,
    maxHourly: 61.2,
    heavy30: 17,
    heavy50: 3,
    recentRain: 1198.2,
    flood10: 68,
    flood20: 52,
    flood30: 37,
    flood50: 26,
    riverCode: "20246402010F01Q0101",
  },
  {
    region: "밀양시",
    adminName: "삼랑진읍",
    adminCode: "4827025000",
    totalRain: 3988.2,
    maxHourly: 62.7,
    heavy30: 15,
    heavy50: 3,
    recentRain: 1124.3,
    flood10: 43,
    flood20: 33,
    flood30: 29,
    flood50: 18,
    riverCode: "20246402010F01Q0101",
  },
  {
    region: "창원시",
    adminName: "북면",
    adminCode: "4812131000",
    totalRain: 3875.6,
    maxHourly: 59.4,
    heavy30: 14,
    heavy50: 2,
    recentRain: 1076.9,
    flood10: 36,
    flood20: 28,
    flood30: 22,
    flood50: 17,
    riverCode: "20244802013F01Q0101",
  },
  {
    region: "함안군",
    adminName: "칠원읍",
    adminCode: "4873025300",
    totalRain: 3662.1,
    maxHourly: 57.9,
    heavy30: 13,
    heavy50: 2,
    recentRain: 1022.4,
    flood10: 45,
    flood20: 36,
    flood30: 26,
    flood50: 20,
    riverCode: "20235102019F02Q0101",
  },
  {
    region: "합천군",
    adminName: "합천읍",
    adminCode: "4889025000",
    totalRain: 3424.7,
    maxHourly: 55.8,
    heavy30: 12,
    heavy50: 2,
    recentRain: 984.6,
    flood10: 34,
    flood20: 27,
    flood30: 20,
    flood50: 15,
    riverCode: "20249402013F01Q0101",
  },
];

const state = {
  selectedRegion: "전체 경남",
  rainWeight: 55,
};

const el = {
  regionSelect: document.querySelector("#regionSelect"),
  rainWeight: document.querySelector("#rainWeight"),
  rainWeightLabel: document.querySelector("#rainWeightLabel"),
  riskTiles: document.querySelector("#riskTiles"),
  tileCaption: document.querySelector("#tileCaption"),
  topAdminCode: document.querySelector("#topAdminCode"),
  topAdminName: document.querySelector("#topAdminName"),
  topScore: document.querySelector("#topScore"),
  riskGrade: document.querySelector("#riskGrade"),
  rainScore: document.querySelector("#rainScore"),
  floodScore: document.querySelector("#floodScore"),
  rainBar: document.querySelector("#rainBar"),
  floodBar: document.querySelector("#floodBar"),
  riskSignal: document.querySelector("#riskSignal"),
  rankBars: document.querySelector("#rankBars"),
  tableCaption: document.querySelector("#tableCaption"),
  resultRows: document.querySelector("#resultRows"),
};

function numberValue(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function maxOf(rows, key) {
  const value = Math.max(...rows.map((row) => numberValue(row[key])), 0);
  return value > 0 ? value : 1;
}

function normalize(value, max) {
  return Math.min(numberValue(value) / max, 1);
}

function scoreRows(rows) {
  const max = {
    totalRain: maxOf(rows, "totalRain"),
    maxHourly: maxOf(rows, "maxHourly"),
    heavy30: maxOf(rows, "heavy30"),
    recentRain: maxOf(rows, "recentRain"),
  };

  const floodRows = rows.map((row) => ({
    ...row,
    floodRaw:
      numberValue(row.flood10) * 5 +
      numberValue(row.flood20) * 4.5 +
      numberValue(row.flood30) * 4 +
      numberValue(row.flood50) * 3,
  }));
  const maxFloodRaw = Math.max(...floodRows.map((row) => row.floodRaw), 0) || 1;
  const rainWeight = state.rainWeight / 100;
  const floodWeight = 1 - rainWeight;

  return floodRows
    .map((row) => {
      const rainScore =
        normalize(row.totalRain, max.totalRain) * 0.35 +
        normalize(row.maxHourly, max.maxHourly) * 0.3 +
        normalize(row.heavy30, max.heavy30) * 0.25 +
        normalize(row.recentRain, max.recentRain) * 0.1;
      const floodScore = normalize(row.floodRaw, maxFloodRaw);

      return {
        ...row,
        rainScore,
        floodScore,
        finalScore: rainScore * rainWeight + floodScore * floodWeight,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

function filteredRows(rows) {
  if (state.selectedRegion === "전체 경남") return rows;
  return rows.filter((row) => row.region === state.selectedRegion);
}

function formatScore(value) {
  return (value * 100).toFixed(1);
}

function riskLabel(score) {
  if (score >= 0.82) return "매우 높음";
  if (score >= 0.68) return "높음";
  if (score >= 0.52) return "주의";
  return "낮음";
}

function tileColor(score, rank) {
  if (rank === 1 || score >= 0.9) {
    return ["#d84c3f", "#ffffff", "rgba(255,255,255,0.78)"];
  }
  if (score >= 0.76) {
    return ["#d9961c", "#1e2420", "rgba(30,36,32,0.68)"];
  }
  if (score >= 0.62) {
    return ["#5d9f78", "#ffffff", "rgba(255,255,255,0.76)"];
  }
  return ["#14815f", "#ffffff", "rgba(255,255,255,0.74)"];
}

function tileClass(index) {
  if (index === 0) return "rank-1";
  if (index === 1) return "rank-2";
  if (index === 2) return "rank-3";
  if (index === 3) return "rank-4";
  return "";
}

function renderRegionOptions() {
  const regions = ["전체 경남", ...new Set(SAMPLE_ROWS.map((row) => row.region).sort())];
  el.regionSelect.innerHTML = regions
    .map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`)
    .join("");
  el.regionSelect.value = state.selectedRegion;
}

function renderTiles(rows) {
  el.riskTiles.innerHTML = rows
    .map((row, index) => {
      const rank = index + 1;
      const [bg, fg, muted] = tileColor(row.finalScore, rank);
      return `
        <article
          class="risk-tile ${tileClass(index)}"
          style="--tile-bg:${bg};--tile-fg:${fg};--tile-muted:${muted};"
          aria-label="${escapeHtml(`${rank}위 ${row.region} ${row.adminName} 위험점수 ${formatScore(row.finalScore)}`)}"
        >
          <div class="tile-name">
            <span class="tile-rank">${rank}</span>
            <strong>${escapeHtml(row.adminName)}</strong>
            <span>${escapeHtml(row.region)} · ${escapeHtml(row.adminCode)}</span>
          </div>
          <div class="tile-score">
            <span class="tile-meta">10년 빈도 ${row.flood10}개</span>
            <strong>${formatScore(row.finalScore)}</strong>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSummary(rows) {
  const top = rows[0];
  if (!top) return;

  el.topAdminCode.textContent = top.adminCode;
  el.topAdminName.textContent = `${top.region} ${top.adminName}`;
  el.topScore.textContent = formatScore(top.finalScore);
  el.riskGrade.textContent = riskLabel(top.finalScore);
  el.rainScore.textContent = formatScore(top.rainScore);
  el.floodScore.textContent = formatScore(top.floodScore);
  el.rainBar.style.width = `${Math.round(top.rainScore * 100)}%`;
  el.floodBar.style.width = `${Math.round(top.floodScore * 100)}%`;
  el.riskSignal.textContent = `${top.heavy30}회 집중호우, 하천관리코드 ${top.riverCode}가 함께 관측된 우선 점검 후보입니다.`;
}

function renderRankBars(rows) {
  const maxScore = rows[0]?.finalScore || 1;
  el.rankBars.innerHTML = rows
    .slice(0, 5)
    .map((row, index) => {
      const [color] = tileColor(row.finalScore, index + 1);
      const width = Math.max(8, Math.round((row.finalScore / maxScore) * 100));
      return `
        <div class="rank-bar">
          <span class="bar-label">${escapeHtml(row.adminName)}</span>
          <span class="rank-track"><i style="width:${width}%;--bar-color:${color};"></i></span>
          <span class="bar-score">${formatScore(row.finalScore)}</span>
        </div>
      `;
    })
    .join("");
}

function renderTable(rows) {
  el.resultRows.innerHTML = rows
    .map(
      (row, index) => `
        <tr>
          <td><span class="rank-pill">${index + 1}</span></td>
          <td>${escapeHtml(row.region)}</td>
          <td>${escapeHtml(row.adminName)}</td>
          <td>${escapeHtml(row.adminCode)}</td>
          <td class="score-cell">${formatScore(row.finalScore)}</td>
          <td>${formatScore(row.rainScore)}</td>
          <td>${formatScore(row.floodScore)}</td>
          <td>${escapeHtml(row.riverCode)}</td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  renderRegionOptions();
  el.rainWeightLabel.textContent = `${state.rainWeight}%`;

  const scored = scoreRows(SAMPLE_ROWS);
  const rows = filteredRows(scored);

  el.tileCaption.textContent = `${state.selectedRegion} 기준 · ${rows.length}개 행정동 위험 점수 비교`;
  el.tableCaption.textContent = `${state.selectedRegion} 기준 위험 점수 내림차순`;

  renderTiles(rows);
  renderSummary(rows);
  renderRankBars(rows);
  renderTable(rows);
}

el.regionSelect.addEventListener("change", (event) => {
  state.selectedRegion = event.target.value;
  render();
});

el.rainWeight.addEventListener("input", (event) => {
  state.rainWeight = Number(event.target.value);
  render();
});

render();
