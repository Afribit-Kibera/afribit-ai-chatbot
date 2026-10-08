// Pilot console: live numbers, the answer review queue, the team and the link generator.
// Plain JavaScript, no build step, no inline script. Everything from the server is put on the page
// with textContent, never as HTML. Numbers are aggregates; the only question and answer text on this
// page is in the Queue tab, which the server shows to reviewers and admins only.
(function () {
  "use strict";

  var app = document.getElementById("app");
  var whoBox = document.getElementById("who");
  var whoName = document.getElementById("whoName");
  var SVG = "http://www.w3.org/2000/svg";
  var token = null;
  var user = null; // { name, role }
  var tab = "overview";
  var overviewState = { days: 7, source: "" };
  var queueState = { state: "open" };
  var suggestionState = { state: "pending" };
  var teamState = { q: "", offset: 0 };
  var lastRefresh = 0;
  var stampNode = null;
  var timer = null;
  // A server can serve several packs. /pilot?pack=<id> looks at that pack; every call below names it.
  var packId = null;
  try { packId = new URLSearchParams(window.location.search).get("pack"); } catch (e) { packId = null; }
  try { token = sessionStorage.getItem("pilot.token"); } catch (e) { token = null; }

  var DEFAULT_APP_URL = "https://ai.afribit.africa/app";
  var SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;
  var RESOLUTIONS = [
    ["answer_ok", "The answer was fine"],
    ["card_fixed", "I fixed the card"],
    ["new_card_needed", "A new card is needed"],
    ["language_fix", "The wording needs fixing"],
    ["wrong_report", "The report was mistaken"],
    ["other", "Something else"]
  ];
  var RESOLUTION_TEXT = {};
  RESOLUTIONS.forEach(function (r) { RESOLUTION_TEXT[r[0]] = r[1]; });
  var MODE_NAMES = { simple_en: "Simple English", swahili: "Kiswahili", sheng: "Sheng", mixed_ke: "Mixed" };
  var STATUS_NAMES = { draft: "Draft", needs_factual_review: "Needs fact check", needs_language_review: "Needs language check", approved: "Approved", published: "Published", deprecated: "Retired", archived: "Archived" };
  var REASON_NAMES = { wrong_information: "Wrong information", unsafe: "Unsafe", unnatural_language: "Unnatural language", other: "Other" };

  // ---- small helpers ------------------------------------------------------------------------
  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "class") node.className = props[k];
      else if (k === "text") node.textContent = props[k];
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), props[k]);
      else if (props[k] !== false && props[k] !== null && props[k] !== undefined) node.setAttribute(k, props[k] === true ? "" : props[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return node;
  }
  function svg(tag, attrs, children) {
    var node = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "text") node.textContent = attrs[k]; else node.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function num(n) { return (n === null || n === undefined) ? "-" : Number(n).toLocaleString(); }
  function pct(a, b) { return b > 0 ? (Math.round((a / b) * 1000) / 10) + "%" : "-"; }
  function usd(v) { return v === null || v === undefined ? "not recorded" : "$" + Number(v).toFixed(v < 1 ? 4 : 2); }
  function when(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }
  function clock(d) { return d.toLocaleTimeString(); }
  function channelName(s) { return s === null || s === undefined ? "(no label)" : s; }
  function notice(text, kind) { return el("div", { class: "notice " + (kind || ""), role: kind === "err" ? "alert" : "status", text: text }); }

  function api(method, url, body) {
    var headers = { "content-type": "application/json" };
    if (token) headers.authorization = "Bearer " + token;
    if (packId) headers["x-pack"] = packId;
    return fetch(url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401 && token) { signOut(); throw new Error("Please log in again."); }
        if (!res.ok) throw new Error(data.error || "Something went wrong (" + res.status + ")");
        return data;
      });
    });
  }

  function signOut() {
    token = null; user = null;
    try { sessionStorage.removeItem("pilot.token"); sessionStorage.removeItem("pilot.name"); sessionStorage.removeItem("pilot.role"); } catch (e) { /* ignore */ }
    whoBox.hidden = true;
    stopTimer();
    showLogin();
  }
  document.getElementById("logout").addEventListener("click", signOut);

  // ---- log in ---------------------------------------------------------------------------------
  function showLogin(message) {
    clear(app);
    var email = el("input", { type: "email", autocomplete: "username", required: true, id: "email" });
    var password = el("input", { type: "password", autocomplete: "current-password", required: true, id: "password" });
    var note = el("div", { class: "notice err", role: "alert", hidden: !message, text: message || "" });
    app.appendChild(el("form", { class: "login", onsubmit: function (ev) {
      ev.preventDefault();
      note.hidden = true;
      api("POST", "/api/v1/auth/login", { email: email.value, password: password.value }).then(function (res) {
        if (res.role !== "reviewer" && res.role !== "admin") throw new Error("This account is not a reviewer. Ask your administrator to add you.");
        token = res.token; user = { name: res.displayName || email.value, role: res.role };
        tab = "overview";
        try { sessionStorage.setItem("pilot.token", token); sessionStorage.setItem("pilot.name", user.name); sessionStorage.setItem("pilot.role", user.role); } catch (e) { /* ignore */ }
        start();
      }).catch(function (err) { note.textContent = err.message; note.hidden = false; });
    } }, [
      el("h2", { text: "Pilot console log in" }),
      note,
      el("label", { for: "email", text: "Email" }), email,
      el("label", { for: "password", text: "Password" }), password,
      el("p", null, [el("button", { class: "primary", type: "submit", text: "Log in" })]),
      el("p", { class: "small", text: "For reviewers and administrators of the pilot. People are added by an administrator." })
    ]));
  }

  function start() {
    if (!user) {
      try { user = { name: sessionStorage.getItem("pilot.name") || "Reviewer", role: sessionStorage.getItem("pilot.role") || "reviewer" }; } catch (e) { user = { name: "Reviewer", role: "reviewer" }; }
    }
    whoName.textContent = user.name + " (" + user.role + ")";
    whoBox.hidden = false;
    startTimer();
    showShell();
  }

  // ---- shell and tabs -------------------------------------------------------------------------
  var content = null;
  var queueBadge = null;
  var openCount = null; // reports waiting, from the last numbers loaded

  function showShell() {
    clear(app);
    var tabs = el("div", { class: "tabs", role: "group", "aria-label": "Sections" });
    var defs = [["overview", "Overview"], ["queue", "Queue"], ["suggestions", "Suggestions"]];
    if (user.role === "admin") defs.push(["team", "Team"]);
    defs.push(["links", "Links"]);
    defs.forEach(function (d) {
      var b = el("button", { class: "tab", type: "button", "aria-pressed": tab === d[0] ? "true" : "false", onclick: function () { tab = d[0]; showShell(); } }, [d[1]]);
      if (d[0] === "queue") { queueBadge = el("span", { class: "count", hidden: true }); b.appendChild(queueBadge); setBadge(openCount); }
      tabs.appendChild(b);
    });
    content = el("div", { "aria-live": "polite" });
    app.appendChild(tabs);
    app.appendChild(content);
    render();
  }

  function render() {
    stampNode = null;
    if (tab === "overview") loadOverview();
    else if (tab === "queue") loadQueue();
    else if (tab === "suggestions") loadSuggestions();
    else if (tab === "team" && user.role === "admin") loadTeam();
    else showLinks();
  }

  // ---- auto refresh ---------------------------------------------------------------------------
  function startTimer() {
    stopTimer();
    timer = window.setInterval(function () {
      if (!token || document.visibilityState !== "visible") return;
      if (tab === "overview") loadOverview(true);
      else if (tab === "queue") loadQueue(true);
      else if (tab === "suggestions") loadSuggestions(true);
    }, 60000);
  }
  function stopTimer() { if (timer) { window.clearInterval(timer); timer = null; } }
  document.addEventListener("visibilitychange", function () {
    // Coming back to the tab after a while: catch up straight away rather than waiting for the next tick.
    if (token && document.visibilityState === "visible" && Date.now() - lastRefresh > 60000) {
      if (tab === "overview") loadOverview(true);
      else if (tab === "queue") loadQueue(true);
      else if (tab === "suggestions") loadSuggestions(true);
    }
  });
  function stamp() {
    lastRefresh = Date.now();
    if (stampNode) stampNode.textContent = "Last updated " + clock(new Date(lastRefresh)) + ". Refreshes every minute while this page is open.";
  }

  // ---- overview -------------------------------------------------------------------------------
  function loadOverview(quiet) {
    var url = "/api/v1/pilot/stats?days=" + encodeURIComponent(overviewState.days) + (overviewState.source ? "&source=" + encodeURIComponent(overviewState.source) : "");
    if (!quiet) { clear(content); content.appendChild(el("p", { class: "small", text: "Loading..." })); }
    api("GET", url).then(function (stats) {
      if (tab !== "overview") return;
      renderOverview(stats);
      stamp();
    }).catch(function (err) {
      if (tab !== "overview" || !token) return;
      if (quiet && stampNode) { stampNode.textContent = "Could not refresh (" + err.message + "). Showing the last numbers."; return; }
      clear(content); content.appendChild(notice(err.message, "err"));
    });
  }

  function statCard(n, label) { return el("div", { class: "stat" }, [el("div", { class: "n", text: n }), el("div", { class: "l", text: label })]); }
  function table(headers, rows, numeric) {
    var thead = el("tr", null, headers.map(function (h, i) { return el("th", { class: numeric && numeric.indexOf(i) >= 0 ? "num" : "", scope: "col", text: h }); }));
    var body = rows.map(function (r) { return el("tr", null, r.map(function (c, i) { return el("td", { class: numeric && numeric.indexOf(i) >= 0 ? "num" : "", text: String(c) }); })); });
    return el("div", { class: "table-wrap" }, [el("table", null, [el("thead", null, [thead]), el("tbody", null, body)])]);
  }

  function renderOverview(s) {
    if (!overviewState.source) setBadge(s.corrections.openNow);
    var sourcesKnown = {};
    // Keep every channel ever seen in the choices, so picking one does not make the others vanish.
    s.channels.forEach(function (c) { sourcesKnown[c.source === null ? "_none" : c.source] = true; });
    if (overviewState.source) sourcesKnown[overviewState.source] = true;

    var days = el("select", { id: "o-days", "aria-label": "Period", onchange: function (ev) { overviewState.days = Number(ev.target.value); loadOverview(); } });
    [[1, "Today"], [7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"], [90, "Last 90 days"], [365, "Last year"]].forEach(function (d) {
      var o = el("option", { value: String(d[0]), text: d[1] }); if (d[0] === overviewState.days) o.selected = true; days.appendChild(o);
    });
    var source = el("select", { id: "o-source", "aria-label": "Channel", onchange: function (ev) { overviewState.source = ev.target.value; loadOverview(); } }, [el("option", { value: "", text: "All channels" })]);
    Object.keys(sourcesKnown).sort().forEach(function (k) {
      var o = el("option", { value: k, text: k === "_none" ? "No label" : k }); if (k === overviewState.source) o.selected = true; source.appendChild(o);
    });
    stampNode = el("span", { class: "small stamp", role: "status" });
    var refresh = el("button", { type: "button", text: "Refresh", onclick: function () { loadOverview(); } });
    var bar = el("div", { class: "bar" }, [
      el("div", null, [el("label", { for: "o-days", text: "Period" }), days]),
      el("div", null, [el("label", { for: "o-source", text: "Channel" }), source]),
      el("div", null, [refresh]),
      user.role === "admin" ? el("div", null, [el("button", { type: "button", text: "Download daily CSV", onclick: downloadCsv })]) : null,
      stampNode
    ]);

    clear(content);
    content.appendChild(bar);
    var t = s.totals;
    if (t.sessions === 0 && t.questions === 0) {
      content.appendChild(el("div", { class: "panel" }, [
        el("h2", { text: "No data yet" }),
        el("p", { text: "Nobody has asked a question in this period" + (overviewState.source ? " through this channel" : "") + ". Numbers appear here as soon as learners start using the assistant." }),
        el("p", { class: "small", text: "Share a link from the Links tab so each place or group shows up as its own channel." })
      ]));
      content.appendChild(corrections(s));
      return;
    }

    var cards = el("div", { class: "cards" }, [
      statCard(num(t.sessions), "Conversations started"),
      statCard(num(t.engagedSessions) + " (" + pct(t.engagedSessions, t.sessions) + ")", "With 2 or more questions"),
      statCard(num(t.questions), "Questions asked"),
      statCard(s.ratings.rated ? num(s.ratings.helpful) + " / " + num(s.ratings.notHelpful) : "-", "Helpful / not helpful ratings"),
      statCard(num(s.corrections.openNow), "Reports waiting for a reviewer")
    ]);
    content.appendChild(cards);

    content.appendChild(el("div", { class: "panel" }, [el("h2", { text: "Per day" }), chart(s.perDay)]));

    var channelRows = s.channels.map(function (c) { return [channelName(c.source), num(c.sessions), num(c.questions), num(c.helpful), num(c.notHelpful)]; });
    var langs = el("div", { class: "panel" }, [el("h2", { text: "Language chosen" })]);
    var totalModes = s.languageModes.reduce(function (a, m) { return a + m.sessions; }, 0);
    if (!s.languageModes.length) langs.appendChild(el("p", { class: "small", text: "No conversations yet." }));
    s.languageModes.forEach(function (m) {
      var share = totalModes > 0 ? m.sessions / totalModes : 0;
      langs.appendChild(el("div", { class: "mode-row" }, [
        el("span", { text: MODE_NAMES[m.mode] || m.mode }),
        svg("svg", { viewBox: "0 0 100 14", preserveAspectRatio: "none", role: "img", "aria-label": (MODE_NAMES[m.mode] || m.mode) + " " + pct(m.sessions, totalModes) }, [
          svg("rect", { class: "track", x: "0", y: "0", width: "100", height: "14", rx: "3" }),
          svg("rect", { class: "fill", x: "0", y: "0", width: String(Math.max(share * 100, share > 0 ? 1 : 0)), height: "14", rx: "3" })
        ]),
        el("span", { class: "small", text: pct(m.sessions, totalModes) + " (" + num(m.sessions) + ")" })
      ]));
    });
    langs.appendChild(el("p", { class: "small", text: "Of conversations started in this period; the language is the one the learner had selected when the conversation began." }));

    content.appendChild(el("div", { class: "grid two" }, [
      el("div", { class: "panel" }, [el("h2", { text: "Channels" }), channelRows.length ? table(["Channel", "Conversations", "Questions", "Helpful", "Not helpful"], channelRows, [1, 2, 3, 4]) : el("p", { class: "small", text: "No channels yet." }),
        el("p", { class: "small", text: "A channel is the label on the link a learner opened (for example ?ref=kibera-hub). It says where a link was shared, not who the learner is. Conversations that came without a label show as (no label)." })]),
      langs
    ]));

    content.appendChild(quality(s));
    content.appendChild(el("div", { class: "grid two" }, [costPanel(s), corrections(s)]));
    content.appendChild(el("p", { class: "small", text: "Days are Nairobi time. Anonymous chat has no identity, so these are conversations, not people. Learning, trust and scam recognition are not measured here." }));
  }

  function chart(perDay) {
    var W = 720, H = 240, L = 36, R = 10, T = 10, B = 28;
    var innerW = W - L - R, innerH = H - T - B;
    var n = perDay.length;
    var maxV = 1;
    perDay.forEach(function (d) { maxV = Math.max(maxV, d.questions, d.sessions); });
    var nice = maxV <= 5 ? 5 : Math.ceil(maxV / 5) * 5;
    var summary = perDay.map(function (d) { return d.day + ": " + d.questions + " questions, " + d.sessions + " conversations"; }).join("; ");
    var root = svg("svg", { class: "chart", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Questions and conversations per day. " + summary });
    [0, 0.5, 1].forEach(function (f) {
      var y = T + innerH - f * innerH;
      root.appendChild(svg("line", { class: "grid-line", x1: String(L), x2: String(W - R), y1: String(y), y2: String(y) }));
      root.appendChild(svg("text", { class: "axis-text", x: String(L - 6), y: String(y + 4), "text-anchor": "end", text: String(Math.round(nice * f)) }));
    });
    var slot = innerW / Math.max(n, 1);
    var bw = Math.max(2, Math.min(34, slot * 0.7));
    var points = [];
    perDay.forEach(function (d, i) {
      var cx = L + slot * i + slot / 2;
      var h = (d.questions / nice) * innerH;
      var g = svg("g", null, [
        svg("title", { text: d.day + ": " + d.questions + " questions, " + d.sessions + " conversations started" }),
        svg("rect", { class: "hit", x: String(L + slot * i), y: String(T), width: String(slot), height: String(innerH) }),
        svg("rect", { class: "bar-q", x: String(cx - bw / 2), y: String(T + innerH - h), width: String(bw), height: String(Math.max(h, d.questions > 0 ? 1 : 0)), rx: "2" })
      ]);
      root.appendChild(g);
      points.push([cx, T + innerH - (d.sessions / nice) * innerH]);
    });
    if (n > 1) root.appendChild(svg("polyline", { class: "line-s", points: points.map(function (p) { return p[0] + "," + p[1]; }).join(" ") }));
    if (n <= 45) points.forEach(function (p) { root.appendChild(svg("circle", { class: "dot-s", cx: String(p[0]), cy: String(p[1]), r: "3" })); });
    var labelAt = n <= 1 ? [0] : n <= 7 ? perDay.map(function (_, i) { return i; }) : [0, Math.floor((n - 1) / 2), n - 1];
    labelAt.forEach(function (i) {
      root.appendChild(svg("text", { class: "axis-text", x: String(L + slot * i + slot / 2), y: String(H - 8), "text-anchor": i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle", text: perDay[i].day.slice(5) }));
    });
    return el("div", null, [root, el("div", { class: "legend" }, [el("span", null, [el("i"), "Questions asked"]), el("span", null, [el("i", { class: "b" }), "Conversations started"])])]);
  }

  function quality(s) {
    var a = s.answers, r = s.ratings, t = s.totals;
    var rows = [
      ["Answers rated by learners", num(r.rated) + " (" + pct(r.rated, t.answers) + " of answers)"],
      ["Rated not helpful", num(r.notHelpful) + " (" + pct(r.notHelpful, r.rated) + " of ratings)"],
      ["Saved card shown because the model failed", num(a.fallback) + " (" + pct(a.fallback, t.answers) + ")"],
      ["Answer cut off while being written", num(a.interrupted)],
      ["Withheld by the output safety check", num(a.withheldBySafetyCheck)],
      ["Search found little (confidence under 0.3)", num(s.lowConfidence.low) + " of " + num(s.lowConfidence.of) + " (" + pct(s.lowConfidence.low, s.lowConfidence.of) + ")"],
      ["Answer time, middle / slowest 1 in 20", (s.latencyMs.p50 === null ? "-" : (s.latencyMs.p50 / 1000).toFixed(1) + " s") + " / " + (s.latencyMs.p95 === null ? "-" : (s.latencyMs.p95 / 1000).toFixed(1) + " s") + " (" + num(s.latencyMs.answers) + " answers; the whole answer, not first word)"]
    ];
    var panel = el("div", { class: "panel" }, [el("h2", { text: "Safety and quality" }), table(["Signal", "Count"], rows)]);
    if (r.notHelpfulReasons.length) {
      panel.appendChild(el("h3", { text: "Why answers were rated not helpful" }));
      panel.appendChild(table(["Reason", "Times"], r.notHelpfulReasons.map(function (x) { return [REASON_NAMES[x.reason] || x.reason, num(x.n)]; }), [1]));
    }
    panel.appendChild(el("h3", { text: "Safety events" }));
    if (s.safetyEvents.length) panel.appendChild(table(["Kind", "Times"], s.safetyEvents.map(function (x) { return [x.kind.replace(/_/g, " "), num(x.n)]; }), [1]));
    else panel.appendChild(el("p", { class: "small", text: "None in this period." }));
    panel.appendChild(el("p", { class: "small", text: "Safety events are secrets caught on the way in (the message is never sent to a model) and answers flagged as containing names or figures that were not in the cards." }));
    return panel;
  }

  function costPanel(s) {
    var panel = el("div", { class: "panel" }, [el("h2", { text: "Cost" })]);
    if (!s.model) { panel.appendChild(el("p", { class: "small", text: "Model calls and cost are shown for all channels together, because failed calls cannot be tied to a channel. Choose All channels to see them." })); return panel; }
    panel.appendChild(table(["Measure", "Value"], [
      ["Model calls", num(s.model.calls)],
      ["Failed calls", num(s.model.failures)],
      ["Cost in this period", usd(s.model.costUsd)],
      ["Cost per 1,000 answers", usd(s.model.costPer1000AnswersUsd)]
    ]));
    panel.appendChild(el("p", { class: "small", text: "Hosted-model spend only; includes calls made by reviewers trying answers. Electricity and hardware for a community node are not counted here." }));
    return panel;
  }

  function corrections(s) {
    var c = s.corrections;
    var panel = el("div", { class: "panel" }, [el("h2", { text: "Community and corrections" }), table(["Measure", "Value"], [
      ["Reports raised in this period", num(c.raisedInPeriod)],
      ["Reports resolved in this period", num(c.resolvedInPeriod)],
      ["Waiting now", num(c.openNow)],
      ["Community language contributions", num(s.communityContributions)]
    ])]);
    var order = ["needs_factual_review", "needs_language_review", "draft", "approved", "published", "deprecated", "archived"];
    var rows = order.filter(function (k) { return s.reviewBacklog[k] !== undefined; }).map(function (k) { return [STATUS_NAMES[k], num(s.reviewBacklog[k])]; });
    if (rows.length) { panel.appendChild(el("h3", { text: "Knowledge cards by status" })); panel.appendChild(table(["Status", "Cards"], rows, [1])); }
    return panel;
  }

  function downloadCsv() {
    var headers = { authorization: "Bearer " + token };
    if (packId) headers["x-pack"] = packId;
    fetch("/api/v1/pilot/export.csv?days=" + encodeURIComponent(Math.max(overviewState.days, 30)), { headers: headers }).then(function (res) {
      if (!res.ok) return res.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || "Could not download (" + res.status + ")"); });
      return res.blob();
    }).then(function (blob) {
      saveBlob(blob, "pilot-daily.csv");
    }).catch(function (err) { content.insertBefore(notice(err.message, "err"), content.firstChild); });
  }
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ---- queue ----------------------------------------------------------------------------------
  function reviewLink(q) {
    return "/review?q=" + encodeURIComponent(q) + (packId ? "&pack=" + encodeURIComponent(packId) : "");
  }
  function busyEditing() {
    var a = document.activeElement;
    if (a && content && content.contains(a) && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT")) return true;
    return Array.prototype.some.call(content.querySelectorAll("input.note"), function (i) { return i.value; });
  }

  function loadQueue(quiet) {
    if (quiet && busyEditing()) return;
    if (!quiet) { clear(content); content.appendChild(el("p", { class: "small", text: "Loading..." })); }
    api("GET", "/api/v1/pilot/queue?state=" + queueState.state + "&limit=50").then(function (q) {
      if (tab !== "queue") return;
      renderQueue(q);
      stamp();
    }).catch(function (err) {
      if (tab !== "queue" || !token) return;
      if (quiet && stampNode) { stampNode.textContent = "Could not refresh (" + err.message + ")."; return; }
      clear(content); content.appendChild(notice(err.message, "err"));
    });
  }

  function setBadge(open) {
    if (open !== null) openCount = open;
    if (!queueBadge || openCount === null) return;
    queueBadge.textContent = String(openCount);
    queueBadge.hidden = !openCount;
  }

  function renderQueue(q) {
    setBadge(q.counts.open);
    clear(content);
    stampNode = el("span", { class: "small stamp", role: "status" });
    var toggle = el("div", { class: "tabs", role: "group", "aria-label": "Show" }, [
      el("button", { class: "tab", type: "button", "aria-pressed": queueState.state === "open" ? "true" : "false", text: "Waiting (" + q.counts.open + ")", onclick: function () { queueState.state = "open"; loadQueue(); } }),
      el("button", { class: "tab", type: "button", "aria-pressed": queueState.state === "resolved" ? "true" : "false", text: "Resolved (" + q.counts.resolved + ")", onclick: function () { queueState.state = "resolved"; loadQueue(); } })
    ]);
    content.appendChild(el("div", { class: "bar" }, [toggle, stampNode]));
    content.appendChild(el("p", { class: "small", text: "Answers a learner rated not helpful or reported. This is the only place on this console that shows what learners asked and what the assistant said: treat it as sensitive, and never copy it into reports or proposals. Resolved reports count as corrections raised and resolved." }));

    if (!q.items.length) {
      content.appendChild(el("div", { class: "panel" }, [
        el("h2", { text: queueState.state === "open" ? "Nothing waiting" : "Nothing resolved yet" }),
        el("p", { text: queueState.state === "open" ? "No reported or not-helpful answers are waiting for review." : "Resolved reports will be listed here." })
      ]));
    }
    q.items.forEach(function (it) { content.appendChild(queueItem(it)); });

    content.appendChild(el("p", null, [el("a", { href: reviewLink(""), text: "Open the card list in the review page" })]));
    content.appendChild(flagged(q.flagged));
  }

  function cardLinks(retrieved, extra) {
    var box = el("div", { class: "linkout" });
    if (retrieved === null) box.appendChild(el("span", { class: "small", text: "Cards used: not recorded for this answer." }));
    else if (!retrieved.length) box.appendChild(el("span", { class: "small", text: "No card was found for this question, so the assistant had nothing reviewed to answer from." }));
    else {
      box.appendChild(el("span", { class: "small", text: "Cards used:" }));
      retrieved.forEach(function (c) { box.appendChild(el("a", { href: reviewLink(c.id), text: c.title || c.id, title: "Open " + c.id + " in the review page" })); });
    }
    if (extra) box.appendChild(extra);
    return box;
  }

  function queueItem(it) {
    var tags = [el("span", { class: "tag bad", text: it.reason ? (REASON_NAMES[it.reason] || it.reason) : "Not helpful" })];
    if (it.answerFlag) tags.push(el("span", { class: "tag", text: "flag: " + it.answerFlag.replace(/_/g, " ") }));
    var meta = el("div", { class: "meta" }, [
      el("span", { text: when(it.createdAt) }),
      el("span", { text: "channel: " + channelName(it.source) }),
      el("span", { text: "language: " + (MODE_NAMES[it.languageMode] || it.languageMode) }),
      it.retrievalConfidence === null ? null : el("span", { text: "search confidence " + Number(it.retrievalConfidence).toFixed(2) })
    ].concat(tags));
    var box = el("div", { class: "item" }, [
      meta,
      el("h3", { text: "Question" }),
      el("div", { class: "say q", text: it.question || "(not available)" }),
      el("h3", { text: "Answer" }),
      el("div", { class: "say", text: it.answer })
    ]);
    if (it.comment) { box.appendChild(el("h3", { text: "Learner's comment" })); box.appendChild(el("div", { class: "say", text: it.comment })); }
    box.appendChild(cardLinks(it.retrieved, el("a", { href: reviewLink(it.question ? it.question.slice(0, 60) : ""), text: "Search the cards for this question" })));

    if (it.resolved) {
      box.appendChild(notice("Resolved: " + (RESOLUTION_TEXT[it.resolved.resolution] || it.resolved.resolution) + (it.resolved.note ? " - " + it.resolved.note : "") + " (" + when(it.resolved.at) + (it.resolved.by ? ", " + it.resolved.by : "") + ")", "ok"));
      return box;
    }
    var select = el("select", { "aria-label": "How was it resolved?" }, [el("option", { value: "", text: "How was it resolved?" })]);
    RESOLUTIONS.forEach(function (r) { select.appendChild(el("option", { value: r[0], text: r[1] })); });
    var note = el("input", { class: "note", placeholder: "Note (optional)", maxlength: "1000", "aria-label": "Note" });
    var msg = el("div");
    var go = el("button", { class: "primary", type: "button", text: "Resolve", onclick: function () {
      clear(msg);
      if (!select.value) { msg.appendChild(notice("Choose how it was resolved first.", "err")); return; }
      go.disabled = true;
      api("POST", "/api/v1/pilot/queue/" + encodeURIComponent(it.feedbackId) + "/resolve", { resolution: select.value, note: note.value || undefined }).then(function () {
        loadQueue();
      }).catch(function (err) { go.disabled = false; msg.appendChild(notice(err.message, "err")); });
    } });
    box.appendChild(el("div", { class: "row" }, [select, note, go]));
    box.appendChild(msg);
    return box;
  }

  // ---- "say it your way" suggestions (docs/features/F-003-say-it-your-way.md) ---------------------
  var SUGGESTION_REASONS = { too_formal: "Too formal", wrong_words: "Wrong words", wrong_facts: "Wrong facts", other: "Something else" };
  var SUGGESTION_STATUS = { approved: "Approved", rejected: "Rejected", card_fix: "Card needs fixing" };

  function loadSuggestions(quiet) {
    if (quiet && busyEditing()) return;
    if (!quiet) { clear(content); content.appendChild(el("p", { class: "small", text: "Loading..." })); }
    api("GET", "/api/v1/teach/queue?state=" + suggestionState.state + "&limit=50").then(function (q) {
      if (tab !== "suggestions") return;
      renderSuggestions(q);
      stamp();
    }).catch(function (err) {
      if (tab !== "suggestions" || !token) return;
      if (quiet && stampNode) { stampNode.textContent = "Could not refresh (" + err.message + ")."; return; }
      clear(content); content.appendChild(notice(err.message, "err"));
    });
  }

  function renderSuggestions(q) {
    clear(content);
    stampNode = el("span", { class: "small stamp", role: "status" });
    var toggle = el("div", { class: "tabs", role: "group", "aria-label": "Show" }, [
      el("button", { class: "tab", type: "button", "aria-pressed": suggestionState.state === "pending" ? "true" : "false", text: "Waiting (" + q.counts.pending + ")", onclick: function () { suggestionState.state = "pending"; loadSuggestions(); } }),
      el("button", { class: "tab", type: "button", "aria-pressed": suggestionState.state === "decided" ? "true" : "false", text: "Decided", onclick: function () { suggestionState.state = "decided"; loadSuggestions(); } })
    ]);
    content.appendChild(el("div", { class: "bar" }, [toggle, stampNode]));
    content.appendChild(el("p", { class: "small", text: "Learners' own wording for an answer (\"say it your way\"). Nothing here is used until you approve it. Approving adds the phrase to the community's language examples, used only as the learner allowed. Suggestions about seed phrases, scams or sending money need two different reviewers. You may tidy the wording before approving; if the problem is a fact, choose \"Card needs fixing\"." }));
    content.appendChild(el("p", { class: "small", text: "This week: " + q.counts.raisedWeek + " raised, " + q.counts.approvedWeek + " approved, " + q.counts.rejectedWeek + " rejected, " + q.counts.cardFixWeek + " sent to card fixes." }));
    if (!q.items.length) {
      content.appendChild(el("div", { class: "panel" }, [el("h2", { text: suggestionState.state === "pending" ? "Nothing waiting" : "Nothing decided yet" })]));
      return;
    }
    q.items.forEach(function (it) { content.appendChild(suggestionItem(it)); });
  }

  function suggestionItem(it) {
    var uses = [];
    if (it.consent.answers) uses.push("answers");
    if (it.consent.testing) uses.push("testing");
    if (it.consent.training) uses.push("training");
    var tags = [el("span", { class: "tag", text: "may be used for: " + (uses.length ? uses.join(", ") : "nothing yet") })];
    if (it.safetyTopic) tags.push(el("span", { class: "tag bad", text: "safety topic: two reviewers" }));
    if (it.reason) tags.push(el("span", { class: "tag", text: SUGGESTION_REASONS[it.reason] || it.reason }));
    var box = el("div", { class: "item" }, [
      el("div", { class: "meta" }, [el("span", { text: when(it.createdAt) }), el("span", { text: "language: " + (MODE_NAMES[it.languageMode] || it.languageMode) })].concat(tags)),
      el("h3", { text: "Question" }), el("div", { class: "say q", text: it.questionText || "(not shared)" }),
      el("h3", { text: "The assistant said" }), el("div", { class: "say", text: it.answerText || "(not shared)" }),
      el("h3", { text: "The learner would say" }), el("div", { class: "say", text: it.suggestion })
    ]);
    if (it.status !== "pending") {
      box.appendChild(notice((SUGGESTION_STATUS[it.status] || it.status) + (it.decisionNote ? " - " + it.decisionNote : "") + (it.decidedAt ? " (" + when(it.decidedAt) + ")" : ""), it.status === "approved" ? "ok" : ""));
      return box;
    }
    if (it.firstApproval) box.appendChild(notice("Approved once. A second, different reviewer must approve it before it is used.", ""));
    var text = el("textarea", { class: "note", rows: "3", maxlength: "1000", "aria-label": "Wording to approve (you may tidy it)" });
    text.value = it.suggestion;
    var note = el("input", { class: "note", placeholder: "Note (optional)", maxlength: "1000", "aria-label": "Note" });
    var msg = el("div");
    function send(decision, button) {
      clear(msg);
      button.disabled = true;
      api("POST", "/api/v1/teach/" + encodeURIComponent(it.id) + "/decide", { decision: decision, text: decision === "approve" ? text.value : undefined, note: note.value || undefined }).then(function () {
        loadSuggestions();
      }).catch(function (err) { button.disabled = false; msg.appendChild(notice(err.message, "err")); });
    }
    var approve = el("button", { class: "primary", type: "button", text: "Approve", onclick: function () { send("approve", approve); } });
    var cardFix = el("button", { type: "button", text: "Card needs fixing", onclick: function () { send("card_fix", cardFix); } });
    var reject = el("button", { type: "button", text: "Reject", onclick: function () { send("reject", reject); } });
    box.appendChild(el("label", { class: "small", text: "Wording to approve" }));
    box.appendChild(text);
    box.appendChild(el("div", { class: "row" }, [note, approve, cardFix, reject]));
    box.appendChild(msg);
    return box;
  }

  function flagged(list) {
    var d = el("details", null, [el("summary", { text: "Flagged by the safety system (" + list.length + "), read-only" })]);
    d.appendChild(el("p", { class: "small", text: "Answers the assistant's own checks flagged: withheld by the output check, or containing names or figures that were not in the cards. Nobody reported these; they are here for context." }));
    if (!list.length) d.appendChild(el("p", { class: "small", text: "None." }));
    list.forEach(function (f) {
      var box = el("div", { class: "item" }, [
        el("div", { class: "meta" }, [el("span", { text: when(f.at) }), el("span", { text: "channel: " + channelName(f.source) }), el("span", { class: "tag", text: f.kind.replace(/_/g, " ") })]),
        el("h3", { text: "Question" }), el("div", { class: "say q", text: f.question || "(not available)" }),
        el("h3", { text: "Answer" }), el("div", { class: "say", text: f.answer })
      ]);
      if (f.words && f.words.length) box.appendChild(el("p", { class: "small", text: "Not in the cards: " + f.words.join(", ") }));
      box.appendChild(cardLinks(f.retrieved));
      d.appendChild(box);
    });
    return d;
  }

  // ---- team -----------------------------------------------------------------------------------
  var TEAM_PAGE = 20;
  function loadTeam() {
    clear(content);
    content.appendChild(el("p", { class: "small", text: "Loading..." }));
    api("GET", "/api/v1/admin/users?limit=" + TEAM_PAGE + "&offset=" + teamState.offset + (teamState.q ? "&q=" + encodeURIComponent(teamState.q) : "")).then(function (res) {
      if (tab !== "team") return;
      renderTeam(res);
    }).catch(function (err) { if (tab === "team" && token) { clear(content); content.appendChild(notice(err.message, "err")); } });
  }

  function renderTeam(res) {
    clear(content);
    var search = el("input", { type: "search", id: "t-q", placeholder: "Search name or email", value: teamState.q, "aria-label": "Search team", onchange: function (ev) { teamState.q = ev.target.value.trim(); teamState.offset = 0; loadTeam(); } });
    content.appendChild(el("div", { class: "bar" }, [el("div", { class: "grow" }, [search])]));
    content.appendChild(el("p", { class: "small", text: "Reviewers can edit cards, see this console and resolve reports. Administrators can also download the export and manage this list. People must first create an account themselves (Contribute in the app); then find them here and change their role. Changes take effect on their next request, and every change is logged." }));
    if (!res.users.length) content.appendChild(el("div", { class: "panel" }, [el("p", { text: teamState.q ? "Nobody matches that search." : "Nobody has registered yet." })]));
    res.users.forEach(function (u) {
      var sel = el("select", { "aria-label": "Role for " + u.email });
      ["contributor", "reviewer", "admin"].forEach(function (r) { var o = el("option", { value: r, text: r }); if (r === u.role) o.selected = true; sel.appendChild(o); });
      var msg = el("div", { "aria-live": "polite" });
      var save = el("button", { type: "button", text: "Save role", onclick: function () {
        clear(msg);
        if (sel.value === u.role) { msg.appendChild(notice("That is already their role.", "")); return; }
        save.disabled = true;
        api("PUT", "/api/v1/admin/users/" + encodeURIComponent(u.id) + "/role", { role: sel.value }).then(function (r) {
          u.role = r.user.role; save.disabled = false;
          clear(msg); msg.appendChild(notice("Saved: " + r.user.email + " is now " + r.user.role + ".", "ok"));
        }).catch(function (err) { save.disabled = false; sel.value = u.role; clear(msg); msg.appendChild(notice(err.message, "err")); });
      } });
      content.appendChild(el("div", { class: "item" }, [
        el("div", null, [el("strong", { text: u.displayName || u.email }), u.displayName ? el("span", { class: "small", text: "  " + u.email }) : null]),
        el("div", { class: "meta" }, [el("span", { text: "joined " + when(u.createdAt) })]),
        el("div", { class: "row" }, [sel, el("span"), save]), msg
      ]));
    });
    var from = res.total === 0 ? 0 : res.offset + 1, to = Math.min(res.offset + res.users.length, res.total);
    content.appendChild(el("div", { class: "pager" }, [
      el("button", { type: "button", text: "Previous", disabled: res.offset <= 0, onclick: function () { teamState.offset = Math.max(0, teamState.offset - TEAM_PAGE); loadTeam(); } }),
      el("button", { type: "button", text: "Next", disabled: res.offset + res.users.length >= res.total, onclick: function () { teamState.offset += TEAM_PAGE; loadTeam(); } }),
      el("span", { class: "small", text: from + "-" + to + " of " + res.total })
    ]));
  }

  // ---- links ----------------------------------------------------------------------------------
  function showLinks() {
    clear(content);
    var base = DEFAULT_APP_URL;
    try { base = localStorage.getItem("pilot.appUrl") || DEFAULT_APP_URL; } catch (e) { base = DEFAULT_APP_URL; }
    var label = el("input", { id: "l-label", placeholder: "kibera-hub", autocomplete: "off", spellcheck: "false", maxlength: "32", "aria-describedby": "l-help" });
    var appUrl = el("input", { id: "l-app", value: base, inputmode: "url", autocomplete: "off", spellcheck: "false" });
    var help = el("p", { id: "l-help", class: "small", text: "Lowercase letters, numbers and hyphens, up to 32 characters." });
    var out = el("div");

    function build() {
      clear(out);
      var raw = label.value.trim();
      if (!raw) { help.textContent = "Type a label for the place or group, for example kibera-hub or market-day-oct."; return; }
      if (!SLUG.test(raw)) { help.textContent = "Not a valid label. Use lowercase letters, numbers and hyphens only, starting with a letter or number, up to 32 characters."; return; }
      var root = appUrl.value.trim();
      var parsed = null;
      try { parsed = new URL(root); } catch (e) { parsed = null; }
      if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) { help.textContent = "The app address must be a full web address, like " + DEFAULT_APP_URL; return; }
      help.textContent = "This label will appear as a channel in the Overview.";
      try { localStorage.setItem("pilot.appUrl", root); } catch (e) { /* ignore */ }
      parsed.search = ""; parsed.hash = "";
      var link = parsed.toString() + "?ref=" + raw;
      var linkBox = el("input", { id: "l-link", readonly: true, value: link, "aria-label": "Learner link" });
      var copied = el("span", { class: "small", role: "status" });
      var copy = el("button", { class: "primary", type: "button", text: "Copy link", onclick: function () {
        copyText(link, linkBox).then(function () { copied.textContent = "Copied."; }, function () { copied.textContent = "Select the link and copy it."; });
      } });
      var box = el("div", { class: "qr-box" });
      try {
        var qr = window.AfribitQR.encode(link);
        var path = window.AfribitQR.toSvgPath(qr, 4);
        var node = svg("svg", { id: "l-qr", viewBox: path.viewBox, role: "img", "aria-label": "QR code for " + link, "shape-rendering": "crispEdges" }, [svg("path", { class: "dark", d: path.d })]);
        var dl = el("button", { type: "button", text: "Download QR (SVG)", onclick: function () {
          var w = Number(path.viewBox.split(" ")[2]);
          var file = '<svg xmlns="' + SVG + '" viewBox="' + path.viewBox + '" width="' + (w * 10) + '" height="' + (w * 10) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#000" d="' + path.d + '"/></svg>';
          saveBlob(new Blob([file], { type: "image/svg+xml" }), "afribit-" + raw + ".svg");
        } });
        box.appendChild(node);
        box.appendChild(el("div", { class: "actions" }, [dl]));
      } catch (err) {
        box.appendChild(notice("Could not draw the QR code: " + err.message, "err"));
      }
      out.appendChild(el("label", { for: "l-link", text: "Learner link" }));
      out.appendChild(el("div", { class: "copy-row" }, [linkBox, copy]));
      out.appendChild(copied);
      out.appendChild(el("h3", { text: "QR code" }));
      out.appendChild(box);
    }
    label.addEventListener("input", build);
    appUrl.addEventListener("input", build);

    content.appendChild(el("div", { class: "panel" }, [
      el("h2", { text: "Links for learners" }),
      el("p", { text: "Make one link per place, group or poster. Learners who open it are counted under that label, so you can see which channels bring people in. Nothing else about them is recorded." }),
      el("label", { for: "l-label", text: "Channel label" }), label, help,
      el("label", { for: "l-app", text: "App address" }), appUrl,
      out,
      el("h3", { text: "Good to know" }),
      el("ul", null, [
        el("li", { text: "A label says where a link was shared, never who clicked it. Do not put names, phone numbers or anything personal in it." }),
        el("li", { text: "Use one label for a group of about 10 or more learners. The shareable export hides any day-and-channel count under 5, so tiny channels show up as blanks." }),
        el("li", { text: "The label is saved in the learner's browser, so it still counts if they come back later or install the app to their home screen." })
      ])
    ]));
  }

  function copyText(text, input) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try { input.select(); document.execCommand("copy") ? resolve() : reject(new Error("copy failed")); } catch (e) { reject(e); }
    });
  }

  if (token) start(); else showLogin();
})();
