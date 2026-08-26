/* ════════════════════════════════════════════════════════
   映海御安阁 · 中国电影海外舆情与文化安全研判平台
   数据文件 data.js（重构版）

   ▍原则：平台数据以「实时联网采集 + AI 研判」为主；
          本文件只保留「考量逻辑」与「数据源」等基础配置，
          不含任何智库静态案例数据。
   ════════════════════════════════════════════════════════ */

var PLATFORM = {

  meta: {
    name: "映海御安阁",
    sub: "中国电影海外舆情与文化安全研判平台",
    version: "v2.0 重构版",
    org: "大学生新文科实践创新大赛 · 经管法组"
  },

  /* 五维风险维度名 */
  dims: ["触发强度", "对象敏感", "历史存量", "传播可切片", "现实后果"],

  /* 四类主导舆情 */
  sentimentTypes: [
    "文化认同与政策型",
    "邻国形象与刻板印象型",
    "事实伦理与制度型",
    "专业工艺与类型片型"
  ],

  /* 八大监测指标（考量逻辑，供 AI 研判与展示） */
  indicators: [
    { name: "议题迁移", def: "娱乐/影评报道进入社会、政治、国际、法律或政策版", threshold: "24h内2家地区主流媒体跨版报道，升黄/橙" },
    { name: "主体升级", def: "普通账号升级至主流媒体、议员、监管、大学教授、体育/行业组织", threshold: "出现监管、法院、受害者或组织公开行动，升红" },
    { name: "跨语言扩散", def: "同一核心指控从中文进入韩语、英语、马来语等", threshold: "12h内进入2种以上外语且含主流媒体，升橙" },
    { name: "标签固化", def: "标题和评论重复同一短标签", threshold: "前三大标签连续两次监测占争议样本过半，启动证据页" },
    { name: "现实转化", def: "影响排片、票房、档期、分级、合作品牌、主创行程或旅游秩序", threshold: "任何可核验现实后果至少升橙" },
    { name: "回应接受度", def: "回应后主流报道是否引用事实、纠正错误、降低争议标签", threshold: "24h无事实引用或误读增加，调整主体和材料" },
    { name: "服务损害", def: "字幕/配音投诉、退票退款、客服积压、版本错放", threshold: "投诉率超本市场基线2倍或批量错版，立即修复" },
    { name: "合作方风险", def: "影院、平台、发行、品牌和人才代理的询问、暂停或退出", threshold: "核心合作方正式问询升黄；暂停升橙" }
  ],

  /* 海外影视源（经 rss2json 服务器中转抓取，供研判中心与数据采集使用） */
  overseas: [
    { name: "The Guardian · Film", rss: "https://www.theguardian.com/film/rss" },
    { name: "BBC · 娱乐与文化", rss: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml" },
    { name: "Variety", rss: "https://variety.com/feed/" },
    { name: "Hollywood Reporter", rss: "https://www.hollywoodreporter.com/feed/" },
    { name: "Deadline", rss: "https://deadline.com/feed/" },
    { name: "TheWrap", rss: "https://www.thewrap.com/feed/" },
    { name: "CNA · 娱乐", rss: "https://www.channelnewsasia.com/rssfeeds/topic/entertainment" },
    { name: "IGN", rss: "https://feeds.ign.com/ign/games-all" }
  ],

  /* 数据源清单（实时采集相关） */
  sources: [
    { name: "Bing 新闻", region: "中国/全球", type: "国内新闻搜索", reach: "可直连" },
    { name: "Google News", region: "全球", type: "新闻聚合·广域搜索", reach: "可直连" },
    { name: "The Guardian · Film", region: "英国", type: "海外专业媒体", reach: "rss2json 中转" },
    { name: "BBC · 娱乐与文化", region: "英国", type: "海外主流媒体", reach: "rss2json 中转" },
    { name: "Variety", region: "美国", type: "海外行业媒体", reach: "rss2json 中转" },
    { name: "Hollywood Reporter", region: "美国", type: "海外行业媒体", reach: "rss2json 中转" },
    { name: "Deadline", region: "美国", type: "海外行业媒体", reach: "rss2json 中转" },
    { name: "TheWrap", region: "美国", type: "海外行业媒体", reach: "rss2json 中转" },
    { name: "CNA · 娱乐", region: "新加坡", type: "亚太主流媒体", reach: "rss2json 中转" },
    { name: "IGN", region: "美国", type: "影视游戏媒体", reach: "rss2json 中转" },
    { name: "Open Library", region: "全球", type: "图书百科", reach: "可直连" },
    { name: "TVMaze", region: "全球", type: "影视档案", reach: "可直连" },
    { name: "iTunes Search", region: "全球", type: "媒体检索", reach: "可直连" },
    { name: "豆瓣电影", region: "中国", type: "影评聚合", reach: "可直连" }
  ],

  /* 处置工具（纯逻辑，无案例数据） */
  dispatching: {
    raci: [
      { role: "A · Accountable", desc: "最终负责、拍板定案", who: "事件总负责人 / 管理层", note: "同一事项只设一个 A" },
      { role: "R · Responsible", desc: "直接执行、干活", who: "海外公关、制片管理、发行等", note: "按问题归口到专业部门" },
      { role: "C · Consulted", desc: "必须会签、提供专业意见", who: "法务、当地发行、文化顾问等", note: "决策前必须听取" },
      { role: "I · Informed", desc: "知会、同步信息", who: "主创、合作方、投资者关系等", note: "不参与决策，但需知情" }
    ],
    sop: [
      { t: "0—24h", act: "风险定级、冻结争议物料、召开四席会议、确认是否回应" },
      { t: "24—72h", act: "逐镜头/台词/物料审计，与当地发行及顾问沟通，整理证据包" },
      { t: "72h 后", act: "完成版本修改、多语种说明与媒体Q&A，进入复盘与制度修订" }
    ],
    statement: "关于〔事件〕的说明\n我们注意到近日关于〔影片〕的〔议题〕讨论。创作团队始终秉持〔创作意图/尊重原则〕。目前正在〔核验事项〕，具体事实以〔权威来源〕为准。我们将于〔时间〕前更新进一步说明，并持续听取〔受影响群体〕的意见。",
    avoid: [
      "把所有海外批评统称为反华或政治操弄",
      "用国内票房或评分证明海外表达无害",
      "只解释创作意图而不承认实际影响",
      "让导演/演员未经简报单独即兴回应",
      "高敏感声明仅靠机器翻译（须保留版本号与审签链）",
      "以删帖或热度下降宣布结案，必须核查版本、退款、合作方与制度整改是否闭环"
    ]
  },

  /* 采集状态（collector.py 运行时更新） */
  collect: {
    updated: "待采集",
    status: "standby",
    items: []
  }
};
