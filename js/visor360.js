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

    <div id="poi-wrapper" class="poi-wrapper">
    <div id="poi-panel" class="poi-panel">
        <div class="poi-panel-header">
        <span>Puntos de interés</span>
        <button id="btn-toggle-poi" class="poi-panel-toggle">‹</button>
        </div>
        <div id="poi-categorias" class="poi-categorias"></div>
        <div id="poi-lista" class="poi-lista"></div>
    </div>
    <button id="visor-info-video-btn" class="visor-video-btn" style="display:none;">
        Ver video
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
    document.getElementById('btn-toggle-poi').addEventListener('click', () => {
    const panel = document.getElementById('poi-panel');
    const btn = document.getElementById('btn-toggle-poi');
    panel.classList.toggle('colapsado');
    btn.textContent = panel.classList.contains('colapsado') ? '›' : '‹';
});
    document.getElementById('visor-top-nombre').textContent = nombreProyecto || '';
    if (logoUrl) {
        const logoEl = document.getElementById('visor-info-logo');
        logoEl.src = baseUrl + logoUrl.replace(/^\//, '');
        logoEl.style.display = 'block';
    }

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
        const res = await fetch(baseUrl + 'hotspots.json?t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        spheres = await res.json();
    } catch (err) {
        console.error('Error cargando hotspots.json:', err);
        contenedor.innerHTML = '<div style="color:white;text-align:center;padding:60px 20px;">Error al cargar el recorrido.</div>';
        return;
    }
    let categoriaActiva = 'todos';
    const categoriasMap = new Map();
    Object.values(spheres).forEach(s => {
        (s.poi || []).forEach(p => {
            const key = normalizarTexto(p.categoria);
            if (!categoriasMap.has(key)) categoriasMap.set(key, p.categoria);
        });
    });

    function renderCategorias() {
        const cont = document.getElementById('poi-categorias');
        if (!cont) return;
        cont.innerHTML = '';

        const todos = document.createElement('button');
        todos.className = 'poi-chip' + (categoriaActiva === 'todos' ? ' activo' : '');
        todos.textContent = 'Todos';
        todos.addEventListener('click', () => { categoriaActiva = 'todos'; refrescarPOI(); });
        cont.appendChild(todos);

        categoriasMap.forEach((label, key) => {
            const btn = document.createElement('button');
            btn.className = 'poi-chip' + (categoriaActiva === key ? ' activo' : '');
            btn.innerHTML = `<span class="poi-chip-icon">${iconoCategoria(label)}</span>${label}`;            btn.addEventListener('click', () => { categoriaActiva = key; refrescarPOI(); });
            cont.appendChild(btn);
        });
    }

    function renderListaPOI(sphere) {
        const cont = document.getElementById('poi-lista');
        if (!cont) return;
        cont.innerHTML = '';

        const items = (sphere.poi || []).filter(p => categoriaActiva === 'todos' || normalizarTexto(p.categoria) === categoriaActiva);

        if (items.length === 0) {
            cont.innerHTML = '<p class="poi-lista-vacio">Sin puntos en esta categoría.</p>';
            return;
        }

        items.forEach(p => {
            const row = document.createElement('div');
            row.className = 'poi-lista-item';
            row.innerHTML = `
                <span class="poi-lista-icono">${iconoCategoria(p.categoria)}</span>
                <span class="poi-lista-texto">
                <strong>${p.nombre}</strong>
                <small>${formatearDistancia(p.distance)}</small>
                </span>
            `;
            cont.appendChild(row);
        });
    }

    function refrescarPOI() {
        const sphere = spheres[currentSphere];
        if (!sphere) return;
        renderCategorias();
        renderListaPOI(sphere);
        if (markersPlugin) {
            markersPlugin.clearMarkers();
            const poiMarkers = createPoiMarkers(sphere);
            console.log('POI de esta esfera:', sphere.poi?.length, '→ markers creados:', poiMarkers.length);
            markersPlugin.setMarkers([...createMarkers(sphere), ...poiMarkers]);        }
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

        const s = spheres[id];
        const thumbUrl = s.imagen ? (baseUrl + 'imagenes/' + s.imagen.replace(/^\//, '')) : null;

        item.innerHTML = `
            ${thumbUrl ? `<img src="${thumbUrl}" alt="">` : '<div class="sidebar-item-noimg"></div>'}
            <span>${s.titulo || s.nombre || id}</span>
        `;
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

    function normalizarTexto(txt) {
        return (txt || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    const SVG_ICONOS = {
        hospital: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>',
        escuela: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l8-5 8 5-8 5-8-5z"/><path d="M8 12.5V17c0 1 1.8 2 4 2s4-1 4-2v-4.5"/></svg>',
        universidad: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l8-5 8 5-8 5-8-5z"/><path d="M8 12.5V17c0 1 1.8 2 4 2s4-1 4-2v-4.5"/><path d="M20 10v5"/></svg>',
        parque: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l4 6h-3l4 6h-10l4-6H8z"/><path d="M12 15v6"/></svg>',
        mercado: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.5 9h-13z"/><path d="M8 8V6a4 4 0 018 0v2"/></svg>',
        centro_comercial: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M9 20v-5h6v5"/><path d="M4 9l2-5h12l2 5"/></svg>',
        plaza: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M9 20v-5h6v5"/><path d="M4 9l2-5h12l2 5"/></svg>',
        vialidad: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3L4 21"/><path d="M16 3l4 18"/><path d="M12 6v3M12 12v3M12 18v1"/></svg>',
        amenidad: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l2.5 6.5L21 10l-5 4.2L17.5 21 12 17.5 6.5 21 8 14.2 3 10l6.5-.5z"/></svg>',
        default: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.3"/></svg>'
    };

    function iconoCategoria(categoria) {
        const key = normalizarTexto(categoria).replace(/\s+/g, '_');
        return SVG_ICONOS[key] || SVG_ICONOS.default;
    }

    function anguloDiferencia(a, b) {
        let diff = Math.abs(a - b);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        return diff;
    }

    const CONFIG_LIMITE_CATEGORIA = {
        parque: { max: 5, separacionMinima: 0.35 }
        // agrega más categorías aquí si en el futuro se saturan también,
        // ej: mercado: { max: 4, separacionMinima: 0.3 }
    };

    function limitarPOIparaEsfera(poiArray) {
        const porCategoria = {};
        poiArray.forEach(p => {
            const key = normalizarTexto(p.categoria);
            if (!porCategoria[key]) porCategoria[key] = [];
            porCategoria[key].push(p);
        });

        let resultado = [];
        Object.keys(porCategoria).forEach(key => {
            const lista = porCategoria[key].slice().sort((a, b) => a.distance - b.distance);
            const config = CONFIG_LIMITE_CATEGORIA[key];

            if (!config) {
                resultado = resultado.concat(lista);
                return;
            }

            const seleccionados = [];
            for (const punto of lista) {
                if (seleccionados.length >= config.max) break;
                const muyCerca = seleccionados.some(s => anguloDiferencia(s.yaw, punto.yaw) < config.separacionMinima);
                if (!muyCerca) seleccionados.push(punto);
            }
            if (seleccionados.length < config.max) {
                for (const punto of lista) {
                    if (seleccionados.length >= config.max) break;
                    if (!seleccionados.includes(punto)) seleccionados.push(punto);
                }
            }
            resultado = resultado.concat(seleccionados);
        });

        return resultado;
    }

    function formatearDistancia(m) {
        return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
    }

 function createPoiMarkers(sphere) {
    if (!sphere?.poi) return [];
    const limitado = limitarPOIparaEsfera(sphere.poi);
    return limitado
        .filter(p => categoriaActiva === 'todos' || normalizarTexto(p.categoria) === categoriaActiva)
        .map((p, index) => {
            const html = `
                <div class="poi-marker" title="${p.nombre} · ${formatearDistancia(p.distance)}">
                  <div class="poi-marker-pill">
                    <span class="poi-marker-icon">${iconoCategoria(p.categoria)}</span>
                  </div>
                  <div class="poi-marker-linea"></div>
                  <div class="poi-marker-punto"></div>
                  <div class="poi-marker-tooltip">
                    <strong>${p.nombre}</strong>
                    <small>${formatearDistancia(p.distance)}</small>
                  </div>
                </div>
            `;
            return {
                id: `poi_${sphere.nombre}_${index}`,
                html,
                size: { width: 46, height: 66 },
                anchor: 'bottom center',
                position: { yaw: p.yaw, pitch: calcularPitch(p.distance) }
            };
        });
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
                    <span>${etiqueta}</span>
                    ${thumb ? `<img src="${thumb}" alt="">` : ''}
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

    let conoMarker = null;
const CALIBRACION_OFFSET = 0; // si el cono apunta mal, ajusta este número (grados)

function actualizarConoVision(yawInternoRad) {
    const sphere = spheres[currentSphere];
    if (!sphere?.position || !mapActual) return;

    const yawDeg = yawInternoRad * 180 / Math.PI;
    const bearing = ((yawDeg + sphere.heading - 180 + CALIBRACION_OFFSET) % 360 + 360) % 360;

    if (!conoMarker) {
        conoMarker = L.marker([sphere.position.lat, sphere.position.lon], {
            icon: L.divIcon({
                className: 'cono-vision-wrapper',
                html: '<div class="cono-vision-inner"></div>',
                iconSize: [140, 140],
                iconAnchor: [70, 70]
            }),
            interactive: false,
            zIndexOffset: -100
        }).addTo(mapActual);
    } else {
        conoMarker.setLatLng([sphere.position.lat, sphere.position.lon]);
    }

    const el = conoMarker.getElement()?.querySelector('.cono-vision-inner');
    if (el) el.style.transform = `rotate(${bearing}deg)`;
}

    function actualizarVideoBtn(sphere) {
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
        actualizarVideoBtn(sphere);
        renderCategorias();
        renderListaPOI(sphere);

        if (markersPlugin) markersPlugin.clearMarkers();

        viewer.setPanorama(baseUrl + sphere.texture.replace(/^\//, ''), { transition: true, showLoader: true })
            .then(() => {
                if (markersPlugin) {
                    markersPlugin.clearMarkers();
                    markersPlugin.setMarkers([...createMarkers(sphere), ...createPoiMarkers(sphere)]);
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
                actualizarConoVision(sphere.initialView?.yaw || 0);
                isLoading = false;
                setTimeout(() => viewer.resize(), 50);
                setTimeout(() => map.invalidateSize(), 50);
            })
            .catch(err => {
                console.error('Error cargando esfera:', id, err);
                isLoading = false;
            });
    }
    viewer.addEventListener('position-updated', ({ position }) => {
        actualizarConoVision(position.yaw);
    });


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