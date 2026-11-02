/*
 * Editor's Desk uyumluluk katmanı.
 *
 * index.html claude.ai artifact'i olarak yazıldı ve window.claude.use(...) ile db, sample,
 * assets, downloads ve mcp yeteneklerini ister. Bu dosya aynı yüzeyi NartGo arka ucuyla
 * (content-service /api/v1/content/admin/desk) sağlar; index.html değiştirilmeden çalışır.
 * Oturum admin panelinin localStorage'daki Keycloak anahtarıdır (aynı origin).
 *
 *   db        → doküman deposu; değişiklikler birkaç saniyede bir çekilir
 *   sample    → Claude (sunucudaki aracı üzerinden); araç döngüsü burada döner
 *   assets    → slayt görselleri sunucuda saklanır
 *   downloads → tarayıcı indirmesi; gönderi paketi (nartgo-*.zip) Instagram kuyruğuna da gider
 *   mcp       → yalnız görsel arama için "host:claude_browser" taklidi (Wikimedia Commons)
 *
 * index.html'den önce yüklenmeli: <script src="claude-shim.js"></script>
 */
(function () {
  'use strict';
  const API = '/api/v1/content/admin/desk';
  const POLL_MS = 4000, POLL_HIDDEN_MS = 20000, MAX_TOOL_ROUNDS = 25;

  // ---------- oturum ----------
  function token() {
    try {
      const t = localStorage.getItem('token');
      const exp = Number(localStorage.getItem('tokenExpiration')) || 0;
      return t && (!exp || exp > Date.now()) ? t : null;
    } catch (e) { return null; }
  }
  function err(code, message, extra) { return Object.assign(new Error(message || code), { code }, extra || {}); }
  let warned = false;
  function signedOut() {
    if (warned) return; warned = true;
    try { window.parent && window.parent !== window && window.parent.postMessage({ type: 'desk:unauthorized' }, location.origin); } catch (e) {}
    const b = document.createElement('div');
    b.textContent = 'Oturum süresi doldu. Admin panelden yeniden giriş yapıp sayfayı yenile.';
    b.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;background:#7a1c1c;color:#fff;padding:10px 16px;border-radius:8px;font:14px system-ui';
    (document.body || document.documentElement).append(b);
  }
  async function call(path, opts) {
    const t = token();
    if (!t) { signedOut(); throw err('not_granted', 'Oturum yok'); }
    const res = await fetch(API + path, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + t }, (opts && opts.headers) || {}) }));
    if (res.status === 401) { signedOut(); throw err('not_granted', 'Oturum geçersiz'); }
    if (res.status === 403) throw err('not_granted', 'Yetki yok');
    return res;
  }

  // index.html veriyi göreli "data/x.json" adresinden okur; veri sunucuda, girişle korunur.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : '';
    const m = /^(?:\.\/)?data\/([a-z]+\.json)$/.exec(url);
    return m ? call('/data/' + m[1]) : nativeFetch(input, init);
  };

  // ---------- db ----------
  const docs = new Map();      // "col/id" → {col, id, data, at}
  const pending = new Map();   // "col/id" → yazma sayısı (sürerken sunucudan gelen eski sürüm yok sayılır)
  const colSubs = new Map();   // col → Set<{cb, err}>
  const docSubs = new Map();   // "col/id" → Set<{cb}>
  let cursor = 0, loaded = false, pollTimer = null, polling = false;

  const snapDoc = (col, id) => {
    const d = docs.get(col + '/' + id);
    return { id, exists: !!d, data: () => (d ? structuredClone(d.data) : undefined) };
  };
  function emit(cols, keys) {
    for (const col of cols) for (const s of colSubs.get(col) || []) {
      const list = [...docs.values()].filter(d => d.col === col).map(d => snapDoc(col, d.id));
      try { s.cb({ docs: list, size: list.length, empty: !list.length }); } catch (e) { console.error(e); }
    }
    for (const k of keys) for (const s of docSubs.get(k) || []) {
      const [col, id] = k.split('/');
      try { s.cb(snapDoc(col, id)); } catch (e) { console.error(e); }
    }
  }
  async function poll() {
    if (polling) return; polling = true;
    try {
      const res = await call('/docs?since=' + Math.max(0, cursor - 3000));
      if (!res.ok) throw err('unavailable', 'HTTP ' + res.status);
      const body = await res.json();
      const cols = new Set(), keys = new Set();
      for (const d of body.docs) {
        const k = d.collection + '/' + d.id, cur = docs.get(k);
        cursor = Math.max(cursor, d.updatedAt);
        if (pending.get(k)) continue;
        if (d.deleted) { if (!cur) continue; docs.delete(k); }
        else { if (cur && cur.at >= d.updatedAt) continue; docs.set(k, { col: d.collection, id: d.id, data: d.data, at: d.updatedAt }); }
        cols.add(d.collection); keys.add(k);
      }
      if (!loaded) { loaded = true; emit(colSubs.keys(), docSubs.keys()); }
      else if (cols.size) emit(cols, keys);
    } catch (e) {
      if (!loaded) for (const subs of colSubs.values()) for (const s of subs) s.err && s.err(e);
    } finally {
      polling = false;
      clearTimeout(pollTimer);
      pollTimer = setTimeout(poll, document.hidden ? POLL_HIDDEN_MS : POLL_MS);
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && loaded) poll(); });

  async function write(col, id, method, body) {
    const k = col + '/' + id;
    pending.set(k, (pending.get(k) || 0) + 1);
    try {
      const res = await call('/docs/' + encodeURIComponent(col) + '/' + encodeURIComponent(id), {
        method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 404) throw err('not_found', 'Doküman yok');
      if (!res.ok) throw err('unavailable', 'Kaydedilemedi (HTTP ' + res.status + ')');
      return res.status === 204 ? null : res.json();
    } finally {
      const n = pending.get(k) - 1;
      n ? pending.set(k, n) : pending.delete(k);
      setTimeout(poll, 50);
    }
  }
  function docRef(col, id) {
    const k = col + '/' + id;
    const local = (data) => {
      const before = docs.get(k);
      if (data === undefined) docs.delete(k); else docs.set(k, { col, id, data, at: before ? before.at : 0 });
      emit([col], [k]);
      return () => { before ? docs.set(k, before) : docs.delete(k); emit([col], [k]); };
    };
    return {
      id,
      async get() { return snapDoc(col, id); },
      async set(data) {
        const undo = local(structuredClone(data));
        try { const r = await write(col, id, 'PUT', data); const d = docs.get(k); if (d && r) d.at = r.updatedAt; }
        catch (e) { undo(); throw e; }
      },
      async update(patch) {
        const cur = docs.get(k);
        const undo = cur ? local(Object.assign(structuredClone(cur.data), structuredClone(patch))) : () => {};
        try { await write(col, id, 'PATCH', patch); } catch (e) { undo(); throw e; }
      },
      async delete() {
        const undo = local(undefined);
        try { await write(col, id, 'DELETE'); } catch (e) { undo(); throw e; }
      },
      onSnapshot(cb) {
        const s = { cb }; if (!docSubs.has(k)) docSubs.set(k, new Set()); docSubs.get(k).add(s);
        if (loaded) setTimeout(() => cb(snapDoc(col, id)));
        return () => docSubs.get(k).delete(s);
      },
    };
  }
  const db = {
    collection(col) {
      return {
        doc: (id) => docRef(col, id),
        onSnapshot(cb, onErr) {
          const s = { cb, err: onErr }; if (!colSubs.has(col)) colSubs.set(col, new Set()); colSubs.get(col).add(s);
          if (loaded) setTimeout(() => emit([col], []));
          return () => colSubs.get(col).delete(s);
        },
      };
    },
    doc(path) { const [col, id] = path.split('/'); return docRef(col, id); },
  };

  // ---------- sample ----------
  async function imageBlock(img) {
    let blob = img;
    if (!(img instanceof Blob)) {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    }
    const b64 = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = no; fr.readAsDataURL(blob); });
    return { type: 'image', source: { type: 'base64', media_type: blob.type || 'image/jpeg', data: b64 } };
  }
  /** Tek tur: SSE'yi okur, içerik bloklarını kurar. */
  async function round(req, signal, onDelta) {
    const res = await call('/sample', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), signal });
    if (!res.ok || !res.body) throw err('unavailable', 'HTTP ' + res.status);
    const reader = res.body.getReader(), dec = new TextDecoder();
    const blocks = [], json = []; let stop = null, buf = '';
    const handle = (event, data) => {
      if (event === 'error' || data.type === 'error') {
        const e = data.error || data; throw err(e.code === 'overloaded_error' ? 'rate_limited' : (e.code || 'unavailable'), e.message);
      }
      if (data.type === 'content_block_start') { blocks[data.index] = Object.assign({}, data.content_block); json[data.index] = ''; }
      else if (data.type === 'content_block_delta') {
        const b = blocks[data.index], d = data.delta;
        if (d.type === 'text_delta') { b.text = (b.text || '') + d.text; onDelta(d.text); }
        else if (d.type === 'input_json_delta') json[data.index] += d.partial_json;
        else if (d.type === 'thinking_delta') b.thinking = (b.thinking || '') + d.thinking;
        else if (d.type === 'signature_delta') b.signature = (b.signature || '') + d.signature;
      }
      else if (data.type === 'message_delta' && data.delta) stop = data.delta.stop_reason || stop;
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          let event = 'message', data = '';
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (data) handle(event, JSON.parse(data));
        }
      }
    } catch (e) {
      reader.cancel().catch(() => {});
      throw e;
    }
    if (!stop) throw err('unavailable', 'Yanıt yarıda kesildi');
    blocks.forEach((b, k) => {
      if (b && b.type === 'tool_use') { try { b.input = json[k] ? JSON.parse(json[k]) : {}; } catch (e) { b.input = null; } }
    });
    // Sunucu taraflı yedek modele geçiş blokları geri gönderilmez.
    return { stop, content: blocks.filter(b => b && b.type !== 'fallback') };
  }
  async function sample(input, opts) {
    opts = opts || {};
    const signal = opts.signal;
    const tools = opts.tools || [];
    let messages = typeof input === 'string' ? [{ role: 'user', content: input }]
      : input.map(t => ({ role: t.role, content: t.content }));
    if (opts.images && opts.images.length) {
      const last = messages[messages.length - 1];
      const imgs = await Promise.all(opts.images.map(imageBlock));
      last.content = [...imgs, ...(typeof last.content === 'string' ? [{ type: 'text', text: last.content }] : last.content)];
    }
    const req = {
      tier: opts.modelTier || 'default', model: opts.model,
      tools: tools.map(t => ({ name: t.name, description: t.description || '', input_schema: t.inputSchema || { type: 'object', properties: {} } })),
    };
    let text = '', truncated = false;
    try {
      for (let r = 0; r < MAX_TOOL_ROUNDS; r++) {
        if (signal && signal.aborted) throw err('cancelled', 'Durduruldu');
        const sep = text ? '\n\n' : ''; let first = true;
        const out = await round(Object.assign({}, req, { messages }), signal, (delta) => {
          if (first) { text += sep; first = false; }
          text += delta;
          opts.onText && opts.onText({ text, delta });
        });
        if (out.stop === 'refusal') throw err('refused', 'Claude bu isteği yanıtlamadı');
        if (out.stop === 'max_tokens') truncated = true;
        if (out.stop !== 'tool_use') break;
        messages = messages.concat([{ role: 'assistant', content: out.content }]);
        const results = await Promise.all(out.content.filter(b => b.type === 'tool_use').map(async (b) => {
          const tool = tools.find(t => t.name === b.name);
          if (!tool) return { type: 'tool_result', tool_use_id: b.id, is_error: true, content: 'Bilinmeyen araç: ' + b.name };
          if (b.input === null) return { type: 'tool_result', tool_use_id: b.id, is_error: true, content: 'INVALID_JSON: araç girdisi okunamadı, tekrar dene.' };
          try {
            const v = await tool.execute(b.input);
            return { type: 'tool_result', tool_use_id: b.id, content: typeof v === 'string' ? v : JSON.stringify(v === undefined ? null : v) };
          } catch (e) {
            return { type: 'tool_result', tool_use_id: b.id, is_error: true, content: String((e && e.message) || e) };
          }
        }));
        messages = messages.concat([{ role: 'user', content: results }]);
      }
    } catch (e) {
      if (e && e.name === 'AbortError') throw err('cancelled', 'Durduruldu', { text });
      throw Object.assign(e && e.code ? e : err('unavailable', String((e && e.message) || e)), { text });
    }
    return { text, truncated, modelApplied: req.model || null, modelTierApplied: req.tier };
  }
  sample.json = async (input, opts) => {
    const { text } = await sample(input, opts);
    const a = text.search(/[{[]/), b = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { throw err('bad_json', 'Yanıt JSON değil', { text }); }
  };
  sample.limits = async () => ({ tools: true, images: true });

  // ---------- assets / downloads ----------
  const assets = {
    async upload(blob) {
      const fd = new FormData(); fd.append('file', blob, 'gorsel');
      const res = await call('/assets', { method: 'POST', body: fd });
      if (res.status === 413) throw err('too_large', 'Görsel çok büyük');
      if (!res.ok) throw err('unavailable', 'Yüklenemedi (HTTP ' + res.status + ')');
      return res.json();
    },
    async list() { return { assets: [], usage: {} }; },
    async delete() {},
  };
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'indirme';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      // Gönderi paketi (slaytlar + açıklama) Instagram kuyruğuna da gider; paylaşım admin panelden yapılır.
      if (/^nartgo-.+\.zip$/.test(filename || '')) queuePackage(blob, filename);
    },
  };

  async function queuePackage(blob, filename) {
    try {
      const fd = new FormData(); fd.append('file', blob, filename);
      const res = await call('/instagram/packages', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (res.ok) notice('Instagram kuyruğuna eklendi: ' + body.title + ' (' + body.slides + ' slayt)');
      else notice('Instagram kuyruğuna eklenemedi: ' + (body.message || 'HTTP ' + res.status), true);
    } catch (e) {
      if (e.code !== 'not_granted') notice('Instagram kuyruğuna eklenemedi', true);
    }
  }

  function notice(text, bad) {
    const b = document.createElement('div');
    b.textContent = text;
    b.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;color:#fff;padding:10px 16px;border-radius:8px;font:14px system-ui;max-width:90vw;background:' + (bad ? '#7a1c1c' : '#1f5130');
    document.body.append(b);
    setTimeout(() => b.remove(), 6000);
  }

  // ---------- mcp: görsel arama için tarayıcı taklidi ----------
  // Uygulama Commons'u Claude masaüstü tarayıcısıyla okur (navigate → get_page_text / ekran görüntüsü).
  // Burada Commons API'si CORS ile doğrudan okunur, "ekran görüntüsü" de canvas'ta çizilir.
  let page = null;
  const loadImage = (src) => new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => no(err('no_image', 'Görsel açılamadı')); im.src = src; });
  async function screenshot() {
    if (!page) throw err('no_image', 'Açık sayfa yok');
    const c = document.createElement('canvas'), x = c.getContext('2d');
    if (page.startsWith('data:text/html')) {
      // Aday temas baskısı: 4 sütun × 2 satır, siyah zemin, 10px boşluk.
      const html = decodeURIComponent(page.slice(page.indexOf(',') + 1));
      const srcs = [...html.matchAll(/<img src="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      c.width = 1600; c.height = 800; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      await Promise.all(srcs.map(async (s, k) => {
        try {
          const im = await loadImage(s), cw = 400 - 20, ch = 400 - 20, r = Math.min(cw / im.width, ch / im.height);
          const w = im.width * r, h = im.height * r;
          x.drawImage(im, (k % 4) * 400 + 10 + (cw - w) / 2, Math.floor(k / 4) * 400 + 10 + (ch - h) / 2, w, h);
        } catch (e) {}
      }));
    } else {
      const im = await loadImage(page);
      c.width = im.width + 40; c.height = im.height + 40; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 20, 20);
    }
    const data = c.toDataURL('image/png').split(',')[1];
    return { content: [{ type: 'image', data, mimeType: 'image/png' }] };
  }
  const browser = {
    async navigate({ url }) { page = url; return { content: [{ type: 'text', text: 'Navigated. tab id: 1' }] }; },
    async get_page_text() {
      if (!page || !/^https:\/\/commons\.wikimedia\.org\/w\/api\.php\?/.test(page)) throw err('tool_error', 'Sayfa metni okunamadı');
      const res = await nativeFetch(page + '&origin=*');
      if (!res.ok) throw err('upstream_error', 'Commons HTTP ' + res.status);
      return { content: [{ type: 'text', text: await res.text() }] };
    },
    async computer({ action }) {
      if (action !== 'screenshot') throw err('tool_error', 'Desteklenmeyen işlem: ' + action);
      return screenshot();
    },
  };
  const mcp = {
    async callTool(server, tool, input) {
      if (server !== 'host:claude_browser') throw err('server_not_connected', server + ' bağlı değil');
      const { tabId, ...rest } = input || {};
      if (!browser[tool]) throw err('tool_error', 'Desteklenmeyen araç: ' + tool);
      return browser[tool](rest);
    },
  };

  // ---------- window.claude ----------
  const caps = { db, sample, assets, downloads, mcp };
  window.claude = Object.freeze({
    use(name) {
      if (name === 'db') { if (!token()) { signedOut(); return Promise.resolve(null); } if (!pollTimer && !polling) poll(); }
      return Promise.resolve(caps[name] || null);
    },
  });
})();
