// ─────────────────────────────
// IRISVIEW JS — inmobiliarias + tabs + clustering
// ─────────────────────────────

const CDN = "https://static.irisaerealservices.com";

// ─────────────────────────────
// INTRO
// ─────────────────────────────

const introOverlay = document.getElementById('introOverlay');
const enterBtn     = document.getElementById('enterBtn');

if (introOverlay && enterBtn) {
  enterBtn.addEventListener('click', () => {
    introOverlay.classList.add('hidden');
  });
}

// ─────────────────────────────
// SIDEBAR
// ─────────────────────────────

const sidebar        = document.getElementById('sidebar');
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarOpenBtn = document.getElementById('sidebarOpenBtn');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.add('closed');
  sidebarOpenBtn.classList.add('visible');
});
sidebarOpenBtn.addEventListener('click', () => {
  sidebar.classList.remove('closed');
  sidebarOpenBtn.classList.remove('visible');
});

// ─────────────────────────────
// TABS
// ─────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
    tab.classList.add('tab--active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-panel--active'));
    document.getElementById(`panel${capitalizar(tab.dataset.tab)}`).classList.add('tab-panel--active');
  });
});

function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────
// MAPA
// ─────────────────────────────

const map = L.map('map', {
  zoomControl: true,
  maxZoom: 23
}).setView([20.97, -89.62], 12);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles © Esri',
    maxNativeZoom: 19,
    maxZoom: 23
  }
).addTo(map);

// ─────────────────────────────
// VARIABLES
// ─────────────────────────────

let geojsonLayer;
let markersLayer     = L.layerGroup().addTo(map);
let propiedadesData  = [];
let inmobiliariasData = {};

const listTodos        = document.getElementById('listTodos');
const listDesarrollos  = document.getElementById('listDesarrollos');
const listIndividuales = document.getElementById('listIndividuales');
const countTodos        = document.getElementById('countTodos');
const countDesarrollos  = document.getElementById('countDesarrollos');
const countIndividuales = document.getElementById('countIndividuales');
const chipsInmobiliaria = document.getElementById('chipsInmobiliaria');

let filtroTipo  = 'todos';
let filtroInmo  = 'todas';

const filtroDestacado  = document.getElementById('filtroDestacado');
const filtroPrecio     = document.getElementById('filtroPrecio');
const filtroSuperficie = document.getElementById('filtroSuperficie');
const precioLabel      = document.getElementById('precioLabel');
const superficieLabel  = document.getElementById('superficieLabel');
const btnLimpiar       = document.getElementById('btnLimpiar');

// ─────────────────────────────
// LISTENERS FILTROS
// ─────────────────────────────

filtroPrecio.addEventListener('input', () => {
  precioLabel.textContent = `$${Number(filtroPrecio.value).toLocaleString()}`;
  renderizarPropiedades();
});

filtroSuperficie.addEventListener('input', () => {
  superficieLabel.textContent = filtroSuperficie.value;
  renderizarPropiedades();
});

filtroDestacado.addEventListener('change', () => renderizarPropiedades());

// chips tipo
document.querySelectorAll('[data-filter="tipo"]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('[data-filter="tipo"]').forEach(c => c.classList.remove('chip--active'));
    chip.classList.add('chip--active');
    filtroTipo = chip.dataset.value;
    renderizarPropiedades();
  });
});

btnLimpiar.addEventListener('click', () => {
  filtroTipo = 'todos';
  filtroInmo = 'todas';
  filtroDestacado.checked     = false;
  filtroPrecio.value          = 5000000;
  filtroSuperficie.value      = 0;
  precioLabel.textContent     = '$5,000,000';
  superficieLabel.textContent = '0';
  document.querySelectorAll('[data-filter="tipo"]').forEach(c => c.classList.remove('chip--active'));
  document.querySelector('[data-value="todos"]').classList.add('chip--active');
  document.querySelectorAll('[data-filter="inmo"]').forEach(c => c.classList.remove('chip--active'));
  document.querySelector('[data-value="todas"]').classList.add('chip--active');
  renderizarPropiedades();
});

// ─────────────────────────────
// CARGAR DATOS
// ─────────────────────────────

Promise.all([
  fetch('irisview/data/propiedades.geojson').then(r => r.json()),
  fetch('irisview/data/inmobiliarias.json').then(r => r.json())
])
.then(([geojson, inmos]) => {
  propiedadesData   = geojson.features;
  inmobiliariasData = inmos;
  poblarChipsInmobiliaria();
  renderizarPropiedades();
});

// ─────────────────────────────
// POBLAR CHIPS INMOBILIARIA
// ─────────────────────────────

function poblarChipsInmobiliaria() {
  // obtener ids únicos de inmobiliarias presentes en el geojson
  const ids = [...new Set(
    propiedadesData
      .map(f => f.properties.inmobiliaria)
      .filter(Boolean)
  )];

  ids.forEach(id => {
    const inmo = inmobiliariasData[id];
    if (!inmo) return;

    const chip = document.createElement('button');
    chip.className    = 'chip chip--inmo';
    chip.dataset.filter = 'inmo';
    chip.dataset.value  = id;

    chip.innerHTML = `
      <img src="${CDN}/irisview/assets/inmobiliarias/${inmo.folder}/${inmo.logo}"
           class="chip-logo" alt="${inmo.nombre}">
      ${inmo.nombre}
    `;

    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter="inmo"]').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      filtroInmo = id;
      renderizarPropiedades();
    });

    chipsInmobiliaria.appendChild(chip);
  });
}

// ─────────────────────────────
// HELPERS
// ─────────────────────────────

function agruparPorDesarrollo(features) {
  return features.reduce((acc, f) => {
    const nombre = f.properties.desarrollo;
    if (!acc[nombre]) acc[nombre] = [];
    acc[nombre].push(f);
    return acc;
  }, {});
}

function calcularCentroide(features) {
  let latSum = 0, lngSum = 0, count = 0;
  features.forEach(f => {
    f.geometry.coordinates[0].forEach(([lng, lat]) => {
      latSum += lat; lngSum += lng; count++;
    });
  });
  return L.latLng(latSum / count, lngSum / count);
}

function rangoPrecio(features) {
  const precios = features.map(f => Number(f.properties.precio));
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  return min === max
    ? `$${min.toLocaleString()}`
    : `$${min.toLocaleString()} — $${max.toLocaleString()}`;
}

function buscarLayer(feature) {
  let found = null;
  geojsonLayer.eachLayer(l => { if (l.feature === feature) found = l; });
  return found;
}

// ─────────────────────────────
// HTML DEL BLOQUE INMOBILIARIA
// para el popup
// ─────────────────────────────

function htmlInmobiliaria(p) {
  if (!p.inmobiliaria) return '';
  const inmo = inmobiliariasData[p.inmobiliaria];
  if (!inmo) return '';

  return `
    <div class="popup-inmobiliaria">
      <img src="${CDN}/irisview/assets/inmobiliarias/${inmo.folder}/${inmo.logo}"
           class="popup-inmo-logo" alt="${inmo.nombre}">
      <span class="popup-inmo-nombre">${inmo.nombre}</span>
    </div>
  `;
}

// ─────────────────────────────
// RENDERIZAR
// ─────────────────────────────

function renderizarPropiedades() {

  if (geojsonLayer) map.removeLayer(geojsonLayer);
  markersLayer.clearLayers();
  listTodos.innerHTML        = '';
  listDesarrollos.innerHTML  = '';
  listIndividuales.innerHTML = '';

  const filtradas = propiedadesData.filter(f => {
    const p = f.properties;
    const noVendido        = String(p.vendido).toLowerCase() !== 'si';
    const cumpleTipo       = filtroTipo === 'todos' || p.tipo === filtroTipo;
    const cumpleInmo       = filtroInmo === 'todas' || p.inmobiliaria === filtroInmo;
    const cumpleDestacado  = !filtroDestacado.checked || String(p.destacado).toLowerCase() === 'si';
    const cumplePrecio     = Number(p.precio) <= Number(filtroPrecio.value);
    const cumpleSuperficie = Number(p.superficie_m2) >= Number(filtroSuperficie.value);
    return noVendido && cumpleTipo && cumpleInmo && cumpleDestacado && cumplePrecio && cumpleSuperficie;
  });

  const individuales  = filtradas.filter(f => !f.properties.desarrollo);
  const conDesarrollo = filtradas.filter(f =>  f.properties.desarrollo);
  const porDesarrollo = agruparPorDesarrollo(conDesarrollo);

  countTodos.textContent        = filtradas.length;
  countDesarrollos.textContent  = Object.keys(porDesarrollo).length;
  countIndividuales.textContent = individuales.length;

  // ── POLÍGONOS ──
  geojsonLayer = L.geoJSON(filtradas, {

    style: f => ({
      color:       f.properties.desarrollo ? '#6ab0ff' : '#00ffbb',
      weight:      2.5,
      fillColor:   f.properties.desarrollo ? '#0057b8' : '#00c896',
      fillOpacity: 0.2
    }),

    onEachFeature(feature, layer) {
      const p       = feature.properties;
      const preview = `${CDN}/irisview/assets/propiedades/${p.folder}/${p.preview}`;

      const popup = `
        <div class="popup-card">
          <img src="${preview}" class="popup-img">
          <div class="popup-content">
            <div class="popup-type">${p.tipo.toUpperCase()}</div>
            <h3>${p.titulo}</h3>
            <div class="popup-price">$${Number(p.precio).toLocaleString()} MXN</div>
            <p class="popup-desc">${p.descripcion}</p>
            <div class="popup-meta">
              <span>📐 ${p.superficie_m2} m²</span>
              ${p.tipo === 'casa' ? `<span>🛏 ${p.recamaras}</span>` : ''}
              ${p.tipo === 'casa' ? `<span>🛁 ${p.banos}</span>`    : ''}
            </div>
            ${htmlInmobiliaria(p)}
            <a href="/irisview/propiedad.html?id=${p.id}" class="popup-btn">Ver propiedad</a>
          </div>
        </div>
      `;

      layer.bindPopup(popup);
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.45, weight: 3 }));
      layer.on('mouseout',  () => geojsonLayer.resetStyle(layer));
    }

  }).addTo(map);

  // ── MARKERS + CARDS INDIVIDUALES ──
  individuales.forEach(feature => {
    const p     = feature.properties;
    const layer = buscarLayer(feature);
    if (!layer) return;

    const center = layer.getBounds().getCenter();

    const marker = L.marker(center, {
      esDesarrollo: false,
      icon: L.divIcon({
        className: 'price-icon',
        html: `<div class="price-marker">$${Number(p.precio).toLocaleString()}</div>`,
        iconSize:   [130, 40],
        iconAnchor: [65, 20]
      })
    });

    marker.on('click', () => {
      map.fitBounds(layer.getBounds(), { padding: [60, 60] });
      layer.openPopup();
    });

    markersLayer.addLayer(marker);

    listTodos.appendChild(crearCardIndividual(p, layer));
    listIndividuales.appendChild(crearCardIndividual(p, layer));
  });

  // ── MARKERS + CARDS DESARROLLOS ──
  Object.entries(porDesarrollo).forEach(([nombre, features]) => {
    const centroide = calcularCentroide(features);
    const rango     = rangoPrecio(features);
    const lotes     = features.length;

    const marker = L.marker(centroide, {
      esDesarrollo: true,
      icon: L.divIcon({
        className: 'price-icon',
        html: `
          <div class="price-marker desarrollo-marker">
            <strong>${nombre}</strong>
            <span>${lotes} lote${lotes > 1 ? 's' : ''} · ${rango}</span>
          </div>
        `,
        iconSize:   [180, 54],
        iconAnchor: [90, 27]
      })
    });

    marker.on('click', () => {
      const bounds = L.featureGroup(features.map(f => L.geoJSON(f))).getBounds();
      map.fitBounds(bounds, { padding: [60, 60] });
    });

    markersLayer.addLayer(marker);

    listTodos.appendChild(crearCardDesarrollo(nombre, features));
    listDesarrollos.appendChild(crearCardDesarrollo(nombre, features));
  });

  if (filtradas.length > 0) {
    map.fitBounds(geojsonLayer.getBounds(), { padding: [50, 50] });
  }

  controlarMarkers();
}

// ─────────────────────────────
// CARDS
// ─────────────────────────────

function crearCardIndividual(p, layer) {
  const preview = `${CDN}/irisview/assets/propiedades/${p.folder}/${p.preview}`;
  const inmo    = p.inmobiliaria ? inmobiliariasData[p.inmobiliaria] : null;

  const card = document.createElement('div');
  card.className = 'prop-card';
  if (String(p.destacado).toLowerCase() === 'si') card.classList.add('destacado');

  card.innerHTML = `
    <img src="${preview}" class="prop-card-img">
    <div class="prop-card-body">
      <div class="prop-card-tipo">
        <span>${p.tipo}</span>
        ${String(p.destacado).toLowerCase() === 'si' ? '<span class="badge-dest">DESTACADO</span>' : ''}
      </div>
      <div class="prop-card-titulo">${p.titulo}</div>
      <div class="prop-card-precio">$${Number(p.precio).toLocaleString()} MXN</div>
      <div class="prop-card-meta">
        <span>${p.superficie_m2} m²</span>
        ${p.tipo === 'casa' ? `<span>${p.recamaras} rec</span>` : ''}
      </div>
      ${inmo ? `
        <div class="card-inmo">
          <img src="${CDN}/irisview/assets/inmobiliarias/${inmo.folder}/${inmo.logo}"
               class="card-inmo-logo" alt="${inmo.nombre}">
          <span>${inmo.nombre}</span>
        </div>
      ` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    map.fitBounds(layer.getBounds(), { padding: [60, 60] });
    layer.openPopup();
  });

  return card;
}

function crearCardDesarrollo(nombre, features) {
  const rango   = rangoPrecio(features);
  const totalM2 = features.reduce((s, f) => s + Number(f.properties.superficie_m2), 0);
  const lotes   = features.length;

  // inmobiliaria del desarrollo (tomar del primer feature)
  const inmoId = features[0]?.properties?.inmobiliaria;
  const inmo   = inmoId ? inmobiliariasData[inmoId] : null;

  const card = document.createElement('div');
  card.className = 'prop-card prop-card--desarrollo';

  card.innerHTML = `
    <div class="prop-card-body">
      <div class="prop-card-tipo">
        <span>DESARROLLO</span>
        <span class="badge-dest badge-azul">${lotes} lotes</span>
      </div>
      <div class="prop-card-titulo">${nombre}</div>
      <div class="prop-card-precio">${rango} MXN</div>
      <div class="prop-card-meta">
        <span>${totalM2.toLocaleString()} m² totales</span>
      </div>
      ${inmo ? `
        <div class="card-inmo">
          <img src="${CDN}/irisview/assets/inmobiliarias/${inmo.folder}/${inmo.logo}"
               class="card-inmo-logo" alt="${inmo.nombre}">
          <span>${inmo.nombre}</span>
        </div>
      ` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    const bounds = L.featureGroup(features.map(f => L.geoJSON(f))).getBounds();
    map.fitBounds(bounds, { padding: [60, 60] });
  });

  return card;
}

// ─────────────────────────────
// CONTROLAR MARKERS ZOOM
// ─────────────────────────────

function controlarMarkers() {
  const zoom = map.getZoom();
  markersLayer.eachLayer(marker => {
    const el = marker.getElement();
    if (!el) return;
    el.style.display = marker.options.esDesarrollo
      ? (zoom <= 15 ? 'block' : 'none')
      : (zoom >= 19 ? 'none'  : 'block');
  });
}

map.on('zoomend', controlarMarkers);