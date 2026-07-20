import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from 'https://esm.sh/@photo-sphere-viewer/markers-plugin@5.14.1?external=@photo-sphere-viewer/core,three';

let viewerActual = null;
let mapActual = null;

window.IRIS360_iniciarVisor = async function (baseUrl) {

    const contenedor = document.getElementById('visor-iris360');
    if (!contenedor) return;

    if (viewerActual) { viewerActual.destroy(); viewerActual = null; }
    if (mapActual) { mapActual.remove(); mapActual = null; }

    contenedor.classList.add('visor-activo');
    document.body.classList.add('visor-360-activo');
    contenedor.innerHTML = `
        <button id="btn-cerrar-visor" class="visor-close">← Proyectos</button>
        <div id="viewer" class="visor-viewer-full"></div>
        <div class="visor-panel-flotante">
          <div id="mini-map" class="visor-mapa"></div>
          <div id="esferas-sidebar" class="visor-sidebar"></div>
        </div>
    `;

    document.getElementById('btn-cerrar-visor').addEventListener('click', () => {
        cerrarVisor();
    });

    const map = L.map('mini-map').setView([21.02, -89.57], 14);
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
        item.textContent = spheres[id].nombre || id;
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
            .map((l, index) => ({
                id: `link_${sphere.nombre}_${l.to}_${index}`,
                image: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                size: { width: 48, height: 48 },
                anchor: 'center center',
                position: { yaw: l.yaw, pitch: calcularPitch(l.distance) },
                tooltip: { content: l.tooltip || ('Ir a ' + l.to), position: 'top center' },
                data: { target: l.to }
            }));
    }

    let isLoading = false;
    let currentSphere = null;
    const mapMarkers = [];

    function loadSphere(id) {
        const sphere = spheres[id];
        if (!sphere?.texture) return;
        if (isLoading) return;

        isLoading = true;
        currentSphere = id;
        marcarSidebarActivo(id);

        if (markersPlugin) markersPlugin.clearMarkers();

        viewer.setPanorama(baseUrl + sphere.texture, { transition: true, showLoader: true })
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
    if (contenedor) {
        contenedor.classList.remove('visor-activo');
        document.body.classList.remove('visor-360-activo');
        contenedor.innerHTML = `
            <div class="visor-placeholder">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="1.5"/>
                <ellipse cx="24" cy="24" rx="10" ry="22" stroke="currentColor" stroke-width="1.5"/>
                <line x1="2" y1="24" x2="46" y2="24" stroke="currentColor" stroke-width="1.5"/>
                <line x1="24" y1="2" x2="24" y2="46" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <p>Selecciona un proyecto para ver su recorrido</p>
            </div>
        `;
    }
}

window.addEventListener('iris360:proyecto-elegido', (e) => {
    const prefix = e.detail?.r2_prefix;
    if (!prefix || !window.IRIS360_R2_BASE_URL) return;
    const baseUrl = window.IRIS360_R2_BASE_URL.replace(/\/$/, '') + '/' + prefix.replace(/^\//, '');
    window.IRIS360_iniciarVisor(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
});