/* MRC Landmarks assistant — a chat bubble on every page. Answers from the site's facts (via forms.mrclandmarks.com/api/chat);
   after the visitor's second question it asks for their details once per tab session, then carries on. */
(function () {
  var API = 'https://forms.mrclandmarks.com/api/chat', KEY = 'mrc_chat', SS = window.sessionStorage;
  var state = { open: false, msgs: [], asked: 0, lead: null, gate: false };
  try { var saved = JSON.parse(SS.getItem(KEY) || 'null'); if (saved) state = Object.assign(state, saved, { open: false }); } catch (e) {}
  function save() { try { SS.setItem(KEY, JSON.stringify({ msgs: state.msgs.slice(-20), asked: state.asked, lead: state.lead, gate: state.gate })); } catch (e) {} }
  var LOTUS = '<svg width="34" height="24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="115 16 900 620"><path fill-rule="nonzero" fill="currentColor" d="M 562.542969 607.320312 C 555.128906 599.160156 548.019531 592.15625 541.851562 584.402344 C 501.539062 533.714844 477.722656 475.242188 462.46875 413 C 452.65625 372.945312 447.617188 332.269531 449.605469 290.84375 C 452.460938 231.28125 470.242188 176.210938 498.574219 124.175781 C 514.574219 94.792969 534.460938 68.21875 556.59375 43.234375 C 558.253906 41.363281 559.34375 38.980469 561.46875 35.609375 C 569.429688 44.621094 575.820312 51.519531 581.84375 58.722656 C 624.40625 109.605469 653.5 167.269531 667.519531 232.160156 C 681.652344 297.578125 676.082031 362.289062 658.578125 426.332031 C 642.863281 483.824219 618.667969 537.25 581.957031 584.566406 C 576.191406 592 569.75 598.910156 562.542969 607.320312 "/><path fill-rule="nonzero" fill="currentColor" d="M 804.515625 149.605469 C 855.292969 334.832031 748.949219 531.636719 600.976562 591.542969 C 602.441406 588.929688 603.296875 587.082031 604.433594 585.425781 C 664.617188 497.847656 693.867188 400.789062 692.355469 294.695312 C 692.0625 274.113281 688.269531 253.546875 685.550781 233.046875 C 684.777344 227.214844 685.457031 222.984375 690.058594 218.96875 C 723.4375 189.84375 760.277344 166.382812 801.578125 150.125 C 802.328125 149.828125 803.195312 149.828125 804.515625 149.605469 "/><path fill-rule="nonzero" fill="currentColor" d="M 321.535156 148.195312 C 337.453125 156.316406 353.105469 162.640625 366.9375 171.734375 C 390.015625 186.898438 411.953125 203.800781 434.3125 220.054688 C 438.375 223.007812 440.136719 226.519531 439.070312 232.234375 C 421.734375 325.273438 437.589844 414.230469 472.8125 500.691406 C 485.527344 531.902344 501.324219 561.410156 522.332031 587.941406 C 522.8125 588.554688 522.992188 589.40625 524.308594 592.464844 C 457.308594 560.421875 405.0625 514.90625 368.171875 452.847656 C 312.015625 358.378906 292.582031 257.863281 321.535156 148.195312 "/><path fill-rule="nonzero" fill="currentColor" d="M 936.453125 276.929688 C 931.367188 417.402344 813.007812 577 613.578125 603.367188 C 616.707031 601.425781 618.273438 600.195312 620.035156 599.398438 C 693.570312 566.152344 746.453125 511.386719 784.035156 441.058594 C 804.15625 403.410156 819.125 363.769531 826.949219 321.585938 C 827.671875 317.6875 830.46875 313.011719 833.726562 310.925781 C 864.367188 291.335938 897.785156 279.464844 934.167969 276.425781 C 934.921875 276.363281 935.710938 276.757812 936.453125 276.929688 "/><path fill-rule="nonzero" fill="currentColor" d="M 512.6875 603.023438 C 328.761719 578.105469 200.152344 435.304688 191.613281 276.808594 C 213.246094 278.136719 234.171875 282.390625 253.992188 290.75 C 266.300781 295.941406 277.769531 303.097656 289.800781 308.988281 C 295.6875 311.867188 298.253906 316.261719 299.476562 322.507812 C 309.355469 372.953125 327.96875 420.0625 354.859375 463.816406 C 392.46875 525.003906 443.191406 571.597656 509.152344 600.984375 C 510.105469 601.40625 510.976562 602.027344 512.6875 603.023438 "/><path fill-rule="nonzero" fill="currentColor" d="M 994.65625 434 C 982.71875 452.632812 972.535156 470.625 960.371094 487.164062 C 906.878906 559.875 833.570312 598.515625 744.929688 608.699219 C 711.730469 612.515625 678.171875 613.183594 644.78125 615.289062 C 644.628906 614.242188 644.480469 613.195312 644.332031 612.148438 C 645.445312 611.632812 646.511719 610.851562 647.683594 610.644531 C 759.335938 590.792969 844.84375 532.683594 903.011719 435.234375 C 909.039062 425.140625 915.578125 421.457031 926.925781 422.035156 C 949.082031 423.164062 970.824219 425.867188 994.65625 434 "/><path fill-rule="nonzero" fill="currentColor" d="M 484.523438 612.085938 C 461.636719 612.085938 440.136719 613.007812 418.746094 611.890625 C 374.238281 609.566406 331.234375 599.910156 290.390625 581.75 C 233.363281 556.394531 188.316406 516.890625 153.964844 465.019531 C 147.664062 455.507812 142.019531 445.566406 134.980469 434.035156 C 144.980469 431.335938 153.296875 428.25 161.886719 426.953125 C 176.234375 424.789062 190.742188 423.675781 205.199219 422.300781 C 213.210938 421.539062 218.445312 424.746094 222.6875 432.1875 C 257.527344 493.261719 306.09375 540.488281 368.390625 573.101562 C 402.988281 591.214844 439.425781 604.589844 478.292969 610.511719 C 479.898438 610.753906 481.460938 611.300781 484.523438 612.085938 "/></svg>';
  var root = document.createElement('div'); root.className = 'mrc-chat'; root.innerHTML =
    '<button class="mrc-chat-bubble" type="button" aria-label="Chat with MRC Landmarks"><span class="mark">' + LOTUS + '</span></button>' +
    '<div class="mrc-chat-panel" hidden role="dialog" aria-label="MRC Landmarks assistant">' +
    '  <div class="head"><span class="mark">' + LOTUS + '</span><div><strong>MRC Landmarks</strong><small>Ask us about ANANTAA, plots and paperwork</small></div><button class="x" type="button" aria-label="Close">&times;</button></div>' +
    '  <a class="wa" href="https://wa.me/918925972469" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2.1 17.7L1 23l5.4-1.4A11.8 11.8 0 0 0 20.5 3.5zm-8.4 18a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.2.8.9-3.1-.2-.3A9.8 9.8 0 1 1 12.1 21.5zm5.4-7.3c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 6 6 0 0 0 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4s.3-1.3.2-1.4l-.7-.6z"/></svg><span>Prefer WhatsApp? Chat with the team directly</span><b>&rarr;</b></a>' +
    '  <div class="log" aria-live="polite"></div>' +
    '  <div class="quick"></div>' +
    '  <form class="ask" autocomplete="off"><input name="q" placeholder="Type your question…" maxlength="600" aria-label="Your question"><button type="submit" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg></button></form>' +
    '</div>';
  document.body.appendChild(root);
  var bubble = root.querySelector('.mrc-chat-bubble'), panel = root.querySelector('.mrc-chat-panel'), log = root.querySelector('.log'), quick = root.querySelector('.quick'), form = root.querySelector('.ask'), input = form.querySelector('input');
  var QUICK = ['Where is ANANTAA?', 'What documents do you verify?', 'How do I become a channel partner?', 'How do I book a site visit?'];

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  var LABELS = [[/forms\.mrclandmarks\.com\/visit/, 'Book a site visit'], [/forms\.mrclandmarks\.com\/register/, 'Register for the launch event'], [/forms\.mrclandmarks\.com\/join/, 'Channel partner application'], [/forms\.mrclandmarks\.com\/partners/, 'Partner resource centre'], [/wa\.me\//, 'Chat on WhatsApp'], [/google\.com\/maps|maps\.app\.goo\.gl/, 'Open in Google Maps'], [/mrc-forum/, 'MRC Forum early access'], [/project-anantaa|projects\.html|locations\.html/, 'See ANANTAA'], [/approach\.html/, 'Our approach'], [/channel-partners/, 'Channel partners'], [/insight/, 'Knowledge Hub'], [/contact\.html/, 'Contact us'], [/mrclandmarks\.com/, 'mrclandmarks.com']];
  function label(u) { for (var i = 0; i < LABELS.length; i++) if (LABELS[i][0].test(u)) return LABELS[i][1]; return u.replace(/^https?:\/\//, '').split('/')[0]; }
  /* links become buttons under the message: markdown [text](url), full URLs, or bare forms.mrclandmarks.com/... paths */
  function linkify(s) {
    var links = [];
    s = String(s).replace(/wa\.me\/(\d[\d ]*\d)/g, function (_, n) { return 'wa.me/' + n.replace(/ /g, ''); });   /* the model sometimes spaces the number like a phone number */
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (_, t, u) { links.push(u); return t; });
    s = s.replace(/\(?(?:https?:\/\/)?(?:forms\.mrclandmarks\.com|mrclandmarks\.com|www\.mrclandmarks\.com|wa\.me|maps\.app\.goo\.gl|www\.google\.com\/maps)[^\s)]*\)?/g, function (u) {
      var tail = (u.match(/[.,;:!?]+$/) || [''])[0]; u = u.replace(/^\(|\)$/g, '').replace(/[.,;:!?]+$/, ''); links.push(/^https?:\/\//.test(u) ? u : 'https://' + u); return tail; });
    s = s.replace(/\s+(?:at|via|on|here|here at|from|through)\s*:?\s*(?=[.,;!?]|$)/gm, '').replace(/:\s*(?=[.,;!?]|$)/gm, '').replace(/ +([.,;:!?])/g, '$1').replace(/\( *\)/g, '').replace(/[ \t]{2,}/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    s = esc(s).replace(/\n/g, '<br>');
    var seen = {}, btns = links.filter(function (u) { if (seen[u]) return false; seen[u] = true; return true; })
      .map(function (u) { return '<a class="cta" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(label(u)) + '</a>'; }).join('');
    return s + (btns ? '<div class="ctas">' + btns + '</div>' : '');
  }
  function add(role, text, extra) { var d = document.createElement('div'); d.className = 'm ' + role + (extra ? ' ' + extra : ''); d.innerHTML = linkify(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function typing(on) { var t = log.querySelector('.typing'); if (on && !t) { t = document.createElement('div'); t.className = 'm bot typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight; } if (!on && t) t.remove(); }
  function render() {
    log.innerHTML = '';
    if (!state.msgs.length) add('bot', 'Vanakkam. I am the MRC Landmarks assistant. Ask me about ANANTAA at Othakadai, the documents we verify, site visits or the channel-partner programme.');
    state.msgs.forEach(function (m) { add(m.role === 'user' ? 'me' : 'bot', m.content); });
    quick.innerHTML = state.msgs.length ? '' : QUICK.map(function (q) { return '<button type="button">' + esc(q) + '</button>'; }).join('');
    quick.style.display = state.msgs.length ? 'none' : '';
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
    input.value = ''; quick.style.display = 'none';
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
  /* opens by itself once per session, 20 s after the visitor arrives, whatever page they came in on; closing it is final for the session */
  var AUTO = 'mrc_chat_auto';
  function seen() { try { return !!SS.getItem(AUTO); } catch (e) { return false; } }
  function markSeen() { try { SS.setItem(AUTO, '1'); } catch (e) {} }
  bubble.addEventListener('click', markSeen);
  if (!seen()) setTimeout(function tryOpen() {
    if (seen() || state.open) return;
    if (document.documentElement.classList.contains('modal-open')) { setTimeout(tryOpen, 8000); return; }   /* a form is up: wait */
    markSeen(); open();
  }, 20000);
})();
