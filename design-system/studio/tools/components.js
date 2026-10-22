/* ── Components: the design system, at work on the page ───────────────────
   One button in the ribbon, one panel, on every page the ribbon reaches.

   The panel reads top to bottom the way the work goes. A field that finds
   a component anywhere — on this screen, in the system, on the shelf. Then
   four tabs:

   Inspect — press Pick, click something on the page. The panel says what
   it is (which component, which variant) and shows it as a live preview
   under the same stylesheet. Under that, what it computes to, in plain
   words — Text, Background, Corner, Size, Weight, Padding — each a field.
   Change one and the preview, the page and every other instance follow.
   A note can be pinned to it; its markup copied; something that is not a
   component can be made one.

   Design — the system itself. A strip of the key components that follows
   every change. Essentials: the handful of tokens that set the look.
   Choices: the quick presets. All: every token on the page, grouped and
   searchable. Code: everything changed as one stylesheet, editable.

   Add — two shelves. Wireframe blocks first — navigation, hero, section,
   sidebar, table, field, button… — that land in the page as plain grey
   boxes with a name and a line of intent, resizable where they stand.
   Then the design portal's specimens, real components in the system's
   clothes. Drag onto the page or click to add beside the picked element.

   Notes — what was pinned, across pages, and a markdown copy.

   Everything saves as it happens, with Undo. Copy for agent turns all of
   it into one markdown brief: tokens, choices, rules with the values they
   replaced, what was added and where, wireframes, notes, and the CSS. */
(function () {
  if (document.getElementById('cmpbtn')) return;
  var FONT = "'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif";
  var MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
  var root = document.documentElement;
  var here = location.pathname.replace(/\/+$/, '') || '/';
  var MAC = /Mac|iP/.test(navigator.platform);
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function keep(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function screenId() { return (location.hash || '').slice(1) || 'page'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function after(ms, f) { return setTimeout(f, ms); }

  /* ── the system's components, by the selectors the checker uses ──────── */
  /* What this product is made of, by name and by the selector that finds it.
     It comes from studio.config.js, because it is the one list that is wholly
     yours; the handful below is only what a page has when nothing said. */
  var COMPONENTS = (window.StudioConfig && window.StudioConfig.components) || [
    { name: 'Button', sel: 'button, .btn' },
    { name: 'Field', sel: 'input, textarea, select' },
    { name: 'Card', sel: '.card' }
  ];
  var WIRES = [
    { id: 'navigation', name: 'Navigation', h: 56, inner: 'bar' }, { id: 'header', name: 'Header', h: 120, inner: 'title' },
    { id: 'hero', name: 'Hero', h: 320, inner: 'hero' }, { id: 'section', name: 'Section', h: 240, inner: 'text' },
    { id: 'columns', name: 'Two columns', h: 220, inner: 'cols' }, { id: 'sidebar', name: 'Sidebar', h: 320, inner: 'list' },
    { id: 'footer', name: 'Footer', h: 140, inner: 'cols' }, { id: 'modal', name: 'Modal', h: 260, inner: 'modal' },
    { id: 'banner', name: 'Banner', h: 48, inner: 'bar' }, { id: 'card', name: 'Card', h: 160, inner: 'text' },
    { id: 'table', name: 'Table', h: 220, inner: 'table' }, { id: 'list', name: 'List', h: 180, inner: 'list' },
    { id: 'field', name: 'Form field', h: 62, inner: 'field' }, { id: 'button', name: 'Button', h: 40, inner: 'button' },
    { id: 'image', name: 'Image', h: 200, inner: 'image' }, { id: 'text', name: 'Text', h: 90, inner: 'text' },
    { id: 'chart', name: 'Chart', h: 220, inner: 'chart' }, { id: 'stat', name: 'Stat', h: 90, inner: 'stat' }
  ];
  var K = { added: 'studio-components-added', presets: 'studio-presets', tokens: 'studio-tokens', rules: 'studio-rules', bases: 'studio-rule-bases', css: 'studio-css', notes: 'studio-notes', adds: 'studio-additions:' + here };
  var added = load(K.added, []), presets = load(K.presets, {}), tokens = load(K.tokens, {}), rules = load(K.rules, {}), bases = load(K.bases, {}), rawCSS = localStorage.getItem(K.css) || '', notes = load(K.notes, []), additions = load(K.adds, []);
  additions.forEach(function (a) { if (!a.aid) a.aid = uid(); });

  /* ── the quick choices ───────────────────────────────────────────────── */
  /* where a token rewrite lands. :root covers a normal app; the rest are
     there for products that re-declare their variables further down. */
  var SCOPE = (window.StudioConfig && window.StudioConfig.tokenScope) || ':root,body';
  /* The decisions the Design tab offers, each a switch whose answers are the
     CSS they apply across the product. Yours to shape, in studio.config.js. */
  var PRESETS = (window.StudioConfig && window.StudioConfig.presets) || [];
  function presetOption(p) { return p.options.filter(function (x) { return x[0] === presets[p.id]; })[0] || null; }

  /* ── everything changed, as one stylesheet; saved as it happens ──────── */
  function generatedCSS() {
    var out = [], tk = Object.keys(tokens);
    if (tk.length) out.push('/* tokens */\n' + SCOPE + '{\n' + tk.sort().map(function (k) { return '  ' + k + ': ' + tokens[k] + ' !important;'; }).join('\n') + '\n}');
    var pr = PRESETS.filter(function (p) { return presets[p.id]; }).map(function (p) { var o = presetOption(p); return o ? '/* ' + p.name + ' · ' + o[1] + ' */\n' + o[2] : ''; }).filter(Boolean);
    if (pr.length) out.push(pr.join('\n'));
    var rk = Object.keys(rules);
    if (rk.length) out.push('/* components */\n' + rk.map(function (sel) {
      var props = rules[sel]; return sel + '{\n' + Object.keys(props).map(function (p) { return '  ' + p + ': ' + props[p] + ' !important;'; }).join('\n') + '\n}';
    }).join('\n'));
    return out.join('\n\n');
  }
  function applyAll() {
    var el = document.getElementById('studio-presets-css');
    if (!el) { el = document.createElement('style'); el.id = 'studio-presets-css'; document.head.appendChild(el); }
    el.textContent = rawCSS || generatedCSS();
  }
  applyAll();
  function changeCount() {
    var n = Object.keys(tokens).length + Object.keys(presets).length + (rawCSS ? 1 : 0);
    Object.keys(rules).forEach(function (s) { n += Object.keys(rules[s]).length; });
    return n;
  }
  /* one step of history per thing changed; typing into the same field is one step */
  var history = [], lastKey = '', lastAt = 0;
  function snapshot() { return JSON.stringify({ tokens: tokens, presets: presets, rules: rules, bases: bases, rawCSS: rawCSS }); }
  function mark(key) {
    var now = Date.now();
    if (key === lastKey && now - lastAt < 1500) { lastAt = now; return; }
    history.push(snapshot()); if (history.length > 40) history.shift();
    lastKey = key; lastAt = now;
  }
  function persist() {
    keep(K.tokens, tokens); keep(K.presets, presets); keep(K.rules, rules); keep(K.bases, bases);
    if (rawCSS) localStorage.setItem(K.css, rawCSS); else localStorage.removeItem(K.css);
    applyAll(); paintStatus();
  }
  function undo() {
    var s = history.pop(); if (!s) return;
    var o = JSON.parse(s); tokens = o.tokens; presets = o.presets; rules = o.rules; bases = o.bases; rawCSS = o.rawCSS; lastKey = '';
    persist(); if (picked) pick(picked, true); if (tab === 'design') renderDesign();
  }

  /* ── the panel ──────────────────────────────────────────────────────── */
  var STYLE = [
    '.cmp{position:fixed;top:34px;right:0;bottom:0;width:400px;z-index:120;background:#101013;color:#B4B0BE;border-left:1px solid #26262C;font:400 12.5px/1.45 ' + FONT + ';display:flex;flex-direction:column;box-shadow:-20px 0 50px -30px rgba(0,0,0,.8)}',
    '.cmp[hidden]{display:none}.cmp *{box-sizing:border-box}',
    '.cmp .c-head{display:flex;align-items:center;gap:8px;padding:12px 12px 0 14px}.cmp .c-head h4{margin:0;flex:1;font:600 13px/1 ' + FONT + ';color:#fff}',
    '.cmp .c-head button{background:none;border:1px solid #26262C;color:#C4C4CA;font:500 11.5px/1 ' + FONT + ';padding:6px 9px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
    '.cmp .c-head button:hover{background:#1A1A1E;color:#fff}.cmp .c-head button[aria-pressed="true"]{background:var(--studio-ok);border-color:var(--studio-ok);color:#08080A}',
    '.cmp .c-head button svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}',
    '.cmp .c-head .x{border:0;padding:6px;font-size:16px;line-height:1;color:#8B8B93}',
    '.cmp .c-srch{padding:10px 14px 0;position:relative}.cmp .c-srch input{width:100%;background:#0B0B0E;color:#E8E8EC;border:1px solid #26262C;border-radius:6px;font:12px/1.4 ' + FONT + ';padding:7px 9px 7px 28px}',
    '.cmp .c-srch::before{content:"";position:absolute;left:23px;top:18px;width:11px;height:11px;border:1.5px solid #5E5E66;border-radius:50%}.cmp .c-srch::after{content:"";position:absolute;left:32px;top:28px;width:5px;height:1.5px;background:#5E5E66;transform:rotate(45deg)}',
    '.cmp .c-qres{margin:6px 0 0;padding:4px;border:1px solid #26262C;border-radius:8px;background:#0B0B0E;max-height:220px;overflow:auto}.cmp .c-qres[hidden]{display:none}',
    '.cmp .c-qres button{display:flex;justify-content:space-between;gap:10px;width:100%;background:none;border:0;color:#C4C4CA;font:500 11.5px/1.3 ' + FONT + ';padding:7px 8px;border-radius:5px;cursor:pointer;text-align:left}',
    '.cmp .c-qres button:hover{background:#1A1A1E;color:#fff}.cmp .c-qres button i{font-style:normal;color:#5E5E66;white-space:nowrap}.cmp .c-qres .c-qh{font:500 9.5px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#5E5E66;padding:7px 8px 4px}',
    '.cmp .c-tabs{display:flex;gap:2px;padding:10px 10px 0}.cmp .c-tabs button{flex:1;background:none;border:0;color:#8B8B93;font:600 12px/1 ' + FONT + ';padding:9px 4px;border-radius:6px;cursor:pointer}',
    '.cmp .c-tabs button[aria-selected="true"]{background:#1A1A1E;color:#fff}.cmp .c-tabs button i{font-style:normal;color:#5E5E66;font-weight:500;margin-left:4px}',
    '.cmp .c-pane{flex:1;overflow:auto;padding:12px 14px 16px}.cmp .c-pane[hidden]{display:none}',
    '.cmp h5{margin:0 0 6px;font:600 12px/1.3 ' + FONT + ';color:#fff}.cmp h6{margin:16px 0 6px;font:500 10px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#5E5E66;display:flex;justify-content:space-between;align-items:baseline}.cmp h6 i{font-style:normal;letter-spacing:0;text-transform:none;font:400 11px/1 ' + FONT + ';color:#5E5E66}',
    '.cmp p{margin:0 0 10px;color:#8B8B93}.cmp p.c-hint{font-size:12px;color:#5E5E66}',
    '.cmp code{font:11px/1.5 ' + MONO + ';color:#B478FF;word-break:break-all}.cmp .c-muted{color:#5E5E66}.cmp .c-ok{color:var(--studio-ok)}.cmp .c-no{color:#FF6B8A}',
    /* the picked thing */
    '.cmp .c-who{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 4px}.cmp .c-who b{font:600 14px/1.2 ' + FONT + ';color:#fff}',
    '.cmp .c-who .c-dot{width:7px;height:7px;border-radius:50%;background:var(--studio-ok);flex:none}.cmp .c-who .c-dot.c-no{background:#FF6B8A}',
    '.cmp .c-who .c-chip{font:500 10.5px/1 ' + MONO + ';color:#B478FF;background:#1A1A1E;border:1px solid #26262C;padding:3px 6px;border-radius:4px}',
    '.cmp .c-where{margin:0 0 10px;font:400 11px/1.4 ' + FONT + ';color:#5E5E66;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cmp .c-where code{color:#77777F;font-size:10.5px}',
    '.cmp .c-empty{padding:26px 14px;border:1px dashed #26262C;border-radius:8px;text-align:center;color:#5E5E66}.cmp .c-empty b{display:block;color:#C4C4CA;font-weight:600;margin-bottom:4px}',
    '.cmp .c-picking{margin:0 0 10px;padding:8px 10px;border-radius:6px;background:var(--studio-ok-08);border:1px solid var(--studio-ok-20);color:#8FE8C0;font:500 11.5px/1.3 ' + FONT + '}',
    '.cmp label{display:block;font:500 11px/1 ' + FONT + ';color:#77777F;margin:10px 0 4px}',
    '.cmp input[type=text],.cmp input[type=search],.cmp textarea{width:100%;background:#0B0B0E;color:#E8E8EC;border:1px solid #26262C;border-radius:6px;font:12px/1.4 ' + FONT + ';padding:7px 9px}',
    '.cmp textarea{font:11px/1.5 ' + MONO + ';min-height:120px;resize:vertical}.cmp textarea.c-plain{font:12.5px/1.45 ' + FONT + ';min-height:64px}',
    '.cmp .c-act{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}',
    '.cmp .c-act button,.cmp .c-foot button,.cmp .c-more button{background:#1A1A1E;border:1px solid #26262C;color:#E8E8EC;font:500 11.5px/1 ' + FONT + ';padding:7px 10px;border-radius:6px;cursor:pointer}',
    '.cmp .c-act button:hover,.cmp .c-foot button:hover,.cmp .c-more button:hover{background:#26262C}.cmp .c-act button.c-prim{background:#F4F4F5;color:#08080A;border-color:#F4F4F5}',
    '.cmp .c-act button.c-ghost{background:none;border-color:transparent;color:#8B8B93}.cmp .c-act button.c-ghost:hover{color:#fff;background:#1A1A1E}',
    '.cmp .c-foot{padding:10px 14px 14px;border-top:1px solid #26262C;display:flex;gap:6px;align-items:center;position:relative}',
    '.cmp .c-foot .c-status{flex:1;font:500 11px/1.3 ' + FONT + ';color:#5E5E66}.cmp .c-foot .c-status b{color:#8B8B93;font-weight:500}',
    '.cmp .c-foot button.c-agent{background:var(--studio-ok);color:#08080A;border-color:var(--studio-ok)}.cmp .c-foot button.c-agent:hover{background:#3DF5A8}',
    '.cmp .c-more{position:absolute;right:14px;bottom:52px;display:flex;flex-direction:column;gap:2px;padding:4px;background:#101013;border:1px solid #26262C;border-radius:8px;box-shadow:0 18px 40px -18px rgba(0,0,0,.8)}.cmp .c-more[hidden]{display:none}.cmp .c-more button{text-align:left;background:none;border:0;border-radius:5px}',
    /* the live previews: the page's own CSS applies, so they follow every change */
    '.cmp .c-prev{margin:0 0 12px;padding:22px 14px 18px;border:1px solid #26262C;border-radius:8px;background:#F7F6F3;color:#0F0F13;display:grid;place-items:center;overflow:auto;max-height:260px;font:13px/1.35 ' + FONT + ';position:relative}',
    '.cmp .c-prev[hidden]{display:none}.cmp .c-prev[data-dark]{background:#0F0F13;color:#F4F4F5}',
    '.cmp .c-prev > *{max-width:100%;pointer-events:none}.cmp .c-prev .grnd{position:absolute;right:8px;top:6px;background:none;border:0;color:#9A9AA3;font:500 9.5px/1 ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;cursor:pointer;padding:2px 4px;pointer-events:auto}.cmp .c-prev .grnd:hover{color:#0F0F13}.cmp .c-prev[data-dark] .grnd:hover{color:#fff}',
    '.cmp .c-strip{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;margin:0 0 12px;padding:16px 12px;border:1px solid #26262C;border-radius:8px;background:#F7F6F3;color:#0F0F13;font:13px/1.35 ' + FONT + '}',
    '.cmp .c-strip > *{pointer-events:none;max-width:100%}.cmp .c-strip .spec{display:contents}',
    /* fields: a property in plain words, its value */
    '.cmp .c-grp{margin:0 0 4px}.cmp .c-grp h6{margin:12px 0 4px}',
    '.cmp .c-prop{display:grid;grid-template-columns:104px 1fr;gap:6px;align-items:center;padding:3px 0}.cmp .c-prop span{font:500 11.5px/1.3 ' + FONT + ';color:#8B8B93;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cmp .c-prop .v{display:flex;align-items:center;gap:5px}.cmp .c-prop input[type=text]{padding:5px 7px;font:11px/1.3 ' + MONO + '}.cmp .c-prop input[type=color]{width:22px;height:22px;padding:0;border:1px solid #26262C;border-radius:5px;background:none;flex:none}',
    '.cmp .c-prop.c-changed span{color:#B478FF}.cmp .c-prop .c-rst{background:none;border:0;color:#5E5E66;cursor:pointer;padding:0 4px;font-size:13px;flex:none;line-height:1}.cmp .c-prop .c-rst:hover{color:#fff}',
    '.cmp .tokg{border-top:1px solid #1C1C20;padding:8px 0}.cmp .tokg summary{cursor:pointer;font:600 11.5px/1.3 ' + FONT + ';color:#E8E8EC;list-style:none;display:flex;justify-content:space-between}.cmp .tokg summary i{font-style:normal;color:#5E5E66;font-weight:400}',
    '.cmp .c-modes{display:flex;gap:2px;margin:0 0 12px;padding:2px;border-radius:7px;background:#131316;border:1px solid #232328}.cmp .c-modes button{flex:1;background:none;border:0;color:#8B8B93;font:500 11.5px/1 ' + FONT + ';padding:7px 4px;border-radius:5px;cursor:pointer}.cmp .c-modes button[aria-pressed="true"]{background:#F4F4F5;color:#08080A}',
    '.cmp .c-choice{padding:10px 0;border-top:1px solid #1C1C20}.cmp .c-choice:first-of-type{border-top:0}',
    '.cmp .c-choice .c-nm{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px}.cmp .c-choice .c-nm b{color:#fff;font-weight:600;white-space:nowrap}.cmp .c-choice .c-nm i{font-style:normal;font-size:11px;color:#5E5E66;text-align:right}',
    '.cmp .c-seg{display:flex;gap:1px;padding:2px;border-radius:7px;background:#131316;border:1px solid #232328}',
    '.cmp .c-seg button{flex:1;min-height:26px;background:none;border:0;color:#8B8B93;font:500 11.5px/1 ' + FONT + ';border-radius:5px;cursor:pointer}',
    '.cmp .c-seg button[aria-pressed="true"]{color:#08080A;background:#F4F4F5}',
    /* the shelves */
    '.cmp .c-shelf{display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 8px}.cmp .c-shelf:first-child{margin-top:0}.cmp .c-shelf h6{margin:0}.cmp .c-shelf i{font-style:normal;color:#5E5E66;font-size:11px}',
    '.cmp .c-pal{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.cmp .c-palc{border:1px solid #26262C;border-radius:8px;background:#0B0B0E;cursor:grab;overflow:hidden;display:flex;flex-direction:column;transition:border-color .15s}.cmp .c-palc:hover{border-color:var(--studio-accent)}.cmp .c-palc:active{cursor:grabbing}.cmp .c-palc[hidden]{display:none}',
    '.cmp .c-palc .c-pv{height:74px;display:grid;place-items:center;padding:8px;overflow:hidden;background:#F7F6F3;color:#0F0F13;font:13px/1.3 ' + FONT + ';pointer-events:none}.cmp .c-palc .c-pv > *{transform:scale(.8);transform-origin:center;max-width:100%}',
    '.cmp .c-palc .c-pv[data-dark]{background:#0F0F13}',
    '.cmp .c-palc.c-wire .c-pv{background:#131316;height:58px}.cmp .c-palc.c-wire .c-pv > *{transform:none}',
    '.cmp .c-palc span.t{padding:7px 9px;font:500 11px/1.3 ' + FONT + ';color:#C4C4CA;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cmp .wmini{width:100%;height:100%;border:1px dashed #5E5E66;border-radius:4px;display:grid;place-items:center;color:#8B8B93;font:500 10px/1 ' + FONT + ';letter-spacing:.06em;text-transform:uppercase}',
    /* notes */
    '.cmp .c-notes li{list-style:none;padding:8px 0;border-top:1px solid #1C1C20;display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:start}.cmp .c-notes ul{margin:0;padding:0}',
    '.cmp .c-notes .n{width:20px;height:20px;border-radius:50%;background:var(--studio-accent);color:#fff;font:600 10px/20px ' + FONT + ';text-align:center}.cmp .c-notes .n.away{background:#26262C;color:#8B8B93}',
    '.cmp .c-notes .c-txt{color:#E8E8EC}.cmp .c-notes small{display:block;color:#5E5E66;font-size:10.5px}.cmp .c-notes button{background:none;border:0;color:#5E5E66;cursor:pointer}.cmp .c-notes button:hover{color:#fff}',
    /* on the page */
    '.cmp-outline{position:fixed;z-index:119;pointer-events:none;border:1.5px solid var(--studio-accent);background:var(--studio-accent-08);border-radius:3px;transition:all 60ms linear}',
    '.cmp-outline[hidden]{display:none}.cmp-outline .lbl{position:absolute;left:-1.5px;top:-20px;background:var(--studio-accent);color:#fff;font:600 10px/1 ' + FONT + ';padding:4px 6px;border-radius:4px 4px 0 0;white-space:nowrap}',
    '.cmp-picked{outline:1.5px solid var(--studio-ok) !important;outline-offset:1px}',
    'html.cmp-inspecting,html.cmp-inspecting *{cursor:crosshair !important}',
    '.cmp-pin{position:fixed;z-index:118;width:20px;height:20px;border-radius:50%;background:var(--studio-accent);color:#fff;font:600 10px/20px ' + FONT + ';text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer;transform:translate(-50%,-50%)}',
    '.cmp-pin:hover{background:#B478FF}.cmp-pin[hidden]{display:none}',
    '.cmp-drop{position:fixed;z-index:119;pointer-events:none;height:0;border-top:2px solid var(--studio-ok);border-radius:2px}.cmp-drop::before{content:"";position:absolute;left:-4px;top:-5px;width:8px;height:8px;border-radius:50%;background:var(--studio-ok)}.cmp-drop[hidden]{display:none}',
    '.studio-added{position:relative}.cmp-adding .studio-added{outline:1px dashed var(--studio-ok-53);outline-offset:2px}',
    /* the wireframe: plain on purpose — a grey dashed box that says what it is */
    '.studio-wire{position:relative;box-sizing:border-box;margin:10px 0;border:1.5px dashed #9A9AA3;border-radius:6px;background:repeating-linear-gradient(135deg,#8B8B9310 0 6px,transparent 6px 14px),#8B8B930d;color:#4A4852;font:500 12px/1.3 ' + FONT + ';min-height:32px;padding:10px 12px;overflow:hidden;display:flex;flex-direction:column;gap:8px}',
    '.studio-wire .wl{display:flex;align-items:center;gap:8px;font:600 11px/1 ' + FONT + ';letter-spacing:.06em;text-transform:uppercase;color:#4A4852}',
    '.studio-wire .wl b{outline:0;font-weight:600;min-width:2ch}.studio-wire .wl b:focus{background:#fff;color:#0F0F13;padding:0 4px;border-radius:3px}.studio-wire .wl span{color:#9A9AA3;font-weight:500}',
    '.studio-wire .wn{outline:0;font:400 12.5px/1.4 ' + FONT + ';color:#585660;min-height:1.4em;letter-spacing:0;text-transform:none}.studio-wire .wn:empty::before{content:"What goes here, and why";color:#9A9AA3}.studio-wire .wn:focus{background:#fff;color:#0F0F13;padding:2px 6px;border-radius:4px}',
    '.studio-wire .wx{position:absolute;right:6px;top:6px;width:20px;height:20px;border:0;border-radius:50%;background:#0F0F13;color:#fff;font:600 12px/20px ' + FONT + ';text-align:center;cursor:pointer;opacity:0;transition:opacity .15s;padding:0}.studio-wire:hover .wx{opacity:1}',
    '.studio-wire .wg{position:absolute;left:0;right:0;bottom:0;height:10px;cursor:ns-resize}.studio-wire .wg::after{content:"";position:absolute;left:50%;bottom:3px;width:28px;height:3px;border-radius:2px;background:#9A9AA3;transform:translateX(-50%)}',
    '.studio-wire .wi{flex:1;display:grid;gap:8px;min-height:0;pointer-events:none}',
    '.studio-wire .wi i{display:block;border:1px dashed #9A9AA3;border-radius:4px;min-height:10px}',
    '.studio-wire .wi.bar{grid-template-columns:80px 1fr 60px 60px 90px;align-items:center}.studio-wire .wi.bar i{height:14px}',
    '.studio-wire .wi.title i:first-child{height:22px;width:40%}.studio-wire .wi.title i:last-child{height:10px;width:60%}',
    '.studio-wire .wi.hero{grid-template-columns:1fr 1fr}.studio-wire .wi.hero .col{display:grid;gap:8px;align-content:center}.studio-wire .wi.hero .col i:nth-child(1){height:26px}.studio-wire .wi.hero .col i:nth-child(2){height:26px;width:80%}.studio-wire .wi.hero .col i:nth-child(3){height:12px;width:70%}.studio-wire .wi.hero .col i:nth-child(4){height:30px;width:120px}.studio-wire .wi.hero > i{min-height:100%}',
    '.studio-wire .wi.text i{height:10px}.studio-wire .wi.text i:nth-child(2){width:92%}.studio-wire .wi.text i:nth-child(3){width:78%}',
    '.studio-wire .wi.cols{grid-template-columns:1fr 1fr 1fr}.studio-wire .wi.cols i{min-height:100%}',
    '.studio-wire .wi.list i{height:16px}',
    '.studio-wire .wi.modal{place-items:center}.studio-wire .wi.modal i{width:60%;min-height:70%}',
    '.studio-wire .wi.table{grid-template-columns:1fr 1fr 1fr 1fr;grid-auto-rows:16px}',
    '.studio-wire .wi.field i{height:32px;width:60%}',
    '.studio-wire .wi.button i{height:100%;width:120px;border-style:solid;border-width:1.5px}',
    '.studio-wire .wi.image{place-items:center}.studio-wire .wi.image i{width:100%;min-height:100%;background:linear-gradient(135deg,transparent 48%,#9A9AA3 49%,#9A9AA3 51%,transparent 52%),linear-gradient(45deg,transparent 48%,#9A9AA3 49%,#9A9AA3 51%,transparent 52%)}',
    '.studio-wire .wi.chart{grid-template-columns:repeat(8,1fr);align-items:end}.studio-wire .wi.chart i{min-height:20%}.studio-wire .wi.chart i:nth-child(2){min-height:45%}.studio-wire .wi.chart i:nth-child(3){min-height:35%}.studio-wire .wi.chart i:nth-child(4){min-height:70%}.studio-wire .wi.chart i:nth-child(5){min-height:55%}.studio-wire .wi.chart i:nth-child(6){min-height:85%}.studio-wire .wi.chart i:nth-child(7){min-height:65%}.studio-wire .wi.chart i:nth-child(8){min-height:95%}',
    '.studio-wire .wi.stat i:first-child{height:28px;width:120px}.studio-wire .wi.stat i:last-child{height:10px;width:50%}',
    /* what was added shows its handle on hover, and moves like the shelf drags */
    '[data-aid]:hover{outline:1px dashed var(--studio-accent-50);outline-offset:2px;cursor:grab}[data-aid]:active{cursor:grabbing}',
    '.cmp-rm{position:fixed;z-index:121;width:20px;height:20px;border:0;border-radius:50%;background:#0F0F13;color:#fff;font:600 13px/20px ' + FONT + ';text-align:center;cursor:pointer;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.35)}.cmp-rm:hover{background:#FF6B8A}.cmp-rm[hidden]{display:none}',
    '.studio-wire .wl{cursor:grab}.studio-wire .wn,.studio-wire .wl b{cursor:text}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = STYLE; document.head.appendChild(st);

  var PICK_ICO = '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4"/></svg>';
  var panel = document.createElement('div'); panel.className = 'cmp'; panel.hidden = true;
  panel.innerHTML =
    '<div class="c-head"><h4>Components</h4><button id="cmppickbtn" aria-pressed="false" title="Pick an element on the page (Esc stops)">' + PICK_ICO + 'Pick</button><button class="x" id="cmpclose" title="Close">×</button></div>' +
    '<div class="c-srch"><input type="search" id="cmpq" placeholder="Find a component…" autocomplete="off"><div class="c-qres" id="cmpqres" hidden></div></div>' +
    '<div class="c-tabs"><button data-tab="inspect" aria-selected="true">Inspect</button><button data-tab="design" aria-selected="false">Design<i id="cmpdesignn"></i></button><button data-tab="add" aria-selected="false">Add<i id="cmpaddn"></i></button><button data-tab="notes" aria-selected="false">Notes<i id="cmpnotesn"></i></button></div>' +
    '<div class="c-pane" data-pane="inspect"><div id="cmppicking" class="c-picking" hidden>Picking — click anything on the page. Esc stops.</div><div id="cmpres"></div><div class="c-prev" id="cmpprev" hidden></div><div id="cmppick"></div></div>' +
    '<div class="c-pane" data-pane="design" hidden><div class="c-strip" id="cmpstrip"><span class="c-muted">The key components, live</span></div><div class="c-modes"><button data-mode="essentials" aria-pressed="true">Essentials</button><button data-mode="presets" aria-pressed="false">Choices</button><button data-mode="tokens" aria-pressed="false">All tokens</button><button data-mode="code" aria-pressed="false">Code</button></div><div id="cmpdesign"></div></div>' +
    '<div class="c-pane" data-pane="add" hidden><p class="c-hint">Drag onto the page — a green line shows where it lands — or click to add it beside the picked element. Kept for this screen.</p><div id="cmppal"><span class="c-muted">Loading the system…</span></div></div>' +
    '<div class="c-pane" data-pane="notes" hidden><div id="cmpnotes" class="c-notes"></div></div>' +
    '<div class="c-foot"><span class="c-status" id="cmpstatus"></span><button data-act="undo" title="Undo the last change (' + (MAC ? '⌘' : 'Ctrl') + 'Z while the panel has focus)">Undo</button><button data-act="agent" class="c-agent">Copy for agent</button><button data-act="more" title="More">…</button>' +
    '<div class="c-more" id="cmpmore" hidden><button data-act="copy">Copy state as JSON</button><button data-act="reset">Reset tokens, choices and rules…</button><button data-act="clear">Remove what was added to this screen…</button></div></div>';
  document.body.appendChild(panel);
  var outline = document.createElement('div'); outline.className = 'cmp-outline'; outline.hidden = true; outline.innerHTML = '<span class="lbl"></span>'; document.body.appendChild(outline);
  /* the × that follows the pointer onto anything added: one control for all of them */
  var rmBtn = document.createElement('button'); rmBtn.className = 'cmp-rm'; rmBtn.type = 'button'; rmBtn.title = 'Remove this'; rmBtn.textContent = '×'; rmBtn.hidden = true; document.body.appendChild(rmBtn);
  var rmFor = null, rmT = 0;
  function showRm(el) {
    rmFor = el; var r = el.getBoundingClientRect();
    rmBtn.style.left = (r.right - 10) + 'px'; rmBtn.style.top = (r.top - 10) + 'px'; rmBtn.hidden = false; clearTimeout(rmT);
  }
  document.addEventListener('mousemove', function (e) {
    if (e.target === rmBtn) { clearTimeout(rmT); return; }
    var el = e.target.closest && e.target.closest('[data-aid]');
    if (el) { if (!el.classList.contains('studio-wire')) showRm(el); }
    else if (!rmBtn.hidden) { clearTimeout(rmT); rmT = setTimeout(function () { rmBtn.hidden = true; rmFor = null; }, 400); }
  }, true);
  rmBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (rmFor) removeAdded(rmFor); rmBtn.hidden = true; rmFor = null; });
  function removeAdded(el) {
    var aid = el.getAttribute('data-aid');
    additions = additions.filter(function (a) { return a.aid !== aid; }); keep(K.adds, additions);
    if (picked === el) { picked = null; }
    el.remove(); paintStatus(); if (tab === 'inspect') renderInspect();
  }
  var dropLine = document.createElement('div'); dropLine.className = 'cmp-drop'; dropLine.hidden = true; document.body.appendChild(dropLine);

  var open = false, tab = 'inspect';
  function paintStatus() {
    var n = changeCount(), s = document.getElementById('cmpstatus');
    s.innerHTML = n ? '<b>' + n + ' change' + (n === 1 ? '' : 's') + '</b> · saved' : 'Nothing changed yet';
    document.getElementById('cmpdesignn').textContent = n || '';
    var a = additions.filter(function (x) { return x.screen === screenId(); }).length; document.getElementById('cmpaddn').textContent = a || '';
    document.getElementById('cmpnotesn').textContent = notes.length || '';
    panel.querySelector('[data-act="undo"]').disabled = !history.length; panel.querySelector('[data-act="undo"]').style.opacity = history.length ? '' : '.4';
  }
  function showTab(t) {
    tab = t;
    [].forEach.call(panel.querySelectorAll('.c-tabs button'), function (x) { x.setAttribute('aria-selected', x.getAttribute('data-tab') === t ? 'true' : 'false'); });
    [].forEach.call(panel.querySelectorAll('.c-pane'), function (p) { p.hidden = p.getAttribute('data-pane') !== t; });
    if (t === 'inspect') renderInspect();
    if (t === 'design') { renderDesign(); renderStrip(); } if (t === 'add') loadPalette(); if (t === 'notes') renderNotes();
  }
  panel.querySelector('.c-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) showTab(b.getAttribute('data-tab')); });
  document.getElementById('cmpclose').addEventListener('click', function () { toggle(); });
  document.getElementById('cmppickbtn').addEventListener('click', function () { setInspect(!inspecting); if (inspecting) showTab('inspect'); });

  /* ── inspect ────────────────────────────────────────────────────────── */
  var inspecting = false, hover = null, picked = null, noteOpen = false;
  function allComponents() { return COMPONENTS.concat(added.map(function (a) { return { name: a.name + ' (added)', sel: a.sel }; })); }
  function match(el) {
    var best = null, depth = 1e9;
    allComponents().forEach(function (c) {
      var hit; try { hit = el.closest(c.sel); } catch (e) { hit = null; }
      if (!hit) return;
      var d = 0, n = el; while (n && n !== hit) { n = n.parentElement; d++; }
      if (d < depth) { depth = d; best = { comp: c, el: hit }; }
    });
    return best;
  }
  function selectorFor(el) {
    if (el.getAttribute('data-slot')) return '[data-slot="' + el.getAttribute('data-slot') + '"]';
    var tag = el.tagName.toLowerCase(), cls = [].slice.call(el.classList).filter(function (c) { return !/^(on|in|is-|studio-|cmp|l|w|dsm-)$|^(studio-|cmp-|dsm-)/.test(c); }).slice(0, 3);
    return cls.length ? tag + '.' + cls.join('.') : (el.id ? '#' + el.id : tag);
  }
  function pathOf(el) {
    var parts = [], n = el;
    while (n && n !== document.body && parts.length < 4) { parts.unshift(selectorFor(n)); n = n.parentElement; }
    return parts.join(' > ');
  }
  function fullPath(el) {
    var parts = [], n = el;
    while (n && n !== document.body) {
      if (n.id && !/^(imp-|cmp)/.test(n.id)) { parts.unshift('#' + CSS.escape(n.id)); return parts.join(' > '); }
      var i = 1, s = n; while ((s = s.previousElementSibling)) i++;
      parts.unshift(n.tagName.toLowerCase() + ':nth-child(' + i + ')'); n = n.parentElement;
    }
    return 'body > ' + parts.join(' > ');
  }
  function find(path) { try { return document.querySelector(path); } catch (e) { return null; } }
  function visible(el) { var r = el.getBoundingClientRect(); return (r.width || r.height) && el.offsetParent !== null; }
  /* Ours, and so never pickable and never counted. The names here have to
     match what the other tools actually put on the page — Narrate's bar is
     .reelbar, not .reel-bar, and for a while this list said the latter, which
     meant the whole of Narrate was pickable as if it were the product. */
  var OURS = '.ribbon,.ribshow,.studiobld,.cmp-pin,.cmp,#agentation-host,.reelbar,.reelpanel,.reeltip,.reelhit,#anntoast';
  function isOurs(el) {
    if (!el || el.nodeType !== 1) return true;
    return panel.contains(el) || el.closest(OURS) || el === outline || outline.contains(el);
  }

  function onMove(e) {
    if (!inspecting) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOurs(el)) { outline.hidden = true; hover = null; return; }
    hover = el; var r = el.getBoundingClientRect(), m = match(el);
    outline.hidden = false; outline.style.left = r.left + 'px'; outline.style.top = r.top + 'px'; outline.style.width = r.width + 'px'; outline.style.height = r.height + 'px';
    var lbl = outline.querySelector('.lbl'); lbl.textContent = m ? m.comp.name : selectorFor(el);
    outline.style.borderColor = m ? 'var(--studio-ok)' : 'var(--studio-accent)'; outline.style.background = m ? 'var(--studio-ok-08)' : 'var(--studio-accent-08)';
    lbl.style.background = m ? 'var(--studio-ok)' : 'var(--studio-accent)'; lbl.style.color = m ? '#08080A' : '#fff';
  }
  function onClick(e) {
    if (!inspecting) return;
    /* Normally the pointer has already been over the thing and onMove has it.
       A click that arrives without one — a tap, a click driven by a script,
       a pointer that entered on the press — should still pick, so fall back
       to whatever is under the point. */
    var target = hover || document.elementFromPoint(e.clientX, e.clientY);
    if (!target || isOurs(target)) return;
    if (target.closest('.studio-wire')) return;
    e.preventDefault(); e.stopPropagation();
    pick(target); setInspect(false);                        /* one pick, then the page is yours again */
  }
  /* what it computes to, in plain words */
  var PROPS = [
    ['Colour', [['color', 'Text'], ['background-color', 'Background'], ['border-color', 'Border']]],
    ['Shape', [['border-radius', 'Corner'], ['border-width', 'Border width'], ['box-shadow', 'Shadow'], ['opacity', 'Opacity']]],
    ['Type', [['font-size', 'Size'], ['font-weight', 'Weight'], ['line-height', 'Line height'], ['letter-spacing', 'Tracking'], ['text-transform', 'Case']]],
    ['Space', [['padding', 'Padding'], ['gap', 'Gap']]]
  ];
  var SKIP = { 'text-transform': 'none', 'letter-spacing': 'normal', 'box-shadow': 'none', 'gap': 'normal', 'border-width': '0px', 'padding': '0px', 'opacity': '1' };
  function hexOf(v) {
    var m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(v || ''); if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) < 1) return null;
    return ('#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join('')).toUpperCase();
  }
  function tidy(v) { return v.replace(/(\d+\.\d+)px/g, function (_, n) { var r = n >= 1 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100; return r + 'px'; }); }
  function readProps(el, sel) {
    var cs = getComputedStyle(el), out = [];
    PROPS.forEach(function (g) {
      var rows = [];
      g[1].forEach(function (pl) {
        var p = pl[0], v = cs.getPropertyValue(p).trim();
        var changed = rules[sel] && rules[sel][p];
        if (!changed && (!v || v === SKIP[p] || v === 'transparent' || v === 'rgba(0, 0, 0, 0)')) return;
        rows.push([p, pl[1], hexOf(v) || tidy(v)]);
      });
      if (rows.length) out.push([g[0], rows]);
    });
    return out;
  }
  function ruleSel(m, el) { return m ? m.comp.sel.split(',')[0].trim() : pathOf(el); }
  function fieldRow(p, label, v, sel) {
    var cur = (rules[sel] && rules[sel][p]) || '';
    var isColor = /^#[0-9A-F]{6}$/i.test(cur || v);
    return '<div class="c-prop' + (cur ? ' c-changed' : '') + '" data-p="' + esc(p) + '"><span title="' + esc(p) + '">' + esc(label) + '</span><div class="v">' +
      (isColor ? '<input type="color" value="' + esc((cur || v).slice(0, 7)) + '">' : '') +
      '<input type="text" value="' + esc(cur || v) + '" data-base="' + esc(v) + '" aria-label="' + esc(label) + '">' + (cur ? '<button class="c-rst" title="Back to ' + esc(v) + '">×</button>' : '') + '</div></div>';
  }
  var prevDark = Boolean(window.StudioConfig && window.StudioConfig.systemGround === 'dark');
  function renderPreview() {
    var box = document.getElementById('cmpprev');
    if (!picked) { box.hidden = true; return; }
    var m = match(picked), src = m ? m.el : picked;
    var c = src.cloneNode(true); c.classList.remove('cmp-picked'); c.removeAttribute('id');
    [].forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    box.innerHTML = '<button class="grnd" title="See it on the other ground">' + (prevDark ? 'on dark' : 'on light') + '</button>';
    box.appendChild(c); box.hidden = false; if (prevDark) box.setAttribute('data-dark', '1'); else box.removeAttribute('data-dark');
  }
  function renderInspect() {
    var res = document.getElementById('cmpres'), pk = document.getElementById('cmppick');
    document.getElementById('cmppicking').hidden = !inspecting;
    if (!picked) {
      res.innerHTML = '<div class="c-empty"><b>Nothing picked</b>Press Pick, then click anything on the page — a button, a card, a row. The panel says what it is and what it is made of.</div>';
      document.getElementById('cmpprev').hidden = true; pk.innerHTML = ''; return;
    }
    var m = match(picked), sel = ruleSel(m, picked), el = m ? m.el : picked;
    /* A component that names its parts (data-slot, as shadcn does) says its
       variant in data attributes; its classes are utilities, not variants. */
    var variants = !m ? [] : m.el.hasAttribute('data-slot')
      ? ['variant', 'size', 'status', 'state', 'orientation'].map(function (k) { var v = m.el.getAttribute('data-' + k); return v ? k + ' ' + v : ''; }).filter(Boolean)
      : [].slice.call(m.el.classList).filter(function (c) { return c !== 'cmp-picked' && m.comp.sel.indexOf('.' + c) < 0; }).slice(0, 6).map(function (c) { return '.' + c; });
    var addedEntry = picked.hasAttribute('data-aid') ? entryOf(picked) : null;
    res.innerHTML = m
      ? '<div class="c-who"><span class="c-dot"></span><b>' + esc(m.comp.name) + '</b>' + variants.map(function (v) { return '<span class="c-chip">' + esc(v) + '</span>'; }).join('') + '</div>' +
        '<div class="c-where" title="' + esc(pathOf(picked)) + '">In the system as <code>' + esc(m.comp.sel.split(',')[0].trim()) + '</code> · picked <code>' + esc(pathOf(picked)) + '</code></div>'
      : '<div class="c-who"><span class="c-dot c-no"></span><b>Not a component</b><span class="c-chip">' + esc(selectorFor(picked)) + '</span></div>' +
        '<div class="c-where" title="' + esc(pathOf(picked)) + '">Nothing in the system answers to this. Picked <code>' + esc(pathOf(picked)) + '</code></div>';
    if (addedEntry) res.innerHTML += '<div class="c-where">Added from the shelf' + (addedEntry.at ? ' on ' + esc(addedEntry.at.slice(0, 10)) : '') + ' · <a href="#" data-go="remove" style="color:#FF6B8A">Remove it</a></div>';
    renderPreview();
    var groups = readProps(el, sel), n = rules[sel] ? Object.keys(rules[sel]).length : 0;
    pk.innerHTML =
      '<h6>What it is made of' + (n ? '<i>' + n + ' changed · <a href="#" data-go="resetsel" style="color:#B478FF">reset</a></i>' : '<i>change a value, everything of its kind follows</i>') + '</h6>' +
      '<div id="cmpprops" data-sel="' + esc(sel) + '">' + groups.map(function (g) {
        return '<div class="c-grp"><h6>' + esc(g[0]) + '</h6>' + g[1].map(function (r) { return fieldRow(r[0], r[1], r[2], sel); }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="c-act"><button data-go="note"' + (noteOpen ? ' aria-pressed="true"' : '') + '>Pin a note</button><button data-go="addbeside">Add beside it</button><button data-go="markup" class="c-ghost">Copy markup</button>' +
        (m ? '' : '<button data-go="make" class="c-ghost">Make it a component</button>') + (window.StudioAnnotate ? '<button data-go="annotate" class="c-ghost">Annotate</button>' : '') + '</div>' +
      '<div id="cmpnotebox"' + (noteOpen ? '' : ' hidden') + '><textarea class="c-plain" id="cmpnote" placeholder="What should change here, and why"></textarea><div class="c-act"><button class="c-prim" data-go="pin">Pin it</button><button class="c-ghost" data-go="cancelnote">Cancel</button></div></div>' +
      '<div id="cmpmakebox" hidden><label>Name it</label><input type="text" id="cmpname" value="' + esc(guessName(picked)) + '"><label>Selector</label><input type="text" id="cmpsel" value="' + esc(selectorFor(picked)) + '"><div class="c-act"><button class="c-prim" data-go="add">Add to the system</button><button class="c-ghost" data-go="cancelmake">Cancel</button></div></div>';
  }
  function pick(el, quiet) {
    if (picked) picked.classList.remove('cmp-picked');
    picked = el; picked.classList.add('cmp-picked'); noteOpen = false;
    if (!open) toggle(); showTab('inspect');
    if (!quiet) picked.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function guessName(el) {
    var t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    var tag = { BUTTON: 'Button', A: 'Link', INPUT: 'Field', SELECT: 'Select', TABLE: 'Table', IMG: 'Image', SVG: 'Icon', NAV: 'Nav', UL: 'List', H1: 'Headline', H2: 'Headline', H3: 'Heading' }[el.tagName] || 'Block';
    return t ? tag + ' · ' + t : tag;
  }
  panel.querySelector('[data-pane="inspect"]').addEventListener('click', function (e) {
    if (e.target.closest('.grnd')) { prevDark = !prevDark; renderPreview(); return; }
    var b = e.target.closest('[data-go],button.c-rst'); if (!b) return;
    e.preventDefault();
    var sel0 = document.getElementById('cmpprops') && document.getElementById('cmpprops').getAttribute('data-sel');
    if (b.classList.contains('c-rst')) {
      var row = b.closest('.c-prop'), p0 = row.getAttribute('data-p');
      mark('rst:' + sel0 + p0); if (rules[sel0]) { delete rules[sel0][p0]; if (!Object.keys(rules[sel0]).length) delete rules[sel0]; }
      rawCSS = ''; persist(); renderInspect(); return;
    }
    var go = b.getAttribute('data-go');
    if (go === 'remove' && picked && picked.hasAttribute('data-aid')) { removeAdded(picked); return; }
    if (go === 'resetsel' && sel0) { mark('resetsel'); delete rules[sel0]; rawCSS = ''; persist(); renderInspect(); }
    if (go === 'note') { noteOpen = !noteOpen; document.getElementById('cmpnotebox').hidden = !noteOpen; b.setAttribute('aria-pressed', noteOpen ? 'true' : 'false'); if (noteOpen) document.getElementById('cmpnote').focus(); }
    if (go === 'cancelnote') { noteOpen = false; document.getElementById('cmpnotebox').hidden = true; }
    if (go === 'make') { document.getElementById('cmpmakebox').hidden = false; document.getElementById('cmpname').focus(); }
    if (go === 'cancelmake') { document.getElementById('cmpmakebox').hidden = true; }
    if (go === 'addbeside') { showTab('add'); }
    if (go === 'annotate' && window.StudioAnnotate) { window.StudioAnnotate.toggle(); }
    if (go === 'markup' && picked) { var c = picked.cloneNode(true); c.classList.remove('cmp-picked'); navigator.clipboard && navigator.clipboard.writeText(c.outerHTML); said(b, 'Copied'); }
    if (go === 'pin' && picked) {
      var txt = document.getElementById('cmpnote').value.trim(); if (!txt) { document.getElementById('cmpnote').focus(); return; }
      var m = match(picked);
      notes.push({ id: uid(), page: here, screen: screenId(), title: document.title, path: fullPath(picked), sel: pathOf(picked), comp: m ? m.comp.name : '', text: txt, at: new Date().toISOString() });
      keep(K.notes, notes); noteOpen = false; renderPins(); renderInspect(); paintStatus();
    }
    if (go === 'add') {
      var name = document.getElementById('cmpname').value.trim(), sel = document.getElementById('cmpsel').value.trim();
      if (!name || !sel) return;
      try { document.querySelector(sel); } catch (err) { alert('That selector does not parse.'); return; }
      added.push({ name: name, sel: sel, page: here, at: new Date().toISOString().slice(0, 10) }); keep(K.added, added);
      renderInspect();
    }
  });
  function said(b, t) { var was = b.textContent; b.textContent = t; after(1200, function () { b.textContent = was; }); }
  panel.querySelector('[data-pane="inspect"]').addEventListener('input', function (e) {
    var inp = e.target; if (!inp.closest('#cmpprops')) return;
    var row = inp.closest('.c-prop'), p = row.getAttribute('data-p'), sel = document.getElementById('cmpprops').getAttribute('data-sel');
    var txt = row.querySelector('input[type=text]'), col = row.querySelector('input[type=color]');
    if (inp === col) txt.value = col.value.toUpperCase(); else if (col && /^#[0-9a-f]{6}$/i.test(txt.value)) col.value = txt.value;
    var v = txt.value.trim(), base = txt.getAttribute('data-base');
    mark('rule:' + sel + p);
    if (!v || v === base) { if (rules[sel]) { delete rules[sel][p]; if (!Object.keys(rules[sel]).length) delete rules[sel]; } row.classList.remove('c-changed'); }
    else { rules[sel] = rules[sel] || {}; rules[sel][p] = v; bases[sel] = bases[sel] || {}; if (!bases[sel][p]) bases[sel][p] = base; row.classList.add('c-changed'); }
    rawCSS = ''; persist();
  });
  function setInspect(v) {
    inspecting = v; root.classList.toggle('cmp-inspecting', v);
    document.getElementById('cmppickbtn').setAttribute('aria-pressed', v ? 'true' : 'false');
    var pb = document.getElementById('cmppicking'); if (pb) pb.hidden = !v;
    if (!v) { outline.hidden = true; hover = null; }
  }
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && inspecting) { setInspect(false); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey && panel.contains(document.activeElement)) { e.preventDefault(); undo(); }
  });

  /* ── find: one field for the screen, the system and the shelf ───────── */
  var q = '', qres = document.getElementById('cmpqres'), qIdx = {};
  function search() {
    var s = q.trim().toLowerCase();
    [].forEach.call(document.querySelectorAll('#cmppal .c-palc'), function (c) { c.hidden = !!s && (c.getAttribute('data-name') || '').toLowerCase().indexOf(s) < 0; });
    [].forEach.call(document.querySelectorAll('#cmppal .c-shelf'), function (h) { var grp = h.getAttribute('data-shelf'); h.hidden = !!s && ![].some.call(document.querySelectorAll('#cmppal .c-palc[data-shelf="' + grp + '"]'), function (c) { return !c.hidden; }); });
    if (!s) { qres.hidden = true; qres.innerHTML = ''; return; }
    var out = [], onScreen = [];
    allComponents().forEach(function (c) {
      if (c.name.toLowerCase().indexOf(s) < 0 && c.sel.toLowerCase().indexOf(s) < 0) return;
      var els; try { els = [].filter.call(document.querySelectorAll(c.sel), function (el) { return visible(el) && !isOurs(el); }); } catch (e) { els = []; }
      if (els.length) onScreen.push({ c: c, n: els.length });
    });
    if (onScreen.length) out.push('<div class="c-qh">On this screen</div>' + onScreen.map(function (o) { return '<button data-qsel="' + esc(o.c.sel) + '"><span>' + esc(o.c.name) + '</span><i>' + o.n + ' · pick</i></button>'; }).join(''));
    var wires = WIRES.filter(function (w) { return w.name.toLowerCase().indexOf(s) >= 0; });
    var shelf = (palette || []).filter(function (p) { return p.name.toLowerCase().indexOf(s) >= 0; }).slice(0, 8);
    if (shelf.length || wires.length) out.push('<div class="c-qh">On the shelf</div>' +
      wires.map(function (w) { return '<button data-qwire="' + esc(w.id) + '"><span>' + esc(w.name) + ' · wireframe</span><i>add</i></button>'; }).join('') +
      shelf.map(function (p) { return '<button data-qadd="' + esc(p.id) + '"><span>' + esc(p.name) + '</span><i>add</i></button>'; }).join(''));
    if (!out.length) out.push('<div class="c-qh">Nothing by that name</div>');
    qres.innerHTML = out.join(''); qres.hidden = false;
  }
  document.getElementById('cmpq').addEventListener('input', function (e) { q = e.target.value; if (q && !palette) loadPalette(); search(); });
  qres.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-qsel')) {
      var sel = b.getAttribute('data-qsel'), els = [].filter.call(document.querySelectorAll(sel), visible);
      if (!els.length) return; qIdx[sel] = ((qIdx[sel] || 0) + 1) % els.length; var el = els[qIdx[sel]];
      pick(el); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (b.hasAttribute('data-qadd')) { var p = byId(b.getAttribute('data-qadd')); if (p) addFromShelf(p); }
    if (b.hasAttribute('data-qwire')) { var w = wireItem(b.getAttribute('data-qwire')); if (w) addFromShelf(w); }
  });

  /* ── design: the strip, essentials, choices, all tokens, code ───────── */
  var mode = 'essentials', tokenList = null, tokq = '';
  function renderStrip() {
    var box = document.getElementById('cmpstrip');
    if (!palette) { loadPalette(renderStrip); return; }
    var want = (window.StudioConfig && window.StudioConfig.strip) || ['c-button-0', 'c-button-1', 'c-badge-0', 'c-badge-1', 'c-input-search-0', 'c-card-callout-0', 'c-table-0'];
    var items = want.map(byId).filter(Boolean); if (!items.length) items = palette.slice(0, 6);
    box.innerHTML = '<div class="spec">' + items.map(function (p) { return p.html; }).join('') + '</div>';
  }
  function discoverTokens() {
    var seen = {}, list = [], cs = getComputedStyle(root);
    /* into @layer and @media too: Tailwind keeps its theme inside a layer */
    function walk(rules_) {
      [].forEach.call(rules_, function (r) {
        if (!r.selectorText && r.cssRules && !r.keyText && !(window.CSSKeyframesRule && r instanceof CSSKeyframesRule)) { walk(r.cssRules); return; }
        if (!r.selectorText || !/(^|,)\s*(:root|html|body|\[data-|\.app\b|\.ds\b|\.dark\b)/.test(r.selectorText)) return;
        for (var i = 0; i < r.style.length; i++) {
          var n = r.style[i]; if (n.indexOf('--') !== 0 || n.indexOf('--tw-') === 0 || seen[n]) continue;
          var v = cs.getPropertyValue(n).trim() || r.style.getPropertyValue(n).trim();
          seen[n] = 1; list.push({ name: n, value: v });
        }
      });
    }
    [].forEach.call(document.styleSheets, function (sh) {
      var rules_; try { rules_ = sh.cssRules; } catch (e) { return; } if (!rules_) return;
      walk(rules_);
    });
    return list;
  }
  var HEX = /^#([0-9a-f]{3,8})$/i, LEN = /^-?[\d.]+(px|rem|em|%|vw|vh)$/;
  function kindOf(v) { v = (v || '').trim(); if (HEX.test(v) || /^rgba?\(|^hsla?\(/.test(v)) return 'colour'; if (LEN.test(v)) return 'length'; return 'text'; }
  var GROUPS = [
    ['Colour', function (t) { return kindOf(t.value) === 'colour'; }],
    ['Type', function (t) { return /(^--(fs|lh|w-|track|text-|font|type|display|title|body-|caps|reg|med|semi|k-text|measure))/.test(t.name); }],
    ['Radius', function (t) { return /radius|^--r-|^--k-r-/.test(t.name); }],
    ['Size and space', function (t) { return /^--(sp|gap|pad|h-|w$|rail|band|gut|k-sp|k-h)/.test(t.name) || kindOf(t.value) === 'length'; }],
    ['Motion', function (t) { return /^--(t-|e-|micro|dur|ease|k-t-|k-e-)/.test(t.name) || /ms$|cubic-bezier/.test(t.value); }],
    ['Elevation', function (t) { return /shadow/.test(t.name); }],
    ['Other', function () { return true; }]
  ];
  /* the handful that set the look, found by name whatever the build calls them */
  var ESSENTIALS = [
    ['Accent', /^--(accent|purple|acc|brand)$/], ['Accent, secondary', /^--(green|accent-2|acc2)$/], ['Ink', /^--(ink|fg|text|k-ink)$/], ['Ink, muted', /^--(ink2|ink3|fg-md|text-2|k-md)$/],
    ['Ground', /^--(paper|bg|ground|surface|surf|k-bg)$/], ['Ground, raised', /^--(paper2|surf2|raised|surface-2|k-raised)$/], ['Line', /^--(line|bd|border|edge|k-bd)$/],
    ['Corner', /^--(r|radius|r-md|k-r-md|rad)$/], ['Corner, small', /^--(r-sm|k-r-sm|rad-sm)$/], ['Base size', /^--(fs|k-fs|text-15)$/], ['Font', /^--font$/],
    ['Control height', /^--(h-ctl|h-ctl-sm|k-h-ctl)$/], ['Rail width', /^--(rail|k-rail)$/], ['Band width', /^--(band)$/]
  ];
  /* A product that knows its own names says them: [label, '--token'] */
  if (window.StudioConfig && window.StudioConfig.essentials) {
    ESSENTIALS = window.StudioConfig.essentials.map(function (e) {
      return [e[0], typeof e[1] === 'string' ? new RegExp('^' + e[1].replace(/[-]/g, '\\-') + '$') : e[1]];
    });
  }
  function tokenRow(t, label) {
    var cur = tokens[t.name], v = cur || t.value, hex = HEX.test(v) ? (v.length === 4 ? '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : v.slice(0, 7)) : hexOf(v);
    return '<div class="c-prop' + (cur ? ' c-changed' : '') + '" data-tok="' + esc(t.name) + '"><span title="' + esc(t.name) + '">' + esc(label || t.name.replace(/^--/, '')) + '</span><div class="v">' +
      (hex ? '<input type="color" value="' + esc(hex) + '">' : '') + '<input type="text" value="' + esc(v) + '" data-base="' + esc(t.value) + '" aria-label="' + esc(t.name) + '">' + (cur ? '<button class="c-rst" title="Back to ' + esc(t.value) + '">×</button>' : '') + '</div></div>';
  }
  function renderDesign() {
    var box = document.getElementById('cmpdesign');
    [].forEach.call(panel.querySelectorAll('.c-modes button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
    if (!tokenList) tokenList = discoverTokens();
    if (mode === 'essentials') {
      var rows = [], used = {};
      ESSENTIALS.forEach(function (e) { var t = tokenList.filter(function (x) { return e[1].test(x.name) && !used[x.name]; })[0]; if (t) { used[t.name] = 1; rows.push(tokenRow(t, e[0])); } });
      var changed = tokenList.filter(function (t) { return tokens[t.name] && !used[t.name]; });
      box.innerHTML = '<p class="c-hint">The few that set the look. Change one and the strip above, and the page, follow. Everything else is under All tokens.</p>' +
        (rows.length ? rows.join('') : '<p class="c-muted">None of the usual names on this page — try All tokens.</p>') +
        (changed.length ? '<h6>Also changed</h6>' + changed.map(function (t) { return tokenRow(t); }).join('') : '');
      return;
    }
    if (mode === 'presets') {
      box.innerHTML = '<p class="c-hint">A few decisions, each a switch. The one on again clears it.</p>' + PRESETS.map(function (p) {
        return '<div class="c-choice"><div class="c-nm"><b>' + esc(p.name) + '</b><i>' + esc(p.note) + '</i></div><div class="c-seg" data-preset="' + p.id + '">' +
          p.options.map(function (o) { return '<button data-v="' + o[0] + '" aria-pressed="' + (presets[p.id] === o[0] ? 'true' : 'false') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
      }).join('');
      return;
    }
    if (mode === 'code') {
      var gen = generatedCSS();
      box.innerHTML = '<p class="c-hint">Everything changed, as one stylesheet. Edit and apply; Regenerate returns control to the fields.' + (rawCSS ? ' <span class="c-no">Hand-edited: the fields are not in charge until you regenerate.</span>' : '') + '</p>' +
        '<textarea id="cmpcode" spellcheck="false" style="min-height:320px">' + esc(rawCSS || gen || '/* nothing changed yet */') + '</textarea>' +
        '<div class="c-act"><button class="c-prim" data-code="apply">Apply</button><button data-code="copy">Copy</button><button class="c-ghost" data-code="regen">Regenerate from fields</button></div>';
      return;
    }
    var s = tokq.toLowerCase(), groups = {};
    tokenList.forEach(function (t) {
      if (s && t.name.indexOf(s) < 0 && (t.value || '').toLowerCase().indexOf(s) < 0) return;
      for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1](t)) { (groups[GROUPS[i][0]] = groups[GROUPS[i][0]] || []).push(t); break; }
    });
    var changedN = Object.keys(tokens).length;
    box.innerHTML = '<input type="search" id="cmptokq" placeholder="Find among ' + tokenList.length + ' tokens' + (changedN ? ' · ' + changedN + ' changed' : '') + '" value="' + esc(tokq) + '" style="margin-bottom:8px">' +
      (tokenList.length ? '' : '<p class="c-muted">No tokens found on this page’s stylesheets.</p>') +
      GROUPS.map(function (g) {
        var items = groups[g[0]]; if (!items || !items.length) return '';
        var openIt = !!s || items.some(function (t) { return tokens[t.name]; });
        return '<details class="tokg"' + (openIt ? ' open' : '') + '><summary>' + esc(g[0]) + '<i>' + items.length + '</i></summary>' + items.map(function (t) { return tokenRow(t); }).join('') + '</details>';
      }).join('');
    var qi = document.getElementById('cmptokq');
    qi.addEventListener('input', function () { tokq = qi.value; var pos = qi.selectionStart; renderDesign(); var q2 = document.getElementById('cmptokq'); q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} });
  }
  panel.querySelector('.c-modes').addEventListener('click', function (e) { var b = e.target.closest('button[data-mode]'); if (!b) return; mode = b.getAttribute('data-mode'); renderDesign(); });
  var design = document.getElementById('cmpdesign');
  design.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-v')) {
      var seg = b.closest('.c-seg'), id = seg.getAttribute('data-preset'), v = b.getAttribute('data-v');
      mark('preset:' + id); if (presets[id] === v) delete presets[id]; else presets[id] = v;
      [].forEach.call(seg.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', presets[id] === x.getAttribute('data-v') ? 'true' : 'false'); });
      rawCSS = ''; persist(); return;
    }
    if (b.classList.contains('c-rst')) { var row = b.closest('.c-prop'); mark('tokrst'); delete tokens[row.getAttribute('data-tok')]; rawCSS = ''; persist(); renderDesign(); return; }
    var code = b.getAttribute('data-code');
    if (code === 'apply') { mark('css'); rawCSS = document.getElementById('cmpcode').value; persist(); said(b, 'Applied'); }
    if (code === 'copy') { navigator.clipboard && navigator.clipboard.writeText(document.getElementById('cmpcode').value); said(b, 'Copied'); }
    if (code === 'regen') { mark('css'); rawCSS = ''; persist(); renderDesign(); }
  });
  design.addEventListener('input', function (e) {
    var inp = e.target, row = inp.closest('.c-prop[data-tok]'); if (!row) return;
    var name = row.getAttribute('data-tok'), txt = row.querySelector('input[type=text]'), col = row.querySelector('input[type=color]');
    if (inp === col) txt.value = col.value.toUpperCase(); else if (col && /^#[0-9a-f]{6}$/i.test(txt.value)) col.value = txt.value;
    var v = txt.value.trim();
    mark('tok:' + name);
    if (!v || v === txt.getAttribute('data-base')) { delete tokens[name]; row.classList.remove('c-changed'); } else { tokens[name] = v; row.classList.add('c-changed'); }
    rawCSS = ''; persist();
  });

  /* ── add: the two shelves, dragged onto the page ────────────────────── */
  var palette = null, loading = false, dragging = null, dropAt = null, onLoaded = [];
  function wireItem(id) { var w = WIRES.filter(function (x) { return x.id === id; })[0]; return w ? { id: 'wire-' + w.id, name: w.name, wire: w } : null; }
  function wireHTML(w, label, note, h) {
    var inner = { bar: '<i></i><i></i><i></i><i></i><i></i>', title: '<i></i><i></i>', hero: '<div class="col"><i></i><i></i><i></i><i></i></div><i></i>', text: '<i></i><i></i><i></i>',
      cols: '<i></i><i></i><i></i>', list: '<i></i><i></i><i></i><i></i>', modal: '<i></i>', table: '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>',
      field: '<i></i>', button: '<i></i>', image: '<i></i>', chart: '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>', stat: '<i></i><i></i>' }[w.inner] || '<i></i>';
    return '<div class="studio-wire" data-wire="' + esc(w.id) + '" style="height:' + (h || w.h) + 'px">' +
      '<div class="wl"><b contenteditable="true" spellcheck="false">' + esc(label || w.name) + '</b><span>wireframe</span></div>' +
      '<div class="wi ' + esc(w.inner) + '">' + inner + '</div>' +
      '<div class="wn" contenteditable="true" spellcheck="false">' + esc(note || '') + '</div>' +
      '<button class="wx" title="Remove">×</button><div class="wg" title="Drag to resize"></div></div>';
  }
  function loadPalette(then) {
    if (then) onLoaded.push(then);
    if (palette) { renderPalette(); onLoaded.splice(0).forEach(function (f) { f(); }); return; }
    if (loading) return; loading = true;
    /* A product with a page of its own specimens lends them to the Add tab.
       Without one the wireframe shelf stands alone, which needs nothing and
       is the case on a new project. */
    var systemPage = (window.StudioConfig && window.StudioConfig.systemPage) || '';
    if (!systemPage) { palette = []; renderPalette(); onLoaded.splice(0).forEach(function (f) { f(); }); return; }
    /* How the page marks a block (an id that starts with c-, a title in its
       h4, specimens as the children of its first .row), the stylesheet that
       dresses a specimen away from home, and the ground they are drawn for. */
    var SYS = window.StudioConfig || {};
    var blockSel = SYS.systemSelector || '.cmp[id^="c-"]';
    var sysCss = SYS.systemCss || '/studio/components.css';
    var sysDark = SYS.systemGround === 'dark';
    fetch(systemPage, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      palette = [];
      /* A specimen's words as a reader would see them: a space between
         elements, nothing from what is hidden from a screen reader, and its
         label when it has no words of its own (an icon button). */
      function wordsOf(el) {
        var out = [], walk = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (var n = walk.nextNode(); n; n = walk.nextNode()) if (!n.parentElement.closest('[aria-hidden="true"]')) out.push(n.nodeValue);
        return out.join(' ').replace(/\s+/g, ' ').trim() || el.getAttribute('aria-label') || '';
      }
      [].forEach.call(doc.querySelectorAll(blockSel), function (c) {
        var title = (c.querySelector('h4') || {}).textContent || c.id;
        var row = c.querySelector('.row'); if (!row) return;
        [].forEach.call(row.children, function (sp, i) {
          if (!sp.outerHTML || sp.tagName === 'SCRIPT') return;
          var name = title.trim() + (row.children.length > 1 ? ' · ' + (wordsOf(sp).slice(0, 22) || (i + 1)) : '');
          palette.push({ id: c.id + '-' + i, name: name, html: sp.outerHTML, dark: sysDark || /dark|night|inverse/.test(sp.className) });
        });
      });
      /* The system page already wears its own clothes; everywhere else the
         specimens need theirs brought in, once. */
      var onSystemPage = new URL(systemPage, location.href).pathname.replace(/\/+$/, '') === location.pathname.replace(/\/+$/, '');
      if (!onSystemPage && !document.querySelector('link[href*="app.css"]') && !document.querySelector('link[href="' + sysCss + '"]') && !document.getElementById('studio-dscss')) {
        var l = document.createElement('link'); l.id = 'studio-dscss'; l.rel = 'stylesheet'; l.href = sysCss; document.head.appendChild(l);
      }
      loading = false; renderPalette(); onLoaded.splice(0).forEach(function (f) { f(); });
    }).catch(function () { loading = false; palette = []; renderPalette(); });
  }
  function renderPalette() {
    var box = document.getElementById('cmppal');
    box.innerHTML =
      '<div class="c-shelf" data-shelf="wire"><h6>Wireframe</h6><i>plain blocks, for what is not designed yet</i></div><div class="c-pal">' +
      WIRES.map(function (w) { return '<div class="c-palc c-wire" draggable="true" data-id="wire-' + esc(w.id) + '" data-shelf="wire" data-name="' + esc(w.name) + ' wireframe" title="Drag onto the page, or click to add"><div class="c-pv"><div class="wmini">' + esc(w.name) + '</div></div><span class="t">' + esc(w.name) + '</span></div>'; }).join('') + '</div>' +
      '<div class="c-shelf" data-shelf="sys"><h6>From the system</h6><i>' + (palette && palette.length ? palette.length + ' specimens, from the design portal' : 'the design portal could not be read') + '</i></div><div class="c-pal">' +
      (palette || []).map(function (p) { return '<div class="c-palc" draggable="true" data-id="' + esc(p.id) + '" data-shelf="sys" data-name="' + esc(p.name) + '" title="Drag onto the page, or click to add"><div class="c-pv' + (p.dark ? '" data-dark="1' : '') + '"><div class="spec">' + p.html + '</div></div><span class="t">' + esc(p.name) + '</span></div>'; }).join('') + '</div>';
    if (q) search();
  }
  function byId(id) { if (id.indexOf('wire-') === 0) return wireItem(id.slice(5)); return (palette || []).filter(function (p) { return p.id === id; })[0]; }
  var pal = document.getElementById('cmppal');
  pal.addEventListener('dragstart', function (e) {
    var c = e.target.closest('.c-palc'); if (!c) return;
    dragging = byId(c.getAttribute('data-id')); e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', dragging ? dragging.name : '');
    root.classList.add('cmp-adding');
  });
  pal.addEventListener('dragend', function () { dragging = null; dropLine.hidden = true; root.classList.remove('cmp-adding'); });
  function addFromShelf(p) {
    var anchor = picked || document.querySelector('.screen.on .col, .screen.on, main, body > section:not(.studio-imported)');
    if (!anchor) return;
    insertComponent(p, anchor, picked ? 'after' : 'append', true);
  }
  pal.addEventListener('click', function (e) { var c = e.target.closest('.c-palc'); if (!c) return; var p = byId(c.getAttribute('data-id')); if (p) addFromShelf(p); });
  /* something already on the page, picked up to be moved */
  var moving = null;
  document.addEventListener('dragstart', function (e) {
    var el = e.target.closest && e.target.closest('[data-aid]'); if (!el || dragging) return;
    if (e.target.closest('.wn,.wl b')) { e.preventDefault(); return; }       /* typing in a wireframe is not dragging it */
    moving = el; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'move'); } catch (err) {}
    root.classList.add('cmp-adding'); el.style.opacity = '.45';
  }, true);
  document.addEventListener('dragend', function () {
    if (moving) { moving.style.opacity = ''; moving = null; }
    dropAt = null; dropLine.hidden = true; root.classList.remove('cmp-adding');
  }, true);
  document.addEventListener('dragover', function (e) {
    if (!dragging && !moving) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOurs(el) || (moving && (el === moving || moving.contains(el)))) { dropLine.hidden = true; dropAt = null; return; }
    e.preventDefault(); e.dataTransfer.dropEffect = moving ? 'move' : 'copy';
    var host = el; while (host && host !== document.body && (getComputedStyle(host).display === 'inline' || /^(SPAN|B|I|EM|STRONG|SVG|PATH|IMG|LABEL|SMALL|CODE)$/.test(host.tagName))) host = host.parentElement;
    var w = host.closest('.studio-wire'); if (w) host = w;
    var r = host.getBoundingClientRect(), afterIt = e.clientY > r.top + r.height / 2;
    dropAt = { el: host, where: afterIt ? 'after' : 'before' };
    dropLine.hidden = false; dropLine.style.left = r.left + 'px'; dropLine.style.width = r.width + 'px'; dropLine.style.top = (afterIt ? r.bottom : r.top) + 'px';
  }, true);
  document.addEventListener('drop', function (e) {
    if ((!dragging && !moving) || !dropAt) return;
    e.preventDefault(); e.stopPropagation();
    if (moving) {
      var a = entryOf(moving);
      if (dropAt.where === 'before') dropAt.el.parentNode.insertBefore(moving, dropAt.el); else dropAt.el.parentNode.insertBefore(moving, dropAt.el.nextSibling);
      if (a) { a.anchor = fullPath(dropAt.el); a.where = dropAt.where; keep(K.adds, additions); }
      moving.style.opacity = ''; moving = null;
    } else {
      insertComponent(dragging, dropAt.el, dropAt.where, true);
      dragging = null;
    }
    dropAt = null; dropLine.hidden = true; root.classList.remove('cmp-adding');
  }, true);
  function insertComponent(p, anchor, where, remember, entry) {
    var el;
    if (p.wire) {
      var tmp = document.createElement('div'); tmp.innerHTML = wireHTML(p.wire, entry && entry.label, entry && entry.note, entry && entry.h); el = tmp.firstElementChild;
    } else {
      var wrap = document.createElement('div'); wrap.className = 'spec studio-added'; wrap.innerHTML = p.html;
      el = wrap.children.length === 1 ? wrap.firstElementChild : wrap;
      if (el !== wrap) el.classList.add('studio-added');
    }
    el.setAttribute('data-added', p.id);
    /* what was added can be picked up and moved: the whole thing is the handle */
    el.setAttribute('draggable', 'true'); el.title = (el.title ? el.title + ' · ' : '') + 'Drag to move';
    var aid = entry ? entry.aid : uid(); el.setAttribute('data-aid', aid);
    if (where === 'append') anchor.appendChild(el);
    else if (where === 'before') anchor.parentNode.insertBefore(el, anchor);
    else anchor.parentNode.insertBefore(el, anchor.nextSibling);
    if (remember) {
      additions.push({ aid: aid, screen: screenId(), anchor: fullPath(anchor), where: where, id: p.id, kind: p.wire ? 'wire' : 'component', html: p.wire ? '' : p.html, name: p.name, label: p.wire ? p.wire.name : '', note: '', h: p.wire ? p.wire.h : 0, at: new Date().toISOString() });
      keep(K.adds, additions); paintStatus();
    }
    if (!entry) { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); if (p.wire) after(350, function () { var n = el.querySelector('.wn'); if (n) n.focus(); }); }
    return el;
  }
  function entryOf(el) { var aid = el.getAttribute('data-aid'); return additions.filter(function (a) { return a.aid === aid; })[0]; }
  document.addEventListener('input', function (e) {
    var w = e.target.closest('.studio-wire'); if (!w) return;
    var a = entryOf(w); if (!a) return;
    a.label = w.querySelector('.wl b').textContent.trim(); a.note = w.querySelector('.wn').textContent.trim(); keep(K.adds, additions);
  });
  document.addEventListener('click', function (e) {
    var x = e.target.closest('.studio-wire .wx'); if (!x) return;
    e.preventDefault(); e.stopPropagation();
    var w = x.closest('.studio-wire'), aid = w.getAttribute('data-aid');
    additions = additions.filter(function (a) { return a.aid !== aid; }); keep(K.adds, additions); w.remove(); paintStatus();
  }, true);
  document.addEventListener('mousedown', function (e) {
    var g = e.target.closest('.studio-wire .wg'); if (!g) return;
    e.preventDefault();
    var w = g.closest('.studio-wire'), y0 = e.clientY, h0 = w.getBoundingClientRect().height;
    function mv(ev) { w.style.height = Math.max(32, h0 + ev.clientY - y0) + 'px'; }
    function up() { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); var a = entryOf(w); if (a) { a.h = Math.round(w.getBoundingClientRect().height); keep(K.adds, additions); } }
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest && e.target.closest('.studio-wire .wl b')) { e.preventDefault(); e.target.blur(); } });
  function restoreAdditions() {
    var sid = screenId();
    additions.forEach(function (a) {
      if (a.screen !== sid) return;
      if (document.querySelector('[data-aid="' + a.aid + '"]')) return;
      var anchor = find(a.anchor); if (!anchor) return;
      var p = a.kind === 'wire' ? wireItem(a.id.slice(5)) : { id: a.id, html: a.html, name: a.name };
      if (p) insertComponent(p, anchor, a.where, false, a);
    });
    paintStatus();
  }
  addEventListener('hashchange', function () { after(80, restoreAdditions); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { after(120, restoreAdditions); }); else after(120, restoreAdditions);

  /* ── notes: pinned to elements, listed, copied as markdown ──────────── */
  var pins = [];
  function renderPins() {
    pins.forEach(function (p) { p.remove(); }); pins = [];
    var sid = screenId(), i = 0;
    notes.forEach(function (n, idx) {
      if (n.page !== here || n.screen !== sid) return;
      var el = find(n.path); if (!el) return;
      var pin = document.createElement('button'); pin.className = 'cmp-pin'; pin.textContent = String(++i); pin.title = n.text; pin.__el = el; pin.__idx = idx;
      pin.addEventListener('click', function () { if (!open) toggle(); showTab('notes'); var li = document.querySelector('.cmp .c-notes li[data-idx="' + idx + '"]'); if (li) { li.scrollIntoView({ block: 'center' }); li.style.background = '#1A1A1E'; after(900, function () { li.style.background = ''; }); } });
      document.body.appendChild(pin); pins.push(pin);
    });
    placePins();
  }
  function placePins() {
    pins.forEach(function (p) { var r = p.__el.getBoundingClientRect(); var on = r.width || r.height; p.hidden = !on; p.style.left = (r.right - 4) + 'px'; p.style.top = (r.top + 4) + 'px'; });
  }
  var placing = false;
  function queuePlace() { if (placing) return; placing = true; requestAnimationFrame(function () { placing = false; placePins(); }); }
  addEventListener('scroll', queuePlace, true); addEventListener('resize', queuePlace);
  addEventListener('hashchange', function () { after(120, renderPins); });
  function renderNotes() {
    var box = document.getElementById('cmpnotes');
    if (!notes.length) { box.innerHTML = '<div class="c-empty"><b>No notes yet</b>Pick an element, press Pin a note, say what should change. It shows as a numbered pin on the page and lands here.</div>'; return; }
    var sid = screenId(), num = 0;
    box.innerHTML = '<div class="c-act" style="margin:0 0 8px"><button class="c-prim" data-n="md">Copy as markdown</button></div><ul>' +
      notes.map(function (n, idx) {
        var local = n.page === here && n.screen === sid; if (local) num++;
        return '<li data-idx="' + idx + '"><span class="n' + (local ? '' : ' away') + '">' + (local ? num : '·') + '</span><div><div class="c-txt">' + esc(n.text) + '</div><small>' + esc(n.comp ? n.comp + ' · ' : '') + '<code>' + esc(n.sel) + '</code></small><small>' + esc(n.page) + (n.screen !== 'page' ? '#' + esc(n.screen) : '') + ' · ' + esc(n.at.slice(0, 10)) + '</small></div><button data-rm="' + idx + '" title="Remove">×</button></li>';
      }).join('') + '</ul>';
  }
  function notesMarkdown() {
    var byPage = {};
    notes.forEach(function (n) { var k = n.page + (n.screen !== 'page' ? '#' + n.screen : ''); (byPage[k] = byPage[k] || []).push(n); });
    return Object.keys(byPage).map(function (k) {
      return '### ' + k + '\n' + byPage[k].map(function (n) { return '- ' + (n.comp ? '**' + n.comp + '** ' : '') + '`' + n.sel + '` — ' + n.text; }).join('\n');
    }).join('\n\n');
  }
  document.getElementById('cmpnotes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-rm')) { notes.splice(+b.getAttribute('data-rm'), 1); keep(K.notes, notes); renderNotes(); renderPins(); paintStatus(); }
    if (b.getAttribute('data-n') === 'md') { navigator.clipboard && navigator.clipboard.writeText('# Notes on the prototype\n\n' + notesMarkdown() + '\n'); said(b, 'Copied'); }
  });
  after(200, renderPins);

  /* ── the brief: everything done here, for an agent ──────────────────── */
  function agentMarkdown() {
    var out = ['# Changes to the prototype', '', 'Page: `' + here + '` · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '. Made in the Components tool; apply them to the source.', ''];
    var tk = Object.keys(tokens).sort();
    if (tk.length) { out.push('## Tokens'); tk.forEach(function (k) { var base = (tokenList || []).filter(function (t) { return t.name === k; })[0]; out.push('- `' + k + '`: ' + tokens[k] + (base ? ' (was ' + base.value + ')' : '')); }); out.push(''); }
    var pr = PRESETS.filter(function (p) { return presets[p.id]; });
    if (pr.length) { out.push('## Choices'); pr.forEach(function (p) { var o = presetOption(p); out.push('- ' + p.name + ': **' + o[1] + '** (' + p.note + ')'); }); out.push(''); }
    var rk = Object.keys(rules);
    if (rk.length) {
      out.push('## Component rules');
      rk.forEach(function (sel) {
        var name = (allComponents().filter(function (c) { return c.sel.split(',')[0].trim() === sel; })[0] || {}).name;
        out.push('- ' + (name ? '**' + name + '** ' : '') + '`' + sel + '`');
        Object.keys(rules[sel]).forEach(function (p) { var was = bases[sel] && bases[sel][p]; out.push('  - ' + p + ': ' + rules[sel][p] + (was ? ' (was ' + was + ')' : '')); });
      });
      out.push('');
    }
    if (rawCSS) { out.push('## Hand-edited CSS', '', '```css', rawCSS, '```', ''); }
    var comps = additions.filter(function (a) { return a.kind !== 'wire'; }), wires = additions.filter(function (a) { return a.kind === 'wire'; });
    if (comps.length) { out.push('## Components added'); comps.forEach(function (a) { out.push('- **' + a.name + '** ' + a.where + ' `' + a.anchor + '` on screen `' + a.screen + '`'); }); out.push(''); }
    if (wires.length) {
      out.push('## Wireframes — blocks to design and build');
      wires.forEach(function (a) { out.push('- **' + (a.label || a.name) + '** (' + a.name.toLowerCase() + ', ~' + a.h + 'px tall) ' + a.where + ' `' + a.anchor + '` on screen `' + a.screen + '`' + (a.note ? ' — ' + a.note : '')); });
      out.push('');
    }
    if (added.length) { out.push('## Elements marked as components'); added.forEach(function (a) { out.push('- **' + a.name + '** `' + a.sel + '` (found on ' + a.page + ')'); }); out.push(''); }
    if (notes.length) { out.push('## Notes', '', notesMarkdown(), ''); }
    var css = rawCSS || generatedCSS();
    if (css) out.push('## The same changes as CSS', '', '```css', css, '```', '');
    if (out.length <= 4) out.push('_Nothing changed yet._');
    return out.join('\n');
  }

  /* ── the foot ───────────────────────────────────────────────────────── */
  var more = document.getElementById('cmpmore');
  panel.querySelector('.c-foot').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'more') { more.hidden = !more.hidden; return; }
    more.hidden = true;
    if (act === 'undo') undo();
    if (act === 'agent') { navigator.clipboard && navigator.clipboard.writeText(agentMarkdown()); said(b, 'Copied the brief'); }
    if (act === 'copy') { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify({ tokens: tokens, presets: presets, rules: rules, bases: bases, css: rawCSS || generatedCSS(), added: added, additions: additions, notes: notes }, null, 2)); }
    if (act === 'reset') {
      if (!confirm('Forget every token, choice, rule and hand-edited CSS on this browser? Notes and what was added stay.')) return;
      mark('reset'); presets = {}; tokens = {}; rules = {}; bases = {}; rawCSS = '';
      persist(); if (tab === 'design') renderDesign(); if (picked) renderInspect();
    }
    if (act === 'clear') {
      var sid = screenId(), mine = additions.filter(function (a) { return a.screen === sid; });
      if (!mine.length || !confirm('Remove the ' + mine.length + ' component' + (mine.length === 1 ? '' : 's') + ' and wireframe' + (mine.length === 1 ? '' : 's') + ' added to this screen?')) return;
      mine.forEach(function (a) { var el = document.querySelector('[data-aid="' + a.aid + '"]'); if (el) el.remove(); });
      additions = additions.filter(function (a) { return a.screen !== sid; }); keep(K.adds, additions); paintStatus();
    }
  });
  document.addEventListener('click', function (e) { if (!more.hidden && !e.target.closest('.cmp .c-foot')) more.hidden = true; });

  /* ── the button in the ribbon ───────────────────────────────────────── */
  function toggle() {
    open = !open; panel.hidden = !open;
    document.getElementById('cmpbtn').setAttribute('aria-pressed', open ? 'true' : 'false');
    if (open) { paintStatus(); showTab(tab); if (!picked && tab === 'inspect') setInspect(true); }   /* opened with nothing picked: you are here to pick */
    else { setInspect(false); if (picked) picked.classList.remove('cmp-picked'); }
  }
  function launcher() {
    var nav = document.querySelector('.ribbon nav'); if (!nav) return false;
    if (document.getElementById('cmpbtn')) return true;
    var b = document.createElement('button'); b.id = 'cmpbtn'; b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = 'Components<span class="wip">DS</span>'; b.title = 'Find, inspect and tune components; add real ones or wireframes; pin notes; brief an agent';
    b.addEventListener('click', toggle); nav.insertBefore(b, nav.firstChild); return true;
  }
  if (!launcher()) { document.addEventListener('DOMContentLoaded', launcher); after(0, launcher); after(400, launcher); }
  paintStatus();
  window.StudioComponents = { toggle: toggle, tab: showTab, pick: pick, undo: undo, presets: function () { return presets; }, tokens: function () { return tokens; }, rules: function () { return rules; }, notes: function () { return notes; }, additions: function () { return additions; }, css: generatedCSS, brief: agentMarkdown };
})();
