// main.js - Punto de entrada principal (con forceReloadLibrary y descarga)

let musicLibrary = [];
let currentSection = 'library';
let currentSearchQuery = '';
let isMobile = false;

// Constantes de caché
const CACHE_KEYS = {
    LIBRARY: 'musiccloud_library_v2',
    THEME: 'musiccloud_theme'
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 MusicCloud Player inicializando...');
    detectDevice();
    applyMobileOptimizations();
    setupConnectionDetection();
    if (window.initUI) window.initUI();
    setupNavigation();
    setupSearch();
    if (window.initLibrary) window.initLibrary();
    else loadLibrary();
    if (window.initPlayer) window.initPlayer();
    // Restaurar reproducción anterior (espera a que el DOM y la librería arranquen)
    setTimeout(() => { if (window.player) window.player.restorePlaybackState(); }, 1500);
    loadInitialData();
    setupMobileMenu();
    setupKeyboardShortcuts();
    if (window.initYouTubeDownloader) window.initYouTubeDownloader();
    if (window.initUploader) window.initUploader();
    
    const playerFavoriteBtn = document.getElementById('favorite-btn');
    if (playerFavoriteBtn) {
        playerFavoriteBtn.addEventListener('click', () => {
            if (window.player && window.player.currentTrack) {
                const songName = window.player.currentTrack.name;
                const isFavorited = playerFavoriteBtn.classList.contains('favorited');
                if (isFavorited) {
                    playerFavoriteBtn.classList.remove('favorited');
                    playerFavoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                    removeFromFavorites(songName);
                } else {
                    playerFavoriteBtn.classList.add('favorited');
                    playerFavoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
                    addToFavorites(songName);
                }
                updateFavoriteIcons();
            }
        });
    }
    console.log('✅ MusicCloud Player inicializado');
});

function detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);
    if (isMobile) document.body.classList.add('mobile-device');
    else document.body.classList.add('desktop-device');
}

function applyMobileOptimizations() {
    if (!isMobile) return;
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) menuBtn.style.display = 'flex';
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.style.WebkitOverflowScrolling = 'touch';
        contentArea.style.height = 'calc(100vh - 140px)';
    }
    document.querySelectorAll('button, .btn-action').forEach(btn => {
        btn.style.minHeight = '44px';
        btn.style.minWidth = '44px';
    });
}

function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        return true;
    } catch(e) { return false; }
}
function loadFromCache(key, ttl = 3600000) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > ttl) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch(e) { return null; }
}

function loadInitialData() {
    const cached = loadFromCache(CACHE_KEYS.LIBRARY, 300000);
    if (cached && cached.length) {
        musicLibrary = cached;
        window.musicLibrary = cached;
        if (window.renderLibrary) window.renderLibrary(cached);
        updateSongCount(cached.length);
    }
    setTimeout(() => loadLibrary(), 100);
}

async function loadLibrary(force = false) {
    console.log('📚 Cargando biblioteca...');
    const container = document.getElementById('library-container');
    if (container && !force) {
        container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando canciones...</p></div>';
    }
    try {
        const url = `/api/files?nocache=true&page=1&per_page=200&t=${Date.now()}`;
        const response = await fetch(url);
        const data = await response.json();
        const files = data.files || [];
        musicLibrary = files;
        window.musicLibrary = files;
        saveToCache(CACHE_KEYS.LIBRARY, files);
        if (window.renderLibrary) window.renderLibrary(files);
        updateSongCount(files.length);
        return files;
    } catch (error) {
        console.error(error);
        if (container) container.innerHTML = `<div class="empty-state">Error</div>`;
        return [];
    }
}

window.forceReloadLibrary = async function() {
    console.log('🔄 Forzando recarga de biblioteca y carátulas...');
    document.querySelectorAll('.song-cover img').forEach(img => {
        const src = img.src.split('?')[0];
        img.src = src + '?t=' + Date.now();
    });
    localStorage.removeItem(CACHE_KEYS.LIBRARY);
    await loadLibrary(true);
};

function renderLibrary(songs) {
    if (window.renderLibrary) window.renderLibrary(songs);
    else console.warn('renderLibrary no definido');
}

function updateSongCount(count) {
    // Actualiza solo el contador en ajustes (el sidebar lo gestiona admin.js)
    const totalFilesEl = document.getElementById('total-files');
    if (totalFilesEl) totalFilesEl.textContent = count;
}

// Favoritos
function addToFavorites(songName) {
    let favs = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    if (!favs.includes(songName)) {
        favs.push(songName);
        localStorage.setItem('musicFavorites', JSON.stringify(favs));
        if (window.showSaveIndicator) window.showSaveIndicator('Guardado en favoritos', 'save');
        if (currentSection === 'favorites') loadFavorites();
    }
}
function removeFromFavorites(songName) {
    let favs = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    const newFavs = favs.filter(f => f !== songName);
    localStorage.setItem('musicFavorites', JSON.stringify(newFavs));
    if (window.showSaveIndicator) window.showSaveIndicator('Eliminado de favoritos', 'remove');
    if (currentSection === 'favorites') loadFavorites();
}
function isSongFavorited(songName) {
    const favs = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    return favs.includes(songName);
}
function updateFavoriteIcons() {
    const favs = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    document.querySelectorAll('.favorite-song, .favorite-card').forEach(btn => {
        const song = btn.closest('.song-item')?.dataset.songName || btn.dataset.song;
        if (song) {
            const isFav = favs.includes(song);
            btn.classList.toggle('favorited', isFav);
            btn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        }
    });
    const playerFav = document.getElementById('favorite-btn');
    if (playerFav && window.player?.currentTrack) {
        const isFav = favs.includes(window.player.currentTrack.name);
        playerFav.classList.toggle('favorited', isFav);
        playerFav.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    }
}

async function loadFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    const favs = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    if (!favs.length) {
        container.innerHTML = '<div class="empty-state">No hay favoritos</div>';
        return;
    }
    let allSongs = window.musicLibrary;
    if (!allSongs || !allSongs.length) await loadLibrary();
    allSongs = window.musicLibrary;
    const favoriteSongs = allSongs.filter(s => favs.includes(s.name));
    if (!favoriteSongs.length) {
        container.innerHTML = '<div class="empty-state">No se encontraron favoritos</div>';
        return;
    }
    const isGridView = document.getElementById('grid-view')?.classList.contains('active');
    container.classList.toggle('grid-view', isGridView);
    container.innerHTML = favoriteSongs.map(song => {
        const coverUrl = song.cover_url ? `${song.cover_url}?t=${Date.now()}` : '';
        return `
        <div class="song-item" data-song-name="${song.name}">
            <div class="song-cover">
                ${song.has_cover ? `<img src="${coverUrl}">` : `<div class="cover-placeholder" style="background: ${song.color}"><i class="fas fa-music"></i></div>`}
            </div>
            <div class="song-info">
                <div class="song-title">${escapeHtml(song.name.replace(/\.[^/.]+$/, ''))}</div>
                <div class="song-meta"><span>${song.duration}</span><span>${song.size}</span></div>
            </div>
            <div class="song-actions">
                <button class="song-action-btn play-song"><i class="fas fa-play"></i></button>
                <button class="song-action-btn queue-song"><i class="fas fa-plus"></i></button>
                <button class="song-action-btn download-song"><i class="fas fa-download"></i></button>
                <button class="song-action-btn favorite-song favorited"><i class="fas fa-heart"></i></button>
                <button class="song-action-btn delete-song"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
    if (window.attachSongEventListeners) window.attachSongEventListeners();
}

function setupSearch() {
    const input = document.getElementById('search-input');
    const clear = document.getElementById('search-clear');
    if (!input) return;
    let timeout;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            currentSearchQuery = input.value.trim();
            applySearch();
        }, 400);
    });
    if (clear) clear.addEventListener('click', () => { input.value = ''; currentSearchQuery = ''; applySearch(); });
}
async function applySearch() {
    if (!currentSearchQuery) {
        if (currentSection === 'library') renderLibrary(window.musicLibrary);
        else if (currentSection === 'favorites') loadFavorites();
        return;
    }
    const q = currentSearchQuery.toLowerCase();
    if (q.length < 2) return;
    if (currentSection === 'library') {
        const filtered = window.musicLibrary.filter(s => s.name.toLowerCase().includes(q));
        renderLibrary(filtered);
    } else if (currentSection === 'favorites') {
        const favs = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
        const all = window.musicLibrary;
        const favSongs = all.filter(s => favs.includes(s.name) && s.name.toLowerCase().includes(q));
        const container = document.getElementById('favorites-container');
        if (container) {
            if (!favSongs.length) container.innerHTML = '<div class="empty-state">No hay resultados</div>';
            else renderListView(favSongs, container);
            if (window.attachSongEventListeners) window.attachSongEventListeners();
        }
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}
function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    const target = document.getElementById(`${section}-section`);
    if (target) target.style.display = 'block';
    if (section === 'library') renderLibrary(window.musicLibrary);
    else if (section === 'favorites') loadFavorites();
    else if (section === 'youtube-downloader' && window.loadYouTubeDownloads) window.loadYouTubeDownloads();
}

function setupConnectionDetection() {
    window.addEventListener('online', () => loadLibrary());
    window.addEventListener('offline', () => document.body.classList.add('offline'));
}
function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (btn && sidebar && overlay) {
        btn.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); });
        overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); });
    }
}
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement !== document.getElementById('search-input')) {
            e.preventDefault();
            if (window.player) window.player.togglePlay();
        }
    });
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
}
function renderListView(songs, container) {
    if (!container) return;
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'songs-list';
    songs.forEach(song => {
        const coverUrl = song.cover_url ? `${song.cover_url}?t=${Date.now()}` : '';
        const item = document.createElement('div');
        item.className = 'song-item';
        item.dataset.songName = song.name;
        item.innerHTML = `
            <div class="song-cover">${song.has_cover ? `<img src="${coverUrl}">` : `<div class="cover-placeholder" style="background: ${song.color}"><i class="fas fa-music"></i></div>`}</div>
            <div class="song-info"><div class="song-title">${escapeHtml(song.name.replace(/\.[^/.]+$/, ''))}</div><div class="song-meta"><span>${song.duration}</span><span>${song.size}</span></div></div>
            <div class="song-actions">
                <button class="song-action-btn play-song"><i class="fas fa-play"></i></button>
                <button class="song-action-btn queue-song"><i class="fas fa-plus"></i></button>
                <button class="song-action-btn download-song"><i class="fas fa-download"></i></button>
                <button class="song-action-btn favorite-song ${isSongFavorited(song.name) ? 'favorited' : ''}"><i class="${isSongFavorited(song.name) ? 'fas' : 'far'} fa-heart"></i></button>
                <button class="song-action-btn delete-song"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
    container.appendChild(list);
}

window.loadLibrary = loadLibrary;
window.forceReloadLibrary = window.forceReloadLibrary;
window.renderLibrary = renderLibrary;
window.updateSongCount = updateSongCount;
window.addToFavorites = addToFavorites;
window.removeFromFavorites = removeFromFavorites;
window.isSongFavorited = isSongFavorited;
window.loadFavorites = loadFavorites;
window.updateFavoriteIcons = updateFavoriteIcons;
window.switchSection = switchSection;
window.musicLibrary = musicLibrary;
