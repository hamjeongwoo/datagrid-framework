# -*- coding: utf-8 -*-
"""DataGrid 데모 서버 (Python판) — Node 없이 index.html을 띄울 때 사용.

사용법:
    python demo/server.py            # 기본 8087 포트, 브라우저 자동 오픈
    python demo/server.py 8090      # 포트 지정
    python demo/server.py 8090 --no-open   # 브라우저 자동 오픈 끄기

demo/server.js와 동일하게 프로젝트 루트를 정적으로 서빙한다.
(file:// 직접 열기는 브라우저 제약이 있으므로 반드시 HTTP로 띄울 것)
"""
import json
import re
import sys
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent  # 프로젝트 루트 (index.html 위치)
DEFAULT_PORT = 8087


def _split_param_keys(raw_key):
    """'sorts[0][field]' → ['sorts', '0', 'field']"""
    open_at = raw_key.find("[")
    if open_at == -1:
        return [raw_key]
    return [raw_key[:open_at]] + re.findall(r"\[([^\]]*)\]", raw_key)


def _parse_nested_query(query):
    """브래킷 표기를 중첩 객체로 되돌린다 (server.js의 parseNestedQuery와 동일 규칙).
    qs·PHP·Rails와 같이 숫자 키가 이어지면 배열로 만든다."""
    out = {}
    for raw_key, values in query.items():
        keys = _split_param_keys(raw_key)
        node = out
        for i in range(len(keys) - 1):
            next_is_index = keys[i + 1].isdigit()
            key = int(keys[i]) if isinstance(node, list) else keys[i]
            if isinstance(node, list):
                while len(node) <= key:
                    node.append([] if next_is_index else {})
                node = node[key]
            else:
                if key not in node:
                    node[key] = [] if next_is_index else {}
                node = node[key]
        last = keys[-1]
        if isinstance(node, list):
            idx = int(last)
            while len(node) <= idx:
                node.append(None)
            node[idx] = values[0]
        else:
            node[last] = values[0]
    return out


def _mulberry32(seed):
    """demo/data.js의 시드 PRNG와 동일한 결과를 내는 파이썬 구현."""
    state = seed & 0xFFFFFFFF

    def rnd():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        t = (t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rnd


_FIRST = ['Aiden', 'Bella', 'Chris', 'Dana', 'Eli', 'Fiona', 'Grace', 'Hana', 'Ian', 'Jisoo',
          'Kai', 'Luna', 'Minho', 'Nari', 'Owen', 'Priya', 'Quinn', 'Ravi', 'Sana', 'Theo',
          'Uma', 'Victor', 'Wendy', 'Xander', 'Yuna', 'Zane']
_LAST = ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Smith', 'Johnson', 'Garcia', 'Chen', 'Tanaka',
         'Muller', 'Rossi', 'Silva', 'Novak', 'Haddad', 'Okafor']
_DEPTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'Support']
_CITIES = ['Seoul', 'Tokyo', 'New York', 'London', 'Berlin', 'Singapore', 'Sydney', 'Toronto']
_STATUS = ['Active', 'On Leave', 'Contract', 'Inactive']


def make_employees(count, seed):
    """demo/data.js makeEmployees와 동일한 데이터 (시드 77 → server.js와 동일)."""
    rnd = _mulberry32(seed)
    rows = []
    for i in range(count):
        first = _FIRST[int(rnd() * len(_FIRST))]
        last = _LAST[int(rnd() * len(_LAST))]
        year = 2015 + int(rnd() * 11)
        month = 1 + int(rnd() * 12)
        day = 1 + int(rnd() * 28)
        rows.append({
            'id': i + 1,
            'name': f'{first} {last}',
            'email': f'{first}.{last}'.lower() + '@example.com',
            'department': _DEPTS[int(rnd() * len(_DEPTS))],
            'city': _CITIES[int(rnd() * len(_CITIES))],
            'status': _STATUS[int(rnd() * len(_STATUS))],
            'salary': 42000 + int(rnd() * 1180) * 100,
            'rating': round(rnd() * 40 + 10) / 10,
            'progress': int(rnd() * 101),
            'remote': rnd() > 0.55,
            'hireDate': f'{year}-{month:02d}-{day:02d}',
        })
    return rows


_EMPLOYEES = make_employees(500, 77)


class DemoHandler(SimpleHTTPRequestHandler):
    """UTF-8 charset을 명시한 정적 핸들러 (한국어 주석/문서가 깨지지 않도록).

    server.js와 동일하게 /api/employees 원격 데이터 API도 제공한다.
    """

    extensions_map = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
        "": "application/octet-stream",
    }

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/employees":
            self._serve_employees(parse_qs(parsed.query))
            return
        if parsed.path == "/api/employees-v2":
            self._serve_employees_v2(parse_qs(parsed.query))
            return
        if parsed.path == "/api/employees-v3":
            self._serve_employees_v3(parse_qs(parsed.query))
            return
        super().do_GET()

    def _serve_employees(self, query):
        rows = list(_EMPLOYEES)

        quick = (query.get("quickFilter") or [None])[0]
        if quick:
            needle = quick.lower()
            rows = [r for r in rows if any(needle in str(v).lower() for v in r.values())]

        sort = (query.get("sort") or [None])[0]
        if sort:
            try:
                model = json.loads(sort)
                for spec in reversed(model):  # 안정 정렬이므로 뒤 기준부터
                    field, desc = spec.get("field"), spec.get("dir") == "desc"
                    rows.sort(key=lambda r: (r.get(field) is None, r.get(field)), reverse=desc)
            except (ValueError, TypeError):
                pass  # 잘못된 sort 파라미터는 무시

        total = len(rows)
        try:
            page = int((query.get("page") or [None])[0])
            page_size = int((query.get("pageSize") or [None])[0])
            if page_size > 0:
                rows = rows[page * page_size:(page + 1) * page_size]
        except (TypeError, ValueError):
            pass

        time.sleep(0.12)  # 로딩 오버레이 확인용 지연 (server.js와 동일)
        body = json.dumps({"rows": rows, "total": total}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_employees_v2(self, query):
        """v2: 우리 기본 스펙과 다른 서버 흉내 (server.js와 동일) —
        offset/limit, orderBy=field:dir, q, dept 필터, envelope 응답, 헤더 에코."""
        rows = list(_EMPLOYEES)

        dept = (query.get("dept") or [None])[0]
        if dept:
            rows = [r for r in rows if r["department"] == dept]

        q = (query.get("q") or [None])[0]
        if q:
            needle = q.lower()
            rows = [r for r in rows if any(needle in str(v).lower() for v in r.values())]

        order_by = (query.get("orderBy") or [None])[0]  # "field:asc" | "field:desc"
        if order_by:
            field, _, direction = order_by.partition(":")
            rows.sort(key=lambda r: (r.get(field) is None, r.get(field)),
                      reverse=direction == "desc")

        total_count = len(rows)
        try:
            offset = int((query.get("offset") or [None])[0])
            limit = int((query.get("limit") or [None])[0])
            if limit > 0:
                rows = rows[offset:offset + limit]
        except (TypeError, ValueError):
            pass

        time.sleep(0.12)
        body = json.dumps({"result": {
            "items": rows,
            "totalCount": total_count,
            "receivedToken": self.headers.get("X-Demo-Token"),
        }}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_employees_v3(self, query):
        """v3: 중첩 파라미터를 쓰는 서버 (server.js와 동일) —
        page[selectPage]/page[pageSize], sorts[i][field]/sorts[i][dir] 브래킷 표기.
        selectPage는 1-based(그리드는 0-based)라 dataSource.request로 변환해야 한다.
        paramsSerializer 데모용 compact 표기(sortSpec=name:asc,salary:desc)도 받는다."""
        parsed = _parse_nested_query(query)
        rows = list(_EMPLOYEES)

        sorts = []
        if isinstance(parsed.get("sorts"), list):
            sorts = [s for s in parsed["sorts"] if isinstance(s, dict) and s.get("field")]
        elif parsed.get("sortSpec"):
            for spec in str(parsed["sortSpec"]).split(","):
                if not spec:
                    continue
                field, _, direction = spec.partition(":")
                sorts.append({"field": field, "dir": direction or "asc"})
        for spec in reversed(sorts):  # 안정 정렬이므로 뒤 기준부터
            field = spec["field"]
            rows.sort(key=lambda r: (r.get(field) is None, r.get(field)),
                      reverse=spec.get("dir") == "desc")

        page = parsed.get("page") or {}
        try:
            select_page = int(page.get("selectPage", 1)) or 1  # 1-based
        except (TypeError, ValueError):
            select_page = 1
        try:
            page_size = int(page.get("pageSize", 20)) or 20
        except (TypeError, ValueError):
            page_size = 20
        total = len(rows)
        rows = rows[(select_page - 1) * page_size:select_page * page_size]

        time.sleep(0.12)
        body = json.dumps({
            "rows": rows, "total": total, "receivedParams": parsed,
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # 요청 로그를 한 줄로 간결하게
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    args = [a for a in sys.argv[1:] if a != "--no-open"]
    open_browser = "--no-open" not in sys.argv
    port = int(args[0]) if args else DEFAULT_PORT

    handler = partial(DemoHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("", port), handler)
    url = "http://localhost:%d/index.html" % port

    print("DataGrid demo: %s  (Ctrl+C 로 종료)" % url)
    if open_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
