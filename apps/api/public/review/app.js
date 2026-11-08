// Reviewer page for knowledge cards. Plain JavaScript, no build step, no inline script.
// Everything from the server is put on the page with textContent, never as HTML.
(function () {
  "use strict";

  var app = document.getElementById("app");
  var whoBox = document.getElementById("who");
  var whoName = document.getElementById("whoName");
  var token = null;
  var user = null;
  var overview = null;
  var state = { status: "needs_factual_review", q: "" };
  // /review?q=<text> opens the card list searched for that text across every status (the pilot console links here).
  try { var urlQ = new URLSearchParams(window.location.search).get("q"); if (urlQ !== null) state = { status: "", q: urlQ.slice(0, 200) }; } catch (e) { /* ignore */ }
  // A server can serve several packs. /review?pack=<id> reviews that pack; every call below names it.
  var packId = null;
  try { packId = new URLSearchParams(window.location.search).get("pack"); } catch (e) { packId = null; }

  try { token = sessionStorage.getItem("review.token"); } catch (e) { token = null; }

  var LABELS = {
    draft: "Draft", needs_factual_review: "Needs fact check", needs_language_review: "Needs language check",
    approved: "Approved", published: "Published", deprecated: "Retired", archived: "Archived"
  };
  var ACTIONS = {
    needs_factual_review: { text: "Send for fact check", primary: true },
    needs_language_review: { text: "Facts are correct: send to language check", primary: true },
    approved: { text: "Approve (makes it live)", primary: true },
    published: { text: "Publish", primary: true },
    draft: { text: "Send back to draft" },
    deprecated: { text: "Retire (stops answering)", danger: true },
    archived: { text: "Archive", danger: true }
  };
  var BACK = {
    "needs_language_review>needs_factual_review": "Send back: the facts need checking",
    "approved>needs_language_review": "Send back to language check",
    "published>needs_factual_review": "Take off air for a fact check",
    "deprecated>draft": "Rework as a draft",
    "needs_factual_review>draft": "Send back to draft",
    "needs_language_review>draft": "Send back to draft"
  };
  var CHECKS = {
    draft: "Write the full, accurate answer for a reviewer to check, then the same in the simplest words. Add a safety note if something must always be said with it.",
    needs_factual_review: "Is every statement true and complete? Is anything missing that could make someone lose money or be tricked? Check against the source.",
    needs_language_review: "Read the card aloud. Would the assistant be able to say this naturally in each language mode? Are the simple words really simple?",
    approved: "Approved cards answer learners now. Publish when the whole pack release is ready, or send it back if you have doubts.",
    published: "This card is live. Editing its words takes it off air until it has been checked again.",
    deprecated: "Retired cards no longer answer. Move to draft to rework one.",
    archived: "Archived cards are kept for the record."
  };

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
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function badge(status) { return el("span", { class: "badge" + (status === "approved" || status === "published" ? " live" : ""), text: LABELS[status] || status }); }
  function when(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }

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
    try { sessionStorage.removeItem("review.token"); } catch (e) { /* ignore */ }
    whoBox.hidden = true;
    showLogin();
  }
  document.getElementById("logout").addEventListener("click", signOut);

  function showLogin(message) {
    clear(app);
    var email = el("input", { type: "email", autocomplete: "username", required: true, id: "email" });
    var password = el("input", { type: "password", autocomplete: "current-password", required: true, id: "password" });
    var note = el("div", { class: "notice err", role: "alert", hidden: !message, text: message || "" });
    var form = el("form", { class: "login", onsubmit: function (ev) {
      ev.preventDefault();
      note.hidden = true;
      api("POST", "/api/v1/auth/login", { email: email.value, password: password.value }).then(function (res) {
        if (res.role !== "reviewer" && res.role !== "admin") throw new Error("This account is not a reviewer. Ask your administrator to add you.");
        token = res.token; user = { name: res.displayName || email.value, role: res.role };
        try { sessionStorage.setItem("review.token", token); sessionStorage.setItem("review.name", user.name); } catch (e) { /* ignore */ }
        start();
      }).catch(function (err) { note.textContent = err.message; note.hidden = false; });
    } }, [
      el("h2", { text: "Reviewer log in" }),
      note,
      el("label", { for: "email", text: "Email" }), email,
      el("label", { for: "password", text: "Password" }), password,
      el("p", null, [el("button", { class: "primary", type: "submit", text: "Log in" })]),
      el("p", { class: "small", text: "Reviewers are added by the person who runs this service." })
    ]);
    app.appendChild(form);
  }

  function start() {
    if (!user) { try { user = { name: sessionStorage.getItem("review.name") || "Reviewer" }; } catch (e) { user = { name: "Reviewer" }; } }
    whoName.textContent = user.name;
    whoBox.hidden = false;
    api("GET", "/api/v1/review/overview").then(function (o) {
      overview = o;
      document.getElementById("title").textContent = o.pack.name + " review";
      document.title = o.pack.name + " review";
      showList();
    }).catch(function (err) { if (token) showLogin(err.message); });
  }

  // ---- list ----------------------------------------------------------------------------------
  function showList(flash) {
    clear(app);
    if (flash) app.appendChild(el("div", { class: "notice ok", role: "status", text: flash }));
    var tabs = el("div", { class: "tabs", role: "group", "aria-label": "Filter by status" });
    var order = ["", "needs_factual_review", "needs_language_review", "draft", "approved", "published", "deprecated", "archived"];
    order.forEach(function (s) {
      var n = s ? ((overview.counts && overview.counts[s]) || 0) : Object.keys(overview.counts || {}).reduce(function (a, k) { return a + overview.counts[k]; }, 0);
      tabs.appendChild(el("button", { class: "tab", type: "button", "aria-pressed": state.status === s ? "true" : "false", text: (s ? LABELS[s] : "All") + " (" + n + ")",
        onclick: function () { state.status = s; showList(); } }));
    });
    var search = el("input", { type: "search", placeholder: "Search title, id or text", value: state.q, "aria-label": "Search cards",
      onchange: function (ev) { state.q = ev.target.value; showList(); } });
    var add = el("button", { class: "primary", type: "button", text: "New card", onclick: function () { showEditor(null); } });
    app.appendChild(el("div", { class: "bar" }, [search, add]));
    app.appendChild(tabs);
    var list = el("div", { class: "list", "aria-live": "polite" }, [el("p", { class: "small", text: "Loading..." })]);
    app.appendChild(list);
    var url = "/api/v1/review/cards?" + (state.status ? "status=" + encodeURIComponent(state.status) + "&" : "") + (state.q ? "q=" + encodeURIComponent(state.q) : "");
    api("GET", url).then(function (res) {
      clear(list);
      if (!res.cards.length) { list.appendChild(el("p", { class: "small", text: "No cards here." })); return; }
      res.cards.forEach(function (c) {
        list.appendChild(el("button", { class: "row", type: "button", onclick: function () { showEditor(c.id); } }, [
          el("div", { class: "t" }, [c.title, badge(c.status)]),
          el("div", { class: "m", text: c.id + " | v" + c.version + " | updated " + when(c.updated_at) })
        ]));
      });
    }).catch(function (err) { clear(list); list.appendChild(el("div", { class: "notice err", text: err.message })); });
  }

  // ---- editor --------------------------------------------------------------------------------
  function showEditor(id, flash) {
    clear(app);
    var back = el("button", { type: "button", class: "link", text: "< All cards", onclick: function () { refreshOverview(function () { showList(); }); } });
    app.appendChild(back);
    if (!id) { renderEditor({ card: { status: "draft", title: "", canonical_answer: "", beginner_answer: "", safety_notes: [], topic_id: null, version: 0 }, allowed: [], versions: [], log: [] }, true); return; }
    app.appendChild(el("p", { class: "small", text: "Loading..." }));
    api("GET", "/api/v1/review/cards/" + encodeURIComponent(id)).then(function (data) {
      clear(app); app.appendChild(back); renderEditor(data, false, flash);
    }).catch(function (err) { app.appendChild(el("div", { class: "notice err", text: err.message })); });
  }

  function refreshOverview(then) {
    api("GET", "/api/v1/review/overview").then(function (o) { overview = o; then(); }).catch(function () { then(); });
  }

  function renderEditor(data, isNew, flash) {
    var card = data.card;
    var live = card.status === "approved" || card.status === "published";
    var title = el("input", { id: "f-title", value: card.title, maxlength: "200" });
    var canon = el("textarea", { id: "f-canon" }); canon.value = card.canonical_answer || "";
    var begin = el("textarea", { id: "f-begin" }); begin.value = card.beginner_answer || "";
    var safety = el("textarea", { id: "f-safety" }); safety.value = (card.safety_notes || []).join("\n");
    var topic = el("select", { id: "f-topic" }, [el("option", { value: "", text: "(no topic)" })]);
    (overview.topics || []).forEach(function (t) { var o = el("option", { value: t.id, text: t.title }); if (t.id === card.topic_id) o.selected = true; topic.appendChild(o); });
    var reason = el("input", { id: "f-reason", placeholder: "What did you change and why? (kept in the history)" });
    var msg = el("div", { "aria-live": "polite" });

    function say(text, kind) { clear(msg); if (text) msg.appendChild(el("div", { class: "notice " + (kind || ""), role: kind === "err" ? "alert" : "status", text: text })); }
    function body() {
      return { title: title.value, canonicalAnswer: canon.value, beginnerAnswer: begin.value,
        safetyNotes: safety.value.split("\n"), topicId: topic.value || null, changeReason: reason.value || undefined };
    }

    var save = el("button", { class: "primary", type: "button", text: isNew ? "Create draft" : "Save changes", onclick: function () {
      save.disabled = true;
      var req = isNew ? api("POST", "/api/v1/review/cards", body()).then(function (r) { return r.card.id; })
                      : api("PUT", "/api/v1/review/cards/" + encodeURIComponent(card.id), body()).then(function (r) { return { id: card.id, sentBack: r.sentBack }; });
      req.then(function (r) {
        var cid = typeof r === "string" ? r : r.id;
        showEditor(cid, r && r.sentBack
          ? { text: "Saved. Because this card was live, it is now back at Needs fact check and has stopped answering until it is checked again.", kind: "" }
          : { text: "Saved.", kind: "ok" });
      }).catch(function (err) { say(err.message, "err"); save.disabled = false; });
    } });

    if (flash) say(flash.text, flash.kind);
    var left = el("div", { class: "card-box" }, [
      el("h2", { text: isNew ? "New card" : card.title }),
      isNew ? null : el("p", { class: "small" }, [card.id + " | version " + card.version + " ", badge(card.status)]),
      live ? el("div", { class: "notice", text: "This card is live. Saving a change to its words takes it off air until it has been checked again." }) : null,
      el("label", { for: "f-title", text: "Title" }), title,
      el("label", { for: "f-canon" }, ["Full answer ", el("span", { class: "hint", text: "(the complete, accurate answer; the assistant answers only from this)" })]), canon,
      el("label", { for: "f-begin" }, ["Simplest words ", el("span", { class: "hint", text: "(the same answer for a beginner)" })]), begin,
      el("label", { for: "f-safety" }, ["Safety notes ", el("span", { class: "hint", text: "(one per line; anything that must always be said with it)" })]), safety,
      el("label", { for: "f-topic", text: "Topic" }), topic,
      el("label", { for: "f-reason", text: "Change note" }), reason,
      el("p", null, [save]), msg
    ]);

    var right = el("div", { class: "grid" });
    if (!isNew) {
      var note = el("input", { id: "t-note", placeholder: "Note for the record (optional)" });
      var tmsg = el("div", { "aria-live": "polite" });
      var actions = el("div", { class: "actions" });
      data.allowed.forEach(function (to) {
        var a = ACTIONS[to] || { text: to };
        if (BACK[card.status + ">" + to]) a = { text: BACK[card.status + ">" + to] };
        actions.appendChild(el("button", { type: "button", class: a.primary ? "primary" : a.danger ? "danger" : "", text: a.text, onclick: function () {
          clear(tmsg);
          api("POST", "/api/v1/review/cards/" + encodeURIComponent(card.id) + "/transition", { to: to, note: note.value }).then(function (r) {
            showEditor(card.id, { text: r.indexWarning || "Done: " + LABELS[to] + ".", kind: r.indexWarning ? "" : "ok" });
          }).catch(function (err) { tmsg.appendChild(el("div", { class: "notice err", role: "alert", text: err.message })); });
        } }));
      });
      right.appendChild(el("div", { class: "card-box" }, [
        el("h2", { text: "Review" }),
        el("p", { text: CHECKS[card.status] || "" }),
        el("label", { for: "t-note", text: "Note" }), note,
        actions, tmsg,
        card.reviewed_by ? el("p", { class: "small", text: "Last approved " + when(card.reviewed_at) + " by " + card.reviewed_by }) : null
      ]));
      right.appendChild(tryBox(card));
      right.appendChild(historyBox(data));
    }
    app.appendChild(el("div", { class: "grid two" }, [left, right]));
  }

  function tryBox(card) {
    var q = el("input", { id: "try-q", value: card.title, "aria-label": "Question to try" });
    var out = el("div", { "aria-live": "polite" });
    var live = card.status === "approved" || card.status === "published";
    var go = el("button", { type: "button", text: "Search", onclick: function () {
      clear(out);
      api("GET", "/api/v1/review/try?q=" + encodeURIComponent(q.value)).then(function (r) {
        var rank = r.results.map(function (x) { return x.id; }).indexOf(card.id);
        out.appendChild(el("div", { class: "notice " + (rank >= 0 ? "ok" : ""), text: rank >= 0 ? "This card is result #" + (rank + 1) + " for that question." : live ? "This card was not in the top 5 for that question." : "Only approved or published cards are searched." }));
        var ul = el("ul", { class: "plain" });
        r.results.forEach(function (x, i) { ul.appendChild(el("li", { class: x.id === card.id ? "found" : "" }, [el("strong", { text: (i + 1) + ". " + x.id }), el("div", { class: "small", text: x.content })])); });
        out.appendChild(ul);
      }).catch(function (err) { out.appendChild(el("div", { class: "notice err", text: err.message })); });
    } });
    return el("div", { class: "card-box" }, [
      el("h2", { text: "Is it found?" }),
      el("p", { class: "small", text: "Type a question the way a learner would, and see which cards the assistant would be given." }),
      q, el("p", null, [go]), out
    ]);
  }

  function historyBox(data) {
    var ul = el("ul", { class: "plain" });
    data.log.forEach(function (l) {
      var d = l.details || {};
      var extra = d.note ? " - " + d.note : d.reason ? " - " + d.reason : "";
      ul.appendChild(el("li", null, [el("strong", { text: l.action.replace("status:", "moved to ") }), " " + when(l.created_at) + extra, el("div", { class: "small", text: "by " + l.actor })]));
    });
    if (!data.log.length) ul.appendChild(el("li", { class: "small", text: "No recorded actions yet." }));
    var vers = el("ul", { class: "plain" });
    data.versions.forEach(function (v) {
      vers.appendChild(el("li", null, [el("strong", { text: "Version " + v.version }), " " + when(v.created_at), v.change_reason ? el("div", { class: "small", text: v.change_reason }) : null]));
    });
    return el("div", { class: "card-box" }, [el("h2", { text: "History" }), ul, el("h3", { text: "Versions" }), vers]);
  }

  if (token) start(); else showLogin();
})();
