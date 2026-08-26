/* ════════════════════════════════════════════════════════
   映海御安阁 · 报告生成模块 report.js
   研判完成后自动生成「影片海外舆情深度分析（参考报告）」
   支持 HTML 打印版 / Word(.doc) / Markdown 三格式导出
   零依赖，纯前端 Blob 下载，本地组装兜底 + 可选 AI 深度润色
   （依赖 app.js 提供的 esc / parseAI / callLLM / PLATFORM）
   ════════════════════════════════════════════════════════ */

/* ---------- 报告状态 ---------- */
var _report = { kw: "", o: null, data: null, spec: null, rich: null };

function fmtToday() {
  var d = new Date();
  var m = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}

function safeName(s) {
  s = String(s == null ? "" : s).replace(/[\\/:*?"<>|\s]+/g, "_").trim();
  return s.slice(0, 40) || "影片";
}

function rptFilename(kw, ext) {
  var d = new Date();
  var m = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return "映海御安阁_" + safeName(kw) + "_海外舆情深度分析_" + d.getFullYear() + m + day + "." + ext;
}

/* ---------- 内容组装（本地兜底，随时可用） ---------- */
function assembleReportContent(kw, o, data, spec) {
  o = o || {};
  spec = spec || {};
  var today = fmtToday();
  var conclusions = (o.conclusions || []).filter(function (c) {
    return c && (c.detail || c.text);
  });
  var conclusion = o.conclusion;

  function pick(name) {
    for (var i = 0; i < conclusions.length; i++) {
      var t = conclusions[i].title || "";
      if (t.indexOf(name) >= 0) return conclusions[i].detail || conclusions[i].text || "";
    }
    return "";
  }

  /* 核心研判 */
  var core = [];
  if (conclusions.length) {
    conclusions.slice(0, 5).forEach(function (c) {
      core.push({ title: c.title || "研判", detail: c.detail || c.text || "" });
    });
  } else if (typeof conclusion === "string" && conclusion) {
    core.push({ title: "综合研判", detail: conclusion });
  } else {
    core.push({ title: "综合研判", detail: "（AI 未返回结论文本，建议人工复核。）" });
  }

  var positives = pick("正面") || "";
  var risks = pick("风险") || "";
  var trendTxt = pick("趋势") || "";
  var situationTxt = pick("核心态势") || "";

  /* 五维风险 */
  var dims = PLATFORM.dims.map(function (k) {
    return { name: k, value: (o.dims && o.dims[k]) || 0 };
  });
  var score = o.score;
  if (score === undefined || score === null) {
    score = dims.reduce(function (s, d) { return s + d.value; }, 0);
  }

  /* 已触发的监测指标 */
  var triggered = [];
  if (o.alerts) {
    PLATFORM.indicators.forEach(function (ind) {
      if (o.alerts[ind.name] === true) triggered.push(ind.name);
    });
  }

  /* 主要问题与风险 */
  var problems = [];
  if (risks) problems.push(risks);
  triggered.forEach(function (t) {
    problems.push("监测指标「" + t + "」已触发，需重点跟进。");
  });
  if (!problems.length) problems.push("（AI 未识别出明确的主要风险，建议人工复核。）");

  var causes = situationTxt || (typeof conclusion === "string" ? conclusion : "");
  if (!causes) causes = "（AI 未返回成因分析，建议结合实时报道补充人工研判。）";
  var trend = trendTxt || causes;

  var advice = (o.advice || []).map(function (a) { return String(a); });
  if (!advice.length) advice.push("（AI 未生成处置建议，建议结合「处置工具」页的决策规则人工拟定。）");

  var news = (data && data.news) || [];
  function toRef(it) {
    return {
      title: it.title || "（无标题）",
      src: it._src || (it.source && it.source.name) || "未知来源",
      date: (it.pubDate || "").slice(0, 10) || "",
      link: it.link || ""
    };
  }
  var refs = news.slice(0, 12).map(toRef);
  var appendix = news.slice(0, 30).map(toRef);

  var sourceDist = (spec.sourceDist || []).map(function (s) {
    return { name: s.name, count: s.count, pct: spec.reportCount ? Math.round(s.count / spec.reportCount * 100) : 0 };
  });
  var dateDist = (spec.dateDist || []).map(function (d) { return { date: d.date, count: d.count }; });

  return {
    kw: kw,
    today: today,
    title: "《" + kw + "》海外舆情深度分析（参考报告）",
    subtitle: "「映海御安阁」中国电影海外舆情研判平台 · AI 自动生成",
    disclaimer: "本报告由平台基于实时公开信息抓取与 AI 研判自动生成，作为深度分析参考，供内部讨论使用；不构成正式结论或政策文件。",
    core: core,
    overview: {
      heat: o.heat || 0,
      posRatio: o.posRatio || 0,
      riskRatio: o.riskRatio || 0,
      level: o.level || "—",
      score: score,
      type: o.type || "—",
      tags: (o.topicTags || []).slice(0, 6),
      reportCount: spec.reportCount || 0,
      sourceCount: spec.sourceCount || 0,
      timeSpan: spec.timeSpan || "—",
      narrative: situationTxt
    },
    positives: positives,
    risks: risks,
    dims: dims,
    triggered: triggered,
    sourceDist: sourceDist,
    dateDist: dateDist,
    problems: problems,
    causes: causes,
    trend: trend,
    advice: advice,
    refs: refs,
    appendix: appendix
  };
}

/* 合并 AI 润色结果（叙述性章节替换，数据表保持） */
function mergeRich(base, rich) {
  rich = rich || {};
  var out = JSON.parse(JSON.stringify(base));
  if (Array.isArray(rich.core) && rich.core.length) {
    out.core = rich.core.map(function (t) {
      if (typeof t === "string") return { title: "研判要点", detail: t };
      return { title: t.title || "研判要点", detail: t.detail || t.text || "" };
    });
  }
  if (rich.overviewText) out.overview.narrative = String(rich.overviewText);
  if (rich.positives) out.positives = String(rich.positives);
  if (rich.risks) out.risks = String(rich.risks);
  if (Array.isArray(rich.problems) && rich.problems.length) out.problems = rich.problems.map(String);
  if (rich.causes) out.causes = String(rich.causes);
  if (rich.trend) out.trend = String(rich.trend);
  if (Array.isArray(rich.advice) && rich.advice.length) out.advice = rich.advice.map(String);
  if (rich.conclusion) out.core.push({ title: "总体结论", detail: String(rich.conclusion) });
  return out;
}

function getReportContent() {
  var base = assembleReportContent(_report.kw, _report.o, _report.data, _report.spec);
  if (_report.rich) base = mergeRich(base, _report.rich);
  return base;
}

/* ---------- 报告文档正文 HTML ---------- */
function kpiCell(num, lab) {
  return '<div class="rdoc-kpi"><b>' + esc(String(num)) + '</b><span>' + esc(lab) + '</span></div>';
}

function reportBodyHTML(c) {
  var coreHTML = c.core.map(function (x, i) {
    return '<div class="rdoc-judge"><b>' + (i + 1) + '. ' + esc(x.title) + '</b>　' + esc(x.detail) + '</div>';
  }).join("");

  var kpis =
    '<div class="rdoc-kpis">' +
    kpiCell(c.overview.heat, "舆情热度") +
    kpiCell(c.overview.posRatio + "%", "正面占比") +
    kpiCell(c.overview.riskRatio + "%", "风险占比") +
    kpiCell(c.overview.level, "风险等级") +
    kpiCell(c.overview.score + "/25", "五维总分") +
    '</div>';

  var dimRows = c.dims.map(function (d) {
    var color = d.value >= 4 ? "#A63A2B" : (d.value === 3 ? "#C7A76C" : "#274A64");
    return '<tr><td>' + esc(d.name) + '</td><td style="color:' + color + ';font-weight:600;text-align:center">' + d.value + ' / 5</td></tr>';
  }).join("");

  var srcRows = c.sourceDist.length
    ? c.sourceDist.map(function (s) {
        return '<tr><td>' + esc(s.name) + '</td><td style="text-align:center">' + s.count + '</td><td style="text-align:center">' + s.pct + '%</td></tr>';
      }).join("")
    : '<tr><td colspan="3">暂无来源分布数据</td></tr>';

  var dateRows = c.dateDist.length
    ? c.dateDist.map(function (d) {
        return '<tr><td>' + esc(d.date) + '</td><td style="text-align:center">' + d.count + '</td></tr>';
      }).join("")
    : '<tr><td colspan="2">暂无时间分布数据</td></tr>';

  var tagHTML = c.overview.tags.length
    ? '<p><b>议题标签：</b>' + c.overview.tags.map(function (t) { return esc(t); }).join(" · ") + '</p>'
    : "";

  var problemsHTML = c.problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join("");
  var adviceHTML = c.advice.map(function (a, i) {
    return '<li><b>' + (i + 1) + '.</b>　' + esc(a) + '</li>';
  }).join("");

  function refsList(list, emptyMsg) {
    if (!list.length) return '<li>' + emptyMsg + '</li>';
    return list.map(function (r, i) {
      var link = r.link ? ' <a href="' + esc(r.link) + '" rel="noopener">原文 ↗</a>' : "";
      return '<li class="rdoc-ref">[' + (i + 1) + ']　' + esc(r.title) + '　—　' + esc(r.src) + (r.date ? ' · ' + esc(r.date) : '') + link + '</li>';
    }).join("");
  }

  return (
    '<div class="rdoc-title">' + esc(c.title) + '</div>' +
    '<div class="rdoc-sub">' + esc(c.subtitle) + '　·　' + esc(c.today) + '</div>' +
    '<div class="rdoc-disc">' + esc(c.disclaimer) + '</div>' +

    '<h2>核心研判</h2>' + coreHTML +

    '<h2>一、总体情况</h2>' +
    kpis +
    '<p><b>舆情类型：</b>' + esc(c.overview.type) + '</p>' +
    tagHTML +
    '<p>本次研判共捕获实时报道 <b>' + c.overview.reportCount + '</b> 条，来自 <b>' + c.overview.sourceCount + '</b> 个来源，时间跨度 <b>' + esc(c.overview.timeSpan) + '</b>。</p>' +
    (c.overview.narrative ? '<p>' + esc(c.overview.narrative) + '</p>' : '') +

    '<h2>二、舆情表现</h2>' +
    '<h3>正面表现</h3>' + (c.positives ? '<p>' + esc(c.positives) + '</p>' : '<p>（暂无明确正面表现信息。）</p>') +
    '<h3>风险警示</h3>' + (c.risks ? '<p>' + esc(c.risks) + '</p>' : '<p>（暂无明确风险警示信息。）</p>') +

    '<h2>三、关键数据与来源分布</h2>' +
    '<h3>五维风险评分（总分 ' + c.overview.score + ' / 25 · 等级 ' + esc(c.overview.level) + '）</h3>' +
    '<table><thead><tr><th>维度</th><th style="width:100px">评分</th></tr></thead><tbody>' + dimRows + '</tbody></table>' +
    '<h3>来源分布（Top）</h3>' +
    '<table><thead><tr><th>来源</th><th style="width:80px">条数</th><th style="width:80px">占比</th></tr></thead><tbody>' + srcRows + '</tbody></table>' +
    '<h3>近 7 天时间分布</h3>' +
    '<table><thead><tr><th>日期</th><th style="width:80px">报道数</th></tr></thead><tbody>' + dateRows + '</tbody></table>' +

    '<h2>四、问题与成因分析</h2>' +
    '<h3>主要问题与风险</h3><ul>' + problemsHTML + '</ul>' +
    '<h3>成因与放大机制</h3><p>' + esc(c.causes) + '</p>' +
    '<h3>趋势与扩散路径</h3><p>' + esc(c.trend) + '</p>' +

    '<h2>五、处置与对策建议</h2>' +
    '<ol>' + adviceHTML + '</ol>' +

    '<h2>参考资料</h2>' +
    '<ol>' + refsList(c.refs, "（本次研判未抓取到实时参考来源，建议人工补充。）") + '</ol>' +

    '<h2>附录：完整实时检索条目</h2>' +
    '<ol>' + refsList(c.appendix, "（无）") + '</ol>'
  );
}

/* ---------- 三种文件格式 ---------- */
var REPORT_CSS = [
  "*{margin:0;padding:0;box-sizing:border-box}",
  "body{background:#F8F5F0;color:#262421;font-family:'Noto Serif SC','Songti SC','SimSun',serif;font-size:14px;line-height:1.7;-webkit-font-smoothing:antialiased}",
  ".page{max-width:820px;margin:0 auto;padding:44px 56px 60px;background:#FDFCF8;border:1px solid #DDD6CA;box-shadow:0 2px 12px rgba(38,36,33,.06)}",
  ".rdoc-title{font-size:22px;font-weight:700;text-align:center;letter-spacing:.05em;line-height:1.5}",
  ".rdoc-sub{text-align:center;font-size:12px;color:#8A837A;margin-top:4px}",
  ".rdoc-disc{margin:16px auto 22px;max-width:660px;text-align:center;font-size:12px;color:#8A837A;line-height:1.8;border-top:1px dashed #DDD6CA;border-bottom:1px dashed #DDD6CA;padding:10px 0}",
  ".rdoc h2{font-size:16px;font-weight:700;letter-spacing:.03em;margin:26px 0 10px;padding-bottom:6px;border-bottom:2px solid #A63A2B}",
  ".rdoc h3{font-size:14px;font-weight:700;margin:16px 0 6px}",
  ".rdoc p{font-size:13.5px;color:#3A3630;line-height:2;margin:6px 0}",
  ".rdoc ul,.rdoc ol{margin:6px 0 10px;padding-left:24px}",
  ".rdoc li{font-size:13.5px;color:#3A3630;line-height:1.9;margin:4px 0}",
  ".rdoc table{width:100%;border-collapse:collapse;margin:10px 0 14px;font-size:12.5px;font-family:'Microsoft YaHei','PingFang SC',sans-serif}",
  ".rdoc th,.rdoc td{border:1px solid #DDD6CA;padding:7px 10px;text-align:left;vertical-align:top}",
  ".rdoc th{background:#F0EBE0;font-weight:600}",
  ".rdoc tr:nth-child(even) td{background:#FAF7F1}",
  ".rdoc .rdoc-kpis{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}",
  ".rdoc .rdoc-kpi{flex:1 1 120px;text-align:center;padding:12px 8px;background:#fff;border:1px solid #DDD6CA;border-top:3px solid #A63A2B;border-radius:4px}",
  ".rdoc .rdoc-kpi b{display:block;font-size:20px;color:#262421;font-variant-numeric:tabular-nums}",
  ".rdoc .rdoc-kpi span{font-size:11px;color:#8A837A}",
  ".rdoc .rdoc-judge{padding:10px 14px;background:#F6F2EA;border-left:3px solid #274A64;border-radius:0 4px 4px 0;margin:8px 0;font-size:13.5px;color:#3A3630;line-height:1.9}",
  ".rdoc .rdoc-ref{font-size:12px;color:#5C5750;line-height:1.8}",
  ".rdoc a{color:#274A64;text-decoration:none}",
  ".rdoc-foot{text-align:center;font-size:11px;color:#8A837A;margin-top:28px;border-top:1px dashed #DDD6CA;padding-top:12px}",
  "@media print{body{background:#fff}.page{border:none;box-shadow:none;max-width:none;padding:0}}"
].join("\n");

function reportToHTML(c) {
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(c.title) + '</title>\n<style>' + REPORT_CSS + '</style>\n</head>\n<body>\n<div class="rdoc page">' + reportBodyHTML(c) + '\n<div class="rdoc-foot">— 本报告由「映海御安阁」平台自动生成，仅作深度分析参考 —</div>\n</div>\n</body>\n</html>';
}

function reportToWord(c) {
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n<head>\n<meta charset="utf-8">\n<title>' + esc(c.title) + '</title>\n<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->\n<style>' + REPORT_CSS + '</style>\n</head>\n<body>\n<div class="rdoc page">' + reportBodyHTML(c) + '</div>\n</body>\n</html>';
}

function reportToMarkdown(c) {
  var L = [];
  L.push("# " + c.title); L.push("");
  L.push("> " + c.subtitle + " · " + c.today); L.push("");
  L.push("> " + c.disclaimer); L.push("");
  L.push("## 核心研判");
  c.core.forEach(function (x, i) { L.push((i + 1) + ". **" + x.title + "**：" + x.detail); });
  L.push("");
  L.push("## 一、总体情况"); L.push("");
  L.push("- 舆情热度：" + c.overview.heat + " / 100");
  L.push("- 正面占比：" + c.overview.posRatio + "%");
  L.push("- 风险占比：" + c.overview.riskRatio + "%");
  L.push("- 风险等级：" + c.overview.level);
  L.push("- 五维总分：" + c.overview.score + " / 25");
  L.push("- 舆情类型：" + c.overview.type);
  if (c.overview.tags.length) L.push("- 议题标签：" + c.overview.tags.join("、"));
  L.push("- 数据规格：实时报道 " + c.overview.reportCount + " 条 / 来源 " + c.overview.sourceCount + " 个 / 时间跨度 " + c.overview.timeSpan);
  if (c.overview.narrative) { L.push(""); L.push(c.overview.narrative); }
  L.push("");
  L.push("## 二、舆情表现"); L.push("");
  L.push("### 正面表现"); L.push(c.positives || "（暂无明确正面表现信息。）"); L.push("");
  L.push("### 风险警示"); L.push(c.risks || "（暂无明确风险警示信息。）"); L.push("");
  L.push("## 三、关键数据与来源分布"); L.push("");
  L.push("### 五维风险评分（总分 " + c.overview.score + " / 25 · 等级 " + c.overview.level + "）"); L.push("");
  L.push("| 维度 | 评分 |"); L.push("| --- | --- |");
  c.dims.forEach(function (d) { L.push("| " + d.name + " | " + d.value + " / 5 |"); });
  L.push("");
  L.push("### 来源分布（Top）"); L.push("");
  L.push("| 来源 | 条数 | 占比 |"); L.push("| --- | --- | --- |");
  c.sourceDist.forEach(function (s) { L.push("| " + s.name + " | " + s.count + " | " + s.pct + "% |"); });
  L.push("");
  L.push("### 近 7 天时间分布"); L.push("");
  L.push("| 日期 | 报道数 |"); L.push("| --- | --- |");
  c.dateDist.forEach(function (d) { L.push("| " + d.date + " | " + d.count + " |"); });
  L.push("");
  L.push("## 四、问题与成因分析"); L.push("");
  L.push("### 主要问题与风险");
  c.problems.forEach(function (p) { L.push("- " + p); });
  L.push("");
  L.push("### 成因与放大机制"); L.push(c.causes); L.push("");
  L.push("### 趋势与扩散路径"); L.push(c.trend); L.push("");
  L.push("## 五、处置与对策建议");
  c.advice.forEach(function (a, i) { L.push((i + 1) + ". " + a); });
  L.push("");
  L.push("## 参考资料");
  c.refs.forEach(function (r, i) {
    L.push("[" + (i + 1) + "] " + r.title + " — " + r.src + (r.date ? " · " + r.date : "") + (r.link ? "（" + r.link + "）" : ""));
  });
  L.push("");
  L.push("## 附录：完整实时检索条目");
  c.appendix.forEach(function (r, i) {
    L.push("[" + (i + 1) + "] " + r.title + " — " + r.src + (r.date ? " · " + r.date : "") + (r.link ? "（" + r.link + "）" : ""));
  });
  return L.join("\n");
}

/* ---------- 下载 ---------- */
function downloadTextFile(filename, text, mime) {
  var blob = new Blob(["﻿", text], { type: mime + ";charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

/* ---------- AI 深度润色 ---------- */
function enhanceReport() {
  var st = document.getElementById("report-status");
  var btn = document.getElementById("btn-rpt-ai");
  if (!st || !btn || btn.getAttribute("disabled")) return;
  btn.setAttribute("disabled", "disabled");
  st.textContent = "AI 深度润色中…";
  st.className = "pill";
  btn.textContent = "润色中…";

  var news = (_report.data && _report.data.news) || [];
  var newsBlock = news.length
    ? news.map(function (it) {
        return "- " + (it.title || "") + "（" + ((it.source && it.source.name) || "") + "，" + (it.pubDate || "").slice(0, 10) + "）";
      }).join("\n")
    : "（未抓到实时新闻）";

  var prompt = [
    "你是「映海御安阁」中国电影海外舆情研判平台的分析引擎。请把一份已生成的影片舆情分析参考报告，润色成更详实、专业、有分析深度的版本。",
    "要求：",
    "- 只输出一个 JSON 对象（不要 markdown 代码块）。",
    "- 语言冷静专业，像资深舆情分析师写的内参分析；不套官方文件腔，不涉及密级，不虚构新闻中不存在的具体事实。",
    "- 字段：",
    "{",
    "  \"core\": [\"核心判断要点1（一句话）\", \"...共4条\"],",
    "  \"overviewText\": \"总体情况叙述一段（150字以上）\",",
    "  \"positives\": \"正面表现叙述一段（120字以上）\",",
    "  \"risks\": \"风险警示叙述一段（120字以上）\",",
    "  \"problems\": [\"主要问题/风险1\", \"主要问题/风险2\"],",
    "  \"causes\": \"成因与放大机制叙述一段（150字以上）\",",
    "  \"trend\": \"趋势与扩散路径叙述一段（120字以上）\",",
    "  \"advice\": [\"处置建议1\", \"处置建议2\", \"处置建议3\"],",
    "  \"conclusion\": \"总体结论一段话（100字以上）\"",
    "}",
    "以下是该影片已有的量化研判结果：",
    "---",
    JSON.stringify(_report.o),
    "---",
    "以下是实时抓取的新闻资料：",
    "---",
    newsBlock,
    "---",
    "请基于以上资料润色，宁缺毋滥，不要编造。"
  ].join("\n");

  callLLM([{ role: "user", content: prompt }]).then(function (text) {
    var rich = parseAI(text);
    if (!rich || typeof rich !== "object") throw new Error("AI 返回格式无法解析");
    _report.rich = rich;
    var preview = document.getElementById("report-preview");
    if (preview) preview.innerHTML = reportBodyHTML(getReportContent());
    st.textContent = "已用 AI 深度润色 ✓";
    st.className = "pill online";
    btn.removeAttribute("disabled");
    btn.textContent = "AI 深度润色报告";
  }).catch(function (err) {
    st.textContent = "润色失败，保留本地版本";
    st.className = "pill";
    btn.removeAttribute("disabled");
    btn.textContent = "AI 深度润色报告";
  });
}

/* ---------- 报告卡片（研判完成后自动渲染） ---------- */
function renderReportCard(box, kw, o, data, spec) {
  if (!o || !o.dims) return;
  _report.kw = kw; _report.o = o; _report.data = data; _report.spec = spec; _report.rich = null;

  var c = getReportContent();
  var html =
    '<div class="card report-card" id="report-card">' +
      '<div class="report-head">' +
        '<div>' +
          '<div class="report-title">完整报告 · 自动生成</div>' +
          '<div class="report-sub">已自动生成《' + esc(kw) + '》深度分析参考报告，可下载 HTML 打印版 / Word / Markdown 文件。</div>' +
        '</div>' +
        '<span class="pill online report-status" id="report-status">已生成</span>' +
      '</div>' +
      '<div class="report-actions">' +
        '<button class="btn" id="btn-rpt-html">下载 HTML 打印版</button>' +
        '<button class="btn ghost" id="btn-rpt-doc">下载 Word</button>' +
        '<button class="btn ghost" id="btn-rpt-md">下载 Markdown</button>' +
        '<button class="btn ghost" id="btn-rpt-ai">AI 深度润色报告</button>' +
      '</div>' +
      '<div class="report-doc rdoc" id="report-preview">' + reportBodyHTML(c) + '</div>' +
    '</div>';

  box.insertAdjacentHTML("beforeend", html);

  document.getElementById("btn-rpt-html").addEventListener("click", function () {
    downloadTextFile(rptFilename(kw, "html"), reportToHTML(getReportContent()), "text/html");
  });
  document.getElementById("btn-rpt-doc").addEventListener("click", function () {
    downloadTextFile(rptFilename(kw, "doc"), reportToWord(getReportContent()), "application/msword");
  });
  document.getElementById("btn-rpt-md").addEventListener("click", function () {
    downloadTextFile(rptFilename(kw, "md"), reportToMarkdown(getReportContent()), "text/markdown");
  });
  document.getElementById("btn-rpt-ai").addEventListener("click", enhanceReport);
}
