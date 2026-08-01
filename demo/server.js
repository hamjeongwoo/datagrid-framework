/* Minimal static file server for the demo pages (no dependencies).
 * Run: node demo/server.js [port]
 *
 * dataSource(원격 데이터) 데모용 API도 함께 제공한다:
 *   GET /api/employees?page=0&pageSize=25&sort=[{"field","dir"}]&quickFilter=text
 *   → { rows: [...], total: n }   (demo/data.js와 같은 시드 데이터 500행)
 *
 * "우리 스펙과 다른 서버" 시연용 v2 (dataSource.request/parse/headers 데모):
 *   GET /api/employees-v2?offset=0&limit=25&orderBy=salary:desc&q=text&dept=Engineering
 *   → { result: { items: [...], totalCount: n, receivedToken: 'X-Demo-Token 헤더 값' | null } }
 */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PORT = Number(process.argv[2]) || 8087;
var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.md': 'text/plain; charset=utf-8',
};

/* demo/data.js의 생성기를 재사용해 서버 데이터셋을 만든다 (시드 고정) */
var EMPLOYEES = (function () {
  var sandbox = { window: {} };
  var code = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
  new Function('window', code)(sandbox.window);
  return sandbox.window.DemoData.makeEmployees(500, 77);
})();

function handleEmployeesApi(req, res, query) {
  var rows = EMPLOYEES.slice();

  var quick = query.get('quickFilter');
  if (quick) {
    var needle = quick.toLowerCase();
    rows = rows.filter(function (r) {
      return Object.keys(r).some(function (k) {
        return String(r[k]).toLowerCase().indexOf(needle) !== -1;
      });
    });
  }

  var sort = query.get('sort');
  if (sort) {
    try {
      var model = JSON.parse(sort);
      rows.sort(function (a, b) {
        for (var i = 0; i < model.length; i++) {
          var f = model[i].field;
          var dir = model[i].dir === 'desc' ? -1 : 1;
          var av = a[f], bv = b[f];
          var cmp = typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
          if (cmp !== 0) return cmp * dir;
        }
        return 0;
      });
    } catch (e) { /* 잘못된 sort 파라미터는 무시 */ }
  }

  var total = rows.length;
  var page = Number(query.get('page'));
  var pageSize = Number(query.get('pageSize'));
  if (!isNaN(page) && !isNaN(pageSize) && pageSize > 0) {
    rows = rows.slice(page * pageSize, page * pageSize + pageSize);
  }

  /* 데모 실감을 위한 짧은 지연 (로딩 오버레이 확인용) */
  setTimeout(function () {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ rows: rows, total: total }));
  }, 120);
}

/* v2: 우리 기본 스펙과 파라미터·응답 레이아웃이 전혀 다른 서버를 흉내낸다.
 * (offset/limit, orderBy=field:dir, q, dept 필터, envelope 응답, 헤더 에코) */
function handleEmployeesV2Api(req, res, query) {
  var rows = EMPLOYEES.slice();

  var dept = query.get('dept');
  if (dept) rows = rows.filter(function (r) { return r.department === dept; });

  var q = query.get('q');
  if (q) {
    var needle = q.toLowerCase();
    rows = rows.filter(function (r) {
      return Object.keys(r).some(function (k) {
        return String(r[k]).toLowerCase().indexOf(needle) !== -1;
      });
    });
  }

  var orderBy = query.get('orderBy'); /* "field:asc" | "field:desc" */
  if (orderBy) {
    var parts = orderBy.split(':');
    var field = parts[0];
    var dir = parts[1] === 'desc' ? -1 : 1;
    rows.sort(function (a, b) {
      var av = a[field], bv = b[field];
      var cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return cmp * dir;
    });
  }

  var totalCount = rows.length;
  var offset = Number(query.get('offset'));
  var limit = Number(query.get('limit'));
  if (!isNaN(offset) && !isNaN(limit) && limit > 0) {
    rows = rows.slice(offset, offset + limit);
  }

  setTimeout(function () {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      result: {
        items: rows,
        totalCount: totalCount,
        receivedToken: req.headers['x-demo-token'] || null,
      },
    }));
  }, 120);
}

http.createServer(function (req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/api/employees' || urlPath === '/api/employees-v2') {
    var query = new URL(req.url, 'http://localhost').searchParams;
    if (urlPath === '/api/employees-v2') handleEmployeesV2Api(req, res, query);
    else handleEmployeesApi(req, res, query);
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  var file = path.normalize(path.join(ROOT, urlPath));
  if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end('Not found: ' + urlPath); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('DataGrid demo running at http://localhost:' + PORT);
});
