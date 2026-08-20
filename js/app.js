const LIVE_FX = "https://open.er-api.com/v6/latest/USD";

const state = {
  prices: null,
  rates: null,
  source: "",
  filter: "all",
};

function band(cny, usCny) {
  if (cny < usCny - 5) return "cheap";
  if (cny > usCny + 15) return "expensive";
  return "mid";
}

function money(n, digits = 0) {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function toUsd(region, rates) {
  const rate = rates[region.currency];
  if (!rate) return null;
  return region.local / rate;
}

function convert(region, rates) {
  const usd = toUsd(region, rates);
  if (usd == null || !rates.CNY) return null;
  return { usd, cny: usd * rates.CNY };
}

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function loadRates(forceLive) {
  if (forceLive) {
    const live = await loadJson(LIVE_FX);
    if (live.result !== "success") throw new Error("live fx failed");
    return {
      rates: live.rates,
      source: "实时汇率 open.er-api.com",
      fetchedAt: live.time_last_update_utc || new Date().toISOString(),
    };
  }
  try {
    const live = await loadJson(LIVE_FX);
    if (live.result === "success") {
      return {
        rates: live.rates,
        source: "实时汇率 open.er-api.com",
        fetchedAt: live.time_last_update_utc || new Date().toISOString(),
      };
    }
  } catch (_) {
    /* fallback snapshot */
  }
  const snap = await loadJson("./data/rates.json");
  return {
    rates: snap.rates,
    source: "仓库快照 " + (snap.fetchedAt || ""),
    fetchedAt: snap.timeLastUpdateUtc || snap.fetchedAt,
  };
}

function rowsFor(filter) {
  const us = convert({ currency: "USD", local: state.prices.usLocal }, state.rates);
  return state.prices.regions
    .map((region) => {
      const conv = convert(region, state.rates);
      if (!conv) return null;
      const item = { ...region, ...conv, vs: conv.cny - us.cny, usCny: us.cny };
      item.band = band(item.cny, us.cny);
      return item;
    })
    .filter(Boolean)
    .filter((row) => filter === "all" || row.band === filter)
    .sort((a, b) => a.cny - b.cny);
}

function render() {
  const all = rowsFor("all");
  const rows = rowsFor(state.filter);
  const cheapest = all[0];
  const priciest = all[all.length - 1];
  const us = all.find((r) => r.code === "US");
  const usdCny = state.rates.CNY;

  document.getElementById("meta").textContent =
    `${state.source} · 1 USD = ${usdCny.toFixed(4)} CNY · 本币档位更新于 ${state.prices.updated}`;

  document.getElementById("banner").textContent =
    `今天最便宜：${cheapest.name} ${cheapest.localLabel}，约 ¥${money(cheapest.cny)}/月，比美国 $19.99（约 ¥${money(us.cny)}）便宜约 ¥${money(us.cny - cheapest.cny)}。网页版仍接近 $20，价差主要在 App Store。`;

  document.getElementById("stats").innerHTML = `
    <div class="stat good"><b>¥${money(cheapest.cny)}</b><span>${cheapest.name}（最低）</span></div>
    <div class="stat"><b>¥${money(us.cny)}</b><span>美国官网 / App Store</span></div>
    <div class="stat bad"><b>¥${money(priciest.cny)}</b><span>${priciest.name}（最高）</span></div>
    <div class="stat warn"><b>¥${money(priciest.cny - cheapest.cny)}</b><span>高低价差 / 月</span></div>
  `;

  const max = priciest.cny;
  const usPct = (us.cny / max) * 100;
  document.getElementById("chart").innerHTML = rows
    .map((row) => {
      const pct = (row.cny / max) * 100;
      return `<div class="bar-row">
        <span>${row.name}</span>
        <div class="bar-track">
          <div class="bar-fill ${row.band}" style="width:${pct}%"></div>
          <div class="bar-ref" style="left:${usPct}%" title="美国 ¥${money(us.cny)}"></div>
        </div>
        <span class="num">¥${money(row.cny, 1)}</span>
      </div>`;
    })
    .join("");

  document.getElementById("rows").innerHTML = rows
    .map((row) => {
      const delta =
        Math.abs(row.vs) < 0.5
          ? "持平（0%）"
          : `${row.vs < 0 ? "便宜" : "贵"} ¥${money(Math.abs(row.vs))}（${row.vs < 0 ? "" : "+"}${((row.vs / row.usCny) * 100).toFixed(0)}%）`;
      return `<tr>
        <td><span class="dot ${row.band}"></span>${row.name}</td>
        <td>${row.localLabel}</td>
        <td class="num">$${row.usd.toFixed(2)}</td>
        <td class="num">¥${money(row.cny)}</td>
        <td class="num">${delta}</td>
        <td>${row.source}</td>
      </tr>`;
    })
    .join("");

  document.getElementById("footer").textContent =
    `汇率来源：${state.source}。本币标价来自 OpenTheRank App Store 2026 年 8 月追踪及公开商店页；香港、印尼、越南、新加坡、泰国等可能滞后。`;
}

async function boot(forceLive = false) {
  const btn = document.getElementById("refresh");
  btn.disabled = true;
  btn.textContent = "刷新中…";
  try {
    if (!state.prices) state.prices = await loadJson("./data/prices.json");
    const fx = await loadRates(forceLive);
    state.rates = fx.rates;
    state.source = fx.source;
    render();
  } catch (err) {
    document.getElementById("meta").textContent = "汇率读取失败：" + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "刷新汇率";
  }
}

document.getElementById("refresh").addEventListener("click", () => boot(true));
document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    state.filter = pill.dataset.filter;
    if (state.rates) render();
  });
});

boot(false);
