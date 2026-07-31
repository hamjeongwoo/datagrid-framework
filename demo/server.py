# -*- coding: utf-8 -*-
"""DataGrid 데모 서버 (Python판) — Node 없이 index.html을 띄울 때 사용.

사용법:
    python demo/server.py            # 기본 8087 포트, 브라우저 자동 오픈
    python demo/server.py 8090      # 포트 지정
    python demo/server.py 8090 --no-open   # 브라우저 자동 오픈 끄기

demo/server.js와 동일하게 프로젝트 루트를 정적으로 서빙한다.
(file:// 직접 열기는 브라우저 제약이 있으므로 반드시 HTTP로 띄울 것)
"""
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # 프로젝트 루트 (index.html 위치)
DEFAULT_PORT = 8087


class DemoHandler(SimpleHTTPRequestHandler):
    """UTF-8 charset을 명시한 정적 핸들러 (한국어 주석/문서가 깨지지 않도록)."""

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
