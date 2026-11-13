// Página puente para reportar bugs desde el celular (código compartido por todas las marcas).
// Cada marca tiene su carpeta (ej. visiones-colibri/index.html) que define:
//   var REPORTE = { marca: "Nombre de la marca", form: "https://forms.clickup.com/..." };
// y luego carga este archivo. Aquí solo se edita si cambia la detección o los nombres de las preguntas.

// ===================== CONFIGURACIÓN COMÚN =====================

// Nombre de cada pregunta del form TAL CUAL aparece en ClickUp (con "¿", acentos, etc.).
// ClickUp prellena por el nombre VISIBLE de la pregunta (no por el nombre del campo).
// Cada dato acepta varios nombres posibles: se mandan todos y ClickUp ignora los que no existen en ese form.
// Si una lista queda vacía, ese dato no se manda.
var CAMPOS = {
  dispositivo: ["¿En qué dispositivo(s) aplica: mobile, desktop o ambos?"],          // VISIBLE: se prellena Mobile o Desktop; el cliente puede cambiarlo a Both
  navegador: ["¿En qué navegador se detectó?", "Browser"],                            // desplegable: Chrome, Safari, Edge, Brave, Firefox, Samsung Browser, Other
  sistema:   ["¿En qué sistema operativo se detectó?", "Sistema Operativo"],          // desplegable: Windows, Mac, IOS, Android
  modelo:    ["Modelo"],   // TEXTO, ej. "Samsung Galaxy S23 (posible) · SM-S911B · Android 14 · Chrome 141"
  pantalla:  ["Pantalla"]  // TEXTO, ej. "393x852 @3x · visible 393x659 · 100dvh = 659px (barras visibles 659 / ocultas 739)"
};

// ===================== TABLAS DE APOYO =====================

// iPhone: Apple no comparte el modelo. Se adivina la familia por el tamaño de pantalla (puntos) y densidad.
var IPHONES = {
  "320x568@2": "SE (1ª gen) / 5s",
  "375x667@2": "SE (2ª o 3ª gen) / 6 / 7 / 8",
  "414x736@3": "6 Plus / 7 Plus / 8 Plus",
  "375x812@3": "X / XS / 11 Pro / 12 mini / 13 mini",
  "414x896@2": "XR / 11",
  "414x896@3": "XS Max / 11 Pro Max",
  "390x844@3": "12 / 12 Pro / 13 / 13 Pro / 14 / 16e",
  "428x926@3": "12 Pro Max / 13 Pro Max / 14 Plus",
  "393x852@3": "14 Pro / 15 / 15 Pro / 16",
  "430x932@3": "14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus",
  "402x874@3": "16 Pro / 17 / 17 Pro",
  "440x956@3": "16 Pro Max / 17 Pro Max"
};

// Samsung: el navegador da un código (ej. SM-S911B). Primeras letras/números → nombre comercial.
var SAMSUNG = {
  S901:"Galaxy S22", S906:"Galaxy S22+", S908:"Galaxy S22 Ultra",
  S911:"Galaxy S23", S916:"Galaxy S23+", S918:"Galaxy S23 Ultra", S711:"Galaxy S23 FE",
  S921:"Galaxy S24", S926:"Galaxy S24+", S928:"Galaxy S24 Ultra", S721:"Galaxy S24 FE",
  S931:"Galaxy S25", S936:"Galaxy S25+", S938:"Galaxy S25 Ultra", S937:"Galaxy S25 Edge",
  G991:"Galaxy S21", G996:"Galaxy S21+", G998:"Galaxy S21 Ultra", G990:"Galaxy S21 FE",
  G980:"Galaxy S20", G981:"Galaxy S20", G985:"Galaxy S20+", G986:"Galaxy S20+", G988:"Galaxy S20 Ultra",
  G780:"Galaxy S20 FE", G781:"Galaxy S20 FE", N981:"Galaxy Note20", N986:"Galaxy Note20 Ultra",
  A135:"Galaxy A13", A137:"Galaxy A13", A145:"Galaxy A14", A146:"Galaxy A14", A155:"Galaxy A15", A156:"Galaxy A15",
  A165:"Galaxy A16", A166:"Galaxy A16", A235:"Galaxy A23", A245:"Galaxy A24", A256:"Galaxy A25", A266:"Galaxy A26",
  A325:"Galaxy A32", A326:"Galaxy A32", A336:"Galaxy A33", A346:"Galaxy A34", A356:"Galaxy A35", A366:"Galaxy A36",
  A515:"Galaxy A51", A516:"Galaxy A51", A525:"Galaxy A52", A526:"Galaxy A52", A528:"Galaxy A52s",
  A536:"Galaxy A53", A546:"Galaxy A54", A556:"Galaxy A55", A566:"Galaxy A56",
  A715:"Galaxy A71", A725:"Galaxy A72", A045:"Galaxy A04", A047:"Galaxy A04s", A055:"Galaxy A05", A057:"Galaxy A05s",
  F936:"Galaxy Z Fold4", F946:"Galaxy Z Fold5", F956:"Galaxy Z Fold6",
  F721:"Galaxy Z Flip4", F731:"Galaxy Z Flip5", F741:"Galaxy Z Flip6"
};

// ===================== DETECCIÓN =====================

function medir(id) { var el = document.getElementById(id); var h = el ? el.getBoundingClientRect().height : 0; return h > 1 ? Math.round(h) : null; }

// Pide al navegador los datos "de alta precisión" (Chrome, Edge, Samsung Internet). Safari y Firefox no los dan.
function datosPrecisos() {
  if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) return Promise.resolve(null);
  var pedido = navigator.userAgentData.getHighEntropyValues(["model", "platformVersion", "fullVersionList"]).catch(function () { return null; });
  var limite = new Promise(function (r) { setTimeout(function () { r(null); }, 600); });
  return Promise.race([pedido, limite]);
}

function nombreSamsung(codigo) {
  var m = /^SM-([A-Z]\d{3})/i.exec(codigo || "");
  return m && SAMSUNG[m[1].toUpperCase()] ? "Samsung " + SAMSUNG[m[1].toUpperCase()] + " (posible)" : "";
}

function detectar(hints) {
  var ua = navigator.userAgent || "";
  var touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPad (o iPhone en "versión de escritorio")
  var m;

  // --- Navegador ---
  var navegador = "", navNombre = "", navVer = "";
  if ((m = ua.match(/(?:EdgA|EdgiOS|Edg)\/(\d+)/))) { navegador = navNombre = "Edge"; navVer = m[1]; }
  else if ((m = ua.match(/(?:FxiOS|Firefox)\/(\d+)/))) { navegador = navNombre = "Firefox"; navVer = m[1]; }
  else if (navigator.brave) { navegador = navNombre = "Brave"; m = ua.match(/Chrome\/(\d+)/); if (m) navVer = m[1]; }
  else if ((m = ua.match(/OPR\/(\d+)|OPiOS\/(\d+)/))) { navNombre = "Opera"; navVer = m[1] || m[2]; }
  else if ((m = ua.match(/DuckDuckGo\/(\d+)|Ddg\/(\d+)/))) { navNombre = "DuckDuckGo"; navVer = m[1] || m[2]; }
  else if ((m = ua.match(/SamsungBrowser\/(\d+)/))) { navegador = "Samsung Browser"; navNombre = "Samsung Internet"; navVer = m[1]; }
  else if ((m = ua.match(/(?:CriOS|Chrome)\/(\d+)/))) { navegador = navNombre = "Chrome"; navVer = m[1]; }
  else if (/Safari/.test(ua)) { navegador = navNombre = "Safari"; m = ua.match(/Version\/(\d+(?:\.\d+)?)/); if (m) navVer = m[1]; }
  var interno = "";
  if (/Instagram/.test(ua)) interno = "Instagram";
  else if (/FBAN|FBAV|FB_IAB/.test(ua)) interno = "Facebook";
  else if (/WhatsApp/.test(ua)) interno = "WhatsApp";
  else if (/TikTok|musical_ly|BytedanceWebview/.test(ua)) interno = "TikTok";
  if (interno) { navegador = ""; navNombre = interno + " (navegador interno)"; }
  // Lo que no esté en las opciones del form (Opera, navegadores internos, desconocidos) va como "Other";
  // el nombre real queda en el campo Modelo.
  if (!navegador) navegador = "Other";

  // --- Sistema y versión ---
  var sistema = "", sistemaVer = "";
  var esIOS = /iPhone|iPad|iPod/.test(ua) || touchMac;
  if (esIOS) {
    sistema = "IOS";
    m = ua.match(/OS (\d+)[_.](\d+)/); if (m) sistemaVer = m[1] + "." + m[2];
    // Desde iOS 26, Safari deja fija la versión del sistema en 18.x; la real es la versión de Safari.
    var safariVer = (ua.match(/Version\/(\d+)/) || [])[1];
    if (navNombre === "Safari" && safariVer && +safariVer >= 26) sistemaVer = navVer;
    if (touchMac && !sistemaVer) sistemaVer = navVer;
  } else if (/Android/.test(ua)) {
    sistema = "Android";
    m = ua.match(/Android (\d+(?:\.\d+)?)/); if (m) sistemaVer = m[1];
    if (hints && hints.platformVersion) sistemaVer = hints.platformVersion.split(".")[0]; // Chrome dice siempre "10"; esta es la real
    else if (/Chrome\//.test(ua) && sistemaVer === "10") sistemaVer = "";               // "10" de Chrome no es confiable
  } else if (/Windows/.test(ua)) {
    sistema = "Windows";
    if (hints && hints.platformVersion) sistemaVer = (+hints.platformVersion.split(".")[0] >= 13) ? "11" : "10";
  } else if (/Mac OS X|Macintosh/.test(ua)) {
    sistema = "Mac";
  }
  if (hints && hints.fullVersionList && navNombre) {
    hints.fullVersionList.forEach(function (b) {
      if ((navNombre === "Chrome" && b.brand === "Google Chrome") || (navNombre === "Edge" && b.brand === "Microsoft Edge") ||
          (navNombre === "Samsung Internet" && /Samsung/.test(b.brand))) navVer = b.version.split(".")[0];
    });
  }

  // --- Dispositivo y modelo ---
  var esMovil = /Mobi|Android|iPhone|iPad|iPod/.test(ua) || touchMac;
  var dispositivo = esMovil ? "Mobile" : "Desktop";
  var dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
  var sw = Math.min(screen.width, screen.height), sh = Math.max(screen.width, screen.height); // vertical
  var modelo = "";
  if (esIOS) {
    var esIPad = /iPad/.test(ua) || (touchMac && sw >= 700);
    if (esIPad) modelo = "iPad";
    else {
      var fam = IPHONES[sw + "x" + sh + "@" + dpr];
      modelo = fam ? "iPhone (posible: " + fam + ")" : "iPhone";
    }
  } else if (sistema === "Android") {
    var cod = (hints && hints.model) || "";
    if (!cod) { m = ua.match(/Android [^;]*; ([^;)]+?)(?: Build|\))/); if (m && m[1] !== "K") cod = m[1].replace(/^SAMSUNG\s+/i, "").trim(); }
    if (cod) modelo = nombreSamsung(cod) ? nombreSamsung(cod) + " · " + cod : cod;
    else modelo = "Android (modelo no disponible en " + (navNombre || "este navegador") + ")";
  } else {
    modelo = "Desktop";
  }

  var textoModelo = [modelo,
                     sistema ? (sistema === "IOS" ? "iOS" : sistema) + (sistemaVer ? " " + sistemaVer : "") : "",
                     (navNombre || "Navegador desconocido") + (navVer ? " " + navVer : "")]
                    .filter(Boolean).join(" · ");

  // --- Pantalla y ventana (dvh) ---
  var dvh = medir("m-dvh"), svh = medir("m-svh"), lvh = medir("m-lvh");
  var de = document.documentElement || {};
  var vw = window.innerWidth || de.clientWidth || screen.width, vh = window.innerHeight || de.clientHeight || screen.height;
  var textoPantalla = esMovil
    ? screen.width + "x" + screen.height + " @" + dpr + "x" +
      " · visible " + vw + "x" + (dvh || vh) +
      (dvh ? " · 100dvh = " + dvh + "px (barras visibles " + svh + " / ocultas " + lvh + ")" : " · (este navegador no soporta dvh)")
    : vw + "x" + vh + " (área visible del navegador)";

  return { dispositivo: dispositivo, sistema: sistema, navegador: navegador, modelo: textoModelo, pantalla: textoPantalla,
           ua: ua, hints: hints };
}

function armarLink(base, d) {
  var params = [];
  function add(nombres, valor) {
    if (!valor) return;
    [].concat(nombres || []).forEach(function (nombre) {
      if (nombre) params.push(encodeURIComponent(nombre) + "=" + encodeURIComponent(valor));
    });
  }
  add(CAMPOS.dispositivo, d.dispositivo);
  add(CAMPOS.navegador, d.navegador);
  add(CAMPOS.sistema, d.sistema);
  add(CAMPOS.modelo, d.modelo);
  add(CAMPOS.pantalla, d.pantalla);
  return params.length ? base + (base.indexOf("?") === -1 ? "?" : "&") + params.join("&") : base;
}

function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
function fila(k, v, campo) {
  var nombres = [].concat(campo || []).filter(Boolean);
  var destino = campo === undefined ? "" : (nombres.length ? "<br><code>→ " + esc(nombres.join("  ó  ")) + "</code>" : "<br><code>→ (sin campo en el form todavía)</code>");
  return "<tr><td>" + esc(k) + "</td><td>" + esc(v || "(no detectado)") + destino + "</td></tr>";
}

// Agrega a la página los elementos ocultos que miden la altura real de la ventana (dvh / svh / lvh).
(function () {
  ["dvh", "svh", "lvh"].forEach(function (u) {
    var d = document.createElement("div");
    d.className = "medida"; d.id = "m-" + u; d.style.height = "100" + u;
    document.body.appendChild(d);
  });
})();

(function () {
  var q = new URLSearchParams(location.search);
  var cfg = window.REPORTE || {};
  var marca = cfg.marca || "";
  var base = cfg.form || "";
  var card = document.getElementById("card");

  if (!base) {
    card.innerHTML = "<h1>No encontramos tu formulario</h1><p>Este link no tiene una marca válida. Pide a tu contacto de Unmade el link correcto.</p>";
    return;
  }

  datosPrecisos().then(function (hints) {
    var d = detectar(hints);
    var destino = armarLink(base, d);

    if (q.get("debug") !== "1") { location.replace(destino); return; }

    card.innerHTML =
      "<h1>Modo prueba (no redirige)</h1>" +
      "<p>Esto es lo que la página detectó y en qué campo del form de ClickUp quedaría.</p>" +
      "<table>" +
      fila("Marca", marca) +
      fila("Dispositivo", d.dispositivo, CAMPOS.dispositivo) +
      fila("Sistema", d.sistema, CAMPOS.sistema) +
      fila("Navegador", d.navegador || "(no está en las opciones del form)", CAMPOS.navegador) +
      fila("Modelo", d.modelo, CAMPOS.modelo) +
      fila("Pantalla", d.pantalla, CAMPOS.pantalla) +
      "</table>" +
      "<h2>Datos crudos</h2>" +
      "<p><code>" + esc(d.ua) + "</code></p>" +
      (d.hints ? "<p><code>" + esc(JSON.stringify({ model: d.hints.model, platformVersion: d.hints.platformVersion })) + "</code></p>" : "<p><code>(este navegador no da datos de alta precisión)</code></p>") +
      "<h2>Link al form</h2>" +
      "<p><code>" + esc(destino) + "</code></p>" +
      "<a class='btn' href='" + esc(destino) + "'>Abrir el form</a>";
  });
})();
