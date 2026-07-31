/* =============================================================================
 * DataGrid — a dependency-free datagrid framework in pure JavaScript.
 *
 * No module system: load with a plain <script> tag; the constructor is
 * exposed as `DataGrid` on window (or globalThis in Node, for testing).
 *
 *   var grid = new DataGrid(containerEl, {
 *     columnDefs: [{ field: 'name', headerName: 'Name', sortable: true }],
 *     rowData: [{ name: 'Alice' }],
 *   });
 * ============================================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------------- */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function el(tag, className, parent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  var SORT_ICON_SVG =
    '<svg class="dg-sort-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M8 3v10M8 3L4 7M8 3l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var FILTER_ICON_SVG =
    '<svg class="dg-filter-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M1.5 2.5h13l-5 6v4.2l-3 1.3V8.5l-5-6z"/></svg>';
  var MENU_ICON_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M2 4.5h12v1.4H2zM2 7.3h12v1.4H2zM2 10.1h12v1.4H2z"/></svg>';
  var CHEVRON_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">' +
    '<path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------------------------------------------------------------------
   * Pure data logic (DOM-free, unit-testable in Node)
   * ------------------------------------------------------------------------- */

  function defaultComparator(a, b) {
    var aNil = a === null || a === undefined || a === '';
    var bNil = b === null || b === undefined || b === '';
    if (aNil && bNil) return 0;
    if (aNil) return 1; /* blanks last */
    if (bNil) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  /**
   * column.dataType('number'|'date'|'bool')에 맞는 정렬 비교 함수를 반환한다.
   * 'string'/미지정은 null을 반환해 defaultComparator를 쓰게 한다.
   * 모든 타입에서 빈 값(null/undefined/'')과 해석 불가 값은 뒤로 보낸다.
   */
  function typeComparator(dataType) {
    function nil(v) { return v === null || v === undefined || v === ''; }
    if (dataType === 'number') {
      return function (a, b) {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        var x = Number(a), y = Number(b);
        if (isNaN(x) && isNaN(y)) return 0;
        if (isNaN(x)) return 1;
        if (isNaN(y)) return -1;
        return x - y;
      };
    }
    if (dataType === 'date') {
      return function (a, b) {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        var x = a instanceof Date ? a.getTime() : new Date(a).getTime();
        var y = b instanceof Date ? b.getTime() : new Date(b).getTime();
        if (isNaN(x) && isNaN(y)) return 0;
        if (isNaN(x)) return 1;
        if (isNaN(y)) return -1;
        return x - y;
      };
    }
    if (dataType === 'bool') {
      return function (a, b) {
        if (nil(a) && nil(b)) return 0;
        if (nil(a)) return 1;
        if (nil(b)) return -1;
        return a === b ? 0 : a ? -1 : 1; /* true 먼저 (defaultComparator와 동일) */
      };
    }
    return null;
  }

  /**
   * 숫자 포맷: '#,##0.00' 스타일 마스크 + 리터럴 접두/접미(예: '$#,##0.00', '#,##0 원').
   * - ',' 포함 시 3자리 그룹핑
   * - 소수부: 자릿수만큼 반올림, '0'은 필수(패딩), '#'은 뒤쪽 0 제거
   * - 정수부 '0' 개수만큼 0 패딩
   * 빈 값/숫자 해석 불가면 '' / 원본 문자열을 반환한다.
   */
  function formatNumber(value, pattern) {
    if (value === null || value === undefined || value === '') return '';
    var n = Number(value);
    if (isNaN(n)) return String(value);
    var m = String(pattern).match(/[#0][#0,.]*/);
    if (!m) return String(value);
    var mask = m[0].replace(/[,.]+$/, ''); /* 마스크 끝의 구분자는 리터럴 접미로 */
    var prefix = String(pattern).slice(0, m.index);
    var suffix = String(pattern).slice(m.index + mask.length);
    var dot = mask.indexOf('.');
    var intMask = dot === -1 ? mask : mask.slice(0, dot);
    var decMask = dot === -1 ? '' : mask.slice(dot + 1);
    var neg = n < 0;
    var fixed = Math.abs(n).toFixed(decMask.length);
    var parts = fixed.split('.');
    var intStr = parts[0];
    var decStr = parts[1] || '';
    var minDec = (decMask.match(/0/g) || []).length;
    while (decStr.length > minDec && decStr.charAt(decStr.length - 1) === '0') {
      decStr = decStr.slice(0, -1);
    }
    var minInt = (intMask.match(/0/g) || []).length;
    while (intStr.length < minInt) intStr = '0' + intStr;
    if (intMask.indexOf(',') !== -1) {
      intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return (neg ? '-' : '') + prefix + intStr + (decStr ? '.' + decStr : '') + suffix;
  }

  /**
   * 날짜 포맷: yyyy/yy/MM/dd/HH/mm/ss 토큰 치환. Date 인스턴스 또는
   * Date로 해석 가능한 문자열/숫자를 받는다. 해석 불가면 원본 문자열 반환.
   */
  function formatDate(value, pattern) {
    if (value === null || value === undefined || value === '') return '';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    function p2(x) { return x < 10 ? '0' + x : String(x); }
    return String(pattern)
      .replace(/yyyy/g, String(d.getFullYear()))
      .replace(/yy/g, String(d.getFullYear()).slice(-2))
      .replace(/MM/g, p2(d.getMonth() + 1))
      .replace(/dd/g, p2(d.getDate()))
      .replace(/HH/g, p2(d.getHours()))
      .replace(/mm/g, p2(d.getMinutes()))
      .replace(/ss/g, p2(d.getSeconds()));
  }

  /** column.format / DataGrid.format() 진입점 — '#'나 '0'이 있으면 숫자, 아니면 날짜 패턴. */
  function formatValue(value, pattern) {
    if (pattern === null || pattern === undefined || pattern === '') {
      return value === null || value === undefined ? '' : String(value);
    }
    return /[#0]/.test(String(pattern))
      ? formatNumber(value, pattern)
      : formatDate(value, pattern);
  }

  /**
   * sortModel: [{ field, dir: 'asc'|'desc' }]
   * comparators: { field: fn(a, b, rowA, rowB) } (optional overrides)
   * Stable sort; returns a new array.
   */
  function sortRows(rows, sortModel, comparators) {
    if (!sortModel || sortModel.length === 0) return rows.slice();
    comparators = comparators || {};
    var indexed = rows.map(function (row, i) { return { row: row, i: i }; });
    indexed.sort(function (x, y) {
      for (var s = 0; s < sortModel.length; s++) {
        var field = sortModel[s].field;
        var dir = sortModel[s].dir === 'desc' ? -1 : 1;
        var cmp = comparators[field] || defaultComparator;
        var r = cmp(x.row[field], y.row[field], x.row, y.row);
        if (r !== 0) return r * dir;
      }
      return x.i - y.i;
    });
    return indexed.map(function (e) { return e.row; });
  }

  /**
   * Builds a predicate for one column filter model.
   * model: { type: 'text'|'number'|'set', op, value, valueTo, values }
   */
  function buildFilterPredicate(field, model) {
    if (!model) return null;
    if (model.type === 'set') {
      var allowed = {};
      (model.values || []).forEach(function (v) { allowed[String(v)] = true; });
      return function (row) { return allowed[String(row[field])] === true; };
    }
    if (model.type === 'number') {
      var num = Number(model.value);
      var numTo = Number(model.valueTo);
      return function (row) {
        var v = row[field];
        if (v === null || v === undefined || v === '') return false;
        v = Number(v);
        if (isNaN(v)) return false;
        switch (model.op) {
          case 'equals': return v === num;
          case 'notEqual': return v !== num;
          case 'lessThan': return v < num;
          case 'lessThanOrEqual': return v <= num;
          case 'greaterThan': return v > num;
          case 'greaterThanOrEqual': return v >= num;
          case 'inRange': return v >= num && v <= numTo;
          default: return true;
        }
      };
    }
    /* text */
    var needle = String(model.value === undefined || model.value === null ? '' : model.value).toLowerCase();
    return function (row) {
      var raw = row[field];
      var hay = (raw === null || raw === undefined ? '' : String(raw)).toLowerCase();
      switch (model.op) {
        case 'equals': return hay === needle;
        case 'notEqual': return hay !== needle;
        case 'startsWith': return hay.indexOf(needle) === 0;
        case 'endsWith': return needle.length === 0 || hay.slice(-needle.length) === needle;
        case 'notContains': return hay.indexOf(needle) === -1;
        case 'contains':
        default: return hay.indexOf(needle) !== -1;
      }
    };
  }

  /** filterModel: { field: model } — AND across columns. Returns a new array. */
  function filterRows(rows, filterModel) {
    var predicates = [];
    for (var field in filterModel) {
      if (Object.prototype.hasOwnProperty.call(filterModel, field)) {
        var p = buildFilterPredicate(field, filterModel[field]);
        if (p) predicates.push(p);
      }
    }
    if (predicates.length === 0) return rows.slice();
    return rows.filter(function (row) {
      for (var i = 0; i < predicates.length; i++) {
        if (!predicates[i](row)) return false;
      }
      return true;
    });
  }

  /** Case-insensitive match against the given fields' values. */
  function quickFilterRows(rows, text, fields) {
    var needle = String(text || '').trim().toLowerCase();
    if (!needle) return rows.slice();
    var terms = needle.split(/\s+/);
    return rows.filter(function (row) {
      var hay = fields
        .map(function (f) {
          var v = row[f];
          return v === null || v === undefined ? '' : String(v);
        })
        .join(' ')
        .toLowerCase();
      for (var t = 0; t < terms.length; t++) {
        if (hay.indexOf(terms[t]) === -1) return false;
      }
      return true;
    });
  }

  /**
   * 행 배열 → 엑셀 호환 TSV. 값은 원시 데이터를 그대로 사용한다
   * (포매터 미적용 — 붙여넣기 왕복과 스프레드시트 숫자 인식을 위해).
   * 탭·개행·따옴표가 든 값은 큰따옴표로 감싸고 내부 따옴표는 두 번 쓴다.
   */
  function buildTsv(rows, columns) {
    function esc(v) {
      var s = v === null || v === undefined ? '' : String(v);
      if (/[\t\r\n"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    return rows
      .map(function (row) {
        return columns.map(function (c) { return esc(row[c.field]); }).join('\t');
      })
      .join('\r\n');
  }

  /**
   * TSV 텍스트 → 2차원 문자열 배열. 큰따옴표 셀(내부 탭/개행/"" 이스케이프)을
   * 지원하고, 스프레드시트가 붙이는 마지막 빈 줄 하나는 무시한다.
   */
  function parseTsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var i = 0;
    var s = String(text);
    while (i < s.length) {
      var ch = s[i];
      if (inQuotes) {
        if (ch === '"') {
          if (s[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"' && cell === '') { inQuotes = true; i++; continue; }
      if (ch === '\t') { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      cell += ch; i++;
    }
    row.push(cell);
    rows.push(row);
    /* 스프레드시트 복사분은 개행으로 끝나 마지막에 빈 행이 하나 생긴다 */
    var last = rows[rows.length - 1];
    if (rows.length > 1 && last.length === 1 && last[0] === '') rows.pop();
    return rows;
  }

  /**
   * column.validator 반환값 해석: 유효하면 null, 아니면 표시할 오류 메시지.
   * true/undefined/null = 유효, 문자열 = 해당 메시지로 거부,
   * 그 외 falsy(false 등) = 기본 메시지로 거부.
   */
  function validationMessage(result) {
    if (result === true || result === undefined || result === null) return null;
    return typeof result === 'string' && result !== '' ? result : 'Invalid value';
  }

  /**
   * 헤더 필터 행(floatingFilter)의 입력값 → 컬럼 필터 모델.
   * - raw가 null/undefined이거나 (set 제외) 공백뿐이면 null(필터 해제).
   * - 이미 적용된 모델의 연산자는 유지하되, 단일 입력으로 표현할 수 없는
   *   inRange는 equals로 대체한다. set은 단일 값 선택으로 동작.
   */
  function buildFloatingFilterModel(filterType, raw, currentModel) {
    if (raw === null || raw === undefined) return null;
    var value = String(raw);
    if (filterType === 'set') return { type: 'set', values: [value] };
    if (value.trim() === '') return null;
    if (filterType === 'number') {
      var op = currentModel && currentModel.type === 'number' && currentModel.op !== 'inRange'
        ? currentModel.op
        : 'equals';
      return { type: 'number', op: op, value: value };
    }
    var textOp = currentModel && currentModel.type === 'text' ? currentModel.op : 'contains';
    return { type: 'text', op: textOp, value: value };
  }

  /**
   * 그룹/전체 요약용 집계. func: 'sum'|'avg'|'min'|'max'|'count'
   * count는 모든 행을 세고, 나머지는 숫자로 해석 가능한 값만 집계한다.
   * 집계할 숫자가 하나도 없으면 null.
   */
  function aggregateValues(rows, field, func) {
    if (func === 'count') return rows.length;
    var sum = 0, min = Infinity, max = -Infinity, n = 0;
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i][field];
      if (raw === null || raw === undefined || raw === '') continue;
      var v = Number(raw);
      if (isNaN(v)) continue;
      n++;
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (n === 0) return null;
    switch (func) {
      case 'sum': return sum;
      case 'avg': return sum / n;
      case 'min': return min;
      case 'max': return max;
      default: return null;
    }
  }

  /**
   * 필터·정렬이 끝난 행을 그룹 헤더 항목이 섞인 평면 표시 리스트로 변환한다.
   * - 그룹 순서는 데이터에서의 첫 등장 순서 (버킷 방식이라 연속 정렬 불필요)
   * - isExpanded(path)가 false인 그룹의 자식은 리스트에서 빠지지만,
   *   집계(agg)는 항상 전체 자식 기준으로 계산된다.
   * 그룹 항목: { __group, field, value, path, level, leafCount, expanded, agg }
   */
  function buildGroupView(rows, groupFields, isExpanded, aggColumns) {
    if (!groupFields || groupFields.length === 0) return rows.slice();
    aggColumns = aggColumns || [];
    var items = [];
    (function walk(subset, level, parentPath) {
      var field = groupFields[level];
      var order = [];
      var buckets = Object.create(null);
      subset.forEach(function (row) {
        var key = String(row[field]);
        if (!buckets[key]) { buckets[key] = []; order.push(key); }
        buckets[key].push(row);
      });
      order.forEach(function (key) {
        var children = buckets[key];
        /* \u0001: 데이터 값에 등장할 일 없는 레벨 구분자 */
        var path = parentPath + '\u0001' + field + ':' + key;
        var expanded = !!isExpanded(path);
        var agg = {};
        aggColumns.forEach(function (c) {
          agg[c.field] = aggregateValues(children, c.field, c.aggFunc);
        });
        items.push({
          __group: true,
          field: field,
          value: children[0][field],
          path: path,
          level: level,
          leafCount: children.length,
          expanded: expanded,
          agg: agg,
        });
        if (!expanded) return;
        if (level + 1 < groupFields.length) walk(children, level + 1, path);
        else children.forEach(function (r) { items.push(r); });
      });
    })(rows, 0, '');
    return items;
  }

  function paginate(totalRows, pageSize, currentPage) {
    var pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
    var page = clamp(currentPage, 0, pageCount - 1);
    var start = page * pageSize;
    var end = Math.min(totalRows, start + pageSize);
    return {
      page: page,
      pageCount: pageCount,
      start: start,
      end: end,
      /* 1-based labels for the "X to Y of Z" summary */
      firstRow: totalRows === 0 ? 0 : start + 1,
      lastRow: end,
      total: totalRows,
    };
  }

  /** Which page buttons to show: numbers and '…' gaps, always first/last. */
  function pageButtonModel(pageCount, current, maxButtons) {
    maxButtons = maxButtons || 7;
    if (pageCount <= maxButtons) {
      var all = [];
      for (var i = 0; i < pageCount; i++) all.push(i);
      return all;
    }
    var half = Math.floor((maxButtons - 2) / 2);
    var start = clamp(current - half, 1, pageCount - maxButtons + 1);
    var out = [0];
    if (start > 1) out.push('…');
    for (var p = start; p < start + maxButtons - 2 && p < pageCount - 1; p++) out.push(p);
    if (out[out.length - 1] !== '…' && out[out.length - 1] < pageCount - 2) out.push('…');
    out.push(pageCount - 1);
    return out;
  }

  function csvEscape(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCsv(rows, columns) {
    var lines = [columns.map(function (c) { return csvEscape(c.headerName); }).join(',')];
    rows.forEach(function (row) {
      lines.push(
        columns
          .map(function (c) {
            var v = row[c.field];
            if (c.valueFormatter) v = c.valueFormatter(v, row);
            return csvEscape(v);
          })
          .join(',')
      );
    });
    return lines.join('\r\n');
  }

  /* ---------------------------------------------------------------------------
   * Column normalization
   * ------------------------------------------------------------------------- */

  var DEFAULT_COL = {
    width: 160,
    minWidth: 60,
    sortable: true,
    resizable: true,
    editable: false,
    filter: false,
    hide: false,
    pinned: null,
    align: 'left',
  };

  function normalizeColumns(columnDefs, defaultColDef) {
    return (columnDefs || []).map(function (def, i) {
      var col = {};
      var k;
      for (k in DEFAULT_COL) col[k] = DEFAULT_COL[k];
      if (defaultColDef) for (k in defaultColDef) col[k] = defaultColDef[k];
      for (k in def) col[k] = def[k];
      col.colId = col.colId || col.field || 'col-' + i;
      col.headerName = col.headerName !== undefined ? col.headerName : col.field || '';
      /* dataType이 filter:true의 필터 종류와 기본 align을 결정한다 */
      if (col.filter === true) {
        col.filter = col.dataType === 'number' ? 'number'
          : col.dataType === 'bool' ? 'set'
          : 'text';
      }
      var alignExplicit = ('align' in def) || (defaultColDef && 'align' in defaultColDef);
      if (col.dataType === 'number' && !alignExplicit) col.align = 'right';
      /* 선언적 format — valueFormatter가 없을 때만 합성 (CSV·집계·자동 폭에도 일괄 적용) */
      if (col.format && !col.valueFormatter) {
        col.valueFormatter = (function (pattern) {
          return function (v) { return formatValue(v, pattern); };
        })(col.format);
      }
      return col;
    });
  }

  /**
   * getState()의 컬럼 상태를 현재 컬럼 목록에 적용한 결과를 계산한다.
   * - stateColumns 순서대로 재배열, 목록에 없는 colId는 무시
   * - state에 빠진 컬럼은 원래 상대 순서를 유지한 채 뒤에 붙인다
   * 입력을 변형하지 않고 { columns, widths, hidden }을 반환한다.
   */
  function applyColumnState(columns, stateColumns) {
    var result = { columns: columns.slice(), widths: {}, hidden: {} };
    if (!stateColumns || stateColumns.length === 0) return result;
    var byId = {};
    columns.forEach(function (c) { byId[c.colId] = c; });
    var ordered = [];
    var seen = {};
    stateColumns.forEach(function (sc) {
      if (!sc || sc.colId === undefined) return;
      var col = byId[sc.colId];
      if (!col || seen[sc.colId]) return;
      seen[sc.colId] = true;
      ordered.push(col);
      if (typeof sc.width === 'number' && sc.width > 0) result.widths[sc.colId] = sc.width;
      if (sc.hide !== undefined) result.hidden[sc.colId] = !!sc.hide;
    });
    columns.forEach(function (c) {
      if (!seen[c.colId]) ordered.push(c);
    });
    result.columns = ordered;
    return result;
  }

  /* ---------------------------------------------------------------------------
   * Event emitter
   * ------------------------------------------------------------------------- */

  function Emitter() {
    this._handlers = {};
  }
  Emitter.prototype.on = function (name, fn) {
    (this._handlers[name] = this._handlers[name] || []).push(fn);
    return this;
  };
  Emitter.prototype.off = function (name, fn) {
    var list = this._handlers[name];
    if (list) {
      var i = list.indexOf(fn);
      if (i !== -1) list.splice(i, 1);
    }
    return this;
  };
  Emitter.prototype.emit = function (name, payload) {
    var list = this._handlers[name];
    if (list) {
      list.slice().forEach(function (fn) {
        try { fn(payload); } catch (e) { console.error('[DataGrid] "' + name + '" handler failed:', e); }
      });
    }
  };

  /* ---------------------------------------------------------------------------
   * DataGrid
   * ------------------------------------------------------------------------- */

  var ROW_BUFFER = 6;

  function DataGrid(container, options) {
    if (!(this instanceof DataGrid)) return new DataGrid(container, options);
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container || !container.appendChild) {
      throw new Error('DataGrid: first argument must be a DOM element or selector of one.');
    }
    options = options || {};

    this.options = options;
    this._emitter = new Emitter();
    this._container = container;
    this._destroyed = false;

    /* column state */
    this._columns = normalizeColumns(options.columnDefs, options.defaultColDef);
    this._colWidths = {};

    /* data state */
    this._rows = [];
    this._idCounter = 0;
    this._rowIds = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    this._viewRows = [];
    this._pageRows = [];

    /* grouping */
    this._groupBy = (options.groupBy || []).slice();
    this._groupDefaultExpanded = options.groupDefaultExpanded !== false;
    this._groupToggled = {}; /* path -> expanded override */

    /* interaction state */
    this._sortModel = options.sortModel ? options.sortModel.slice() : [];
    this._filterModel = {};
    this._quickFilter = '';
    this._selection = {}; /* id -> row */
    this._lastClickedViewIndex = -1;
    this._focusedCell = null; /* { r, c } page-view coordinates */
    this._editing = null;

    /* pagination */
    this._pagination = !!options.pagination;
    this._pageSize = options.paginationPageSize || 20;
    this._pageSizeOptions = options.paginationPageSizeOptions || [10, 20, 50, 100];
    this._currentPage = 0;

    this._rowHeight = options.rowHeight || 42;
    this._headerHeight = options.headerHeight || 48;

    this._pasteCount = 0; /* paste 이벤트/클립보드 API 폴백의 이중 실행 방지용 */
    this._docListeners = [];
    this._buildDom();
    this._bindEvents();

    this.setRowData(options.rowData || []);
  }

  /* ---- events ---- */
  DataGrid.prototype.on = function (name, fn) { this._emitter.on(name, fn); return this; };
  DataGrid.prototype.off = function (name, fn) { this._emitter.off(name, fn); return this; };

  /* ---- DOM scaffolding ---- */

  DataGrid.prototype._buildDom = function () {
    var root = el('div', 'dg-root');
    root.setAttribute('tabindex', '0');
    root.setAttribute('role', 'grid');
    if (this.options.theme === 'dark') root.classList.add('dg-theme-dark');
    if (this.options.zebra) root.classList.add('dg-zebra');
    root.style.setProperty('--dg-row-height', this._rowHeight + 'px');
    root.style.setProperty('--dg-header-height', this._headerHeight + 'px');

    this._headerEl = el('div', 'dg-header', root);
    this._headerRowEl = el('div', 'dg-header-row', this._headerEl);

    this._bodyEl = el('div', 'dg-body', root);
    this._canvasEl = el('div', 'dg-canvas', this._bodyEl);

    this._footerEl = el('div', 'dg-footer', root);
    this._footerRowEl = el('div', 'dg-footer-row', this._footerEl);
    this._footerEl.hidden = true;
    this._footerCells = {};

    this._overlayEl = el('div', 'dg-overlay', root);
    this._overlayEl.hidden = true;

    if (this._pagination) {
      this._pagingEl = el('div', 'dg-paging-panel', root);
    }

    this._container.appendChild(root);
    this._rootEl = root;
    this._renderedRows = {}; /* pageIndex -> row element */
    this._lastRange = null;
  };

  DataGrid.prototype._bindEvents = function () {
    var self = this;

    this._bodyEl.addEventListener('scroll', function () {
      self._headerEl.scrollLeft = self._bodyEl.scrollLeft;
      self._footerEl.scrollLeft = self._bodyEl.scrollLeft;
      self._renderVisibleRows();
    });

    this._canvasEl.addEventListener('click', function (e) { self._onCellClick(e); });
    this._canvasEl.addEventListener('dblclick', function (e) { self._onCellDblClick(e); });
    this._rootEl.addEventListener('keydown', function (e) { self._onKeyDown(e); });

    /* Ctrl+V 1차 경로 — 브라우저가 클립보드 내용을 이벤트로 직접 전달 */
    this._rootEl.addEventListener('paste', function (e) {
      if (self._editing || !self._focusedCell) return;
      var text = e.clipboardData && e.clipboardData.getData('text/plain');
      if (!text) return;
      self._pasteCount++;
      e.preventDefault();
      self.pasteTsv(text);
    });

    var closeMenus = function (e) {
      if (!self._menuEl || self._menuEl.contains(e.target)) return;
      /* 메뉴를 연 컬럼의 메뉴 버튼 위 mousedown은 여기서 닫지 않는다 —
       * 닫아버리면 이어지는 click에서 다시 열려 토글이 불가능해진다. */
      var btn = e.target.closest ? e.target.closest('.dg-header-menu-btn') : null;
      if (btn && self._menuHeaderCell && self._menuHeaderCell.contains(btn)) return;
      self._closeMenu();
    };
    document.addEventListener('mousedown', closeMenus);
    this._docListeners.push(['mousedown', closeMenus]);

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(function () { self._layoutColumns(); });
      this._resizeObserver.observe(this._rootEl);
    }
  };

  /* ---- row identity ---- */

  DataGrid.prototype._rowId = function (row) {
    if (this.options.getRowId) return this.options.getRowId(row);
    if (this._rowIds) {
      var id = this._rowIds.get(row);
      if (id === undefined) {
        id = 'dg-' + (this._idCounter++);
        this._rowIds.set(row, id);
      }
      return id;
    }
    return this._rows.indexOf(row);
  };

  /* ---- view pipeline ---- */

  DataGrid.prototype._visibleColumns = function () {
    var cols = this._columns.filter(function (c) { return !c.hide; });
    var left = cols.filter(function (c) { return c.pinned === 'left'; });
    var right = cols.filter(function (c) { return c.pinned === 'right'; });
    var middle = cols.filter(function (c) { return c.pinned !== 'left' && c.pinned !== 'right'; });
    return left.concat(middle, right);
  };

  DataGrid.prototype._recomputeView = function () {
    var comparators = {};
    this._columns.forEach(function (c) {
      var cmp = c.comparator || (c.dataType ? typeComparator(c.dataType) : null);
      if (cmp) comparators[c.field] = cmp;
    });
    var fields = this._visibleColumns()
      .map(function (c) { return c.field; })
      .filter(Boolean);

    var rows = filterRows(this._rows, this._filterModel);
    rows = quickFilterRows(rows, this._quickFilter, fields);
    rows = sortRows(rows, this._sortModel, comparators);
    this._viewRows = rows;

    /* 그룹핑: 리프 행(_viewRows)과 그룹 헤더가 섞인 표시 리스트(_displayRows)를 분리.
     * 선택·CSV 등 데이터 API는 리프만, 렌더링·페이징은 표시 리스트를 쓴다. */
    this._aggColumns = this._columns.filter(function (c) { return c.aggFunc && c.field; });
    var display = rows;
    if (this._groupBy.length > 0) {
      var toggled = this._groupToggled;
      var defaultExpanded = this._groupDefaultExpanded;
      display = buildGroupView(rows, this._groupBy, function (path) {
        return toggled[path] !== undefined ? toggled[path] : defaultExpanded;
      }, this._aggColumns);
    }
    this._displayRows = display;

    if (this._pagination) {
      var info = paginate(display.length, this._pageSize, this._currentPage);
      this._currentPage = info.page;
      this._pageInfo = info;
      this._pageRows = display.slice(info.start, info.end);
    } else {
      this._pageInfo = null;
      this._pageRows = display;
    }
  };

  /* ---- full refresh ---- */

  DataGrid.prototype.refresh = function () {
    if (this._destroyed) return;
    this._cancelEdit();
    this._recomputeView();
    this._renderHeader();
    this._layoutColumns();
    this._renderBody();
    this._renderGrandTotal();
    this._renderPaging();
    this._updateOverlay();
  };

  /* ---- header ---- */

  DataGrid.prototype._renderHeader = function () {
    var self = this;
    this._headerRowEl.innerHTML = '';
    this._headerCells = {};

    this._visibleColumns().forEach(function (col) {
      var cell = el('div', 'dg-header-cell', self._headerRowEl);
      cell.setAttribute('role', 'columnheader');
      cell.dataset.colId = col.colId;
      if (col.align === 'right') cell.classList.add('dg-align-right');
      if (col.align === 'center') cell.classList.add('dg-align-center');
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');

      if (col.headerCheckboxSelection && self.options.rowSelection === 'multiple') {
        cell.classList.add('dg-checkbox-header');
        var cb = el('input', 'dg-checkbox', cell);
        cb.type = 'checkbox';
        cb.setAttribute('aria-label', 'Select all rows');
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function () {
          if (cb.checked) self.selectAll(); else self.deselectAll();
        });
        self._headerSelectAllEl = cb;
      }

      var label = el('span', 'dg-header-cell-label', cell);
      label.textContent = col.headerName;

      if (col.sortable) {
        cell.classList.add('dg-sortable');
        cell.insertAdjacentHTML('beforeend', SORT_ICON_SVG);
        var orderEl = el('span', 'dg-sort-order', cell);
        var sortIdx = self._sortModel.findIndex(function (s) { return s.field === col.field; });
        if (sortIdx !== -1) {
          cell.classList.add(self._sortModel[sortIdx].dir === 'asc' ? 'dg-sort-asc' : 'dg-sort-desc');
          cell.setAttribute('aria-sort', self._sortModel[sortIdx].dir === 'asc' ? 'ascending' : 'descending');
          if (self._sortModel.length > 1) orderEl.textContent = String(sortIdx + 1);
        }
        cell.addEventListener('click', function (e) {
          if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn')) return;
          self._toggleSort(col, e.shiftKey);
        });
      }

      if (col.filter) {
        cell.insertAdjacentHTML('beforeend', FILTER_ICON_SVG);
        if (self._filterModel[col.field]) cell.classList.add('dg-filter-active');
        var menuBtn = el('button', 'dg-header-menu-btn', cell);
        menuBtn.type = 'button';
        menuBtn.innerHTML = MENU_ICON_SVG;
        menuBtn.setAttribute('aria-label', col.headerName + ' filter menu');
        menuBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          /* 같은 컬럼 메뉴가 이미 열려 있으면 토글로 닫는다 */
          if (self._menuHeaderCell === cell) {
            self._closeMenu();
            return;
          }
          self._openFilterMenu(col, cell);
        });
      }

      if (col.resizable) {
        var resizer = el('div', 'dg-header-resizer', cell);
        self._bindResizer(resizer, col);
      }

      if (self.options.columnReorder !== false && !col.pinned && !col.checkboxSelection) {
        self._bindReorder(cell, col);
      }

      self._headerCells[col.colId] = cell;
    });

    this._renderFloatingFilters();
  };

  /* ---- floating filter row (헤더 아래 인라인 필터) ---- */

  /* set 필터 select에서 빈 문자열 값을 '(All)'(value="")과 구분하기 위한 센티널 */
  var FLOATING_BLANK = '__blank__';

  DataGrid.prototype._renderFloatingFilters = function () {
    var self = this;
    if (this._floatingRowEl && this._floatingRowEl.parentNode) {
      this._floatingRowEl.parentNode.removeChild(this._floatingRowEl);
    }
    this._floatingRowEl = null;
    this._floatingCells = {};

    var cols = this._visibleColumns();
    var hasFilter = cols.some(function (c) { return c.filter && c.field; });
    if (!this.options.floatingFilter || !hasFilter) return;

    var row = el('div', 'dg-floating-row', this._headerEl);
    row.setAttribute('role', 'row');
    this._floatingRowEl = row;

    cols.forEach(function (col) {
      var cell = el('div', 'dg-floating-cell', row);
      cell.dataset.colId = col.colId;
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._applyCellLayout(cell, col.colId);
      self._floatingCells[col.colId] = cell;
      if (!col.filter || !col.field) return;

      var current = self._filterModel[col.field];

      if (col.filter === 'set') {
        var select = el('select', 'dg-floating-input', cell);
        select.setAttribute('aria-label', col.headerName + ' filter');
        var optAll = el('option', null, select);
        optAll.value = '';
        optAll.textContent = '(All)';
        self._uniqueFieldValues(col.field).forEach(function (v) {
          var opt = el('option', null, select);
          opt.value = v === '' ? FLOATING_BLANK : v;
          opt.textContent = v === '' ? '(Blanks)' : v;
        });
        if (current && current.type === 'set' && current.values && current.values.length === 1) {
          var cv = String(current.values[0]);
          select.value = cv === '' ? FLOATING_BLANK : cv;
        }
        select.addEventListener('change', function () {
          var raw = select.value === '' ? null
            : select.value === FLOATING_BLANK ? '' : select.value;
          self._applyFloatingFilter(col, buildFloatingFilterModel('set', raw, null));
        });
        return;
      }

      var input = el('input', 'dg-floating-input', cell);
      input.type = col.filter === 'number' ? 'number' : 'text';
      input.placeholder = 'Filter…';
      input.setAttribute('aria-label', col.headerName + ' filter');
      if (current && current.value !== undefined) input.value = current.value;
      var timer = null;
      var apply = function () {
        self._applyFloatingFilter(
          col,
          buildFloatingFilterModel(col.filter, input.value, self._filterModel[col.field])
        );
      };
      input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(apply, 250);
      });
      input.addEventListener('keydown', function (e) {
        e.stopPropagation(); /* 그리드 키보드 내비게이션과 분리 */
        if (e.key === 'Enter') { clearTimeout(timer); apply(); }
        else if (e.key === 'Escape') {
          clearTimeout(timer);
          input.value = '';
          self._applyFloatingFilter(col, null);
        }
      });
    });
  };

  /* refresh()가 헤더 DOM을 재생성하므로, 필터 적용 후 입력 포커스·캐럿을 복원한다. */
  DataGrid.prototype._applyFloatingFilter = function (col, model) {
    var hadFocus = this._floatingCells[col.colId] &&
      this._floatingCells[col.colId].contains(document.activeElement);
    this.applyColumnFilter(col.field, model);
    if (!hadFocus) return;
    var cell = this._floatingCells[col.colId];
    var input = cell && cell.querySelector('.dg-floating-input');
    if (input) {
      input.focus();
      if (input.setSelectionRange && input.type === 'text') {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  };

  DataGrid.prototype._uniqueFieldValues = function (field) {
    var values = [];
    var seen = Object.create(null);
    this._rows.forEach(function (r) {
      var v = String(r[field]);
      if (!seen[v]) { seen[v] = true; values.push(v); }
    });
    values.sort();
    return values;
  };

  /* ---- column layout (widths + pinned offsets) ---- */

  DataGrid.prototype._layoutColumns = function () {
    if (this._destroyed) return;
    var cols = this._visibleColumns();
    var self = this;
    var available = this._bodyEl.clientWidth || this._rootEl.clientWidth;

    var fixedTotal = 0;
    var flexTotal = 0;
    cols.forEach(function (c) {
      var w = self._colWidths[c.colId];
      if (w === undefined && c.flex) { flexTotal += c.flex; return; }
      fixedTotal += w !== undefined ? w : c.width;
    });

    var widths = {};
    var flexSpace = Math.max(0, available - fixedTotal);
    cols.forEach(function (c) {
      var w = self._colWidths[c.colId];
      if (w === undefined && c.flex) {
        w = Math.max(c.minWidth, Math.floor((flexSpace * c.flex) / (flexTotal || 1)));
      } else if (w === undefined) {
        w = c.width;
      }
      widths[c.colId] = Math.max(c.minWidth, w);
    });
    this._computedWidths = widths;

    /* pinned offsets */
    var leftOffset = 0;
    var offsets = {};
    cols.forEach(function (c) {
      if (c.pinned === 'left') { offsets[c.colId] = { left: leftOffset }; leftOffset += widths[c.colId]; }
    });
    var rightOffset = 0;
    for (var i = cols.length - 1; i >= 0; i--) {
      var c = cols[i];
      if (c.pinned === 'right') { offsets[c.colId] = { right: rightOffset }; rightOffset += widths[c.colId]; }
    }
    this._pinnedOffsets = offsets;

    var lastLeft = null, firstRight = null;
    cols.forEach(function (c) {
      if (c.pinned === 'left') lastLeft = c.colId;
      if (c.pinned === 'right' && firstRight === null) firstRight = c.colId;
    });
    this._pinnedEdges = { left: lastLeft, right: firstRight };

    /* apply to header */
    for (var colId in this._headerCells) {
      this._applyCellLayout(this._headerCells[colId], colId);
    }
    /* apply to floating filter row */
    for (var flColId in this._floatingCells) {
      this._applyCellLayout(this._floatingCells[flColId], flColId);
    }
    /* apply to grand total footer */
    for (var fColId in this._footerCells) {
      this._applyCellLayout(this._footerCells[fColId], fColId);
    }
    /* apply to rendered rows */
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      for (var j = 0; j < rowEl.children.length; j++) {
        this._applyCellLayout(rowEl.children[j], rowEl.children[j].dataset.colId);
      }
    }
  };

  DataGrid.prototype._applyCellLayout = function (cellEl, colId) {
    if (!cellEl || !colId || !this._computedWidths) return;
    cellEl.style.width = this._computedWidths[colId] + 'px';
    var off = this._pinnedOffsets[colId];
    if (off) {
      if (off.left !== undefined) cellEl.style.left = off.left + 'px';
      if (off.right !== undefined) cellEl.style.right = off.right + 'px';
    }
    cellEl.classList.toggle(
      'dg-pinned-edge',
      colId === this._pinnedEdges.left || colId === this._pinnedEdges.right
    );
  };

  /* ---- body rendering (virtualized) ---- */

  DataGrid.prototype._renderBody = function () {
    this._canvasEl.innerHTML = '';
    this._renderedRows = {};
    this._lastRange = null;
    this._canvasEl.style.height = this._pageRows.length * this._rowHeight + 'px';
    this._renderVisibleRows(true);
  };

  DataGrid.prototype._renderVisibleRows = function (force) {
    var total = this._pageRows.length;
    var viewportH = this._bodyEl.clientHeight || 400;
    var first = Math.floor(this._bodyEl.scrollTop / this._rowHeight) - ROW_BUFFER;
    var last = Math.ceil((this._bodyEl.scrollTop + viewportH) / this._rowHeight) + ROW_BUFFER;
    first = clamp(first, 0, Math.max(0, total - 1));
    last = clamp(last, 0, total);

    if (!force && this._lastRange && this._lastRange[0] === first && this._lastRange[1] === last) return;
    this._lastRange = [first, last];

    /* drop rows that left the window */
    for (var idx in this._renderedRows) {
      if (idx < first || idx >= last) {
        this._canvasEl.removeChild(this._renderedRows[idx]);
        delete this._renderedRows[idx];
      }
    }
    /* add missing rows */
    for (var i = first; i < last; i++) {
      if (!this._renderedRows[i]) {
        this._renderedRows[i] = this._buildRowEl(i);
        this._canvasEl.appendChild(this._renderedRows[i]);
      }
    }
  };

  DataGrid.prototype._buildRowEl = function (pageIndex) {
    var self = this;
    var row = this._pageRows[pageIndex];
    if (row && row.__group) return this._buildGroupRowEl(pageIndex, row);
    var id = this._rowId(row);
    var rowEl = el('div', 'dg-row');
    rowEl.setAttribute('role', 'row');
    rowEl.style.top = pageIndex * this._rowHeight + 'px';
    rowEl.dataset.rowIndex = pageIndex;
    rowEl.dataset.rowId = id;
    var globalIndex = (this._pageInfo ? this._pageInfo.start : 0) + pageIndex;
    if (globalIndex % 2 === 1) rowEl.classList.add('dg-row-odd');
    if (this._selection[id]) rowEl.classList.add('dg-row-selected');

    this._visibleColumns().forEach(function (col, cIdx) {
      var cell = el('div', 'dg-cell', rowEl);
      cell.setAttribute('role', 'gridcell');
      cell.dataset.colId = col.colId;
      cell.dataset.colIndex = cIdx;
      if (col.align === 'right') cell.classList.add('dg-align-right');
      if (col.align === 'center') cell.classList.add('dg-align-center');
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      if (col.editable) cell.classList.add('dg-cell-editable');
      if (col.cellClass) {
        var cls = typeof col.cellClass === 'function' ? col.cellClass(row[col.field], row) : col.cellClass;
        if (cls) cell.classList.add.apply(cell.classList, String(cls).split(/\s+/));
      }
      if (
        self._focusedCell &&
        self._focusedCell.r === pageIndex &&
        self._focusedCell.c === cIdx
      ) {
        cell.classList.add('dg-cell-focused');
      }
      self._applyCellLayout(cell, col.colId);

      if (col.checkboxSelection) {
        cell.classList.add('dg-checkbox-cell');
        var cb = el('input', 'dg-checkbox', cell);
        cb.type = 'checkbox';
        cb.checked = !!self._selection[id];
        cb.setAttribute('aria-label', 'Select row');
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function () {
          self._setRowSelected(row, cb.checked, true);
        });
        if (col.field === undefined) return; /* checkbox-only column */
      }

      self._renderCellValue(cell, col, row);
    });

    return rowEl;
  };

  /* 그룹 헤더 행: 일반 행과 같은 셀 레이아웃을 유지해 컬럼 폭·고정 컬럼과 정렬을 맞추고,
   * 첫 콘텐츠 컬럼에 셰브론+라벨+건수, aggFunc 컬럼에 집계값을 표시한다. */
  DataGrid.prototype._buildGroupRowEl = function (pageIndex, item) {
    var self = this;
    var rowEl = el('div', 'dg-row dg-group-row');
    rowEl.setAttribute('role', 'row');
    rowEl.setAttribute('aria-expanded', item.expanded ? 'true' : 'false');
    rowEl.style.top = pageIndex * this._rowHeight + 'px';
    rowEl.dataset.rowIndex = pageIndex;

    var cols = this._visibleColumns();
    var labelColId = null;
    for (var i = 0; i < cols.length; i++) {
      if (!cols[i].checkboxSelection) { labelColId = cols[i].colId; break; }
    }

    cols.forEach(function (col, cIdx) {
      var cell = el('div', 'dg-cell', rowEl);
      cell.setAttribute('role', 'gridcell');
      cell.dataset.colId = col.colId;
      cell.dataset.colIndex = cIdx;
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._applyCellLayout(cell, col.colId);

      if (col.colId === labelColId) {
        cell.classList.add('dg-group-cell');
        if (item.level > 0) {
          var indent = el('span', 'dg-group-indent', cell);
          indent.style.width = 'calc(var(--dg-group-indent) * ' + item.level + ')';
        }
        var chevron = el('span', 'dg-group-chevron' + (item.expanded ? ' dg-expanded' : ''), cell);
        chevron.innerHTML = CHEVRON_SVG;
        var label = el('span', 'dg-group-label', cell);
        label.textContent =
          item.value === null || item.value === undefined || item.value === ''
            ? '(Blanks)'
            : String(item.value);
        var count = el('span', 'dg-group-count', cell);
        count.textContent = '(' + item.leafCount.toLocaleString() + ')';
        return;
      }

      if (col.aggFunc && col.field && item.agg[col.field] !== null && item.agg[col.field] !== undefined) {
        if (col.align === 'right') cell.classList.add('dg-align-right');
        if (col.align === 'center') cell.classList.add('dg-align-center');
        cell.classList.add('dg-cell-agg');
        var holder = el('span', 'dg-cell-value', cell);
        holder.textContent = self._formatAggValue(col, item.agg[col.field]);
      }
    });

    return rowEl;
  };

  DataGrid.prototype._formatAggValue = function (col, value) {
    if (value === null || value === undefined) return '';
    if (col.valueFormatter && col.aggFunc !== 'count') {
      try { return String(col.valueFormatter(value, null)); }
      catch (e) { /* 집계 행에는 row가 없으므로 실패 시 원시 값으로 폴백 */ }
    }
    if (typeof value === 'number' && !Number.isInteger(value)) {
      value = Math.round(value * 100) / 100;
    }
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  };

  DataGrid.prototype._renderCellValue = function (cell, col, row) {
    var value = col.field !== undefined ? row[col.field] : undefined;
    var formatted = value;
    if (col.valueFormatter) {
      try { formatted = col.valueFormatter(value, row); }
      catch (e) { console.error('[DataGrid] valueFormatter failed for "' + col.field + '":', e); }
    }
    var holder = el('span', 'dg-cell-value', cell);

    if (col.cellRenderer) {
      try {
        var out = col.cellRenderer({ value: value, formatted: formatted, data: row, colDef: col });
        if (out instanceof (global.Node || Object)) holder.appendChild(out);
        else if (out !== undefined && out !== null) holder.innerHTML = out;
        return;
      } catch (e) {
        console.error('[DataGrid] cellRenderer failed for "' + col.field + '":', e);
      }
    }
    holder.textContent = formatted === null || formatted === undefined ? '' : String(formatted);
  };

  /* ---- sorting ---- */

  DataGrid.prototype._toggleSort = function (col, additive) {
    if (!col.field) return;
    var existing = this._sortModel.find(function (s) { return s.field === col.field; });
    var next;
    if (!existing) next = 'asc';
    else if (existing.dir === 'asc') next = 'desc';
    else next = null;

    if (!additive) this._sortModel = [];
    else this._sortModel = this._sortModel.filter(function (s) { return s.field !== col.field; });
    if (next) this._sortModel.push({ field: col.field, dir: next });

    this.refresh();
    this._emitter.emit('sortChanged', { sortModel: this._sortModel.slice() });
  };

  DataGrid.prototype.setSortModel = function (model) {
    this._sortModel = (model || []).slice();
    this.refresh();
    this._emitter.emit('sortChanged', { sortModel: this._sortModel.slice() });
  };

  DataGrid.prototype.getSortModel = function () { return this._sortModel.slice(); };

  /* ---- filtering ---- */

  DataGrid.prototype._openFilterMenu = function (col, headerCell) {
    var self = this;
    this._closeMenu();

    var menu = el('div', 'dg-menu');
    menu.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    var title = el('div', 'dg-menu-title', menu);
    title.textContent = col.headerName;

    var current = this._filterModel[col.field] || {};
    var getModel;

    if (col.filter === 'set') {
      var values = this._uniqueFieldValues(col.field);
      var active = {};
      (current.values || values).forEach(function (v) { active[v] = true; });

      var list = el('div', 'dg-menu-set-list', menu);
      var itemCbs = [];
      values.forEach(function (v) {
        var item = el('label', 'dg-menu-set-item', list);
        var cb = el('input', 'dg-checkbox', item);
        cb.type = 'checkbox';
        cb.checked = !!active[v];
        cb.dataset.value = v;
        itemCbs.push(cb);
        var span = el('span', null, item);
        span.textContent = v === '' ? '(Blanks)' : v;
      });
      getModel = function () {
        var checked = itemCbs.filter(function (cb) { return cb.checked; })
          .map(function (cb) { return cb.dataset.value; });
        if (checked.length === values.length) return null; /* all = no filter */
        return { type: 'set', values: checked };
      };
    } else if (col.filter === 'number') {
      var opSel = el('select', null, menu);
      [
        ['equals', 'Equals'], ['notEqual', 'Not equal'],
        ['lessThan', 'Less than'], ['lessThanOrEqual', 'Less than or equal'],
        ['greaterThan', 'Greater than'], ['greaterThanOrEqual', 'Greater than or equal'],
        ['inRange', 'In range'],
      ].forEach(function (o) {
        var opt = el('option', null, opSel);
        opt.value = o[0]; opt.textContent = o[1];
      });
      opSel.value = current.op || 'equals';
      var input = el('input', null, menu);
      input.type = 'number';
      input.placeholder = 'Filter…';
      input.value = current.value !== undefined ? current.value : '';
      var inputTo = el('input', null, menu);
      inputTo.type = 'number';
      inputTo.placeholder = 'To…';
      inputTo.value = current.valueTo !== undefined ? current.valueTo : '';
      var syncRange = function () { inputTo.style.display = opSel.value === 'inRange' ? '' : 'none'; };
      opSel.addEventListener('change', syncRange);
      syncRange();
      getModel = function () {
        if (input.value === '') return null;
        return { type: 'number', op: opSel.value, value: input.value, valueTo: inputTo.value };
      };
    } else {
      var opSel2 = el('select', null, menu);
      [
        ['contains', 'Contains'], ['notContains', 'Does not contain'],
        ['equals', 'Equals'], ['notEqual', 'Not equal'],
        ['startsWith', 'Starts with'], ['endsWith', 'Ends with'],
      ].forEach(function (o) {
        var opt = el('option', null, opSel2);
        opt.value = o[0]; opt.textContent = o[1];
      });
      opSel2.value = current.op || 'contains';
      var input2 = el('input', null, menu);
      input2.type = 'text';
      input2.placeholder = 'Filter…';
      input2.value = current.value !== undefined ? current.value : '';
      getModel = function () {
        if (input2.value === '') return null;
        return { type: 'text', op: opSel2.value, value: input2.value };
      };
    }

    var actions = el('div', 'dg-menu-actions', menu);
    var clearBtn = el('button', 'dg-btn', actions);
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', function () {
      self.applyColumnFilter(col.field, null);
      self._closeMenu();
    });
    var applyBtn = el('button', 'dg-btn dg-btn-primary', actions);
    applyBtn.type = 'button';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', function () {
      self.applyColumnFilter(col.field, getModel());
      self._closeMenu();
    });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyBtn.click();
      if (e.key === 'Escape') self._closeMenu();
    });

    /* 메뉴는 .dg-root 안에 두어야 --dg-* 토큰과 다크 테마를 상속받는다.
     * (position:fixed이므로 위치는 뷰포트 기준 그대로 동작) */
    this._rootEl.appendChild(menu);
    var rect = headerCell.getBoundingClientRect();
    var menuW = menu.offsetWidth;
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.left = clamp(rect.left, 8, window.innerWidth - menuW - 8) + 'px';
    headerCell.classList.add('dg-menu-open');
    this._menuEl = menu;
    this._menuHeaderCell = headerCell;
    var focusable = menu.querySelector('input, select');
    if (focusable) focusable.focus();
  };

  DataGrid.prototype._closeMenu = function () {
    if (this._menuEl) {
      this._menuEl.parentNode && this._menuEl.parentNode.removeChild(this._menuEl);
      this._menuEl = null;
    }
    if (this._menuHeaderCell) {
      this._menuHeaderCell.classList.remove('dg-menu-open');
      this._menuHeaderCell = null;
    }
  };

  DataGrid.prototype.applyColumnFilter = function (field, model) {
    if (model) this._filterModel[field] = model;
    else delete this._filterModel[field];
    this._currentPage = 0;
    this.refresh();
    this._emitter.emit('filterChanged', { filterModel: this.getFilterModel() });
  };

  DataGrid.prototype.getFilterModel = function () {
    var out = {};
    for (var k in this._filterModel) out[k] = this._filterModel[k];
    return out;
  };

  DataGrid.prototype.clearFilters = function () {
    this._filterModel = {};
    this._quickFilter = '';
    this._currentPage = 0;
    this.refresh();
    this._emitter.emit('filterChanged', { filterModel: {} });
  };

  DataGrid.prototype.setQuickFilter = function (text) {
    this._quickFilter = text || '';
    this._currentPage = 0;
    this.refresh();
    this._emitter.emit('filterChanged', { filterModel: this.getFilterModel(), quickFilter: this._quickFilter });
  };

  /* ---- row grouping ---- */

  DataGrid.prototype.setGroupBy = function (fields) {
    this._groupBy = (fields || []).slice();
    this._groupToggled = {};
    this._groupDefaultExpanded = this.options.groupDefaultExpanded !== false;
    this._currentPage = 0;
    this._focusedCell = null;
    this.refresh();
    this._emitter.emit('groupChanged', { groupBy: this._groupBy.slice() });
  };

  DataGrid.prototype.getGroupBy = function () { return this._groupBy.slice(); };

  DataGrid.prototype.expandAllGroups = function () {
    this._groupDefaultExpanded = true;
    this._groupToggled = {};
    this.refresh();
  };

  DataGrid.prototype.collapseAllGroups = function () {
    this._groupDefaultExpanded = false;
    this._groupToggled = {};
    this._currentPage = 0;
    this.refresh();
  };

  DataGrid.prototype._toggleGroup = function (item) {
    var expanded = !item.expanded;
    this._groupToggled[item.path] = expanded;
    this.refresh();
    this._emitter.emit('groupToggled', {
      field: item.field,
      value: item.value,
      path: item.path,
      expanded: expanded,
    });
  };

  /* ---- grand total footer ---- */

  DataGrid.prototype._renderGrandTotal = function () {
    var self = this;
    this._footerRowEl.innerHTML = '';
    this._footerCells = {};
    var show = !!this.options.grandTotal && this._aggColumns.length > 0;
    this._footerEl.hidden = !show;
    if (!show) return;

    var rows = this._viewRows;
    var cols = this._visibleColumns();
    var labelColId = null;
    for (var i = 0; i < cols.length; i++) {
      if (!cols[i].checkboxSelection && !cols[i].aggFunc) { labelColId = cols[i].colId; break; }
    }

    cols.forEach(function (col) {
      var cell = el('div', 'dg-cell', self._footerRowEl);
      cell.dataset.colId = col.colId;
      if (col.pinned === 'left') cell.classList.add('dg-pinned-left');
      if (col.pinned === 'right') cell.classList.add('dg-pinned-right');
      self._applyCellLayout(cell, col.colId);
      self._footerCells[col.colId] = cell;

      if (col.colId === labelColId) {
        var label = el('span', 'dg-footer-label', cell);
        label.textContent = 'Total';
        var count = el('span', 'dg-group-count', cell);
        count.textContent = '(' + rows.length.toLocaleString() + ')';
        return;
      }
      if (col.aggFunc && col.field) {
        if (col.align === 'right') cell.classList.add('dg-align-right');
        if (col.align === 'center') cell.classList.add('dg-align-center');
        cell.classList.add('dg-cell-agg');
        var holder = el('span', 'dg-cell-value', cell);
        holder.textContent = self._formatAggValue(col, aggregateValues(rows, col.field, col.aggFunc));
      }
    });
    this._footerEl.scrollLeft = this._bodyEl.scrollLeft;
  };

  /* ---- selection ---- */

  DataGrid.prototype._setRowSelected = function (row, selected, emit) {
    var mode = this.options.rowSelection;
    if (!mode) return;
    var id = this._rowId(row);
    if (mode === 'single') this._selection = {};
    if (selected) this._selection[id] = row;
    else delete this._selection[id];
    this._syncSelectionDom();
    if (emit) this._emitSelection();
  };

  DataGrid.prototype._syncSelectionDom = function () {
    for (var idx in this._renderedRows) {
      var rowEl = this._renderedRows[idx];
      var selected = !!this._selection[rowEl.dataset.rowId];
      rowEl.classList.toggle('dg-row-selected', selected);
      var cb = rowEl.querySelector('.dg-checkbox-cell .dg-checkbox');
      if (cb) cb.checked = selected;
    }
    if (this._headerSelectAllEl) {
      var count = this.getSelectedRows().length;
      var total = this._viewRows.length;
      this._headerSelectAllEl.checked = count > 0 && count >= total && total > 0;
      this._headerSelectAllEl.indeterminate = count > 0 && count < total;
    }
  };

  DataGrid.prototype._emitSelection = function () {
    this._emitter.emit('selectionChanged', { selectedRows: this.getSelectedRows() });
  };

  DataGrid.prototype.getSelectedRows = function () {
    var out = [];
    for (var id in this._selection) out.push(this._selection[id]);
    return out;
  };

  DataGrid.prototype.selectAll = function () {
    if (this.options.rowSelection !== 'multiple') return;
    var self = this;
    this._viewRows.forEach(function (row) { self._selection[self._rowId(row)] = row; });
    this._syncSelectionDom();
    this._emitSelection();
  };

  DataGrid.prototype.deselectAll = function () {
    this._selection = {};
    this._syncSelectionDom();
    this._emitSelection();
  };

  /* ---- cell / row interaction ---- */

  DataGrid.prototype._cellFromEvent = function (e) {
    var cellEl = e.target.closest('.dg-cell');
    if (!cellEl || !this._canvasEl.contains(cellEl)) return null;
    var rowEl = cellEl.parentNode;
    var r = Number(rowEl.dataset.rowIndex);
    return {
      cellEl: cellEl,
      rowEl: rowEl,
      r: r,
      c: Number(cellEl.dataset.colIndex),
      row: this._pageRows[r],
      col: this._visibleColumns()[Number(cellEl.dataset.colIndex)],
    };
  };

  DataGrid.prototype._onCellClick = function (e) {
    var hit = this._cellFromEvent(e);
    if (!hit || !hit.row) return;

    if (hit.row.__group) {
      this._toggleGroup(hit.row);
      return;
    }

    this._setFocusedCell(hit.r, hit.c);

    var mode = this.options.rowSelection;
    if (mode && !e.target.closest('.dg-checkbox')) {
      var id = this._rowId(hit.row);
      if (mode === 'multiple' && e.shiftKey && this._lastClickedViewIndex !== -1) {
        var from = Math.min(this._lastClickedViewIndex, hit.r);
        var to = Math.max(this._lastClickedViewIndex, hit.r);
        if (!e.ctrlKey && !e.metaKey) this._selection = {};
        for (var i = from; i <= to; i++) {
          var row = this._pageRows[i];
          if (row && !row.__group) this._selection[this._rowId(row)] = row;
        }
        this._syncSelectionDom();
        this._emitSelection();
      } else if (mode === 'multiple' && (e.ctrlKey || e.metaKey)) {
        this._setRowSelected(hit.row, !this._selection[id], true);
        this._lastClickedViewIndex = hit.r;
      } else {
        var wasOnlySelected = this._selection[id] && this.getSelectedRows().length === 1;
        this._selection = {};
        if (!wasOnlySelected) this._selection[id] = hit.row;
        this._syncSelectionDom();
        this._emitSelection();
        this._lastClickedViewIndex = hit.r;
      }
    }

    this._emitter.emit('cellClicked', { data: hit.row, colDef: hit.col, value: hit.col && hit.col.field !== undefined ? hit.row[hit.col.field] : undefined });
    this._emitter.emit('rowClicked', { data: hit.row, rowIndex: hit.r });
  };

  DataGrid.prototype._onCellDblClick = function (e) {
    var hit = this._cellFromEvent(e);
    if (!hit || !hit.row || hit.row.__group) return;
    this._emitter.emit('rowDoubleClicked', { data: hit.row, rowIndex: hit.r });
    if (hit.col && hit.col.editable) this._startEdit(hit);
  };

  DataGrid.prototype._setFocusedCell = function (r, c) {
    var prev = this._rootEl.querySelector('.dg-cell-focused');
    if (prev) prev.classList.remove('dg-cell-focused');
    this._focusedCell = { r: r, c: c };
    var rowEl = this._renderedRows[r];
    if (rowEl) {
      var cell = rowEl.querySelector('[data-col-index="' + c + '"]');
      if (cell) cell.classList.add('dg-cell-focused');
    }
  };

  DataGrid.prototype._onKeyDown = function (e) {
    if (this._editing) return; /* editor handles its own keys */

    /* 클립보드: Ctrl/⌘+C 복사(선택 행 또는 포커스 셀), Ctrl/⌘+V 붙여넣기 */
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      var tsv = this._selectionTsv();
      if (tsv !== null) {
        this._writeClipboard(tsv);
        e.preventDefault();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      /* 1차 경로는 root의 paste 이벤트(_bindEvents). 브라우저가 비편집 요소에
       * paste를 발화하지 않는 경우를 위해 잠시 뒤 clipboard API로 폴백한다.
       * (_pasteCount 비교로 이중 붙여넣기를 방지) */
      var self = this;
      var seqBefore = this._pasteCount;
      if (this._focusedCell && navigator.clipboard && navigator.clipboard.readText) {
        setTimeout(function () {
          if (self._pasteCount !== seqBefore || self._destroyed) return;
          navigator.clipboard.readText()
            .then(function (text) { if (text) self.pasteTsv(text); })
            .catch(function () { /* 권한 거부 — 붙여넣기 불가 환경 */ });
        }, 80);
      }
      return;
    }

    if (!this._focusedCell) return;
    var r = this._focusedCell.r;
    var c = this._focusedCell.c;
    var maxR = this._pageRows.length - 1;
    var maxC = this._visibleColumns().length - 1;
    var handled = true;

    switch (e.key) {
      case 'ArrowUp': r = Math.max(0, r - 1); break;
      case 'ArrowDown': r = Math.min(maxR, r + 1); break;
      case 'ArrowLeft': c = Math.max(0, c - 1); break;
      case 'ArrowRight': c = Math.min(maxC, c + 1); break;
      case 'Enter': {
        var row = this._pageRows[r];
        if (row && row.__group) { this._toggleGroup(row); break; }
        var col = this._visibleColumns()[c];
        if (col && col.editable && row) {
          var rowEl = this._renderedRows[r];
          var cellEl = rowEl && rowEl.querySelector('[data-col-index="' + c + '"]');
          if (cellEl) this._startEdit({ cellEl: cellEl, r: r, c: c, row: row, col: col });
        }
        break;
      }
      case ' ': {
        var srow = this._pageRows[r];
        if (srow && !srow.__group && this.options.rowSelection) {
          this._setRowSelected(srow, !this._selection[this._rowId(srow)], true);
        }
        break;
      }
      default: handled = false;
    }

    if (handled) {
      e.preventDefault();
      if (r !== this._focusedCell.r || c !== this._focusedCell.c) {
        this._setFocusedCell(r, c);
        this._scrollRowIntoView(r);
      }
    }
  };

  DataGrid.prototype._scrollRowIntoView = function (r) {
    var top = r * this._rowHeight;
    var bottom = top + this._rowHeight;
    if (top < this._bodyEl.scrollTop) this._bodyEl.scrollTop = top;
    else if (bottom > this._bodyEl.scrollTop + this._bodyEl.clientHeight) {
      this._bodyEl.scrollTop = bottom - this._bodyEl.clientHeight;
    }
  };

  /* ---- editing ---- */

  DataGrid.prototype._startEdit = function (hit) {
    this._cancelEdit();
    var col = hit.col;
    var row = hit.row;
    var value = row[col.field];
    var cellEl = hit.cellEl;
    cellEl.innerHTML = '';

    var editorType = col.editor ||
      (col.dataType === 'number' || col.filter === 'number' ? 'number' : 'text');
    var input;
    if (editorType === 'select') {
      input = document.createElement('select');
      (col.editorOptions || []).forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        input.appendChild(opt);
      });
      input.value = value === null || value === undefined ? '' : String(value);
    } else {
      input = document.createElement('input');
      input.type = editorType === 'number' ? 'number' : 'text';
      input.value = value === null || value === undefined ? '' : String(value);
    }
    input.className = 'dg-cell-editor';
    cellEl.appendChild(input);
    input.focus();
    if (input.select) input.select();

    var self = this;
    var finished = false;
    var markInvalid = function (message) {
      input.classList.add('dg-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (message) input.title = message;
      input.focus();
    };
    var clearInvalid = function () {
      input.classList.remove('dg-invalid');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('title');
    };
    /* commit=true 커밋 시도: validator 실패 또는 beforeCellSave 취소면
     * 편집기를 닫지 않고 유지한다(사용자가 고치거나 Esc로 취소하도록). */
    var finish = function (commit) {
      if (finished) return;
      var newValue = input.value;
      var committed = false;
      if (commit) {
        if (editorType === 'number') {
          var n = Number(newValue);
          newValue = newValue === '' || isNaN(n) ? value : n;
        }
        if (newValue !== value) {
          if (col.validator) {
            var result;
            try { result = col.validator(newValue, row); }
            catch (e) {
              console.error('[DataGrid] validator failed for "' + col.field + '":', e);
              result = true; /* validator 자체 오류는 편집을 막지 않는다 */
            }
            var message = validationMessage(result);
            if (message) { markInvalid(message); return; }
          }
          var evt = { data: row, colDef: col, oldValue: value, newValue: newValue, cancel: false };
          self._emitter.emit('beforeCellSave', evt);
          if (evt.cancel) { markInvalid(); return; }
          clearInvalid();
          row[col.field] = evt.newValue;
          newValue = evt.newValue;
          committed = true;
          self._emitter.emit('cellValueChanged', {
            data: row, colDef: col, oldValue: value, newValue: evt.newValue,
          });
        }
      }
      finished = true;
      self._editing = null;
      /* re-render the cell in place */
      cellEl.innerHTML = '';
      self._renderCellValue(cellEl, col, row);
      self._emitter.emit('editingStopped', {
        data: row,
        colDef: col,
        oldValue: value,
        newValue: committed ? newValue : value,
        committed: committed,
      });
    };

    input.addEventListener('input', clearInvalid);
    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', function () { finish(true); });

    this._editing = { finish: finish, row: row, col: col };
    this._emitter.emit('editingStarted', { data: row, colDef: col, value: value });
  };

  DataGrid.prototype._cancelEdit = function () {
    if (this._editing) this._editing.finish(false);
  };

  /* ---- programmatic edit control ---- */

  /** 지정한 행/필드의 편집을 시작한다. 페이지 밖이면 해당 페이지로 이동 후 시작.
   *  편집 불가 컬럼·미표시 행이면 false를 반환한다. */
  DataGrid.prototype.startEdit = function (row, field) {
    var col = this._visibleColumns().find(function (c) { return c.field === field; });
    if (!col || !col.editable || !row) return false;

    var displayIndex = this._displayRows.indexOf(row);
    if (displayIndex === -1) return false;

    if (this._pagination) {
      var page = Math.floor(displayIndex / this._pageSize);
      if (page !== this._currentPage) this.setPage(page);
    }
    var pageIndex = this._pageRows.indexOf(row);
    if (pageIndex === -1) return false;

    this._scrollRowIntoView(pageIndex);
    this._renderVisibleRows();
    var rowEl = this._renderedRows[pageIndex];
    var cellEl = rowEl && rowEl.querySelector('[data-col-id="' + col.colId + '"]');
    if (!cellEl) return false;

    var cIdx = Number(cellEl.dataset.colIndex);
    this._setFocusedCell(pageIndex, cIdx);
    this._startEdit({ cellEl: cellEl, r: pageIndex, c: cIdx, row: row, col: col });
    return true;
  };

  /** 진행 중인 편집을 종료한다. commit=false면 취소(기본 커밋). */
  DataGrid.prototype.stopEdit = function (commit) {
    if (this._editing) this._editing.finish(commit !== false);
  };

  DataGrid.prototype.isEditing = function () { return !!this._editing; };

  /* ---- clipboard (엑셀 호환 TSV) ---- */

  /** 선택 행(뷰 순서) 또는 포커스 셀을 TSV로 만든다. 대상이 없으면 null. */
  DataGrid.prototype._selectionTsv = function () {
    var self = this;
    var cols = this._visibleColumns().filter(function (c) {
      return c.field !== undefined && !c.suppressCopy;
    });
    if (cols.length === 0) return null;

    var rows = this._viewRows.filter(function (r) { return self._selection[self._rowId(r)]; });
    if (rows.length > 0) return buildTsv(rows, cols);

    if (this._focusedCell) {
      var row = this._pageRows[this._focusedCell.r];
      var col = this._visibleColumns()[this._focusedCell.c];
      if (row && !row.__group && col && col.field !== undefined && !col.suppressCopy) {
        return buildTsv([row], [col]);
      }
    }
    return null;
  };

  DataGrid.prototype._writeClipboard = function (text) {
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* 클립보드 접근 불가 환경 */ }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  };

  /** 선택 행(없으면 포커스 셀)을 TSV로 클립보드에 복사하고 그 문자열을 반환한다. */
  DataGrid.prototype.copy = function () {
    var tsv = this._selectionTsv();
    if (tsv !== null) this._writeClipboard(tsv);
    return tsv;
  };

  /**
   * 포커스 셀을 시작점으로 TSV 텍스트를 붙여넣는다. 편집 가능한 셀에만 쓰며
   * validator·beforeCellSave를 통과한 값만 반영한다. 갱신된 셀 수를 반환.
   */
  DataGrid.prototype.pasteTsv = function (text) {
    if (!text || !this._focusedCell) return 0;
    var self = this;
    var matrix = parseTsv(String(text));
    var cols = this._visibleColumns();
    var startR = this._focusedCell.r;
    var startC = this._focusedCell.c;
    var updated = 0;

    matrix.forEach(function (cells, i) {
      var row = self._pageRows[startR + i];
      if (!row || row.__group) return;
      cells.forEach(function (raw, j) {
        var col = cols[startC + j];
        if (!col || !col.editable || col.field === undefined) return;
        var value = raw;
        var editorType = col.editor ||
          (col.dataType === 'number' || col.filter === 'number' ? 'number' : 'text');
        if (editorType === 'number') {
          var n = Number(value);
          if (value === '' || isNaN(n)) return;
          value = n;
        }
        var oldValue = row[col.field];
        if (value === oldValue) return;
        if (col.validator) {
          var result;
          try { result = col.validator(value, row); }
          catch (e) {
            console.error('[DataGrid] validator failed for "' + col.field + '":', e);
            result = true;
          }
          if (validationMessage(result)) return;
        }
        var evt = { data: row, colDef: col, oldValue: oldValue, newValue: value, cancel: false };
        self._emitter.emit('beforeCellSave', evt);
        if (evt.cancel) return;
        row[col.field] = evt.newValue;
        updated++;
        self._emitter.emit('cellValueChanged', {
          data: row, colDef: col, oldValue: oldValue, newValue: evt.newValue,
        });
      });
    });

    if (updated > 0) this.refresh();
    return updated;
  };

  /* ---- column resize ---- */

  DataGrid.prototype._bindResizer = function (resizer, col) {
    var self = this;
    resizer.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      resizer.classList.add('dg-resizing');
      var startX = e.clientX;
      var startW = self._computedWidths[col.colId] || col.width;
      var onMove = function (me) {
        self._colWidths[col.colId] = Math.max(col.minWidth, startW + (me.clientX - startX));
        self._layoutColumns();
      };
      var onUp = function () {
        resizer.classList.remove('dg-resizing');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        self._emitter.emit('columnResized', { colId: col.colId, width: self._colWidths[col.colId] });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    resizer.addEventListener('dblclick', function (e) {
      e.stopPropagation();
      self.autoSizeColumn(col.colId);
    });
  };

  DataGrid.prototype.autoSizeColumn = function (colId) {
    var col = this._columns.find(function (c) { return c.colId === colId; });
    if (!col || !col.field) return;
    var canvas = this._measureCanvas || (this._measureCanvas = document.createElement('canvas'));
    var ctx = canvas.getContext('2d');
    var style = getComputedStyle(this._rootEl);
    ctx.font = '600 ' + style.fontSize + ' ' + style.fontFamily;
    var max = ctx.measureText(col.headerName).width + 60;
    ctx.font = style.fontSize + ' ' + style.fontFamily;
    var sample = this._viewRows.slice(0, 200);
    for (var i = 0; i < sample.length; i++) {
      var v = sample[i][col.field];
      if (col.valueFormatter) v = col.valueFormatter(v, sample[i]);
      if (v === null || v === undefined) continue;
      max = Math.max(max, ctx.measureText(String(v)).width + 34);
    }
    this._colWidths[colId] = Math.ceil(Math.max(col.minWidth, Math.min(max, 500)));
    this._layoutColumns();
  };

  /* ---- column reorder (drag header) ---- */

  DataGrid.prototype._bindReorder = function (cell, col) {
    var self = this;
    cell.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('.dg-header-resizer') || e.target.closest('.dg-header-menu-btn') || e.target.closest('.dg-checkbox')) return;

      var startX = e.clientX;
      var dragging = false;
      var indicator = null;
      var targetIndex = -1;

      var headerCells = function () {
        return Array.prototype.slice
          .call(self._headerRowEl.children)
          .filter(function (c) { return !c.classList.contains('dg-pinned-left') && !c.classList.contains('dg-pinned-right'); });
      };

      var onMove = function (me) {
        if (!dragging) {
          if (Math.abs(me.clientX - startX) < 6) return;
          dragging = true;
          cell.classList.add('dg-dragging');
          indicator = el('div', 'dg-drop-indicator', self._rootEl);
        }
        var cells = headerCells();
        targetIndex = -1;
        var rootRect = self._rootEl.getBoundingClientRect();
        for (var i = 0; i < cells.length; i++) {
          var r = cells[i].getBoundingClientRect();
          if (me.clientX < r.left + r.width / 2) {
            targetIndex = i;
            indicator.style.left = r.left - rootRect.left + 'px';
            break;
          }
        }
        if (targetIndex === -1) {
          targetIndex = cells.length;
          var lastR = cells[cells.length - 1].getBoundingClientRect();
          indicator.style.left = lastR.right - rootRect.left - 2 + 'px';
        }
      };

      var onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!dragging) return;
        cell.classList.remove('dg-dragging');
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);

        var unpinned = self._columns.filter(function (c) { return !c.hide && c.pinned !== 'left' && c.pinned !== 'right'; });
        var fromIdx = unpinned.indexOf(col);
        if (fromIdx === -1 || targetIndex === -1) return;
        var toIdx = targetIndex > fromIdx ? targetIndex - 1 : targetIndex;
        if (toIdx === fromIdx) return;

        /* reorder within the master column list */
        var master = self._columns;
        master.splice(master.indexOf(col), 1);
        var anchor = unpinned.filter(function (c) { return c !== col; })[toIdx];
        if (anchor) master.splice(master.indexOf(anchor), 0, col);
        else master.push(col);
        self.refresh();
        self._emitter.emit('columnMoved', { colId: col.colId, toIndex: toIdx });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  };

  /* ---- pagination ---- */

  DataGrid.prototype._renderPaging = function () {
    if (!this._pagingEl) return;
    var self = this;
    var info = this._pageInfo;
    this._pagingEl.innerHTML = '';

    var sizeWrap = el('div', 'dg-paging-page-size', this._pagingEl);
    var sizeLabel = el('span', null, sizeWrap);
    sizeLabel.textContent = 'Page size:';
    var sizeSel = el('select', null, sizeWrap);
    this._pageSizeOptions.forEach(function (s) {
      var opt = el('option', null, sizeSel);
      opt.value = s;
      opt.textContent = s;
    });
    sizeSel.value = this._pageSize;
    sizeSel.addEventListener('change', function () { self.setPageSize(Number(sizeSel.value)); });

    var summary = el('span', 'dg-paging-row-summary', this._pagingEl);
    summary.innerHTML =
      '<strong>' + info.firstRow.toLocaleString() + '</strong> to <strong>' +
      info.lastRow.toLocaleString() + '</strong> of <strong>' + info.total.toLocaleString() + '</strong>';

    var btns = el('div', 'dg-paging-buttons', this._pagingEl);
    var mkBtn = function (label, page, disabled, current, aria) {
      var b = el('button', 'dg-paging-btn' + (current ? ' dg-paging-current' : ''), btns);
      b.type = 'button';
      b.textContent = label;
      b.disabled = !!disabled;
      if (aria) b.setAttribute('aria-label', aria);
      if (!disabled && page !== null) b.addEventListener('click', function () { self.setPage(page); });
      return b;
    };

    mkBtn('«', 0, info.page === 0, false, 'First page');
    mkBtn('‹', info.page - 1, info.page === 0, false, 'Previous page');
    pageButtonModel(info.pageCount, info.page).forEach(function (p) {
      if (p === '…') mkBtn('…', null, true);
      else mkBtn(String(p + 1), p, false, p === info.page);
    });
    mkBtn('›', info.page + 1, info.page >= info.pageCount - 1, false, 'Next page');
    mkBtn('»', info.pageCount - 1, info.page >= info.pageCount - 1, false, 'Last page');
  };

  DataGrid.prototype.setPage = function (page) {
    if (!this._pagination) return;
    this._currentPage = page;
    this._focusedCell = null;
    this.refresh();
    this._bodyEl.scrollTop = 0;
    this._emitter.emit('paginationChanged', { page: this._currentPage, pageSize: this._pageSize });
  };

  DataGrid.prototype.setPageSize = function (size) {
    if (!this._pagination) return;
    var firstVisible = this._pageInfo ? this._pageInfo.start : 0;
    this._pageSize = size;
    this._currentPage = Math.floor(firstVisible / size);
    this.refresh();
    this._emitter.emit('paginationChanged', { page: this._currentPage, pageSize: this._pageSize });
  };

  /* ---- overlays ---- */

  DataGrid.prototype._updateOverlay = function () {
    if (this._loading) return; /* keep loading overlay */
    if (this._viewRows.length === 0) {
      this._overlayEl.innerHTML = '<div class="dg-overlay-panel">No rows to show</div>';
      this._overlayEl.hidden = false;
    } else {
      this._overlayEl.hidden = true;
    }
  };

  DataGrid.prototype.showLoadingOverlay = function () {
    this._loading = true;
    this._overlayEl.innerHTML = '<div class="dg-overlay-panel"><span class="dg-spinner"></span>Loading…</div>';
    this._overlayEl.hidden = false;
  };

  DataGrid.prototype.hideLoadingOverlay = function () {
    this._loading = false;
    this._updateOverlay();
  };

  /* ---- data API ---- */

  DataGrid.prototype.setRowData = function (rows) {
    this._rows = (rows || []).slice();
    this._selection = {};
    this._currentPage = 0;
    this._lastClickedViewIndex = -1;
    this._focusedCell = null;
    this.refresh();
  };

  DataGrid.prototype.getRowData = function () { return this._rows.slice(); };
  DataGrid.prototype.getDisplayedRows = function () { return this._viewRows.slice(); };
  DataGrid.prototype.getDisplayedRowCount = function () { return this._viewRows.length; };

  DataGrid.prototype.addRows = function (rows) {
    this._rows = this._rows.concat(rows);
    this.refresh();
  };
  DataGrid.prototype.addRow = function (row) { this.addRows([row]); };

  DataGrid.prototype.removeRows = function (rows) {
    var ids = {};
    var self = this;
    rows.forEach(function (r) { ids[self._rowId(r)] = true; });
    this._rows = this._rows.filter(function (r) { return !ids[self._rowId(r)]; });
    rows.forEach(function (r) { delete self._selection[self._rowId(r)]; });
    this.refresh();
  };

  DataGrid.prototype.removeSelectedRows = function () {
    this.removeRows(this.getSelectedRows());
    this._emitSelection();
  };

  DataGrid.prototype.updateRow = function (row, changes) {
    for (var k in changes) row[k] = changes[k];
    this.refresh();
  };

  DataGrid.prototype.setColumnVisible = function (colId, visible) {
    var col = this._columns.find(function (c) { return c.colId === colId || c.field === colId; });
    if (col) {
      col.hide = !visible;
      this.refresh();
    }
  };

  DataGrid.prototype.getColumns = function () { return this._columns.slice(); };

  DataGrid.prototype.setTheme = function (theme) {
    this._rootEl.classList.toggle('dg-theme-dark', theme === 'dark');
  };

  /* ---- grid state save / restore ---- */

  /**
   * 현재 그리드 상태(컬럼 순서·숨김·사용자 지정 폭, 정렬, 필터, 퀵 필터,
   * 그룹핑, 페이지)를 JSON 직렬화 가능한 객체로 반환한다.
   * localStorage 등에 저장했다가 setState()로 복원한다.
   */
  DataGrid.prototype.getState = function () {
    var self = this;
    var state = {
      columns: this._columns.map(function (c) {
        var entry = { colId: c.colId, hide: !!c.hide };
        if (self._colWidths[c.colId] !== undefined) entry.width = self._colWidths[c.colId];
        return entry;
      }),
      sortModel: this._sortModel.slice(),
      filterModel: this.getFilterModel(),
      quickFilter: this._quickFilter,
      groupBy: this._groupBy.slice(),
    };
    if (this._pagination) {
      state.pagination = { page: this._currentPage, pageSize: this._pageSize };
    }
    return state;
  };

  /**
   * getState()가 반환한 상태를 복원한다. 상태에 포함된 부분만 적용하며
   * (부분 상태 허용), 알 수 없는 colId는 무시한다. 마지막에 refresh() 1회.
   */
  DataGrid.prototype.setState = function (state) {
    if (!state) return;
    var self = this;
    if (state.columns) {
      var applied = applyColumnState(this._columns, state.columns);
      this._columns = applied.columns;
      this._columns.forEach(function (c) {
        if (applied.hidden[c.colId] !== undefined) c.hide = applied.hidden[c.colId];
      });
      for (var colId in applied.widths) this._colWidths[colId] = applied.widths[colId];
    }
    if (state.sortModel) this._sortModel = state.sortModel.slice();
    if (state.filterModel) {
      this._filterModel = {};
      for (var f in state.filterModel) this._filterModel[f] = state.filterModel[f];
    }
    if (state.quickFilter !== undefined) this._quickFilter = state.quickFilter || '';
    if (state.groupBy) {
      this._groupBy = state.groupBy.slice();
      this._groupToggled = {};
    }
    if (state.pagination && this._pagination) {
      if (state.pagination.pageSize) this._pageSize = state.pagination.pageSize;
      if (state.pagination.page !== undefined) this._currentPage = state.pagination.page;
    }
    this._focusedCell = null;
    this.refresh();
    this._emitter.emit('stateChanged', { state: this.getState() });
  };

  /**
   * 상태를 생성 시점 옵션 기준으로 되돌린다. 인자가 없으면 전체 리셋,
   * { filter, sort, group, columns, page } 중 true인 부분만 선택 리셋.
   */
  DataGrid.prototype.resetState = function (parts) {
    var all = !parts;
    parts = parts || {};
    if (all || parts.sort) {
      this._sortModel = this.options.sortModel ? this.options.sortModel.slice() : [];
    }
    if (all || parts.filter) {
      this._filterModel = {};
      this._quickFilter = '';
      this._currentPage = 0;
    }
    if (all || parts.group) {
      this._groupBy = (this.options.groupBy || []).slice();
      this._groupToggled = {};
      this._groupDefaultExpanded = this.options.groupDefaultExpanded !== false;
    }
    if (all || parts.columns) {
      this._columns = normalizeColumns(this.options.columnDefs, this.options.defaultColDef);
      this._colWidths = {};
    }
    if (all || parts.page) {
      this._currentPage = 0;
      this._pageSize = this.options.paginationPageSize || 20;
    }
    this._focusedCell = null;
    this.refresh();
    this._emitter.emit('stateChanged', { state: this.getState() });
  };

  /* ---- CSV export ---- */

  DataGrid.prototype.getCsv = function () {
    var cols = this._visibleColumns().filter(function (c) { return c.field !== undefined; });
    return buildCsv(this._viewRows, cols);
  };

  DataGrid.prototype.exportCsv = function (filename) {
    var csv = this.getCsv();
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  /* ---- teardown ---- */

  DataGrid.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    this._closeMenu();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._docListeners.forEach(function (l) { document.removeEventListener(l[0], l[1]); });
    if (this._rootEl.parentNode) this._rootEl.parentNode.removeChild(this._rootEl);
  };

  /* ---------------------------------------------------------------------------
   * Built-in cell renderers
   * ------------------------------------------------------------------------- */

  DataGrid.renderers = {
    /**
     * Colored status tag/badge. colorMap: { 'Paid': 'green', 'Overdue': 'red' }
     * Usage: cellRenderer: DataGrid.renderers.tag({ Paid: 'green' })
     */
    tag: function (colorMap) {
      return function (params) {
        var v = params.formatted === null || params.formatted === undefined ? '' : String(params.formatted);
        if (v === '') return '';
        var color = (colorMap && colorMap[String(params.value)]) || 'gray';
        return '<span class="dg-tag dg-tag-' + escapeHtml(color) + '">' + escapeHtml(v) + '</span>';
      };
    },
    /** ✓ / – for booleans */
    check: function () {
      return function (params) {
        return params.value
          ? '<span style="color:#0d8a44;font-weight:700">✓</span>'
          : '<span style="opacity:.35">–</span>';
      };
    },
    /** Simple progress bar for 0–100 values */
    progress: function () {
      return function (params) {
        var v = clamp(Number(params.value) || 0, 0, 100);
        return (
          '<div style="display:flex;align-items:center;gap:8px;width:100%">' +
          '<div style="flex:1;height:6px;border-radius:3px;background:var(--dg-chip-background-color);overflow:hidden">' +
          '<div style="width:' + v + '%;height:100%;border-radius:3px;background:var(--dg-accent-color)"></div></div>' +
          '<span style="font-size:12px;color:var(--dg-secondary-foreground-color)">' + v + '%</span></div>'
        );
      };
    },
  };

  /** 선언적 포맷 유틸 — column.format과 같은 패턴을 어디서나 사용. */
  DataGrid.format = formatValue;

  DataGrid.version = '1.0.0';

  /* Internals exposed for headless unit tests (not part of the public API). */
  DataGrid._test = {
    defaultComparator: defaultComparator,
    typeComparator: typeComparator,
    formatNumber: formatNumber,
    formatDate: formatDate,
    formatValue: formatValue,
    sortRows: sortRows,
    buildFilterPredicate: buildFilterPredicate,
    filterRows: filterRows,
    quickFilterRows: quickFilterRows,
    buildFloatingFilterModel: buildFloatingFilterModel,
    validationMessage: validationMessage,
    buildTsv: buildTsv,
    parseTsv: parseTsv,
    aggregateValues: aggregateValues,
    buildGroupView: buildGroupView,
    paginate: paginate,
    pageButtonModel: pageButtonModel,
    csvEscape: csvEscape,
    buildCsv: buildCsv,
    normalizeColumns: normalizeColumns,
    applyColumnState: applyColumnState,
    escapeHtml: escapeHtml,
  };

  global.DataGrid = DataGrid;
})(typeof window !== 'undefined' ? window : globalThis);
