const params = new URLSearchParams(window.location.search);
const propiedadID = params.get('id');

console.log('ID recibido:', propiedadID);

fetch('/irisview/data/propiedades.geojson')
  .then(res => res.json())
  .then(data => {

    const propiedad = data.features.find(
      f => f.properties.id === propiedadID
    );

    console.log('Propiedad encontrada:', propiedad);

    if (!propiedad) {
      document.getElementById('titulo').textContent =
        'Propiedad no encontrada';
      return;
    }

    const p = propiedad.properties;

    // =========================
    // TEXTOS
    // =========================
    document.getElementById('titulo').textContent = p.titulo;

    document.getElementById('precio').textContent =
      `$${Number(p.precio).toLocaleString()} ${p.moneda}`;

    document.getElementById('descripcion').textContent =
      p.descripcion;

    // =========================
    // BOTONES
    // =========================
    document.getElementById('btn-whatsapp').href =
      `https://wa.me/52XXXXXXXXXX?text=Me interesa la propiedad ${p.titulo}`;

    document.getElementById('btn-visita').href =
      `mailto:contacto@tudominio.com?subject=Visita ${p.titulo}`;

    // =========================
    // VIDEO DINÁMICO (CLAVE)
    // =========================
    const videoSource = document.querySelector('.hero-video source');

    if (videoSource) {

      videoSource.src =
        `/irisview/assets/propiedades/${p.folder}/video/video.mp4`;

      videoSource.parentElement.load();

    }

    // =========================
// GALERÍA DINÁMICA
// =========================

  const galleryContainer =
    document.getElementById('gallery-scroll');

  if (p.fotos) {

    const fotos = p.fotos.split(',');

    fotos.forEach(foto => {

      const ruta =
        `/irisview/assets/propiedades/${p.folder}/fotos/${foto.trim()}`;

      const item = document.createElement('div');

      item.classList.add('gallery-item');

      item.innerHTML = `
        <img src="${ruta}" alt="">
      `;

      galleryContainer.appendChild(item);

    });

  }

// =========================
// MODELO 3D
// =========================

const modelo3D = document.getElementById('modelo3d');

if (modelo3D) {

  modelo3D.src =
    `/irisview/assets/propiedades/${p.folder}/modelo3d/modelo.glb`;

}

// =========================
// INFORMACIÓN TÉCNICA
// =========================

// GENERAL

document.getElementById('info-tipo').textContent =
  p.tipo;

document.getElementById('info-transaccion').textContent =
  p.transaccion;

document.getElementById('info-recamaras').textContent =
  p.recamaras;

document.getElementById('info-banos').textContent =
  p.banos;

document.getElementById('info-estacionamiento').textContent =
  p.estacionamiento;

document.getElementById('info-niveles').textContent =
  p.niveles;

// TÉCNICA

document.getElementById('info-superficie').textContent =
  `${p.superficie_m2} m²`;

document.getElementById('info-frente').textContent =
  `${p.frente_m} m`;

document.getElementById('info-fondo').textContent =
  `${p.fondo_m} m`;

document.getElementById('info-orientacion').textContent =
  p.orientacion;

document.getElementById('info-elevacion').textContent =
  `${p.elevacion_msnm} msnm`;

document.getElementById('info-uso').textContent =
  p.uso_suelo;

// UBICACIÓN

document.getElementById('info-ciudad').textContent =
  p.ciudad;

document.getElementById('info-estado').textContent =
  p.estado;

document.getElementById('info-lat').textContent =
  Number(p.lat).toFixed(6);

document.getElementById('info-lng').textContent =
  Number(p.lng).toFixed(6);

document.getElementById('info-coordenadas').textContent =
  p.coordenadas;

  // =========================
// MAPA DETALLE
// =========================

const detailMap = L.map('detalle-map', {
  zoomControl: true
});

// CAPA BASE

L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap'
  }
).addTo(detailMap);

// GEOJSON SOLO DE ESTA PROPIEDAD

const geoLayer = L.geoJSON(propiedad, {

  style: {
    color: '#00c896',
    weight: 3,

    fillColor: '#00c896',

    fillOpacity: 0.18
  }

}).addTo(detailMap);

// AJUSTAR VISTA

detailMap.fitBounds(
  geoLayer.getBounds(),
  {
    padding: [60, 60]
  }
);

// MARKER CENTRAL

const marker = L.marker([
  Number(p.lat),
  Number(p.lng)
]).addTo(detailMap);

// POPUP

marker.bindPopup(`
  <b>${p.titulo}</b><br>
  ${p.ciudad}, ${p.estado}
`);
  

// =========================
// POIs CERCANOS
// =========================

// COORDENADAS PROPIEDAD

const lat = Number(p.lat);
const lng = Number(p.lng);

// RADIO EN METROS

const radius = 1500;

// QUERY OVERPASS
const query = `
[out:json];

(

  // HOSPITALES
  node(around:${radius},${lat},${lng})["amenity"="hospital"];
  way(around:${radius},${lat},${lng})["amenity"="hospital"];
  relation(around:${radius},${lat},${lng})["amenity"="hospital"];

  // ESCUELAS / COLEGIOS
  node(around:${radius},${lat},${lng})["amenity"="school"];
  way(around:${radius},${lat},${lng})["amenity"="school"];
  relation(around:${radius},${lat},${lng})["amenity"="school"];

  node(around:${radius},${lat},${lng})["amenity"="college"];
  node(around:${radius},${lat},${lng})["amenity"="university"];

  // PARQUES
  node(around:${radius},${lat},${lng})["leisure"="park"];
  way(around:${radius},${lat},${lng})["leisure"="park"];
  relation(around:${radius},${lat},${lng})["leisure"="park"];

  node(around:${radius},${lat},${lng})["leisure"="garden"];
  way(around:${radius},${lat},${lng})["leisure"="garden"];

  // PLAZAS
  node(around:${radius},${lat},${lng})["shop"="mall"];
  way(around:${radius},${lat},${lng})["shop"="mall"];

  // MERCADOS
  node(around:${radius},${lat},${lng})["amenity"="marketplace"];
  way(around:${radius},${lat},${lng})["amenity"="marketplace"];

  // OXXO / ABARROTES / CONVENIENCE
  node(around:${radius},${lat},${lng})["shop"="convenience"];
  way(around:${radius},${lat},${lng})["shop"="convenience"];

);

out center;
`;
// CONSULTA API

fetch(
  'https://overpass-api.de/api/interpreter',
  {
    method: 'POST',
    body: query
  }
)
.then(res => res.json())

.then(pois => {

  console.log('POIs encontrados:', pois);

  pois.elements.forEach(poi => {

    let color = '#ffffff';
    let icon = '📍';

    // HOSPITAL

    if (poi.tags.amenity === 'hospital') {
      color = '#ff4d4d';
      icon = '🏥';
    }

    // SCHOOL

    if (poi.tags.amenity === 'school') {
      color = '#4da6ff';
      icon = '🏫';
    }

    // PARK

    if (poi.tags.leisure === 'park') {
      color = '#4dff88';
      icon = '🌳';
    }

    // MALL / MARKET

    if (
      poi.tags.shop === 'mall' ||
      poi.tags.amenity === 'marketplace'
    ) {
      color = '#ffd24d';
      icon = '🛒';
    }

    // OXXO / CONVENIENCE

    if (
      poi.tags.name &&
      poi.tags.name.toLowerCase().includes('oxxo')
    ) {

      color = '#ff0000';

      icon = '🏪';

    }

    // ABARROTES / TIENDAS

    if (poi.tags.shop === 'convenience') {

      color = '#ff7a00';

      icon = '🏪';

    }

    // CIRCLE MARKER

    const marker = L.circleMarker(
      [
        poi.lat || poi.center?.lat,
        poi.lon || poi.center?.lon
      ],
      {
        radius: 7,

        color: color,

        fillColor: color,

        fillOpacity: 0.9,

        weight: 1
      }
    ).addTo(detailMap);

    // POPUP

    marker.bindPopup(`
      <b>${icon} ${poi.tags.name || 'Sin nombre'}</b>
    `);

  });

})


// =========================
// LEYENDA
// =========================

const legend = L.control({
  position: 'bottomright'
});

legend.onAdd = function () {

  const div = L.DomUtil.create(
    'div',
    'map-legend'
  );

  div.innerHTML = `

    <h4>Contexto urbano</h4>

    <div>
      <span class="legend-dot hospital"></span>
      Hospitales
    </div>

    <div>
      <span class="legend-dot school"></span>
      Escuelas
    </div>

    <div>
      <span class="legend-dot park"></span>
      Parques
    </div>

    <div>
      <span class="legend-dot mall"></span>
      Plazas
    </div>

    <div>
      <span class="legend-dot oxxo"></span>
      OXXO / Abarrotes
    </div>

  `;

  return div;
};
legend.addTo(detailMap);
// =========================
// VIDEO CINEMATIC
// =========================

const cinematicVideo =
  document.querySelector('#cinematic-video source');

if (cinematicVideo) {

  cinematicVideo.src =
    `/irisview/assets/propiedades/${p.folder}/video/video2.mp4`;

  cinematicVideo.parentElement.load();

}


// =========================
// CTA FINAL
// =========================

const mensaje = encodeURIComponent(
  `Hola, me interesa la propiedad:\n${p.titulo}\n(ID: ${p.id})`
);

// WHATSAPP

document.getElementById('cta-whatsapp').href =
  `https://wa.me/529831202245?text=${mensaje}`;

// AGENDAR VISITA

document.getElementById('cta-visita').href =
  `https://wa.me/529831202245?text=${mensaje}`;

// EMAIL

document.getElementById('cta-email').href =
  `mailto:irisaerealservices@gmail.com?subject=Interés en ${p.titulo}`;


})
.catch(error => {
  console.error('Error cargando POIs:', error);
});


// =========================
// REVEAL SCROLL
// =========================

const revealElements =
  document.querySelectorAll('.reveal');

const revealObserver =
  new IntersectionObserver(

    (entries) => {

      entries.forEach(entry => {

        if (entry.isIntersecting) {

          entry.target.classList.add('active');

        }

      });

    },

    {
      threshold: 0.15
    }

);

revealElements.forEach(el => {

  revealObserver.observe(el);

});