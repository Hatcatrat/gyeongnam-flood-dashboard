const DATA = globalThis.FLOOD_DASHBOARD_DATA;
const LIVE_WEATHER = globalThis.LIVE_WEATHER || { status: "missing_key", regions: [] };
const SPARK_EVIDENCE = globalThis.SPARK_EVIDENCE || { status: "pending" };

const REGION_GRID = {
  "4812100000": { nx: 90, ny: 77, label: "창원시 의창구" },
  "4812300000": { nx: 91, ny: 76, label: "창원시 성산구" },
  "4812500000": { nx: 89, ny: 76, label: "창원시 마산합포구" },
  "4812700000": { nx: 89, ny: 76, label: "창원시 마산회원구" },
  "4812900000": { nx: 91, ny: 75, label: "창원시 진해구" },
  "4817000000": { nx: 81, ny: 75, label: "진주시" },
  "4822000000": { nx: 87, ny: 68, label: "통영시" },
  "4824000000": { nx: 80, ny: 71, label: "사천시" },
  "4825000000": { nx: 95, ny: 77, label: "김해시" },
  "4827000000": { nx: 92, ny: 83, label: "밀양시" },
  "4831000000": { nx: 90, ny: 69, label: "거제시" },
  "4833000000": { nx: 97, ny: 79, label: "양산시" },
  "4872000000": { nx: 83, ny: 79, label: "의령군" },
  "4873000000": { nx: 86, ny: 78, label: "함안군" },
  "4874000000": { nx: 87, ny: 84, label: "창녕군" },
  "4882000000": { nx: 85, ny: 71, label: "고성군" },
  "4884000000": { nx: 77, ny: 68, label: "남해군" },
  "4885000000": { nx: 74, ny: 73, label: "하동군" },
  "4886000000": { nx: 76, ny: 81, label: "산청군" },
  "4887000000": { nx: 73, ny: 83, label: "함양군" },
  "4888000000": { nx: 77, ny: 86, label: "거창군" },
  "4889000000": { nx: 81, ny: 84, label: "합천군" },
};

const state = {
  selectedCode: DATA.regions[0]?.code,
  dateMode: "top30",
  liveByCode: Object.fromEntries((LIVE_WEATHER.regions || []).map((item) => [item.code, item])),
  liveMessage: LIVE_WEATHER.message || "",
  liveStatus: LIVE_WEATHER.status || "missing_key",
  isRefreshing: false,
};

const el = {
  regionSelect: document.querySelector("#regionSelect"),
  dateMode: document.querySelector("#dateMode"),
  kmaKeyInput: document.querySelector("#kmaKeyInput"),
  saveKmaKey: document.querySelector("#saveKmaKey"),
  refreshLive: document.querySelector("#refreshLive"),
  liveStatus: document.querySelector("#liveStatus"),
  liveUpdated: document.querySelector("#liveUpdated"),
  liveRain: document.querySelector("#liveRain"),
  liveBase: document.querySelector("#liveBase"),
  liveTemp: document.querySelector("#liveTemp"),
  liveHumidity: document.querySelector("#liveHumidity"),
  liveWind: document.querySelector("#liveWind"),
  livePty: document.querySelector("#livePty"),
  liveAdjustedScore: document.querySelector("#liveAdjustedScore"),
  liveBoost: document.querySelector("#liveBoost"),
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
  sparkStatus: document.querySelector("#sparkStatus"),
  sparkGenerated: document.querySelector("#sparkGenerated"),
  sparkEngine: document.querySelector("#sparkEngine"),
  sparkRows: document.querySelector("#sparkRows"),
  sparkPartitions: document.querySelector("#sparkPartitions"),
  sparkRuntime: document.querySelector("#sparkRuntime"),
  sparkOps: document.querySelector("#sparkOps"),
  sparkTopRegion: document.querySelector("#sparkTopRegion"),
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

function formatNumber(value, suffix = "", digits = 1) {
  const number = Number(value || 0);
  return `${number.toLocaleString("ko-KR", { maximumFractionDigits: digits })}${suffix}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskLabel(score) {
  if (score >= 80) return "매우 높음";
  if (score >= 68) return "높음";
  if (score >= 52) return "주의";
  return "낮음";
}

function tileColor(score, rank) {
  if (rank === 1 || score >= 80) return ["#d94a3a", "#ffffff", "rgba(255,255,255,0.78)"];
  if (score >= 68) return ["#f0a533", "#2d2110", "rgba(45,33,16,0.7)"];
  if (score >= 52) return ["#79b98f", "#103a2d", "rgba(16,58,45,0.68)"];
  return ["#39a275", "#ffffff", "rgba(255,255,255,0.78)"];
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
  ctx.strokeStyle = "#e6eaee";
  ctx.lineWidth = 1;
  for (let step = 0; step <= 4; step += 1) {
    const y = top + plotHeight - (plotHeight * step) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#68737d";
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
    ctx.fillStyle = item.color || "#227bc7";
    ctx.fillRect(x, y, barWidth, barHeight);

    const shouldLabel = items.length <= 36 || index % Math.ceil(items.length / 12) === 0;
    if (shouldLabel) {
      ctx.save();
      ctx.translate(x + barWidth / 2, top + plotHeight + 20);
      ctx.rotate(items.length > 36 ? -0.65 : 0);
      ctx.fillStyle = "#68737d";
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = items.length > 36 ? "right" : "center";
      ctx.fillText(fitText(ctx, item.label, 76), 0, 0);
      ctx.restore();
    }
  });
}

function getRegion(code) {
  return DATA.regions.find((item) => item.code === code) || DATA.regions[0];
}

function liveFor(code) {
  return state.liveByCode[code] || null;
}

function ptyLabel(value) {
  const map = {
    "0": "없음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "5": "빗방울",
    "6": "빗방울/눈날림",
    "7": "눈날림",
  };
  return map[String(value ?? "0")] || "-";
}

function liveBoost(weather) {
  if (!weather || weather.status === "error") return 0;
  const rain = Number(weather.rain1h || 0);
  const humidity = Number(weather.humidity || 0);
  const wind = Number(weather.windSpeed || 0);
  const pty = String(weather.precipitationType ?? "0");
  const rainScore = Math.min(10, rain * 1.8);
  const ptyScore = pty !== "0" ? 2.2 : 0;
  const humidityScore = humidity >= 90 ? 1.4 : humidity >= 80 ? 0.8 : 0;
  const windScore = wind >= 8 ? 1.4 : wind >= 5 ? 0.8 : 0;
  return Math.min(15, rainScore + ptyScore + humidityScore + windScore);
}

function displayScore(region) {
  return Math.min(100, region.finalScore + liveBoost(liveFor(region.code)));
}

function scoredRegions() {
  return DATA.regions
    .map((region) => ({
      ...region,
      liveBoost: liveBoost(liveFor(region.code)),
      displayScore: displayScore(region),
    }))
    .sort((a, b) => b.displayScore - a.displayScore || b.finalScore - a.finalScore);
}

function getKmaBaseTime() {
  const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  if (kst.getMinutes() < 45) kst.setHours(kst.getHours() - 1);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, "0");
  const dd = String(kst.getDate()).padStart(2, "0");
  const hh = String(kst.getHours()).padStart(2, "0");
  return { baseDate: `${yyyy}${mm}${dd}`, baseTime: `${hh}00` };
}

function normalizeKmaItems(items, region) {
  const values = Object.fromEntries(items.map((item) => [item.category, item.obsrValue]));
  return {
    code: region.code,
    name: region.name,
    status: "ready",
    source: "기상청 초단기실황",
    baseDate: items[0]?.baseDate,
    baseTime: items[0]?.baseTime,
    generatedAt: new Date().toISOString(),
    temperature: Number(values.T1H || 0),
    rain1h: Number(values.RN1 || 0),
    humidity: Number(values.REH || 0),
    windSpeed: Number(values.WSD || 0),
    precipitationType: String(values.PTY ?? "0"),
  };
}

async function fetchKmaNow(region) {
  const key = localStorage.getItem("kmaServiceKey");
  if (!key) throw new Error("ServiceKey가 저장되어 있지 않습니다.");

  const grid = REGION_GRID[region.code];
  if (!grid) throw new Error("선택 지역의 기상청 격자 정보가 없습니다.");

  const { baseDate, baseTime } = getKmaBaseTime();
  const params = new URLSearchParams({
    pageNo: "1",
    numOfRows: "100",
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(grid.nx),
    ny: String(grid.ny),
  });
  const endpoint = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
  const response = await fetch(`${endpoint}?serviceKey=${encodeURIComponent(key)}&${params.toString()}`);
  if (!response.ok) throw new Error(`기상청 응답 오류 ${response.status}`);

  const json = await response.json();
  const header = json?.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(header.resultMsg || `기상청 결과 코드 ${header.resultCode}`);
  }
  const items = json?.response?.body?.items?.item || [];
  if (!items.length) throw new Error("초단기실황 항목이 비어 있습니다.");
  return normalizeKmaItems(items, region);
}

async function refreshLiveWeather() {
  const region = getRegion(state.selectedCode);
  state.isRefreshing = true;
  state.liveStatus = "loading";
  state.liveMessage = "기상청 초단기실황을 불러오는 중입니다.";
  renderLive(region);
  try {
    const weather = await fetchKmaNow(region);
    state.liveByCode[region.code] = weather;
    state.liveStatus = "ready";
    state.liveMessage = "기상청 초단기실황 반영 완료";
  } catch (error) {
    state.liveStatus = "error";
    state.liveMessage = error.message;
  } finally {
    state.isRefreshing = false;
    render();
  }
}

function renderRegionOptions() {
  el.regionSelect.innerHTML = DATA.regions
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((region) => `<option value="${region.code}">${escapeHtml(region.name)} (${region.code})</option>`)
    .join("");
  el.regionSelect.value = state.selectedCode;
}

function renderLive(region) {
  const weather = liveFor(region.code);
  const boost = liveBoost(weather);
  const adjusted = Math.min(100, region.finalScore + boost);
  const hasKey = Boolean(localStorage.getItem("kmaServiceKey"));

  if (state.liveStatus === "loading") {
    el.liveStatus.textContent = "갱신 중";
  } else if (weather?.status === "ready") {
    el.liveStatus.textContent = "연동 완료";
  } else if (hasKey) {
    el.liveStatus.textContent = "수동 갱신 가능";
  } else {
    el.liveStatus.textContent = "키 필요";
  }

  el.liveUpdated.textContent = weather?.generatedAt
    ? `${formatDateTime(weather.generatedAt)} 갱신`
    : state.liveMessage || "ServiceKey 저장 후 갱신";
  el.liveRain.textContent = weather ? formatNumber(weather.rain1h, "mm") : "-";
  el.liveBase.textContent = weather?.baseDate ? `발표 ${weather.baseDate} ${weather.baseTime}` : "초단기실황 대기";
  el.liveTemp.textContent = weather ? formatNumber(weather.temperature, "°C") : "-";
  el.liveHumidity.textContent = weather ? `습도 ${formatNumber(weather.humidity, "%", 0)}` : "습도 -";
  el.liveWind.textContent = weather ? formatNumber(weather.windSpeed, "m/s") : "-";
  el.livePty.textContent = weather ? `강수형태 ${ptyLabel(weather.precipitationType)}` : "강수형태 -";
  el.liveAdjustedScore.textContent = adjusted.toFixed(1);
  el.liveBoost.textContent = `CSV 기준 +${boost.toFixed(1)}`;
}

function renderTiles(scored) {
  el.riskTiles.innerHTML = scored
    .map((region, index) => {
      const rank = index + 1;
      const [bg, fg, muted] = tileColor(region.displayScore, rank);
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
            <span class="tile-meta">실시간 +${region.liveBoost.toFixed(1)}</span>
            <strong>${region.displayScore.toFixed(1)}</strong>
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
  const boost = liveBoost(liveFor(region.code));
  const adjusted = Math.min(100, region.finalScore + boost);
  el.selectedCode.textContent = region.code;
  el.selectedName.textContent = region.name;
  el.finalScore.textContent = adjusted.toFixed(1);
  el.riskGrade.textContent = riskLabel(adjusted);
  el.rainScore.textContent = region.rainRiskScore.toFixed(1);
  el.floodScore.textContent = region.floodExposureScore.toFixed(1);
  el.rainBar.style.width = `${Math.min(region.rainRiskScore, 100)}%`;
  el.floodBar.style.width = `${Math.min(region.floodExposureScore, 100)}%`;
  el.riskSignal.textContent = `${region.name}은 CSV 기준 ${region.finalScore.toFixed(1)}점이며 현재 기상 보정 ${boost.toFixed(
    1,
  )}점을 더해 표시합니다.`;
  el.totalRain.textContent = formatNumber(region.totalRain, "mm");
  el.maxDaily.textContent = formatNumber(region.maxDaily, "mm");
  el.maxHourly.textContent = formatNumber(region.maxHourly, "mm");
  el.heavyHours.textContent = `${region.heavy30Hours}시간`;
}

function renderCharts(region) {
  const monthly = DATA.months.map((month, index) => ({
    label: month.slice(2),
    value: region.monthly[index] || 0,
    color: month.endsWith("-07") || month.endsWith("-08") ? "#d94a3a" : "#2b7ec8",
  }));
  const daily = dailyItems(region).map((item) => ({
    ...item,
    color: item.value >= 80 ? "#d94a3a" : item.value >= 30 ? "#f0a533" : "#39a275",
  }));
  const floodFreq = DATA.flood.frequencyCounts.map((item) => ({
    label: item.frequency === "미상" ? "미상" : `${item.frequency}년`,
    value: item.count,
    color: Number(item.frequency) <= 50 ? "#d94a3a" : "#39a275",
  }));

  el.monthlyCaption.textContent = `${DATA.sources.rainStartDate} ~ ${DATA.sources.rainEndDate} · ${DATA.months.length}개월`;
  el.dailyCaption.textContent = `${region.name} · ${el.dateMode.options[el.dateMode.selectedIndex].textContent}`;
  el.floodCaption.textContent = `저빈도(50년 이하) ${formatNumber(DATA.flood.lowFrequencyZones, "", 0)} / ${formatNumber(
    DATA.flood.totalZones,
    "",
    0,
  )}개`;

  drawBarChart(el.monthlyChart, monthly, { bottom: 62 });
  drawBarChart(el.dailyChart, daily, { bottom: 72 });
  drawBarChart(el.floodFreqChart, floodFreq, { bottom: 58 });
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
            <span>${formatNumber(item.zoneCount, "개", 0)} 구역 · 저빈도 ${formatNumber(item.lowFreqCount, "개", 0)}</span>
            <i><em style="width:${width}%"></em></i>
          </div>
          <strong>${formatNumber(item.weightedScore, "", 1)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderSparkEvidence() {
  const evidence = SPARK_EVIDENCE;
  const ready = evidence.status === "ready";
  el.sparkStatus.textContent = ready ? "RDD 완료" : "대기";
  el.sparkStatus.className = `status-pill ${ready ? "is-ready" : ""}`;
  el.sparkGenerated.textContent = ready ? `${formatDateTime(evidence.generatedAt)} 생성` : evidence.message || "PySpark 실행 대기";
  el.sparkEngine.textContent = evidence.engine || "PySpark RDD";
  el.sparkRows.textContent = evidence.totalInputRows ? formatNumber(evidence.totalInputRows, "행", 0) : "-";
  el.sparkPartitions.textContent = evidence.partitions ? `${evidence.partitions}개` : "-";
  el.sparkRuntime.textContent = evidence.runtimeSeconds ? `${evidence.runtimeSeconds.toFixed(2)}초` : "-";
  el.sparkOps.textContent = (evidence.rddOperations || ["textFile/binaryFiles", "map", "filter", "reduceByKey", "takeOrdered"]).join(" → ");
  el.sparkTopRegion.textContent = ready
    ? `RDD 집계 최고 누적 강수 지역은 ${evidence.topRainRegion?.name || "-"} (${evidence.topRainRegion?.code || "-"})입니다.`
    : "PySpark 의존성이 설치된 환경에서 scripts/build_spark_summary.py를 실행하면 이 패널이 실제 RDD 집계값으로 갱신됩니다.";
}

function renderTable(scored) {
  el.resultRows.innerHTML = scored
    .map(
      (region, index) => `
        <tr class="${region.code === state.selectedCode ? "selected-row" : ""}">
          <td><span class="rank-pill">${index + 1}</span></td>
          <td>${escapeHtml(region.name)}</td>
          <td>${escapeHtml(region.code)}</td>
          <td class="score-cell">${region.finalScore.toFixed(1)}</td>
          <td>+${region.liveBoost.toFixed(1)}</td>
          <td class="score-cell">${region.displayScore.toFixed(1)}</td>
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
  const region = getRegion(state.selectedCode);
  const scored = scoredRegions();
  state.selectedCode = region.code;
  renderRegionOptions();
  renderLive(region);
  renderTiles(scored);
  renderSummary(region);
  renderCharts(region);
  renderRiverBars();
  renderSparkEvidence();
  renderTable(scored);
  el.tileCaption.textContent = `${DATA.sources.regionCount}개 지역 · 강수 ${formatNumber(
    Object.values(DATA.sources.rainRows).reduce((sum, value) => sum + value, 0),
    "건",
    0,
  )} · 범람구역 ${formatNumber(DATA.flood.totalZones, "개", 0)}`;
  el.tableCaption.textContent = "CSV 점수에 기상청 실황 보정값을 더한 표시 점수 내림차순";
}

el.regionSelect.addEventListener("change", (event) => {
  state.selectedCode = event.target.value;
  render();
});

el.dateMode.addEventListener("change", (event) => {
  state.dateMode = event.target.value;
  render();
});

el.saveKmaKey.addEventListener("click", () => {
  const key = el.kmaKeyInput.value.trim();
  if (key) {
    localStorage.setItem("kmaServiceKey", key);
    el.kmaKeyInput.value = "";
    state.liveStatus = "ready";
    state.liveMessage = "ServiceKey 저장 완료";
  } else {
    localStorage.removeItem("kmaServiceKey");
    state.liveStatus = "missing_key";
    state.liveMessage = "ServiceKey가 삭제되었습니다.";
  }
  render();
});

el.refreshLive.addEventListener("click", refreshLiveWeather);

window.addEventListener("resize", () => {
  window.requestAnimationFrame(render);
});

if (localStorage.getItem("kmaServiceKey")) {
  state.liveMessage = "ServiceKey 저장됨";
}

render();
