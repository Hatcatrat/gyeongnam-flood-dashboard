const DATA = window.FLOOD_DASHBOARD_DATA;

const state = {
  selectedCode: "ALL",
  rainWeight: 55,
};

const el = {
  sourceSummary: document.querySelector("#sourceSummary"),
  regionSelect: document.querySelector("#regionSelect"),
  rainWeight: document.querySelector("#rainWeight"),
  rainWeightLabel: document.querySelector("#rainWeightLabel"),
  primaryLabel: document.querySelector("#primaryLabel"),
  primaryRegion: document.querySelector("#primaryRegion"),
  primaryCode: document.querySelector("#primaryCode"),
  riskScore: document.querySelector("#riskScore"),
  riskGrade: document.querySelector("#riskGrade"),
  rainScore: document.querySelector("#rainScore"),
  rainMetric: document.querySelector("#rainMetric"),
  floodScore: document.querySelector("#floodScore"),
  floodMetric: document.querySelector("#floodMetric"),
  rankCaption: document.querySelector("#rankCaption"),
  monthlyCaption: document.querySelector("#monthlyCaption"),
  dailyCaption: document.querySelector("#dailyCaption"),
  frequencyCaption: document.querySelector("#frequencyCaption"),
  riskTiles: document.querySelector("#riskTiles"),
  monthlyChart: document.querySelector("#monthlyChart"),
  dailyChart: document.querySelector("#dailyChart"),
  frequencyChart: document.querySelector("#frequencyChart"),
  riverChart: document.querySelector("#riverChart"),
  tableCaption: document.querySelector("#tableCaption"),
  resultRows: document.querySelector("#resultRows"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatScore(value) {
  return (value * 100).toFixed(1);
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function riskLabel(score) {
  if (score >= 0.82) return "매우 높음";
  if (score >= 0.68) return "높음";
  if (score >= 0.52) return "주의";
  return "낮음";
}

function tileColor(score, rank) {
  if (rank === 1 || score >= 0.86) return ["#d84c3f", "#ffffff", "rgba(255,255,255,0.78)"];
  if (score >= 0.72) return ["#d9961c", "#1e2420", "rgba(30,36,32,0.68)"];
  if (score >= 0.58) return ["#5d9f78", "#ffffff", "rgba(255,255,255,0.76)"];
  return ["#12805d", "#ffffff", "rgba(255,255,255,0.74)"];
}

function tileClass(index) {
  if (index === 0) return "rank-1";
  if (index === 1) return "rank-2";
  if (index === 2) return "rank-3";
  return "";
}

function scoredRegions() {
  const rainWeight = state.rainWeight / 100;
  const floodWeight = 1 - rainWeight;
  return DATA.regions
    .map((region) => ({
      ...region,
      riskScore: region.rainScore * rainWeight + region.floodProxyScore * floodWeight,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}

function selectedRegion(scored) {
  if (state.selectedCode === "ALL") return scored[0];
  return scored.find((region) => region.code === state.selectedCode) || scored[0];
}

function selectedSeries(region) {
  if (state.selectedCode === "ALL") {
    return {
      monthly: DATA.overall.monthly,
      dailyTop: DATA.overall.dailyTop,
      label: "전체 경남",
    };
  }
  return {
    monthly: region.monthly,
    dailyTop: region.dailyTop,
    label: region.name,
  };
}

function renderRegionOptions() {
  el.regionSelect.innerHTML = [
    `<option value="ALL">전체 경남</option>`,
    ...DATA.regions
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .map((region) => `<option value="${region.code}">${escapeHtml(region.name)} (${region.code})</option>`),
  ].join("");
  el.regionSelect.value = state.selectedCode;
}

function renderSummary(scored, region) {
  const label = state.selectedCode === "ALL" ? "최고 위험 지역" : "선택 지역";
  el.primaryLabel.textContent = label;
  el.primaryRegion.textContent = region.name;
  el.primaryCode.textContent = `${region.code} · ${region.sigungu}`;
  el.riskScore.textContent = formatScore(region.riskScore);
  el.riskGrade.textContent = riskLabel(region.riskScore);
  el.rainScore.textContent = formatScore(region.rainScore);
  el.rainMetric.textContent = `누적 ${formatNumber(region.totalRain, 1)}mm · 최대시간 ${formatNumber(region.maxHourly, 1)}mm`;
  el.floodScore.textContent = formatScore(region.floodProxyScore);
  el.floodMetric.textContent = `최대일 ${formatNumber(region.maxDaily, 1)}mm · 50mm+ ${region.heavy50}회`;

  el.sourceSummary.textContent =
    `${DATA.dateRange.start}~${DATA.dateRange.end} 강수 ${formatNumber(DATA.recordCounts.rain)}건, ` +
    `지역 ${DATA.recordCounts.regions}개, 홍수범람구역 ${formatNumber(DATA.recordCounts.floodZones)}개를 반영했습니다.`;
  el.rainWeightLabel.textContent = `${state.rainWeight}%`;
  el.rankCaption.textContent = `${state.selectedCode === "ALL" ? "전체 경남" : region.name} 기준 · 강수 ${state.rainWeight}% / 범람노출 ${100 - state.rainWeight}%`;
  el.tableCaption.textContent = `전체 ${scored.length}개 지역 위험 점수 내림차순`;
}

function renderTiles(scored) {
  const rows = state.selectedCode === "ALL" ? scored.slice(0, 10) : scored.filter((row) => row.code === state.selectedCode);
  el.riskTiles.innerHTML = rows
    .map((region, index) => {
      const rank = scored.findIndex((item) => item.code === region.code) + 1;
      const [bg, fg, muted] = tileColor(region.riskScore, rank);
      return `
        <article class="risk-tile ${tileClass(index)}" style="--tile-bg:${bg};--tile-fg:${fg};--tile-muted:${muted};">
          <div class="tile-name">
            <span class="tile-rank">${rank}</span>
            <strong>${escapeHtml(region.name)}</strong>
            <span>${region.code}</span>
          </div>
          <div class="tile-score">
            <span class="tile-meta">최대일 ${formatNumber(region.maxDaily, 1)}mm</span>
            <strong>${formatScore(region.riskScore)}</strong>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTable(scored) {
  el.resultRows.innerHTML = scored
    .map(
      (region, index) => `
        <tr>
          <td><span class="rank-pill">${index + 1}</span></td>
          <td>${escapeHtml(region.name)}</td>
          <td>${region.code}</td>
          <td class="score-cell">${formatScore(region.riskScore)}</td>
          <td>${formatScore(region.rainScore)}</td>
          <td>${formatScore(region.floodProxyScore)}</td>
          <td>${formatNumber(region.totalRain, 1)}mm</td>
          <td>${formatNumber(region.maxDaily, 1)}mm</td>
          <td>${formatNumber(region.maxHourly, 1)}mm</td>
          <td>${region.heavy30}</td>
          <td>${region.heavy50}</td>
        </tr>
      `,
    )
    .join("");
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const height = Number(canvas.getAttribute("height"));
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height };
}

function fitText(ctx, text, maxWidth) {
  const value = String(text);
  if (ctx.measureText(value).width <= maxWidth) return value;
  let clipped = value;
  while (clipped.length > 2 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}...`;
}

function drawGrid(ctx, width, top, plotHeight, left) {
  ctx.strokeStyle = "#e7ecee";
  ctx.lineWidth = 1;
  for (let step = 0; step <= 4; step += 1) {
    const y = top + plotHeight - (plotHeight * step) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
  }
}

function drawVerticalBars(canvas, items, options = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  const left = options.left || 46;
  const top = 18;
  const bottom = options.bottom || 58;
  const plotWidth = width - left - 12;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const gap = options.gap || 10;
  const barWidth = Math.max(10, (plotWidth - gap * (items.length - 1)) / Math.max(items.length, 1));

  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, top, plotHeight, left);
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "center";

  items.forEach((item, index) => {
    const x = left + index * (barWidth + gap);
    const barHeight = (item.value / maxValue) * plotHeight;
    const y = top + plotHeight - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, top + plotHeight);
    gradient.addColorStop(0, item.color || "#12805d");
    gradient.addColorStop(1, item.fade || "#dcefe9");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#172022";
    ctx.font = "700 12px Segoe UI, sans-serif";
    if (barWidth > 24) ctx.fillText(formatNumber(item.value, options.digits || 0), x + barWidth / 2, y - 7);
    ctx.fillStyle = "#627174";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(fitText(ctx, item.label, barWidth + 10), x + barWidth / 2, top + plotHeight + 22);
  });
}

function drawHorizontalBars(canvas, items, options = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  const left = options.left || 128;
  const right = options.right || 64;
  const top = 8;
  const rowHeight = Math.max(24, (height - 18) / Math.max(items.length, 1));
  const plotWidth = width - left - right;
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Segoe UI, sans-serif";

  items.forEach((item, index) => {
    const y = top + index * rowHeight;
    const barWidth = (plotWidth * item.value) / maxValue;
    ctx.fillStyle = "#627174";
    ctx.textAlign = "right";
    ctx.fillText(fitText(ctx, item.label, left - 18), left - 12, y + rowHeight * 0.58);
    ctx.fillStyle = item.color || "#12805d";
    ctx.fillRect(left, y + 5, barWidth, Math.max(10, rowHeight - 13));
    ctx.fillStyle = "#172022";
    ctx.textAlign = "left";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.fillText(formatNumber(item.value, options.digits || 0), left + barWidth + 8, y + rowHeight * 0.58);
    ctx.font = "12px Segoe UI, sans-serif";
  });
}

function renderCharts(region) {
  const series = selectedSeries(region);
  el.monthlyCaption.textContent = `${series.label} 기준 월별 강수량 합계`;
  el.dailyCaption.textContent = `${series.label} 기준 강수량 상위 날짜`;
  el.frequencyCaption.textContent =
    `전체 ${formatNumber(DATA.flood.totalZones)}개 구역 중 50년 빈도 이하 ${formatNumber(DATA.flood.lowFrequencyZones)}개`;

  drawVerticalBars(
    el.monthlyChart,
    series.monthly.map((item) => ({
      label: item.month,
      value: item.rain,
      color: item.month === "7월" || item.month === "8월" ? "#d84c3f" : "#12805d",
      fade: item.month === "7월" || item.month === "8월" ? "#f6d7d2" : "#dcefe9",
    })),
    { digits: 0 },
  );

  drawHorizontalBars(
    el.dailyChart,
    series.dailyTop.map((item) => ({ label: item.date.slice(5), value: item.rain, color: "#315f72" })),
    { left: 68, digits: 1 },
  );

  drawVerticalBars(
    el.frequencyChart,
    DATA.flood.frequencyCounts.map((item) => ({
      label: `${item.frequency}년`,
      value: item.count,
      color: item.frequency <= 50 ? "#d84c3f" : "#12805d",
      fade: item.frequency <= 50 ? "#f6d7d2" : "#dcefe9",
    })),
    { digits: 0 },
  );

  drawHorizontalBars(
    el.riverChart,
    DATA.flood.riverRiskTop.slice(0, 10).map((item) => ({
      label: item.riverCode.slice(0, 12),
      value: item.weightedScore,
      color: item.minFrequency <= 50 ? "#d84c3f" : "#d9961c",
    })),
    { left: 112, digits: 0 },
  );
}

function render() {
  const scored = scoredRegions();
  const region = selectedRegion(scored);
  renderSummary(scored, region);
  renderTiles(scored);
  renderCharts(region);
  renderTable(scored);
}

renderRegionOptions();
render();

el.regionSelect.addEventListener("change", (event) => {
  state.selectedCode = event.target.value;
  render();
});

el.rainWeight.addEventListener("input", (event) => {
  state.rainWeight = Number(event.target.value);
  render();
});

window.addEventListener("resize", () => {
  window.requestAnimationFrame(render);
});
