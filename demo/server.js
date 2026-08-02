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
 *
 * 중첩 파라미터 시연용 v3 (BUG-009 — 중첩 직렬화 데모). 브래킷·닷 두 표기를 모두 받는다:
 *   GET /api/employees-v3?page[selectPage]=1&page[pageSize]=20&sorts[0][field]=name&sorts[0][dir]=asc
 *   GET /api/employees-v3?page.selectPage=1&page.pageSize=20&sorts[0].field=name&sorts[0].dir=asc
 *   (paramsSerializer용 compact 표기 sortSpec=name:asc,salary:desc도 수용)
 *   → { rows: [...], total: n, receivedParams: 서버가 복원한 중첩 구조 }
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

/* 중첩 파라미터 키를 조각으로 나눈다. 브래킷·닷 두 표기를 모두 받는다:
 *   page[selectPage] · page.selectPage      → ['page', 'selectPage']
 *   sorts[0][field]  · sorts[0].field       → ['sorts', '0', 'field']
 * (데모 서버는 의존성 0 원칙을 지키므로 qs 패키지 대신 직접 파싱한다) */
function splitParamKeys(rawKey) {
  var keys = [];
  var re = /[^.[\]]+/g;
  var m;
  while ((m = re.exec(rawKey)) !== null) keys.push(m[0]);
  return keys;
}

function parseNestedQuery(searchParams) {
  var out = {};
  searchParams.forEach(function (value, rawKey) {
    var keys = splitParamKeys(rawKey);
    var node = out;
    for (var i = 0; i < keys.length - 1; i++) {
      var nextIsIndex = /^\d+$/.test(keys[i + 1]);
      if (node[keys[i]] === undefined) node[keys[i]] = nextIsIndex ? [] : {};
      node = node[keys[i]];
    }
    node[keys[keys.length - 1]] = value;
  });
  return out;
}

/* v3: 중첩 파라미터를 쓰는 서버 — { page: { selectPage, pageSize }, sorts: [{ field, dir }] }.
 * selectPage는 1-based(그리드는 0-based)라 dataSource.request로 변환해야 하는 스펙이다.
 * 서버가 실제로 복원한 구조를 receivedParams로 그대로 돌려줘 데모에서 확인할 수 있게 한다.
 * compact 표기(sortSpec=name:asc,salary:desc — paramsSerializer 데모용)도 함께 받는다. */
function handleEmployeesV3Api(req, res, query) {
  var parsed = parseNestedQuery(query);
  var rows = EMPLOYEES.slice();

  var sorts = [];
  if (Array.isArray(parsed.sorts)) {
    sorts = parsed.sorts.filter(function (s) { return s && s.field; });
  } else if (parsed.sortSpec) {
    sorts = String(parsed.sortSpec).split(',').filter(Boolean).map(function (s) {
      var p = s.split(':');
      return { field: p[0], dir: p[1] || 'asc' };
    });
  }
  if (sorts.length > 0) {
    rows.sort(function (a, b) {
      for (var i = 0; i < sorts.length; i++) {
        var f = sorts[i].field;
        var dir = sorts[i].dir === 'desc' ? -1 : 1;
        var av = a[f], bv = b[f];
        var cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
  }

  var page = parsed.page || {};
  var selectPage = Number(page.selectPage) || 1; /* 1-based */
  var pageSize = Number(page.pageSize) || 20;
  var total = rows.length;
  rows = rows.slice((selectPage - 1) * pageSize, selectPage * pageSize);

  setTimeout(function () {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ rows: rows, total: total, receivedParams: parsed }));
  }, 120);
}

http.createServer(function (req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/api/employees' || urlPath === '/api/employees-v2' ||
      urlPath === '/api/employees-v3') {
    var query = new URL(req.url, 'http://localhost').searchParams;
    if (urlPath === '/api/employees-v3') handleEmployeesV3Api(req, res, query);
    else if (urlPath === '/api/employees-v2') handleEmployeesV2Api(req, res, query);
    else handleEmployeesApi(req, res, query);
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  var file = path.normalize(path.join(ROOT, urlPath));
  if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end('Not found: ' + urlPath); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      /* 개발 서버 — 브라우저 휴리스틱 캐시가 옛 dist/datagrid.js를 붙들면
         코드를 고쳐도 화면이 안 바뀌어 디버깅이 헛돈다. */
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('DataGrid demo running at http://localhost:' + PORT);
});
