/* ════════════════════════════════════════════════════════
   映海御安阁 · 中国电影海外舆情与文化安全研判平台
   核心逻辑 app.js
   hash 路由 + 六视图渲染 + SVG 图表（雷达 / 趋势）+ 数据加载
   零依赖、零构建，可本地双击运行，也可部署 GitHub Pages。
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
var $collectStatus = document.getElementById("collect-status");

var TITLES = {
  "/overview": "总览看板",
  "/films": "影片研判",
  "/events": "事件工作台",
  "/monitor": "监测预警",
  "/live": "实时监测",
  "/search": "自由检索",
  "/collect": "数据采集"
};

/* ---------- SVG 图表 ---------- */

/* 五维雷达图 */
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
    axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt(i, r).split(",")[0] + '" y2="' + pt(i, r).split(",")[1] + '" stroke="#DDD6CA" stroke-width="1"/>';
    var lx = cx + (r + 16) * Math.cos(angle(i));
    var ly = cy + (r + 16) * Math.sin(angle(i));
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

/* 趋势折线图 */
function lineSVG(data, keys, colors) {
  var W = 640, H = 220, pad = 34, max = 100;
  var stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;
  var grid = "", lines = "", dots = "", xlab = "";
  for (var g = 0; g <= 4; g++) {
    var y = pad + g * ((H - pad * 2) / 4);
    grid += '<line x1="' + pad + '" y1="' + y + '" x2="' + (W - pad) + '" y2="' + y + '" stroke="#EFE9DF" stroke-width="1"/>';
  }
  keys.forEach(function (key, ki) {
    var pts = data.map(function (d, i) {
      var x = pad + i * stepX;
      var y = H - pad - (d[key] / max) * (H - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    lines += '<polyline points="' + pts + '" fill="none" stroke="' + colors[ki] + '" stroke-width="2"/>';
  });
  data.forEach(function (d, i) {
    var x = pad + i * stepX;
    keys.forEach(function (key, ki) {
      var y = H - pad - (d[key] / max) * (H - pad * 2);
      dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + colors[ki] + '"/>';
    });
    xlab += '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" font-size="11" fill="#8A837A" text-anchor="middle">' + esc(d.month) + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" style="width:100%">' + grid + lines + dots + xlab + '</svg>';
}

/* ---------- 数据采集加载 ---------- */
var collectData = null;

function loadCollect() {
  fetch("data/collect.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      collectData = d;
      setCollectStatus();
      if (getRoute() === "/collect") renderCollect();
    })
    .catch(function () {
      /* 本地双击或未采集时，用内置样例兜底 */
    });
}

function getCollect() { return collectData || PLATFORM.collect; }

function setCollectStatus() {
  var c = getCollect();
  var label = c.status === "online"
    ? "数据：已采集 " + (c.items ? c.items.length : 0) + " 条"
    : "数据：演示样例";
  $collectStatus.textContent = label;
  $collectStatus.className = "pill " + (c.status === "online" ? "online" : "");
}

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

/* ---------- 视图 1：总览 ---------- */
function renderOverview() {
  var kpi = PLATFORM.kpi.map(function (k) {
    return '<div class="kpi-card"><span class="num">' + esc(k.value) + '</span><span class="lab">' + esc(k.label) + '</span></div>';
  }).join("");

  var bars = PLATFORM.sentiment.map(function (s) {
    return '<div class="bar-row"><span class="bar-label">' + esc(s.name) + '</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + s.pct + '%;background:' + s.color + '"></div></div>' +
      '<span class="bar-value">' + s.pct + '%</span></div>';
  }).join("");

  var legend = '<div class="legend">' +
    '<span><i style="background:#274A64"></i>正面 / 专业讨论</span>' +
    '<span><i style="background:#A63A2B"></i>风险舆情</span></div>';

  var trend = lineSVG(PLATFORM.trend, ["positive", "risk"], ["#274A64", "#A63A2B"]);

  var alerts = PLATFORM.events.filter(function (e) { return e.level.indexOf("高") >= 0 || e.level.indexOf("中") >= 0; });
  var alertHtml = alerts.map(function (e) {
    var cls = e.level.indexOf("高") >= 0 ? "high" : "mid";
    return '<div class="source-item"><span class="source-name"><span class="light ' + (cls === "high" ? "red" : "yellow") + '"></span>' + esc(e.title) + '</span>' +
      '<span class="source-sub">' + esc(e.film) + ' · <span class="badge ' + cls + '">' + esc(e.level) + '风险</span> · ' + esc(e.status) + '</span></div>';
  }).join("");

  $view.innerHTML =
    '<div class="grid grid-4">' + kpi + '</div>' +
    '<div class="section-title">四类主导舆情分布</div>' +
    '<div class="card"><div class="chart-bars">' + bars + '</div>' +
    '<p style="font-size:12px;color:#8A837A;margin-top:4px">基于近期出海影片舆情分类研判，数据来源于团队智库研究报告。</p></div>' +
    '<div class="section-title">舆情热度趋势（2026年5—7月）</div>' +
    '<div class="card">' + legend + trend + '</div>' +
    '<div class="section-title">当前风险提示</div>' +
    '<div class="card">' + (alertHtml || '<div class="empty">当前无高风险事件</div>') + '</div>';
}

/* ---------- 视图 2：影片研判 ---------- */
function dimColor(v) {
  return v >= 4 ? "#A63A2B" : (v === 3 ? "#C7A76C" : "#274A64");
}

function renderFilms() {
  var cards = PLATFORM.films.map(function (f) {
    var badgeCls = f.level.indexOf("高") >= 0 ? "high" : (f.level.indexOf("中") >= 0 ? "mid" : "low");
    var dims = f.dims.map(function (v, i) {
      return '<div class="dim-row"><span class="dim-label">' + esc(PLATFORM.dims[i]) + '</span>' +
        '<div class="dim-track"><div class="dim-fill" style="width:' + (v / 5 * 100) + '%;background:' + dimColor(v) + '"></div></div>' +
        '<span style="flex:0 0 32px;font-size:12px;color:#8A837A">' + v + '/5</span></div>';
    }).join("");
    return '<div class="film-card">' +
      '<div class="film-head"><div><span class="film-title">' + esc(f.title) + '</span> <span class="film-en">' + esc(f.en) + '</span></div>' +
      '<span class="film-score">' + f.score + '<span style="font-size:11px;color:#8A837A">/25</span></span></div>' +
      '<div class="film-meta">' + esc(f.type) + ' · <span class="badge ' + badgeCls + '">' + esc(f.level) + '风险</span></div>' +
      '<div class="card" style="margin-bottom:10px"><div class="section-title" style="margin:0 0 8px">五维风险研判</div>' + dims + '</div>' +
      '<p class="film-verdict"><b>研判结论：</b>' + esc(f.verdict) + '</p>' +
      '<p class="film-verdict" style="margin-bottom:0"><b>管理重点：</b>' + esc(f.manage) + '</p>' +
      '</div>';
  }).join("");

  $view.innerHTML =
    '<div class="section-title">监测影片研判总览</div>' +
    '<div class="grid grid-2">' + cards + '</div>' +
    '<div class="section-title">五维风险判断模型</div>' +
    '<div class="card"><p style="margin-bottom:6px">从 <b>触发强度、对象敏感、历史存量、传播可切片、现实后果</b> 五个维度（各 1—5 分，满分 25）评估影片海外舆情风险；真正的高风险不是一般负面评论，而是：① 画面中可识别群体被赋予道德缺陷；② 真实案件缺少可核验材料；③ 作品被机构性使用后触发身份与政治猜疑。</p></div>';
}

/* ---------- 视图 3：事件工作台 ---------- */
function renderEvents() {
  var cards = PLATFORM.events.map(function (e) {
    var badgeCls = e.level.indexOf("高") >= 0 ? "high" : "mid";
    var raciRows = e.raci.map(function (r) {
      return '<tr><td>' + esc(r.item) + '</td>' +
        '<td class="raci-a">' + esc(r.A) + '</td>' +
        '<td class="raci-r">' + esc(r.R) + '</td>' +
        '<td class="raci-c">' + esc(r.C) + '</td>' +
        '<td class="raci-i">' + esc(r.I) + '</td></tr>';
    }).join("");
    var steps = e.steps.map(function (s) {
      return '<li><b>' + esc(s.t) + '</b> — ' + esc(s.act) + '</li>';
    }).join("");
    return '<div class="event-card">' +
      '<div class="event-head"><span class="event-title">' + esc(e.id) + ' · ' + esc(e.title) + '</span>' +
      '<span><span class="badge ' + badgeCls + '">' + esc(e.level) + '风险</span> <span class="badge low">' + esc(e.status) + '</span></span></div>' +
      '<div class="event-meta">关联影片：' + esc(e.film) + ' · 发现时间：' + esc(e.discovered) + '</div>' +
      '<div class="event-body">' +
      '<h4>RACI 决策规则（A=最终拍板 · R=直接执行 · C=必须会签 · I=知会）</h4>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>事项</th><th>A 最终负责</th><th>R 直接执行</th><th>C 必须会签</th><th>I 知会</th></tr></thead><tbody>' + raciRows + '</tbody></table></div>' +
      '<h4 style="margin-top:12px">0—72 小时处置步骤</h4>' +
      '<ul class="step-list">' + steps + '</ul>' +
      '</div></div>';
  }).join("");

  var st = PLATFORM.statementTemplate;
  $view.innerHTML =
    '<div class="section-title">在办舆情事件</div>' +
    cards +
    '<div class="section-title">首轮声明模板（多语种事实底稿）</div>' +
    '<div class="card"><div class="quote-box"><b>' + esc(st.title) + '</b>\n' + esc(st.body) + '</div>' +
    '<p style="font-size:12px;color:#8A837A;margin-top:8px">提示：高敏感声明禁止仅靠机器翻译；所有地区版本必须保留版本号与审签链。</p></div>' +
    '<div class="section-title">必须避免的动作</div>' +
    '<div class="card"><ul class="step-list">' +
    '<li><b>禁止</b> 把所有海外批评统称为反华或政治操弄</li>' +
    '<li><b>禁止</b> 用国内票房或评分证明海外表达无害</li>' +
    '<li><b>禁止</b> 只解释创作意图而不承认实际影响</li>' +
    '<li><b>禁止</b> 让导演/演员未经简报单独即兴回应</li>' +
    '<li><b>禁止</b> 高敏感声明仅靠机器翻译</li>' +
    '<li><b>禁止</b> 以删帖或热度下降宣布结案，必须核查版本、退款、合作方与制度整改是否闭环</li>' +
    '</ul></div>';
}

/* ---------- 视图 4：监测预警 ---------- */
function renderMonitor() {
  var rows = PLATFORM.indicators.map(function (ind, i) {
    var lightCls = i < 2 ? "red" : (i < 4 ? "yellow" : "gray");
    return '<tr><td><span class="light ' + lightCls + '"></span>' + esc(ind.name) + '</td>' +
      '<td>' + esc(ind.def) + '</td>' +
      '<td>' + esc(ind.threshold) + '</td></tr>';
  }).join("");

  $view.innerHTML =
    '<div class="section-title">八大监测指标与预警阈值</div>' +
    '<div class="card"><div class="table-wrap"><table class="data">' +
    '<thead><tr><th style="width:120px">指标</th><th>定义</th><th>建议触发阈值</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>' +
    '<p style="font-size:12px;color:#8A837A;margin-top:8px">阈值是建议起点，应在各市场用历史项目基线校准；不能用未经校准的全球提及量或情感正负比例替代人工研判。</p></div>' +

    '<div class="section-title">每日看板必答问题</div>' +
    '<div class="card"><ul class="step-list">' +
    '<li>今天新增了哪些经过核验的事实，哪些仍未知？</li>' +
    '<li>争议在哪个国家、语言、平台和群体中扩散；是否进入主流媒体或机构主体？</li>' +
    '<li>当前传播的是完整影片、特定镜头、字幕版本，还是戏外程序？</li>' +
    '<li>观众提出的是审美评价、文化伤害、事实/法律指控，还是发行服务问题？</li>' +
    '<li>排片、票房、退款、分级、合作方、主创行程和监管是否已受影响？</li>' +
    '<li>上一轮回应是否被主流报道引用；哪些表述产生了二次误读？</li>' +
    '</ul></div>';
}

/* ---------- 视图 5：数据采集 ---------- */
function renderCollect() {
  var c = getCollect();
  var srcs = PLATFORM.sources.map(function (s) {
    var reachCls = s.reach === "可直连" ? "ok" : (s.reach === "受限" ? "warn" : "ink-3");
    var dotCls = s.reach === "可直连" ? "green" : (s.reach === "受限" ? "yellow" : "gray");
    return '<div class="source-item"><span class="source-name"><span class="light ' + dotCls + '"></span>' + esc(s.name) + '</span>' +
      '<span class="source-sub">' + esc(s.region) + ' · ' + esc(s.type) + ' · ' + esc(s.reach) + '</span></div>';
  }).join("");

  var items = (c.items && c.items.length)
    ? c.items.map(function (it) {
        return '<div class="item-line"><b>' + esc(it.title || it.name || "条目") + '</b> <span style="color:#8A837A">(' + esc(it.source || "未知来源") + ')</span>　' + esc(it.summary || it.score || "") + '</div>';
      }).join("")
    : '<div class="empty">尚无真实采集数据。运行 <code>python collector.py</code> 可抓取公开数据源，生成 data/collect.json；当前展示为演示样例。</div>';

  var upd = c.updated ? '最近更新：' + esc(c.updated) : '';

  $view.innerHTML =
    '<div class="section-title">采集状态</div>' +
    '<div class="card"><div class="kpi-grid" style="display:flex;gap:12px;flex-wrap:wrap">' +
    '<span class="pill ' + (c.status === "online" ? "online" : "") + '">' + (c.status === "online" ? "● 已采集" : "○ 待采集（演示样例）") + '</span>' +
    '<span class="pill">' + esc(upd || "运行 python collector.py 采集") + '</span>' +
    '</div>' +
    '<p style="font-size:13px;color:#5C5750;margin-top:10px">采集方式：本地脚本抓取公开可直连源（豆瓣、公开 RSS 等）→ 生成 data/collect.json → 平台加载展示；海外源尽力抓取，受限源用智库报告样例数据兜底。</p></div>' +

    '<div class="section-title">实时联网抓取</div>' +
    '<div class="card"><p style="font-size:13px;color:#5C5750">点击按钮，平台经 <b>rss2json.com</b> 服务器中转实时抓取 The Guardian 电影频道最新影评（服务器端抓取，绕过本地网络限制）。</p>' +
    '<button id="btn-live" class="btn">立即联网抓取</button>' +
    '<div id="live-box" class="empty">尚未抓取，点击上方按钮联网获取最新海外影评。</div></div>' +

    '<div class="section-title">最新采集条目</div>' +
    '<div class="card">' + items + '</div>' +

    '<div class="section-title">数据源清单</div>' +
    '<div class="card">' + srcs + '</div>';

    var btn = document.getElementById("btn-live");
    if (btn) { btn.addEventListener("click", liveFetch); }
}

/* 实时联网抓取：经 rss2json 服务器中转拉取 Guardian 影评 */
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

/* ---------- 视图 6：实时监测（自选影片 + 实时联网量化） ---------- */

/* 各影片实时量化数据（热度/倾向基于智库报告基线；keywords 用于实时报道匹配） */
var LIVE_DATA = {
  "geama": { heat: 72, pos: 40, risk: 38, keywords: ["a letter to grandma", "grandma", "teochew"], news: [
    { title: "新加坡批准更多潮州话场次并检视方言电影规则", date: "2026-07", source: "CNA" },
    { title: "《给阿嬷的情书》进入英国、爱尔兰和法国", date: "2026-07", source: "Screen Daily" } ] },
  "huo": { heat: 55, pos: 62, risk: 12, keywords: ["fire shrouds"], news: [
    { title: "《火遮眼》动作设计获专业媒体好评", date: "2026-06", source: "Los Angeles Times" } ] },
  "gongfu": { heat: 88, pos: 18, risk: 72, keywords: ["kung fu women", "kung fu"], news: [
    { title: "《功夫女足》韩国女足形象争议持续", date: "2026-07", source: "The Korea Times" },
    { title: "《功夫女足》在韩国“越位”引发中韩评价差异", date: "2026-07", source: "Korea JoongAng Daily" } ] },
  "jail": { heat: 85, pos: 15, risk: 74, keywords: ["mom from prison", "prison"], news: [
    { title: "《监狱来的妈妈》撤档与司法事实争议", date: "2026-07", source: "South China Morning Post" },
    { title: "影片撤档、真实案件与服刑拍摄争议", date: "2026-07", source: "The Standard" } ] },
  "baxian": { heat: 45, pos: 58, risk: 20, keywords: ["eight immortals"], news: [
    { title: "《八仙！》海外上映安排", date: "2026-07", source: "CGTN" } ] },
  "faf": { heat: 50, pos: 70, risk: 8, keywords: ["farewell my concubine"], news: [
    { title: "《霸王别姬》4K修复版重返戛纳经典单元", date: "2026-05", source: "戛纳电影节" } ] }
};

var currentFilmId = null;
var pendingSearch = null;

function renderLive() {
  if (!currentFilmId) currentFilmId = PLATFORM.films[0].id;
  var opts = PLATFORM.films.map(function (f) {
    return '<option value="' + f.id + '"' + (f.id === currentFilmId ? ' selected' : '') + '>' + esc(f.title) + '</option>';
  }).join("");

  $view.innerHTML =
    '<div class="section-title">实时舆情监测 · 自选影片</div>' +
    '<div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">' +
    '<label style="font-size:14px;color:#5C5750">监测影片：</label>' +
    '<select id="film-select" class="select">' + opts + '</select>' +
    '<button id="btn-refresh" class="btn">刷新实时数据</button>' +
    '<span id="live-status" class="pill">待加载</span>' +
    '</div>' +
    '<div id="live-panel"><div class="empty">正在加载…</div></div>';

  document.getElementById("film-select").addEventListener("change", function () {
    currentFilmId = this.value;
    renderLivePanel(false);
  });
  document.getElementById("btn-refresh").addEventListener("click", function () {
    renderLivePanel(true);
  });
  renderLivePanel(false);
}

function renderLivePanel() {
  var f = null;
  for (var i = 0; i < PLATFORM.films.length; i++) if (PLATFORM.films[i].id === currentFilmId) f = PLATFORM.films[i];
  if (!f) return;
  var ld = LIVE_DATA[f.id] || { heat: 50, pos: 50, risk: 20, keywords: [], news: [] };

  var radar = radarSVG(f.dims, 260, "#A63A2B");
  var net = 100 - ld.pos - ld.risk;
  var ratio = '<div class="ratio-track" role="img" aria-label="舆情倾向：正面 ' + ld.pos + '%，风险 ' + ld.risk + '%，中性 ' + net + '%">' +
    '<div class="ratio-seg" style="width:' + ld.pos + '%;background:#274A64">正面 ' + ld.pos + '%</div>' +
    '<div class="ratio-seg" style="width:' + net + '%;background:#8A837A"></div>' +
    '<div class="ratio-seg" style="width:' + ld.risk + '%;background:#A63A2B">风险 ' + ld.risk + '%</div>' +
    '</div>';

  var panel =
    '<div class="grid grid-4" style="margin-bottom:16px">' +
    '<div class="kpi-card"><span class="num">' + ld.heat + '</span><span class="lab">舆情热度</span></div>' +
    '<div class="kpi-card"><span class="num">' + ld.pos + '%</span><span class="lab">正面 / 专业讨论</span></div>' +
    '<div class="kpi-card"><span class="num">' + ld.risk + '%</span><span class="lab">风险舆情占比</span></div>' +
    '<div class="kpi-card"><span class="num" style="color:' + (f.level.indexOf("高") >= 0 ? "#A63A2B" : "#3E7A55") + '">' + esc(f.level) + '</span><span class="lab">综合风险等级</span></div>' +
    '</div>' +

    '<div class="grid grid-2">' +
    '<div class="card"><h3>五维风险研判</h3>' + radar +
    '<p style="font-size:12px;color:#8A837A;margin-top:6px">综合评分 ' + f.score + '/25 · ' + esc(f.type) + '</p></div>' +
    '<div class="card"><h3>舆情倾向量化</h3>' + ratio +
    '<p style="font-size:13px;color:#5C5750;margin:10px 0 6px"><b>研判结论：</b>' + esc(f.verdict) + '</p>' +
    '<p style="font-size:13px;color:#5C5750;margin-bottom:0"><b>管理重点：</b>' + esc(f.manage) + '</p></div>' +
    '</div>' +

    '<div class="section-title">实时相关报道（联网抓取）</div>' +
    '<div class="card"><div id="news-box" class="empty">正在联网抓取 The Guardian 影评流并匹配本片…</div></div>';

  document.getElementById("live-panel").innerHTML = panel;
  liveFetchFilm(f, ld);
}

/* 实时联网：经 rss2json 抓 Guardian 影评流，按本片关键词匹配 */
function liveFetchFilm(f, ld) {
  var st = document.getElementById("live-status");
  var box = document.getElementById("news-box");
  st.textContent = "联网中…";
  st.className = "pill";
  var rss = encodeURIComponent("https://www.theguardian.com/film/rss");
  var url = "https://api.rss2json.com/v1/api.json?rss_url=" + rss;
  fetch(url, { mode: "cors" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var items = (d && d.items) || [];
      var kws = (ld.keywords || []).map(function (k) { return k.toLowerCase(); });
      var matched = items.filter(function (it) {
        var t = (it.title || "").toLowerCase();
        return kws.some(function (k) { return k && t.indexOf(k) >= 0; });
      });
      if (matched.length) {
        box.innerHTML = matched.map(function (it) {
          var link = it.link ? ' <a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="color:#274A64">原文 ↗</a>' : "";
          return '<div class="item-line"><span class="light green"></span><b>' + esc(it.title) + '</b> <span style="color:#8A837A">(' + esc((it.pubDate || "").slice(0, 10)) + ')</span>' + link + '</div>';
        }).join("");
        st.textContent = "已联网：抓取 " + items.length + " 篇，匹配本片 " + matched.length + " 篇";
        st.className = "pill online";
      } else {
        var sample = (ld.news || []).map(function (n) {
          return '<div class="item-line"><span class="light yellow"></span><b>' + esc(n.title) + '</b> <span style="color:#8A837A">(' + esc(n.date) + ' · ' + esc(n.source) + ' · 智库样本)</span></div>';
        }).join("");
        box.innerHTML = '<div class="empty">近期实时影评流中未匹配到本片报道（海外源覆盖有限）。以下为团队智库报告积累的<b>本片历史舆情样本</b>：</div>' + (sample || '<div class="empty">暂无样本</div>');
        st.textContent = "已联网：实时源未匹配本片，显示历史样本";
        st.className = "pill";
      }
    })
    .catch(function () {
      box.innerHTML = '<div class="empty">联网失败（网络或接口限制）。以下为团队智库报告积累的本片舆情样本：</div>' +
        (ld.news || []).map(function (n) {
          return '<div class="item-line"><b>' + esc(n.title) + '</b> <span style="color:#8A837A">(' + esc(n.date) + ' · ' + esc(n.source) + ')</span></div>';
        }).join("");
      st.textContent = "联网失败，显示历史样本";
      st.className = "pill";
    });
}

/* ---------- 视图 7：自由检索（广域信息收集） ---------- */
function renderSearch() {
  $view.innerHTML =
    '<div class="section-title">作品自由检索 · 广域信息收集</div>' +
    '<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
    '<input id="search-input" class="input" type="text" placeholder="输入任意作品 / 主题，如：中国电影、功夫、新海诚…">' +
    '<button id="btn-search" class="btn">全网检索</button>' +
    '</div>' +
    '<div id="search-result"><div class="empty" style="padding:20px 0">输入关键词，点击「全网检索」，平台将聚合 Google 新闻、Open Library 图书、TVMaze 影视等免费公开源进行广域收集，不局限于影视作品。</div></div>';

  var input = document.getElementById("search-input");
  var btn = document.getElementById("btn-search");
  function go() { searchAll(input.value.trim()); }
  btn.addEventListener("click", go);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  if (pendingSearch) {
    input.value = pendingSearch;
    searchAll(pendingSearch);
    pendingSearch = null;
  } else {
    input.focus();
  }
}

function searchAll(kw) {
  var box = document.getElementById("search-result");
  if (!kw) { box.innerHTML = '<div class="empty">请输入关键词。</div>'; return; }
  box.innerHTML = '<div class="empty">正在广域检索「' + esc(kw) + '」…</div>';

  var q = encodeURIComponent(kw);
  var newsUrl = "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent("https://news.google.com/rss/search?q=" + q + "&hl=zh-CN&gl=CN&ceid=CN:zh-Hans");
  var bookUrl = "https://openlibrary.org/search.json?q=" + q + "&limit=6";
  var enKw = kw.replace(/[^\x00-\x7F]/g, " ").trim() || kw;
  var tvUrl = "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(enKw) + "&limit=6";

  Promise.all([
    fetch(newsUrl, { mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(bookUrl, { mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(tvUrl, { mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (res) {
    var news = res[0], books = res[1], tvs = res[2];

    var html = "";

    /* 新闻速览 */
    var newsItems = (news && news.items) || [];
    html += '<div class="section-title">新闻速览（Google 新闻 · 广域）</div><div class="card">';
    if (newsItems.length) {
      html += newsItems.slice(0, 10).map(function (it) {
        var link = it.link ? ' <a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="color:#274A64">原文 ↗</a>' : "";
        var src = (it.source && it.source.name) ? it.source.name : "";
        return '<div class="item-line"><span class="light green"></span><b>' + esc(it.title) + '</b> <span style="color:#8A837A">(' + esc((it.pubDate || "").slice(0, 10)) + ' · ' + esc(src) + ')</span>' + link + '</div>';
      }).join("");
    } else {
      html += '<div class="empty">未获取到相关新闻，可更换关键词或稍后重试。</div>';
    }
    html += '</div>';

    /* 图书资料 */
    var bookList = (books && books.docs) || [];
    html += '<div class="section-title">图书 / 百科资料（Open Library）</div><div class="card">';
    if (bookList.length) {
      html += bookList.slice(0, 6).map(function (b) {
        var authors = (b.author_name || []).slice(0, 2).join("、");
        var yr = b.first_publish_year || "";
        return '<div class="item-line"><b>' + esc(b.title) + '</b> <span style="color:#8A837A">(' + esc(authors) + ' · ' + esc(yr) + ')</span></div>';
      }).join("");
    } else {
      html += '<div class="empty">未匹配到图书资料。</div>';
    }
    html += '</div>';

    /* 影视档案 */
    var tvList = tvs && tvs.length ? tvs : [];
    html += '<div class="section-title">影视档案（TVMaze）</div><div class="card">';
    if (tvList.length) {
      html += tvList.slice(0, 6).map(function (t) {
        var s = t.show || {};
        var meta = [s.type, s.language, (s.premiered || "").slice(0, 4), s.rating && s.rating.average ? "评分 " + s.rating.average : ""].filter(Boolean).join(" · ");
        var link = s.url ? ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener" style="color:#274A64">详情 ↗</a>' : "";
        return '<div class="item-line"><b>' + esc(s.name || "") + '</b> <span style="color:#8A837A">(' + esc(meta) + ')</span>' + link + '</div>';
      }).join("");
    } else {
      html += '<div class="empty">未匹配到影视条目（可尝试英文关键词，如 "kung fu"）。</div>';
    }
    html += '</div>';

    html += '<div class="section-title">数据来源说明</div>' +
      '<div class="card"><p style="font-size:12px;color:#8A837A;margin:0">检索经 rss2json.com 服务器中转与各公开 API 完成，免费、无密钥；网络受限时部分源可能返回为空，不影响其他源展示。</p></div>';

    box.innerHTML = html;
  });
}

var VIEWS = {
  "/overview": renderOverview,
  "/films": renderFilms,
  "/events": renderEvents,
  "/monitor": renderMonitor,
  "/live": renderLive,
  "/search": renderSearch,
  "/collect": renderCollect
};

/* ---------- 初始化 ---------- */
function init() {
  $meta.textContent = "监测 " + PLATFORM.kpi[0].value + " 部影片 · " + PLATFORM.kpi[1].value + " 数据源 · " + PLATFORM.meta.version;
  setCollectStatus();
  loadCollect();
  router();
  window.addEventListener("hashchange", router);

  var gs = document.getElementById("global-search");
  if (gs) {
    gs.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var v = gs.value.trim();
        if (v) { pendingSearch = v; location.hash = "#/search"; }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
