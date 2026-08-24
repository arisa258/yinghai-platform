# -*- coding: utf-8 -*-
"""
映海御安阁 · 数据采集脚本 collector.py

作用：预采集公开可直连数据源，生成 data/collect.json 供平台前端加载。
策略：国内可直连源优先（豆瓣电影等），海外公开 RSS 尽力而为；
      全部失败时自动降级为“待采集”状态（平台仍可用演示样例）。
用法：python collector.py
依赖：requests（未安装时自动降级为样例模式，可 pip install requests）
"""

import os
import re
import json
import datetime

try:
    import requests
    from xml.etree import ElementTree as ET
    HAVE_REQUESTS = True
except ImportError:
    HAVE_REQUESTS = False

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "collect.json")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
}


def fetch_douban():
    """豆瓣电影·正在热映：国内可直连，演示主力源"""
    if not HAVE_REQUESTS:
        return None
    try:
        url = "https://movie.douban.com/nowplaying/"
        r = requests.get(url, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return None
        titles = re.findall(r'data-title="([^"]+)"', r.text)
        if not titles:
            return None
        items = []
        for t in titles[:20]:
            items.append({"title": t, "source": "豆瓣电影·正在热映", "summary": "国内影评聚合源，实时热度", "region": "中国"})
        return items
    except Exception:
        return None


def fetch_guardian():
    """The Guardian 电影频道 RSS：经 rss2json.com 服务器中转抓取，绕过本地网络限制"""
    if not HAVE_REQUESTS:
        return None
    try:
        rss = "https://www.theguardian.com/film/rss"
        url = "https://api.rss2json.com/v1/api.json?rss_url=" + rss
        r = requests.get(url, headers=HEADERS, timeout=18)
        if r.status_code != 200:
            return None
        data = r.json()
        items = []
        for it in (data.get("items") or [])[:15]:
            title = (it.get("title") or "").strip()
            if title:
                items.append({
                    "title": title,
                    "source": "The Guardian Film RSS（rss2json 中转）",
                    "summary": "海外主流媒体·影评与行业动态",
                    "region": "英国",
                    "link": it.get("link", ""),
                    "date": (it.get("pubDate") or "")[:10],
                })
        return items if items else None
    except Exception:
        return None


def build_sample():
    """演示样例兜底：无网络或全部失败时使用"""
    return [
        {"title": "《功夫女足》韩国女性与体育形象争议（样例）", "source": "智库报告案例库", "summary": "邻国刻板印象型 · 高风险", "region": "韩国"},
        {"title": "《给阿嬷的情书》潮州话场次与方言政策（样例）", "source": "智库报告案例库", "summary": "文化认同与政策型 · 中高风险", "region": "新加坡"},
        {"title": "《火遮眼》海外专业口碑样本（样例）", "source": "智库报告案例库", "summary": "专业工艺与类型片型 · 低—中风险", "region": "国际"},
    ]


def main():
    items = []
    ok = False

    d = fetch_douban()
    if d:
        items += d
        ok = True
        print("[OK] 豆瓣电影 采集", len(d), "条")

    g = fetch_guardian()
    if g:
        items += g
        ok = True
        print("[OK] Guardian RSS 采集", len(g), "条")

    if not items:
        items = build_sample()
        print("[!] 真实采集失败或无网络，已使用演示样例兜底")

    data = {
        "status": "online" if ok else "standby",
        "updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "items": items[:40],
        "note": "真实采集数据" if ok else "演示样例（运行环境无可用数据源）",
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("=> status:", data["status"], "| items:", len(data["items"]), "| 输出:", OUT)


if __name__ == "__main__":
    main()
