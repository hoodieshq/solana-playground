/* Agentation, loaded on demand.

   agentation.com — click an element, write a note, and get back structured
   context an AI coding agent can act on: the CSS selector, the element path,
   the computed styles, and your words. It replaces the hand-rolled comment
   layer, which produced prose an agent had to guess its way through.

   Three things are worth knowing about how it is wired here:

   1. It is a React component and this site has no bundler and no
      dependencies. It loads as an ES module from a CDN instead, with React
      and react-dom pinned so the peer range cannot drift under us.

   2. That is roughly 140KB of JavaScript. It is fetched the first time
      somebody presses Annotate, not on page load — a reviewer who never
      annotates never pays for it.

   3. The vendor's own guidance is to gate it behind NODE_ENV=development.
      This prototype has no build, so the gate is the button: nothing loads
      and nothing renders until it is pressed.

   Exposes window.StudioAnnotate = { toggle(), on }.  */
(function () {
  var REACT = "https://esm.sh/react@18.3.1";
  var REACT_DOM = "https://esm.sh/react-dom@18.3.1/client";
  var PKG = "https://esm.sh/agentation@3.0.2?deps=react@18.3.1,react-dom@18.3.1";

  var root = null;      /* the React root, once created */
  var host = null;
  var loading = false;
  var on = false;

  function setPressed(v) {
    var b = document.getElementById("annbtn");
    if (b) b.setAttribute("aria-pressed", v ? "true" : "false");
  }

  function say(kind, title, note) {
    if (window.StudioToast) return window.StudioToast(kind, title, note);
    /* app.js owns the toast and only the prototype loads it. On a portal
       page pressing the button starts a 140KB download, and silence for
       two seconds reads as a broken button — so say something plain. */
    var el = document.getElementById("anntoast");
    if (!el) {
      el = document.createElement("div");
      el.id = "anntoast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.className = kind === "er" ? "er on" : "on";
    el.innerHTML = "<b></b><span></span>";
    el.querySelector("b").textContent = title;
    el.querySelector("span").textContent = note || "";
    clearTimeout(say._t);
    say._t = setTimeout(function () { el.classList.remove("on"); }, 4200);
  }

  async function mount() {
    if (root || loading) return;
    loading = true;
    setPressed(true);
    try {
      var mods = await Promise.all([
        import(REACT),
        import(REACT_DOM),
        import(PKG)
      ]);
      var React = mods[0], client = mods[1], A = mods[2];
      host = document.createElement("div");
      host.id = "agentation-host";
      document.body.appendChild(host);
      root = client.createRoot(host);
      root.render(React.createElement(A.Agentation, { copyToClipboard: true }));
      on = true;
      /* Its toolbar is fixed to the bottom-right at z-index 100000 and is
         portalled to the body, so it is not ours to move. Anything of ours
         that wants to stay clear of it can key off this. */
      document.documentElement.classList.add("ann-on");
      say("ok", "Annotation on",
          "Click any element to leave a note. Copy takes the lot as markdown.");
    } catch (e) {
      setPressed(false);
      say("er", "Annotation didn’t load",
          "It comes from a CDN, so this needs a network. Try again, or use the notes in the portal.");
    }
    loading = false;
  }

  function unmount() {
    if (!root) return;
    /* Unmount rather than hide: the toolbar listens on the whole document
       for clicks and hovers, and a hidden toolbar still intercepts them. */
    root.unmount();
    root = null;
    document.documentElement.classList.remove("ann-on");
    if (host) { host.remove(); host = null; }
    on = false;
    setPressed(false);
  }

  function toggle() {
    if (on) unmount(); else mount();
  }

  /* A pencil, with the pressed state carried by a filled square behind it —
     --pri is ink on the light ground and paper on the dark one, so the
     square reads as "on" in both — and the mark itself switching to the
     Solana gradient. currentColor cannot hold a gradient, so the stroke
     takes a paint server and the gradient is declared once, inline. */
  var MARK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<defs><linearGradient id="anng" x1="0" y1="1" x2="1" y2="0">' +
    '<stop offset="0" stop-color="var(--studio-accent)"/>' +
    '<stop offset="1" stop-color="var(--studio-ok)"/></linearGradient></defs>' +
    '<path d="M4.5 19.5h3.2L19 8.2a2.26 2.26 0 0 0-3.2-3.2L4.5 16.3z"/>' +
    '<path d="m14.4 6.6 3 3"/><path d="M4.5 19.5 7.7 19.5"/></svg>';

  /* Two hosts, because feedback arrives on both. The prototype has a ribbon
     with room for a word; the portal has a header of icon buttons and no
     room for one, so it gets the same control in the shape that row uses. */
  function launcher() {
    /* three triggers, one button */
    if (document.getElementById("annbtn")) return true;
    var nav = document.querySelector(".ribbon nav");
    if (nav) {
      var b = document.createElement("button");
      b.id = "annbtn";
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = 'Annotate<span class="wip">AGENT</span>';
      b.title = "Mark up any element and copy the result for an AI agent";
      b.addEventListener("click", toggle);
      nav.insertBefore(b, nav.firstChild);
      return true;
    }
    var right = document.querySelector(".hbar-r");
    if (right) {
      var i = document.createElement("button");
      i.id = "annbtn";
      i.type = "button";
      i.className = "iconbtn annico";
      i.setAttribute("aria-pressed", "false");
      i.setAttribute("aria-label", "Annotate this page");
      i.title = "Mark up any element and copy the result for an AI agent";
      i.innerHTML = MARK;
      i.addEventListener("click", toggle);
      /* before the theme toggle, after search: it is a page action, and the
         CTA stays last */
      var tt = right.querySelector("#themetgl");
      right.insertBefore(i, tt || right.querySelector(".hcta"));
      return true;
    }
    return false;
  }

  /* chrome.js assembles .hbar-r inside a fetch for the site index, so on a
     portal page the row does not exist when this file runs — and waiting
     for DOMContentLoaded is no help, because that has usually fired
     already. The chrome fires studio:chrome when the header is up. The other
     two are kept as a floor for a page that has its own header markup. */
  if (!launcher()) {
    document.addEventListener("studio:chrome", launcher, { once: true });
    document.addEventListener("DOMContentLoaded", launcher);
    setTimeout(launcher, 0);
  }

  window.StudioAnnotate = {
    toggle: toggle,
    get on() { return on; }
  };
})();
