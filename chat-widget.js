/* MRC Landmarks assistant — a chat bubble on every page. Answers from the site's facts (via forms.mrclandmarks.com/api/chat);
   after the visitor's second question it asks for their details once per tab session, then carries on. */
(function () {
  var API = 'https://forms.mrclandmarks.com/api/chat', KEY = 'mrc_chat', SS = window.sessionStorage;
  var state = { open: false, msgs: [], asked: 0, lead: null, gate: false };
  try { var saved = JSON.parse(SS.getItem(KEY) || 'null'); if (saved) state = Object.assign(state, saved, { open: false }); } catch (e) {}
  function save() { try { SS.setItem(KEY, JSON.stringify({ msgs: state.msgs.slice(-20), asked: state.asked, lead: state.lead, gate: state.gate })); } catch (e) {} }
  var LOTUS = '<svg viewBox="0 0 64 64" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M32 6c-5 8-7 16-6 25 3-3 5-8 6-13 1 5 3 10 6 13 1-9-1-17-6-25z"/><path d="M14 16c1 10 5 18 12 23-1-8-4-15-12-23zM50 16c-8 8-11 15-12 23 7-5 11-13 12-23z"/><path d="M6 32c4 9 11 15 20 17-3-7-9-13-20-17zM58 32c-11 4-17 10-20 17 9-2 16-8 20-17z"/><path d="M12 48c6 5 13 7 20 7s14-2 20-7c-7 1-13 1-20 1s-13 0-20-1z"/></svg>';
  var root = document.createElement('div'); root.className = 'mrc-chat'; root.innerHTML =
    '<button class="mrc-chat-bubble" type="button" aria-label="Chat with MRC Landmarks"><span class="mark">' + LOTUS + '</span><span class="tail"></span></button>' +
    '<div class="mrc-chat-panel" hidden role="dialog" aria-label="MRC Landmarks assistant">' +
    '  <div class="head"><span class="mark">' + LOTUS + '</span><div><strong>MRC Landmarks</strong><small>Ask us about ANANTAA, plots and paperwork</small></div><button class="x" type="button" aria-label="Close">&times;</button></div>' +
    '  <div class="log" aria-live="polite"></div>' +
    '  <div class="quick"></div>' +
    '  <form class="ask" autocomplete="off"><input name="q" placeholder="Type your question…" maxlength="600" aria-label="Your question"><button type="submit" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg></button></form>' +
    '</div>';
  document.body.appendChild(root);
  var bubble = root.querySelector('.mrc-chat-bubble'), panel = root.querySelector('.mrc-chat-panel'), log = root.querySelector('.log'), quick = root.querySelector('.quick'), form = root.querySelector('.ask'), input = form.querySelector('input');
  var QUICK = ['Where is ANANTAA?', 'What documents do you verify?', 'How do I become a channel partner?', 'How do I book a site visit?'];

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function linkify(s) { return esc(s).replace(/https?:\/\/[^\s)]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\//, '') + '</a>'; }).replace(/\n/g, '<br>'); }
  function add(role, text, extra) { var d = document.createElement('div'); d.className = 'm ' + role + (extra ? ' ' + extra : ''); d.innerHTML = linkify(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function typing(on) { var t = log.querySelector('.typing'); if (on && !t) { t = document.createElement('div'); t.className = 'm bot typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight; } if (!on && t) t.remove(); }
  function render() {
    log.innerHTML = '';
    if (!state.msgs.length) add('bot', 'Vanakkam. I am the MRC Landmarks assistant. Ask me about ANANTAA at Othakadai, the documents we verify, site visits or the channel-partner programme.');
    state.msgs.forEach(function (m) { add(m.role === 'user' ? 'me' : 'bot', m.content); });
    quick.innerHTML = state.msgs.length ? '' : QUICK.map(function (q) { return '<button type="button">' + esc(q) + '</button>'; }).join('');
    quick.hidden = !!state.msgs.length;
    if (state.gate && !state.lead) showGate();
  }
  function open() { state.open = true; panel.hidden = false; bubble.classList.add('on'); render(); setTimeout(function () { (log.querySelector('.gate input') || input).focus(); }, 60); }
  function close() { state.open = false; panel.hidden = true; bubble.classList.remove('on'); }
  bubble.addEventListener('click', function () { state.open ? close() : open(); });
  root.querySelector('.x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) close(); });
  quick.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) send(b.textContent); });

  /* the gate: after two questions, details before the third */
  function showGate() {
    if (log.querySelector('.gate')) return;
    var g = document.createElement('div'); g.className = 'm bot gate'; g.innerHTML =
      '<p>Happy to keep going — first, a few details so the team can follow up properly.</p>' +
      '<form class="lead"><input name="name" placeholder="Your name" autocomplete="name" required>' +
      '<input name="mobile" type="tel" inputmode="numeric" placeholder="Mobile number (10 digits)" autocomplete="tel" required>' +
      '<input name="email" type="email" placeholder="Email" autocomplete="email" required>' +
      '<input name="looking_for" placeholder="What are you looking for?" maxlength="300">' +
      '<p class="err" hidden></p><button type="submit">Continue</button></form>';
    log.appendChild(g); log.scrollTop = log.scrollHeight; form.hidden = true;
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, err = g.querySelector('.err'), btn = f.querySelector('button'); err.hidden = true;
      var lead = { name: f.name.value.trim(), mobile: f.mobile.value.trim(), email: f.email.value.trim(), looking_for: f.looking_for.value.trim(), page: location.pathname,
                   questions: state.msgs.filter(function (m) { return m.role === 'user'; }).map(function (m) { return m.content; }) };
      if (!lead.name || !/^[6-9]\d{9}$/.test(lead.mobile.replace(/\D/g, '').slice(-10)) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) { err.textContent = 'Please give your name, a valid 10-digit mobile number and your email.'; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead: lead }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error((x.j.errors && Object.values(x.j.errors)[0]) || x.j.error || 'Please try again.');
          state.lead = { name: lead.name }; save(); g.remove(); form.hidden = false;
          add('bot', 'Thank you, ' + lead.name.split(' ')[0] + '. The team has your details' + (lead.looking_for ? ' and what you are looking for' : '') + '. What else can I help with?'); input.focus();
        })
        .catch(function (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Continue'; });
    });
    setTimeout(function () { g.querySelector('input').focus(); }, 60);
  }

  function send(q) {
    q = (q || '').trim(); if (!q) return;
    if (state.gate && !state.lead) { showGate(); return; }
    input.value = ''; quick.hidden = true;
    state.msgs.push({ role: 'user', content: q }); state.asked += 1; add('me', q); save(); typing(true);
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: state.msgs.slice(-12), leadName: state.lead ? state.lead.name : '' }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        typing(false); var a = j.reply || j.error || 'Please try again in a moment.';
        state.msgs.push({ role: 'assistant', content: a }); add('bot', a);
        if (state.asked >= 2 && !state.lead) { state.gate = true; showGate(); }
        save();
      })
      .catch(function () { typing(false); add('bot', 'I could not reach the team just now. WhatsApp us at https://wa.me/918925972469'); });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
})();
