// ─────────────────────────────
// MAPA BASE
// ─────────────────────────────

const map = L.map('map', {
  zoomControl: true
}).setView([20.97, -89.62], 12);

// ─────────────────────────────
// CAPA BASE OPENSTREETMAP
// ─────────────────────────────

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ─────────────────────────────
// CARGAR GEOJSON
// ─────────────────────────────

fetch('irisview/data/propiedades.geojson')
  .then(res => res.json())
  .then(data => {

    const propiedades = L.geoJSON(data, {

      style: function(feature) {
        return {
          color: '#00c896',
          weight: 2,
          fillColor: '#00c896',
          fillOpacity: 0.15
        };
      },

      onEachFeature: function(feature, layer) {

        const p = feature.properties;

        const preview = `/irisview/assets/propiedades/${p.folder}/${p.preview}`;

        const popup = `
          <div class="popup-card">

            <img src="${preview}" class="popup-img">

            <div class="popup-content">

              <div class="popup-type">
                ${p.tipo.toUpperCase()}
              </div>

              <h3>${p.titulo}</h3>

              <div class="popup-price">
                $${Number(p.precio).toLocaleString()} ${p.moneda}
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

      }

    }).addTo(map);

    map.fitBounds(propiedades.getBounds());

  });