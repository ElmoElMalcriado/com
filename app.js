/* =====================================================
   EL NERO · app.js  (tickets al azar del 1 al 6000)
   Solo edita este bloque CONFIG.
   ===================================================== */
const CONFIG = {
  SUPABASE_URL: "PEGA_AQUI_TU_PROJECT_URL",        // Supabase > Project Settings > API > Project URL
  SUPABASE_KEY: "PEGA_AQUI_TU_ANON_PUBLIC_KEY",    // Supabase > Project Settings > API > anon public
  TOTAL: 6000,
  FECHA_SORTEO: "2026-12-31T20:00:00-05:00",       // fecha y hora del sorteo (hora de Perú)
  WHATSAPP: "51900000000",                         // tu WhatsApp con código de país, sin + ni espacios
  PAGOS: {
    yape: { "Número Yape": "900 000 000", "A nombre de": "Nombre del titular" },
    plin: { "Número Plin": "900 000 000", "A nombre de": "Nombre del titular" },
    bank: { "Banco": "BCP", "N° de cuenta": "000-00000000-0-00", "CCI": "000-000-000000000000-00", "A nombre de": "Nombre del titular" }
  },
  REDES: { facebook: "", instagram: "", tiktok: "" } // pon el enlace de cada red (vacío = no se muestra)
};

(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => "N° " + String(n).padStart(4, "0");
  const fmtDate = d => new Date(d).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  const configured = !/PEGA_AQUI/.test(CONFIG.SUPABASE_URL);
  const sb = configured ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY) : null;

  let price = 5, taken = new Set(), sel = [], method = "yape", adminPw = null, orders = [], filter = "pendiente";

  /* ---------- utilidades ---------- */
  function say(el, txt, bad) { el.textContent = txt; el.classList.toggle("e", !!bad); }
  const rnd = m => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % m; };
  function ext(f) { return (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg"; }
  async function upload(file) {
    const path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext(file);
    const { error } = await sb.storage.from("proofs").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return sb.storage.from("proofs").getPublicUrl(path).data.publicUrl;
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- cabecera, cuenta regresiva, redes ---------- */
  $("yr").textContent = new Date().getFullYear();
  const wa = "https://wa.me/" + CONFIG.WHATSAPP;
  $("soporte").href = wa; $("waLink").href = wa;
  document.querySelectorAll(".fd").forEach(e => e.textContent = new Date(CONFIG.FECHA_SORTEO).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }));
  function tick() {
    let s = Math.max(0, Math.floor((new Date(CONFIG.FECHA_SORTEO) - Date.now()) / 1000));
    const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    ["d", "h", "m", "s"].forEach((id, i) => $(id).textContent = String(v[i]).padStart(2, "0"));
  }
  tick(); setInterval(tick, 1000);
  const ico = {
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z" fill="currentColor"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>',
    tiktok: '<path d="M16 3c.3 2.4 1.8 4 4 4.2v3.2a7 7 0 0 1-4-1.3V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.3a2.8 2.8 0 1 0 1.8 2.6V3h3.2z" fill="currentColor"/>'
  };
  const redes = Object.keys(CONFIG.REDES).filter(k => CONFIG.REDES[k]).map(k =>
    '<a href="' + esc(CONFIG.REDES[k]) + '" target="_blank" rel="noopener" aria-label="' + k + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ico[k] + '</svg></a>').join("");
  $("soc").innerHTML = redes; $("soc2").innerHTML = redes;

  /* ---------- scroll reveal ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll("section,.follow").forEach(e => { e.classList.add("rv"); io.observe(e); });
  }

  /* ---------- datos: vendidos y precio ---------- */
  function paintPrice() {
    $("price").textContent = price;
    document.querySelectorAll(".fp").forEach(e => e.textContent = "S/ " + price);
  }
  function paintProgress() {
    const pct = Math.min(100, Math.round(taken.size / CONFIG.TOTAL * 1000) / 10);
    $("sold").textContent = pct; $("fill").style.width = pct + "%";
    $("pill").textContent = "Sorteo activo · quedan " + (CONFIG.TOTAL - taken.size) + " números";
  }
  async function loadInfo() {
    paintPrice(); paintProgress();
    if (!sb) return;
    const { data, error } = await sb.rpc("get_info");
    if (error || !data) return;
    taken = new Set(data.taken || []); if (data.price) price = Number(data.price);
    sel = sel.filter(n => !taken.has(n));
    paintPrice(); paintProgress(); paintSel();
  }

  /* ---------- tickets al azar ---------- */
  function paintSel() {
    const total = sel.length * price;
    $("cnt").textContent = sel.length; $("tot").textContent = total; $("tot2").textContent = total;
    $("mine").textContent = sel.length ? sel.map(pad).join(", ") : "Aún no elegiste ninguno";
    $("rres").innerHTML = sel.map(n => '<span class="num sel" style="padding:12px 16px;display:inline-block;cursor:default">' + pad(n) + "</span>").join("");
    $("rinfo").textContent = sel.length ? sel.length + (sel.length === 1 ? " ticket" : " tickets") + " · S/ " + total : "";
  }
  function sortear(q) {
    const libres = CONFIG.TOTAL - taken.size;
    if (libres < q) { $("rinfo").textContent = "Solo quedan " + libres + " números."; return; }
    const pick = new Set();
    while (pick.size < q) { const n = 1 + rnd(CONFIG.TOTAL); if (!taken.has(n)) pick.add(n); }
    sel = Array.from(pick).sort((a, b) => a - b);
    paintSel();
  }
  document.querySelectorAll("#qbtns button").forEach(b => b.addEventListener("click", () => sortear(parseInt(b.dataset.q, 10))));

  /* ---------- pago ---------- */
  function paintPay() {
    const d = CONFIG.PAGOS[method];
    $("pay").innerHTML = Object.keys(d).map(k =>
      "<dt>" + esc(k) + '</dt><dd>' + esc(d[k]) + ' <button class="cp" type="button" data-c="' + esc(d[k]) + '">Copiar</button></dd>').join("");
  }
  $("pay").addEventListener("click", e => {
    const b = e.target.closest(".cp"); if (!b) return;
    navigator.clipboard && navigator.clipboard.writeText(b.dataset.c);
    b.textContent = "¡Copiado!"; setTimeout(() => b.textContent = "Copiar", 1500);
  });
  $("ptabs").addEventListener("click", e => {
    const t = e.target.closest(".tab"); if (!t) return;
    method = t.dataset.m;
    document.querySelectorAll("#ptabs .tab").forEach(x => x.setAttribute("aria-selected", x === t));
    paintPay();
  });
  paintPay();
  $("dnOpt").textContent = "(obligatorio)";

  function preview(input, dropId, txtId, labelText) {
    input.addEventListener("change", () => {
      const f = input.files[0]; if (!f) return;
      const drop = $(dropId); const old = drop.querySelector("img"); if (old) old.remove();
      const img = document.createElement("img"); img.src = URL.createObjectURL(f); img.alt = "Vista previa";
      drop.insertBefore(img, $(txtId)); $(txtId).textContent = labelText;
    });
  }
  preview($("file"), "drop", "dropTxt", "Toca para cambiar la foto");

  $("send").addEventListener("click", async () => {
    const m = $("msg"), btn = $("send");
    const name = $("nm").value.trim(), phone = $("ph").value.replace(/\D/g, ""), dni = $("dn").value.replace(/\D/g, "");
    const file = $("file").files[0];
    if (!sb) return say(m, "Falta configurar Supabase en app.js.", true);
    if (!sel.length) return say(m, "Elige al menos un número.", true);
    if (name.length < 3) return say(m, "Escribe tu nombre completo.", true);
    if (phone.length !== 9) return say(m, "El celular debe tener 9 dígitos.", true);
    if (dni.length !== 8) return say(m, "El DNI debe tener 8 dígitos.", true);
    if (!file) return say(m, "Sube la foto de tu comprobante.", true);
    if (file.size > 8 * 1024 * 1024) return say(m, "La foto pesa más de 8 MB.", true);
    btn.disabled = true; say(m, "Enviando…");
    try {
      const url = await upload(file);
      const { data, error } = await sb.rpc("create_order", { p_name: name, p_phone: phone, p_dni: dni, p_numbers: sel, p_method: method, p_proof: url });
      if (error) throw error;
      const nums = sel.map(pad).join(", "), total = sel.length * price;
      $("okTxt").textContent = "Tu código es " + data + ". Números: " + nums + ". Total: S/ " + total + ". Validaremos tu pago y te escribiremos por WhatsApp.";
      $("okWa").onclick = () => window.open(wa + "?text=" + encodeURIComponent("Hola, hice mi pedido " + data + " (" + nums + "). Total S/ " + total + ". Mi DNI: " + dni), "_blank");
      $("ok").classList.add("show"); say(m, "");
    } catch (err) {
      if (err && err.code === "23505") { await loadInfo(); sel = []; paintSel(); say(m, "Alguno de tus números se acaba de vender. Elige tus tickets de nuevo.", true); }
      else say(m, "No se pudo enviar. Revisa tu conexión e inténtalo otra vez.", true);
    }
    btn.disabled = false;
  });

  /* ---------- consulta por celular o DNI ---------- */
  async function consultar() {
    const q = $("qc").value.replace(/\D/g, ""), out = $("qr");
    if (q.length < 8) { out.innerHTML = '<p class="msg e">Escribe tu celular (9 dígitos) o tu DNI (8 dígitos).</p>'; return; }
    if (!sb) { out.innerHTML = '<p class="msg e">Falta configurar Supabase en app.js.</p>'; return; }
    out.innerHTML = '<p class="msg">Buscando…</p>';
    const { data, error } = await sb.rpc("consult", { p_q: q });
    if (error) { out.innerHTML = '<p class="msg e">No se pudo consultar. Inténtalo otra vez.</p>'; return; }
    if (!data.length) { out.innerHTML = '<p class="msg">No encontramos tickets con ese dato.</p>'; return; }
    out.innerHTML = data.map(o =>
      '<div class="res"><span class="badge ' + esc(o.status) + '">' + esc(o.status) + "</span> <b>" + esc(o.name) + "</b>" +
      "<p><b>" + o.numbers.map(pad).map(esc).join(", ") + '</b></p><p class="m">Código ' + esc(o.code) + " · S/ " + esc(o.total) + " · " + fmtDate(o.created_at) + "</p></div>").join("");
  }
  $("qb").addEventListener("click", consultar);
  $("qc").addEventListener("keydown", e => { if (e.key === "Enter") consultar(); });

  /* ---------- ganadores ---------- */
  async function loadWinners() {
    if (!sb) return;
    const { data } = await sb.from("winners").select("*").order("created_at", { ascending: false });
    if (!data || !data.length) return;
    $("wins").innerHTML = data.map(w =>
      '<div class="win">' + (w.photo_url ? '<img src="' + esc(w.photo_url) + '" alt="' + esc(w.name) + '">' : "") +
      "<div><b>" + esc(w.name) + "</b><span>" + (w.number ? "Ticket " + pad(w.number) : "") + "</span></div></div>").join("");
  }
  $("wfile").closest("label").id = "wdrop";
  preview($("wfile"), "wdrop", "wtxt", "Foto lista ✓");
  $("wsend").addEventListener("click", async () => {
    const m = $("wmsg"), name = $("wn").value.trim(), num = parseInt($("wnum").value, 10), f = $("wfile").files[0];
    if (name.length < 3 || !num) return say(m, "Escribe el nombre y el número ganador.", true);
    say(m, "Publicando…");
    try {
      const url = f ? await upload(f) : null;
      const { error } = await sb.rpc("admin_add_winner", { p_pw: adminPw, p_name: name, p_number: num, p_photo: url });
      if (error) throw error;
      say(m, "¡Ganador publicado!"); $("wn").value = ""; $("wnum").value = ""; loadWinners();
    } catch (e) { say(m, "No se pudo publicar.", true); }
  });

  /* ---------- administrador ---------- */
  $("admLink").addEventListener("click", e => { e.preventDefault(); openAdmin(); });
  function openAdmin() { $("admin").style.display = "block"; $("admin").scrollIntoView(); }
  if (location.hash === "#admin") openAdmin();

  $("lbtn").addEventListener("click", async () => {
    const pw = $("pw").value;
    if (!sb) return say($("lmsg"), "Falta configurar Supabase en app.js.", true);
    const { data, error } = await sb.rpc("admin_list", { p_pw: pw });
    if (error) return say($("lmsg"), "Contraseña incorrecta.", true);
    adminPw = pw; orders = data || [];
    $("login").style.display = "none"; $("apanel").style.display = "block"; $("winForm").style.display = "block";
    paintAdmin();
  });
  $("pw").addEventListener("keydown", e => { if (e.key === "Enter") $("lbtn").click(); });
  $("aout").addEventListener("click", () => { adminPw = null; location.hash = ""; location.reload(); });

  async function refreshAdmin() {
    const { data } = await sb.rpc("admin_list", { p_pw: adminPw });
    orders = data || []; paintAdmin(); loadInfo();
  }
  function paintAdmin() {
    const ap = orders.filter(o => o.status === "aprobado"), pe = orders.filter(o => o.status === "pendiente");
    const boxes = [["Pedidos", orders.length], ["Pendientes", pe.length], ["Aprobados", ap.length],
      ["Tickets aprobados", ap.reduce((s, o) => s + o.numbers.length, 0)], ["Recaudado", "S/ " + ap.reduce((s, o) => s + Number(o.total), 0)]];
    $("stats").innerHTML = boxes.map(b => '<div class="card" style="padding:14px 18px;min-width:130px"><span style="color:var(--mute);font-size:13px">' + b[0] + '</span><br><b style="font-size:22px">' + b[1] + "</b></div>").join("");
    const q = $("aq").value.trim().toLowerCase();
    const list = orders.filter(o => o.status === filter && (!q || [o.name, o.phone, o.dni, o.code].join(" ").toLowerCase().includes(q)));
    $("alist").innerHTML = list.length ? list.map(o =>
      '<div class="ord"><img src="' + esc(o.proof_url || "") + '" alt="Comprobante" data-lb="1">' +
      "<div><b>" + esc(o.name) + '</b> <span class="badge ' + esc(o.status) + '">' + esc(o.status) + "</span><br>" +
      '<span style="color:var(--mute)">' + esc(o.phone) + " · DNI " + esc(o.dni || "-") + " · " + esc(o.code) + "</span><br>" +
      "<b>" + o.numbers.map(pad).map(esc).join(", ") + "</b> · S/ " + esc(o.total) + " · " + esc(o.method || "") + " · " + fmtDate(o.created_at) + "</div>" +
      '<div class="ac">' +
      (o.status === "pendiente" ? '<button class="btn sm" data-a="aprobado" data-id="' + o.id + '">Aprobar</button><button class="btn sm rj" data-a="rechazado" data-id="' + o.id + '">Rechazar</button>' : "") +
      '<button class="btn sm rj" data-a="del" data-id="' + o.id + '">Eliminar</button></div></div>').join("")
      : '<p class="empty">No hay pedidos en esta lista.</p>';
  }
  $("aq").addEventListener("input", paintAdmin);
  $("atabs").addEventListener("click", e => {
    const t = e.target.closest(".tab"); if (!t) return;
    filter = t.dataset.f;
    document.querySelectorAll("#atabs .tab").forEach(x => x.setAttribute("aria-selected", x === t));
    paintAdmin();
  });
  $("alist").addEventListener("click", async e => {
    const img = e.target.closest("img[data-lb]");
    if (img && img.src) { $("lbi").src = img.src; $("lb").classList.add("show"); return; }
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const id = b.dataset.id, a = b.dataset.a;
    if (a === "del") {
      if (!confirm("¿Eliminar este pedido? Sus números quedarán libres.")) return;
      await sb.rpc("admin_delete", { p_pw: adminPw, p_id: id });
    } else {
      if (a === "rechazado" && !confirm("¿Rechazar este pedido? Sus números quedarán libres.")) return;
      await sb.rpc("admin_set_status", { p_pw: adminPw, p_id: id, p_status: a });
    }
    refreshAdmin();
  });

  $("mfile").closest("label").id = "mdrop";
  preview($("mfile"), "mdrop", "mtxt", "Foto lista ✓");
  $("msend").addEventListener("click", async () => {
    const m = $("mmsg"), name = $("mn").value.trim(), phone = $("mp").value.replace(/\D/g, ""), dni = $("mdn").value.replace(/\D/g, "");
    const nums = Array.from(new Set($("mnum").value.split(/[,\s]+/).map(Number).filter(n => n >= 1 && n <= CONFIG.TOTAL)));
    if (name.length < 3 || phone.length !== 9 || !nums.length) return say(m, "Completa nombre, celular (9 dígitos) y números (1 a " + CONFIG.TOTAL + ").", true);
    say(m, "Guardando…");
    try {
      const f = $("mfile").files[0], url = f ? await upload(f) : null;
      const { error } = await sb.rpc("admin_manual_sale", { p_pw: adminPw, p_name: name, p_phone: phone, p_dni: dni, p_numbers: nums, p_proof: url });
      if (error) throw error;
      say(m, "Venta guardada."); ["mn", "mp", "mdn", "mnum"].forEach(i => $(i).value = ""); refreshAdmin();
    } catch (err) { say(m, err && err.code === "23505" ? "Alguno de esos números ya está vendido." : "No se pudo guardar.", true); }
  });

  /* ---------- exportar ---------- */
  const rows = list => list.map(o => ({
    Código: o.code, Nombre: o.name, Celular: o.phone, DNI: o.dni || "", Números: o.numbers.map(pad).join(" "),
    Tickets: o.numbers.length, Total: Number(o.total), Método: o.method || "", Estado: o.status, Fecha: fmtDate(o.created_at)
  }));
  const csv = r => { const k = Object.keys(r[0] || {}); return [k.join(",")].concat(r.map(x => k.map(c => '"' + String(x[c]).replace(/"/g, '""') + '"').join(","))).join("\n"); };
  $("axl").addEventListener("click", () => {
    const r = rows(orders); if (!r.length) return;
    if (window.XLSX) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r), "Pedidos"); XLSX.writeFile(wb, "pedidos.xlsx"); }
    else download("pedidos.csv", csv(r), "text/csv");
  });
  $("acsv").addEventListener("click", () => {
    const r = rows(orders.filter(o => o.status === "aprobado")); if (r.length) download("aprobados.csv", csv(r), "text/csv");
  });
  $("abk").addEventListener("click", () => download("respaldo-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(orders, null, 2), "application/json"));

  /* ---------- inicio ---------- */
  loadInfo(); loadWinners(); paintSel();
  setInterval(loadInfo, 30000);
})();
