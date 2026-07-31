/* Shared lightweight syntax highlighter for the docs/demo pages.
 * Exposes window.Highlight = { escapeHtml, dedent, js, html }.
 * Output uses .hl-kw / .hl-str / .hl-num / .hl-com / .hl-fn classes (demo.css).
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 공통 들여쓰기 제거 + 앞뒤 빈 줄 정리 */
  function dedent(text) {
    var lines = String(text).replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
    var indent = Infinity;
    lines.forEach(function (l) {
      if (l.trim()) indent = Math.min(indent, l.match(/^\s*/)[0].length);
    });
    if (!isFinite(indent)) indent = 0;
    return lines.map(function (l) { return l.slice(indent); }).join('\n');
  }

  function highlightJs(code) {
    var out = '';
    var src = String(code);
    var token = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(var|let|const|function|return|new|if|else|for|while|typeof|true|false|null|undefined|this)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
    var last = 0, m;
    while ((m = token.exec(src))) {
      out += escapeHtml(src.slice(last, m.index));
      if (m[1]) out += '<span class="hl-com">' + escapeHtml(m[1]) + '</span>';
      else if (m[2]) out += '<span class="hl-str">' + escapeHtml(m[2]) + '</span>';
      else if (m[3]) out += '<span class="hl-kw">' + escapeHtml(m[3]) + '</span>';
      else if (m[4]) out += '<span class="hl-num">' + escapeHtml(m[4]) + '</span>';
      else if (m[5]) out += '<span class="hl-fn">' + escapeHtml(m[5]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + escapeHtml(src.slice(last));
  }

  function highlightHtml(code) {
    var out = '';
    var src = String(code);
    var re = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][^>]*>)/g;
    var last = 0, m;
    while ((m = re.exec(src))) {
      out += escapeHtml(src.slice(last, m.index));
      if (m[1]) {
        out += '<span class="hl-com">' + escapeHtml(m[1]) + '</span>';
      } else {
        out += escapeHtml(m[2])
          .replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-str">$1</span>')
          .replace(/^(&lt;\/?)([\w-]+)/, '$1<span class="hl-kw">$2</span>');
      }
      last = m.index + m[0].length;
    }
    return out + escapeHtml(src.slice(last));
  }

  global.Highlight = {
    escapeHtml: escapeHtml,
    dedent: dedent,
    js: highlightJs,
    html: highlightHtml,
  };
})(window);
