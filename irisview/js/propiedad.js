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

  })
  .catch(error => {
    console.error('Error cargando GeoJSON:', error);
  });