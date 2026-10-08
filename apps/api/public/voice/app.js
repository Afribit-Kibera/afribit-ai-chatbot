// Voice Lab: reviewers edit how the assistant speaks and try answers straight away. Plain JavaScript,
// no build step, no inline script. Everything from the server goes on the page with textContent, never as HTML.
(function () {
  "use strict";

  var app = document.getElementById("app");
  var whoBox = document.getElementById("who");
  var whoName = document.getElementById("whoName");
  var packBox = document.getElementById("packBox");
  var packPick = document.getElementById("packPick");
  var token = null;
  var user = null;
  var data = null;                 // GET /api/v1/voice/files
  var current = null;              // path of the open file
  var drafts = {};                 // path -> unsaved text (only where it differs from what is saved)
  var packId = null;
  var tryState = { message: "", mode: null, level: "normal", promptMode: null };
  try { packId = new URLSearchParams(window.location.search).get("pack"); } catch (e) { packId = null; }
  try { token = sessionStorage.getItem("voice.token"); } catch (e) { token = null; }

  var AFFECTS = {
    full: "Full prompt", compact: "Compact prompt", serve: "Serve prompt", waiter: "Waiter helper", chef: "Chef helper",
    message: "Shown to learners as written", push: "Push notification", search: "Search", all: "Every answer"
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
  function when(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }
  function bytes(text) { try { return new TextEncoder().encode(text).length; } catch (e) { return text.length; } }
  function dirtyPaths() { return Object.keys(drafts); }
  function fileOf(path) { return data && data.files.filter(function (f) { return f.path === path; })[0]; }

  function api(method, url, body) {
    var headers = {};
    if (body) headers["content-type"] = "application/json";
    if (token) headers.authorization = "Bearer " + token;
    if (packId) headers["x-pack"] = packId;
    return fetch(url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (res.status === 401 && token) { forget(); showLogin("Please log in again."); throw new Error("Please log in again."); }
        if (!res.ok) { var err = new Error(d.error || "Something went wrong (" + res.status + ")"); err.details = d.errors || null; throw err; }
        return d;
      });
    });
  }

  function forget() {
    token = null; user = null; data = null; drafts = {}; current = null;
    try { sessionStorage.removeItem("voice.token"); sessionStorage.removeItem("voice.name"); } catch (e) { /* ignore */ }
    whoBox.hidden = true;
  }
  function signOut() {
    if (dirtyPaths().length && !window.confirm("You have unsaved edits that will be lost. Log out anyway?")) return;
    forget();
    showLogin();
  }
  document.getElementById("logout").addEventListener("click", signOut);
  window.addEventListener("beforeunload", function (ev) {
    if (dirtyPaths().length) { ev.preventDefault(); ev.returnValue = ""; }
  });

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
        try { sessionStorage.setItem("voice.token", token); sessionStorage.setItem("voice.name", user.name); } catch (e) { /* ignore */ }
        start();
      }).catch(function (err) { note.textContent = err.message; note.hidden = false; });
    } }, [
      el("h2", { text: "Voice Lab log in" }),
      note,
      el("label", { for: "email", text: "Email" }), email,
      el("label", { for: "password", text: "Password" }), password,
      el("p", null, [el("button", { class: "primary", type: "submit", text: "Log in" })]),
      el("p", { class: "small", text: "Reviewers and administrators only. Accounts are added by the person who runs this service." })
    ]));
  }

  // ---- packs ----------------------------------------------------------------------------------
  function loadPacks() {
    return fetch("/api/v1/packs").then(function (r) { return r.json(); }).then(function (res) {
      var packs = res.packs || [];
      clear(packPick);
      packs.forEach(function (p) { var o = el("option", { value: p.id, text: p.name }); if (p.id === (packId || res.default)) o.selected = true; packPick.appendChild(o); });
      packBox.hidden = packs.length < 2;
    }).catch(function () { packBox.hidden = true; });
  }
  packPick.addEventListener("change", function () {
    if (dirtyPaths().length && !window.confirm("You have unsaved edits that will be lost if you switch pack. Switch anyway?")) {
      packPick.value = packId || packPick.value;
      return;
    }
    packId = packPick.value; drafts = {}; current = null; tryState.mode = null;
    load();
  });

  function start() {
    if (!user) { try { user = { name: sessionStorage.getItem("voice.name") || "Reviewer" }; } catch (e) { user = { name: "Reviewer" }; } }
    whoName.textContent = user.name;
    whoBox.hidden = false;
    loadPacks().then(load);
  }

  function load(flash) {
    return api("GET", "/api/v1/voice/files").then(function (d) {
      data = d;
      document.getElementById("title").textContent = d.pack.name + " voice lab";
      document.title = d.pack.name + " voice lab";
      if (!tryState.mode) tryState.mode = d.pack.defaultMode;
      if (!tryState.promptMode) tryState.promptMode = d.promptMode;
      // A draft that now equals what is saved is no longer a draft.
      Object.keys(drafts).forEach(function (p) { var f = fileOf(p); if (!f || drafts[p] === f.effective) delete drafts[p]; });
      if (!current || !fileOf(current)) current = d.files[0] && d.files[0].path;
      render(flash);
    }).catch(function (err) { if (token) { clear(app); app.appendChild(el("div", { class: "notice err", role: "alert", text: err.message })); } });
  }

  // ---- layout ---------------------------------------------------------------------------------
  var editorBox = null;
  var tryBox = null;

  function render(flash) {
    clear(app);
    var live = data.promptMode === "compact" ? "the COMPACT prompt" : "the FULL prompt";
    app.appendChild(el("p", { class: "how", role: "note" }, [
      "Files tagged ", el("strong", { text: "Full prompt" }), " change today's answers: the live service sends " + live + ". ",
      "Files tagged Compact, Serve, Waiter or Chef only matter if the operator switches on PROMPT_MODE=compact or CHAT_PIPELINE=restaurant, but you can test them with the toggle in Try it. ",
      "Saving takes effect immediately for every learner; Try it does not save anything."
    ]));
    if (flash) app.appendChild(el("div", { class: "notice " + (flash.kind || ""), role: flash.kind === "err" ? "alert" : "status", text: flash.text }));
    editorBox = el("div", { class: "box" });
    tryBox = el("div", { class: "box" });
    app.appendChild(el("div", { class: "cols" }, [filesBox(), editorBox, tryBox]));
    renderEditor();
    renderTry();
  }

  function filesBox() {
    var box = el("nav", { class: "box files", "aria-label": "Files" });
    data.groups.forEach(function (g) {
      var inGroup = data.files.filter(function (f) { return f.group === g.id; });
      if (!inGroup.length) return;
      box.appendChild(el("h3", { text: g.title }));
      inGroup.forEach(function (f) {
        var row = el("button", { class: "row", type: "button", "aria-current": f.path === current ? "true" : "false", "data-path": f.path, onclick: function () { openFile(f.path); } }, [
          el("span", null, [f.label,
            f.overridden ? el("span", { class: "badge edited", text: "edited" }) : null,
            drafts[f.path] !== undefined ? el("span", { class: "badge unsaved", text: "unsaved" }) : null,
            !f.canEdit ? el("span", { class: "badge lock", text: "admin only" }) : null]),
          el("span", { class: "p", text: f.path })
        ]);
        box.appendChild(row);
      });
    });
    return box;
  }

  function refreshFilesBox() {
    var old = app.querySelector(".files");
    if (!old) return;
    var top = old.scrollTop;
    var fresh = filesBox();
    old.parentNode.replaceChild(fresh, old);
    fresh.scrollTop = top;
  }

  function openFile(path) {
    current = path;
    // Opening a mode's guide points Try it at that mode (and at the prompt that guide belongs to).
    var m = /^language\/([a-z0-9_]+)\.(full|compact)\.md$/.exec(path);
    if (m && data.pack.modes.some(function (x) { return x.id === m[1]; })) {
      tryState.mode = m[1]; tryState.promptMode = m[2];
      var sel = document.getElementById("try-mode");
      if (sel) sel.value = m[1];
      var radio = document.getElementById("pm-" + m[2]);
      if (radio) radio.checked = true;
    }
    refreshFilesBox();
    renderEditor();
    try { editorBox.scrollIntoView({ block: "start" }); } catch (e) { /* ignore */ }
  }

  // ---- editor ---------------------------------------------------------------------------------
  function renderEditor(flash) {
    clear(editorBox);
    var f = fileOf(current);
    if (!f) { editorBox.appendChild(el("p", { class: "small", text: "No file selected." })); return; }
    var text = drafts[f.path] !== undefined ? drafts[f.path] : f.effective;
    var area = el("textarea", { class: "editor", id: "editor", spellcheck: "false", "aria-label": "Text of " + f.path, readonly: !f.canEdit });
    area.value = text;
    var count = el("span", { class: "count" });
    var jsonNote = el("div", { "aria-live": "polite" });
    var msg = el("div", { "aria-live": "polite" });
    var save, revert;

    function say(textOrNode, kind, list) {
      clear(msg);
      var box = el("div", { class: "notice " + (kind || ""), role: kind === "err" ? "alert" : "status" }, [typeof textOrNode === "string" ? textOrNode : textOrNode]);
      if (list && list.length) box.appendChild(el("ul", null, list.map(function (x) { return el("li", { text: x }); })));
      msg.appendChild(box);
    }
    function sync() {
      var v = area.value;
      if (v === f.effective) delete drafts[f.path]; else drafts[f.path] = v;
      var n = bytes(v);
      count.textContent = v.length + " characters, " + (n / 1024).toFixed(1) + " KB of " + Math.round(data.maxBytes / 1024) + " KB";
      count.className = "count" + (n > data.maxBytes ? " over" : "");
      clear(jsonNote);
      if (f.kind === "json") { try { JSON.parse(v); } catch (e) { jsonNote.appendChild(el("div", { class: "notice err", text: "Not valid JSON yet: " + e.message })); } }
      if (save) save.disabled = !f.canEdit || drafts[f.path] === undefined || n > data.maxBytes;
      refreshFilesBox();
    }
    area.addEventListener("input", sync);

    save = el("button", { class: "primary", type: "button", text: "Save", onclick: function () {
      save.disabled = true; clear(msg);
      api("PUT", "/api/v1/voice/files", { path: f.path, text: area.value }).then(function (r) {
        delete drafts[f.path];
        var warn = (r.warnings || []).filter(Boolean);
        return load({ text: r.changed ? "Saved. The service is using this wording now: " + f.label + "." : (warn[0] || "Nothing changed."), kind: "ok" });
      }).catch(function (err) { say(err.message, "err", err.details); sync(); });
    } });
    revert = el("button", { class: "danger", type: "button", text: "Revert to baseline", disabled: !f.canEdit || !f.overridden, onclick: function () {
      if (!window.confirm("Go back to the reviewed wording from the pack for " + f.label + "? Your edit stays in History, so you can restore it.")) return;
      api("DELETE", "/api/v1/voice/files?path=" + encodeURIComponent(f.path)).then(function () {
        delete drafts[f.path];
        return load({ text: "Back to the reviewed baseline: " + f.label + ".", kind: "ok" });
      }).catch(function (err) { say(err.message, "err", err.details); });
    } });
    var hist = el("div");
    var histBtn = el("button", { type: "button", text: "History", onclick: function () { showHistory(f, hist); } });

    var tags = el("div", { class: "tags" }, f.affects.map(function (a) { return tag(a); }));
    var ph = f.placeholders.length ? el("div", { class: "ph" }, [
      el("div", { class: "small", text: "Placeholders are filled in from the pack. Click one to insert it where the cursor is:" }),
      el("div", null, f.placeholders.map(function (p) {
        return el("button", { type: "button", text: "{{" + p + "}}", disabled: !f.canEdit, onclick: function () {
          var s = area.selectionStart || 0, e2 = area.selectionEnd || 0;
          area.value = area.value.slice(0, s) + "{{" + p + "}}" + area.value.slice(e2);
          area.focus(); area.selectionStart = area.selectionEnd = s + p.length + 4; sync();
        } });
      }))
    ]) : el("p", { class: "small", text: "No placeholders in this kind of file: write the words exactly as the assistant should see them." });

    editorBox.appendChild(el("h2", null, [f.label,
      f.overridden ? el("span", { class: "badge edited", text: "edited" }) : null,
      !f.canEdit ? el("span", { class: "badge lock", text: "admin only" }) : null]));
    editorBox.appendChild(el("p", { class: "small", text: f.path + (f.overridden && f.lastEdit ? " | last edited " + when(f.lastEdit.at) + " by " + f.lastEdit.by : f.overridden ? " | edited" : " | as reviewed in the pack") }));
    editorBox.appendChild(el("p", { text: f.description }));
    editorBox.appendChild(tags);
    if (!f.canEdit) editorBox.appendChild(el("div", { class: "notice", text: "Only an administrator can change this file, because it sets what the assistant must never do. You can read it, and ask an administrator to change it." }));
    if (!f.described) editorBox.appendChild(el("div", { class: "notice", text: "Nobody has written a description for this file yet. Be careful." }));
    if (flash) say(flash.text, flash.kind);
    editorBox.appendChild(area);
    editorBox.appendChild(count);
    editorBox.appendChild(jsonNote);
    editorBox.appendChild(ph);
    editorBox.appendChild(el("div", { class: "actions" }, [save, revert, histBtn]));
    editorBox.appendChild(msg);
    editorBox.appendChild(hist);
    var base = el("details", null, [el("summary", { text: f.baselineIsDefault ? "Show the engine's generic default (the pack has no file of its own)" : "Show the reviewed baseline from the pack" }), el("pre", { text: f.baseline })]);
    editorBox.appendChild(base);
    sync();
  }

  function tag(a) {
    var live = true;
    if (a === "full") live = data.promptMode === "full";
    if (a === "compact") live = data.promptMode === "compact";
    if (a === "serve" || a === "chef" || a === "waiter") live = data.chatPipeline === "restaurant";
    var label = AFFECTS[a] || a;
    var note = live ? "" : (a === "full" || a === "compact" ? " (not in use today)" : " (optional pipeline, off today)");
    return el("span", { class: "tag" + (live ? "" : " off"), text: label + note });
  }

  function showHistory(f, box) {
    clear(box);
    box.appendChild(el("p", { class: "small", text: "Loading history..." }));
    api("GET", "/api/v1/voice/history?path=" + encodeURIComponent(f.path)).then(function (r) {
      clear(box);
      var ul = el("ul", { class: "plain" });
      r.versions.forEach(function (v) {
        ul.appendChild(el("li", null, [
          el("strong", { text: when(v.at) }), " by " + v.by + " | " + v.bytes + " bytes" + (v.removed ? " | this was the text removed by Revert" : ""),
          el("div", null, [f.canEdit ? el("button", { type: "button", text: "Restore this version", onclick: function () {
            if (!window.confirm("Put this version back? It is saved as a new edit and goes live now.")) return;
            api("POST", "/api/v1/voice/restore", { path: f.path, version: v.id }).then(function (res) {
              delete drafts[f.path];
              return load({ text: res.changed ? "Restored. The service is using it now." : "That is already what is being served.", kind: "ok" });
            }).catch(function (err) { box.appendChild(el("div", { class: "notice err", role: "alert", text: err.message })); });
          } }) : null])
        ]));
      });
      box.appendChild(el("h3", { text: "Saved versions (newest first)" }));
      box.appendChild(r.versions.length ? ul : el("p", { class: "small", text: "No saved versions yet. Revert to baseline always works." }));
    }).catch(function (err) { clear(box); box.appendChild(el("div", { class: "notice err", text: err.message })); });
  }

  // ---- try it ---------------------------------------------------------------------------------
  function renderTry() {
    clear(tryBox);
    var q = el("textarea", { id: "try-q", maxlength: "500", "aria-label": "Question to try", placeholder: "Type a question the way a learner would" });
    q.value = tryState.message;
    q.addEventListener("input", function () { tryState.message = q.value; });
    var mode = el("select", { id: "try-mode", "aria-label": "Language mode" }, data.pack.modes.map(function (m) {
      var o = el("option", { value: m.id, text: m.label }); if (m.id === tryState.mode) o.selected = true; return o;
    }));
    mode.addEventListener("change", function () { tryState.mode = mode.value; });
    var level = el("select", { id: "try-level", "aria-label": "Explanation level" }, data.levels.map(function (l) {
      var o = el("option", { value: l, text: l }); if (l === tryState.level) o.selected = true; return o;
    }));
    level.addEventListener("change", function () { tryState.level = level.value; });
    var radios = el("div", { class: "radios", role: "radiogroup", "aria-label": "Which prompt" }, ["full", "compact"].map(function (v) {
      var r = el("input", { type: "radio", name: "pm", value: v, id: "pm-" + v });
      r.checked = tryState.promptMode === v;
      r.addEventListener("change", function () { tryState.promptMode = v; });
      return el("label", { for: "pm-" + v }, [r, v === "full" ? "Full prompt" : "Compact prompt"]);
    }));
    var out = el("div", { "aria-live": "polite" });
    var go = el("button", { class: "primary", type: "button", text: "Try my draft" });
    var cmp = el("button", { type: "button", text: "Compare draft vs saved" });

    function run(compare) {
      if (!q.value.trim()) { clear(out); out.appendChild(el("div", { class: "notice err", text: "Type a question to try." })); return; }
      var paths = dirtyPaths().filter(function (p) { var f = fileOf(p); return f && f.canEdit; });
      var sent = {};
      paths.forEach(function (p) { sent[p] = drafts[p]; });
      go.disabled = cmp.disabled = true;
      clear(out); out.appendChild(el("p", { class: "small", text: compare ? "Asking twice (draft and saved)..." : "Asking..." }));
      api("POST", "/api/v1/voice/preview", { message: q.value, mode: tryState.mode, level: tryState.level, promptMode: tryState.promptMode, drafts: sent, compare: compare }).then(function (r) {
        clear(out);
        if (!paths.length) out.appendChild(el("p", { class: "small", text: "You have no unsaved edits, so this is the saved wording." }));
        else out.appendChild(el("p", { class: "small", text: "Draft includes unsaved edits to: " + paths.join(", ") }));
        var pair = el("div", { class: "pair" + (compare ? " two" : "") });
        pair.appendChild(result(compare ? "Draft" : "Answer", r));
        if (compare && r.saved) pair.appendChild(result("Saved", r.saved));
        out.appendChild(pair);
      }).catch(function (err) {
        clear(out);
        var n = el("div", { class: "notice err", role: "alert", text: err.message });
        if (err.details && err.details.length) n.appendChild(el("ul", null, err.details.map(function (x) { return el("li", { text: x }); })));
        out.appendChild(n);
      }).then(function () { go.disabled = cmp.disabled = false; });
    }
    go.addEventListener("click", function () { run(false); });
    cmp.addEventListener("click", function () { run(true); });

    tryBox.appendChild(el("h2", { text: "Try it" }));
    tryBox.appendChild(el("p", { class: "small", text: "Asks the real assistant with your unsaved edits. Nothing is saved and no chat is recorded. Each try can cost a little, so there is a limit of 10 a minute." }));
    tryBox.appendChild(el("label", { for: "try-q", text: "Question" }));
    tryBox.appendChild(q);
    tryBox.appendChild(el("label", { for: "try-mode", text: "Language mode" }));
    tryBox.appendChild(mode);
    tryBox.appendChild(el("label", { for: "try-level", text: "Explanation level" }));
    tryBox.appendChild(level);
    tryBox.appendChild(el("label", { text: "Prompt" }));
    tryBox.appendChild(radios);
    tryBox.appendChild(el("p", { class: "small", text: "The live service is using the " + data.promptMode + " prompt." }));
    tryBox.appendChild(el("div", { class: "actions" }, [go, cmp]));
    tryBox.appendChild(out);
  }

  function result(title, r) {
    var box = el("div");
    box.appendChild(el("h3", { text: title }));
    if (r.error) box.appendChild(el("div", { class: "notice err", role: "alert", text: "The model could not answer: " + r.error }));
    else box.appendChild(el("div", { class: "answer" + (r.blocked ? " blocked" : ""), text: r.answer }));
    if (r.blocked === "secret") box.appendChild(el("p", { class: "small", text: "Your question looked like it contained a password, PIN or recovery phrase, so it was not sent to any model." }));
    if (r.blocked === "output_safety") box.appendChild(el("p", { class: "small", text: "The model's answer was withheld by the output safety check; this is the withheld message a learner would see." }));
    if (r.blocked === "ungrounded") box.appendChild(el("p", { class: "small", text: "The grounding check replaced the answer, because it named things not in the knowledge given." }));
    if (r.rawAnswer) box.appendChild(el("details", null, [el("summary", { text: "What the model actually wrote" }), el("pre", { text: r.rawAnswer })]));
    if (r.ungrounded && r.ungrounded.length) box.appendChild(el("p", { class: "small", text: "Not found in the prompt (check these are true): " + r.ungrounded.join(", ") }));
    box.appendChild(el("p", { class: "small", text: "Cards found: " + (r.cardIds.length ? r.cardIds.join(", ") : "none (the assistant is told nothing matched)") }));
    box.appendChild(el("p", { class: "small", text: r.promptMode + " prompt | about " + r.promptTokensApprox + " tokens | " + (r.model || r.modelProfile) + " | " + (r.latencyMs / 1000).toFixed(1) + " s" }));
    if (r.systemPrompt) {
      var turns = (r.turns || []).map(function (t) { return "[" + t.role + "]\n" + t.content; }).join("\n\n");
      box.appendChild(el("details", null, [
        el("summary", { text: "What the model was told" }),
        el("p", { class: "small", text: "The system message, then the example conversations and your question." }),
        el("pre", { text: r.systemPrompt + (turns ? "\n\n----\n" + turns : "") })
      ]));
    }
    return box;
  }

  if (token) start(); else showLogin();
})();
