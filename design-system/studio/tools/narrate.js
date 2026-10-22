/* Record — author a walkthrough by performing one.
 *
 * Agentation's insight is that you never describe the element, you point at
 * it. This is that, for time: you do not write a storyboard, you do the walk
 * and the storyboard falls out. Press record, use the prototype the way you
 * would explain it to somebody, and every click, keystroke and scroll is
 * written down as a replayable action. A screen change closes one shot and
 * opens the next, so the shape of the recording is the shape of the tour.
 *
 * What comes out is the board that .claude/skills/studio-walkthrough takes:
 * copy it, hand it to the agent, and it is filmed, narrated and captioned.
 * Same copy-into-the-agent handoff Agentation uses, for the same reason —
 * the thing that renders it is not in the browser.
 *
 * Loaded from the ribbon and inert until pressed. Exposes window.StudioNarrate.
 */
(function () {
  'use strict';

  /* Carry whatever version the page put on this script over to the
     stylesheet, so the two never load from different builds. */
  var CSS = '/studio/narrate.css' + (function () {
    var me = document.currentScript && document.currentScript.src || '';
    var m = me.match(/[?&]v=([^&]+)/);
    return m ? '?v=' + m[1] : '';
  })();
  var KEY = 'studio-reel-board';
  var WPS = 2.9;                 /* words a second — matches the skill */

  var on = false, rec = false, mounted = false;
  var bar = null, panel = null, tip = null, hit = null;
  var board = load();
  var t0 = 0, tick = null, navWatch = null;

  /* ── icons ──────────────────────────────────────────────────────────── */
  /* One grammar for every icon: a 24 box, a 1.6 stroke, round joins, and
     nothing drawn outside 3–21, so they hold the same optical size in a
     34px button. The two that are solid — the record dot and the stop
     square — are solid on purpose, because they are states rather than
     objects. A stroked play triangle sitting among them was the tell. */
  function svg(d, extra) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + d + (extra || '') + '</svg>';
  }
  function solid(d, w) {
    return '<svg viewBox="0 0 24 24" width="' + (w || 15) + '" height="' + (w || 15) +
      '" fill="currentColor" aria-hidden="true">' + d + '</svg>';
  }
  var I = {
    rec:   solid('<circle cx="12" cy="12" r="6.5"/>', 14),
    stop:  solid('<rect x="6" y="6" width="12" height="12" rx="2.5"/>', 13),
    play:  solid('<path d="M8 5.4a.9.9 0 0 1 1.36-.77l9.2 6.6a.9.9 0 0 1 0 1.54' +
                 'l-9.2 6.6A.9.9 0 0 1 8 18.6z"/>', 14),
    pause: solid('<rect x="7" y="5.5" width="3.6" height="13" rx="1.4"/>' +
                 '<rect x="13.4" y="5.5" width="3.6" height="13" rx="1.4"/>', 14),

    split: svg('<path d="M12 3.5v6M12 14.5v6"/><circle cx="12" cy="12" r="2.2"/>'),
    list:  svg('<path d="M9 6.5h11M9 12h11M9 17.5h11"/>' +
               '<path d="M4.6 6.5h.01M4.6 12h.01M4.6 17.5h.01"/>'),
    copy:  svg('<rect x="9" y="9" width="11.5" height="11.5" rx="2.4"/>' +
               '<path d="M5.4 15H5a1.6 1.6 0 0 1-1.6-1.6V5A1.6 1.6 0 0 1 5 3.4h8.4' +
               'A1.6 1.6 0 0 1 15 5v.4"/>'),
    trash: svg('<path d="M4 6.5h16"/>' +
               '<path d="M9.6 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.2a1.3 1.3 0 0 1 1.3 1.3v1.7"/>' +
               '<path d="M6.4 6.5 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5' +
               'l.9-12.5"/>'),
    x:     svg('<path d="M17.5 6.5 6.5 17.5M6.5 6.5l11 11"/>'),

    /* a cog that survives 16px: one ring and eight teeth, not twelve arcs */
    gear:  svg('<circle cx="12" cy="12" r="3.1"/>' +
               '<path d="M12 3.4v2.3M12 18.3v2.3M20.6 12h-2.3M5.7 12H3.4' +
               'M18.08 5.92l-1.63 1.63M7.55 16.45l-1.63 1.63' +
               'M18.08 18.08l-1.63-1.63M7.55 7.55 5.92 5.92"/>'),
    help:  svg('<circle cx="12" cy="12" r="8.6"/>' +
               '<path d="M9.7 9.5a2.35 2.35 0 1 1 3.1 2.23c-.55.2-.85.72-.85 1.3v.42"/>' +
               '<path d="M11.95 16.6h.01"/>'),

    /* the three preview sizes, on one set of bounds so they read as a scale */
    szS:   svg('<rect x="7.5" y="8.5" width="9" height="7" rx="1.6"/>'),
    szM:   svg('<rect x="4.5" y="7" width="15" height="10" rx="1.8"/>'),
    szL:   svg('<rect x="3" y="5.5" width="18" height="13" rx="2"/>'),
    insp:  svg('<rect x="3" y="5.5" width="18" height="13" rx="2"/>' +
               '<path d="M15 5.5v13"/>'),

    pad:   svg('<rect x="3.5" y="3.5" width="17" height="17" rx="2.4"/>' +
               '<rect x="8" y="8" width="8" height="8" rx="1.4" stroke-dasharray="2.4 2.2"/>'),
    radius: svg('<path d="M20.5 3.5H10A6.5 6.5 0 0 0 3.5 10v10.5"/>'),
    shadow: svg('<rect x="3.5" y="3.5" width="12.5" height="12.5" rx="2.4"/>' +
                '<path d="M8.5 20.5h9.6a2.4 2.4 0 0 0 2.4-2.4V8.5"/>'),
    pos:   svg('<circle cx="12" cy="12" r="2.6"/>' +
               '<path d="M12 3.4v3.6M12 17v3.6M3.4 12h3.6M17 12h3.6"/>'),
    /* CC was drawn at the same 16px as every other glyph and read as a
       smudge, because it is the only one with two letterforms inside a box.
       It gets the room instead of the box getting smaller. */
    cc:    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" ' +
           'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
           'stroke-linejoin="round" aria-hidden="true">' +
           '<rect x="1.8" y="4.4" width="20.4" height="15.2" rx="3"/>' +
           '<path d="M10 10a3 3 0 1 0 0 4M18 10a3 3 0 1 0 0 4"/></svg>',
    eye:   svg('<path d="M2.2 12S5.9 5.4 12 5.4 21.8 12 21.8 12 18.1 18.6 12 18.6 ' +
               '2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3.1"/>'),
    pen:   svg('<path d="M4 20.2l.9-3.9L16.1 5.1a2 2 0 0 1 2.8 0l1.3 1.3a2 2 0 0 1 ' +
               '0 2.8L9 20.4l-3.9.9z"/><path d="M14.6 6.6 18.7 10.7"/>'),
    film:  svg('<rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2.6"/>' +
               '<path d="M8 4.6v14.8M16 4.6v14.8M2.6 12h18.8"/>'),
    mic:   svg('<rect x="9.4" y="3" width="5.2" height="10.2" rx="2.6"/>' +
               '<path d="M6.2 11.2a5.8 5.8 0 0 0 11.6 0M12 17v4"/>'),
    wand:  svg('<path d="M4.5 19.5 15 9"/>' +
               '<path d="M17.4 3.4l.78 2.02 2.02.78-2.02.78-.78 2.02-.78-2.02-2.02-.78 2.02-.78z"/>' +
               '<path d="M8.4 3.6l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z"/>'),
    dl:    svg('<path d="M12 3.6v10.8M7.9 10.6 12 14.7l4.1-4.1"/>' +
               '<path d="M4.4 17v1.9a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6V17"/>'),
    tl:    svg('<rect x="3" y="5" width="18" height="14" rx="2.4"/>' +
               '<path d="M3 9.6h18M8.4 9.6V19M14.4 9.6V19"/>'),
  };

  /* ── the board ──────────────────────────────────────────────────────── */
  function blank() {
    return { title: 'Walkthrough', slug: 'walkthrough', target_seconds: 30, shots: [] };
  }

  /* Everything the render needs that is not a shot. Kept separately from the
     board so clearing the storyboard does not throw away how you like it. */
  var SKEY = 'studio-reel-settings';
  function defaults() {
    return {
      cursor: true,          /* draw the pointer in the recording */
      theme: 'dark',         /* the tool's own skin */
      zoom: true,            /* push in toward whatever is clicked */
      reveals: 'none',       /* none | ring | spot — mark what is being pressed */
      zoomScale: 1.30,       /* how close */
      zoomMs: 420,           /* how snappy */
      trans: 'cut',          /* the default join; a shot can override it */
      transMs: 400,
      capSize: 22,           /* caption size, px at 1440 wide */
      capPos: 'bottom',
      capStyle: 'plate',     /* plate | shadow | band | third | keynote */
      capFont: 'system',     /* the product's face, or one from Google */
      capWeight: 500,
      capInk: '#FFFFFF',
      capBurn: false,        /* bake them into the exports too */
      voice: 'auto',         /* auto | elevenlabs | say */
      size: 'panel',         /* preview: panel | theatre | full */
      insp: true,            /* the notes rail beside the picture */
      voiceId: '',
      timeline: false,       /* the full cut view, off until asked for */
      script: 'list',        /* list | board — the script, or the storyboard */

      /* ── the frame round the recording ───────────────────────────────
         A screen recording pasted flat on a slide looks like a support
         ticket. The same recording inset on a ground, with a radius and a
         shadow under it, reads as a product. Both are the same frames —
         this is the difference, and it is all done in the cut. */
      canvW: 1920, canvH: 1080,
      canvBg: '#101012',     /* the ground it sits on */
      canvBg2: '#2B2B33',    /* and where it goes, if it is a gradient */
      canvGrad: false,
      canvAngle: 160,        /* degrees, clockwise from straight up */
      canvPad: 5,            /* % of the shorter side */
      vidScale: 100,         /* % of the space left after padding */
      vidRadius: 12,
      vidShadow: true,
      vidShadowBlur: 60,
      vidShadowFade: 42,     /* % opacity */
      vidY: 0,               /* nudge, % of height */

      /* ── what comes out ─────────────────────────────────────────────── */
      expFile: 'mp4',        /* mp4 | mov | webm | gif */
      expCodec: 'h264',      /* h264 | hevc | vp9 */
      expQuality: 'high',    /* draft | high | max */
    };
  }
  var CANVAS_PRESETS = [
    ['1920×1080', 1920, 1080, 'Landscape'],
    ['3840×2160', 3840, 2160, '4K'],
    ['1080×1920', 1080, 1920, 'Vertical'],
    ['1080×1350', 1080, 1350, 'Portrait 4:5'],
    ['1080×1080', 1080, 1080, 'Square'],
  ];
  var cfg = (function () {
    try {
      var v = JSON.parse(localStorage.getItem(SKEY)) || {};
      var d = defaults();
      Object.keys(v).forEach(function (k) { if (k in d) d[k] = v[k]; });
      /* a stored zero is not a choice anybody made — and it is written back
         rather than only mended in memory, so it cannot come round again */
      if (!(d.canvW > 0) || !(d.canvH > 0)) {
        d.canvW = 1920; d.canvH = 1080;
        try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch (e2) {}
      }
      return d;
    } catch (e) { return defaults(); }
  })();
  function saveCfg() {
    try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {}
    applyTheme();
    paint();
  }
  function applyTheme() {
    [bar, panel, tip].forEach(function (el) {
      if (el) el.setAttribute('data-reel-theme', cfg.theme);
    });
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || blank(); }
    catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (e) {}
    paint();
  }
  function words(t) { return (String(t || '').match(/[\w’'-]+/g) || []).length; }
  function secs(t) { return words(t) / WPS; }
  function total() {
    return board.shots.reduce(function (n, s) { return n + secs(s.say) + 0.35; }, 0);
  }

  /* ── where are we ───────────────────────────────────────────────────── */
  function here() {
    return location.pathname + (location.hash || '');
  }
  function screenName() {
    var t = document.getElementById('ttl');
    var c = document.getElementById('crumb');
    var name = t ? t.textContent.trim() : '';
    var path = c ? c.textContent.replace(/\s+/g, ' ').trim() : '';
    return (path ? path + ' / ' : '') + (name || location.hash.slice(1) || '/');
  }
  function slugOf() {
    return (location.hash.slice(1) || 'screen').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  }

  /* ── a selector the recorder can find again ─────────────────────────────
     The prototype names its own controls, so ask it before inventing
     anything: data-go is a route, data-swap-to is a stage, data-target is a
     panel. Those survive a rebuild in a way that nth-child does not. Only
     when nothing is named does this fall back to structure, and it checks
     that whatever it produces matches exactly one element. */
  var NAMED = ['data-go', 'data-swap-to', 'data-target', 'data-provider',
               'data-q', 'data-stage', 'data-wiz-to', 'data-mode', 'data-tab',
               'data-dev', 'data-ground', 'data-state', 'data-group', 'data-copy',
               /* the product names its controls for shots and walkthroughs:
                  the tutorial's band, the chat's moves, the patch card */
               'data-shot'];

  function unique(sel, el) {
    try {
      var all = document.querySelectorAll(sel);
      return all.length === 1 && all[0] === el;
    } catch (e) { return false; }
  }

  function selectorFor(el) {
    if (!el || el === document.body) return null;

    /* the screen it lives on scopes everything, so two screens with the
       same control do not collide */
    var screen = el.closest('.screen');
    var scope = screen && screen.id ? '#' + screen.id + ' ' : '';

    /* The same data-go appears on the rail item and on whatever links to it
       from the page, so a bare attribute selector is often not unique. Try
       it, then try it inside the landmark the element actually sits in —
       `.side [data-go="markets-dvp"]` is still a name, and still survives a
       rebuild, where nth-of-type does not. */
    var marks = [scope, '.side ', '.ribbon ', '.top ', '.reelpanel '];
    for (var i = 0; i < NAMED.length; i++) {
      var a = NAMED[i];
      if (el.hasAttribute && el.hasAttribute(a)) {
        var v = el.getAttribute(a);
        var s = '[' + a + '="' + CSS_esc(v) + '"]';
        if (unique(s, el)) return s;
        for (var m = 0; m < marks.length; m++) {
          if (!marks[m]) continue;
          if (el.closest(marks[m].trim()) && unique(marks[m] + s, el)) return marks[m] + s;
        }
      }
    }
    if (el.id && unique('#' + CSS_esc(el.id), el)) return '#' + CSS_esc(el.id);

    /* a wizard step, a table row, a card: position within a named parent */
    var path = [], node = el, guard = 0;
    while (node && node !== document.body && guard++ < 6) {
      var part = node.tagName.toLowerCase();
      var cls = classHint(node);
      if (cls) part += cls;
      var parent = node.parentElement;
      if (parent) {
        var same = [].filter.call(parent.children, function (c) {
          return c.tagName === node.tagName;
        });
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      path.unshift(part);
      var candidate = scope + path.join(' > ');
      if (unique(candidate, el)) return candidate;
      node = parent;
    }
    return scope + path.join(' > ');
  }

  /* One class, and only one that reads like a component rather than a
     state — .btn survives, .on does not. */
  var STATEY = /^(on|open|off|cur|active|is-|has-|hidden|show|zero|lite|dark|compact|mobile)/;
  function classHint(el) {
    var list = (el.className && el.className.baseVal !== undefined)
      ? String(el.className.baseVal).split(/\s+/)
      : String(el.className || '').split(/\s+/);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c && c.length > 1 && !STATEY.test(c) && !/^reel/.test(c)) return '.' + CSS_esc(c);
    }
    return '';
  }
  function CSS_esc(v) {
    return (window.CSS && CSS.escape) ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&');
  }

  /* ── shots ──────────────────────────────────────────────────────────── */
  function current() { return board.shots[board.shots.length - 1] || null; }

  /* Two shots on one screen is fine, but they need different names — and
     the clash test has to be exact. Matching on prefix made `markets` collide
     with `markets-dvp-trade`, so the second visit to Markets came back as
     markets-2 on a board where no other shot was called markets at all. */
  function uniqueId(base, skip) {
    var taken = {};
    board.shots.forEach(function (x) { if (x !== skip) taken[x.id] = 1; });
    if (!taken[base]) return base;
    for (var n = 2; n < 99; n++) if (!taken[base + '-' + n]) return base + '-' + n;
    return base + '-' + Date.now();
  }

  function openShot() {
    var s = { id: uniqueId(slugOf()), where: screenName(), url: here(), act: [], say: '' };
    board.shots.push(s);
    save();
    return s;
  }

  /* ══ scenes, from the tool ═══════════════════════════════════════════
     The walk gives you the product being used. These are the shots that
     cannot be recorded because nobody is using anything: the title at the
     front, the card that says a new part has started, the sentence the
     screen cannot make, a component held up on its own, the end card.

     They are ordinary shots on the board with a `scene` on them instead of
     a `url`, so everything downstream — the estimate, the voice, the
     timing, the frame, the joins, the notes — treats them like any other.
     What they cost is a re-record, because the walk is a different walk
     once there is a new shot in it. */
  var SCENES = {
    open:    ['Opening', 'A title at the front',
              { kind: 'open', title: 'What changed', sub: '' }],
    section: ['Section', 'A card between parts',
              { kind: 'section', n: '', title: 'Next', sub: '' }],
    say:     ['Statement', 'One line the screen cannot say',
              { kind: 'say', align: 'centre', title: 'Both legs move.' }],
    lift:    ['UI element', 'Hold one component up on its own',
              { kind: 'lift', label: '', from: '', pick: '' }],
    end:     ['End card', 'What to do next',
              { kind: 'end', align: 'centre', title: 'Have a look.', sub: '' }],
  };

  function addScene(kind, at) {
    var def = SCENES[kind];
    if (!def) return;
    var s = {
      id: uniqueId(kind === 'open' ? 'intro' : kind === 'end' ? 'outro' : kind),
      where: def[0], url: '', act: [], say: '',
      scene: JSON.parse(JSON.stringify(def[2])),
    };
    if (kind === 'lift') s.scene.from = here();
    var i = (at === undefined || at === null) ? board.shots.length : at;
    board.shots.splice(Math.max(0, Math.min(board.shots.length, i)), 0, s);
    save();
    return s;
  }

  /* Picking a component is the same act as recording a click on it, so it
     is the same code: hover to highlight, click to take the selector. */
  var picking = null;
  function pickElement(done) {
    if (picking) return;
    picking = function (e) {
      var el = e.target;
      if (!el || panel.contains(el) || bar.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      stopPicking();
      /* A label is written, not scraped. The first forty characters of a
         component's text is "PrivyOFF RAMP DEMO WALLET US$3,884.79 Ad",
         which is worse than the empty field it would be filling. */
      done(selectorFor(el), (el.getAttribute('aria-label') || '').trim());
    };
    document.addEventListener('click', picking, true);
    document.body.classList.add('reel-picking-el');
    toast('Pick a component', 'Click the thing you want held up. Escape to stop.');
  }
  function stopPicking() {
    if (!picking) return;
    document.removeEventListener('click', picking, true);
    picking = null;
    document.body.classList.remove('reel-picking-el');
  }

  function push(act) {
    if (!rec) return;
    var s = current() || openShot();
    /* a scroll after a scroll is one scroll to wherever it ended up */
    var last = s.act[s.act.length - 1];
    if (last && act.scroll !== undefined && last.scroll !== undefined) {
      last.scroll = act.scroll;
      save();
      return;
    }
    s.act.push(act);
    save();
  }

  /* ── watching ───────────────────────────────────────────────────────── */
  /* Everything is capture-phase, so the action is written down before the
     app acts on it — a click that navigates has to belong to the shot it
     was made in, not the one it opens. */
  var CLICKABLE = 'button, a[href], [data-go], [role="tab"], [role="option"], ' +
                  'tr.click, label, summary, .row.click, .chip-q, .qa, .pk, .stat, .copy';

  function onClick(e) {
    if (!rec || inTool(e.target)) return;
    var el = e.target.closest(CLICKABLE);
    if (!el) return;
    var s = selectorFor(el);
    if (!s) return;
    flash(el);
    push({ click: s, ms: 520, _label: (el.textContent || '').trim().slice(0, 40) });
  }

  var typing = null;
  function onKey(e) {
    if (!rec || inTool(e.target)) return;
    var mod = e.metaKey || e.ctrlKey || e.altKey;
    var named = { Enter: 1, Escape: 1, Tab: 1, ArrowDown: 1, ArrowUp: 1,
                  ArrowLeft: 1, ArrowRight: 1 };
    if (mod || named[e.key]) {
      flushType();
      var name = (e.metaKey ? 'Meta+' : '') + (e.ctrlKey ? 'Ctrl+' : '') +
                 (e.shiftKey && e.key.length === 1 ? 'Shift+' : '') +
                 (e.altKey ? 'Alt+' : '') + e.key;
      push({ key: name });
      return;
    }
    /* printable, into a field: collected and written once as a `type` */
    var f = e.target;
    if (e.key.length === 1 && f && /^(INPUT|TEXTAREA)$/.test(f.tagName)) {
      if (!typing || typing.el !== f) { flushType(); typing = { el: f, text: '' }; }
      typing.text += e.key;
      clearTimeout(flushType._t);
      flushType._t = setTimeout(flushType, 900);
    }
  }
  function flushType() {
    clearTimeout(flushType._t);
    if (!typing || !typing.text) { typing = null; return; }
    var into = selectorFor(typing.el);
    push({ type: typing.text, into: into, per: 95 });
    flash(typing.el);
    typing = null;
  }

  var scrollTimer = null;
  function onScroll(e) {
    if (!rec) return;
    var el = e.target;
    if (!el || !el.closest || inTool(el)) return;
    var main = el.classList && el.classList.contains('main') ? el : null;
    if (!main) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      push({ scroll: Math.round(main.scrollTop), ms: 640, in: '.main' });
    }, 220);
  }

  var lastUrl = null;
  function onNav() {
    if (!rec) return;
    var u = here();
    if (u === lastUrl) return;
    lastUrl = u;
    flushType();
    /* The title and breadcrumb are written by the router on the same tick,
       so read the name a frame later or every shot is called by the screen
       it came from. */
    setTimeout(nameShot, 80);
    /* a screen change ends the shot and starts the next one: the click that
       took you here stays behind, which is what makes the board replay */
    var s = current();
    if (!s || s.act.length || s.say) openShot();
    else { s.url = u; save(); }
  }
  function nameShot() {
    var s = current();
    if (!s) return;
    s.url = here();
    s.where = screenName();
    s.id = uniqueId(slugOf(), s);
    save();
  }

  function inTool(el) {
    return !!(el && el.closest && el.closest('.reelbar, .reelpanel, .reeltip'));
  }

  function flash(el) {
    if (!hit) return;
    var r = el.getBoundingClientRect();
    hit.style.left = (r.left - 3) + 'px';
    hit.style.top = (r.top - 3) + 'px';
    hit.style.width = (r.width + 6) + 'px';
    hit.style.height = (r.height + 6) + 'px';
    hit.classList.add('on');
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { hit.classList.remove('on'); }, 260);
  }

  /* ── recording ──────────────────────────────────────────────────────── */
  function startRec() {
    rec = true;
    lastUrl = here();
    if (!current() || current().act.length || current().say) openShot();
    t0 = Date.now();
    bar.classList.add('on');
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', onScroll, true);
    /* The prototype's router pushes state; it does not change the hash from
       under itself, so hashchange never fires on an internal navigation and
       every shot ended up as one shot. Watching the address covers pushState,
       replaceState, popstate and a typed hash with one mechanism. */
    addEventListener('popstate', onNav);
    addEventListener('hashchange', onNav);
    navWatch = setInterval(onNav, 220);
    tick = setInterval(clock, 200);
    clock();
    paint();
    toast('Recording', 'Use the prototype. Every click and keystroke is written down.');
  }
  function stopRec() {
    rec = false;
    flushType();
    bar.classList.remove('on');
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('scroll', onScroll, true);
    removeEventListener('popstate', onNav);
    removeEventListener('hashchange', onNav);
    clearInterval(navWatch);
    clearInterval(tick);
    paint();
    if (board.shots.length) openPanel(true);
  }
  function clock() {
    var el = bar.querySelector('.reelnow span');
    if (!el) return;
    var s = (Date.now() - t0) / 1000;
    el.textContent = Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  /* ── the board, as the skill wants it ───────────────────────────────── */
  function asBoard() {
    return {
      title: board.title,
      subtitle: '',
      slug: board.slug,
      base: location.origin + '/',
      target_seconds: board.target_seconds,
      width: 1440, height: 900, scale: 2,
      formats: [cfg.expFile || 'mp4'],
      codec: cfg.expCodec,
      quality: cfg.expQuality,
      canvas: { w: +cfg.canvW, h: +cfg.canvH, bg: cfg.canvBg, pad: +cfg.canvPad,
                bg2: cfg.canvGrad ? cfg.canvBg2 : null,
                angle: cfg.canvGrad ? +cfg.canvAngle : null },
      video: { scale: +cfg.vidScale, radius: +cfg.vidRadius, y: +cfg.vidY,
               shadow: cfg.vidShadow ? { blur: +cfg.vidShadowBlur,
                                         opacity: cfg.vidShadowFade / 100 } : null },
      cursor: cfg.cursor,
      zoom: cfg.zoom ? { scale: +cfg.zoomScale, ms: +cfg.zoomMs } : null,
      reveals: cfg.reveals,
      transition: cfg.trans || 'cut',
      transition_ms: +cfg.transMs,
      captions: { size: +cfg.capSize, position: cfg.capPos, style: cfg.capStyle,
                  burn: !!cfg.capBurn, font: cfg.capFont,
                  weight: +cfg.capWeight, colour: cfg.capInk },
      voice_engine: cfg.voice,
      voice_id: cfg.voiceId || undefined,
      shots: board.shots.map(function (s, i) {
        var o = { id: s.id, say: s.say || '', url: s.url, settle: 900 };
        if (s.raw) o.raw = true;
        /* The index was used without being taken. In strict mode that is a
           ReferenceError, thrown inside the map, so asBoard never returned
           and every copy that goes through it — the storyboard, the render
           request — died before reaching the clipboard. The toast never
           appeared either, because the throw happened first: the button
           looked like it did nothing at all.
           It is guarded on the index because the first shot has nothing to
           transition from. */
        if (i && s.transition) o.transition = s.transition;
        /* a composed shot carries its scene instead of a screen to visit */
        if (s.scene) { o.scene = s.scene; delete o.url; }
        if (s.act.length) {
          o.act = s.act.map(function (a) {
            var c = {};
            Object.keys(a).forEach(function (k) { if (k[0] !== '_') c[k] = a[k]; });
            return c;
          });
        }
        return o;
      }),
    };
  }

  function copyOut() {
    /* In the editing view the thing worth copying is what you want changed,
       not the board you already sent. */
    if (view === 'preview' &&
        (pv.notes.length || Object.keys(pv.joins || {}).length)) {
      navigator.clipboard.writeText(
        'Apply these changes to the walkthrough and re-render:\n\n' + notesMarkdown()
      ).then(function () {
        toast('Copied', pv.notes.length + ' change' + (pv.notes.length > 1 ? 's' : '') +
              '. Paste it to the agent.');
      }, function () { toast('Copy blocked', 'The browser refused clipboard access.'); });
      return;
    }
    copyBoard();
  }

  function copyBoard() {
    var b = asBoard();
    var json = JSON.stringify(b, null, 2);
    var rough = (b.shots || []).filter(function (s) { return s.raw; }).length;
    var out = 'Render this walkthrough with the studio-walkthrough skill:\n\n' +
              '```json\n' + json + '\n```' +
              (rough ? '\n\n' + rough + ' line' + (rough > 1 ? 's are' : ' is') +
               ' marked `"raw": true` — those were dictated as a brief, not ' +
               'written. Rewrite them to the copy rules before recording, ' +
               'keep the meaning, and hold the length.' : '');
    navigator.clipboard.writeText(out).then(function () {
      toast('Copied', board.shots.length + ' shots. Paste it to the agent.');
    }, function () {
      toast('Copy blocked', 'The browser refused clipboard access.');
    });
  }

  /* ── how this works, in the tool ────────────────────────────────────── */
  /* ── how it works ────────────────────────────────────────────────────
     Written for somebody who has just pressed the ? and has no idea what
     they are looking at. Four steps in the order they happen, then the two
     things that surprise people: nothing is screen-grabbed, and a note is
     an instruction rather than a comment. */
  var ABOUT =
    '<div class="reel-brand"><b>Narrate</b>' +
      '<i>Walkthroughs, from the walk</i></div>' +
    '<p class="reel-lede">Annotate is for saying what is wrong with a screen. ' +
      'Narrate is for showing somebody how the thing works — you use the ' +
      'product, and what comes back is a narrated video.</p>' +
    '<ol class="reel-steps">' +
      '<li><b>Do the walk.</b> Press record and use the prototype the way you ' +
        'would explain it to somebody. Every click, keystroke and scroll is ' +
        'written down as an action that can be replayed. A change of screen ' +
        'starts a new shot; <b>Split</b> forces one where you want two shots ' +
        'on a single screen.</li>' +
      '<li><b>Write the line</b> over each shot — or dictate it, and let the ' +
        'agent write it properly. The seconds under it are what it will take ' +
        'to say, so you can see the length before anything is rendered.</li>' +
      '<li><b>Hand it over.</b> <b>Copy storyboard</b>, paste it to the agent. ' +
        'It re-drives the prototype, films it at retina, and makes the voice ' +
        'and the captions from your lines.</li>' +
      '<li><b>Watch it here</b> and pin what is wrong. Then <b>Copy the ' +
        'changes</b> and paste that back.</li>' +
    '</ol>' +

    '<div class="reel-brand2">Two things worth knowing</div>' +
    '<p class="reel-note"><b>It is filmed, not screen-grabbed.</b> The video is ' +
      'shot fresh from your storyboard in a clean browser, so it is sharp at ' +
      'any size, the pointer is drawn rather than captured, and re-rendering ' +
      'after a change of copy costs seconds instead of another take. Nothing ' +
      'in this window is recorded.</p>' +
    '<p class="reel-note"><b>A note is an instruction.</b> Every one picks a ' +
      'verb — reword this line, push in closer, hold longer, drop the shot — ' +
      'so what you copy out is a patch rather than a review, and only what ' +
      'changed is redone. A note about the picture rebuilds the cut, about ' +
      'fifteen seconds. A note about the words says that line again first. ' +
      'Only dropping or splitting a shot means filming the walk over. The ' +
      'line under the box tells you which you are asking for before you ' +
      'pin it.</p>' +

    '<div class="reel-brand2">The frame</div>' +
    '<p class="reel-note">The controls beside <b>Preview</b> set what the ' +
      'recording sits on — a canvas at any size, a ground in one colour or a ' +
      'blend, padding, corner radius, a drop shadow. That is the whole of the ' +
      'difference between a screen recording and something that looks like a ' +
      'product, and it is done in the cut, so any of it can change without ' +
      'filming again.</p>' +

    '<div class="reel-brand2">Or skip the walk</div>' +
    '<p class="reel-note"><b>Ask the agent</b> takes a sentence rather ' +
      'than a performance — say what it should cover, who it is for and how ' +
      'long, and the agent works the shots out itself. Useful for the ones ' +
      'nobody wants to rehearse: what changed this week, what we shipped ' +
      'today.</p>';

  function fieldRow(label, hint, control) {
    return '<div class="reel-field"><div class="reel-flabel"><b>' + label + '</b>' +
      (hint ? '<i>' + hint + '</i>' : '') + '</div>' + control + '</div>';
  }
  function toggleCtl(key) {
    return '<button class="reel-sw" data-cfg="' + key + '" role="switch" ' +
      'aria-checked="' + (cfg[key] ? 'true' : 'false') + '"><i></i></button>';
  }
  function rangeCtl(key, min, max, step, unit) {
    return '<span class="reel-range"><input type="range" data-cfg="' + key + '" ' +
      'min="' + min + '" max="' + max + '" step="' + step + '" value="' + cfg[key] + '">' +
      '<em data-out="' + key + '">' + cfg[key] + unit + '</em></span>';
  }
  function pickCtl(key, opts) {
    return '<span class="reel-pick">' + opts.map(function (o) {
      return '<button data-cfg="' + key + '" data-val="' + o[0] + '"' +
        (cfg[key] === o[0] ? ' aria-pressed="true"' : '') + '>' + o[1] + '</button>';
    }).join('') + '</span>';
  }

  function paintSettings() {
    var el = panel.querySelector('[data-view="settings"]');
    if (!el || el.hidden) return;
    el.innerHTML =
      '<div class="reel-group"><span class="reel-gh">Recording</span>' +
        fieldRow('Draw the pointer', 'A cursor that travels and clicks. Off for a still tour.',
                 toggleCtl('cursor')) +
        fieldRow('Push in on a click', 'The camera moves toward whatever is pressed.',
                 toggleCtl('zoom')) +
        fieldRow('Mark what is pressed',
                 'A ring round the control before it is clicked, or a ring with the rest dimmed away.',
                 pickCtl('reveals', [['none', 'Off'], ['ring', 'Ring'], ['spot', 'Spotlight']])) +
        fieldRow('How close', 'Where the push-in stops.',
                 rangeCtl('zoomScale', 1, 2, 0.05, '&times;')) +
        fieldRow('How snappy', 'How long the move takes.',
                 rangeCtl('zoomMs', 160, 900, 20, 'ms')) +
        fieldRow('At a change of screen', 'A dip gives the eye somewhere to land.',
                 pickCtl('trans', [['cut', 'Cut'], ['dissolve', 'Dissolve'],
                                   ['dip', 'Dip'], ['flash', 'Flash'],
                                   ['push', 'Push'], ['wipe', 'Wipe']])) +
        fieldRow('Join length', 'Any seam can override both',
                 rangeCtl('transMs', 100, 1200, 20, 'ms')) +
      '</div>' +
      '<div class="reel-group"><span class="reel-gh">Captions</span>' +
        fieldRow('Size', '', rangeCtl('capSize', 14, 34, 1, 'px')) +
        fieldRow('Position', '', pickCtl('capPos', [['bottom', 'Bottom'], ['top', 'Top']])) +
        fieldRow('Style', '',
                 pickCtl('capStyle', [['plate', 'Plate'], ['shadow', 'Shadow'],
                                      ['band', 'Band'], ['third', 'Lower third']])) +
        fieldRow('Burn into the export', 'Otherwise they ride alongside as a .vtt, which can be turned off and translated.',
                 toggleCtl('capBurn')) +
      '</div>' +
      '<div class="reel-group"><span class="reel-gh">Voice</span>' +
        fieldRow('Engine', 'Auto uses ElevenLabs when a key is set, and the local voice when it is not.',
                 pickCtl('voice', [['auto', 'Auto'], ['elevenlabs', 'ElevenLabs'], ['say', 'Local']])) +
        '<div class="reel-field reel-stack"><div class="reel-flabel"><b>ElevenLabs voice</b>' +
          '<i>The voice id. The key itself lives in the agent\u2019s environment, never here.</i></div>' +
          '<input class="reel-text" data-cfg="voiceId" type="text" placeholder="voice id" value="' +
            esc(cfg.voiceId) + '"></div>' +
      '</div>' +
      '<div class="reel-group"><span class="reel-gh">This tool</span>' +
        fieldRow('Theme', '', pickCtl('theme', [['dark', 'Dark'], ['light', 'Light']])) +
      '</div>';
  }

  /* ── the editing view ────────────────────────────────────────────────
     Three ways to say what is wrong, because there are three kinds of wrong.
     A moment: the pacing here. A spot: that thing, there, in the frame. A
     line: the words being said. Each note carries what the next pass needs
     to act on it without being told twice. */
  var pv = { shots: [], peaks: [], notes: [], slug: null, mode: 'time' };
  var PKEY = function () { return 'studio-reel-notes:' + pv.slug; };

  /* ── the edit vocabulary ───────────────────────────────────────────────
     Three kinds of note, and under each the things you can actually ask
     for. Free text alone cannot be applied by anything but a person, and
     a person re-reading the whole video to find out where a note lands is
     the cost this is here to remove. */
  var OPS = {
    time: [['note', 'Note only'], ['hold', 'Hold longer'], ['trim', 'Trim'],
           ['drop', 'Drop the shot'], ['reshoot', 'Re-record from here']],
    spot: [['closer', 'Zoom closer'], ['wider', 'Pull back'],
           ['nozoom', 'No push-in'], ['reveal', 'Reveal it'], ['note', 'Note only']],
    line: [['reword', 'Reword it'], ['cutline', 'Cut the line'],
           ['split', 'Split in two'], ['note', 'Note only']],
  };
  /* op → [what has to be redone, what to type, how it reads in the edit list] */
  var OPT = {
    note:    ['cut',   'What is wrong here…',                    'read it and decide'],
    hold:    ['cut',   'How much longer, and why…',              'hold this shot longer'],
    trim:    ['cut',   'What to lose…',                          'shorten this shot'],
    drop:    ['shoot', 'Why it goes…',                           'drop this shot'],
    reshoot: ['shoot', 'What to do differently…',                're-record from here'],
    closer:  ['cut',   'How close — a number, or just “closer”…', 'push in closer here'],
    wider:   ['cut',   'How wide…',                              'pull the push-in back'],
    nozoom:  ['cut',   'Why, if it matters…',                    'no push-in here'],
    reveal:  ['cut',   'What to call it…',                       'reveal this'],
    reword:  ['voice', 'The new words, as they should be said…', 'say this instead'],
    cutline: ['voice', 'Why, if it matters…',                    'cut this line'],
    split:   ['voice', 'The two lines, one per row…',            'split this into two shots'],
  };
  /* one flat map of op → the chip's own words, for the pinned cards */
  var LABEL = (function () {
    var m = {};
    Object.keys(OPS).forEach(function (k) {
      OPS[k].forEach(function (o) { m[o[0]] = o[1]; });
    });
    return m;
  })();
  var COST = {
    cut:   ['Re-cut', 'built again from frames already shot. About fifteen seconds.'],
    voice: ['Re-voice', 'the changed lines are said again, then re-cut. About half a minute.'],
    shoot: ['Re-record', 'the walk is filmed again from that point. A couple of minutes.'],
  };

  /* The preview watches one slug — the storyboard's. That is right when you
     have just recorded something and wrong every other time: a render made
     from a brief, or last week's, or the one the agent published under its
     own name, all existed and none of them could be reached. `pick`
     overrides it, and the missing state offers what is actually there. */
  function previewSlug() {
    return (pv.pick || board.slug || 'walkthrough')
      .replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  }
  /* mp4 first. Chrome decodes H.264 in hardware and scrubs it instantly;
     the VP9 we also publish throws PIPELINE_ERROR_DECODE here on any seek
     even though ffmpeg reads the same file without complaint. The webm is
     still the smaller thing to send anyone — it is just not what a scrubbing
     editor should be pointed at. */
  /* The render is replaced at the same address every time it is re-cut, and
     a video element that already failed on it — or caught it half written —
     will not go back on its own. The token is stamped when the view opens,
     so re-opening the preview is how you see the new one. */
  function previewSrc() {
    return '/assets/video/' + previewSlug() + '.mp4?v=' + (pv.bust || 0);
  }
  function sidecar(ext) {
    return '/assets/video/' + previewSlug() + ext + '?v=' + (pv.bust || 0);
  }
  function fmt(x) {
    x = Math.max(0, x || 0);
    return Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0') +
      '.' + String(Math.floor((x % 1) * 10));
  }

  /* ── the dock ───────────────────────────────────────────────────────────
     One bar, grouped the way the work is grouped: the ground the recording
     sits on, the recording itself, and what comes out. Each control opens a
     small panel above it rather than a settings screen somewhere else, so
     the thing being changed stays in view while you change it. */
  function dockGrp(label, items) {
    return '<div class="reel-grp"><span class="reel-glab">' + label + '</span>' +
      items.join('') + '</div>';
  }
  function dockBtn(pop, inner, title) {
    return '<button class="reelbtn reel-dbtn" data-pop="' + pop + '" title="' +
      esc(title) + '" aria-expanded="false">' + inner + '</button>';
  }
  /* ── the frame's controls live on the pill ────────────────────────────
     The pill is the tool's chrome — record, shots, preview — and the frame
     belongs to the preview, so it appends to the pill rather than opening a
     second bar of controls a centimetre under the first. That duplication
     is what made this read as assembled rather than made. */
  function ctxHTML() {
    var c = cfg;
    return '<span class="reelsep"></span>' +
      dockBtn('size', '<b>' + c.canvW + '</b>×<b>' + c.canvH + '</b>', 'Canvas size') +
      dockBtn('bg', '<i class="reel-sw2" style="background:' + esc(groundCSS()) +
        '"></i>', 'Background') +
      dockBtn('pad', I.pad, 'Padding') +
      '<span class="reelsep"></span>' +
      dockBtn('scale', '<b>' + c.vidScale + '</b>%', 'Scale') +
      dockBtn('radius', I.radius, 'Corner radius') +
      dockBtn('shadow', I.shadow, 'Drop shadow') +
      dockBtn('pos', I.pos, 'Position') +
      '<span class="reelsep"></span>' +
      dockBtn('caps', I.cc, 'Captions') +
      dockBtn('file', '<b>' + c.expFile.toUpperCase() + '</b>', 'File and codec') +
      '<button class="reelbtn reel-dlb" title="Download">' + I.dl + '</button>' +
      '<button class="reel-render">Render</button>';
  }

  function paintCtx() {
    var box = bar && bar.querySelector('.reelctx');
    if (!box) return;
    var on = view === 'preview' && panel.classList.contains('on');
    box.hidden = !on;
    bar.classList.toggle('reel-wide', on);
    if (!on) { closePop(); return; }
    if (box.getAttribute('data-built') !== '1') {
      box.innerHTML = ctxHTML();
      box.setAttribute('data-built', '1');
    }
    paintFrame();
  }

  /* ── the frame, seen before it is cut ─────────────────────────────────
     Drawn in CSS with the same numbers the render uses, so the preview is
     the proof rather than a description of one. */
  /* One description of the ground, so the preview and the cut cannot
     disagree about it. */
  function groundCSS() {
    return cfg.canvGrad
      ? 'linear-gradient(' + cfg.canvAngle + 'deg,' + cfg.canvBg + ',' +
        cfg.canvBg2 + ')'
      : cfg.canvBg;
  }

  function paintFrame() {
    if (!pv.canvas || !pv.stage) return;
    /* A published render carries its own ground, padding, radius and
       shadow. Drawing them again puts a frame inside a frame. */
    var baked = !!(pv.meta && pv.meta.framed);
    pv.canvas.classList.toggle('reel-baked', baked);
    pv.canvas.style.background = baked ? 'transparent' : groundCSS();
    pv.canvas.style.setProperty('--reel-car', cfg.canvW + '/' + cfg.canvH);
    pv.canvas.style.setProperty('--reel-pad', cfg.canvPad + '%');

    /* The stage is sized here rather than in CSS, and by the same arithmetic
       the renderer uses: fit the take inside the padded canvas, then scale.
       Letting CSS do it with a percentage width made the picture taller than
       its own box on any canvas squarer than the take — the overflow was
       clipped, and everything positioned against the stage (the captions,
       every pinned spot) landed a quarter of a frame too high. */
    var box = pv.canvas.getBoundingClientRect();
    var inset = baked ? 0 : Math.min(box.width, box.height) * (cfg.canvPad / 100);
    var availW = Math.max(8, box.width - inset * 2);
    var availH = Math.max(8, box.height - inset * 2);
    var vw = pv.vw || 16, vh = pv.vh || 10;
    var k = Math.min(availW / vw, availH / vh) * (baked ? 1 : cfg.vidScale / 100);
    pv.stage.style.width = Math.round(vw * k) + 'px';
    pv.stage.style.height = Math.round(vh * k) + 'px';
    pv.stage.style.transform = baked ? 'none' : 'translateY(' + cfg.vidY + '%)';
    var vid = pv.stage.querySelector('video');
    if (vid) {
      vid.style.borderRadius = baked ? '0' : cfg.vidRadius + 'px';
      vid.style.boxShadow = (!baked && cfg.vidShadow)
        ? '0 ' + Math.round(cfg.vidShadowBlur * 0.35) + 'px ' +
          cfg.vidShadowBlur + 'px rgba(0,0,0,' + (cfg.vidShadowFade / 100) + ')'
        : 'none';
    }
    var box = bar && bar.querySelector('.reelctx');
    if (box && box.getAttribute('data-built') === '1') {
      box.querySelector('[data-pop="size"]').innerHTML =
        '<b>' + cfg.canvW + '</b>×<b>' + cfg.canvH + '</b>';
      box.querySelector('[data-pop="bg"] .reel-sw2').style.background = groundCSS();
      box.querySelector('[data-pop="scale"]').innerHTML = '<b>' + cfg.vidScale + '</b>%';
      box.querySelector('[data-pop="file"]').innerHTML =
        '<b>' + cfg.expFile.toUpperCase() + '</b>';
    }
  }

  /* ── the caption, painted on demand ──────────────────────────────────
     This used to happen only inside the playhead's own update, so changing
     the style while paused changed nothing you could see — which is the
     worst possible moment for it, since choosing a caption style is exactly
     what you do while paused. It is its own function now, and the controls
     that change it call it.

     It also shows a line when there is none at the playhead: picking a
     style against an empty frame is picking blind. */
  /* A face from Google is fetched once and left in the head. The preview has
     to show the real thing — a caption previewed in Inter and burned in
     Fraunces is a preview of nothing. */
  function loadCapFont() {
    var f = cfg.capFont;
    if (!f || f === 'system') return;
    var id = 'reel-gf-' + f.replace(/\W+/g, '-').toLowerCase();
    if (document.getElementById(id)) return;
    var l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(f).replace(/%20/g, '+') +
      ':wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }

  function paintCaption(line) {
    if (!pv.host) return;
    var cc = pv.host.querySelector('.reel-cc');
    var v = pv.host.querySelector('video');
    if (!cc) return;
    /* Already in the picture. Drawing them again is two sets of words on
       one frame, in two different styles, saying the same sentence. */
    if (pv.meta && pv.meta.captionsBurned && !pv.capsOpen) {
      cc.innerHTML = '';
      cc.removeAttribute('data-line');
      return;
    }
    var shown = (v && v.clientWidth) || 1440;
    var sample = line;
    if (!sample && pv.capsOpen) {
      sample = (pv.shots && pv.shots.length && pv.shots[0].say) ||
               'The line that goes over this shot.';
    }
    if (cc.getAttribute('data-line') !== sample) {
      cc.setAttribute('data-line', sample);
      cc.innerHTML = sample ? '<span>' + esc(sample) + '</span>' : '';
    }
    /* The setting is a size at 1440 wide, which is what the render uses.
       The preview shows the same frame at whatever width the panel is, so
       the caption is scaled to match or it is three times too big in the
       panel and half the size it should be at full width. */
    /* keynote is set two and a bit times larger, the same multiple the
       render uses, so the preview is the proof rather than a hint */
    var mult = (cfg.capStyle === 'keynote') ? 2.35 : 1;
    cc.style.fontSize =
      ((cfg.capSize || 22) * mult * (shown / 1440)).toFixed(2) + 'px';
    cc.style.fontFamily = (cfg.capFont && cfg.capFont !== 'system')
      ? "'" + cfg.capFont + "', Inter, sans-serif" : '';
    cc.style.fontWeight = cfg.capWeight || '';
    cc.style.color = cfg.capInk || '';
    cc.className = 'reel-cc reel-cc-' + (cfg.capStyle || 'plate') +
      (cfg.capPos === 'top' ? ' reel-cc-top' : '') +
      (pv.capsOpen ? ' reel-cc-live' : '');
  }

  /* A popover is fixed to the window rather than to the pill: the pill
     grows and shrinks as views change, and an open panel should not move
     with it. */
  function openPop(kind, anchor) {
    var pop = document.querySelector('.reel-pop');
    if (!pop) return;
    if (!kind || (pop.getAttribute('data-open') === kind && !pop.hidden)) {
      return closePop();
    }
    pop.setAttribute('data-open', kind);
    pop.innerHTML = popHTML(kind);
    pop.hidden = false;
    pv.capsOpen = kind === 'caps';
    paintCaption(pv.line || '');
    var ab = anchor.getBoundingClientRect();
    var w = pop.offsetWidth;
    pop.style.left = Math.max(10, Math.min(innerWidth - w - 10,
                                           ab.left + ab.width / 2 - w / 2)) + 'px';
    pop.style.bottom = (innerHeight - ab.top + 10) + 'px';
    [].forEach.call(document.querySelectorAll('.reel-dbtn'), function (b) {
      b.setAttribute('aria-expanded', b === anchor ? 'true' : 'false');
    });
  }
  function closePop() {
    var pop = document.querySelector('.reel-pop');
    if (!pop) return;
    pop.hidden = true;
    pop.removeAttribute('data-open');
    if (pv.capsOpen) { pv.capsOpen = false; paintCaption(pv.line || ''); }
    [].forEach.call(document.querySelectorAll('.reel-dbtn'), function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
  }

  /* ── what leaves the tool ─────────────────────────────────────────────
     Render is not something a panel can do — the frames are cut by ffmpeg.
     So this hands over the exact instruction, and the file already sitting
     beside it is what Download points at. */
  function askRender() {
    var out = 'Re-render the walkthrough with this frame and export:\n\n' +
      '```json\n' + JSON.stringify(frameSpec(), null, 1) + '\n```\n\n' +
      '```bash\npython3 .claude/skills/studio-walkthrough/walkthrough.py build ' +
      previewSlug() + '.json --publish\n```';
    navigator.clipboard.writeText(out).then(function () {
      toast('Copied', 'Paste it to the agent and it renders to ' +
            cfg.expFile.toUpperCase() + '.');
    }, function () { toast('Copy blocked', 'The browser refused clipboard access.'); });
  }
  function downloadIt() {
    var ext = cfg.expFile === 'gif' ? 'gif' : cfg.expFile === 'webm' ? 'webm' : 'mp4';
    var a = document.createElement('a');
    a.href = '/assets/video/' + previewSlug() + '.' + ext;
    a.download = previewSlug() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function popRow(label, html, hint) {
    return '<div class="reel-prow"><label>' + esc(label) +
      (hint ? '<i class="reel-q" title="' + esc(hint) + '">?</i>' : '') +
      '</label>' + html + '</div>';
  }
  /* A full-bleed hairline and a plain title, the way Agentation groups its
     own settings. Uppercase micro-caps floating over a row read as a label
     printed on the panel rather than a heading belonging to what follows. */
  function popSec(title) {
    return '<div class="reel-psec">' + esc(title) + '</div>';
  }
  function numIn(key, min, max, unit) {
    return '<span class="reel-num2"><input type="number" data-cv="' + key + '" ' +
      'min="' + min + '" max="' + max + '" value="' + cfg[key] + '">' +
      (unit ? '<em>' + unit + '</em>' : '') + '</span>';
  }
  /* A thing that is on or off is a switch. Two buttons labelled On and Off
     is the interface asking you to answer the same question twice. */
  function swIn(key) {
    return '<button class="reel-sw" data-sw="' + key + '" role="switch" ' +
      'aria-checked="' + (cfg[key] ? 'true' : 'false') + '"><i></i></button>';
  }
  /* A switch whose two positions are two values rather than on and off. */
  function swIn2(key, onVal, offVal) {
    return '<button class="reel-sw" data-sw2="' + key + '" data-on="' + onVal +
      '" data-off="' + esc(offVal) + '" role="switch" aria-checked="' +
      (cfg[key] === onVal ? 'true' : 'false') + '"><i></i></button>';
  }
  /* A short list, chosen rather than the whole library: the ones that hold
     at a caption's size and do not fight a product interface. */
  var GFONTS = ['Inter', 'Instrument Sans', 'Space Grotesk', 'DM Sans',
                'Figtree', 'Sora', 'IBM Plex Sans', 'Instrument Serif',
                'Fraunces', 'JetBrains Mono'];

  function segIn(key, opts) {
    return '<span class="reel-seg">' + opts.map(function (o) {
      return '<button data-cv="' + key + '" data-val="' + o[0] + '"' +
        (String(cfg[key]) === String(o[0]) ? ' aria-pressed="true"' : '') +
        '>' + esc(o[1]) + '</button>';
    }).join('') + '</span>';
  }
  function popHTML(kind) {
    if (kind === 'size') {
      return popSec('Canvas') + CANVAS_PRESETS.map(function (p) {
        var on = cfg.canvW === p[1] && cfg.canvH === p[2];
        return '<button class="reel-preset' + (on ? ' on' : '') +
          '" data-cw="' + p[1] + '" data-ch="' + p[2] + '"><b>' + p[0] +
          '</b><i>' + p[3] + '</i></button>';
      }).join('') +
      popSec('Exact') +
      popRow('Width', numIn('canvW', 320, 4096, 'px')) +
      popRow('Height', numIn('canvH', 320, 4096, 'px'));
    }
    if (kind === 'bg') {
      var SW = ['#101012', '#000000', '#FBFAF9', '#FF5F1F', '#1C1B20', '#2A2830'];
      return popSec('Background') +
        '<div class="reel-sws">' + SW.map(function (h) {
          return '<button class="reel-sw3' + (cfg.canvBg === h ? ' on' : '') +
            '" data-bg="' + h + '" style="background:' + h + '" title="' + h +
            '"></button>';
        }).join('') +
        /* and the one the operating system already knows how to do — an
           eyedropper, the recents, and whatever the person's own palette
           is, none of which is worth rebuilding badly */
        '<label class="reel-sw3 reel-pick2" title="Pick a colour">' +
          '<input type="color" data-cv="canvBg" value="' +
            esc(/^#[0-9a-f]{6}$/i.test(cfg.canvBg) ? cfg.canvBg : '#101012') + '">' +
        '</label></div>' +
        popRow('Hex', '<input class="reel-hex" type="text" data-cv="canvBg" ' +
          'value="' + esc(cfg.canvBg) + '" spellcheck="false">') +
        popSec('Gradient') +
        popRow('Blend', swIn('canvGrad')) +
        (cfg.canvGrad
          ? popRow('To', '<span class="reel-two">' +
              '<label class="reel-sw3 reel-pick2" title="Pick a colour">' +
                '<input type="color" data-cv="canvBg2" value="' +
                  esc(/^#[0-9a-f]{6}$/i.test(cfg.canvBg2) ? cfg.canvBg2 : '#2B2B33') +
                '"></label>' +
              '<input class="reel-hex" type="text" data-cv="canvBg2" value="' +
                esc(cfg.canvBg2) + '" spellcheck="false"></span>') +
            popRow('Angle', numIn('canvAngle', 0, 360, '°'))
          : '');
    }
    if (kind === 'pad')    return popSec('Padding') +
      popRow('Inset', numIn('canvPad', 0, 20, '%'),
             'How far inside the canvas the recording sits.');
    if (kind === 'scale')  return popSec('Scale') +
      popRow('Size', numIn('vidScale', 20, 100, '%'));
    if (kind === 'radius') return popSec('Corner radius') +
      popRow('Radius', numIn('vidRadius', 0, 64, 'px'));
    if (kind === 'shadow') return popSec('Drop shadow') +
      popRow('Shadow', swIn('vidShadow')) +
      popRow('Blur', numIn('vidShadowBlur', 0, 160, 'px')) +
      popRow('Strength', numIn('vidShadowFade', 0, 100, '%'));
    if (kind === 'pos')    return popSec('Position') +
      popRow('Nudge', numIn('vidY', -20, 20, '%'),
             'Move the recording up or down on the canvas.');
    if (kind === 'file')   return popSec('File') +
      popRow('', segIn('expFile', [['mp4', 'MP4'], ['mov', 'MOV'],
                                   ['webm', 'WebM'], ['gif', 'GIF']])) +
      popSec('Codec') +
      popRow('', segIn('expCodec', [['h264', 'H.264'], ['hevc', 'HEVC'],
                                    ['vp9', 'VP9']])) +
      popSec('Quality') +
      popRow('', segIn('expQuality', [['draft', 'Draft'], ['high', 'High'],
                                      ['max', 'Max']]));
    if (kind && kind.indexOf('add:') === 0) {
      var ai = +kind.slice(4);
      var last = ai >= board.shots.length;
      var order = ai === 0 ? ['open', 'say', 'lift', 'section', 'end']
                : last     ? ['end', 'say', 'lift', 'section', 'open']
                           : ['section', 'say', 'lift', 'open', 'end'];
      return popSec(ai === 0 ? 'Before everything'
                    : last ? 'At the end' : 'Between shot ' + ai + ' and ' + (ai + 1)) +
        order.map(function (k) {
          return '<button class="reel-preset reel-join1" data-addk="' + k +
            '" data-addat="' + ai + '"><em>' + SCENEGLYPH[k] + '</em>' +
            '<b>' + SCENES[k][0] + '</b><i>' + esc(SCENES[k][1]) + '</i></button>';
        }).join('') +
        '<p class="reel-hintp">A composed shot changes the walk, so the next ' +
        'render films it again — a couple of minutes rather than fifteen ' +
        'seconds.</p>';
    }
    if (kind && kind.indexOf('join:') === 0) {
      var ji = +kind.slice(5);
      var now = joinKind(ji), nowMs = joinMs(ji);
      return popSec(joinName(ji)) +
        Object.keys(JOINS).map(function (k) {
          return '<button class="reel-preset reel-join1' +
            (k === now ? ' on' : '') + '" data-jk="' + ji + '" data-jv="' + k +
            '"><em>' + JOINS[k][2] + '</em><b>' + JOINS[k][0] + '</b>' +
            '<i>' + esc(JOINS[k][1]) + '</i></button>';
        }).join('') +
        (now === 'cut' ? '' :
          popSec('Length') +
          popRow('Over', '<span class="reel-num2"><input type="number" ' +
            'data-jms="' + ji + '" min="80" max="1600" step="20" value="' +
            nowMs + '"><em>ms</em></span>')) +
        popSec('') +
        popRow('', '<button class="reel-tbtn reel-jall" data-jall="' + ji +
          '">Use this for every join</button>');
    }
    if (kind === 'caps') {
      var custom = cfg.capFont && cfg.capFont !== 'system';
      return popSec('Captions') +
        popRow('Burn in', swIn('capBurn'),
               'Baked into the picture. The sidecar is written either way.') +
        popSec('Template') +
        popRow('', segIn('capStyle', [['plate', 'Plate'], ['shadow', 'Clear'],
                                      ['band', 'Band'], ['third', 'Third'],
                                      ['keynote', 'Keynote']])) +
        popRow('Size', numIn('capSize', 12, 46, 'px')) +
        popRow('Place', segIn('capPos', [['bottom', 'Bottom'], ['top', 'Top']])) +
        /* The templates are the composition — where the words sit and what
           holds them. The face and the colour are separate, because a house
           style is not a layout: you can want the product's own type in a
           band, or somebody else's in a plate. Off by default, because a
           caption in the product's face is the one that cannot look bolted
           on. */
        popSec('Type') +
        popRow('The system\u2019s face', swIn2('capFont', 'system', 'Inter'),
               'The product\u2019s own, so the words match the thing they ' +
               'are describing.') +
        (custom
          ? popRow('Face', '<select class="reel-sel" data-cv="capFont">' +
              GFONTS.map(function (f) {
                return '<option value="' + esc(f) + '"' +
                  (cfg.capFont === f ? ' selected' : '') + '>' + esc(f) +
                  '</option>';
              }).join('') + '</select>')
          : '') +
        popRow('Weight', segIn('capWeight', [[400, 'Regular'], [500, 'Medium'],
                                             [600, 'Semibold'], [700, 'Bold']])) +
        popRow('Colour', '<span class="reel-two">' +
          '<label class="reel-sw3 reel-pick2" title="Pick a colour">' +
            '<input type="color" data-cv="capInk" value="' +
              esc(/^#[0-9a-f]{6}$/i.test(cfg.capInk) ? cfg.capInk : '#FFFFFF') +
            '"></label>' +
          '<input class="reel-hex" type="text" data-cv="capInk" value="' +
            esc(cfg.capInk) + '" spellcheck="false"></span>');
    }
    return '';
  }

  /* ══ dictation ═══════════════════════════════════════════════════════
     Speaking a brief is faster than typing one and, more to the point, it
     is what somebody does when they already know what they want to say.
     What comes out is rough — that is the point of calling it a brief. The
     agent writes the script; this only has to catch the intent.

     The browser's own recogniser, so nothing leaves the machine except the
     words, and only while the button is held on. */
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var dictating = null;
  function dictate(field, btn, done) {
    if (dictating) { dictating.stop(); return; }
    if (!Rec) {
      toast('No dictation here', 'This browser has no speech recogniser. ' +
            'Chrome and Safari do.');
      return;
    }
    var r = new Rec();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-GB';
    var settled = field.value ? field.value.replace(/\s+$/, '') + ' ' : '';
    r.onresult = function (e) {
      var live = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) settled += t.replace(/^\s+/, '') + ' ';
        else live += t;
      }
      field.value = settled + live;
      if (done) done(field.value);
    };
    r.onerror = function (e) {
      toast('Dictation stopped', e.error === 'not-allowed'
        ? 'The browser blocked the microphone.' : String(e.error));
    };
    r.onend = function () {
      dictating = null;
      btn.classList.remove('reel-live');
      field.value = field.value.replace(/\s+$/, '');
      if (done) done(field.value);
    };
    dictating = r;
    btn.classList.add('reel-live');
    r.start();
  }

  /* ══ the brief ═══════════════════════════════════════════════════════
     Not every walkthrough is worth performing. "Show what we changed today"
     is a sentence, and the agent knows the prototype well enough to work the
     shots out from it — which is the difference between a tool you reach for
     and one you schedule an afternoon around. */
  var BKEY = 'studio-reel-brief';
  var brief = (function () {
    try { return JSON.parse(localStorage.getItem(BKEY)) || {}; } catch (e) { return {}; }
  })();
  function saveBrief() {
    try { localStorage.setItem(BKEY, JSON.stringify(brief)); } catch (e) {}
  }
  var AUDIENCE = [['client', 'The client team'], ['dev', 'A developer'],
                  ['new', 'Somebody new to it']];
  var LENGTHS = [[30, '30s'], [60, '60s'], [120, '2 min']];

  /* ── how one shot becomes the next ─────────────────────────────────────
     Six, not fifty-eight. A product walkthrough that reaches for a radial
     wipe has lost the argument, and a list you have to scroll is a list
     nobody reads to the end of. The glyph is what the timeline shows on the
     seam — small enough to sit in a 14px handle and different enough that
     you can tell them apart without reading. */
  var SCENEGLYPH = { open: '\u25E4', section: '\u25A4', say: '\u275D',
                     lift: '\u29C9', end: '\u25E2' };
  var JOINS = {
    cut:      ['Cut', 'Straight cut', '│'],
    dissolve: ['Dissolve', 'One fades into the other', '⧗'],
    dip:      ['Dip', 'Through black — for a change of chapter', '◐'],
    flash:    ['Flash', 'A beat of light', '◇'],
    push:     ['Push', 'The new screen pushes the old one out', '⟩'],
    wipe:     ['Wipe', 'A soft edge travelling across', '⤙'],
  };
  /* Where a join's setting lives.
     The timeline is drawn from the render, and the render is not always the
     storyboard you are holding — it may be last week's, or one made from a
     brief, or one the agent published under its own name. So a join is kept
     against the render, keyed by its slug, and it travels in the same patch
     as every other note. Changing one costs a re-cut, nothing more.
     When the storyboard is the render, it is written there too, so a fresh
     Copy storyboard already carries it. */
  var JKEY = function () { return 'studio-reel-joins:' + pv.slug; };
  function loadJoins() {
    try { pv.joins = JSON.parse(localStorage.getItem(JKEY())) || {}; }
    catch (e) { pv.joins = {}; }
  }
  function joinKind(i) {
    var k;
    if (pv.joins && pv.joins[i]) k = pv.joins[i].kind;
    else {
      var t = (board.shots[i] || {}).transition;
      k = (t === undefined || t === null) ? cfg.trans
        : (typeof t === 'object') ? t.kind : t;
    }
    /* `none` is what the setting used to be called, and a saved one would
       otherwise read as a transition nobody chose */
    if (!k || k === 'none' || !JOINS[k]) k = 'cut';
    return k;
  }
  function joinMs(i) {
    if (pv.joins && pv.joins[i] && pv.joins[i].ms) return +pv.joins[i].ms;
    var t = (board.shots[i] || {}).transition;
    if (t && typeof t === 'object' && t.ms) return +t.ms;
    return +(cfg.transMs || 400);
  }
  function joinName(i) {
    var a = (pv.shots[i - 1] || {}).id || ('shot ' + i);
    var b = (pv.shots[i] || {}).id || ('shot ' + (i + 1));
    return a + ' → ' + b;
  }
  function setJoin(i, kind, ms) {
    pv.joins = pv.joins || {};
    if (kind === 'cut' && kind === (cfg.trans || 'cut')) delete pv.joins[i];
    else pv.joins[i] = { kind: kind, ms: ms };
    try { localStorage.setItem(JKEY(), JSON.stringify(pv.joins)); } catch (e) {}
    var sh = board.shots[i];
    if (sh) {
      if (kind === (cfg.trans || 'cut') && ms === +(cfg.transMs || 400)) {
        delete sh.transition;            /* back to following the default */
      } else {
        sh.transition = { kind: kind, ms: ms };
      }
      try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (e) {}
    }
    /* a join counts as a change too, and it enables the same button */
    paint();
  }

  function paintBrief() {
    var host = panel.querySelector('[data-view="brief"]');
    if (!host || host.hidden || host.getAttribute('data-built')) return;
    host.setAttribute('data-built', '1');
    host.innerHTML =
      '<p class="reel-lede"><b>Ask for it instead of making it.</b> ' +
      'Say what the walkthrough is about and the agent works out the shots, ' +
      'drives the prototype, and films it.</p>' +
      '<div class="reel-brbox">' +
        '<textarea class="reel-br" rows="4" placeholder="Record the features ' +
          'we worked on today, as a review of the day&rsquo;s work…"></textarea>' +
        '<button class="reel-mic" title="Dictate">' + I.mic +
          '<span>Dictate</span></button>' +
      '</div>' +
      '<div class="reel-field"><div class="reel-flabel"><b>Who it is for</b>' +
        '<i>How much gets explained</i></div>' +
        '<span class="reel-pick reel-aud">' + AUDIENCE.map(function (a) {
          return '<button data-br="audience" data-val="' + a[0] + '"' +
            (brief.audience === a[0] ? ' aria-pressed="true"' : '') + '>' +
            a[1] + '</button>';
        }).join('') + '</span></div>' +
      '<div class="reel-field"><div class="reel-flabel"><b>How long</b>' +
        '<i>About 2.9 words a second</i></div>' +
        '<span class="reel-pick reel-len">' + LENGTHS.map(function (l) {
          return '<button data-br="seconds" data-val="' + l[0] + '"' +
            ((brief.seconds || 30) === l[0] ? ' aria-pressed="true"' : '') + '>' +
            l[1] + '</button>';
        }).join('') + '</span></div>' +
      '<p class="reel-note">Nothing is recorded here. The brief goes to the ' +
        'agent, which writes the script, picks the screens, replays them and ' +
        'renders — then it lands in Preview like any other take, with the ' +
        'same notes and the same re-cut.</p>' +
      '<button class="reel-tbtn reel-pri reel-brcopy">Copy the brief</button>';

    var ta = host.querySelector('.reel-br');
    ta.value = brief.text || '';
    ta.addEventListener('input', function () { brief.text = ta.value; saveBrief(); });
    host.querySelector('.reel-mic').onclick = function () {
      dictate(ta, this, function (v) { brief.text = v; saveBrief(); });
    };
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-br]');
      if (b) {
        var k = b.getAttribute('data-br');
        brief[k] = k === 'seconds' ? +b.getAttribute('data-val')
                                   : b.getAttribute('data-val');
        saveBrief();
        [].forEach.call(b.parentNode.children, function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        return;
      }
      if (e.target.closest('.reel-brcopy')) copyBrief();
    });
  }

  function copyBrief() {
    var t = (brief.text || '').trim();
    if (!t) { toast('Nothing to send', 'Write or dictate the brief first.'); return; }
    var who = (AUDIENCE.filter(function (a) { return a[0] === brief.audience; })[0]
               || AUDIENCE[0])[1];
    var secs = brief.seconds || 30;
    var out =
      'Make a walkthrough with the studio-walkthrough skill. Do not interview ' +
      'me — this is the brief.\n\n' +
      '> ' + t.replace(/\n+/g, '\n> ') + '\n\n' +
      '- **Audience** ' + who + '\n' +
      '- **Length** about ' + secs + 's (~' + Math.round(secs * 2.9) + ' words)\n' +
      '- **Slug** `' + (board.slug || 'walkthrough') + '`\n\n' +
      'Work the shots out yourself from the brief and what is actually in the ' +
      'prototype — do not ask me which screens. Write the script first, check ' +
      'it fits, then `all --publish` so it appears in the tool\'s Preview.';
    navigator.clipboard.writeText(out).then(function () {
      toast('Copied', 'Paste it to the agent.');
    }, function () { toast('Copy blocked', 'The browser refused clipboard access.'); });
  }

  /* The storyboard's frames come from the render, which the preview loads.
     Loaded once here too, so the script view has pictures without anybody
     having to visit Preview first. */
  function warmShots() {
    if (pv.warmed) return;
    pv.warmed = true;
    fetch('/assets/video/' + previewSlug() + '-shots.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.length) return;
        pv.shots = j;
        if (!pv.dur) pv.dur = j[j.length - 1].t + 3;
        if (view === 'shots' && cfg.script === 'board') paint();
      })
      .catch(function () {});
  }

  function paintPreview() {
    var host = panel.querySelector('[data-view="preview"]');
    if (!host || host.hidden) return;
    var src = previewSrc();
    if (host.getAttribute('data-src') === src) { drawNotes(); return; }
    host.setAttribute('data-src', src);
    /* keyed on the walkthrough, not on the URL — the URL now carries a
       token that changes every time the view is opened */
    pv.slug = previewSlug();
    loadJoins();
    try {
      pv.notes = JSON.parse(localStorage.getItem(PKEY())) ||
                 JSON.parse(localStorage.getItem(
                   'studio-reel-notes:/assets/video/' + pv.slug + '.mp4')) || [];
    } catch (e) { pv.notes = []; }

    host.innerHTML =
      /* The transport is the header. A strip that says "Preview" and
         nothing else is a strip of nothing; this one is where you scrub. */
      '<div class="reel-top">' +
        '<button class="reel-pp" aria-label="Play">' + I.play + '</button>' +
        '<span class="reel-clock">0:00</span>' +
        '<div class="reel-scrub"><i></i><span></span></div>' +
        '<span class="reel-dur">0:00</span>' +
        '<button class="reel-exp" aria-pressed="false" ' +
          'title="The full timeline">' + I.tl + '</button>' +
        /* Built here rather than moved here. They used to live in the
           panel header and get relocated into this strip, which worked
           until the preview re-rendered: the host's innerHTML was replaced,
           the relocated node went with it, and everything that later
           reached for it found null. */
        '<span class="reel-topsz">' + sizesHTML(true) + '</span>' +
      '</div>' +
      '<div class="reel-canvas">' +
        '<div class="reel-stage">' +
          '<video class="reel-video" preload="metadata" playsinline></video>' +
          '<div class="reel-spots"></div>' +
          '<p class="reel-cc"></p>' +
        '</div>' +
      '</div>' +
      '<div class="reel-miss" hidden><p>Nothing rendered for <b>' +
        esc(previewSlug()) + '</b> yet — copy the storyboard and let the ' +
        'agent render it.</p><div class="reel-avail"></div>' +
        '<button class="reel-tbtn reel-retry">Try again</button></div>' +
      '<div class="reel-tl">' +
        '<div class="reel-timeline">' +
          '<div class="reel-ruler"></div>' +
          '<div class="reel-tracks">' +
            '<div class="reel-trk reel-trk-v" title="Picture"></div>' +
            '<div class="reel-trk reel-trk-a" title="Voice"><canvas></canvas></div>' +
            '<span class="reel-play"></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="reel-side">' +
        '<div class="reel-modes" role="group" aria-label="What to comment on">' +
          '<button data-mode="time" aria-pressed="true">A moment</button>' +
          '<button data-mode="spot">A spot</button>' +
          '<button data-mode="line">A line</button>' +
        '</div>' +
        '<div class="reel-modehint"></div>' +
        '<div class="reel-script"></div>' +
        '<div class="reel-notebox">' +
          '<div class="reel-at">at <b>0:00</b><span></span></div>' +
          '<div class="reel-ops" role="group" aria-label="What to change"></div>' +
          '<textarea class="reel-note" placeholder="What to change…"></textarea>' +
          '<button class="reel-tbtn reel-pri reel-add">Pin it</button>' +
          '<p class="reel-cost"></p>' +
        '</div>' +
        '<div class="reel-notes"></div>' +
      '</div>';

    var v = host.querySelector('video');
    var stage = host.querySelector('.reel-stage');
    var canvas = host.querySelector('.reel-canvas');
    var spots = host.querySelector('.reel-spots');
    var tracks = host.querySelector('.reel-tracks');
    var pending = null;            /* a spot waiting for its words */

    /* the frame's controls are on the pill, so they need these by reference */
    pv.stage = stage; pv.canvas = canvas; pv.host = host;
    /* so a join chosen in its panel repaints the seam it belongs to */
    pv.redraw = function () { drawTracks(); };

    /* ── one position indicator, not two ──────────────────────────────
       The strip and the timeline were both saying where you are. The strip
       is enough to watch with; the timeline is for cutting, so it is what
       the switch opens. */
    var tl = host.querySelector('.reel-tl');
    var expBtn = host.querySelector('.reel-exp');
    function setExpanded(on, quiet) {
      tl.hidden = !on;
      expBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) { drawTracks(); drawRuler(); drawWave(); tick(); }
      if (!quiet) {
        cfg.timeline = !!on;
        try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {}
      }
    }
    expBtn.onclick = function () {
      setExpanded(expBtn.getAttribute('aria-pressed') !== 'true');
    };

    v.src = src;
    /* if the mp4 is missing, the webm may still be there */
    var tried = false;
    v.addEventListener('error', function () {
      if (!tried) { tried = true; v.src = sidecar('.webm'); return; }
      host.querySelector('.reel-miss').hidden = false;
      host.querySelector('.reel-tl').hidden = true;
      host.querySelector('.reel-side').hidden = true;
      stage.hidden = true;
    });
    host.querySelector('.reel-retry').onclick = function () {
      pv.bust = Date.now();
      host.removeAttribute('data-src');
      paintPreview();
    };

    /* what else has been rendered, so the dead end is a menu */
    fetch('/assets/video/index.json?v=' + pv.bust)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var box = host.querySelector('.reel-avail');
        if (!box || !rows.length) return;
        var mine = previewSlug();
        box.innerHTML = '<span>Already rendered</span>' + rows.map(function (r) {
          return '<button class="reel-pickv' + (r.slug === mine ? ' on' : '') +
            '" data-pickv="' + esc(r.slug) + '"><b>' + esc(r.title || r.slug) +
            '</b>' + (r.shots ? '<i>' + r.shots + ' shots</i>' : '') + '</button>';
        }).join('');
      })
      .catch(function () {});
    v.addEventListener('loadedmetadata', function () {
      host.querySelector('.reel-miss').hidden = true;
      /* The stage carries the aspect, not the video: the spot notes are
         pinned in fractions of the stage, so a letterbox inside it would
         move every one of them. */
      pv.dur = v.duration || pv.dur;
      if (v.videoWidth) {
        pv.vw = v.videoWidth; pv.vh = v.videoHeight;
        stage.style.setProperty('--reel-ar', v.videoWidth + '/' + v.videoHeight);
        paintFrame();
      }
      drawTracks(); tick();
    });
    v.addEventListener('timeupdate', tick);
    v.addEventListener('play', function () {
      var b = host.querySelector('.reel-pp');
      b.classList.add('on'); b.innerHTML = I.pause; b.setAttribute('aria-label', 'Pause');
    });
    v.addEventListener('pause', function () {
      var b = host.querySelector('.reel-pp');
      b.classList.remove('on'); b.innerHTML = I.play; b.setAttribute('aria-label', 'Play');
    });

    /* What the render already has in it. Until this existed the preview
       drew a frame round a picture that already had one, and a caption over
       a caption that was already burned in. */
    fetch(sidecar('-meta.json')).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        pv.meta = m || {};
        paintFrame();
        paintCaption(pv.line || '');
      })
      .catch(function () { pv.meta = {}; });

    fetch(sidecar('-shots.json')).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { pv.shots = j; drawTracks(); drawScript(); tick(); } })
      .catch(function () {});
    fetch(sidecar('-peaks.json')).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { pv.peaks = j; drawWave(); } })
      .catch(function () {});

    /* ── transport ─────────────────────────────────────────────────── */
    host.querySelector('.reel-pp').onclick = function () { v.paused ? v.play() : v.pause(); };

    /* the strip is the scrubber — press or drag anywhere along it */
    (function () {
      var sc = host.querySelector('.reel-scrub'), down = false;
      function seek(e) {
        var r = sc.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (v.duration) { v.currentTime = p * v.duration; tick(); }
      }
      sc.addEventListener('pointerdown', function (e) {
        down = true; sc.setPointerCapture(e.pointerId); v.pause(); seek(e);
      });
      sc.addEventListener('pointermove', function (e) { if (down) seek(e); });
      sc.addEventListener('pointerup', function (e) {
        down = false; try { sc.releasePointerCapture(e.pointerId); } catch (x) {}
      });
    })();
    var timeline = host.querySelector('.reel-timeline');
    timeline.addEventListener('click', function (e) {
      if (e.target.closest('.reel-blk i')) return;   /* the name is a jump */
      var r = tracks.getBoundingClientRect();
      if (v.duration) v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
    });

    /* ── the picture track: a block per shot ───────────────────────── */
    function drawTracks() {
      var d = v.duration || 0;
      var tv = host.querySelector('.reel-trk-v');
      if (!d || !pv.shots.length) { tv.innerHTML = ''; return; }
      var STRIP_N = 40;
      tv.innerHTML = pv.shots.map(function (sh, i) {
        var a = sh.t, b = (pv.shots[i + 1] ? pv.shots[i + 1].t : d);
        var pct = (b - a) / d * 100;
        /* One filmstrip for the whole take, sliced per clip, so a block shows
           the frames that are actually in it rather than the same thumbnail
           forty times. A percentage background-position aligns the image's
           x% point with the container's x% point — it does not offset by a
           percentage — so the figure wanted is the clip's start as a
           fraction of the scrollable overrun, not of the timeline. */
        var span = Math.max(0.001, b - a);
        var bgw = 100 * d / span;
        var over = d - span;
        var bgx = over > 0.001 ? (a / over) * 100 : 0;
        return '<span class="reel-blk" data-jump="' + a + '" style="left:' +
          (a / d * 100) + '%;width:' + pct + '%">' +
          '<i class="reel-blkname">' + esc(sh.id) + '</i>' +
          '<span class="reel-film" style="background-image:url(' + sidecar('-strip.jpg') +
            ');background-size:' + bgw.toFixed(2) + '% 100%;background-position:' +
            bgx.toFixed(3) + '% 0"></span>' +
          '</span>';
      }).join('') +
      /* ── the joins ──────────────────────────────────────────────────
         A transition lives on the seam between two clips, which is where
         Final Cut puts it and where a person points when they describe one.
         The handle sits on the boundary rather than on either clip, so it
         is obvious it belongs to both. */
      pv.shots.slice(1).map(function (sh, i) {
        var k = joinKind(i + 1);
        return '<button class="reel-join' + (k === 'cut' ? '' : ' on') +
          '" data-join="' + (i + 1) + '" style="left:' + (sh.t / d * 100) +
          '%" title="' + esc(JOINS[k] ? JOINS[k][1] : 'Cut') + '">' +
          '<i>' + (JOINS[k] ? JOINS[k][2] : JOINS.cut[2]) + '</i></button>';
      }).join('');
      drawRuler();
      drawWave();
      drawNotes();
    }

    /* ── the ruler: where you are, in figures ──────────────────────── */
    function tc(x) {
      x = Math.max(0, x || 0);
      var f = Math.floor((x % 1) * 30);
      return String(Math.floor(x / 60)).padStart(2, '0') + ':' +
             String(Math.floor(x % 60)).padStart(2, '0') + ':' +
             String(f).padStart(2, '0');
    }
    function drawRuler() {
      var el = host.querySelector('.reel-ruler');
      var d = v.duration || 0;
      if (!el || !d) return;
      /* a labelled mark every second or two, whichever keeps them apart */
      var w = el.clientWidth || 400;
      var step = d / Math.max(3, Math.floor(w / 78));
      step = step < 1 ? 1 : Math.ceil(step);
      var out = [];
      for (var t = 0; t <= d + 0.001; t += step) {
        out.push('<span class="reel-tick" style="left:' + (t / d * 100) + '%">' +
                 tc(t) + '</span>');
      }
      el.innerHTML = out.join('');
    }

    /* ── the voice track: the shape of the talking ─────────────────── */
    function drawWave() {
      var cv = host.querySelector('.reel-trk-a canvas');
      if (!cv || !pv.peaks.length) return;
      var w = cv.parentElement.clientWidth || 300, h = 26, dpr = devicePixelRatio || 1;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      var g = cv.getContext('2d');
      g.scale(dpr, dpr);
      g.clearRect(0, 0, w, h);
      g.fillStyle = getComputedStyle(panel).getPropertyValue('--reel-dim').trim() || '#888';
      var n = pv.peaks.length, bw = Math.max(1, w / n);
      for (var i = 0; i < n; i++) {
        var v2 = Math.max(0.02, pv.peaks[i]);
        var bh = v2 * (h - 4);
        g.fillRect(i * bw, (h - bh) / 2, Math.max(0.7, bw - 0.6), bh);
      }
    }

    /* ── the transcript ────────────────────────────────────────────── */
    function drawScript() {
      var el = host.querySelector('.reel-script');
      el.innerHTML = pv.shots.map(function (sh, i) {
        return '<button class="reel-line" data-line="' + i + '" data-jump="' + sh.t + '">' +
          '<span class="reel-lt">' + fmt(sh.t) + '</span>' +
          '<span class="reel-lx">' + esc(sh.say || '—') + '</span></button>';
      }).join('');
    }

    /* ── which kind of note ────────────────────────────────────────── */
    var HINT = {
      time: 'Pause where it is wrong and write what you see.',
      spot: 'Click the thing in the picture, then write what is wrong with it.',
      line: 'Pick the line whose words are wrong.',
    };
    function setMode(m) {
      pv.mode = m;
      pending = null;
      spots.innerHTML = '';
      [].forEach.call(host.querySelectorAll('.reel-modes button'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false');
      });
      host.querySelector('.reel-modehint').textContent = HINT[m];
      host.querySelector('.reel-script').hidden = m !== 'line';
      stage.classList.toggle('reel-picking', m === 'spot');
      drawOps();
      tick();
    }

    /* ── what the note asks for ─────────────────────────────────────
       A note is an instruction or it is homework for somebody else. Each
       one carries a verb, and the verb decides how much has to be redone:
       the words mean the line is said again, the picture means only the
       cut is rebuilt, the structure means the walk is filmed again. */
    function drawOps() {
      var el = host.querySelector('.reel-ops');
      var list = OPS[pv.mode] || [];
      el.innerHTML = list.map(function (o, i) {
        return '<button data-op="' + o[0] + '" aria-pressed="' +
          (i === 0 ? 'true' : 'false') + '">' + esc(o[1]) + '</button>';
      }).join('');
      pv.op = list.length ? list[0][0] : 'note';
      var ta = host.querySelector('.reel-note');
      ta.placeholder = OPT[pv.op] ? OPT[pv.op][1] : 'What to change…';
      drawCost();
    }
    function setOp(op) {
      pv.op = op;
      [].forEach.call(host.querySelectorAll('.reel-ops button'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-op') === op ? 'true' : 'false');
      });
      var ta = host.querySelector('.reel-note');
      ta.placeholder = OPT[op] ? OPT[op][1] : 'What to change…';
      drawCost();
      ta.focus();
    }
    function drawCost() {
      var c = COST[(OPT[pv.op] || [])[0] || 'cut'];
      host.querySelector('.reel-cost').innerHTML =
        '<b>' + c[0] + '</b> — ' + c[1];
    }
    setMode('time');

    stage.addEventListener('click', function (e) {
      if (pv.mode !== 'spot') return;
      var r = v.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      v.pause();
      pending = { x: +x.toFixed(4), y: +y.toFixed(4) };
      spots.innerHTML = '<i class="reel-spot reel-armed" style="left:' + (x * 100) +
        '%;top:' + (y * 100) + '%"></i>';
      host.querySelector('.reel-note').focus();
      tick();
    });

    var pickedLine = null;
    host.querySelector('.reel-script').addEventListener('click', function (e) {
      var b = e.target.closest('[data-line]');
      if (!b) return;
      pickedLine = +b.getAttribute('data-line');
      [].forEach.call(host.querySelectorAll('.reel-line'), function (x, i) {
        x.setAttribute('aria-pressed', i === pickedLine ? 'true' : 'false');
      });
      v.currentTime = pv.shots[pickedLine].t + 0.05;
      host.querySelector('.reel-note').focus();
    });

    host.querySelector('.reel-note').addEventListener('focus', function () { v.pause(); });

    host.querySelector('.reel-add').onclick = function () {
      var ta = host.querySelector('.reel-note');
      var text = ta.value.trim();
      /* some verbs are the whole instruction — dropping a shot needs no
         sentence explaining that it is dropped */
      var mute = { drop: 1, cutline: 1, nozoom: 1 };
      if (!text && !mute[pv.op]) { ta.focus(); return; }
      var at = pv.mode === 'line' && pickedLine !== null ? pv.shots[pickedLine].t : v.currentTime;
      var sh = shotAt(at);
      var n = { kind: pv.mode, op: pv.op || 'note',
                t: Math.round(at * 100) / 100, text: text,
                shot: sh ? sh.id : null, said: sh ? sh.say : null };
      if (pv.mode === 'spot' && pending) { n.x = pending.x; n.y = pending.y; }
      if (pv.mode === 'spot' && !pending) return;
      pv.notes.push(n);
      ta.value = '';
      pending = null;
      spots.innerHTML = '';
      try { localStorage.setItem(PKEY(), JSON.stringify(pv.notes)); } catch (e) {}
      drawNotes();
      /* The note is what makes the copy worth pressing, and the copy button
         is disabled until one exists. Drawing the note without repainting
         the bar left the button grey with a note sitting right beside it:
         you wrote the change, pinned it, watched it appear, and the only
         control that sends anywhere stayed dead until you happened to
         switch views and come back. */
      paint();
    };

    function shotAt(t) {
      var hit = null;
      pv.shots.forEach(function (m) { if (t + 0.05 >= m.t) hit = m; });
      return hit;
    }

    function tick() {
      var d = v.duration || 0, t = v.currentTime, p = d ? t / d : 0;
      host.querySelector('.reel-play').style.left = (p * 100) + '%';
      host.querySelector('.reel-clock').textContent = fmt(t);
      host.querySelector('.reel-dur').textContent = fmt(d);
      host.querySelector('.reel-scrub i').style.width = (p * 100) + '%';
      host.querySelector('.reel-scrub span').style.left = (p * 100) + '%';
      var sh = shotAt(t);
      pv.line = sh ? (sh.say || '') : '';
      paintCaption(pv.line);
      var at = host.querySelector('.reel-at');
      at.querySelector('b').textContent = fmt(t);
      at.querySelector('span').textContent =
        (pv.mode === 'spot' && pending ? '· on the picture'
         : sh ? '· ' + sh.id : '');
      [].forEach.call(host.querySelectorAll('.reel-blk'), function (b) {
        var a = parseFloat(b.getAttribute('data-jump'));
        b.classList.toggle('on', sh && Math.abs(a - sh.t) < 0.001);
      });
      /* a spot note shows itself when its moment comes round */
      if (pv.mode !== 'spot' || !pending) {
        spots.innerHTML = pv.notes.filter(function (n) {
          return n.kind === 'spot' && Math.abs(n.t - t) < 1.2;
        }).map(function (n) {
          return '<i class="reel-spot" style="left:' + (n.x * 100) + '%;top:' +
            (n.y * 100) + '%"></i>';
        }).join('');
      }
    }

    function drawNotes() {
      var box = host.querySelector('.reel-notes');
      if (!box) return;
      /* Reachable from the early return at the top of paintPreview, where
         `v` and `tracks` are hoisted but not yet assigned — so they are
         looked up rather than closed over. */
      var vv = host.querySelector('video');
      var trk = host.querySelector('.reel-tracks');
      var sorted = pv.notes.slice().sort(function (a, b) { return a.t - b.t; });
      var KIND = { time: 'moment', spot: 'spot', line: 'line' };
      box.innerHTML = sorted.map(function (n, i) {
        /* notes written before there were kinds are moments */
        var k = KIND[n.kind] ? n.kind : 'time';
        var lab = LABEL[n.op];
        return '<div class="reel-n1" data-jump="' + n.t + '">' +
          '<span class="reel-nt">' + fmt(n.t) + '</span>' +
          '<span class="reel-nk reel-nk-' + k + '">' + KIND[k] + '</span>' +
          (lab && n.op !== 'note' ? '<span class="reel-nop">' + esc(lab) + '</span>' : '') +
          (n.shot ? '<span class="reel-ns">' + esc(n.shot) + '</span>' : '') +
          '<button class="reel-del" data-ndel="' + i + '">&times;</button><p></p></div>';
      }).join('');
      [].forEach.call(box.querySelectorAll('.reel-n1 p'), function (p, i) {
        p.textContent = sorted[i].text;
      });
      var d = (vv && vv.duration) || 0;
      if (!trk) return;
      [].forEach.call(trk.querySelectorAll('.reel-pin'), function (x) { x.remove(); });
      if (d) pv.notes.forEach(function (n) {
        var pin = document.createElement('i');
        pin.className = 'reel-pin reel-nk-' + (n.kind || 'time');
        pin.style.left = (n.t / d * 100) + '%';
        trk.appendChild(pin);
      });
      var ex = host.querySelector('.reel-export');
      if (ex) ex.disabled = !pv.notes.length;
    }

    /* The preview is repainted every time you come back to it, but `host`
       itself survives — only its innards are replaced. So each repaint hung
       another copy of this listener on the same element, and every copy ran
       on every click.

       For most of what it handles that is merely wasteful. For deleting a
       note it destroys work: each copy re-sorts the notes and removes the
       one at the clicked index, so the second copy deletes a note that has
       just moved into that position. Four visits to the preview and a
       single click on one note's × removed all four notes.

       The handler closes over this paint's own `v`, `drawNotes`, `setMode`
       — so it cannot simply be attached once and left. The previous one is
       taken off and this one put on in its place. */
    if (host.__reelClick) host.removeEventListener('click', host.__reelClick);
    host.__reelClick = function (e) {
      var pk = e.target.closest('[data-pickv]');
      if (pk) {
        pv.pick = pk.getAttribute('data-pickv');
        pv.bust = Date.now();
        host.removeAttribute('data-src');
        paintPreview();
        return;
      }
      var m = e.target.closest('.reel-modes button');
      if (m) { setMode(m.getAttribute('data-mode')); return; }
      var o = e.target.closest('.reel-ops button');
      if (o) { setOp(o.getAttribute('data-op')); return; }
      var d = e.target.closest('[data-ndel]');
      if (d) {
        var sorted = pv.notes.slice().sort(function (a, b) { return a.t - b.t; });
        var gone = sorted[+d.getAttribute('data-ndel')];
        pv.notes = pv.notes.filter(function (x) { return x !== gone; });
        try { localStorage.setItem(PKEY(), JSON.stringify(pv.notes)); } catch (err) {}
        drawNotes();
        paint();   /* and it goes grey again when the last one is removed */
        return;
      }
      var j = e.target.closest('[data-jump]');
      if (j && !e.target.closest('.reel-modes')) {
        v.currentTime = parseFloat(j.getAttribute('data-jump')) + 0.03;
      }
    };
    host.addEventListener('click', host.__reelClick);

    /* the same accumulation, on the window: every repaint added another
       redraw to every resize */
    if (pv.onResize) removeEventListener('resize', pv.onResize);
    pv.onResize = function () { drawWave(); drawRuler(); tick(); };
    addEventListener('resize', pv.onResize);
    if (window.ResizeObserver) {
      new ResizeObserver(function () { tick(); }).observe(v);
      /* The panel resizes with the window and with the rail folding. The
         callback resizes the stage inside the box being watched, so it is
         deferred a frame — otherwise the observer reports it as a loop it
         could not settle. */
      var pending = 0;
      new ResizeObserver(function () {
        if (pending) return;
        pending = requestAnimationFrame(function () {
          pending = 0; paintFrame(); tick();
        });
      }).observe(canvas);
    }
    drawNotes();
    paintCtx();
    setExpanded(!!cfg.timeline, true);
    /* the strip was just rebuilt, so the size and rail states are re-applied
       onto the buttons that now exist */
    setSize(cfg.size || 'panel', true);
    setInsp(cfg.insp !== false, true);
  }

  /* What the cut needs to know about the frame. Kept apart from the board
     so a change of ground does not look like a change of script. */
  function frameSpec() {
    return {
      slug: (board.slug || 'walkthrough'),
      canvas: { w: cfg.canvW, h: cfg.canvH, bg: cfg.canvBg, pad: cfg.canvPad,
                bg2: cfg.canvGrad ? cfg.canvBg2 : null,
                angle: cfg.canvGrad ? cfg.canvAngle : null },
      video: { scale: cfg.vidScale, radius: cfg.vidRadius, y: cfg.vidY,
               shadow: cfg.vidShadow ? { blur: cfg.vidShadowBlur,
                                         opacity: cfg.vidShadowFade / 100 } : null },
      captions: { burn: !!cfg.capBurn, size: cfg.capSize,
                  style: cfg.capStyle, position: cfg.capPos,
                  font: cfg.capFont, weight: +cfg.capWeight,
                  colour: cfg.capInk },
      formats: [cfg.expFile],
      codec: cfg.expCodec,
      quality: cfg.expQuality,
    };
  }

  /* What the next pass acts on — and it is a patch, not a review. Each note
     already knows its verb, its shot and its second, so the list below is
     something `walkthrough.py apply` can run against the board without
     anyone reading it. The prose is underneath for the person who wants to
     check it before it runs. */
  function notesMarkdown() {
    var slug = (board.slug || 'walkthrough');
    var sorted = pv.notes.slice().sort(function (a, b) { return a.t - b.t; });
    var stages = {};
    /* A join is an edit like any other, and the cheapest kind: the frames
       are already shot, so it only ever rebuilds the cut. */
    var joins = Object.keys(pv.joins || {}).map(function (i) {
      stages.cut = 1;
      return { op: 'join', shot: (pv.shots[+i] || {}).id || null,
               at: (pv.shots[+i] || {}).t, kind: pv.joins[i].kind,
               ms: pv.joins[i].ms };
    });
    var edits = joins.concat(sorted.map(function (n) {
      var op = n.op || 'note';
      stages[(OPT[op] || OPT.note)[0]] = 1;
      var e = { op: op, at: n.t, shot: n.shot || null };
      if (n.kind === 'spot') e.point = [n.x, n.y];
      if (n.text) e.text = n.text;
      return e;
    }));
    /* the most expensive thing asked for is what has to be run */
    var run = stages.shoot ? 'record build' : stages.voice ? 'voice build' : 'build';

    var out = [
      '# ' + (board.title || 'Walkthrough') + ' — ' + edits.length +
        ' change' + (edits.length === 1 ? '' : 's'),
      '',
      '```json',
      JSON.stringify({ slug: slug, edits: edits }, null, 1),
      '```',
      '',
      'Apply and re-render:',
      '',
      '```bash',
      'python3 .claude/skills/studio-walkthrough/walkthrough.py apply ' +
        slug + '-edits.json --run "' + run + '" --publish',
      '```',
      '',
      '---',
      '',
    ];
    joins.forEach(function (j) {
      out.push('**' + fmt(j.at || 0) + '**' + (j.shot ? ' · `' + j.shot + '`' : '') +
               ' · join in as **' + (JOINS[j.kind] ? JOINS[j.kind][0] : j.kind) +
               '** over ' + j.ms + 'ms', '');
    });
    sorted.forEach(function (n) {
      var op = n.op || 'note';
      var head = '**' + fmt(n.t) + '**' + (n.shot ? ' · `' + n.shot + '`' : '') +
        ' · ' + (OPT[op] || OPT.note)[2];
      if (n.kind === 'spot') head += ' — at ' +
        Math.round(n.x * 100) + '%, ' + Math.round(n.y * 100) + '% of the frame';
      out.push(head);
      if (n.said) out.push('> ' + n.said);
      if (n.text) out.push('', n.text);
      out.push('');
    });
    return out.join('\n');
  }

  /* ── painting ───────────────────────────────────────────────────────── */
  function paint() {
    if (!mounted) return;
    var n = board.shots.length;
    var b = bar.querySelector('[data-act="list"] .reel-ct');
    if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
    var rb = bar.querySelector('[data-act="rec"]');
    rb.classList.toggle('reel-rec2', rec);
    rb.classList.toggle('reel-go', !rec);
    bar.querySelector('[data-act="rec"]').innerHTML = rec ? I.stop : I.rec;
    bar.querySelector('[data-act="split"]').disabled = !rec;
    bar.querySelector('[data-act="copy"]').disabled =
      view === 'preview'
        ? !(pv.notes.length || Object.keys(pv.joins || {}).length) : !n;
    if (!panel.classList.contains('on')) return;
    if (view === 'settings') { paintSettings(); return; }
    if (view === 'about') return;
    if (view === 'brief') { paintBrief(); return; }
    if (view === 'preview') { paintPreview(); return; }
    var nm = panel.querySelector('.reel-name');
    if (nm && document.activeElement !== nm) nm.value = board.title || '';

    var t = total(), target = board.target_seconds;
    var tot = panel.querySelector('.reel-tot');
    tot.textContent = t.toFixed(1) + 's / ' + target + 's';
    tot.classList.toggle('over', t > target + 0.5);

    var list = panel.querySelector('.reellist');
    list.classList.toggle('reel-board', cfg.script === 'board');
    if (cfg.script === 'board') warmShots();
    if (!n) {
      /* Two things can be made here and the tool never said so. One is a
         walkthrough — the product being used, recorded. The other has no
         walk in it at all: a title sequence, a launch clip, a piece about
         something that has no screen yet, composed out of the design
         system. Both end up as the same board; they just start differently,
         and until this said so only the first was discoverable. */
      list.innerHTML =
        '<div class="reelstart">' +
          '<button class="reelway" data-way="record">' +
            '<i>' + I.rec + '</i>' +
            '<b>Record a walkthrough</b>' +
            '<span>Use the prototype the way you would explain it. Every ' +
            'click, keystroke and scroll is written down, and a change of ' +
            'screen starts the next shot.</span>' +
          '</button>' +
          '<button class="reelway" data-way="compose">' +
            '<i>' + I.wand + '</i>' +
            '<b>Compose from the system</b>' +
            '<span>No recording. Title cards, statements and real ' +
            'components held up on their own — built out of the design ' +
            'system, so it cannot drift from the product.</span>' +
          '</button>' +
          '<button class="reelway reelway-thin" data-way="ask">' +
            '<i>' + I.wand + '</i><b>Or describe it and let the agent ' +
            'work it out</b></button>' +
        '</div>';
      return;
    }
    /* keep focus and caret while typing a line */
    var focused = document.activeElement;
    var keepIdx = focused && focused.dataset && focused.dataset.i;
    var keepPos = keepIdx !== undefined && focused.selectionStart;

    /* A place to put something between two shots, and at each end. The one
       at the top is where an opening goes; the one at the bottom is where a
       film stops rather than just running out. */
    function slot(i, label) {
      return '<button class="reel-slot" data-add="' + i + '">' +
        '<i>+</i><span>' + esc(label) + '</span></button>';
    }
    /* In a storyboard the frames sit side by side, and a full-width slot
       between every pair forces a row break after each one — so nothing can
       ever be beside anything. There, the two bookends stay as rows and the
       insert lives on the card instead. */
    var boardly = cfg.script === 'board';

    list.innerHTML = slot(0, 'Opening') + board.shots.map(function (s, i) {
      var sec = secs(s.say);
      var sc = s.scene;
      /* A storyboard has always been frames with the line under them. In a
         list you read the words and imagine the picture; in a storyboard you
         see the picture and read the words against it — which is the whole
         point of drawing one before you shoot. The frame is the shot's own
         still where there is a render to take it from, and the screen's name
         where there is not. */
      var thumb = shotThumb(s, i);
      var row =
        '<div class="reelshot' + (sc ? ' reel-isscene' : '') +
          (i === n - 1 && rec ? ' reel-cur' : '') + '">' +
        '<div class="reel-row"><span class="reel-num">' + (i + 1) + '</span>' +
        (sc
          ? '<span class="reel-where reel-scenename">' + esc(s.where) + '</span>' +
            '<span class="reel-acts">scene</span>'
          : '<span class="reel-where" data-jump="' + i + '" title="' + esc(s.url) + '">' +
              esc(s.where) + '</span>' +
            /* An em dash for "no actions" sat directly beside the insert
               button and read as a minus next to a plus — a pair of controls
               that do not exist. Nothing is a better way to say nothing. */
            (s.act.length
              ? '<span class="reel-acts">' + s.act.length +
                (s.act.length === 1 ? ' act' : ' acts') + '</span>'
              : '')) +
        (boardly ? '<button class="reel-ins" data-add="' + (i + 1) +
           '" aria-label="Put a scene after this" title="Put a scene after ' +
           'this">+</button>' : '') +
        '<button class="reel-del" data-del="' + i + '" aria-label="Delete shot">&times;</button></div>' +
        thumb +
        (sc ? sceneFields(s, i) : '') +
        '<textarea data-i="' + i + '" rows="2" placeholder="' +
          (sc ? 'What is said over this card…' : 'What is said over this shot…') +
          '">' + esc(s.say) + '</textarea>' +
        '<div class="reel-foot">' +
          '<span class="reel-secs">' +
            (s.say ? sec.toFixed(1) + 's' : 'no line yet') +
            (s.raw ? ' · rough' : '') + '</span>' +
          '<button class="reel-mic reel-mic1" data-mic="' + i + '" ' +
            'title="Say it roughly — the agent writes it properly">' +
            I.mic + '</button>' +
        '</div>' +
      '</div>';
      return row + (boardly
        ? (i === n - 1 ? slot(i + 1, 'End card') : '')
        : slot(i + 1, i === n - 1 ? 'End card' : 'Cut in'));
    }).join('');

    if (keepIdx !== undefined && keepIdx !== false) {
      var back = list.querySelector('textarea[data-i="' + keepIdx + '"]');
      if (back) { back.focus(); try { back.setSelectionRange(keepPos, keepPos); } catch (e) {} }
    }
  }
  /* The frame in a storyboard. Where the walkthrough has been rendered the
     tool already has forty thumbnails of it in one strip — the same image
     the timeline slices — so the frame is a window onto the moment this shot
     begins. Where it has not, the frame says what it will be instead of
     pretending to be a picture. */
  function shotThumb(s, i) {
    if (cfg.script !== 'board') return '';
    var sc = s.scene;
    var shots = pv.shots || [];
    var m = shots[i];
    var d = pv.dur || 0;
    if (m && d && !sc) {
      var STRIP_N = 40;
      var col = Math.min(STRIP_N - 1, Math.max(0, Math.round(m.t / d * (STRIP_N - 1))));
      return '<div class="reel-frame"><span style="background-image:url(' +
        sidecar('-strip.jpg') + ');background-size:' + (STRIP_N * 100) +
        '% 100%;background-position:' +
        (col / (STRIP_N - 1) * 100).toFixed(3) + '% 0"></span></div>';
    }
    if (sc) {
      /* A frame that says OPENING tells you what you already knew from the
         card's own title. A frame that shows the opening tells you whether
         the words fit — which is the only question a storyboard exists to
         answer. So it is the scene in miniature, in the scene's own
         arrangement. */
      var mini = '';
      if (sc.kind === 'lift') {
        mini = '<b class="reel-mini-lift"></b>' +
          (sc.label ? '<i>' + esc(sc.label) + '</i>' : '');
      } else {
        mini = (sc.eyebrow ? '<i>' + esc(sc.eyebrow) + '</i>' : '') +
          (sc.n ? '<u>' + esc(sc.n) + '</u>' : '') +
          '<b>' + esc(sc.title || SCENES[sc.kind][0]) + '</b>' +
          (sc.sub ? '<s>' + esc(sc.sub) + '</s>' : '');
      }
      return '<div class="reel-frame reel-mini reel-mini-' + sc.kind +
        (sc.align === 'centre' || sc.kind === 'section' ? ' reel-mini-c' : '') +
        '">' + mini + '</div>';
    }
    return '<div class="reel-frame reel-frame-none"><span></span>' +
      '<em>' + esc(s.where || 'Screen') + '</em></div>';
  }

  /* The fields a scene actually has. Kept short on purpose: a card with
     five things on it is a slide, and a slide is a different and worse
     medium than a film. */
  function sceneFields(s, i) {
    var sc = s.scene, k = sc.kind;
    function f(key, ph) {
      return '<input class="reel-sf" data-sc="' + i + '" data-sk="' + key +
        '" value="' + esc(sc[key] || '') + '" placeholder="' + esc(ph) +
        '" spellcheck="false">';
    }
    if (k === 'lift') {
      return '<div class="reel-scfields">' +
        f('label', 'What to call it') +
        '<button class="reel-tbtn reel-pickel" data-pickel="' + i + '">' +
          (sc.pick ? esc(sc.pick) : 'Pick a component') + '</button>' +
      '</div>';
    }
    return '<div class="reel-scfields">' +
      (k === 'open' || k === 'section' ? f('eyebrow', 'Small line above') : '') +
      f('title', k === 'say' ? 'The line, at headline size' : 'Title') +
      (k === 'say' ? '' : f('sub', 'A sentence under it')) +
    '</div>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  var view = 'shots';                /* shots | settings | about */

  function showView(v) {
    view = v;
    ['shots', 'settings', 'about', 'preview', 'brief'].forEach(function (k) {
      [].forEach.call(panel.querySelectorAll('[data-view="' + k + '"]'), function (el) {
        el.hidden = k !== v;
      });
    });
    panel.querySelector('.reelhd b').textContent =
      v === 'settings' ? 'Settings' : v === 'about' ? 'How Narrate works'
      : v === 'preview' ? 'Preview' : v === 'brief' ? 'Ask the agent' : 'Script';
    panel.querySelector('.reel-r').hidden = v !== 'shots';
    [].forEach.call(panel.querySelectorAll('[data-script]'), function (b) {
      b.setAttribute('aria-pressed',
        b.getAttribute('data-script') === (cfg.script || 'list') ? 'true' : 'false');
    });
    panel.querySelector('.reelft').hidden = v !== 'shots';
    paintCtx();
    /* the header is not worth its height beside a picture */
    panel.classList.toggle('reel-inprev', v === 'preview');
    /* The size is the panel's, not the preview's — it used to snap back to
       a 380px column the moment you left the picture, which made a wide
       storyboard impossible to keep. */
    setSize(cfg.size || 'panel', true);
    if (v === 'preview') {
      setInsp(cfg.insp !== false, true);
      pv.bust = Date.now();
    }
    var cb = bar.querySelector('[data-act="copy"]');
    if (cb) cb.setAttribute('aria-label',
      v === 'preview' ? 'Copy the changes' : 'Copy the storyboard');
    ['list', 'brief', 'play', 'gear', 'help'].forEach(function (k) {
      var b = bar.querySelector('[data-act="' + k + '"]');
      var mine = { list: 'shots', brief: 'brief', play: 'preview',
                   gear: 'settings', help: 'about' }[k];
      if (b) b.setAttribute('aria-pressed',
        panel.classList.contains('on') && view === mine ? 'true' : 'false');
    });
    paint();
  }

  /* A 380px panel is right for a shot list and wrong for watching anything.
     Theatre gives it the middle of the window; full gives it the window. */
  /* How wide the panel is, offered wherever the panel is being used —
     which is every view, not only the preview. A storyboard in a 380px
     column is a list with pictures; the same board at theatre width is a
     storyboard. Two instances of one control, because the header is hidden
     in the preview and the transport strip carries it there. */
  function sizesHTML(withRail) {
    return '<span class="reel-sizes">' +
      '<button data-size="panel" title="Panel">' + I.szS + '</button>' +
      '<button data-size="theatre" title="Theatre">' + I.szM + '</button>' +
      '<button data-size="full" title="Full width">' + I.szL + '</button>' +
      (withRail ? '<span class="reelsep"></span>' +
        '<button data-insp="1" title="Notes rail">' + I.insp + '</button>' : '') +
    '</span>';
  }

  function setSize(sz, quiet) {
    panel.classList.toggle('reel-theatre', sz === 'theatre');
    panel.classList.toggle('reel-full', sz === 'full');
    [].forEach.call(panel.querySelectorAll('.reel-sizes [data-size]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-size') === sz ? 'true' : 'false');
    });
    if (!quiet) { cfg.size = sz; try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} }
  }

  /* The rail is where you write about the picture, not where you watch it.
     Folded, the picture gets the whole width — which at theatre is the
     difference between 770px and 1400px. */
  function setInsp(on, quiet) {
    panel.classList.toggle('reel-noinsp', !on);
    var b = panel.querySelector('[data-insp]');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!quiet) { cfg.insp = !!on; try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} }
  }

  function openPanel(force, v) {
    if (v && v !== view && panel.classList.contains('on')) {
      showView(v);
      return;
    }
    var want = force === true ? true : !panel.classList.contains('on');
    panel.classList.toggle('on', want);
    if (want && v) view = v;
    document.body.classList.toggle('reel-panel', want);
    showView(view);
  }

  /* ── toast, borrowed from the prototype when it is there ────────────── */
  function toast(title, note) {
    if (window.StudioToast) return window.StudioToast('in', title, note);
    console.log('[record] ' + title + ' — ' + note);
  }

  /* ── tooltips ───────────────────────────────────────────────────────── */
  function wireTip(el, label, keys) {
    el.addEventListener('mouseenter', function () {
      tip.innerHTML = '<span>' + esc(label) + '</span>' +
        (keys ? '<kbd>' + esc(keys) + '</kbd>' : '');
      tip.classList.add('on');
      var r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
      tip.style.left = Math.max(8, r.left + r.width / 2 - t.width / 2) + 'px';
      tip.style.top = (r.top - t.height - 9) + 'px';
    });
    el.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
  }

  /* ── mount ──────────────────────────────────────────────────────────── */
  function mount() {
    if (mounted) return;
    if (!document.querySelector('link[href^="/studio/narrate.css"]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = CSS;
      document.head.appendChild(l);
    }

    bar = document.createElement('div');
    bar.className = 'reelbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Narrate — record a walkthrough');
    /* ── the order of these is an argument, not a habit ──────────────────
       Two ways to begin — perform it, or ask for it — then the two ways to
       work on the one you have, then handing it off, then the meta. Copy
       stays beside what it copies rather than being pushed to the far end
       when the frame's controls appear.

       Clear is not here any more. It sat one button from Copy, which is the
       one pressed most, and two from Close; and the shot list already has
       its own Clear in the footer, next to the thing it destroys. A
       destructive action belongs with its object, not on the toolbar. */
    bar.innerHTML =
      '<span class="reelnow"><i></i><span>0:00</span></span>' +
      btn('rec', I.rec, 'reel-go') +
      btn('split', I.split) +
      '<span class="reelsep"></span>' +
      btn('brief', I.wand) +
      '<span class="reelsep"></span>' +
      btn('list', I.list + '<span class="reel-ct" style="display:none">0</span>') +
      btn('play', I.eye) +
      btn('copy', I.copy) +
      '<span class="reelctx" hidden></span>' +
      '<span class="reelsep"></span>' +
      btn('gear', I.gear) +
      btn('help', I.help) +
      '<span class="reelsep"></span>' +
      btn('close', I.x, 'reel-x');

    panel = document.createElement('div');
    panel.className = 'reelpanel';
    panel.innerHTML =
      '<div class="reelhd"><b>Shots</b>' +

        '<span class="reel-hdsz">' + sizesHTML(false) + '</span>' +
        '<span class="reel-r">' +
          '<span class="reel-scriptsw" role="group" aria-label="How the script reads">' +
            '<button data-script="list" title="As a list">' + I.list + '</button>' +
            '<button data-script="board" title="As a storyboard">' + I.film + '</button>' +
          '</span>' +
          '<span class="reel-tot">0.0s / 30s</span></span></div>' +
      '<div class="reel-title" data-view="shots">' +
        '<input class="reel-name" type="text" placeholder="Name this walkthrough" ' +
        'aria-label="Walkthrough title"></div>' +
      '<div class="reellist" data-view="shots"></div>' +
      '<div class="reelbody" data-view="settings" hidden></div>' +
      '<div class="reelbody" data-view="about" hidden>' + ABOUT + '</div>' +
      '<div class="reelbody reel-briefv" data-view="brief" hidden></div>' +
      '<div class="reelbody reel-prev" data-view="preview" hidden></div>' +
      '<div class="reelft">' +
        '<span style="color:var(--reel-dim);font-size:11.5px">Target</span>' +
        '<input class="reel-target" type="text" inputmode="numeric" value="30" aria-label="Target seconds">' +
        '<span class="reel-grow"></span>' +
        '<button class="reel-tbtn" data-ft="clear">Clear</button>' +
        '<button class="reel-tbtn reel-pri" data-ft="copy">Copy storyboard</button>' +
      '</div>';

    tip = document.createElement('div');
    tip.className = 'reeltip';
    hit = document.createElement('div');
    hit.className = 'reelhit';

    var popEl = document.createElement('div');
    popEl.className = 'reel-pop';
    popEl.hidden = true;

    document.body.appendChild(hit);
    document.body.appendChild(panel);
    document.body.appendChild(bar);
    document.body.appendChild(popEl);
    document.body.appendChild(tip);

    /* The frame's controls sit on the pill and their panels on the window,
       so their handling belongs here rather than inside the preview. */
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      var db = e.target.closest('.reel-dbtn');
      if (db) { openPop(db.getAttribute('data-pop'), db); return; }
      if (e.target.closest('.reel-render')) { askRender(); return; }
      if (e.target.closest('.reel-dlb')) { downloadIt(); return; }

      var jn = e.target.closest('[data-join]');
      if (jn) { openPop('join:' + jn.getAttribute('data-join'), jn); return; }
      var jk = e.target.closest('[data-jv]');
      if (jk) {
        var ji = +jk.getAttribute('data-jk');
        setJoin(ji, jk.getAttribute('data-jv'), joinMs(ji));
        popEl.innerHTML = popHTML('join:' + ji);
        if (pv.redraw) pv.redraw();
        paint();
        return;
      }
      var ja = e.target.closest('[data-jall]');
      if (ja) {
        var src = +ja.getAttribute('data-jall');
        cfg.trans = joinKind(src);
        cfg.transMs = joinMs(src);
        board.shots.forEach(function (sh, i) { if (i) delete sh.transition; });
        try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (err) {}
        saveCfg();
        pv.joins = {};
        try { localStorage.removeItem(JKEY()); } catch (err2) {}
        if (pv.redraw) pv.redraw();
        toast('Every join', JOINS[cfg.trans][0] + ', ' + cfg.transMs + 'ms.');
        closePop();
        return;
      }
      var ak = e.target.closest('[data-addk]');
      if (ak) {
        closePop();
        addScene(ak.getAttribute('data-addk'), +ak.getAttribute('data-addat'));
        return;
      }
      /* `.reel-preset` is shared by the canvas sizes, the join kinds and the
         scene kinds — they look alike on purpose. Only the canvas ones carry
         a width, and without that test a scene kind was read as a canvas
         size and set it to zero by zero. */
      var ps = e.target.closest('.reel-preset[data-cw]');
      if (ps) {
        cfg.canvW = +ps.getAttribute('data-cw');
        cfg.canvH = +ps.getAttribute('data-ch');
        saveCfg(); paintFrame();
        popEl.innerHTML = popHTML('size');
        return;
      }
      var bgs = e.target.closest('[data-bg]');
      if (bgs) {
        cfg.canvBg = bgs.getAttribute('data-bg');
        saveCfg(); paintFrame();
        popEl.innerHTML = popHTML('bg');
        return;
      }
      var s2 = e.target.closest('.reel-pop [data-sw2]');
      if (s2) {
        var k2 = s2.getAttribute('data-sw2');
        var on = s2.getAttribute('data-on');
        cfg[k2] = cfg[k2] === on ? s2.getAttribute('data-off') : on;
        saveCfg(); loadCapFont(); paintCaption(pv.line || '');
        popEl.innerHTML = popHTML('caps');
        return;
      }
      var sw = e.target.closest('.reel-pop [data-sw]');
      if (sw) {
        var sk = sw.getAttribute('data-sw');
        cfg[sk] = !cfg[sk];
        sw.setAttribute('aria-checked', cfg[sk] ? 'true' : 'false');
        saveCfg(); paintFrame(); paintCaption(pv.line || '');
        if (sk === 'canvGrad') popEl.innerHTML = popHTML('bg');
        return;
      }
      var sg = e.target.closest('.reel-seg button');
      if (sg) {
        var k = sg.getAttribute('data-cv'), val = sg.getAttribute('data-val');
        cfg[k] = val === 'true' ? true : val === 'false' ? false : val;
        [].forEach.call(sg.parentNode.children, function (b) {
          b.setAttribute('aria-pressed', b === sg ? 'true' : 'false');
        });
        saveCfg(); paintFrame(); paintCaption(pv.line || '');
        return;
      }
      if (!e.target.closest('.reel-pop')) closePop();
    }, true);

    /* a number you have to commit is a number you cannot feel */
    document.addEventListener('change', function (e) {
      var sel = e.target.closest && e.target.closest('select[data-cv]');
      if (!sel) return;
      cfg[sel.getAttribute('data-cv')] = sel.value;
      saveCfg(); loadCapFont(); paintCaption(pv.line || '');
    });
    document.addEventListener('input', function (e) {
      var jm = e.target.closest && e.target.closest('[data-jms]');
      if (jm) {
        var jmi = +jm.getAttribute('data-jms');
        setJoin(jmi, joinKind(jmi), Math.max(80, +jm.value || 400));
        if (pv.redraw) pv.redraw();
        return;
      }
      var f = e.target.closest && e.target.closest('.reel-pop [data-cv]');
      if (!f || f.tagName !== 'INPUT') return;
      var k = f.getAttribute('data-cv');
      cfg[k] = f.type === 'number' ? (+f.value || 0) : f.value;
      paintFrame();
      if (k.indexOf('cap') === 0) { loadCapFont(); paintCaption(pv.line || ''); }
      if (k === 'canvBg' || k === 'canvBg2') {
        /* the swatch, the hex field and the system picker are three views of
           one value, so whichever was moved, the other two follow */
        [].forEach.call(popEl.querySelectorAll('[data-cv="' + k + '"]'), function (x) {
          if (x === f) return;
          if (x.type === 'color' && !/^#[0-9a-f]{6}$/i.test(cfg[k])) return;
          x.value = cfg[k];
        });
        [].forEach.call(popEl.querySelectorAll('[data-bg]'), function (b) {
          b.classList.toggle('on', !cfg.canvGrad &&
            b.getAttribute('data-bg') === cfg.canvBg);
        });
      }
      try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (err) {}
    });

    var acts = {
      rec: function () { rec ? stopRec() : startRec(); },
      split: function () { flushType(); openShot(); openPanel(true); },
      list: function () { openPanel(undefined, 'shots'); },
      brief: function () { openPanel(undefined, 'brief'); },
      play: function () { openPanel(undefined, 'preview'); },
      gear: function () { openPanel(undefined, 'settings'); },
      help: function () { openPanel(undefined, 'about'); },
      copy: copyOut,
      close: function () { toggle(false); },
    };
    var tips = {
      rec: ['Record', 'R'], split: ['Split the shot here', 'S'],
      list: ['The script', 'L'], copy: ['Copy storyboard', '⌘C'],
      brief: ['Ask the agent', 'B'],
      play: ['Preview the render', 'P'],
      gear: ['Settings'], help: ['How Narrate works'],
      close: ['Exit', 'Esc'],
    };
    Object.keys(acts).forEach(function (k) {
      var el = bar.querySelector('[data-act="' + k + '"]');
      el.addEventListener('click', acts[k]);
      wireTip(el, tips[k][0], tips[k][1]);
    });

    panel.addEventListener('click', function (e) {
      var d = e.target.closest('[data-del]');
      if (d) {
        board.shots.splice(+d.getAttribute('data-del'), 1);
        save();
        return;
      }
      /* ── putting a composed shot in ──────────────────────────────── */
      var wy = e.target.closest('[data-way]');
      if (wy) {
        var way = wy.getAttribute('data-way');
        if (way === 'record') { openPanel(false); startRec(); }
        else if (way === 'ask') { showView('brief'); }
        else { openPop('add:0', wy); }
        return;
      }
      var ad = e.target.closest('[data-add]');
      if (ad) { openPop('add:' + ad.getAttribute('data-add'), ad); return; }
      var pe = e.target.closest('[data-pickel]');
      if (pe) {
        var pi = +pe.getAttribute('data-pickel');
        openPanel(false);
        pickElement(function (sel, label) {
          var sh = board.shots[pi];
          if (!sh || !sh.scene) return;
          sh.scene.pick = sel;
          sh.scene.from = here();
          if (!sh.scene.label && label) sh.scene.label = label;
          save();
          openPanel(true, 'shots');
          toast('Picked', sel);
        });
        return;
      }
      /* Say the line instead of typing it. What lands is rough on purpose —
         it is marked as such, and the agent is told to write it properly. */
      var mc = e.target.closest('[data-mic]');
      if (mc) {
        var mi = +mc.getAttribute('data-mic');
        var fld = panel.querySelector('textarea[data-i="' + mi + '"]');
        if (fld) dictate(fld, mc, function (val) {
          board.shots[mi].say = val;
          board.shots[mi].raw = true;
          try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (err) {}
        });
        return;
      }
      var j = e.target.closest('[data-jump]');
      if (j) {
        var s = board.shots[+j.getAttribute('data-jump')];
        if (s) location.hash = (s.url.split('#')[1] || '');
        return;
      }
      var f = e.target.closest('[data-ft]');
      if (f) acts[f.getAttribute('data-ft')]();
    });
    /* settings: switches, ranges, pickers and the one text field */
    panel.addEventListener('click', function (e) {
      var sw = e.target.closest('.reel-sw');
      if (sw) {
        var k = sw.getAttribute('data-cfg');
        cfg[k] = !cfg[k];
        sw.setAttribute('aria-checked', cfg[k] ? 'true' : 'false');
        saveCfg();
        return;
      }
      var sw2 = e.target.closest('[data-script]');
      if (sw2) {
        cfg.script = sw2.getAttribute('data-script');
        saveCfg();
        return;
      }
      var ip = e.target.closest('[data-insp]');
      if (ip) { setInsp(ip.getAttribute('aria-pressed') !== 'true'); return; }
      var sz = e.target.closest('.reel-sizes button');
      if (sz) { setSize(sz.getAttribute('data-size')); return; }
      var pk = e.target.closest('.reel-pick button');
      if (pk) {
        cfg[pk.getAttribute('data-cfg')] = pk.getAttribute('data-val');
        saveCfg();
      }
    });

    panel.addEventListener('input', function (e) {
      var sf = e.target.closest && e.target.closest('[data-sc]');
      if (sf) {
        var sh = board.shots[+sf.getAttribute('data-sc')];
        if (sh && sh.scene) {
          sh.scene[sf.getAttribute('data-sk')] = sf.value;
          try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (err) {}
        }
        return;
      }
      if (e.target.matches('textarea[data-i]')) {
        board.shots[+e.target.dataset.i].say = e.target.value;
        var sec = secs(e.target.value);
        var out = e.target.parentElement.querySelector('.reel-secs');
        if (out) out.textContent = e.target.value ? sec.toFixed(1) + 's' : 'no line yet';
        var t = total();
        var tot = panel.querySelector('.reel-tot');
        tot.textContent = t.toFixed(1) + 's / ' + board.target_seconds + 's';
        tot.classList.toggle('over', t > board.target_seconds + 0.5);
        try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (err) {}
      }
      if (e.target.matches('input[type="range"][data-cfg]')) {
        var k = e.target.getAttribute('data-cfg');
        cfg[k] = e.target.value;
        var out = panel.querySelector('[data-out="' + k + '"]');
        if (out) out.innerHTML = e.target.value + (k === 'zoomScale' ? '&times;'
          : (k === 'zoomMs' || k === 'transMs') ? 'ms' : 'px');
        try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (err) {}
        return;
      }
      if (e.target.matches('.reel-text[data-cfg]')) {
        cfg[e.target.getAttribute('data-cfg')] = e.target.value.trim();
        try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (err) {}
        return;
      }
      if (e.target.matches('.reel-name')) {
        board.title = e.target.value || 'Walkthrough';
        /* the slug is the name, lowercased and hyphenated — it is what the
           render is filed under and what Preview goes looking for */
        board.slug = (board.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'walkthrough');
        try { localStorage.setItem(KEY, JSON.stringify(board)); } catch (err) {}
        return;
      }
      if (e.target.matches('.reel-target')) {
        board.target_seconds = Math.max(5, parseInt(e.target.value, 10) || 30);
        save();
      }
    });

    addEventListener('keydown', function (e) {
      if (!on || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'Escape') {
        if (picking) { stopPicking(); openPanel(true, 'shots'); return; }
        rec ? stopRec() : toggle(false);
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (k === 'r') { e.preventDefault(); acts.rec(); }
      if (k === 's' && rec) { e.preventDefault(); acts.split(); }
      if (k === 'l') { e.preventDefault(); acts.list(); }
    });

    mounted = true;
    paint();
  }

  function btn(act, inner, cls) {
    return '<button class="reelbtn' + (cls ? ' ' + cls : '') + '" data-act="' + act +
           '" type="button">' + inner + '</button>';
  }

  function toggle(want) {
    on = want === undefined ? !on : !!want;
    var b = document.getElementById('recbtn');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    document.body.classList.toggle('reel-open', on);
    if (on) {
      mount();
      bar.style.display = '';
      /* the two floating tools do not share a corner */
      if (window.StudioAnnotate && window.StudioAnnotate.on) window.StudioAnnotate.toggle();
    } else {
      if (rec) stopRec();
      if (bar) bar.style.display = 'none';
      if (panel) panel.classList.remove('on');
      document.body.classList.remove('reel-panel');
      if (tip) tip.classList.remove('on');
    }
  }

  /* ── the launcher, beside Annotate ──────────────────────────────────── */
  function launcher() {
    if (document.getElementById('recbtn')) return true;
    var nav = document.querySelector('.ribbon nav');
    if (!nav) return false;
    var b = document.createElement('button');
    b.id = 'recbtn';
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = 'Narrate<span class="wip">BETA</span>';
    b.title = 'Walk through the prototype and get a narrated video of it';
    b.addEventListener('click', function () { toggle(); });
    nav.insertBefore(b, nav.firstChild);
    return true;
  }
  if (!launcher()) {
    document.addEventListener('DOMContentLoaded', launcher);
    setTimeout(launcher, 0);
  }

  window.StudioNarrate = {
    toggle: toggle,
    get on() { return on; },
    get board() { return asBoard(); },
  };
})();
