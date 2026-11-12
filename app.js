/* ===== CONFIGURA AQUÍ ===== */
var CFG={supabaseUrl:"https://TU-PROYECTO.supabase.co",supabaseKey:"TU_ANON_PUBLIC_KEY",adminEmail:"josesalcedl818@gmail.com", /* correo del admin creado en Supabase (Authentication > Users) */
 price:5,total:6000,drawDate:"2026-11-11T20:01:08-05:00",whatsapp:"51900000000",dniObligatorio:false, /* true = el DNI es obligatorio para comprar */
 social:{instagram:"https://instagram.com/TU_USUARIO",facebook:"https://facebook.com/TU_PAGINA",tiktok:"https://tiktok.com/@TU_USUARIO",youtube:""}, /* deja "" para ocultar una red */
 methods:{
  yape:[["Número Yape","900 000 000"],["A nombre de","Nombre del titular"]],
  plin:[["Número Plin","900 000 000"],["A nombre de","Nombre del titular"]],
  bank:[["Banco","BCP · Cuenta de ahorros"],["N.º de cuenta","000-00000000-0-00"],["CCI","002-000-000000000000-00"],["Titular","Nombre del titular"]]}};
/* ========================== */
var $=function(i){return document.getElementById(i)};
var sel=new Set(),taken=new Set(),method="yape",fileBlob=null,db=null,assets=null,uid=null;
$("price").textContent=CFG.price;
/* countdown */
function tick(){var t=Math.max(0,new Date(CFG.drawDate)-new Date()),p=function(n){return String(n).padStart(2,"0")};
 $("d").textContent=p(Math.floor(t/864e5));$("h").textContent=p(Math.floor(t%864e5/36e5));$("m").textContent=p(Math.floor(t%36e5/6e4));$("s").textContent=p(Math.floor(t%6e4/1e3))}
tick();setInterval(tick,1000);
/* grid */
function draw(){var g=$("grid");g.innerHTML="";
 var shown=0;for(var n=1;n<=CFG.total;n++){if(fq&&String(n).padStart(3,"0").indexOf(fq)<0)continue;if(fmode==="free"&&taken.has(n))continue;shown++;var b=document.createElement("button");b.className="num"+(sel.has(n)?" sel":"");b.textContent=String(n).padStart(3,"0");b.disabled=taken.has(n);b.setAttribute("aria-pressed",sel.has(n));
  (function(n){b.onclick=function(){sel.has(n)?sel.delete(n):sel.add(n);draw();upd()}})(n);g.appendChild(b)}
 if(!shown)g.innerHTML='<p class="empty">No hay números con esa búsqueda.</p>';
 $("sres").textContent=(fq||fmode!=="all")?shown+" número"+(shown===1?"":"s")+" encontrado"+(shown===1?"":"s"):"";
 upd()}
function upd(){var c=sel.size,list=[...sel].sort(function(a,b){return a-b}).map(function(n){return String(n).padStart(3,"0")});
 $("cnt").textContent=c;$("tot").textContent=c*CFG.price;$("tot2").textContent=c*CFG.price;$("go").disabled=!c;
 $("mine").textContent=c?list.join(", "):"Aún no elegiste ninguno";
 var pc=Math.min(100,taken.size/CFG.total*100);$("sold").textContent=pc===0?"0":(pc<10?pc.toFixed(1).replace(/\.0$/,""):Math.round(pc));$("fill").style.width=pc+"%"}
$("go").onclick=function(){$("pago").scrollIntoView({behavior:"smooth"})};
/* payment methods */
function showPay(){var h="";CFG.methods[method].forEach(function(r){h+="<dt>"+r[0]+"</dt><dd><span>"+r[1]+"</span><button type='button' class='cp' data-v='"+r[1]+"'>Copiar</button></dd>"});
 var p=$("pay");p.style.animation="none";p.offsetWidth;p.style.animation="";p.innerHTML=h;
 p.querySelectorAll(".cp").forEach(function(b){b.onclick=function(){try{navigator.clipboard.writeText(b.dataset.v);b.textContent="¡Copiado!";setTimeout(function(){b.textContent="Copiar"},1400)}catch(e){}}})}
document.querySelectorAll("#ptabs .tab").forEach(function(t){t.onclick=function(){method=t.dataset.m;document.querySelectorAll("#ptabs .tab").forEach(function(x){x.setAttribute("aria-selected",x===t)});showPay()}});
showPay();
/* proof upload */
$("file").onchange=function(){var f=this.files[0];if(!f)return;fileBlob=f;var u=URL.createObjectURL(f);
 $("dropTxt").innerHTML="";var im=document.createElement("img");im.src=u;im.alt="Vista previa del comprobante";$("drop").insertBefore(im,$("dropTxt"));$("dropTxt").textContent="Toca para cambiar la foto";
 $("drop").querySelectorAll("img").forEach(function(x,i,a){if(i<a.length-1)x.remove()})};
["dragover","dragleave","drop"].forEach(function(e){$("drop").addEventListener(e,function(ev){if(e!=="drop"){ev.preventDefault()}$("drop").classList.toggle("on",e==="dragover")})});
function msg(t,e){$("msg").textContent=t;$("msg").className="msg"+(e?" e":"")}
var TOKEN="";
var isAdm=false,ordersAll=[],filt="pendiente",wFile=null;
function esc(t){var d=document.createElement("div");d.textContent=t==null?"":t;return d.innerHTML}
var sb=null;
try{sb=supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey)}catch(e){}
function fail(m,s){var e=new Error(m);e.status=s;throw e}
function isImg(d){return typeof d==="string"&&/^data:image\/(jpeg|png|webp);base64,/.test(d)}
function dbErr(er){var m=String(er&&er.message||"");
 if(m==="taken")fail("taken",409);if(m==="invalid")fail("invalid",400);
 if(m==="auth"||(er&&(er.code==="42501"||er.code==="PGRST301")))fail("auth",401);
 console.error(er);fail("db",500)}
function rowOrder(o){o.at=Date.parse(o.created_at)||0;return o}
async function api(p,o){o=o||{};var m=o.m||"GET",b=o.b||{},x,r;
 if(!sb)fail("db",500);
 /* ---- público ---- */
 if(p==="/taken"){r=await sb.rpc("get_taken");if(r.error)dbErr(r.error);return r.data||[]}
 if(p==="/winners"){r=await sb.from("winners").select("id,name,number,photo").order("created_at",{ascending:false});if(r.error)dbErr(r.error);
  return r.data.map(function(w){return {id:w.id,name:w.name,num:w.number,img:w.photo}})}
 if(p==="/login"){r=await sb.auth.signInWithPassword({email:CFG.adminEmail,password:String(b.password||"")});if(r.error)fail("auth",401);return {token:"local"}}
 if(p==="/order"&&m==="POST"){r=await sb.rpc("create_order",{p_name:b.name,p_phone:b.phone,p_dni:b.dni,p_numbers:b.numbers,p_method:b.method,p_proof:b.proof});if(r.error)dbErr(r.error);return {code:r.data}}
 if(p==="/lookup"&&m==="POST"){r=await sb.rpc("lookup_order",{q:String(b.q||"")});if(r.error)dbErr(r.error);return r.data||[]}
 /* ---- solo administrador ---- */
 var ss=await sb.auth.getSession();if(!ss.data.session)fail("auth",401);
 if(p==="/orders"){r=await sb.from("orders").select("*").order("created_at",{ascending:false});if(r.error)dbErr(r.error);return r.data.map(rowOrder)}
 if(p==="/manual"&&m==="POST"){r=await sb.rpc("admin_manual_order",{p_name:b.name,p_phone:b.phone,p_dni:b.dni,p_numbers:b.numbers,p_method:b.method,p_proof:b.proof||""});if(r.error)dbErr(r.error);return {code:r.data}}
 if(x=/^\/order\/(\w+)\/status$/.exec(p)){if(["aprobado","rechazado"].indexOf(b.status)<0)fail("invalid",400);
  r=await sb.from("orders").update({status:b.status}).eq("code",x[1]).select("code");if(r.error)dbErr(r.error);if(!r.data.length)fail("nf",404);return {ok:1}}
 if((x=/^\/order\/(\w+)$/.exec(p))&&m==="DELETE"){r=await sb.from("orders").delete().eq("code",x[1]).select("code");if(r.error)dbErr(r.error);if(!r.data.length)fail("nf",404);return {ok:1}}
 if(p==="/winner"&&m==="POST"){if(!b.name||!b.number||!isImg(b.photo))fail("invalid",400);
  r=await sb.from("winners").insert({name:String(b.name).slice(0,80),number:String(b.number).slice(0,10),photo:b.photo});if(r.error)dbErr(r.error);return {ok:1}}
 if((x=/^\/winner\/([\w-]+)$/.exec(p))&&m==="DELETE"){r=await sb.from("winners").delete().eq("id",x[1]).select("id");if(r.error)dbErr(r.error);return {ok:1}}
 fail("nf",404)}
function pack(f){return new Promise(function(ok,no){var r=new FileReader();r.onerror=no;r.onload=function(){var im=new Image();
 im.onerror=function(){ok(r.result)};
 im.onload=function(){var k=Math.min(1,1100/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.75))};
 im.src=r.result};r.readAsDataURL(f)})}
async function loadTaken(){try{var l=await api("/taken");taken=new Set(l);taken.forEach(function(n){sel.delete(n)});draw()}catch(e){}}
/* enviar compra */
$("send").onclick=async function(){
 var name=$("nm").value.trim(),ph=$("ph").value.trim();
 if(!sel.size)return msg("Elige al menos un número.",1);
 if(name.length<3)return msg("Escribe tu nombre completo.",1);
 if(ph.replace(/\D/g,"").length<9)return msg("Escribe un celular válido de 9 dígitos.",1);
 var dni=$("dn").value.trim();
 if(CFG.dniObligatorio&&!/^\d{8}$/.test(dni))return msg("Escribe tu DNI de 8 dígitos.",1);
 if(dni&&!/^\d{8}$/.test(dni))return msg("El DNI debe tener 8 dígitos.",1);
 if(!fileBlob)return msg("Sube la foto del comprobante de pago.",1);
 var nums=[...sel].sort(function(a,b){return a-b}),btn=this;btn.disabled=true;msg("Enviando…");
 try{
  var r=await api("/order",{m:"POST",b:{name:name,phone:ph,dni:dni,numbers:nums,method:method,proof:await pack(fileBlob)}});
  $("okTxt").textContent="Tu pedido "+r.code+" con los números "+nums.join(", ")+" quedó registrado. Envía tu comprobante por WhatsApp para que lo validemos.";
  lastFile=fileBlob;lastMsg="Hola, soy "+name+". Compré los números "+nums.join(", ")+" (S/ "+nums.length*CFG.price+"), pedido "+r.code+". Mi comprobante de "+method+":";$("ok").classList.add("show");
 }catch(e){
  btn.disabled=false;
  if(e.message==="taken"){msg("Alguno de tus números acaba de ser comprado. Elige otros.",1);loadTaken();return}
  if(e.message==="invalid"){msg("Revisa tus datos y que la foto sea JPG o PNG.",1);return}
  msg("No se pudo guardar. Intenta de nuevo.",1)}
};
/* ganadores */
function renderWin(l){var w=$("wins");
 if(!l.length){w.innerHTML='<p class="empty">Los ganadores aparecerán aquí después del sorteo.</p>';return}
 w.innerHTML=l.map(function(x){return '<div class="win"><img src="'+esc(x.img)+'" alt="Foto de '+esc(x.name)+'"><div><b>'+esc(x.name)+'</b><span>Número ganador '+esc(x.num)+'</span>'+(isAdm?'<br><button class="cp" data-del="'+esc(x.id)+'">Quitar</button>':'')+'</div></div>'}).join("")}
async function loadWins(){try{renderWin(await api("/winners"))}catch(e){}}
$("wins").onclick=async function(e){var b=e.target.closest("button[data-del]");
 if(b&&isAdm&&confirm("¿Quitar este ganador?")){try{await api("/winner/"+b.dataset.del,{m:"DELETE"})}catch(x){}loadWins()}};
$("wfile").onchange=function(){wFile=this.files[0]||null;$("wtxt").textContent=wFile?wFile.name:"Toca para subir la foto del ganador"};
$("wsend").onclick=async function(){var n=$("wn").value.trim(),num=$("wnum").value.trim(),m=$("wmsg"),b=this;
 if(!n||!num||!wFile){m.textContent="Completa el nombre, el número y la foto.";m.className="msg e";return}
 b.disabled=true;m.textContent="Publicando…";m.className="msg";
 try{await api("/winner",{m:"POST",b:{name:n,number:num,photo:await pack(wFile)}});
  $("wn").value="";$("wnum").value="";wFile=null;$("wfile").value="";$("wtxt").textContent="Toca para subir la foto del ganador";m.textContent="¡Ganador publicado!";loadWins()}
 catch(err){m.textContent="No se pudo publicar. Intenta de nuevo.";m.className="msg e"}b.disabled=false};
/* administrador */
function renderAdm(){var q=($("aq").value||"").toLowerCase(),ap=ordersAll.filter(function(o){return o.status==="aprobado"}),pe=ordersAll.filter(function(o){return o.status==="pendiente"});
 var tk=function(a){return a.reduce(function(s,o){return s+o.numbers.length},0)};
 $("stats").innerHTML=[["Pendientes",pe.length],["Aprobados",ap.length],["Tickets aprobados",tk(ap)],["Recaudado aprobado","S/ "+ap.reduce(function(s,o){return s+o.total},0)]].map(function(x){return '<div class="card" style="padding:12px 18px"><span style="font-size:13px;color:var(--mute)">'+x[0]+'</span><b style="display:block;font:400 24px Archivo Black,sans-serif">'+x[1]+'</b></div>'}).join("");
 var l=ordersAll.filter(function(o){return o.status===filt&&(!q||(o.name+" "+o.phone+" "+(o.dni||"")+" "+o.code).toLowerCase().indexOf(q)>-1)});
 $("alist").innerHTML=l.length?l.map(function(o){var u=o.proof||"";
  return '<div class="ord">'+(u?'<img class="zoom" style="cursor:zoom-in" src="'+esc(u)+'" alt="Comprobante">':'<span class="badge">Sin foto</span>')+'<div><b>'+esc(o.name)+'</b> · '+esc(o.phone)+(o.dni?' · DNI '+esc(o.dni):'')+'<br>Números: '+o.numbers.map(function(n){return String(n).padStart(3,"0")}).join(", ")+'<br>S/ '+o.total+' · '+esc(o.method)+' · '+esc(o.code)+'<br><span class="badge '+o.status+'">'+o.status+'</span></div><div class="ac">'+(o.status==="pendiente"?'<button class="btn sm" data-a="aprobado" data-c="'+esc(o.code)+'">Aprobar</button><button class="btn sm rj" data-a="rechazado" data-c="'+esc(o.code)+'">Rechazar</button>':'<button class="btn sm rj" data-d="'+esc(o.code)+'">Eliminar</button>')+'</div></div>'}).join(""):'<p class="empty">No hay pedidos en esta lista.</p>'}
async function loadOrders(){try{ordersAll=await api("/orders");renderAdm()}catch(e){if(e.status===401)setAdm(false)}}
function setAdm(on){isAdm=on;$("login").style.display=on?"none":"";$("apanel").style.display=on?"":"none";$("winForm").style.display=on?"":"none";if(on)loadOrders();loadWins()}
$("admLink").onclick=function(){$("admin").style.display=""};
$("lbtn").onclick=async function(){
 try{var r=await api("/login",{m:"POST",b:{password:$("pw").value}});TOKEN=r.token;$("lmsg").textContent="";$("pw").value="";setAdm(true)}
 catch(e){$("lmsg").textContent="Contraseña incorrecta o sin conexión con la base de datos.";$("lmsg").className="msg e"}};
$("aq").oninput=renderAdm;
$("acsv").onclick=function(){var rows=[["Codigo","Nombre","Celular","DNI","Numeros","Total","Metodo","Estado"]].concat(ordersAll.filter(function(o){return o.status==="aprobado"}).map(function(o){return [o.code,o.name,o.phone,o.dni||"",o.numbers.join(" "),o.total,o.method,o.status]}));
 var csv="\ufeff"+rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"'}).join(",")}).join("\n");
 var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="tickets-aprobados.csv";a.click()};
$("atabs").onclick=function(e){var t=e.target.closest(".tab");if(!t)return;filt=t.dataset.f;document.querySelectorAll("#atabs .tab").forEach(function(x){x.setAttribute("aria-selected",x===t)});renderAdm()};
$("alist").onclick=async function(e){var z=e.target.closest("img.zoom");if(z){$("lbi").src=z.src;$("lb").classList.add("show");return}var d=e.target.closest("button[data-d]");
 if(d){var od=ordersAll.filter(function(q){return q.code===d.dataset.d})[0];
  if(!od||!confirm("¿Eliminar el ticket "+od.code+" de "+od.name+"?\nSe borra el pedido y los números "+od.numbers.map(function(n){return String(n).padStart(3,"0")}).join(", ")+" quedan libres otra vez.\nEsta acción no se puede deshacer."))return;
  d.disabled=true;try{await api("/order/"+d.dataset.d,{m:"DELETE"});loadOrders();loadTaken()}catch(err){d.disabled=false;alert("No se pudo eliminar. Intenta de nuevo.")}return}
 var b=e.target.closest("button[data-a]");if(!b)return;b.disabled=true;
 try{await api("/order/"+b.dataset.c+"/status",{m:"POST",b:{status:b.dataset.a}});loadOrders();loadTaken()}
 catch(err){b.disabled=false;alert("No se pudo actualizar. Intenta de nuevo.")}};
var lastMsg="",lastFile=null,mFile=null;
$("okWa").onclick=async function(){var t=lastMsg;
 try{if(lastFile&&navigator.canShare&&navigator.canShare({files:[lastFile]})){await navigator.share({files:[lastFile],text:t});return}}catch(e){if(e&&e.name==="AbortError")return}
 window.open("https://wa.me/"+CFG.whatsapp+"?text="+encodeURIComponent(t+" (adjunto mi comprobante)"),"_blank")};
$("mfile").onchange=function(){mFile=this.files[0]||null;$("mtxt").textContent=mFile?mFile.name:"Foto del comprobante (opcional)"};
$("msend").onclick=async function(){var m=$("mmsg"),nums=$("mnum").value.split(/[\s,;]+/).filter(Boolean).map(Number);
 try{await api("/manual",{m:"POST",b:{name:$("mn").value.trim(),phone:$("mp").value.trim(),dni:$("mdn").value.trim(),numbers:nums,method:"manual",proof:mFile?await pack(mFile):""}});
  ["mn","mp","mdn","mnum"].forEach(function(i){$(i).value=""});mFile=null;$("mfile").value="";$("mtxt").textContent="Foto del comprobante (opcional)";m.textContent="¡Venta registrada!";m.className="msg";loadOrders();loadTaken()}
 catch(e){m.textContent=e.message==="taken"?"Alguno de esos números ya está vendido.":"Revisa el nombre, el DNI (8 dígitos) y que los números sean del 1 al "+CFG.total+".";m.className="msg e"}};
$("abk").onclick=async function(){try{var w=await api("/winners");var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({orders:ordersAll,winners:w})],{type:"application/json"}));a.download="respaldo-sorteo.json";a.click()}catch(e){alert("No se pudo generar el respaldo.")}};
$("aout").onclick=async function(){try{await sb.auth.signOut()}catch(e){}location.reload()};
/* buscador, azar, redes y detalles */
var fq="",fmode="all";
$("sq").oninput=function(){fq=this.value.replace(/\D/g,"");this.value=fq;draw()};
function setF(m){fmode=m;$("fAll").setAttribute("aria-pressed",m==="all");$("fFree").setAttribute("aria-pressed",m==="free");draw()}
$("fAll").onclick=function(){setF("all")};$("fFree").onclick=function(){setF("free")};
$("lkBtn").onclick=function(){var q=Math.max(1,Math.min(50,parseInt($("lq").value)||1)),free=[],before=sel.size;
 for(var n=1;n<=CFG.total;n++)if(!taken.has(n)&&!sel.has(n))free.push(n);
 if(!free.length){$("sres").textContent="No quedan números libres.";return}
 for(var i=0;i<q&&free.length;i++)sel.add(free.splice(Math.floor(Math.random()*free.length),1)[0]);
 $("sq").value="";fq="";fmode="all";$("fAll").setAttribute("aria-pressed","true");$("fFree").setAttribute("aria-pressed","false");draw();
 var a=sel.size-before;$("sres").textContent="Te elegimos "+a+" número"+(a===1?"":"s")+" al azar."};
var IC={
 instagram:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
 facebook:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V13h2.8v8z"/></svg>',
 tiktok:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.3 2.3 1.7 3.9 4 4.1v3.1a7.4 7.4 0 0 1-4-1.2v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V3z"/></svg>',
 youtube:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/></svg>',
 whatsapp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/><path d="M9 8.800c0 3.200 2 5.200 5.200 5.200l1-1.300-1.800-1-.8.700a3.500 3.500 0 0 1-1.600-1.600l.7-.8-1-1.800z" fill="currentColor" stroke="none"/></svg>'};
function renderSocial(){var S=CFG.social||{},h="",nm={instagram:"Instagram",facebook:"Facebook",tiktok:"TikTok",youtube:"YouTube"};
 Object.keys(nm).forEach(function(k){if(S[k])h+='<a href="'+S[k]+'" target="_blank" rel="noopener" aria-label="'+nm[k]+'" title="'+nm[k]+'">'+IC[k]+'</a>'});
 h+='<a href="https://wa.me/'+CFG.whatsapp+'" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp">'+IC.whatsapp+'</a>';
 $("soc").innerHTML=h;$("soc2").innerHTML=h;$("waLink").href="https://wa.me/"+CFG.whatsapp;$("soporte").href="https://wa.me/"+CFG.whatsapp+"?text="+encodeURIComponent("Hola, necesito ayuda con el sorteo de El Nero.")}
renderSocial();
var dd=new Date(CFG.drawDate);
$("pill").textContent="Sorteo: "+dd.toLocaleString("es-PE",{weekday:"long",day:"numeric",month:"long",hour:"numeric",minute:"2-digit",timeZone:"America/Lima"});
document.querySelectorAll(".fd").forEach(function(x){x.textContent=dd.toLocaleDateString("es-PE",{day:"numeric",month:"long",year:"numeric",timeZone:"America/Lima"})});
document.querySelectorAll(".fp").forEach(function(x){x.textContent="S/ "+CFG.price});
$("yr").textContent=new Date().getFullYear();
if(document.documentElement.classList.contains("js")){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.1});
 document.querySelectorAll("section:not(#admin),.prog").forEach(function(x){x.classList.add("rv");io.observe(x)})}
/* consultar ticket */
$("qb").onclick=async function(){var q=$("qc").value.trim(),o=$("qr");
 if(q.replace(/\W/g,"").length<5){o.innerHTML='<p class="msg e">Escribe tu código de pedido o tu celular completo.</p>';return}
 var l;try{l=await api("/lookup",{m:"POST",b:{q:q}})}catch(e){o.innerHTML='<p class="msg e">No se pudo consultar. Intenta de nuevo.</p>';return}
 if(!l.length){o.innerHTML='<p class="msg e">No encontramos ningún ticket con ese dato. Revisa que esté bien escrito.</p>';return}
 var T={pendiente:"Tu comprobante está en revisión. Te avisaremos pronto.",aprobado:"¡Tu ticket está aprobado! Ya participas en el sorteo.",rechazado:"No pudimos validar tu pago y los números fueron liberados. Escríbenos por WhatsApp."};
 o.innerHTML=l.map(function(x){return '<div class="res"><span class="badge '+esc(x.status)+'">'+esc(x.status)+'</span> <b>'+esc(x.code)+'</b><p>Números: '+x.numbers.map(function(n){return String(n).padStart(3,"0")}).join(", ")+' · S/ '+x.total+'</p><p class="m">'+esc(T[x.status]||"")+'</p></div>'}).join("")};
$("qc").onkeydown=function(e){if(e.key==="Enter")$("qb").click()};
/* ===== EXCEL (.xlsx) sin librerías ===== */
function crc32(u){var t=crc32.t,c,r=-1,i;if(!t){t=crc32.t=[];for(var n=0;n<256;n++){c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}for(i=0;i<u.length;i++)r=t[(r^u[i])&255]^(r>>>8);return (r^-1)>>>0}
function zip(files){var enc=new TextEncoder(),parts=[],cen=[],off=0;
 files.forEach(function(f){var nm=enc.encode(f[0]),d=enc.encode(f[1]),crc=crc32(d),h=new DataView(new ArrayBuffer(30)),c=new DataView(new ArrayBuffer(46));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,d.length,true);c.setUint32(24,d.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
  parts.push(new Uint8Array(h.buffer),nm,d);cen.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+d.length});
 var sz=cen.reduce(function(a,x){return a+x.length},0),e=new DataView(new ArrayBuffer(22));
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,sz,true);e.setUint32(16,off,true);
 return new Blob(parts.concat(cen,[new Uint8Array(e.buffer)]),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})}
function x2(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function xc(i){return String.fromCharCode(65+i)}
function xd(ms){return ms/864e5+25569-new Date(ms).getTimezoneOffset()/1440}
function xcell(r,c,it){var v=it,s="",f=null;if(Array.isArray(it)){v=it[0];s=it[1]?' s="'+it[1]+'"':"";f=it[2]}var ref=xc(c)+(r+1);
 if(f)return '<c r="'+ref+'"'+s+'><f>'+x2(f)+'</f><v>'+v+'</v></c>';
 if(typeof v==="number")return '<c r="'+ref+'"'+s+'><v>'+v+'</v></c>';
 return '<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+x2(v)+'</t></is></c>'}
function xsheet(rows,w,o){var sd=rows.map(function(row,r){return '<row r="'+(r+1)+'"'+(r===o.hr?' ht="26" customHeight="1"':'')+'>'+row.map(function(it,c){return xcell(r,c,it)}).join("")+'</row>'}).join("");
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"'+(o.grid?'':' showGridLines="0"')+'>'+(o.freeze?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>'+w.map(function(x,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+x+'" customWidth="1"/>'}).join("")+'</cols><sheetData>'+sd+'</sheetData>'+(o.filter?'<autoFilter ref="A1:'+xc(w.length-1)+rows.length+'"/>':'')+'<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>'}
var XH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
var XSTY=XH+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;S/ &quot;#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/></numFmts>'
 +'<fonts count="7"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FF0A2A7A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF13804A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFC63030"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFB26A00"/><name val="Calibri"/></font></fonts>'
 +'<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A2A7A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FB"/><bgColor indexed="64"/></patternFill></fill></fills>'
 +'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD5DBEA"/></left><right style="thin"><color rgb="FFD5DBEA"/></right><top style="thin"><color rgb="FFD5DBEA"/></top><bottom style="thin"><color rgb="FFD5DBEA"/></bottom><diagonal/></border></borders>'
 +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13">'
 +'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
 +'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
 +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
 +'<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
 +'<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
 +'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
 +'<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
 +'<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
 +'<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
 +'<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
 +'<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
 +'<xf numFmtId="10" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
 +'<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function buildXlsx(){
 var O=ordersAll.slice().sort(function(a,b){return a.at-b.at}),n=O.length,e=Math.max(n,1)+1,tot=CFG.total,
  by=function(s){return O.filter(function(o){return o.status===s})},
  cnt=function(s){return by(s).length},
  tk=function(s){return by(s).reduce(function(a,o){return a+o.numbers.length},0)},
  mn=function(s){return by(s).reduce(function(a,o){return a+o.total},0)},
  pn=function(x){return String(x).padStart(3,"0")},mt=function(m){return {yape:"Yape",plin:"Plin",bank:"Transferencia",manual:"Manual"}[m]||m||""},
  hd=function(l){return l.map(function(h){return [h,1]})},
  ES={aprobado:["Aprobado",8],pendiente:["Pendiente",10],rechazado:["Rechazado",9]};
 var P=[hd(["Código","Fecha","Nombre","Celular","DNI","Tickets","Total","Método","Estado","Números"])];
 O.forEach(function(o){var st=ES[o.status]||[o.status,2];P.push([[o.code,2],[xd(o.at),4],[o.name,2],[o.phone,2],[o.dni||"",2],[o.numbers.length,7],[o.total,3],[mt(o.method),2],st,[o.numbers.map(pn).join(", "),2]])});
 var T=[hd(["N.º","Nombre","Celular","DNI","Código","Método","Fecha de compra"])],rows=[];
 by("aprobado").forEach(function(o){o.numbers.forEach(function(x){rows.push([x,o])})});
 rows.sort(function(a,b){return a[0]-b[0]}).forEach(function(r){var o=r[1];T.push([[pn(r[0]),7],[o.name,2],[o.phone,2],[o.dni||"",2],[o.code,2],[mt(o.method),2],[xd(o.at),4]])});
 var H="Pedidos!I2:I"+e,E="Pedidos!F2:F"+e,F="Pedidos!G2:G"+e,L=function(t){return [t,6]};
 var R=[[["Sorteo El Nero · Resumen",5]],[["Exportado el "+new Date().toLocaleString("es-PE")]],[],hd(["Indicador","Valor"]),
  [L("Pedidos recibidos"),[n,7,"COUNTA(Pedidos!A2:A"+e+")"]],
  [L("Pedidos pendientes"),[cnt("pendiente"),7,'COUNTIF('+H+',"Pendiente")']],
  [L("Pedidos aprobados"),[cnt("aprobado"),7,'COUNTIF('+H+',"Aprobado")']],
  [L("Pedidos rechazados"),[cnt("rechazado"),7,'COUNTIF('+H+',"Rechazado")']],
  [L("Tickets aprobados"),[tk("aprobado"),7,'SUMIFS('+E+','+H+',"Aprobado")']],
  [L("Tickets pendientes"),[tk("pendiente"),7,'SUMIFS('+E+','+H+',"Pendiente")']],
  [L("Recaudado (aprobado)"),[mn("aprobado"),12,'SUMIFS('+F+','+H+',"Aprobado")']],
  [L("Por confirmar (pendiente)"),[mn("pendiente"),12,'SUMIFS('+F+','+H+',"Pendiente")']],
  [L("Números disponibles"),[tot-tk("aprobado")-tk("pendiente"),7,tot+"-B9-B10"]],
  [L("Avance de venta"),[(tk("aprobado")+tk("pendiente"))/tot,11,"(B9+B10)/"+tot]]];
 var NS='xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',RT="http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  PR="http://schemas.openxmlformats.org/package/2006/relationships",CT="application/vnd.openxmlformats-officedocument.spreadsheetml.";
 return zip([
  ["[Content_Types].xml",XH+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="'+CT+'sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="'+CT+'worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="'+CT+'worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="'+CT+'worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="'+CT+'styles+xml"/></Types>'],
  ["_rels/.rels",XH+'<Relationships xmlns="'+PR+'"><Relationship Id="rId1" Type="'+RT+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ["xl/workbook.xml",XH+'<workbook '+NS+' xmlns:r="'+RT+'"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Pedidos" sheetId="2" r:id="rId2"/><sheet name="Participantes" sheetId="3" r:id="rId3"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>'],
  ["xl/_rels/workbook.xml.rels",XH+'<Relationships xmlns="'+PR+'"><Relationship Id="rId1" Type="'+RT+'/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="'+RT+'/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="'+RT+'/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="'+RT+'/styles" Target="styles.xml"/></Relationships>'],
  ["xl/styles.xml",XSTY],
  ["xl/worksheets/sheet1.xml",xsheet(R,[30,18],{hr:3})],
  ["xl/worksheets/sheet2.xml",xsheet(P,[14,17,26,14,12,9,13,13,13,34],{hr:0,freeze:1,filter:1,grid:1})],
  ["xl/worksheets/sheet3.xml",xsheet(T,[8,28,15,12,14,13,17],{hr:0,freeze:1,filter:1,grid:1})]])}
$("axl").onclick=function(){var d=new Date(),p=function(x){return String(x).padStart(2,"0")},a=document.createElement("a");
 a.href=URL.createObjectURL(buildXlsx());a.download="Sorteo-El-Nero-"+d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+".xlsx";a.click()};
["dn","mdn"].forEach(function(i){$(i).oninput=function(){this.value=this.value.replace(/\D/g,"").slice(0,8)}});
$("dnOpt").style.display=CFG.dniObligatorio?"none":"";
/* init */
draw();loadTaken();setInterval(loadTaken,15000);loadWins();
if(sb)sb.auth.getSession().then(function(r){var u=r.data&&r.data.session&&r.data.session.user;if(u&&(u.email||"").toLowerCase()===CFG.adminEmail.toLowerCase()){TOKEN="local";$("admin").style.display="";setAdm(true)}});
