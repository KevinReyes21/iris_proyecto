// ─────────────────────────────
// IRISVIEW JS COMPLETO
// ─────────────────────────────

// ─────────────────────────────
// INTRO OVERLAY
// ─────────────────────────────

const introOverlay = document.getElementById('introOverlay');
const enterBtn = document.getElementById('enterBtn');

if (introOverlay && enterBtn) {

  enterBtn.addEventListener('click', () => {

    introOverlay.classList.add('hidden');

  });

}

// ─────────────────────────────
// SIDEBAR
// ─────────────────────────────

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
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
// MAPA
// ─────────────────────────────

const map = L.map('map', {
  zoomControl: true
}).setView([20.97, -89.62], 12);

// ─────────────────────────────
// MAPA SATELITAL GRATIS
// ESRI WORLD IMAGERY
// ─────────────────────────────

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles © Esri'
  }
).addTo(map);

// ─────────────────────────────
// VARIABLES
// ─────────────────────────────

let geojsonLayer;
let markersLayer = L.layerGroup().addTo(map);

let propiedadesData = [];

const propsList = document.getElementById('propsList');
const contadorProps = document.getElementById('contadorProps');

// filtros

let filtroTipo = 'todos';

const filtroDestacado = document.getElementById('filtroDestacado');

const filtroPrecio = document.getElementById('filtroPrecio');

const filtroSuperficie = document.getElementById('filtroSuperficie');

const precioLabel = document.getElementById('precioLabel');

const superficieLabel = document.getElementById('superficieLabel');

const btnLimpiar = document.getElementById('btnLimpiar');

// ─────────────────────────────
// LABELS RANGE
// ─────────────────────────────

filtroPrecio.addEventListener('input', () => {

  precioLabel.textContent =
    `$${Number(filtroPrecio.value).toLocaleString()}`;

  renderizarPropiedades();

});

filtroSuperficie.addEventListener('input', () => {

  superficieLabel.textContent =
    filtroSuperficie.value;

  renderizarPropiedades();

});

filtroDestacado.addEventListener('change', () => {

  renderizarPropiedades();

});

// ─────────────────────────────
// CHIPS
// ─────────────────────────────

document.querySelectorAll('.chip').forEach(chip => {

  chip.addEventListener('click', () => {

    document.querySelectorAll('.chip')
      .forEach(c => c.classList.remove('chip--active'));

    chip.classList.add('chip--active');

    filtroTipo = chip.dataset.value;

    renderizarPropiedades();

  });

});

// ─────────────────────────────
// LIMPIAR FILTROS
// ─────────────────────────────

btnLimpiar.addEventListener('click', () => {

  filtroTipo = 'todos';

  filtroDestacado.checked = false;

  filtroPrecio.value = 5000000;

  filtroSuperficie.value = 0;

  precioLabel.textContent = '$5,000,000';

  superficieLabel.textContent = '0';

  document.querySelectorAll('.chip')
    .forEach(c => c.classList.remove('chip--active'));

  document.querySelector('[data-value="todos"]')
    .classList.add('chip--active');

  renderizarPropiedades();

});

// ─────────────────────────────
// CARGAR GEOJSON
// ─────────────────────────────

fetch('irisview/data/propiedades.geojson')

  .then(res => res.json())

  .then(data => {

    propiedadesData = data.features;

    renderizarPropiedades();

  });

// ─────────────────────────────
// RENDERIZAR
// ─────────────────────────────

function renderizarPropiedades() {

  // limpiar capas

  if (geojsonLayer) {

    map.removeLayer(geojsonLayer);

  }

  markersLayer.clearLayers();

  propsList.innerHTML = '';

  // filtros

  const filtradas = propiedadesData.filter(feature => {

    const p = feature.properties;

    // tipo

    const cumpleTipo =
      filtroTipo === 'todos'
      || p.tipo === filtroTipo;

    // destacado (SI / NO)

    const cumpleDestacado =
      !filtroDestacado.checked
      || String(p.destacado).toLowerCase() === 'si';

    // precio

    const cumplePrecio =
      Number(p.precio) <= Number(filtroPrecio.value);

    // superficie

    const cumpleSuperficie =
      Number(p.superficie_m2)
      >= Number(filtroSuperficie.value);

    return (
      cumpleTipo
      && cumpleDestacado
      && cumplePrecio
      && cumpleSuperficie
    );

  });

  contadorProps.textContent = filtradas.length;

  // ─────────────────────────────
  // GEOJSON
  // ─────────────────────────────

  geojsonLayer = L.geoJSON(filtradas, {

    style: function(feature) {

      return {

        color: '#00ffbb',

        weight: 3,

        fillColor: '#00c896',

        fillOpacity: 0.18

      };

    },

    onEachFeature: function(feature, layer) {

      const p = feature.properties;

      const preview =
        `/irisview/assets/propiedades/${p.folder}/${p.preview}`;

      // ─────────────────────────────
      // POPUP
      // ─────────────────────────────

      const popup = `
        <div class="popup-card">

          <img src="${preview}" class="popup-img">

          <div class="popup-content">

            <div class="popup-type">
              ${p.tipo.toUpperCase()}
            </div>

            <h3>${p.titulo}</h3>

            <div class="popup-price">
              $${Number(p.precio).toLocaleString()} MXN
            </div>

            <p class="popup-desc">
              ${p.descripcion}
            </p>

            <div class="popup-meta">

              <span>📐 ${p.superficie_m2} m²</span>

              ${
                p.tipo === 'casa'
                ? `<span>🛏 ${p.recamaras}</span>`
                : ''
              }

              ${
                p.tipo === 'casa'
                ? `<span>🛁 ${p.banos}</span>`
                : ''
              }

            </div>

            <a
              href="/irisview/propiedad.html?id=${p.id}"
              class="popup-btn"
            >
              Ver propiedad
            </a>

          </div>

        </div>
      `;

      layer.bindPopup(popup);

      // ─────────────────────────────
      // PRICE MARKER
      // ─────────────────────────────

      const center = layer.getBounds().getCenter();

      const markerHTML = `
        <div class="price-marker">
          $${Number(p.precio).toLocaleString()}
        </div>
      `;

      const marker = L.marker(center, {

        icon: L.divIcon({

          className: 'price-icon',

          html: markerHTML,

          iconSize: [120, 40],

          iconAnchor: [60, 20]

        })

      });

      markersLayer.addLayer(marker);

      // click marker

      marker.on('click', () => {

        map.fitBounds(layer.getBounds(), {
          padding: [60, 60]
        });

        layer.openPopup();

      });

      // ─────────────────────────────
      // LISTA SIDEBAR
      // ─────────────────────────────

      const card = document.createElement('div');

      card.className = 'prop-card';

      if (String(p.destacado).toLowerCase() === 'si') {

        card.classList.add('destacado');

      }

      card.innerHTML = `
        <img
          src="${preview}"
          class="prop-card-img"
        >

        <div class="prop-card-body">

          <div class="prop-card-tipo">

            <span>${p.tipo}</span>

            ${
              String(p.destacado).toLowerCase() === 'si'
              ? '<span class="badge-dest">DESTACADO</span>'
              : ''
            }

          </div>

          <div class="prop-card-titulo">
            ${p.titulo}
          </div>

          <div class="prop-card-precio">
            $${Number(p.precio).toLocaleString()} MXN
          </div>

          <div class="prop-card-meta">

            <span>${p.superficie_m2} m²</span>

            ${
              p.tipo === 'casa'
              ? `<span>${p.recamaras} rec</span>`
              : ''
            }

          </div>

        </div>
      `;

      // click card

      card.addEventListener('click', () => {

        map.fitBounds(layer.getBounds(), {
          padding: [60, 60]
        });

        layer.openPopup();

      });

      propsList.appendChild(card);

    }

  }).addTo(map);

  // ─────────────────────────────
  // AJUSTAR VISTA
  // ─────────────────────────────

  if (filtradas.length > 0) {

    map.fitBounds(geojsonLayer.getBounds(), {
      padding: [50, 50]
    });

  }

  // ─────────────────────────────
  // MOSTRAR / OCULTAR MARKERS
  // ─────────────────────────────

  controlarMarkers();

}

// ─────────────────────────────
// CONTROLAR MARKERS SEGÚN ZOOM
// ─────────────────────────────

function controlarMarkers() {

  const zoom = map.getZoom();

  if (zoom >= 17) {

    markersLayer.eachLayer(marker => {

      marker.getElement()?.style.setProperty(
        'display',
        'none'
      );

    });

  } else {

    markersLayer.eachLayer(marker => {

      marker.getElement()?.style.setProperty(
        'display',
        'block'
      );

    });

  }

}

map.on('zoomend', controlarMarkers);