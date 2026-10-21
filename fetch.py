#!/usr/bin/env python3
"""Fetch a web page or PDF and print its readable text (for source checks).

Usage:
  python3 fetch.py URL [max_chars]
  python3 fetch.py ecfr TITLE SECTION        e.g. ecfr 45 147.130
  python3 fetch.py fedreg "search words"      latest Federal Register hits

Uses a normal browser user agent, follows redirects, converts PDFs with
pdftotext. Prints "FETCH FAILED: <reason>" and exits 1 on failure so the
run can record the exact error.
"""
import urllib.error
import html, json, re, subprocess, sys, tempfile, urllib.parse, urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def get(url, accept="text/html,application/xhtml+xml,application/pdf,*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept,
                                               "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), r.headers.get("Content-Type", ""), r.geturl()


def to_text(data, ctype):
    if "pdf" in ctype or data[:4] == b"%PDF":
        with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
            f.write(data); f.flush()
            return subprocess.run(["pdftotext", "-layout", f.name, "-"],
                                  capture_output=True, text=True).stdout
    t = data.decode("utf-8", errors="replace")
    t = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header).*?</\1>", " ", t)
    t = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h\d|tr)>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n\n", t)).strip()


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    try:
        if a[0] == "ecfr":
            title, sec = a[1], a[2]
            part = sec.split(".")[0]
            url = (f"https://www.ecfr.gov/api/versioner/v1/full/current/title-{title}.xml"
                   f"?part={part}&section={sec}")
            try:
                data, ctype, final = get(url, "application/xml")
            except Exception:
                d = json.loads(get(f"https://www.ecfr.gov/api/versioner/v1/titles.json")[0])
                date = next(t["up_to_date_as_of"] for t in d["titles"] if str(t["number"]) == title)
                url = url.replace("/current/", f"/{date}/")
                data, ctype, final = get(url, "application/xml")
            print(f"SOURCE: https://www.ecfr.gov/current/title-{title}/section-{sec}\n")
            print(to_text(data, "text/html")[:20000])
        elif a[0] == "fedreg":
            q = urllib.parse.quote(a[1])
            url = (f"https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest"
                   f"&conditions[term]={q}")
            d = json.loads(get(url, "application/json")[0])
            for r in d.get("results", []):
                print(f"{r['publication_date']}  {r['type']}  {r['title']}\n  {r['html_url']}")
        else:
            limit = int(a[1]) if len(a) > 1 else 20000
            data, ctype, final = get(a[0])
            print(f"SOURCE: {final}\n")
            print(to_text(data, ctype)[:limit])
    except urllib.error.HTTPError as e:
        print(f"FETCH FAILED: HTTP {e.code} {e.reason} for {a}"); sys.exit(1)
    except Exception as e:
        print(f"FETCH FAILED: {type(e).__name__}: {e}"); sys.exit(1)


if __name__ == "__main__":
    main()
