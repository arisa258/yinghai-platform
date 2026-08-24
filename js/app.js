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
  "/collect": "数据采集",
  "/about": "平台架构"
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

/* ---------- 视图 6：平台架构 ---------- */
function renderAbout() {
  var arch = PLATFORM.architecture.map(function (a, i) {
    return '<li><span class="arch-no">0' + (i + 1) + '</span><div><div class="arch-name">' + esc(a.layer) + '</div><div class="arch-desc">' + esc(a.desc) + '</div></div></li>';
  }).join("");

  $view.innerHTML =
    '<div class="section-title">平台五层架构</div>' +
    '<div class="card"><ul class="arch-list">' + arch + '</ul></div>' +

    '<div class="section-title">平台定位：人机协同研判中枢</div>' +
    '<div class="card"><p>平台不是用 AI 取代人工研判，而是用数据采集、指标监测、流程标准化<strong>赋能决策</strong>：机器负责多语种采集、指标触发与图谱呈现，专家负责事实核验、语境研判与最终定性，坚持“热度与倾向分离”“问题精准比对策精准更重要”的原则。</p>' +
    '<p style="margin-top:6px">核心判断：中国电影海外舆情已从影评—票房评价转向作品文本、在地解码、事实伦理、机构使用与地缘框架共同作用的复合舆情；传统“发海报—找影评—看票房”已不足以管理出海风险。</p></div>' +

    '<div class="section-title">项目信息</div>' +
    '<div class="card"><div class="table-wrap"><table class="data">' +
    '<tr><td style="width:110px">项目名称</td><td>' + esc(PLATFORM.meta.name) + '：' + esc(PLATFORM.meta.sub) + '</td></tr>' +
    '<tr><td>参赛单位</td><td>' + esc(PLATFORM.meta.org) + '</td></tr>' +
    '<tr><td>版本</td><td>' + esc(PLATFORM.meta.version) + '</td></tr>' +
    '<tr><td>数据截止</td><td>2026-07-30（智库研究报告数据基线）</td></tr>' +
    '</table></div></div>';
}

var VIEWS = {
  "/overview": renderOverview,
  "/films": renderFilms,
  "/events": renderEvents,
  "/monitor": renderMonitor,
  "/collect": renderCollect,
  "/about": renderAbout
};

/* ---------- 初始化 ---------- */
function init() {
  $meta.textContent = "监测 " + PLATFORM.kpi[0].value + " 部影片 · " + PLATFORM.kpi[1].value + " 数据源 · " + PLATFORM.meta.version;
  setCollectStatus();
  loadCollect();
  router();
  window.addEventListener("hashchange", router);
}

document.addEventListener("DOMContentLoaded", init);
