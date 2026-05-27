const DATA = globalThis.FLOOD_DASHBOARD_DATA;

const state = {
  selectedCode: DATA.regions[0]?.code,
  dateMode: "top30",
};

const el = {
  regionSelect: document.querySelector("#regionSelect"),
  dateMode: document.querySelector("#dateMode"),
  riskTiles: document.querySelector("#riskTiles"),
  tileCaption: document.querySelector("#tileCaption"),
  selectedCode: document.querySelector("#selectedCode"),
  selectedName: document.querySelector("#selectedName"),
  finalScore: document.querySelector("#finalScore"),
  riskGrade: document.querySelector("#riskGrade"),
  rainScore: document.querySelector("#rainScore"),
  floodScore: document.querySelector("#floodScore"),
  rainBar: document.querySelector("#rainBar"),
  floodBar: document.querySelector("#floodBar"),
  riskSignal: document.querySelector("#riskSignal"),
  totalRain: document.querySelector("#totalRain"),
  maxDaily: document.querySelector("#maxDaily"),
  maxHourly: document.querySelector("#maxHourly"),
  heavyHours: document.querySelector("#heavyHours"),
  monthlyCaption: document.querySelector("#monthlyCaption"),
  dailyCaption: document.querySelector("#dailyCaption"),
  floodCaption: document.querySelector("#floodCaption"),
  monthlyChart: document.querySelector("#monthlyChart"),
  dailyChart: document.querySelector("#dailyChart"),
  floodFreqChart: document.querySelector("#floodFreqChart"),
  riverBars: document.querySelector("#riverBars"),
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

function formatNumber(value, suffix = "") {
  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${suffix}`;
}

function riskLabel(score) {
  if (score >= 70) return "매우 높음";
  if (score >= 60) return "높음";
  if (score >= 48) return "주의";
  return "낮음";
}

function tileColor(score, rank) {
  if (rank === 1 || score >= 70) return ["#d84c3f", "#ffffff", "rgba(255,255,255,0.78)"];
  if (score >= 60) return ["#d9961c", "#1d241f", "rgba(29,36,31,0.68)"];
  if (score >= 48) return ["#5d9f78", "#ffffff", "rgba(255,255,255,0.76)"];
  return ["#14815f", "#ffffff", "rgba(255,255,255,0.74)"];
}

function tileClass(index) {
  if (index === 0) return "rank-1";
  if (index === 1) return "rank-2";
  if (index === 2) return "rank-3";
  if (index === 3) return "rank-4";
  return "";
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

function drawBarChart(canvas, items, options = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  const left = options.left ?? 46;
  const top = 18;
  const bottom = options.bottom ?? 54;
  const plotWidth = width - left - 14;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const gap = items.length > 60 ? 1 : 5;
  const barWidth = Math.max(2, (plotWidth - gap * (items.length - 1)) / Math.max(items.length, 1));

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#e4ece9";
  ctx.lineWidth = 1;
  for (let step = 0; step <= 4; step += 1) {
    const y = top + plotHeight - (plotHeight * step) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#63706d";
  ctx.font = "11px Segoe UI, sans-serif";
  ctx.textAlign = "right";
  for (let step = 0; step <= 4; step += 1) {
    const value = (maxValue * step) / 4;
    const y = top + plotHeight - (plotHeight * step) / 4 + 4;
    ctx.fillText(Math.round(value).toLocaleString("ko-KR"), left - 8, y);
  }

  items.forEach((item, index) => {
    const x = left + index * (barWidth + gap);
    const barHeight = (item.value / maxValue) * plotHeight;
    const y = top + plotHeight - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, top + plotHeight);
    gradient.addColorStop(0, item.color || "#d84c3f");
    gradient.addColorStop(1, options.fadeColor || "#dcefe9");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);

    const shouldLabel = items.length <= 36 || index % Math.ceil(items.length / 12) === 0;
    if (shouldLabel) {
      ctx.save();
      ctx.translate(x + barWidth / 2, top + plotHeight + 20);
      ctx.rotate(items.length > 36 ? -0.65 : 0);
      ctx.fillStyle = "#63706d";
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = items.length > 36 ? "right" : "center";
      ctx.fillText(fitText(ctx, item.label, 76), 0, 0);
      ctx.restore();
    }
  });
}

function renderRegionOptions() {
  el.regionSelect.innerHTML = DATA.regions
    .map((region) => `<option value="${region.code}">${escapeHtml(region.name)} (${region.code})</option>`)
    .join("");
  el.regionSelect.value = state.selectedCode;
}

function renderTiles() {
  el.riskTiles.innerHTML = DATA.regions
    .map((region, index) => {
      const rank = index + 1;
      const [bg, fg, muted] = tileColor(region.finalScore, rank);
      const selectedClass = region.code === state.selectedCode ? "is-selected" : "";
      return `
        <button
          class="risk-tile ${tileClass(index)} ${selectedClass}"
          type="button"
          data-code="${region.code}"
          style="--tile-bg:${bg};--tile-fg:${fg};--tile-muted:${muted};"
        >
          <div class="tile-name">
            <span class="tile-rank">${rank}</span>
            <strong>${escapeHtml(region.name)}</strong>
            <span>${escapeHtml(region.code)}</span>
          </div>
          <div class="tile-score">
            <span class="tile-meta">최대일 ${formatNumber(region.maxDaily, "mm")}</span>
            <strong>${region.finalScore.toFixed(1)}</strong>
          </div>
        </button>
      `;
    })
    .join("");

  el.riskTiles.querySelectorAll(".risk-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      state.selectedCode = tile.dataset.code;
      el.regionSelect.value = state.selectedCode;
      render();
    });
  });
}

function dailyItems(region) {
  const values = DATA.dates.map((date, index) => ({ label: date.slice(5), fullDate: date, value: region.daily[index] || 0 }));
  if (state.dateMode === "top30") {
    return values
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 30)
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }
  if (state.dateMode === "recent120") return values.slice(-120);
  if (state.dateMode === "year2024") return values.filter((item) => item.fullDate.startsWith("2024-"));
  return values.filter((item) => item.value > 0);
}

function renderSummary(region) {
  el.selectedCode.textContent = region.code;
  el.selectedName.textContent = region.name;
  el.finalScore.textContent = region.finalScore.toFixed(1);
  el.riskGrade.textContent = riskLabel(region.finalScore);
  el.rainScore.textContent = region.rainRiskScore.toFixed(1);
  el.floodScore.textContent = region.floodExposureScore.toFixed(1);
  el.rainBar.style.width = `${Math.min(region.rainRiskScore, 100)}%`;
  el.floodBar.style.width = `${Math.min(region.floodExposureScore, 100)}%`;
  el.riskSignal.textContent = `${region.name}은 누적 ${formatNumber(region.totalRain, "mm")}, 최대 일강수량 ${formatNumber(
    region.maxDaily,
    "mm",
  )}, 30mm 이상 시간 ${region.heavy30Hours}회를 기준으로 계산되었습니다.`;
  el.totalRain.textContent = formatNumber(region.totalRain, "mm");
  el.maxDaily.textContent = formatNumber(region.maxDaily, "mm");
  el.maxHourly.textContent = formatNumber(region.maxHourly, "mm");
  el.heavyHours.textContent = `${region.heavy30Hours}회`;
}

function renderCharts(region) {
  const monthly = DATA.months.map((month, index) => ({
    label: month.slice(2),
    value: region.monthly[index] || 0,
    color: month.endsWith("-07") || month.endsWith("-08") ? "#d84c3f" : "#14815f",
  }));
  const daily = dailyItems(region).map((item) => ({
    ...item,
    color: item.value >= 80 ? "#d84c3f" : item.value >= 30 ? "#d9961c" : "#14815f",
  }));
  const floodFreq = DATA.flood.frequencyCounts.map((item) => ({
    label: item.frequency === "미상" ? "미상" : `${item.frequency}년`,
    value: item.count,
    color: Number(item.frequency) <= 50 ? "#d84c3f" : "#14815f",
  }));

  el.monthlyCaption.textContent = `${DATA.sources.rainStartDate} ~ ${DATA.sources.rainEndDate} · ${DATA.months.length}개월`;
  el.dailyCaption.textContent = `${region.name} · ${el.dateMode.options[el.dateMode.selectedIndex].textContent}`;
  el.floodCaption.textContent = `저빈도(50년 이하) ${formatNumber(DATA.flood.lowFrequencyZones)} / ${formatNumber(DATA.flood.totalZones)}개`;

  drawBarChart(el.monthlyChart, monthly, { fadeColor: "#dcefe9", bottom: 62 });
  drawBarChart(el.dailyChart, daily, { fadeColor: "#f7ded9", bottom: 72 });
  drawBarChart(el.floodFreqChart, floodFreq, { fadeColor: "#f7ded9", bottom: 58 });
}

function renderRiverBars() {
  const maxScore = Math.max(...DATA.flood.topRivers.map((item) => item.weightedScore), 1);
  el.riverBars.innerHTML = DATA.flood.topRivers
    .slice(0, 8)
    .map((item, index) => {
      const width = Math.max(6, Math.round((item.weightedScore / maxScore) * 100));
      return `
        <div class="river-bar">
          <span class="river-rank">R${index + 1}</span>
          <div>
            <b>${escapeHtml(item.riverCode)}</b>
            <span>${formatNumber(item.zoneCount)}개 구역 · 저빈도 ${formatNumber(item.lowFreqCount)}개</span>
            <i><em style="width:${width}%"></em></i>
          </div>
          <strong>${formatNumber(item.weightedScore)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderTable() {
  el.resultRows.innerHTML = DATA.regions
    .map(
      (region, index) => `
        <tr class="${region.code === state.selectedCode ? "selected-row" : ""}">
          <td><span class="rank-pill">${index + 1}</span></td>
          <td>${escapeHtml(region.name)}</td>
          <td>${escapeHtml(region.code)}</td>
          <td class="score-cell">${region.finalScore.toFixed(1)}</td>
          <td>${region.rainRiskScore.toFixed(1)}</td>
          <td>${region.floodExposureScore.toFixed(1)}</td>
          <td>${formatNumber(region.totalRain, "mm")}</td>
          <td>${formatNumber(region.maxDaily, "mm")}</td>
          <td>${region.heavy30Hours}시간</td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  const region = DATA.regions.find((item) => item.code === state.selectedCode) || DATA.regions[0];
  state.selectedCode = region.code;
  renderRegionOptions();
  renderTiles();
  renderSummary(region);
  renderCharts(region);
  renderRiverBars();
  renderTable();
  el.tileCaption.textContent = `${DATA.sources.regionCount}개 지역 · 강수 ${formatNumber(
    Object.values(DATA.sources.rainRows).reduce((sum, value) => sum + value, 0),
  )}건 · 범람구역 ${formatNumber(DATA.flood.totalZones)}개`;
  el.tableCaption.textContent = "CSV 집계 기반 최종 위험점수 내림차순";
}

el.regionSelect.addEventListener("change", (event) => {
  state.selectedCode = event.target.value;
  render();
});

el.dateMode.addEventListener("change", (event) => {
  state.dateMode = event.target.value;
  render();
});

window.addEventListener("resize", () => {
  window.requestAnimationFrame(render);
});

render();
