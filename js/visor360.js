import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from 'https://esm.sh/@photo-sphere-viewer/markers-plugin@5.14.1?external=@photo-sphere-viewer/core,three';

let viewerActual = null;
let mapActual = null;

window.IRIS360_iniciarVisor = async function (baseUrl, logoUrl, nombreProyecto) {

    const contenedor = document.getElementById('visor-iris360');
    if (!contenedor) return;

    if (viewerActual) { viewerActual.destroy(); viewerActual = null; }
    if (mapActual) { mapActual.remove(); mapActual = null; }

    contenedor.classList.add('visor-activo');
    document.body.classList.add('visor-360-activo');
    contenedor.innerHTML = `
        <button id="btn-cerrar-visor" class="visor-close">← Proyectos</button>

        <div id="visor-info-card" class="visor-info-card">
          <h3 id="visor-info-titulo"></h3>
          <p id="visor-info-desc"></p>
          <button id="visor-info-video-btn" class="visor-video-btn" style="display:none;">
            ▶ Ver video
          </button>
        </div>

        <div id="visor-top-bar" class="visor-top-bar">
            <span id="visor-top-nombre" class="visor-top-nombre"></span>
            <img id="visor-info-logo" class="visor-info-logo" style="display:none;" alt="Logo">
        </div>

        <div id="viewer" class="visor-viewer-full"></div>

        <div class="visor-panel-flotante colapsado" id="panel-flotante">
        <button id="btn-toggle-panel" class="visor-panel-toggle">+</button>
        <div id="mini-map" class="visor-mapa"></div>
        <div id="esferas-sidebar" class="visor-sidebar"></div>
        </div>

        <div id="video-modal" class="video-modal-overlay" style="display:none;">
          <div class="video-modal-box">
            <button id="video-modal-cerrar" class="video-modal-cerrar">✕</button>
            <div id="video-modal-frame"></div>
          </div>
        </div>
    `;

    document.getElementById('btn-cerrar-visor').addEventListener('click', () => cerrarVisor());
    document.getElementById('btn-toggle-panel').addEventListener('click', () => {
        const panel = document.getElementById('panel-flotante');
        const btn = document.getElementById('btn-toggle-panel');
        panel.classList.toggle('colapsado');
        if (panel.classList.contains('colapsado')) {
            btn.textContent = '+';
        } else {
            btn.textContent = '‹';
            setTimeout(() => {
                if (mapActual) {
                    mapActual.invalidateSize();
                    if (todosLosPuntos.length > 0) {
                        mapActual.fitBounds(todosLosPuntos, { padding: [30, 30] });
                    }
                }
            }, 300);
        }
    });
    document.getElementById('visor-top-nombre').textContent = nombreProyecto || '';
    if (logoUrl) {
        const logoEl = document.getElementById('visor-info-logo');
        logoEl.src = baseUrl + logoUrl.replace(/^\//, '');
        logoEl.style.display = 'block';
    }

    const infoTitulo = document.getElementById('visor-info-titulo');
    const infoDesc = document.getElementById('visor-info-desc');
    const infoVideoBtn = document.getElementById('visor-info-video-btn');

    const videoModal = document.getElementById('video-modal');
    const videoFrame = document.getElementById('video-modal-frame');
    document.getElementById('video-modal-cerrar').addEventListener('click', cerrarVideoModal);
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) cerrarVideoModal();
    });

    function cerrarVideoModal() {
        videoModal.style.display = 'none';
        videoFrame.innerHTML = ''; // detiene la reproducción al quitar el iframe
    }

    const map = L.map('mini-map');
    mapActual = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    }).addTo(map);

    let spheres = {};
    try {
        const res = await fetch(baseUrl + 'hotspots.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        spheres = await res.json();
    } catch (err) {
        console.error('Error cargando hotspots.json:', err);
        contenedor.innerHTML = '<div style="color:white;text-align:center;padding:60px 20px;">Error al cargar el recorrido.</div>';
        return;
    }

    map.invalidateSize();
    const todosLosPuntos = Object.values(spheres)
        .filter(s => s.position)
        .map(s => [s.position.lat, s.position.lon]);
    if (todosLosPuntos.length > 0) {
        map.fitBounds(todosLosPuntos, { padding: [30, 30] });
    } else {
        map.setView([21.02, -89.57], 14);
    }
    const viewer = new Viewer({
        container: document.querySelector('#viewer'),
        panorama: '',
        loadingTxt: 'Cargando esfera 360...',
        navbar: ['zoom', 'fullscreen'],
        defaultYaw: 0,
        defaultPitch: 0,
        plugins: [[MarkersPlugin, {}]]
    });
    viewerActual = viewer;

    const markersPlugin = viewer.getPlugin(MarkersPlugin);

    // ── Sidebar: una entrada por esfera ──
    const sidebar = document.getElementById('esferas-sidebar');
    sidebar.innerHTML = '';
    Object.keys(spheres).forEach((id) => {
        const item = document.createElement('div');
        item.className = 'visor-sidebar-item';
        item.dataset.id = id;
        item.textContent = spheres[id].titulo || spheres[id].nombre || id;
        item.addEventListener('click', () => loadSphere(id));
        sidebar.appendChild(item);
    });

    function marcarSidebarActivo(id) {
        sidebar.querySelectorAll('.visor-sidebar-item').forEach(el => {
            el.classList.toggle('activo', el.dataset.id === id);
        });
    }

    function calcularPitch(distancia) {
        if (!distancia) return -0.10;
        let pitch = -(60 / distancia);
        if (pitch < -0.20) pitch = -0.20;
        if (pitch > -0.06) pitch = -0.06;
        return pitch;
    }

    function createMarkers(sphere) {
        if (!sphere?.links || sphere.links.length === 0) return [];
        return sphere.links
            .filter(l => l?.to && Number.isFinite(l.yaw) && Number.isFinite(l.pitch))
            .map((l, index) => {
                const destino = spheres[l.to] || {};
                const etiqueta = destino.titulo || l.tooltip || ('Ir a ' + l.to);
                const thumb = destino.imagen ? (baseUrl + 'imagenes/' + destino.imagen.replace(/^\//, '')) : null;

                const html = `
                    <div class="hotspot-link">
                      ${thumb ? `<img src="${thumb}" alt="">` : ''}
                      <span>${etiqueta}</span>
                    </div>
                `;

                return {
                    id: `link_${sphere.nombre}_${l.to}_${index}`,
                    html,
                    size: { width: 90, height: 100 },
                    anchor: 'center center',
                    position: { yaw: l.yaw, pitch: calcularPitch(l.distance) },
                    data: { target: l.to }
                };
            });
    }


    let isLoading = false;
    let currentSphere = null;
    let ultimaVistaMapa = null;
    const mapMarkers = [];

    function actualizarInfoCard(sphere) {
        infoTitulo.textContent = sphere.titulo || sphere.nombre || '';
        infoDesc.textContent = sphere.descripcion || '';

        if (sphere.video) {
            infoVideoBtn.style.display = 'inline-flex';
            infoVideoBtn.onclick = () => {
                videoFrame.innerHTML = `
                    <iframe
                      width="100%" height="100%"
                      src="https://www.youtube-nocookie.com/embed/${sphere.video}?autoplay=1"
                      title="Video" frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen>
                    </iframe>
                `;
                videoModal.style.display = 'flex';
            };
        } else {
            infoVideoBtn.style.display = 'none';
            infoVideoBtn.onclick = null;
        }
    }

    function loadSphere(id) {
        const sphere = spheres[id];
        if (!sphere?.texture) return;
        if (isLoading) return;

        isLoading = true;
        currentSphere = id;
        marcarSidebarActivo(id);
        actualizarInfoCard(sphere);

        if (markersPlugin) markersPlugin.clearMarkers();

        viewer.setPanorama(baseUrl + sphere.texture.replace(/^\//, ''), { transition: true, showLoader: true })
            .then(() => {
                if (markersPlugin) {
                    markersPlugin.clearMarkers();
                    markersPlugin.setMarkers(createMarkers(sphere));
                }
                if (sphere.initialView) {
                    viewer.rotate({ yaw: sphere.initialView.yaw, pitch: sphere.initialView.pitch || 0 });
                }
                if (sphere.position) {
                    mapMarkers.forEach(m => map.removeLayer(m));
                    mapMarkers.length = 0;

                    Object.values(spheres).forEach(s => {
                        if (!s.position) return;
                        const isCurrent = s.nombre === sphere.nombre;
                        const icon = L.divIcon({
                            className: 'custom-map-marker',
                            html: isCurrent
                                ? '<div style="background:#ff3333;width:20px;height:20px;border-radius:50%;border:3px solid white;"></div>'
                                : '<div style="background:#3388ff;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });
                        const marker = L.marker([s.position.lat, s.position.lon], { icon }).addTo(map);
                        mapMarkers.push(marker);
                    });

                    map.setView([sphere.position.lat, sphere.position.lon], 17);
                }
                isLoading = false;
                setTimeout(() => viewer.resize(), 50);
                setTimeout(() => map.invalidateSize(), 50);
            })
            .catch(err => {
                console.error('Error cargando esfera:', id, err);
                isLoading = false;
            });
    }

    if (markersPlugin) {
        markersPlugin.addEventListener('select-marker', ({ marker }) => {
            const target = marker?.data?.target;
            if (target && target !== currentSphere) loadSphere(target);
        });
    }

    const first = Object.keys(spheres)[0];
    if (!first) {
        console.error('No hay esferas en el JSON');
        return;
    }
    loadSphere(first);

    window.addEventListener('resize', () => {
        if (viewerActual) viewerActual.resize();
        if (mapActual) mapActual.invalidateSize();
    });
};

function cerrarVisor() {
    const contenedor = document.getElementById('visor-iris360');
    if (viewerActual) { viewerActual.destroy(); viewerActual = null; }
    if (mapActual) { mapActual.remove(); mapActual = null; }
    document.body.classList.remove('visor-360-activo');
    if (contenedor) {
        contenedor.classList.remove('visor-activo');
        contenedor.innerHTML = '';
    }
}

window.addEventListener('iris360:proyecto-elegido', (e) => {
    const prefix = e.detail?.r2_prefix;
    if (!prefix || !window.IRIS360_R2_BASE_URL) return;
    const baseUrl = window.IRIS360_R2_BASE_URL.replace(/\/$/, '') + '/' + prefix.replace(/^\//, '');
    const full = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    window.IRIS360_iniciarVisor(full, e.detail?.logo_url || null, e.detail?.nombre || null);
});