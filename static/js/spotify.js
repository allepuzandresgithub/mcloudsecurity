/* spotify.js — Spotify library integration */

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    let state = {
        connected: false,
        credentialsOk: false,
        activeTab: 'library',       // 'library' | 'playlists'
        libraryTracks: [],
        libraryOffset: 0,
        libraryTotal: 0,
        playlists: [],
        playlistOffset: 0,
        playlistTotal: 0,
        openPlaylist: null,         // { id, name, tracks, total, offset }
        selected: new Set(),        // track ids selected for download
        activeDownloadId: null,
        pollTimer: null,
    };

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    const $ = id => document.getElementById(id);
    const fmt_duration = ms => {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    const toast = (msg, type = 'info') => { if (window.showToast) showToast(msg, type); };

    // -----------------------------------------------------------------------
    // API calls
    // -----------------------------------------------------------------------
    async function apiGet(url) {
        const r = await fetch(url);
        return r.json();
    }

    async function apiPost(url, body) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return r.json();
    }

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------
    async function init() {
        await checkStatus();
        // Handle redirect params after OAuth
        const params = new URLSearchParams(window.location.search);
        if (params.get('spotify_connected')) {
            toast('Cuenta de Spotify conectada correctamente', 'success');
            cleanUrl();
        } else if (params.get('spotify_error')) {
            toast('Error al conectar con Spotify: ' + params.get('spotify_error'), 'error');
            cleanUrl();
        }
    }

    function cleanUrl() {
        const url = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', url);
    }

    async function checkStatus() {
        const data = await apiGet('/api/spotify/status');
        state.connected     = data.connected;
        state.credentialsOk = data.credentials_configured;
        render();
        if (state.connected) {
            loadLibrary(0);
            loadPlaylists();
        }
    }

    // -----------------------------------------------------------------------
    // Connect / Disconnect
    // -----------------------------------------------------------------------
    async function connect() {
        const data = await apiGet('/api/spotify/auth');
        if (data.error) { toast(data.error, 'error'); return; }
        window.location.href = data.auth_url;
    }

    async function disconnect() {
        if (!confirm('¿Desconectar tu cuenta de Spotify?')) return;
        await apiPost('/api/spotify/disconnect', {});
        state.connected     = false;
        state.libraryTracks = [];
        state.playlists     = [];
        state.selected.clear();
        stopPoll();
        render();
        toast('Cuenta de Spotify desconectada', 'info');
    }

    // -----------------------------------------------------------------------
    // Library loading
    // -----------------------------------------------------------------------
    async function loadLibrary(offset = 0) {
        showLoading('spotify-tracks-body', offset === 0);
        const data = await apiGet(`/api/spotify/library?offset=${offset}&limit=50`);
        if (data.error) { toast(data.error, 'error'); return; }
        if (offset === 0) state.libraryTracks = data.tracks;
        else state.libraryTracks = state.libraryTracks.concat(data.tracks);
        state.libraryOffset = offset + data.tracks.length;
        state.libraryTotal  = data.total;
        renderTracks(state.libraryTracks, 'spotify-tracks-body', state.libraryTotal);
        updateLoadMoreBtn('spotify-load-more-library', state.libraryOffset < state.libraryTotal);
    }

    async function loadPlaylists() {
        const data = await apiGet('/api/spotify/playlists');
        if (data.error) { toast(data.error, 'error'); return; }
        state.playlists      = data.playlists;
        state.playlistTotal  = data.total;
        renderPlaylists();
    }

    async function openPlaylist(id, name) {
        state.openPlaylist = { id, name, tracks: [], total: 0, offset: 0 };
        state.selected.clear();
        showPlaylistView(name);
        await loadPlaylistPage(id, 0);
    }

    async function loadPlaylistPage(id, offset) {
        showLoading('spotify-playlist-tracks-body', offset === 0);
        const data = await apiGet(`/api/spotify/playlists/${id}/tracks?offset=${offset}&limit=50`);
        if (data.error) { toast(data.error, 'error'); return; }
        if (offset === 0) state.openPlaylist.tracks = data.tracks;
        else state.openPlaylist.tracks = state.openPlaylist.tracks.concat(data.tracks);
        state.openPlaylist.offset = offset + data.tracks.length;
        state.openPlaylist.total  = data.total;
        renderTracks(state.openPlaylist.tracks, 'spotify-playlist-tracks-body', state.openPlaylist.total);
        updateLoadMoreBtn('spotify-load-more-playlist', state.openPlaylist.offset < state.openPlaylist.total);
    }

    // -----------------------------------------------------------------------
    // Selection helpers
    // -----------------------------------------------------------------------
    function toggleSelect(trackId) {
        if (state.selected.has(trackId)) state.selected.delete(trackId);
        else state.selected.add(trackId);
        updateSelectionUI();
    }

    function selectAll(tracks) {
        tracks.forEach(t => state.selected.add(t.id));
        updateSelectionUI();
        refreshCheckboxes();
    }

    function clearSelection() {
        state.selected.clear();
        updateSelectionUI();
        refreshCheckboxes();
    }

    function updateSelectionUI() {
        const count = state.selected.size;
        const bar   = $('spotify-selection-bar');
        if (bar) {
            bar.style.display = count > 0 ? 'flex' : 'none';
            const lbl = $('spotify-selection-count');
            if (lbl) lbl.textContent = `${count} canción${count !== 1 ? 'es' : ''} seleccionada${count !== 1 ? 's' : ''}`;
        }
    }

    function refreshCheckboxes() {
        document.querySelectorAll('.spotify-track-check').forEach(cb => {
            cb.checked = state.selected.has(cb.dataset.id);
        });
    }

    // -----------------------------------------------------------------------
    // Download
    // -----------------------------------------------------------------------
    function getTracksForDownload() {
        const allTracks = state.openPlaylist
            ? state.openPlaylist.tracks
            : state.libraryTracks;
        return allTracks.filter(t => state.selected.has(t.id));
    }

    async function startDownload() {
        const tracks = getTracksForDownload();
        if (tracks.length === 0) { toast('Selecciona al menos una canción', 'warning'); return; }

        const data = await apiPost('/api/spotify/download', { tracks });
        if (data.error) { toast(data.error, 'error'); return; }

        state.activeDownloadId = data.download_id;
        state.selected.clear();
        updateSelectionUI();
        refreshCheckboxes();
        renderDownloadProgress();
        startPoll(data.download_id);
        toast(`Descargando ${tracks.length} canciones...`, 'info');
    }

    async function cancelDownload(id) {
        await apiPost(`/api/spotify/download/cancel/${id}`, {});
        toast('Descarga cancelada', 'info');
    }

    // -----------------------------------------------------------------------
    // Polling
    // -----------------------------------------------------------------------
    function startPoll(id) {
        stopPoll();
        state.pollTimer = setInterval(() => pollStatus(id), 2000);
    }

    function stopPoll() {
        if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
    }

    async function pollStatus(id) {
        const data = await apiGet(`/api/spotify/download/status/${id}`);
        renderDownloadProgress(data);
        if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'error') {
            stopPoll();
            if (data.status === 'completed') {
                toast(`Descarga completada: ${data.downloaded_files?.length || 0} canciones`, 'success');
            }
        }
    }

    async function clearHistory() {
        await apiPost('/api/spotify/downloads/clear', {});
        state.activeDownloadId = null;
        renderDownloadProgress();
    }

    // -----------------------------------------------------------------------
    // Rendering
    // -----------------------------------------------------------------------
    function render() {
        const container = $('spotify-content');
        if (!container) return;

        if (!state.credentialsOk) {
            container.innerHTML = renderNoCredentials();
            return;
        }

        if (!state.connected) {
            container.innerHTML = renderConnectPrompt();
            container.querySelector('#spotify-connect-btn')?.addEventListener('click', connect);
            return;
        }

        container.innerHTML = renderMainUI();
        attachMainListeners();
        renderPlaylists();
    }

    function renderNoCredentials() {
        return `
        <div class="spotify-empty-state">
            <i class="fab fa-spotify" style="font-size:3rem;color:#1DB954;margin-bottom:16px;display:block;"></i>
            <h3>Spotify no configurado</h3>
            <p style="color:var(--text-secondary);max-width:420px;">
                El administrador del servidor debe configurar las variables de entorno
                <code>SPOTIFY_CLIENT_ID</code>, <code>SPOTIFY_CLIENT_SECRET</code> y
                <code>SPOTIFY_REDIRECT_URI</code>.
            </p>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:8px;">
                Crea una app en
                <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener" style="color:#1DB954;">
                    developer.spotify.com
                </a>
                y añade la URL de callback a los Redirect URIs.
            </p>
        </div>`;
    }

    function renderConnectPrompt() {
        return `
        <div class="spotify-empty-state">
            <i class="fab fa-spotify" style="font-size:3.5rem;color:#1DB954;margin-bottom:16px;display:block;"></i>
            <h3>Conecta tu cuenta de Spotify</h3>
            <p style="color:var(--text-secondary);max-width:380px;">
                Importa tu biblioteca de Spotify y descarga todas tus canciones directamente a tu colección privada.
            </p>
            <button id="spotify-connect-btn" class="spotify-btn-primary" style="margin-top:20px;">
                <i class="fab fa-spotify"></i> Conectar con Spotify
            </button>
        </div>`;
    }

    function renderMainUI() {
        return `
        <div class="spotify-layout">
            <!-- Header -->
            <div class="spotify-header">
                <div style="display:flex;align-items:center;gap:12px;">
                    <i class="fab fa-spotify" style="font-size:1.8rem;color:#1DB954;"></i>
                    <h2 style="margin:0;">Biblioteca de Spotify</h2>
                </div>
                <button id="spotify-disconnect-btn" class="spotify-btn-ghost" title="Desconectar Spotify">
                    <i class="fas fa-unlink"></i> Desconectar
                </button>
            </div>

            <!-- Tabs -->
            <div class="spotify-tabs">
                <button class="spotify-tab active" data-tab="library">
                    <i class="fas fa-heart"></i> Canciones guardadas
                    <span class="spotify-badge" id="spotify-library-count"></span>
                </button>
                <button class="spotify-tab" data-tab="playlists">
                    <i class="fas fa-list-music"></i> Playlists
                    <span class="spotify-badge" id="spotify-playlists-count"></span>
                </button>
            </div>

            <!-- Selection bar -->
            <div id="spotify-selection-bar" class="spotify-selection-bar" style="display:none;">
                <span id="spotify-selection-count"></span>
                <div style="display:flex;gap:8px;margin-left:auto;">
                    <button onclick="SpotifyUI.selectAllVisible()" class="spotify-btn-ghost">
                        <i class="fas fa-check-double"></i> Seleccionar todo
                    </button>
                    <button onclick="SpotifyUI.clearSelection()" class="spotify-btn-ghost">
                        <i class="fas fa-times"></i> Limpiar
                    </button>
                    <button onclick="SpotifyUI.startDownload()" class="spotify-btn-primary">
                        <i class="fas fa-download"></i> Descargar selección
                    </button>
                </div>
            </div>

            <!-- Tab panels -->
            <div id="spotify-tab-library" class="spotify-panel">
                <div id="spotify-tracks-body"></div>
                <div style="text-align:center;margin-top:16px;">
                    <button id="spotify-load-more-library" class="spotify-btn-ghost" style="display:none;"
                        onclick="SpotifyUI.loadMoreLibrary()">
                        <i class="fas fa-chevron-down"></i> Cargar más
                    </button>
                </div>
            </div>

            <div id="spotify-tab-playlists" class="spotify-panel" style="display:none;">
                <div id="spotify-playlists-body"></div>
            </div>

            <!-- Playlist detail view -->
            <div id="spotify-playlist-view" style="display:none;">
                <div class="spotify-playlist-header">
                    <button onclick="SpotifyUI.closePlaylist()" class="spotify-btn-ghost">
                        <i class="fas fa-arrow-left"></i> Volver a playlists
                    </button>
                    <h3 id="spotify-playlist-title" style="margin:0;"></h3>
                    <button onclick="SpotifyUI.selectAllVisible()" class="spotify-btn-ghost">
                        <i class="fas fa-check-double"></i> Seleccionar todo
                    </button>
                </div>
                <div id="spotify-playlist-tracks-body"></div>
                <div style="text-align:center;margin-top:16px;">
                    <button id="spotify-load-more-playlist" class="spotify-btn-ghost" style="display:none;"
                        onclick="SpotifyUI.loadMorePlaylist()">
                        <i class="fas fa-chevron-down"></i> Cargar más
                    </button>
                </div>
            </div>

            <!-- Download progress -->
            <div id="spotify-download-area" style="margin-top:24px;"></div>
        </div>`;
    }

    function attachMainListeners() {
        $('spotify-disconnect-btn')?.addEventListener('click', disconnect);

        document.querySelectorAll('.spotify-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
    }

    function switchTab(tab) {
        state.activeTab = tab;
        state.openPlaylist = null;
        state.selected.clear();
        updateSelectionUI();
        document.querySelectorAll('.spotify-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        $('spotify-tab-library').style.display   = tab === 'library'    ? '' : 'none';
        $('spotify-tab-playlists').style.display = tab === 'playlists'  ? '' : 'none';
        $('spotify-playlist-view').style.display = 'none';
    }

    function showPlaylistView(name) {
        $('spotify-tab-library').style.display   = 'none';
        $('spotify-tab-playlists').style.display = 'none';
        $('spotify-playlist-view').style.display = '';
        const title = $('spotify-playlist-title');
        if (title) title.textContent = name;
    }

    function renderTracks(tracks, containerId, total) {
        const container = $(containerId);
        if (!container) return;

        if (tracks.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:40px;">No hay canciones.</p>';
            return;
        }

        const countEl = containerId === 'spotify-tracks-body' ? $('spotify-library-count') : null;
        if (countEl) countEl.textContent = total;

        container.innerHTML = tracks.map(t => `
        <div class="spotify-track-row" data-id="${t.id}">
            <label class="spotify-track-check-wrapper">
                <input type="checkbox" class="spotify-track-check" data-id="${t.id}"
                    ${state.selected.has(t.id) ? 'checked' : ''}
                    onchange="SpotifyUI.toggle('${t.id}')">
            </label>
            ${t.image ? `<img class="spotify-track-thumb" src="${t.image}" loading="lazy" alt="">` : '<div class="spotify-track-thumb-placeholder"><i class="fas fa-music"></i></div>'}
            <div class="spotify-track-info">
                <span class="spotify-track-title">${escHtml(t.title)}</span>
                <span class="spotify-track-artist">${escHtml(t.artist)}</span>
            </div>
            <span class="spotify-track-album">${escHtml(t.album)}</span>
            <span class="spotify-track-duration">${fmt_duration(t.duration_ms)}</span>
        </div>`).join('');
    }

    function renderPlaylists() {
        const container = $('spotify-playlists-body');
        if (!container) return;
        const countEl = $('spotify-playlists-count');
        if (countEl) countEl.textContent = state.playlists.length;

        if (state.playlists.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:40px;">No se encontraron playlists.</p>';
            return;
        }

        container.innerHTML = state.playlists.map(pl => `
        <div class="spotify-playlist-card" onclick="SpotifyUI.openPlaylist('${pl.id}', '${escAttr(pl.name)}')">
            ${pl.image ? `<img src="${pl.image}" alt="" class="spotify-playlist-img">` : '<div class="spotify-playlist-img-placeholder"><i class="fas fa-music"></i></div>'}
            <div class="spotify-playlist-info">
                <span class="spotify-playlist-name">${escHtml(pl.name)}</span>
                <span class="spotify-playlist-meta">${pl.track_count} canciones · ${escHtml(pl.owner)}</span>
            </div>
            <i class="fas fa-chevron-right" style="color:var(--text-secondary);margin-left:auto;"></i>
        </div>`).join('');
    }

    function renderDownloadProgress(dl) {
        const area = $('spotify-download-area');
        if (!area) return;

        if (!dl && !state.activeDownloadId) {
            area.innerHTML = '';
            return;
        }

        if (!dl) {
            area.innerHTML = `<div class="spotify-dl-card"><div class="spinner" style="margin:0 auto;"></div></div>`;
            return;
        }

        const statusColor = { completed: '#1DB954', error: '#ef4444', cancelled: '#f59e0b', downloading: '#8b5cf6', starting: '#8b5cf6' };
        const color = statusColor[dl.status] || '#8b5cf6';

        area.innerHTML = `
        <div class="spotify-dl-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                <h4 style="margin:0;display:flex;align-items:center;gap:8px;">
                    <i class="fab fa-spotify" style="color:#1DB954;"></i> Descarga Spotify
                </h4>
                <div style="display:flex;gap:8px;">
                    ${dl.status === 'downloading' ? `<button onclick="SpotifyUI.cancel('${dl.id}')" class="spotify-btn-ghost" style="font-size:0.8rem;"><i class="fas fa-stop"></i> Cancelar</button>` : ''}
                    ${['completed','cancelled','error'].includes(dl.status) ? `<button onclick="SpotifyUI.clearHistory()" class="spotify-btn-ghost" style="font-size:0.8rem;"><i class="fas fa-trash"></i> Limpiar</button>` : ''}
                </div>
            </div>
            <div class="spotify-progress-bar-bg">
                <div class="spotify-progress-bar-fill" style="width:${dl.progress}%;background:${color};"></div>
            </div>
            <p style="margin:8px 0 4px;font-size:0.9rem;">${escHtml(dl.message || '')}</p>
            <p style="color:var(--text-secondary);font-size:0.8rem;margin:0;">
                ${dl.completed || 0}/${dl.total || 0} procesadas
                ${dl.failed ? ` · <span style="color:#ef4444">${dl.failed} fallidas</span>` : ''}
            </p>
        </div>`;
    }

    function showLoading(containerId, clear) {
        const el = $(containerId);
        if (el && clear) el.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
    }

    function updateLoadMoreBtn(id, show) {
        const btn = $(id);
        if (btn) btn.style.display = show ? 'inline-flex' : 'none';
    }

    // -----------------------------------------------------------------------
    // Security helpers
    // -----------------------------------------------------------------------
    function escHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(str) {
        return String(str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    // -----------------------------------------------------------------------
    // Public API (called from HTML via onclick)
    // -----------------------------------------------------------------------
    window.SpotifyUI = {
        toggle:            id => { toggleSelect(id); refreshCheckboxes(); },
        selectAllVisible:  () => {
            const tracks = state.openPlaylist ? state.openPlaylist.tracks : state.libraryTracks;
            selectAll(tracks);
        },
        clearSelection,
        startDownload,
        openPlaylist,
        closePlaylist:     () => {
            state.openPlaylist = null;
            state.selected.clear();
            updateSelectionUI();
            $('spotify-playlist-view').style.display = 'none';
            $('spotify-tab-playlists').style.display = '';
        },
        loadMoreLibrary:   () => loadLibrary(state.libraryOffset),
        loadMorePlaylist:  () => {
            if (state.openPlaylist) loadPlaylistPage(state.openPlaylist.id, state.openPlaylist.offset);
        },
        cancel:            cancelDownload,
        clearHistory,
    };

    // -----------------------------------------------------------------------
    // Module init
    // -----------------------------------------------------------------------
    window.initSpotify = function () {
        // Restore active download on section open if any
        if (state.activeDownloadId) {
            pollStatus(state.activeDownloadId);
            startPoll(state.activeDownloadId);
        }
        init();
    };
})();
