/* ════════════════════════════════════════════════════════
   映海御安阁 · 中国电影海外舆情与文化安全研判平台
   核心逻辑 app.js（v2.0 重构版）
   实时数据 + AI 研判，4 视图：总览 / 研判中心 / 处置工具 / 数据采集
   零依赖、零构建，可本地双击，可部署 GitHub Pages。
   ════════════════════════════════════════════════════════ */

/* ---------- 工具 ---------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

var $view = document.getElementById("view");
var $title = document.getElementById("page-title");
var $meta = document.getElementById("meta-info");

var TITLES = {
  "/overview": "总览看板",
  "/analyze": "研判中心",
  "/playbook": "处置工具",
  "/collect": "数据采集"
};

/* ---------- SVG 图表 ---------- */
function radarSVG(dims, size, color) {
  var n = dims.length, cx = size / 2, cy = size / 2, r = size / 2 - 26;
  var angle = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
  var pt = function (i, rr) {
    var a = angle(i);
    return (cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1);
  };
  var grid = "", axes = "", labels = "";
  for (var g = 5; g >= 1; g--) {
    var pts = [];
    for (var i = 0; i < n; i++) pts.push(pt(i, r * g / 5));
    grid += '<polygon points="' + pts.join(" ") + '" fill="none" stroke="#DDD6CA" stroke-width="1"/>';
  }
  for (var i = 0; i < n; i++) {
    var a = angle(i);
    axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt(i, r).split(",")[0] + '" y2="' + pt(i, r).split(",")[1] + '" stroke="#DDD6CA" stroke-width="1"/>';
    var lx = cx + (r + 16) * Math.cos(a);
    var ly = cy + (r + 16) * Math.sin(a);
    var anchor = lx > cx + 1 ? "start" : (lx < cx - 1 ? "end" : "middle");
    labels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" font-size="10" fill="#8A837A" text-anchor="' + anchor + '">' + esc(PLATFORM.dims[i]) + '</text>';
  }
  var dataPts = [], dots = "";
  for (var i = 0; i < n; i++) {
    dataPts.push(pt(i, r * dims[i] / 5));
    var xy = pt(i, r * dims[i] / 5).split(",");
    dots += '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="3" fill="' + color + '"/>';
  }
  var dataPoly = '<polygon points="' + dataPts.join(" ") + '" fill="' + color + '" fill-opacity="0.16" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>';
  return '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" style="max-width:' + size + 'px;width:100%">' + axes + grid + dataPoly + dots + labels + '</svg>';
}

function lineSVG(labels, values, color, H) {
  var W = 560, h = H || 180, pad = 30, max = 1;
  for (var i = 0; i < values.length; i++) if (values[i] > max) max = values[i];
  var stepX = labels.length > 1 ? (W - pad * 2) / (labels.length - 1) : 0;
  var grid = "", lines = "", dots = "", xlab = "";
  for (var g = 0; g <= 4; g++) {
    var y = pad + g * ((h - pad * 2) / 4);
    grid += '<line x1="' + pad + '" y1="' + y + '" x2="' + (W - pad) + '" y2="' + y + '" stroke="#EFE9DF" stroke-width="1"/>';
  }
  var pts = labels.map(function (_, i) {
    var x = pad + i * stepX;
    var y = h - pad - (values[i] / max) * (h - pad * 2);
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  lines = '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
  labels.forEach(function (lb, i) {
    var x = pad + i * stepX;
    var y = h - pad - (values[i] / max) * (h - pad * 2);
    dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="' + color + '"/>';
    xlab += '<text x="' + x.toFixed(1) + '" y="' + (h - 8) + '" font-size="11" fill="#8A837A" text-anchor="middle">' + esc(lb) + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + h + '" role="img" style="width:100%">' + grid + lines + dots + xlab + '</svg>';
}

function dimColor(v) {
  return v >= 4 ? "#A63A2B" : (v === 3 ? "#C7A76C" : "#274A64");
}

/* ---------- 数据采集加载 ---------- */
var collectData = null;

function loadCollect() {
  fetch("data/collect.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      collectData = d;
      if (getRoute() === "/collect") renderCollect();
    })
    .catch(function () {});
}

function getCollect() { return collectData || PLATFORM.collect; }

/* ---------- 路由 ---------- */
function getRoute() {
  var h = location.hash.replace(/^#/, "");
  return TITLES[h] ? h : "/overview";
}

function router() {
  var route = getRoute();
  $title.textContent = TITLES[route];
  var links = document.querySelectorAll(".nav a");
  for (var i = 0; i < links.length; i++) {
    links[i].classList.toggle("active", links[i].getAttribute("data-route") === route);
  }
  var fn = VIEWS[route] || VIEWS["/overview"];
  fn();
  $view.scrollTop = 0;
}

/* ---------- AI 大模型接入 ---------- */
var AI_PROVIDERS = {
  "deepseek": { label: "DeepSeek", base: "https://api.deepseek.com", model: "deepseek-chat" },
  "qwen": { label: "通义千问", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  "zhipu": { label: "智谱 GLM", base: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
  "kimi": { label: "Kimi", base: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" }
};

function getAIConfig() {
  try {
    var s = localStorage.getItem("ai_config");
    if (s) return JSON.parse(s);
  } catch (e) {}
  return { provider: "deepseek", base: "https://api.deepseek.com", model: "deepseek-chat", key: "" };
}

function saveAIConfig(cfg) {
  try { localStorage.setItem("ai_config", JSON.stringify(cfg)); } catch (e) {}
}

function callLLM(messages) {
  var cfg = getAIConfig();
  if (!cfg.key) return Promise.reject(new Error("请先在数据采集页下方或本页设置 API Key"));
  return fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
    body: JSON.stringify({ model: cfg.model, messages: messages, temperature: 0.4 })
  }).then(function (r) {
    if (!r.ok) return r.text().then(function (t) { throw new Error("接口返回 " + r.status + "：" + t.slice(0, 120)); });
    return r.json();
  }).then(function (d) {
    var c = d.choices && d.choices[0];
    return c && c.message ? (c.message.content || "") : "";
  });
}

/* AI 配置设置区（供总览 / 研判中心复用） */
function aiConfigBlock() {
  var cfg = getAIConfig();
  var opts = Object.keys(AI_PROVIDERS).map(function (k) {
    return '<option value="' + k + '"' + (k === cfg.provider ? ' selected' : '') + '>' + AI_PROVIDERS[k].label + '</option>';
  }).join("");
  return '<div class="card" style="border-left:3px solid var(--ink-blue)">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px">AI 引擎设置</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
    '<select id="ai-provider" class="select">' + opts + '</select>' +
    '<input id="ai-key" class="input" type="password" placeholder="粘贴 API Key（仅存本机浏览器）" value="' + esc(cfg.key) + '" style="max-width:320px">' +
    '<button id="ai-save" class="btn">保存</button><span id="ai-msg" class="meta-info"></span>' +
    '</div>' +
    '<p style="font-size:12px;color:#8A837A;margin-top:8px">Key 仅保存在你本地浏览器（localStorage），不会上传。自定义域名访问若 DeepSeek 跨域受限，请改用「通义千问」。</p></div>';
}

function bindAIConfig() {
  var sel = document.getElementById("ai-provider");
  var keyEl = document.getElementById("ai-key");
  if (!sel || !keyEl) return;
  document.getElementById("ai-save").addEventListener("click", function () {
    var p = sel.value;
    var cfg2 = { provider: p, base: AI_PROVIDERS[p].base, model: AI_PROVIDERS[p].model, key: keyEl.value.trim() };
    saveAIConfig(cfg2);
    document.getElementById("ai-msg").textContent = "已保存 ✓";
  });
  sel.addEventListener("change", function () {
    var p = sel.value;
    var cfg2 = getAIConfig();
    cfg2.provider = p; cfg2.base = AI_PROVIDERS[p].base; cfg2.model = AI_PROVIDERS[p].model;
    saveAIConfig(cfg2);
  });
}

/* ---------- 联网抓取 ---------- */
/* rss2json 中转：无 key 受限流（429），可配置免费 key 提升稳定性 */
function getRssKey() {
  try { return (localStorage.getItem("rss2json_key") || "").trim(); } catch (e) { return ""; }
}

function rss2jsonUrl(rss) {
  var base = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rss);
  var k = getRssKey();
  return k ? base + "&api_key=" + encodeURIComponent(k) : base;
}

/* fetch 带超时：防止慢 / 被墙 / 限流接口把整个检索挂起，保证数据规格栏总能渲染 */
function fetchTimeout(url, ms) {
  ms = ms || 15000;
  var ctrl = ("AbortController" in window) ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms) : null;
  return fetch(url, { mode: "cors", signal: ctrl ? ctrl.signal : undefined })
    .then(function (r) { if (timer) clearTimeout(timer); return r; },
          function (e) { if (timer) clearTimeout(timer); throw e; });
}

/* 未配置 rss2json key 时的醒目提示 */
function rssKeyNotice() {
  if (getRssKey()) return "";
  return '<div class="card" style="border-left:3px solid var(--warn);margin-bottom:16px">' +
    '<b style="color:#B77E22">⚠ 未配置 rss2json Key</b>：实时抓取经 rss2json.com 中转，<b>无 key 会被限流导致「实时报道为 0」</b>。' +
    '请到「<b>数据采集</b>」页 →「中转服务 Key 设置」填入免费 key（rss2json.com → Get free API key，Google 登录即得）。</div>';
}

function fetchNewsFor(kw, limit) {
  var q = encodeURIComponent(kw);
  var rss = "https://news.google.com/rss/search?q=" + q + "&hl=zh-CN&gl=CN&ceid=CN:zh-Hans";
  return fetchTimeout(rss2jsonUrl(rss))
    .then(function (r) { return r.json(); })
    .then(function (d) { return (d && d.items) || []; })
    .catch(function () { return []; });
}

/* 影视领域关键词：用于相关性打分，过滤无关内容 */
var FILM_WORDS = ["电影", "影视", "影片", "影院", "票房", "上映", "剧集", "电视剧", "动漫", "动画", "导演", "演员", "影评", "院线", "续集", "首映", "观影", "预告", "角色", "编剧", "film", "movie", "cinema", "series", "anime", "animation", "tv show", "screening", "box office", "episode", "season"];

function filmScore(text) {
  var t = String(text || "").toLowerCase();
  var n = 0;
  for (var i = 0; i < FILM_WORDS.length; i++) if (t.indexOf(FILM_WORDS[i]) >= 0) n++;
  return n;
}

/* 广域检索（多关键词 × 多源；以「是否命中作品/主题核心词」判定强相关，过滤无关泛化） */
function searchWeb(kw) {
  var enKw = kw.replace(/[^\x00-\x7F]/g, " ").trim() || kw;
  /* 查询序列：主查询 + 影视补充查询（冷门作品召回）+ 英文查询；
     去掉「动漫 动画」等易引入泛化动漫/票房新闻的宽泛后缀 */
  var queries = [kw, kw + " 电影", enKw];
  var seenQ = {}, qs = [];
  queries.forEach(function (qq) {
    qq = qq.trim();
    if (qq && !seenQ[qq]) { seenQ[qq] = 1; qs.push(qq); }
  });
  var tokens = fuzzyTokens(kw);

  var newsPromises = qs.map(function (qq) { return fetchNewsFor(qq, 12); });
  var bingPromise = fetchBingNews(kw);
  var overseasPromise = fetchOverseas(enKw);
  var bookUrl = "https://openlibrary.org/search.json?q=" + encodeURIComponent(kw) + "&limit=5";
  var tvUrl = "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(enKw) + "&limit=6";
  var itUrl = "https://itunes.apple.com/search?term=" + encodeURIComponent(enKw) + "&media=movie&entity=tvShow,movie&limit=6";

  return Promise.all(newsPromises.concat([
    bingPromise,
    overseasPromise,
    fetch(bookUrl, { mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(tvUrl, { mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(itUrl, { mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return null; })
  ])).then(function (res) {
    var n = qs.length;
    var seen = {}, news = [], intl = [];
    function push(it, score) {
      var k = (it.title || "") + "|" + (it.link || "");
      if (seen[k]) return false;
      seen[k] = 1;
      it._core = coreHit(it, tokens);           /* 是否命中作品核心词（强相关信号） */
      it._score = score === undefined ? filmScore(it.title + " " + (it.description || "")) : score;
      it._hit = it._hit || 0;
      news.push(it);
      return true;
    }
    for (var i = 0; i < n; i++) (res[i] || []).forEach(function (it) { push(it); });
    (res[n] || []).forEach(function (it) { it._src = it._src || "Bing 新闻"; push(it, 2); });   /* 国内 Bing 源 */
    (res[n + 1] || []).forEach(function (it) { if (push(it, 2)) intl.push(it); });             /* 海外影视源 */

    function rank(list) {
      return list.sort(function (a, b) {
        if ((b._core || 0) !== (a._core || 0)) return (b._core || 0) - (a._core || 0);
        if (b._score !== a._score) return b._score - a._score;
        return (b._hit || 0) - (a._hit || 0);
      });
    }

    /* related = 真正提到作品核心词的条目；weak = 只沾影视边、未提作品（泛化）；
       unrelated = 与作品和影视都无关 → 直接过滤，仅计数提示 */
    var related = rank(news.filter(function (it) { return it._core > 0; }));
    var weak = news.filter(function (it) { return it._core === 0 && it._score > 0; });
    var unrelated = news.filter(function (it) { return it._core === 0 && it._score === 0; });

    return {
      kw: kw,
      news: news,
      related: related,
      weak: weak,
      broad: weak.concat(unrelated),
      unrelatedCount: unrelated.length,
      intl: intl,
      focus: related,
      books: (res[n + 2] && res[n + 2].docs) || [],
      tvs: (res[n + 3] && res[n + 3].length) ? res[n + 3] : [],
      itunes: (res[n + 4] && res[n + 4].results) || []
    };
  });
}


function renderNewsItems(list, limit) {
  var items = (list || []).slice(0, limit || 10);
  if (!items.length) return '<div class="empty">未检索到影视相关新闻</div>';
  return items.map(function (it) {
    var srcName = itemSource(it);
    var link = it.link ? ' <a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="color:#274A64">原文 ↗</a>' : "";
    return '<div class="item-line"><span class="light green"></span><b>' + esc(it.title) + '</b> <span style="color:#8A837A">(' + esc((it.pubDate || "").slice(0, 10)) + ' · ' + esc(srcName) + ')</span>' + link + '</div>';
  }).join("");
}

/* 国内新闻搜索源（Bing，中文，可直连/经 rss2json 中转） */
function fetchBingNews(kw, limit) {
  var q = encodeURIComponent(kw);
  var rss = "https://www.bing.com/news/search?q=" + q + "&format=rss";
  return fetchTimeout(rss2jsonUrl(rss))
    .then(function (r) { return r.json(); })
    .then(function (d) { return (d && d.items) || []; })
    .catch(function () { return []; });
}

/* 模糊检索工具：分词 + 核心词命中 */
var STOP_WORDS = ["的", "了", "和", "与", "在", "是", "也", "都", "及", "或", "对", "中", "为", "等", "于"];

function fuzzyTokens(kw) {
  var raw = String(kw || "").split(/[\s,，。、;；:：()（）·\-—_！!？?]+/);
  var out = [], seen = {};
  raw.forEach(function (w) {
    w = w.trim();
    if (!w || STOP_WORDS.indexOf(w) >= 0) return;
    var key = w.toLowerCase();
    if (seen[key]) return;
    if (w.length >= 2 && !/^[a-z0-9]{1,2}$/i.test(w)) { out.push(w); seen[key] = 1; }
    else if (/^[a-z]{3,}$/i.test(w)) { out.push(w); seen[key] = 1; }
  });
  return out.length ? out : [String(kw || "").trim()];
}

function fuzzyHit(text, tokens) {
  var t = String(text || "").toLowerCase();
  var hit = 0;
  for (var i = 0; i < tokens.length; i++) {
    var tk = String(tokens[i]).toLowerCase();
    if (tk && t.indexOf(tk) >= 0) hit++;
  }
  return hit;
}

/* 命中判定：一条新闻是否真的与作品/主题相关（标题或摘要中出现作品核心词） */
function coreHit(it, tokens) {
  return fuzzyHit((it.title || "") + " " + (it.description || ""), tokens);
}

/* 海外影视源抓取（模糊检索：命中任一核心词即召回，记录命中数用于筛查） */
function fetchOverseas(term) {
  var tokens = term ? fuzzyTokens(term) : [];
  var srcs = PLATFORM.overseas || [];
  var ps = srcs.map(function (s) {
    var url = rss2jsonUrl(s.rss);
    return fetchTimeout(url).then(function (r) { return r.json(); }).then(function (d) {
      var out = [];
      ((d && d.items) || []).forEach(function (it) {
        var hit = tokens.length ? fuzzyHit((it.title || "") + " " + (it.description || ""), tokens) : 1;
        if (tokens.length && hit === 0) return; // 模糊召回：命中任一核心词才保留
        it._hit = hit;
        it._src = s.name;
        out.push(it);
      });
      return out;
    }).catch(function () { return []; });
  });
  return Promise.all(ps).then(function (lists) {
    var out = [], seen = {};
    lists.forEach(function (l) {
      l.forEach(function (it) {
        var k = (it.title || "") + "|" + (it.link || "");
        if (!seen[k]) { seen[k] = 1; out.push(it); }
      });
    });
    return out;
  });
}


/* 来源识别：rss2json 多数源不带 source 字段，需回退到 author / 数据源标签 */
function itemSource(it) {
  if (it._src) return it._src;
  if (it.source && it.source.name) return it.source.name;
  var a = String(it.author || "").trim();
  if (a) return a;
  if (it._feed) return it._feed;
  /* Google News 经 rss2json 的标题常以「主标题 - 来源名」结尾，提取来源 */
  var t = String(it.title || "");
  var m = t.match(/\s-\s([^-]{2,20})$/);
  if (m) return m[1].trim();
  return "未知来源";
}

function pad2(n) { return ("0" + n).slice(-2); }

/* 稳健日期 → YYYY-MM-DD（兼容 ISO / 空格 / RFC822 等格式） */
function normDate(pubDate) {
  var s = String(pubDate || "").trim();
  if (!s) return "";
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + pad2(+m[2]) + "-" + pad2(+m[3]);
  var d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  return "";
}

/* 新闻数据规格化 */
function normalizeNews(news) {
  var srcCount = {}, byDate = {};
  news.forEach(function (it) {
    var s = itemSource(it);
    srcCount[s] = (srcCount[s] || 0) + 1;
    var d = normDate(it.pubDate);
    if (d) byDate[d] = (byDate[d] || 0) + 1;
  });
  var dist = Object.keys(srcCount).sort(function (a, b) { return srcCount[b] - srcCount[a]; })
    .slice(0, 5).map(function (s) { return { name: s, count: srcCount[s] }; });
  var dates = Object.keys(byDate).sort();
  return {
    reportCount: news.length,
    sourceCount: Object.keys(srcCount).length,
    timeSpan: dates.length ? (dates[0] + " 至 " + dates[dates.length - 1]) : "—",
    sourceDist: dist,
    dateDist: dates.slice(-7).map(function (d) { return { date: d, count: byDate[d] }; })
  };
}

/* 渲染 AI 返回的 JSON（失败显示原文） */
function parseAI(text) {
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); } catch (e) { return null; }
}

/* ---------- 视图 1：总览看板（AI 国内影视产业分析） ---------- */
function renderOverview() {
  $view.innerHTML =
    rssKeyNotice() +
    '<div class="section-title">国内影视产业 · AI 总体分析</div>' +
    '<div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
    '<span class="meta-info">进入即自动联网抓取国内影视产业动态，交由 AI 生成总体研判</span>' +
    '<span style="display:flex;gap:10px;align-items:center"><button id="btn-ov" class="btn">重新分析</button><span id="ov-status" class="pill">加载中…</span></span>' +
    '</div>' +
    aiConfigBlock() +
    '<div id="ov-result"><div class="empty">正在联网抓取国内影视产业动态…</div></div>';

  bindAIConfig();
  document.getElementById("btn-ov").addEventListener("click", function () {
    overviewAnalyze("国内影视产业");
  });
  overviewAnalyze("国内影视产业");
}

function overviewAnalyze(topic) {
  var box = document.getElementById("ov-result");
  var st = document.getElementById("ov-status");
  st.textContent = "① 联网抓取中…";
  st.className = "pill";
  box.innerHTML = '<div class="empty">正在联网抓取「' + esc(topic) + '」相关动态并交由 AI 分析…</div>';

  Promise.all([fetchNewsFor(topic, 15), fetchBingNews(topic + " 电影", 10)]).then(function (lists) {
    var seen = {}, news = [];
    (lists || []).forEach(function (list) {
      (list || []).forEach(function (it) {
        var k = (it.title || "") + "|" + (it.link || "");
        if (!seen[k]) { seen[k] = 1; news.push(it); }
      });
    });
    st.textContent = "② 大模型分析中…";
    var newsBlock = news.length
      ? news.map(function (it) { return "- " + (it.title || "") + "（" + itemSource(it) + "，" + normDate(it.pubDate) + "）"; }).join("\n")
      : "（未能联网抓取到实时新闻，请基于公开信息给出框架性分析）";
    var prompt = [
      "你是「映海御安阁」中国电影海外舆情与文化安全研判平台的分析引擎，专注于国内影视产业与舆情研判。",
      "请基于以下实时抓取的新闻资料，对「" + topic + "」进行总体研判，**只输出一个 JSON 对象**（不要 markdown 代码块），字段：",
      "{",
      "  \"heat\": 0,          // 产业关注热度 0-100",
      "  \"posRatio\": 0,     // 正面/积极占比 0-100",
      "  \"riskRatio\": 0,    // 风险/负面占比 0-100",
      "  \"summary\": \"总体综述一段话\",",
      "  \"market\": \"市场与票房动态一段话\",",
      "  \"policy\": \"政策与监管动态一段话\",",
      "  \"trend\": \"趋势判断一段话\",",
      "  \"topics\": [\"热点议题1\",\"热点议题2\",\"热点议题3\"],",
      "  \"risks\": [\"主要风险1\",\"主要风险2\"]",
      "}",
      "以下是实时新闻资料：",
      "---",
      newsBlock,
      "---",
      "请客观分析，结合影视产业的市场、政策、舆情多个维度。"
    ].join("\n");

    callLLM([{ role: "user", content: prompt }]).then(function (text) {
      renderOverviewResult(box, st, topic, text, news);
    }).catch(function (err) {
      st.textContent = "分析失败";
      st.className = "pill";
      box.innerHTML = '<div class="card"><b>AI 调用失败：</b><div class="empty">' + esc(err.message || err) + '</div></div>' + newsListBlock(news);
    });
  });
}

function renderOverviewResult(box, st, topic, text, news) {
  var o = parseAI(text);
  if (!o || o.heat === undefined) {
    st.textContent = "完成（AI 返回文本）";
    st.className = "pill online";
    box.innerHTML = '<div class="card"><h3>《' + esc(topic) + '》AI 总体研判</h3><div class="quote-box">' + esc(text) + '</div></div>' + newsListBlock(news);
    return;
  }
  var html =
    '<div class="grid grid-4" style="margin-bottom:16px">' +
    '<div class="kpi-card"><span class="num">' + (o.heat || 0) + '</span><span class="lab">产业关注热度</span></div>' +
    '<div class="kpi-card"><span class="num">' + (o.posRatio || 0) + '%</span><span class="lab">正面 / 积极</span></div>' +
    '<div class="kpi-card"><span class="num">' + (o.riskRatio || 0) + '%</span><span class="lab">风险 / 负面</span></div>' +
    '<div class="kpi-card"><span class="num">' + ((o.topics || []).length) + '</span><span class="lab">热点议题数</span></div>' +
    '</div>' +
    '<div class="card"><h3>总体综述</h3><p style="font-size:14px;color:#5C5750">' + esc(o.summary || "") + '</p></div>' +
    '<div class="grid grid-3" style="margin-top:16px">' +
    '<div class="card"><h3>市场与票房</h3><p style="font-size:13px;color:#5C5750">' + esc(o.market || "") + '</p></div>' +
    '<div class="card"><h3>政策与监管</h3><p style="font-size:13px;color:#5C5750">' + esc(o.policy || "") + '</p></div>' +
    '<div class="card"><h3>趋势判断</h3><p style="font-size:13px;color:#5C5750">' + esc(o.trend || "") + '</p></div>' +
    '</div>' +
    '<div class="grid grid-2" style="margin-top:16px">' +
    '<div class="card"><h3>热点议题</h3><ul class="step-list">' + (o.topics || []).map(function (t) { return '<li>· ' + esc(t) + '</li>'; }).join("") + '</ul></div>' +
    '<div class="card"><h3>主要风险</h3><ul class="step-list">' + (o.risks || []).map(function (r) { return '<li><span class="light red"></span>' + esc(r) + '</li>'; }).join("") + '</ul></div>' +
    '</div>' +
    newsListBlock(news);
  box.innerHTML = html;
  st.textContent = "完成：AI 总体研判已生成";
  st.className = "pill online";
}

function newsListBlock(news) {
  if (!news || !news.length) return '<div class="card" style="margin-top:16px"><div class="empty">未抓取到实时新闻。</div></div>';
  var items = news.slice(0, 8).map(function (it) {
    var link = it.link ? ' <a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="color:#274A64">原文 ↗</a>' : "";
    return '<div class="item-line"><span class="light green"></span><b>' + esc(it.title) + '</b> <span style="color:#8A837A">(' + esc(normDate(it.pubDate)) + ' · ' + esc(itemSource(it)) + ')</span>' + link + '</div>';
  }).join("");
  return '<div class="section-title">实时相关动态</div><div class="card">' + items + '</div>';
}

/* ---------- 视图 2：研判中心（检索 + 数据规格 + AI 研判 + 监测指标） ---------- */
var pendingSearch = null;

function renderAnalyze() {
  $view.innerHTML =
    rssKeyNotice() +
    '<div class="section-title">研判中心 · 作品 / 主题综合分析</div>' +
    '<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
    '<input id="az-input" class="input" type="text" placeholder="输入作品或主题，如：功夫女足、给阿嬷的情书、中国电影出海…">' +
    '<button id="btn-az" class="btn">开始研判</button>' +
    '<span id="az-status" class="pill">就绪</span>' +
    '</div>' +
    aiConfigBlock() +
    '<div id="az-result"><div class="empty" style="padding:24px 0">输入作品 / 主题，平台将：① 广域实时抓取（Google News + Open Library + TVMaze）② 数据规格化 ③ 交由 AI 结合考量逻辑生成量化研判。</div></div>';

  bindAIConfig();
  var input = document.getElementById("az-input");
  var btn = document.getElementById("btn-az");
  function go() { analyzeWork(input.value.trim()); }
  btn.addEventListener("click", go);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  if (pendingSearch) {
    input.value = pendingSearch;
    analyzeWork(pendingSearch);
    pendingSearch = null;
  } else {
    input.focus();
  }
}

function analyzeWork(kw) {
  var box = document.getElementById("az-result");
  var st = document.getElementById("az-status");
  if (!kw) { box.innerHTML = '<div class="empty">请输入作品或主题。</div>'; return; }
  st.textContent = "① 广域联网抓取中…";
  st.className = "pill";
  box.innerHTML = '<div class="empty">正在广域检索「' + esc(kw) + '」并构建数据规格…</div>';

  searchWeb(kw).then(function (data) {
    st.textContent = "② AI 研判中…";
    /* 数据规格只基于真正命中作品核心词的相关条目，避免无关泛化污染数字 */
    var spec = normalizeNews(data.related);
    var newsBlock = data.related.length
      ? data.related.map(function (it) {
          return "- " + (it.title || "") + "（" + itemSource(it) + "，" + normDate(it.pubDate) + "）✓命中作品核心词";
        }).join("\n")
      : "（未检索到与「" + kw + "」直接相关的实时新闻，请基于作品本身进行框架性研判，并明确说明缺乏实时报道）";

    var prompt = [
      "你是「映海御安阁」中国电影海外舆情与文化安全研判平台的分析引擎。",
      "请对「" + kw + "」进行舆情研判，**只输出一个 JSON 对象**（不要 markdown 代码块），字段：",
      "{",
      "  \"conclusion\": \"一段250字以上的综合研判长文（覆盖：舆情总体态势、正面表现、核心风险、趋势走向、对行业与传播的启示，条理清晰、内容详实）\",",
      "  \"conclusions\": [",
      "    {\"title\": \"核心态势\", \"detail\": \"120字以上详述\"},",
      "    {\"title\": \"正面表现\", \"detail\": \"120字以上详述\"},",
      "    {\"title\": \"风险警示\", \"detail\": \"120字以上详述\"},",
      "    {\"title\": \"趋势研判\", \"detail\": \"120字以上详述\"},",
      "    {\"title\": \"对策启示\", \"detail\": \"120字以上详述\"}",
      "  ],",
      "  \"dims\": {\"触发强度\":0,\"对象敏感\":0,\"历史存量\":0,\"传播可切片\":0,\"现实后果\":0},",
      "  \"score\": 0,",
      "  \"level\": \"低|中|高\",",
      "  \"heat\": 0,",
      "  \"posRatio\": 0,",
      "  \"riskRatio\": 0,",
      "  \"type\": \"舆情类型\",",
      "  \"topicTags\": [\"议题标签1\",\"议题标签2\"],",
      "  \"alerts\": {\"议题迁移\":false,\"主体升级\":false,\"跨语言扩散\":false,\"标签固化\":false,\"现实转化\":false,\"回应接受度\":false,\"服务损害\":false,\"合作方风险\":false},",
      "  \"advice\": [\"处置建议1（可标注 A/R 角色）\",\"处置建议2\"]",
      "}",
      "说明：dims 五维各 1-5 分，score 总分/25，heat 热度 0-100，posRatio/riskRatio 正面与风险占比（与中性合计100）。",
      "研判方法论：",
      "- 四层分析框架：作品文本 / 在地解码 / 平台扩散 / 政治再框架",
      "- 四类主导舆情：文化认同与政策型 / 邻国形象与刻板印象型 / 事实伦理与制度型 / 专业工艺与类型片型",
      "- 八大监测指标（alerts 请根据资料判断哪些已触发）：议题迁移、主体升级、跨语言扩散、标签固化、现实转化、回应接受度、服务损害、合作方风险",
      "- RACI 决策：A=最终拍板 R=直接执行 C=必须会签 I=知会",
      "实时抓取到的新闻资料（均已命中作品/主题核心词、与研判对象直接相关）：",
      "---",
      newsBlock,
      "---",
      "请基于以上资料给出客观、量化的研判。"
    ].join("\n");

    callLLM([{ role: "user", content: prompt }]).then(function (text) {
      renderAnalyzeResult(box, st, kw, text, data, spec);
    }).catch(function (err) {
      st.textContent = "AI 失败，显示检索结果";
      st.className = "pill";
      box.innerHTML =
        '<div class="card"><b>AI 调用失败：</b><div class="empty">' + esc(err.message || err) + '</div></div>' +
        analyzeRawBlock(data, spec);
    });
  });
}
function analyzeRawBlock(data, spec) {
  return methodBlock() +
    '<div class="section-title">实时检索结果（命中「' + esc(data.kw || "") + '」优先）</div>' +
    '<div class="card">' + renderNewsItems(data.related, 10) +
    (data.weak && data.weak.length ? '<div class="empty" style="padding-top:8px">另有 ' + data.weak.length + ' 条疑似泛化内容（未直接提及作品，仅供参考）</div>' : '') +
    (data.unrelatedCount ? '<div class="empty" style="padding-top:4px">已过滤 ' + data.unrelatedCount + ' 条与作品无关的同名/泛化条目</div>' : '') + '</div>';
}

/* 研判模型 · 平台标准框架（纯静态，离线可靠；替代数据规格栏） */
var DIM_DEFS = {
  "触发强度": "事件引发舆情的势能",
  "对象敏感": "涉及主体与议题的敏感度",
  "历史存量": "历史积怨与刻板印象储备",
  "传播可切片": "内容被切割、放大的可能",
  "现实后果": "向排片、票房、品牌与秩序转化"
};

function methodBlock() {
  var d = PLATFORM;
  var cn = ["一", "二", "三", "四", "五"];
  var dimRows = d.dims.map(function (k, i) {
    return '<li><span class="arch-no">' + cn[i] + '</span>' +
      '<div><div class="arch-name">' + esc(k) + '</div><div class="arch-desc">' + esc(DIM_DEFS[k] || "") + '</div></div></li>';
  }).join("");
  var types = d.sentimentTypes.map(function (t) {
    return '<span class="badge high" style="margin:0 6px 6px 0">' + esc(t) + '</span>';
  }).join("");
  var raciRows = d.dispatching.raci.map(function (r) {
    var cls = r.role.indexOf("A") === 0 ? "raci-a" : (r.role.indexOf("R") === 0 ? "raci-r" : (r.role.indexOf("C") === 0 ? "raci-c" : "raci-i"));
    return '<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px dashed var(--hairline);font-size:13px">' +
      '<span class="' + cls + '" style="flex:0 0 128px">' + esc(r.role) + '</span>' +
      '<span style="flex:1;color:var(--ink-2)">' + esc(r.desc) + ' · ' + esc(r.who) + '</span>' +
      '<span style="color:var(--ink-3);font-size:11px">' + esc(r.note) + '</span></div>';
  }).join("");
  var indChips = d.indicators.map(function (ind) {
    return '<div style="background:#F6F2EA;border-left:3px solid var(--ink-blue);border-radius:0 4px 4px 0;padding:9px 11px">' +
      '<div style="font-size:12px;font-weight:600;color:var(--ink)">' + esc(ind.name) + '</div>' +
      '<div style="font-size:11px;color:var(--ink-3);margin-top:2px;line-height:1.6">' + esc(ind.threshold) + '</div></div>';
  }).join("");
  return '<div class="section-title">研判模型 · 平台标准框架</div>' +
    '<div class="card" style="border-top:3px solid var(--cinnabar)">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:14px">' +
    '<div class="report-title" style="font-size:15px">映海研判框架</div>' +
    '<span class="pill">五维风险 · 四类舆情 · RACI · 八项监测</span></div>' +
    '<div class="grid grid-2">' +
    '<div><h4 style="margin-bottom:6px">五维风险模型</h4><ul class="arch-list">' + dimRows + '</ul></div>' +
    '<div><h4 style="margin-bottom:6px">四类主导舆情</h4><div style="margin-bottom:14px">' + types + '</div>' +
    '<h4 style="margin-bottom:6px">RACI 决策规则</h4>' + raciRows + '</div>' +
    '</div>' +
    '<h4 style="margin-top:18px">八大监测指标 · 预警阈值</h4>' +
    '<div class="grid grid-4" style="gap:10px;margin-top:8px">' + indChips + '</div>' +
    '</div>';
}

function renderAnalyzeResult(box, st, kw, text, data, spec) {
  var o = parseAI(text);
  if (!o || !o.dims) {
    st.textContent = "完成（AI 返回文本）";
    st.className = "pill online";
    box.innerHTML =
      '<div class="card"><h3>《' + esc(kw) + '》AI 研判</h3><div class="quote-box">' + esc(text) + '</div></div>' +
      analyzeRawBlock(data, spec);
    return;
  }

  /* 监测指标触发表 */
  var alertRows = PLATFORM.indicators.map(function (ind) {
    var hit = o.alerts && o.alerts[ind.name] === true;
    return '<tr><td>' + (hit ? '<span class="light red"></span>' : '<span class="light green"></span>') + esc(ind.name) + '</td>' +
      '<td>' + esc(ind.def) + '</td>' +
      '<td style="text-align:center">' + (hit ? '<span class="badge high">已触发</span>' : '<span class="badge low">正常</span>') + '</td></tr>';
  }).join("");

  var dims = PLATFORM.dims.map(function (k) {
    var v = (o.dims && o.dims[k]) || 0;
    return '<div class="dim-row"><span class="dim-label">' + k + '</span>' +
      '<div class="dim-track"><div class="dim-fill" style="width:' + (v / 5 * 100) + '%;background:' + dimColor(v) + '"></div></div>' +
      '<span style="flex:0 0 32px;font-size:12px;color:#8A837A">' + v + '/5</span></div>';
  }).join("");
  var net = Math.max(0, 100 - (o.posRatio || 0) - (o.riskRatio || 0));
  var ratio = '<div class="ratio-track">' +
    '<div class="ratio-seg" style="width:' + (o.posRatio || 0) + '%;background:#274A64">正面 ' + (o.posRatio || 0) + '%</div>' +
    '<div class="ratio-seg" style="width:' + net + '%;background:#8A837A"></div>' +
    '<div class="ratio-seg" style="width:' + (o.riskRatio || 0) + '%;background:#A63A2B">风险 ' + (o.riskRatio || 0) + '%</div>' +
    '</div>';
  /* AI 结论渲染：综合长文 + 分条详述（兼容新旧格式） */
  var conclLong = "";
  if (typeof o.conclusion === "string" && o.conclusion) conclLong = esc(o.conclusion);
  else if (Array.isArray(o.conclusion) && o.conclusion.length) conclLong = esc(o.conclusion.join("；"));
  var conclItems = "";
  if (o.conclusions && o.conclusions.length) {
    conclItems = o.conclusions.map(function (c) {
      return '<li class="concl-item"><b>' + esc(c.title || "研判") + '</b><p>' + esc(c.detail || c.text || "") + '</p></li>';
    }).join("");
  } else if (Array.isArray(o.conclusion) && o.conclusion.length) {
    conclItems = o.conclusion.map(function (c) {
      return '<li class="concl-item"><p>' + esc(c) + '</p></li>';
    }).join("");
  }
  var conclHtml = (conclLong ? '<div class="card" style="margin-bottom:12px"><h3>综合研判</h3><p style="font-size:14px;color:#5C5750;line-height:2">' + conclLong + '</p></div>' : '') +
    (conclItems ? '<div class="card"><ul class="step-list concl-list">' + conclItems + '</ul></div>' : '');
  var tags = (o.topicTags || []).map(function (t) { return '<span class="badge low" style="margin-right:6px;color:#274A64;border-color:#274A64">' + esc(t) + '</span>'; }).join("");
  var advice = (o.advice || []).map(function (a, i) { return '<li><b>0' + (i + 1) + '</b>　' + esc(a) + '</li>'; }).join("");

  box.innerHTML =
    '<div class="grid grid-4" style="margin-bottom:16px">' +
    '<div class="kpi-card"><span class="num">' + (o.heat || 0) + '</span><span class="lab">舆情热度</span></div>' +
    '<div class="kpi-card"><span class="num">' + (o.posRatio || 0) + '%</span><span class="lab">正面 / 专业</span></div>' +
    '<div class="kpi-card"><span class="num">' + (o.riskRatio || 0) + '%</span><span class="lab">风险舆情占比</span></div>' +
    '<div class="kpi-card"><span class="num" style="color:' + (o.level === "高" ? "#A63A2B" : "#3E7A55") + '">' + esc(o.level || "-") + '</span><span class="lab">AI 风险等级</span></div>' +
    '</div>' +

    methodBlock() +

    '<div class="section-title">AI 量化研判</div>' +
    '<div class="grid grid-2">' +
    '<div class="card"><h3>五维风险（AI 评分 ' + (o.score || 0) + '/25）</h3>' + dims + '</div>' +
    '<div class="card"><h3>舆情倾向量化</h3>' + ratio +
    '<p style="font-size:12px;color:#8A837A;margin-top:6px">舆情类型：' + esc(o.type || "-") + '</p>' +
    '<div style="margin-top:8px">' + (tags || '') + '</div></div>' +
    '</div>' +

    '<div class="section-title">八大监测指标触发状态</div>' +
    '<div class="card"><div class="table-wrap"><table class="data"><thead><tr><th style="width:120px">指标</th><th>定义</th><th style="width:80px">状态</th></tr></thead><tbody>' + alertRows + '</tbody></table></div></div>' +

    '<div class="section-title">AI 研判结论</div>' + conclHtml +
    '<div class="section-title">处置建议（可参考处置工具中的 RACI 规则）</div><div class="card"><ul class="step-list">' + advice + '</ul></div>' +

    '<div class="section-title">实时检索结果（命中「' + esc(kw) + '」优先）</div>' +
    '<div class="card">' + renderNewsItems(data.related, 10) +
    (data.weak && data.weak.length ? '<div class="empty" style="padding-top:8px">另有 ' + data.weak.length + ' 条疑似泛化内容（未直接提及作品，仅供参考）</div>' : '') +
    (data.unrelatedCount ? '<div class="empty" style="padding-top:4px">已过滤 ' + data.unrelatedCount + ' 条与作品无关的同名/泛化条目</div>' : '') + '</div>';

  st.textContent = "完成：研判已生成";
  st.className = "pill online";

  /* 研判完成后自动生成「完整报告」（由 report.js 提供） */
  if (typeof renderReportCard === "function") {
    renderReportCard(box, kw, o, data, spec);
  }
}

/* ---------- 视图 3：处置工具（纯逻辑） ---------- */
function renderPlaybook() {
  var d = PLATFORM.dispatching;
  var raciRows = d.raci.map(function (r) {
    return '<tr><td class="raci-r">' + esc(r.role) + '</td><td>' + esc(r.desc) + '</td><td>' + esc(r.who) + '</td><td>' + esc(r.note) + '</td></tr>';
  }).join("");
  var sop = d.sop.map(function (s) { return '<li><b>' + esc(s.t) + '</b> — ' + esc(s.act) + '</li>'; }).join("");
  var avoid = d.avoid.map(function (a, i) { return '<li><b>禁止</b> ' + esc(a) + '</li>'; }).join("");

  $view.innerHTML =
    '<div class="section-title">处置工具 · 研判处置方法论</div>' +
    '<div class="card"><p style="font-size:13px;color:#5C5750">本模块提供舆情研判与处置的<b>标准逻辑框架</b>（不依赖具体案例），供人工研判与 AI 处置建议共同参考。</p></div>' +

    '<div class="section-title">RACI 决策规则</div>' +
    '<div class="card"><div class="table-wrap"><table class="data"><thead><tr><th style="width:140px">角色</th><th>含义</th><th>通常由谁承担</th><th>要点</th></tr></thead><tbody>' + raciRows + '</tbody></table></div>' +
    '<p style="font-size:12px;color:#8A837A;margin-top:8px">核心纪律：同一事项只设一个 A（最终负责），其余为执行、会签与知会，避免“三个和尚没水喝”。</p></div>' +

    '<div class="section-title">0—72 小时标准处置流程</div>' +
    '<div class="card"><ul class="step-list">' + sop + '</ul></div>' +

    '<div class="section-title">首轮声明模板</div>' +
    '<div class="card"><div class="quote-box">' + esc(d.statement) + '</div>' +
    '<p style="font-size:12px;color:#8A837A;margin-top:8px">提示：高敏感声明禁止仅靠机器翻译；所有地区版本必须保留版本号与审签链。</p></div>' +

    '<div class="section-title">必须避免的动作</div>' +
    '<div class="card"><ul class="step-list">' + avoid + '</ul></div>';
}

/* ---------- 视图 4：数据采集 ---------- */
function renderCollect() {
  var c = getCollect();
  var srcs = PLATFORM.sources.map(function (s) {
    var dotCls = s.reach === "可直连" ? "green" : (s.reach === "受限" ? "yellow" : "gray");
    return '<div class="source-item"><span class="source-name"><span class="light ' + dotCls + '"></span>' + esc(s.name) + '</span>' +
      '<span class="source-sub">' + esc(s.region) + ' · ' + esc(s.type) + ' · ' + esc(s.reach) + '</span></div>';
  }).join("");

  var items = (c.items && c.items.length)
    ? c.items.map(function (it) {
        return '<div class="item-line"><b>' + esc(it.title || it.name || "条目") + '</b> <span style="color:#8A837A">(' + esc(it.source || "未知来源") + ')</span>　' + esc(it.summary || it.score || "") + '</div>';
      }).join("")
    : '<div class="empty">尚无预采集数据。运行 <code>python collector.py</code> 可抓取公开源生成 data/collect.json；平台研判功能已接入实时联网抓取，不受此影响。</div>';

  $view.innerHTML =
    '<div class="section-title">采集状态</div>' +
    '<div class="card"><div style="display:flex;gap:12px;flex-wrap:wrap">' +
    '<span class="pill ' + (c.status === "online" ? "online" : "") + '">' + (c.status === "online" ? "● 已采集 " + (c.items || []).length + " 条" : "○ 预采集（研判走实时）") + '</span>' +
    '<span class="pill">' + esc(c.updated || "运行 python collector.py 更新") + '</span>' +
    '</div>' +
    '<p style="font-size:13px;color:#5C5750;margin-top:10px">研判中心与总览看板已接入<b>实时联网抓取</b>（Google News、Bing 国内源、海外影视源），此处的 collector.py 预采集为可选的本地批量采集。</p></div>' +

    '<div class="section-title">中转服务 Key 设置（可选，强烈建议）</div>' +
    '<div class="card" style="border-left:3px solid var(--ink-blue)">' +
    '<p style="font-size:13px;color:#5C5750">实时抓取经 <b>rss2json.com</b> 中转。免费无 key 有请求限流（可能返回 0），注册<b>免费 API Key</b> 填入可大幅提升稳定性。</p>' +
    '<p style="font-size:12px;color:#8A837A;margin-bottom:8px">获取方式：打开 rss2json.com → 点击 Get free API key → 用 Google 账号登录即得（免费）。</p>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
    '<input id="rss-key" class="input" type="password" placeholder="rss2json API Key（可选）" value="' + esc(getRssKey()) + '" style="max-width:340px">' +
    '<button id="btn-rss-key" class="btn">保存 Key</button><span id="rss-key-msg" class="meta-info"></span>' +
    '</div></div>' +

    '<div class="section-title">实时联网抓取</div>' +
    '<div class="card"><p style="font-size:13px;color:#5C5750">点击按钮，平台经 rss2json.com 服务器中转实时抓取 The Guardian 电影频道最新影评。</p>' +
    '<button id="btn-live" class="btn">立即联网抓取</button>' +
    '<div id="live-box" class="empty">尚未抓取，点击按钮联网获取最新海外影评。</div></div>' +

    '<div class="section-title">海外影视源实时抓取</div>' +
    '<div class="card"><p style="font-size:13px;color:#5C5750">点击按钮，抓取 Guardian / BBC / Variety / Hollywood Reporter / IGN 五家海外专业影视媒体的最新动态。</p>' +
    '<button id="btn-overseas" class="btn">抓取海外影视源</button>' +
    '<div id="overseas-box" class="empty">尚未抓取。</div></div>' +

    '<div class="section-title">国内新闻源实时抓取</div>' +
    '<div class="card"><p style="font-size:13px;color:#5C5750">点击按钮，抓取 Bing 中文新闻关于「电影 影视 票房」的国内最新动态。</p>' +
    '<button id="btn-domestic" class="btn">抓取国内新闻源</button>' +
    '<div id="domestic-box" class="empty">尚未抓取。</div></div>' +

    '<div class="section-title">最新采集条目</div>' +
    '<div class="card">' + items + '</div>' +

    '<div class="section-title">数据源清单</div>' +
    '<div class="card">' + srcs + '</div>';

  var btn = document.getElementById("btn-live");
  if (btn) btn.addEventListener("click", liveFetch);
  var obtn = document.getElementById("btn-overseas");
  if (obtn) obtn.addEventListener("click", overseasFetch);
  var dbtn = document.getElementById("btn-domestic");
  if (dbtn) dbtn.addEventListener("click", domesticFetch);
  var rk = document.getElementById("btn-rss-key");
  if (rk) rk.addEventListener("click", function () {
    var v = document.getElementById("rss-key").value.trim();
    try { localStorage.setItem("rss2json_key", v); } catch (e) {}
    document.getElementById("rss-key-msg").textContent = v ? "已保存 ✓" : "已清除";
  });
}

function domesticFetch() {
  var box = document.getElementById("domestic-box");
  if (!box) return;
  box.className = "empty";
  box.textContent = "正在抓取国内新闻源…";
  fetchBingNews("电影 影视 票房", 15).then(function (list) {
    if (!list.length) { box.textContent = "未抓取到数据（接口限流或网络问题）。"; return; }
    list.forEach(function (it) { it._src = it._src || "Bing 新闻"; });
    box.innerHTML = renderNewsItems(list, 12);
  }).catch(function () { box.textContent = "抓取失败，请稍后再试。"; });
}

function overseasFetch() {
  var box = document.getElementById("overseas-box");
  if (!box) return;
  box.className = "empty";
  box.textContent = "正在抓取 5 家海外影视源…";
  fetchOverseas("").then(function (list) {
    if (!list.length) { box.textContent = "未抓取到数据（接口限流或网络问题）。"; return; }
    box.innerHTML = renderNewsItems(list, 15);
  }).catch(function () { box.textContent = "抓取失败，请稍后再试。"; });
}

function liveFetch() {
  var box = document.getElementById("live-box");
  if (!box) return;
  box.className = "empty";
  box.textContent = "正在联网抓取 The Guardian 最新影评…";
  var rss = encodeURIComponent("https://www.theguardian.com/film/rss");
  var url = "https://api.rss2json.com/v1/api.json?rss_url=" + rss;
  fetch(url, { mode: "cors" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var items = (d && d.items) || [];
      if (!items.length) { box.textContent = "未获取到数据（接口限流或网络问题），请稍后再试。"; return; }
      box.innerHTML = items.slice(0, 10).map(function (it) {
        var link = it.link ? ' <a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="color:#274A64">原文 ↗</a>' : "";
        return '<div class="item-line"><b>' + esc(it.title) + '</b> <span style="color:#8A837A">(' + esc((it.pubDate || "").slice(0, 10)) + ')</span>' + link + '</div>';
      }).join("");
    })
    .catch(function () { box.textContent = "抓取失败（网络或接口限制），请稍后再试。"; });
}

/* ---------- 路由表 ---------- */
var VIEWS = {
  "/overview": renderOverview,
  "/analyze": renderAnalyze,
  "/playbook": renderPlaybook,
  "/collect": renderCollect
};

/* ---------- 初始化 ---------- */
function init() {
  $meta.textContent = "实时数据 + AI 研判 · " + PLATFORM.meta.version;
  loadCollect();
  router();
  window.addEventListener("hashchange", router);

  var gs = document.getElementById("global-search");
  if (gs) {
    gs.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var v = gs.value.trim();
        if (v) { pendingSearch = v; location.hash = "#/analyze"; }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
