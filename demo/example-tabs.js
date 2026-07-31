/* Example / View Source 탭 컴포넌트 (Kendo 데모 스타일).
 *
 * 마크업 규칙:
 *   <div class="example-card">
 *     <div class="example-html">  ← 라이브 예제 마크업 (HTML 소스로도 표시됨)
 *       <div id="myGrid" class="grid-wrap-sm"></div>
 *     </div>
 *     <script type="text/x-example">
 *       // 이 코드가 그대로 실행되고, VIEW SOURCE 탭에도 그대로 표시됩니다.
 *       var grid = new DataGrid(document.getElementById('myGrid'), { ... });
 *     </script>
 *   </div>
 *
 * 페이지 하단에서 ExampleTabs.init() 호출.
 * 의존성: demo/highlight.js (window.Highlight)
 */
(function (global) {
  'use strict';

  function buildSourcePanel(htmlSource, jsSource) {
    var panel = document.createElement('div');
    panel.className = 'example-source-panel';
    panel.hidden = true;
    var html = '';
    if (htmlSource) {
      html +=
        '<div class="example-src-label">HTML</div>' +
        '<pre class="api-example"><button class="copy-btn" type="button">Copy</button><code>' +
        Highlight.html(htmlSource) + '</code></pre>';
    }
    if (jsSource) {
      html +=
        '<div class="example-src-label">JavaScript</div>' +
        '<pre class="api-example"><button class="copy-btn" type="button">Copy</button><code>' +
        Highlight.js(jsSource) + '</code></pre>';
    }
    panel.innerHTML = html;
    return panel;
  }

  function bindCopy(panel) {
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn');
      if (!btn) return;
      var code = btn.parentNode.querySelector('code').textContent;
      var done = function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1200);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(done);
      else {
        var ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      }
    });
  }

  function setup(card) {
    if (card.dataset.exInit) return;
    card.dataset.exInit = '1';

    var htmlEl = card.querySelector('.example-html');
    var srcScript = card.querySelector('script[type="text/x-example"]');
    /* 실행 전에 마크업 원본을 캡처해야 그리드 DOM이 섞이지 않습니다 */
    var htmlSource = htmlEl ? Highlight.dedent(htmlEl.innerHTML) : '';
    var jsSource = srcScript ? Highlight.dedent(srcScript.textContent) : '';

    var tabbar = document.createElement('div');
    tabbar.className = 'example-tabbar';
    tabbar.innerHTML =
      '<button type="button" class="example-tab active" data-tab="example">Example</button>' +
      '<button type="button" class="example-tab" data-tab="source">View Source</button>';
    card.insertBefore(tabbar, card.firstChild);

    var srcPanel = buildSourcePanel(htmlSource, jsSource);
    card.appendChild(srcPanel);
    bindCopy(srcPanel);

    tabbar.addEventListener('click', function (e) {
      var btn = e.target.closest('.example-tab');
      if (!btn) return;
      Array.prototype.forEach.call(tabbar.querySelectorAll('.example-tab'), function (t) {
        t.classList.toggle('active', t === btn);
      });
      var showSource = btn.dataset.tab === 'source';
      if (htmlEl) htmlEl.hidden = showSource;
      srcPanel.hidden = !showSource;
    });

    /* 표시된 소스를 그대로 실행 — 문서와 동작이 어긋날 수 없습니다 */
    if (srcScript) {
      try {
        new Function(srcScript.textContent)();
      } catch (err) {
        console.error('[ExampleTabs] 예제 실행 실패:', err);
        if (htmlEl) {
          var msg = document.createElement('div');
          msg.className = 'example-error';
          msg.textContent = '예제 실행 중 오류가 발생했습니다: ' + err.message;
          htmlEl.appendChild(msg);
        }
      }
    }
  }

  global.ExampleTabs = {
    init: function (root) {
      Array.prototype.forEach.call(
        (root || document).querySelectorAll('.example-card'),
        setup
      );
    },
  };
})(window);
