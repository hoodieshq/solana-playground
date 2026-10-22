/* ── The ribbon: one bar over every page, and the tools that live in it ───
   This is the working chrome of the project — the same 34px bar on the
   prototype and on the landing, on our builds and on the frozen ones — and
   it is written to be carried to the next project: nothing here knows this
   product, only a manifest of views and a manifest of blocks.

   What it does, on any page:
   · finds the ribbon the page was built with, or builds one (back to the
     portal, a picker for the versions of this kind of page, the menu of
     every view, and a nav for the tools);
   · folds the segmented switches a prototype page carries — state,
     viewport, role, ground — into dropdowns of the same shape as the
     version picker, so the controls stop eating the bar. The original
     buttons stay in the page, hidden, and keep their behaviour: a
     dropdown item presses the original;
   · keeps the tools from overflowing: chips go first, then the tools fold
     into one "Tools" menu;
   · ⌘. (Ctrl+. on Windows) hides the whole bar and remembers that;
   · on a landing page, the Builder (⌘B): reorder, hide and borrow blocks
     from any other landing version, kept per page;
   · in ?block= mode, the page becomes one block for a builder elsewhere.

   Configuration, on the script tag, all optional:
     data-views="/assets/views.json"    the groups of views
     data-blocks="/assets/blocks.json"  the blocks the builder can borrow
     data-home="/" data-home-label="Back to the portal"
     data-kind="prototype|landing"      the default is: a page that has a
                                        .ribbon is a prototype, else landing
   Exposes window.Studio = { show, builder, tool, fit }. Plain script. */
(function () {
  var me = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  /* studio.config.js first, the script tag second, the plain default last.
     A page that wants to differ from the rest of the product says so on its
     own tag; everything else is answered once, in the config. */
  var C = window.StudioConfig || {};
  var cfg = {
    name: C.name || 'Studio',
    views: me && me.getAttribute('data-views') || C.viewsUrl || '/assets/views.json',
    blocks: me && me.getAttribute('data-blocks') || C.blocksUrl || '/assets/blocks.json',
    home: me && me.getAttribute('data-home') || C.home || '/',
    homeLabel: me && me.getAttribute('data-home-label') || C.homeLabel || 'Back',
    kind: me && me.getAttribute('data-kind') || C.kind || ''
  };

  /* The chrome's own three colours, and the tints derived from them, put on
     the document as custom properties. Every panel in every tool refers to
     these rather than to a hex, so one edit in the config repaints the lot. */
  (function paint() {
    var col = C.colours || {};
    var a = col.accent || '#5B5BD6', k = col.ok || '#12A594', t = col.alt || '#E54D9B';
    var hex = /^#[0-9a-f]{6}$/i;
    /* an alpha suffix only works on a plain six-digit hex; anything else
       (a name, an rgb(), a var) keeps its own colour and loses the tint */
    var tint = function (c, s) { return hex.test(c) ? c + s : c; };
    var v = {
      '--studio-accent': a, '--studio-accent-08': tint(a, '14'), '--studio-accent-50': tint(a, '80'),
      '--studio-ok': k, '--studio-ok-08': tint(k, '14'), '--studio-ok-20': tint(k, '33'), '--studio-ok-53': tint(k, '88'),
      '--studio-alt': t
    };
    for (var p in v) document.documentElement.style.setProperty(p, v[p]);
  })();
  var q = new URLSearchParams(location.search);
  var root = document.documentElement;
  var FONT = "'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif";
  var MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var here = location.pathname.replace(/\/+$/, '') || '/';
  function same(a) { return (a.replace(/\/+$/, '') || '/') === here; }

  /* ── framed: this page inside the viewport frame of another ribbon ──── */
  if (q.get('studiovp') === '1') {
    var fcss = document.createElement('style');
    fcss.textContent = '.ribbon{display:none !important}.app{top:0 !important}html.studio-rib body{padding-top:0}';
    document.head.appendChild(fcss);
    /* a phone-sized frame gets the phone arrangement, where the page has one */
    var narrow = function () {
      var want = innerWidth < 700 ? 'mobile' : 'desktop', b = document.querySelector('.devsw [data-dev="' + want + '"]');
      if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(narrow, 60); }); else setTimeout(narrow, 60);
    addEventListener('resize', narrow);
    return;
  }

  /* ── block mode: this page as one block, for a builder elsewhere ────── */
  var only = q.get('block');
  if (only) {
    root.classList.add('studio-blockmode');
    var bcss = document.createElement('style');
    bcss.textContent = '.studio-blockmode .nav,.studio-blockmode header.nav,.studio-blockmode .navscrim,.studio-blockmode .mobmenu,' +
      '.studio-blockmode footer,.studio-blockmode .studio-hidden,.studio-blockmode .ribbon{display:none !important}' +
      '.studio-blockmode body{padding:0 !important;min-height:0 !important}' +
      '.studio-blockmode .hero{min-height:0 !important}';
    document.head.appendChild(bcss);
    var isolate = function () {
      var el = only === '__page__' ? document.body : only === 'hero' ? (document.querySelector('header.hero') || document.getElementById('hero')) : document.getElementById(only);
      if (!el) return;
      if (el !== document.body) {
        var node = el;
        while (node && node !== document.body) {
          var up = node.parentNode;
          [].forEach.call(up.children, function (sib) {
            if (sib !== node && !/^(SCRIPT|STYLE|LINK|CANVAS)$/.test(sib.tagName) && !sib.classList.contains('oricv') && !sib.classList.contains('ground'))
              sib.classList.add('studio-hidden');
          });
          node = up;
        }
      }
      /* the height it asks for. A block cut in vh (a 420vh scroll journey)
         grows with its frame and the frame with it, without end; so the
         builder passes its own viewport height, and a block taller than a
         screen and a half shows as one screen, its sticky scene at rest */
      var vh = +q.get('vh') || screen.height || 900;
      var report = function () {
        var h = el === document.body ? root.scrollHeight : Math.ceil(el.getBoundingClientRect().height);
        if (el !== document.body && h > vh * 1.6) h = vh;
        try { window.parent.postMessage({ studioBlock: only, height: Math.min(h, vh * 12) }, '*'); } catch (e) {}
      };
      report();
      if ('ResizeObserver' in window) new ResizeObserver(report).observe(el);
      setInterval(report, 1500);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', isolate); else isolate();
    return;
  }

  /* ── the look: the prototype's ribbon, written once more so a page that
        has no app.css gets the same bar ─────────────────────────────────── */
  var STYLE = [
    '.ribbon.studio-built{position:fixed;inset:0 0 auto 0;height:34px;z-index:1000;display:flex;align-items:center;gap:12px;padding:0 14px;background:#000;color:#8B8B93;font:500 11.5px/1 ' + FONT + ';letter-spacing:0;border-bottom:1px solid #1C1C20;box-sizing:border-box}',
    '.ribbon.studio-built *{box-sizing:border-box}.ribbon.studio-built b{color:#fff;font-weight:600}',
    '.ribbon.studio-built a,.ribbon.studio-built button{background:none;border:0;color:#8B8B93;cursor:pointer;font:500 11.5px/1 ' + FONT + ';padding:6px 9px;border-radius:5px;text-decoration:none;transition:color .16s,background .16s}',
    '.ribbon.studio-built a:hover,.ribbon.studio-built button:hover{color:#fff;background:#1A1A1E}',
    '.ribbon.studio-built button[aria-pressed="true"]{color:#08080A;background:#F4F4F5}',
    '.ribbon.studio-built nav{margin-left:auto;display:flex;align-items:center;gap:2px}',
    '.ribbon.studio-built .ribback{display:inline-flex;align-items:center;gap:6px;margin-right:4px}.ribbon.studio-built .ribback svg{width:12px;height:12px;flex:none}',
    '.ribbon.studio-built .wip{margin-left:6px;padding:1px 5px;border-radius:4px;font:500 8.5px/1.5 ' + MONO + ';letter-spacing:.09em;background:rgba(251,250,249,.09);color:#87838F;vertical-align:1px}',
    '.ribbon .verpick{position:relative;display:flex;align-items:center}',
    '.ribbon .verbtn{display:flex;align-items:center;gap:5px;height:24px;padding:0 7px}.ribbon .verbtn b{color:#fff;font-weight:600}',
    '.ribbon .verbtn svg{width:12px;height:12px;flex:none;opacity:.7;transition:transform .16s}.ribbon .verbtn[aria-expanded="true"] svg{transform:rotate(180deg)}',
    '.ribbon .verpop{position:absolute;left:0;top:30px;z-index:1001;min-width:236px;display:flex;flex-direction:column;padding:5px;background:#101013;border:1px solid #26262C;border-radius:8px;box-shadow:0 18px 40px -18px rgba(0,0,0,.8)}',
    '.ribbon .verpop[hidden]{display:none}',
    '.ribbon .veritem{display:flex;flex-direction:column;gap:1px;align-items:flex-start;padding:7px 9px;border-radius:5px;text-decoration:none}',
    '.ribbon .veritem .vt{font:600 11.5px/1.3 ' + FONT + ';color:#E8E8EC}.ribbon .veritem .vn{font:400 11px/1.35 ' + FONT + ';color:#77777F}',
    '.ribbon .veritem:hover{background:#1A1A1E}.ribbon .veritem.on{background:#17171B}.ribbon .veritem.on .vt{color:#fff}',
    '.ribbon .veritem.on .vt::after{content:" \\00b7 you are here";font-weight:400;color:#77777F}',
    '.ribbon .dots{position:relative;display:flex;align-items:center;margin-left:2px}',
    '.ribbon .dotsbtn{display:grid;place-items:center;width:24px;height:24px;padding:0}.ribbon .dotsbtn svg{fill:currentColor;stroke:none}.ribbon .dotsbtn[aria-expanded="true"]{background:#1A1A1E;color:#fff}',
    '.ribbon .dotspop{position:absolute;left:0;top:30px;z-index:1001;min-width:250px;display:flex;flex-direction:column;padding:5px;background:#101013;border:1px solid #26262C;border-radius:8px;box-shadow:0 18px 40px -18px rgba(0,0,0,.8)}',
    '.ribbon .dotspop[hidden]{display:none}',
    '.ribbon .dotsh{font:500 9.5px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#5E5E66;padding:7px 9px 6px}',
    '.ribbon .dotsitem{display:flex;flex-direction:column;gap:1px;align-items:flex-start;padding:7px 9px;border-radius:5px;text-decoration:none}',
    '.ribbon .dotsitem .dt{font:600 11.5px/1.3 ' + FONT + ';color:#E8E8EC}.ribbon .dotsitem .dn{font:400 11px/1.35 ' + FONT + ';color:#77777F}',
    '.ribbon .dotsitem:hover{background:#1A1A1E}.ribbon .dotsitem.on{background:#17171B}.ribbon .dotsitem.on .dt{color:#fff}',
    '.ribbon .dotsitem.on .dt::after{content:" \\00b7 you are here";font-weight:400;color:#77777F}',
    '.ribbon .dotspop{max-height:calc(100vh - 60px);overflow:auto;min-width:300px}',
    '.ribbon .dotsgrp{border-radius:6px;transition:background .15s}.ribbon .dotsgrp.over{background:#17171B;box-shadow:inset 0 0 0 1px var(--studio-accent)}',
    '.ribbon .dotsh i{font-style:normal;margin-left:6px;color:#3A3A42;letter-spacing:0;text-transform:none;font:500 10px/1 ' + FONT + '}',
    '.ribbon .dotsarch{display:flex;align-items:center;gap:6px;width:100%;background:none;border:0;cursor:pointer;text-align:left}.ribbon .dotsarch svg{width:11px;height:11px;margin-left:auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;transition:transform .2s}',
    '.ribbon .dotsgrp.arch .dotsarchin{display:none}.ribbon .dotsgrp.arch.open .dotsarchin{display:block}.ribbon .dotsgrp.arch.open .dotsarch svg{transform:rotate(180deg)}',
    '.ribbon .dotsempty{padding:8px 9px;font:400 11px/1.3 ' + FONT + ';color:#3A3A42;border:1px dashed #26262C;border-radius:5px;margin:0 4px 6px}',
    '.ribbon .dotsitem.dragging{opacity:.4}.ribbon .dotsitem{cursor:grab}',
    '.ribbon .dotsfoot{padding:8px 9px 5px;border-top:1px solid #1C1C20;margin-top:4px;font:400 10.5px/1.3 ' + FONT + ';color:#5E5E66}.ribbon .dotsfoot a{color:#8B8B93}',
    /* the annotation tool speaks through a toast the portal styles; a landing has no such styles */
    '#anntoast{position:fixed;left:16px;bottom:16px;z-index:1002;max-width:320px;background:#101013;color:#E8E8EC;border:1px solid #26262C;border-radius:8px;padding:10px 12px;font:12px/1.4 ' + FONT + ';opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none;box-shadow:0 18px 40px -18px rgba(0,0,0,.8)}',
    '#anntoast.on{opacity:1;transform:none}#anntoast b{display:block;font-weight:600;color:#fff}#anntoast span{color:#8B8B93}#anntoast.er b{color:#FF6B8A}',
    /* what the module adds to any ribbon, built or adopted */
    '.ribbon .ribback,.ribbon .verbtn,.ribbon .verbtn b{white-space:nowrap}',
    '.ribbon .rsel{position:relative;display:flex;align-items:center;margin-left:0}',
    '.ribbon .rsel .verbtn .k{color:#6E6E76;font-weight:500;margin-right:1px}',
    '.ribbon .rsel .verpop{min-width:150px}',
    '.ribbon .ropt{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border-radius:5px;color:#C4C4CA;font:500 11.5px/1.3 ' + FONT + ';text-align:left;white-space:nowrap}',
    '.ribbon .ropt:hover{background:#1A1A1E;color:#fff}.ribbon .ropt[aria-checked="true"]{background:#F4F4F5;color:#08080A}',
    '.ribbon .ropt[aria-checked="true"]:hover{background:#fff;color:#08080A}',
    '.ribbon .studio-folded{display:none !important}',
    /* the viewport: sizes in the dropdown, the page in a frame at that size */
    '.ribbon .rsep{height:1px;background:#26262C;margin:4px 2px}',
    '.ribbon .ropt i{font-style:normal;margin-left:auto;color:#5E5E66;font:500 10.5px/1 ' + MONO + '}.ribbon .ropt[aria-checked="true"] i{color:#4A4852}',
    '.ribbon .vpform{display:grid;grid-template-columns:1fr 14px 1fr auto;gap:6px;align-items:center;padding:6px 9px 8px}',
    '.ribbon .vpform input{width:100%;min-width:0;background:#0B0B0E;color:#E8E8EC;border:1px solid #26262C;border-radius:5px;font:500 11.5px/1 ' + FONT + ';padding:6px 7px;-moz-appearance:textfield}.ribbon .vpform input::-webkit-inner-spin-button{display:none}',
    '.ribbon .vpform span{color:#5E5E66;text-align:center}.ribbon .vpform button{background:#F4F4F5;color:#08080A;border:0;border-radius:5px;font:500 11.5px/1 ' + FONT + ';padding:7px 9px;cursor:pointer}',
    /* under the bar and under every tool panel: the frame is the page, not chrome */
    '.studio-vp{position:fixed;inset:34px 0 0 0;z-index:60;background:#141417;display:grid;place-items:center;overflow:hidden}',
    '.studio-vpbox{position:relative;background:#fff;box-shadow:0 40px 90px -30px rgba(0,0,0,.8),0 0 0 1px #26262C;border-radius:10px;overflow:hidden;transform-origin:center}',
    '.studio-vpbox iframe{display:block;width:100%;height:100%;border:0;background:#fff}',
    '.studio-vplbl{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);font:500 11px/1 ' + FONT + ';color:#8B8B93;white-space:nowrap}',
    'html.studio-vp-on .ribbon .rsel[data-for="devsw"] .verbtn b,html.studio-vp-on .ribbon .rsel[data-for="vp"] .verbtn b{color:var(--studio-ok)}',
    '.ribbon .hint{color:#5E5E66;font-weight:500;padding:6px 9px;white-space:nowrap}',
    '.ribbon .hint kbd{font:inherit;color:#8B8B93;border:1px solid #26262A;border-radius:4px;padding:1px 5px;margin:0 1px}',
    '.ribbon.tight .wip,.ribbon.tight .hint{display:none}',
    '.ribbon .toolsmenu{position:relative;display:none;align-items:center}.ribbon.folded .toolsmenu{display:flex}',
    '.ribbon .toolspop{position:absolute;right:0;top:30px;z-index:1001;min-width:200px;display:flex;flex-direction:column;gap:1px;padding:5px;background:#101013;border:1px solid #26262C;border-radius:8px;box-shadow:0 18px 40px -18px rgba(0,0,0,.8)}',
    '.ribbon .toolspop[hidden]{display:none}.ribbon .toolspop > *{width:100%;justify-content:flex-start;text-align:left;display:flex;align-items:center;padding:8px 9px}',
    '.ribbon .toolspop .wip{display:inline;margin-left:auto}',
    'html.studio-rib-off .ribbon{display:none !important}',
    '.ribshow{position:fixed;left:0;top:0;z-index:2147483000;display:none;align-items:center;justify-content:center;width:30px;height:24px;padding:0;border:0;border-radius:0 0 7px 0;background:#101013;color:#8B8B93;cursor:pointer;opacity:.28;transition:opacity .15s,color .15s}',
    '.ribshow svg{width:14px;height:14px;fill:currentColor}',
    '.ribshow:hover{opacity:1;color:#fff}',
    'html.studio-rib-off .ribshow{display:flex}',
    'html.studio-rib-off .app{top:0 !important}',
    /* the landing under the bar */
    'html.studio-rib body{padding-top:34px}html.studio-rib .nav,html.studio-rib header.nav{top:34px !important}html.studio-rib .mn__panel,html.studio-rib .navscrim{top:90px !important}',
    /* the builder */
    '.studiobld{position:fixed;top:34px;right:0;bottom:0;width:340px;z-index:999;background:#101013;color:#B4B0BE;border-left:1px solid #26262C;font:400 12.5px/1.45 ' + FONT + ';display:flex;flex-direction:column;box-shadow:-20px 0 50px -30px rgba(0,0,0,.8)}',
    '.studiobld[hidden]{display:none}.studiobld *{box-sizing:border-box}',
    '.studiobld h4{margin:0;padding:14px 14px 10px;font:600 12px/1 ' + FONT + ';color:#fff;display:flex;justify-content:space-between;align-items:center}',
    '.studiobld h4 span{font:500 9.5px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#5E5E66}',
    '.studiobld .list{flex:1;overflow:auto;padding:0 8px}',
    '.studiobld .row{display:grid;grid-template-columns:14px 84px 1fr auto;gap:8px;align-items:center;padding:6px 6px;border-radius:6px;border:1px solid transparent;cursor:grab}',
    '.studiobld .row:hover{background:#17171B}.studiobld .row.drag{opacity:.4}.studiobld .row.over{border-color:var(--studio-accent)}',
    '.studiobld .th{display:block;width:84px;height:48px;object-fit:cover;object-position:top;border-radius:4px;background:#1A1A1E;border:1px solid #26262C}',
    '.studiobld .row.hid .th{opacity:.35;filter:grayscale(1)}',
    '.studiobld .row .g{color:#3A3A42;font-size:14px;line-height:1}.studiobld .row .t{color:#E8E8EC;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.studiobld .row .t small{display:block;color:#77777F;font-weight:400;font-size:11px}',
    '.studiobld .row.hid .t{color:#5E5E66;text-decoration:line-through}',
    '.studiobld .ops{display:flex;gap:2px}.studiobld .ops button{background:none;border:0;color:#8B8B93;cursor:pointer;width:24px;height:24px;border-radius:5px;font:inherit;display:grid;place-items:center}',
    '.studiobld .ops button:hover{background:#26262C;color:#fff}',
    '.studiobld .foot{padding:10px 14px 14px;border-top:1px solid #26262C;display:flex;flex-wrap:wrap;gap:6px}',
    '.studiobld .foot button,.studiobld .foot select{background:#1A1A1E;border:1px solid #26262C;color:#E8E8EC;font:500 11.5px/1 ' + FONT + ';padding:7px 10px;border-radius:6px;cursor:pointer}',
    '.studiobld .foot button:hover{background:#26262C}.studiobld .foot .addbtn{flex:1 1 100%;text-align:left;background:#F4F4F5;color:#08080A;border-color:#F4F4F5}.studiobld .foot .addbtn:hover{background:#fff}',
    '.studiobld .foot .addbtn[aria-expanded="true"]{background:#1A1A1E;color:#E8E8EC;border-color:#26262C}',
    /* the gallery: every version's blocks, as pictures */
    '.studiobld .gal{border-top:1px solid #26262C;display:flex;flex-direction:column;max-height:52%;min-height:220px}.studiobld .gal[hidden]{display:none}',
    '.studiobld .galtabs{display:flex;gap:2px;padding:8px 8px 0;overflow-x:auto;scrollbar-width:none}.studiobld .galtabs button{flex:none;background:none;border:0;color:#8B8B93;font:500 11px/1 ' + FONT + ';padding:7px 9px;border-radius:5px;cursor:pointer;white-space:nowrap}',
    '.studiobld .galtabs button[aria-selected="true"]{background:#1A1A1E;color:#fff}',
    '.studiobld .galgrid{flex:1;overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px}',
    '.studiobld .galcard{background:none;border:1px solid #26262C;border-radius:6px;padding:0;overflow:hidden;cursor:pointer;text-align:left;color:#C4C4CA;font:500 11px/1.3 ' + FONT + ';display:flex;flex-direction:column}',
    '.studiobld .galcard:hover{border-color:var(--studio-accent);color:#fff}.studiobld .galcard img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;object-position:top;background:#1A1A1E}',
    '.studiobld .galcard span{display:block;padding:7px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.studio-imported{position:relative;background:transparent}',
    '.studio-imported iframe{display:block;width:100%;border:0;height:60vh;max-height:1200vh;background:transparent}',
    '.studio-imported .tag{position:absolute;top:8px;left:8px;z-index:3;font:500 10px/1 ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#fff;background:#0F0F13cc;padding:5px 8px;border-radius:5px;pointer-events:none}',
    '.studio-bld-on .studio-hidden{display:none !important}',
    /* a rearranged page: blocks that overlapped the one before them on
       purpose (a handover) stand on their own once the order is not theirs */
    'html.studio-custom body > section,html.studio-custom body > header.hero{margin-top:0 !important}'
  ].join('\n');
  var style = document.createElement('style'); style.textContent = STYLE; document.head.appendChild(style);

  /* ── the bar: adopt the page's, or build one ────────────────────────── */
  var rib = document.querySelector('.ribbon');
  /* What sort of page this is, which decides whether the block builder comes
     along and which versions the picker lists. The list is asked first, since
     it names each entry's kind outright; a page the list has never heard of
     falls back to the old guess, that a page carrying a bar of its own is the
     product and a bare one is a landing. */
  var kind = cfg.kind || (function () {
    var found = '';
    (C.views || []).forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (it.kind && same(it.href)) found = it.kind === 'landing' ? 'landing' : 'app';
      });
    });
    return found || (rib ? 'app' : 'landing');
  })();
  var CHEV = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var DOTS = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  if (!rib) {
    rib = document.createElement('div'); rib.className = 'ribbon studio-built';
    /* A way back to somewhere you already are is not a way back. On a
       deployment whose front door is this very page there is nowhere above
       it, so the link stands down rather than pointing at itself. */
    rib.innerHTML = (same(cfg.home) ? '' : '<a class="ribback" href="' + esc(cfg.home) + '"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' + esc(cfg.homeLabel) + '</a>') +
      '<div class="verpick" data-studio-pick data-studio-views><button class="verbtn" aria-haspopup="true" aria-expanded="false"><b>' + (kind === 'landing' ? 'Landing' : 'Version') + '</b>' + CHEV + '</button><div class="verpop" role="menu" hidden></div></div>' +
      '<nav></nav>';
    document.body.appendChild(rib);
    /* The offset is for a document that flows: a landing is pushed down so the
       bar does not sit on its header. A product sizes itself to the viewport —
       100vh, 100dvh, a fixed shell — and pushing it down does not shrink it, it
       just posts the bottom 34px off the screen, which is where a status bar or
       a stage rail usually lives. Over those the bar floats, and ⌘. takes it
       away entirely. */
    if (kind === 'landing') root.classList.add('studio-rib');
  }
  var nav = rib.querySelector('nav');
  if (!nav) { nav = document.createElement('nav'); rib.appendChild(nav); }

  /* the popovers this module owns: one open at a time, Escape and outside click close */
  function closePops() {
    [].forEach.call(rib.querySelectorAll('[data-studio-pick]'), function (p) {
      var pop = p.querySelector('.verpop,.dotspop,.toolspop'), b = p.querySelector('button');
      if (pop) pop.hidden = true; if (b) b.setAttribute('aria-expanded', 'false');
    });
    /* the page's own two menus, bound by its app.js, close with ours */
    ['ver', 'dots'].forEach(function (k) {
      var pop = document.getElementById(k + 'pop'), b = document.getElementById(k + 'btn');
      if (pop && !pop.closest('[data-studio-pick]')) { pop.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
    });
  }
  /* and ours close when one of theirs opens */
  rib.addEventListener('click', function (e) {
    var t = e.target.closest('#verbtn,#dotsbtn');
    if (t && !t.closest('[data-studio-pick]')) [].forEach.call(rib.querySelectorAll('[data-studio-pick]'), function (p) {
      var pop = p.querySelector('.verpop,.dotspop,.toolspop'), b = p.querySelector('button');
      if (pop) pop.hidden = true; if (b) b.setAttribute('aria-expanded', 'false');
    });
  }, true);
  function bindPick(p) {
    var b = p.querySelector('button'), pop = p.querySelector('.verpop,.dotspop,.toolspop');
    b.addEventListener('click', function (e) {
      e.stopPropagation(); var open = pop.hidden; closePops();
      if (open && p.__before) p.__before();
      pop.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  [].forEach.call(rib.querySelectorAll('[data-studio-pick]'), bindPick);
  document.addEventListener('click', function (e) { if (!rib.contains(e.target)) closePops(); });

  /* the menu of every view. Three sections — the one current prototype, the
     one latest landing, and the archive of everything before, by date — and
     a version can be dragged from one to another; that move is this
     browser's own memory, laid over the list the build wrote. */
  var dots = rib.querySelector('.dots');
  if (!dots) {
    dots = document.createElement('div'); dots.className = 'dots'; dots.setAttribute('data-studio-pick', '');
    dots.innerHTML = '<button class="dotsbtn" aria-haspopup="menu" aria-expanded="false" aria-label="Choose what to view" title="Choose what to view">' + DOTS + '</button><div class="dotspop" role="menu" hidden></div>';
    var after = rib.querySelector('.verpick') || rib.querySelector('.ribback');
    if (after && after.nextSibling) rib.insertBefore(dots, after.nextSibling); else rib.appendChild(dots);
    bindPick(dots);
  }
  var ARCH_KEY = 'studio-views-archive', ARCH_OPEN = 'studio-views-archive-open', VIEWS = null;
  var moves = {}; try { moves = JSON.parse(localStorage.getItem(ARCH_KEY)) || {}; } catch (e) { moves = {}; }
  /* Which section a version belongs to. The config says so per entry, which
     is the honest answer; the route is only guessed at when it does not. */
  var KINDS = {};
  (C.views || []).forEach(function (g) {
    (g.items || []).forEach(function (it) { if (it.kind) KINDS[it.href] = it.kind === 'landing' ? 'Landing' : 'App'; });
  });
  function kindOf(href) {
    return KINDS[href] || (/landing|^\/lp/.test(href) ? 'Landing' : 'App');
  }
  /* the list as this browser has arranged it: items moved into the archive, or back out of it */
  /* The sections are whatever the list declares, in its own order, with an
     Archive at the end whether or not one was written. Nothing here knows the
     name of a section in advance, so renaming App to Product, or adding a
     third kind, is an edit to the config and to nothing else. */
  function sectionNames() {
    var names = (VIEWS || []).map(function (g) { return g.group; });
    if (names.indexOf('Archive') < 0) names.push('Archive');
    return names;
  }
  function arranged() {
    var groups = {}, names = sectionNames();
    names.forEach(function (n) { groups[n] = []; });
    (VIEWS || []).forEach(function (g) { g.items.forEach(function (it) {
      var home = groups[g.group] ? g.group : kindOf(it.href), to = moves[it.href];
      var dest = to === 'archive' ? 'Archive' : to === 'home' ? home : home;
      if (!groups[dest]) groups[dest] = [];
      groups[dest].push(it);
    }); });
    return groups;
  }
  function viewItem(it) {
    var cur = same(it.href);
    return '<a class="dotsitem' + (cur ? ' on' : '') + '" href="' + esc(it.href) + '" role="menuitem" draggable="true" data-href="' + esc(it.href) + '"' + (cur ? ' aria-current="true"' : '') + '><span class="dt">' + esc(it.label) + '</span><span class="dn">' + esc(it.note || '') + '</span></a>';
  }
  function renderDots() {
    var pop = dots.querySelector('.dotspop'); if (!pop || !VIEWS) return;
    var g = arranged(), openArch = localStorage.getItem(ARCH_OPEN) === '1';
    var note = {};                       /* the word under a section's name */
    (VIEWS || []).forEach(function (x, i) { note[x.group] = x.note || (i === 0 ? 'current' : 'latest'); });
    pop.innerHTML = sectionNames().map(function (name) {
      var items = g[name] || [];
      if (name === 'Archive') {
        return '<div class="dotsgrp arch' + (openArch ? ' open' : '') + '" data-group="Archive">' +
          '<button class="dotsh dotsarch" type="button" aria-expanded="' + (openArch ? 'true' : 'false') + '">Archive<i>' + items.length + '</i>' + CHEV + '</button>' +
          '<div class="dotsarchin">' + items.map(viewItem).join('') + '</div></div>';
      }
      return '<div class="dotsgrp" data-group="' + esc(name) + '"><div class="dotsh">' + esc(name) + '<i>' + esc(note[name] || '') + '</i></div>' +
        (items.map(viewItem).join('') || '<div class="dotsempty">Drop a version here</div>') + '</div>';
    }).join('') +
      '<div class="dotsfoot">Drag a version between the sections · <a href="#" data-dots="reset">as built</a></div>';
  }
  dots.addEventListener('click', function (e) {
    var arch = e.target.closest('.dotsarch');
    if (arch) { e.preventDefault(); e.stopPropagation(); var grp = arch.closest('.dotsgrp'); var on = !grp.classList.contains('open'); grp.classList.toggle('open', on); arch.setAttribute('aria-expanded', on ? 'true' : 'false'); localStorage.setItem(ARCH_OPEN, on ? '1' : '0'); return; }
    var r = e.target.closest('[data-dots="reset"]'); if (r) { e.preventDefault(); e.stopPropagation(); moves = {}; localStorage.removeItem(ARCH_KEY); renderDots(); }
  });
  /* dragging a version onto a section moves it there */
  var dragHref = null;
  dots.addEventListener('dragstart', function (e) { var a = e.target.closest('.dotsitem'); if (!a) return; dragHref = a.getAttribute('data-href'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragHref); } catch (err) {} a.classList.add('dragging'); });
  dots.addEventListener('dragend', function () { dragHref = null; [].forEach.call(dots.querySelectorAll('.dotsgrp.over'), function (x) { x.classList.remove('over'); }); [].forEach.call(dots.querySelectorAll('.dragging'), function (x) { x.classList.remove('dragging'); }); });
  dots.addEventListener('dragover', function (e) { var grp = e.target.closest('.dotsgrp'); if (!grp || !dragHref) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; [].forEach.call(dots.querySelectorAll('.dotsgrp.over'), function (x) { x.classList.remove('over'); }); grp.classList.add('over'); });
  dots.addEventListener('drop', function (e) {
    var grp = e.target.closest('.dotsgrp'); if (!grp || !dragHref) return; e.preventDefault(); e.stopPropagation();
    var dest = grp.getAttribute('data-group');
    if (dest === 'Archive') moves[dragHref] = 'archive';
    else if (dest === kindOf(dragHref)) moves[dragHref] = 'home';
    else { dragHref = null; renderDots(); return; }                  /* a landing does not become a prototype */
    localStorage.setItem(ARCH_KEY, JSON.stringify(moves)); dragHref = null; renderDots();
  });
  /* a click that follows a drag must not navigate */
  dots.addEventListener('click', function (e) { if (e.target.closest('.dotsitem.dragging')) e.preventDefault(); }, true);

  /* The versions come from the config when it carries them, and from a file
     when a build step writes one. The config is the simpler half of the deal
     and the one a new project starts with; the fetch is there for a product
     that generates its list. */
  var haveViews = C.views && C.views.length
    ? Promise.resolve(C.views.map(function (g) { return { group: g.group, items: g.items || [] }; }))
    : fetch(cfg.views, { credentials: 'same-origin' }).then(function (r) { return r.json(); });

  haveViews.then(function (groups) {
    VIEWS = groups; renderDots();
    /* a built bar's picker lists the versions of this kind of page, current first, then the archive's */
    var pick = rib.querySelector('.verpick[data-studio-views]');
    if (pick) {
      var mineKind = kind === 'landing' ? 'Landing' : 'App', all = [];
      groups.forEach(function (g) { g.items.forEach(function (it) { if (kindOf(it.href) === mineKind) all.push(it); }); });
      var cur = all.filter(function (it) { return same(it.href); })[0];
      pick.querySelector('.verbtn b').textContent = cur ? cur.label.replace(/^\d\d \w{3} · /, '') : mineKind;
      pick.querySelector('.verpop').innerHTML = all.map(function (it) {
        var on = same(it.href);
        return '<a class="veritem' + (on ? ' on' : '') + '" href="' + esc(it.href) + '" role="menuitem"' + (on ? ' aria-current="true"' : '') + '><span class="vt">' + esc(it.label) + '</span><span class="vn">' + esc(it.note || '') + '</span></a>';
      }).join('');
    }
  }).catch(function (e) { if (window.console) console.warn("Studio: the version list did not render —", e && e.message); });

  /* the viewport sizes, known before the switches are drawn: the viewport switch lists them */
  var VIEWPORTS = [['iPhone 15', 393, 852], ['iPhone SE', 375, 667], ['Pixel 8', 412, 915], ['iPad', 820, 1180], ['iPad Pro 11″', 834, 1194], ['Laptop', 1280, 800], ['Laptop 14″', 1440, 900], ['Desktop', 1920, 1080]];
  var VP_KEY = 'studio-viewport', vp = null, vpBox = null, vpWrap = null;
  try { vp = JSON.parse(localStorage.getItem(VP_KEY)); } catch (e) { vp = null; }

  /* ── the switches, as dropdowns ─────────────────────────────────────── */
  var SWITCHES = [
    { sel: '.statesw', key: 'State' }, { sel: '.devsw', key: 'Viewport' },
    { sel: '.rolesw', key: 'Role' }, { sel: '.groundsw', key: 'Theme' }
  ];
  SWITCHES.forEach(function (sw) {
    var group = rib.querySelector(sw.sel); if (!group) return;
    var buttons = function () { return [].slice.call(group.querySelectorAll('button')); };
    if (!buttons().length) return;
    var pick = document.createElement('div'); pick.className = 'verpick rsel'; pick.setAttribute('data-studio-pick', '');
    pick.setAttribute('data-for', sw.sel.slice(1));
    pick.innerHTML = '<button class="verbtn" aria-haspopup="true" aria-expanded="false" title="' + esc(group.getAttribute('aria-label') || sw.key) + '"><span class="k">' + esc(sw.key) + '</span><b></b>' + CHEV + '</button><div class="verpop" role="menu" hidden></div>';
    var pop = pick.querySelector('.verpop'), lbl = pick.querySelector('b');
    function current() { return buttons().filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || buttons()[0]; }
    function draw() {
      lbl.textContent = (sw.sel === '.devsw' && vp) ? vp.name : current().textContent.trim();
      pop.innerHTML = buttons().map(function (b, i) {
        return '<button class="ropt" role="menuitemradio" data-i="' + i + '" aria-checked="' + (b === current() && !(sw.sel === '.devsw' && vp) ? 'true' : 'false') + '"' + (b.disabled ? ' disabled' : '') + '>' + esc(b.textContent.trim()) + '</button>';
      }).join('') + (sw.sel === '.devsw' ? vpOptions() : '');   /* the viewport switch also offers real sizes */
    }
    pick.__before = draw;
    pick.__draw = draw;
    pop.addEventListener('click', function (e) {
      if (sw.sel === '.devsw' && vpClick(e, pop, draw)) return;
      var o = e.target.closest('.ropt'); if (!o || !o.hasAttribute('data-i')) return;
      e.stopPropagation();
      if (sw.sel === '.devsw' && vp) setViewport(null);        /* the page's own switch means: no frame */
      buttons()[+o.getAttribute('data-i')].click();          /* the original does the work */
      draw(); closePops();
    });
    /* the app may set a state itself; the label follows */
    if ('MutationObserver' in window) new MutationObserver(function () { lbl.textContent = current().textContent.trim(); }).observe(group, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
    draw();
    group.classList.add('studio-folded');
    group.parentNode.insertBefore(pick, group);
    bindPick(pick);
  });

  /* ── the viewport: the page at a chosen size ────────────────────────── */
  function vpOptions() {
    return '<div class="rsep"></div>' + VIEWPORTS.map(function (v, i) {
      return '<button class="ropt" role="menuitemradio" data-vp="' + i + '" aria-checked="' + (vp && vp.name === v[0] ? 'true' : 'false') + '">' + esc(v[0]) + '<i>' + v[1] + '×' + v[2] + '</i></button>';
    }).join('') +
      '<button class="ropt" role="menuitemradio" data-vp="custom" aria-checked="' + (vp && vp.name === 'Custom' ? 'true' : 'false') + '">Custom<i>' + (vp && vp.name === 'Custom' ? vp.w + '×' + vp.h : 'w × h') + '</i></button>' +
      '<div class="vpform" hidden><input type="number" min="240" max="4000" value="' + (vp ? vp.w : 1280) + '" aria-label="Width"><span>×</span><input type="number" min="240" max="4000" value="' + (vp ? vp.h : 800) + '" aria-label="Height"><button type="button">Apply</button></div>' +
      (vp ? '<div class="rsep"></div><button class="ropt" role="menuitem" data-vp="fit">Fit the window</button>' : '');
  }
  /* the frame: the same page, at that size, scaled to fit under the bar */
  function frameUrl() { var u = new URL(location.href); u.searchParams.set('studiovp', '1'); return u.toString(); }
  function fitBox() {
    if (!vpBox || !vp) return;
    var s = Math.min(1, (innerWidth - 48) / vp.w, (innerHeight - 34 - 72) / vp.h);
    vpBox.style.width = vp.w + 'px'; vpBox.style.height = vp.h + 'px'; vpBox.style.transform = 'scale(' + s.toFixed(3) + ')';
    vpBox.querySelector('.studio-vplbl').textContent = vp.name + ' · ' + vp.w + '×' + vp.h + (s < 1 ? ' · shown at ' + Math.round(s * 100) + '%' : '');
    vpBox.querySelector('.studio-vplbl').style.transform = 'translateX(-50%) scale(' + (1 / s).toFixed(3) + ')';
  }
  function setViewport(v) {
    vp = v; if (v) localStorage.setItem(VP_KEY, JSON.stringify(v)); else localStorage.removeItem(VP_KEY);
    root.classList.toggle('studio-vp-on', !!v);
    if (!v) {
      if (vpWrap) { vpWrap.remove(); vpWrap = vpBox = null; }
      /* the frame's page shares this browser's memory with ours: a phone frame
         may have left the app in its phone arrangement — this window is wide */
      var want = innerWidth < 700 ? 'mobile' : 'desktop', b = rib.querySelector('.devsw [data-dev="' + want + '"]');
      if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
      var dp = rib.querySelector('.rsel[data-for="devsw"]'); if (dp && dp.__draw) dp.__draw();
      return;
    }
    if (!vpWrap) {
      vpWrap = document.createElement('div'); vpWrap.className = 'studio-vp';
      vpBox = document.createElement('div'); vpBox.className = 'studio-vpbox';
      vpBox.innerHTML = '<iframe title="The page at ' + esc(v.name) + '"></iframe><span class="studio-vplbl"></span>';
      vpWrap.appendChild(vpBox); document.body.appendChild(vpWrap);
      addEventListener('resize', fitBox);
    }
    fitBox();
    /* the page inside decides its arrangement from its own width, so a new size is a fresh load */
    var fr = vpBox.querySelector('iframe'), url = frameUrl();
    if (fr.getAttribute('src') !== url || fr.__w !== v.w) { fr.__w = v.w; fr.src = url; }
  }
  function vpClick(e, pop, redraw) {
    var ap = e.target.closest('.vpform button');
    if (ap) { e.stopPropagation(); var ins = pop.querySelectorAll('.vpform input'); setViewport({ name: 'Custom', w: Math.max(240, +ins[0].value || 1280), h: Math.max(240, +ins[1].value || 800) }); redraw(); closePops(); return true; }
    if (e.target.closest('.vpform')) { e.stopPropagation(); return true; }
    var o = e.target.closest('.ropt[data-vp]'); if (!o) return false;
    e.stopPropagation();
    var k = o.getAttribute('data-vp');
    if (k === 'custom') { var f = pop.querySelector('.vpform'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input').focus(); return true; }
    if (k === 'fit') setViewport(null); else { var v = VIEWPORTS[+k]; setViewport({ name: v[0], w: v[1], h: v[2] }); }
    redraw(); closePops(); return true;
  }
  /* a page without a viewport switch of its own gets one, with the sizes */
  if (!rib.querySelector('.rsel[data-for="devsw"]')) {
    var vpick = document.createElement('div'); vpick.className = 'verpick rsel'; vpick.setAttribute('data-studio-pick', ''); vpick.setAttribute('data-for', 'vp');
    vpick.innerHTML = '<button class="verbtn" aria-haspopup="true" aria-expanded="false" title="See the page at a device size"><span class="k">Viewport</span><b></b>' + CHEV + '</button><div class="verpop" role="menu" hidden></div>';
    var vpop = vpick.querySelector('.verpop'), vlbl = vpick.querySelector('b');
    var vdraw = function () { vlbl.textContent = vp ? vp.name : 'Fit the window'; vpop.innerHTML = '<button class="ropt" role="menuitemradio" data-vp="fit" aria-checked="' + (vp ? 'false' : 'true') + '">Fit the window</button>' + vpOptions(); };
    vpick.__before = vdraw; vdraw();
    vpop.addEventListener('click', function (e) { vpClick(e, vpop, vdraw); });
    var beforeNav = rib.querySelector('nav'); rib.insertBefore(vpick, beforeNav);
    bindPick(vpick);
  }
  var devPick = rib.querySelector('.rsel[data-for="devsw"]');
  if (devPick && devPick.__draw) devPick.__draw();
  if (vp) setViewport(vp);

  /* ── Before Home, and back ──────────────────────────────────────────── */
  var entryBtn = rib.querySelector('.entrysw [data-go="entry"]');
  if (entryBtn) {
    var label0 = entryBtn.textContent.trim(), cameFrom = 'home';
    var onEntry = function () { return location.hash.slice(1) === 'entry' || !!document.querySelector('#s-entry.on'); };
    var paintEntry = function () {
      var at = onEntry();
      entryBtn.textContent = at ? 'Back to ' + (cameFrom === 'home' ? 'Home' : cameFrom) : label0;
      entryBtn.setAttribute('aria-pressed', at ? 'true' : 'false');
    };
    entryBtn.addEventListener('click', function (e) {
      if (!onEntry()) { cameFrom = (location.hash.slice(1) || 'home'); setTimeout(paintEntry, 60); return; }
      /* on the entry screen the same button goes back where you were; the
         app's own handler would take you to entry again, so it must not run */
      e.preventDefault(); e.stopPropagation();
      var hit = document.querySelector('.side [data-go="' + cameFrom + '"]') || document.querySelector('.nv[data-go="' + cameFrom + '"]');
      if (hit) hit.click(); else location.hash = '#' + cameFrom;
      setTimeout(paintEntry, 60);
    }, true);
    addEventListener('hashchange', paintEntry);
    if ('MutationObserver' in window) { var se = document.getElementById('s-entry'); if (se) new MutationObserver(paintEntry).observe(se, { attributes: true, attributeFilter: ['class'] }); }
    paintEntry();
  }

  /* ── the tools, when the page did not bring them itself ─────────────────
     A page that already carries them, as the workbench arranges, is left
     alone: each tool is asked for only when its global is missing. */
  (function bringTools() {
    var want = [
      ['StudioAnnotate', '/studio/annotate.js'],
      ['StudioComponents', '/studio/components.js'],
      ['StudioNarrate', '/studio/narrate.js']
    ];
    var told = me && me.getAttribute('data-tools');
    if (told) want = told.split(',').map(function (s, i) { return [want[i] && want[i][0], s.trim()]; });
    else if (C.tools) want = C.tools;
    want.forEach(function (pair) {
      var globalName = pair[0], src = pair[1];
      if (!src || (globalName && window[globalName]) || document.querySelector('script[src^="' + src + '"]')) return;
      var s = document.createElement('script'); s.src = src; s.defer = true; document.body.appendChild(s);
    });
  })();

  /* ── the tools, and what happens when they do not fit ───────────────── */
  var toolsMenu = document.createElement('div'); toolsMenu.className = 'verpick toolsmenu'; toolsMenu.setAttribute('data-studio-pick', '');
  toolsMenu.innerHTML = '<button class="verbtn" aria-haspopup="true" aria-expanded="false"><b>Tools</b>' + CHEV + '</button><div class="toolspop" role="menu" hidden></div>';
  rib.appendChild(toolsMenu); bindPick(toolsMenu);
  var toolsPop = toolsMenu.querySelector('.toolspop');
  var fitting = false, navWatch = null;
  function overflowing() { return rib.scrollWidth > rib.clientWidth + 1; }
  function fit() {
    if (fitting || root.classList.contains('studio-rib-off')) return; fitting = true;
    /* the moves below are ours; the watcher on the nav must not answer them */
    if (navWatch) navWatch.disconnect();
    /* start wide, then give things up in order: chips, then the tools themselves */
    if (rib.classList.contains('folded')) { [].slice.call(toolsPop.children).forEach(function (c) { nav.appendChild(c); }); rib.classList.remove('folded'); }
    rib.classList.remove('tight');
    if (overflowing()) rib.classList.add('tight');
    if (overflowing()) {
      [].slice.call(nav.children).forEach(function (c) { toolsPop.appendChild(c); });
      rib.classList.add('folded');
    }
    if (navWatch) navWatch.observe(nav, { childList: true });
    fitting = false;
  }
  var fitQueued = false;
  function queueFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(function () { fitQueued = false; fit(); }); }
  addEventListener('resize', queueFit);
  if ('ResizeObserver' in window) new ResizeObserver(queueFit).observe(rib);
  if ('MutationObserver' in window) { navWatch = new MutationObserver(queueFit); navWatch.observe(nav, { childList: true }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);
  addEventListener('load', queueFit);

  /* a tool registers a button; the launchers that insert their own button
     into the nav keep working — the bar treats every child of the nav alike */
  function tool(t) {
    var b = document.createElement('button'); b.type = 'button'; b.id = t.id; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = esc(t.label) + (t.chip ? '<span class="wip">' + esc(t.chip) + '</span>' : ''); if (t.title) b.title = t.title;
    b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (t.onToggle) t.onToggle(on, b); });
    if (t.first) nav.insertBefore(b, nav.firstChild); else nav.appendChild(b);
    queueFit(); return b;
  }

  /* ── hiding the bar ─────────────────────────────────────────────────── */
  /* Over a product the bar starts out of the way. A product puts its own
     chrome along the top — tabs, a search field, an account — and a strip of
     ours sitting on it is the one thing guaranteed to be in the way of the
     person reviewing it. The corner tab brings it back, as does the key. A
     landing has no chrome of its own up there, so it still starts visible.
     Either way, once the user has chosen, that choice is what is remembered. */
  var KEY_RIB = 'studio-ribbon', saved = localStorage.getItem(KEY_RIB);
  var on = saved === null ? kind !== 'app' : saved !== 'off';
  /* Hiding the bar must not be a trap. The key toggles it, and while it is
     away a small tab waits in the corner, so getting it back never depends on
     remembering which key it was. The tab keeps out of the way until the
     pointer finds it. */
  var backTab = document.createElement('button');
  backTab.type = 'button';
  backTab.className = 'ribshow';
  backTab.setAttribute('aria-label', 'Show the toolbar');
  backTab.title = 'Show the toolbar';
  backTab.innerHTML = DOTS;
  backTab.addEventListener('click', function () { show(true); });
  document.body.appendChild(backTab);

  function show(v) {
    on = v; root.classList.toggle('studio-rib-off', !v);
    if (kind === 'landing') root.classList.toggle('studio-rib', v);
    localStorage.setItem(KEY_RIB, v ? 'on' : 'off');
    if (v) queueFit();
  }
  show(on);
  addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === '.' || e.code === 'Period')) { e.preventDefault(); show(!on); }
    if (kind === 'landing' && (e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B') && !e.shiftKey) { e.preventDefault(); builder.toggle(); }
    if (e.key === 'Escape') closePops();
  });
  var hint = document.createElement('span'); hint.className = 'hint'; hint.innerHTML = '<kbd>' + (/Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl') + '</kbd><kbd>.</kbd> hides this'; hint.title = 'Press it again to bring the bar back';

  /* ── the builder, on a landing ──────────────────────────────────────── */
  var builder = { open: false, toggle: function () {} };
  if (kind === 'landing') {
    var KEY = 'studio-lp-layout:' + here, catalog = null;
    var panel = document.createElement('div'); panel.className = 'studiobld'; panel.hidden = true;
    panel.innerHTML = '<h4>Blocks on this page <span>drag to reorder</span></h4><div class="list"></div>' +
      '<div class="gal" hidden><div class="galtabs"></div><div class="galgrid"></div></div>' +
      '<div class="foot"><button class="addbtn" data-act="add" aria-expanded="false">Add a block from any version…</button>' +
      '<button data-act="export">Copy layout</button><button data-act="import">Paste layout</button><button data-act="reset">Reset</button></div>';
    document.body.appendChild(panel);
    var list = panel.querySelector('.list'), gal = panel.querySelector('.gal'), galTabs = gal.querySelector('.galtabs'), galGrid = gal.querySelector('.galgrid'), addBtn = panel.querySelector('.addbtn');
    /* the thumbnail of a block is named after its page and its id, the way tools/block-shots.mjs names the files */
    var slug = function (s) { return String(s).replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'root'; };
    var shotOf = function (page, id) { return '/assets/blocks/' + slug(page) + '-' + slug(id) + '.jpg'; };
    var defaultOrder = '';
    var markCustom = function () {
      var els = blocksOnPage();
      var own = els.filter(function (el) { return !el.classList.contains('studio-imported'); });
      var custom = els.length !== own.length || els.some(function (el) { return el.classList.contains('studio-hidden'); }) || own.map(idOf).join('|') !== defaultOrder;
      root.classList.toggle('studio-custom', custom);
    };

    var blocksOnPage = function () {
      var els = [].slice.call(document.querySelectorAll('header.hero, section[id], .studio-imported'));
      return els.filter(function (el) { return el.id !== 'nav' && !el.closest('.studio-imported') || el.classList.contains('studio-imported'); });
    };
    var titleOf = function (el) {
      if (el.classList.contains('studio-imported')) return el.getAttribute('data-title') || el.getAttribute('data-block');
      var h = el.querySelector('h1,h2,h3'); if (!h) return el.id || el.className;
      /* the headline as words: without its decorative twin (aria-hidden), a
         space where a <br> breaks the line, a space after each wrapped word */
      var c = h.cloneNode(true);
      [].forEach.call(c.querySelectorAll('[aria-hidden="true"]'), function (n) { n.parentNode.removeChild(n); });
      [].forEach.call(c.querySelectorAll('br'), function (n) { n.parentNode.replaceChild(document.createTextNode(' '), n); });
      [].forEach.call(c.querySelectorAll('.w'), function (n) { n.appendChild(document.createTextNode(' ')); });
      return c.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
    };
    var idOf = function (el) { return el.id || (el.classList.contains('hero') ? 'hero' : ''); };
    var render = function () {
      list.innerHTML = blocksOnPage().map(function (el, i) {
        var hid = el.classList.contains('studio-hidden'), imp = el.classList.contains('studio-imported');
        /* the catalogue calls the hero "hero" whatever id the header carries */
        var shot = imp ? shotOf(el.getAttribute('data-src'), el.getAttribute('data-block')) : shotOf(here, el.classList.contains('hero') ? 'hero' : idOf(el));
        return '<div class="row' + (hid ? ' hid' : '') + '" draggable="true" data-i="' + i + '"><span class="g">⋮⋮</span>' +
          '<img class="th" src="' + shot + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
          '<span class="t">' + esc(titleOf(el)) + (imp ? '<small>from ' + esc(el.getAttribute('data-src')) + '</small>' : '<small>#' + esc(idOf(el)) + '</small>') + '</span>' +
          '<span class="ops"><button data-op="up" title="Move up">↑</button><button data-op="down" title="Move down">↓</button>' +
          '<button data-op="hide" title="' + (hid ? 'Show' : 'Hide') + '">' + (hid ? '◌' : '●') + '</button>' +
          (imp ? '<button data-op="rm" title="Remove">×</button>' : '') + '</span></div>';
      }).join('');
    };
    var move = function (el, dir) {
      var els = blocksOnPage(), i = els.indexOf(el), j = i + dir;
      if (j < 0 || j >= els.length) return;
      var other = els[j]; if (other.parentNode !== el.parentNode) return;
      if (dir < 0) other.parentNode.insertBefore(el, other); else other.parentNode.insertBefore(el, other.nextSibling);
    };
    var changed = function () { save(); render(); markCustom(); dispatchEvent(new Event('scroll')); };
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-op]'); if (!b) return;
      var row = b.closest('.row'), el = blocksOnPage()[+row.getAttribute('data-i')]; if (!el) return;
      var op = b.getAttribute('data-op');
      if (op === 'up') move(el, -1); else if (op === 'down') move(el, 1);
      else if (op === 'hide') el.classList.toggle('studio-hidden');
      else if (op === 'rm') el.remove();
      changed();
    });
    var dragI = -1;
    list.addEventListener('dragstart', function (e) { var r = e.target.closest('.row'); if (!r) return; dragI = +r.getAttribute('data-i'); r.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
    list.addEventListener('dragover', function (e) { var r = e.target.closest('.row'); if (!r) return; e.preventDefault(); [].forEach.call(list.children, function (c) { c.classList.remove('over'); }); r.classList.add('over'); });
    list.addEventListener('dragleave', function (e) { var r = e.target.closest('.row'); if (r) r.classList.remove('over'); });
    list.addEventListener('drop', function (e) {
      var r = e.target.closest('.row'); if (!r || dragI < 0) return; e.preventDefault();
      var els = blocksOnPage(), from = els[dragI], to = els[+r.getAttribute('data-i')];
      if (from && to && from !== to && from.parentNode === to.parentNode) {
        if (dragI < +r.getAttribute('data-i')) to.parentNode.insertBefore(from, to.nextSibling); else to.parentNode.insertBefore(from, to);
      }
      dragI = -1; changed();
    });
    list.addEventListener('dragend', function () { dragI = -1; [].forEach.call(list.children, function (c) { c.classList.remove('drag', 'over'); }); });

    /* the gallery: one tab per version, its blocks as pictures; a click brings one in */
    var galTab = -1;
    var fillAdd = function () {
      if (!catalog) return;
      if (galTab < 0) { galTab = 0; catalog.forEach(function (pg, i) { if (same(pg.page) && catalog.length > 1) galTab = i === 0 ? 1 : 0; }); }
      galTabs.innerHTML = catalog.map(function (pg, i) {
        return '<button role="tab" data-i="' + i + '" aria-selected="' + (i === galTab ? 'true' : 'false') + '">' + esc(pg.label) + (same(pg.page) ? ' · this page' : '') + '</button>';
      }).join('');
      var pg = catalog[galTab];
      galGrid.innerHTML = pg.blocks.map(function (b) {
        return '<button class="galcard" data-page="' + esc(pg.page) + '" data-block="' + esc(b.id) + '" data-title="' + esc(b.title) + '" title="' + esc(b.title) + '">' +
          '<img src="' + (b.shot ? '/assets/blocks/' + esc(b.shot) + '.jpg' : shotOf(pg.page, b.id)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'"><span>' + esc(b.title) + '</span></button>';
      }).join('');
    };
    galTabs.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; galTab = +b.getAttribute('data-i'); fillAdd(); });
    galGrid.addEventListener('click', function (e) {
      var c = e.target.closest('.galcard'); if (!c) return;
      var el = importBlock(c.getAttribute('data-page'), c.getAttribute('data-block'), c.getAttribute('data-title')); changed();
      if (el && el.scrollIntoView) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    });
    var impN = 0;
    var importBlock = function (src, block, title, before) {
      if (same(src)) {                              /* a block of this page: show it again */
        var own = block === 'hero' ? document.querySelector('header.hero') : document.getElementById(block);
        if (own) { own.classList.remove('studio-hidden'); if (before) before.parentNode.insertBefore(own, before); }
        return own;
      }
      var sec = document.createElement('section'); sec.className = 'studio-imported'; sec.id = 'imp-' + (++impN) + '-' + block.replace(/[^a-z0-9_-]/gi, '');
      sec.setAttribute('data-src', src); sec.setAttribute('data-block', block); sec.setAttribute('data-title', title || block);
      sec.innerHTML = '<span class="tag">' + esc(title || block) + ' · from ' + esc(src) + '</span>' +
        '<iframe src="' + esc(src) + (src.indexOf('?') > -1 ? '&' : '?') + 'block=' + encodeURIComponent(block) + '&vh=' + Math.round(innerHeight) + '" scrolling="no" title="' + esc(title || block) + '"></iframe>';
      var host = document.querySelector('footer');
      if (before && before.parentNode) before.parentNode.insertBefore(sec, before);
      else if (host && host.parentNode === document.body) document.body.insertBefore(sec, host);
      else document.body.appendChild(sec);
      return sec;
    };
    addEventListener('message', function (e) {
      var d = e.data; if (!d || !d.studioBlock) return;
      var h = Math.min(Math.max(120, +d.height || 0), innerHeight * 12);      /* never past twelve screens, whatever a block says */
      [].forEach.call(document.querySelectorAll('.studio-imported iframe'), function (f) {
        if (f.contentWindow === e.source && Math.abs((parseFloat(f.style.height) || 0) - h) > 1) f.style.height = h + 'px';
      });
    });
    addBtn.addEventListener('click', function () {
      var open = gal.hidden; gal.hidden = !open; addBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      addBtn.textContent = open ? 'Close the gallery' : 'Add a block from any version…';
      if (open) fillAdd();
    });
    var save = function () {
      var els = blocksOnPage();
      localStorage.setItem(KEY, JSON.stringify({
        order: els.map(function (el) { return el.classList.contains('studio-imported') ? 'imp:' + el.getAttribute('data-src') + '|' + el.getAttribute('data-block') + '|' + (el.getAttribute('data-title') || '') : idOf(el); }),
        hidden: els.filter(function (el) { return el.classList.contains('studio-hidden'); }).map(idOf).filter(Boolean)
      }));
    };
    var apply = function (layout) {
      if (!layout || !layout.order) return;
      var byId = {}; blocksOnPage().forEach(function (el) { byId[idOf(el)] = el; });
      var anchor = null, parentEl = null, used = [];
      layout.order.forEach(function (k) {
        var el;
        if (k.indexOf('imp:') === 0) {                /* a borrowed block already on the page is reused, not brought in twice */
          var p = k.slice(4).split('|');
          el = [].filter.call(document.querySelectorAll('.studio-imported'), function (s) { return s.getAttribute('data-src') === p[0] && s.getAttribute('data-block') === p[1] && used.indexOf(s) < 0; })[0] || importBlock(p[0], p[1], p[2]);
          used.push(el);
        }
        else el = byId[k];
        if (!el) return;
        if (!parentEl) parentEl = el.parentNode;
        if (el.parentNode === parentEl) { if (anchor) parentEl.insertBefore(el, anchor.nextSibling); anchor = el; }
      });
      (layout.hidden || []).forEach(function (id) { var el = byId[id]; if (el) el.classList.add('studio-hidden'); });
      root.classList.add('studio-bld-on');
      markCustom();
    };
    panel.querySelector('.foot').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'export') { save(); navigator.clipboard && navigator.clipboard.writeText(localStorage.getItem(KEY) || '{}'); b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy layout'; }, 1200); }
      if (act === 'import') { var t = prompt('Paste a layout (JSON)'); if (t) { try { apply(JSON.parse(t)); save(); render(); } catch (err) { alert('That was not a layout.'); } } }
      if (act === 'reset') { localStorage.removeItem(KEY); location.reload(); }
    });
    var bldBtn = tool({ id: 'bldbtn', label: 'Builder', title: 'Reorder, hide and borrow blocks (⌘B)', onToggle: function (v) { builder.toggle(v); } });
    builder.toggle = function (v) {
      builder.open = v === undefined ? !builder.open : v;
      panel.hidden = !builder.open; bldBtn.setAttribute('aria-pressed', builder.open ? 'true' : 'false');
      root.classList.add('studio-bld-on');
      if (builder.open) {
        render();
        if (!catalog) fetch(cfg.blocks, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (c) { catalog = c; fillAdd(); }).catch(function () {});
        else fillAdd();
      }
    };
    var restore = function () {
      defaultOrder = blocksOnPage().map(idOf).join('|');       /* the page as it was written, to tell a rearrangement from */
      try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) apply(saved); } catch (e) {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore); else restore();
  }
  nav.appendChild(hint);
  queueFit();

  window.Studio = { show: show, builder: builder, tool: tool, fit: fit, kind: kind };
})();
