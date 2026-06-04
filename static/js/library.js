// library.js - Manejo de biblioteca con carga progresiva y descarga corregida

let isLoadingMore = false;
let hasMoreFiles = true;
let currentPage = 1;
const FILES_PER_PAGE = 50;
let totalSongs = 0;

let libraryContainer, progressBar, progressText, loadingIndicator;

function initElements() {
    libraryContainer = document.getElementById('library-container');
    progressBar = document.getElementById('library-progress-bar');
    progressText = document.getElementById('library-progress-text');
    loadingIndicator = document.getElementById('loading-indicator');
}

async function loadLibrary() {
    try {
        initElements();
        currentPage = 1;
        hasMoreFiles = true;
        if (libraryContainer) {
            libraryContainer.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Cargando música...</p></div>`;
        }
        const response = await fetch(`/api/files?page=1&per_page=${FILES_PER_PAGE}&nocache=true`);
        const data = await response.json();
        window.musicLibrary = data.files;
        hasMoreFiles = data.has_more;
        totalSongs = data.total;
        if (window.updateSongCount) window.updateSongCount(totalSongs);
        renderLibrary(window.musicLibrary);
        updateProgressBar();
        setupInfiniteScroll();
        setTimeout(startThumbnailProcessing, 2000);
        return window.musicLibrary;
    } catch (error) {
        console.error(error);
        if (libraryContainer) libraryContainer.innerHTML = `<div class="empty-state">Error</div>`;
        return [];
    }
}

function renderLibrary(songs) {
    initElements(); // asegurar refs actualizados
    if (!libraryContainer) return;
    if (!songs.length) {
        libraryContainer.innerHTML = '<div class="empty-state">No hay canciones</div>';
        return;
    }

    // Leer modo desde localStorage (fuente de verdad) y sincronizar clase + botones
    const savedMode = localStorage.getItem('musicViewMode') || 'list';
    const isGridView = savedMode === 'grid';
    const gridBtn = document.getElementById('grid-view');
    const listBtn = document.getElementById('list-view');
    if (gridBtn && listBtn) {
        gridBtn.classList.toggle('active', isGridView);
        listBtn.classList.toggle('active', !isGridView);
    }
    libraryContainer.classList.toggle('grid-view', isGridView);
    const favorites = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    
    if (isGridView) {
        libraryContainer.classList.add('grid-view');
        libraryContainer.innerHTML = songs.map(song => {
            const isFav = favorites.includes(song.name);
            const coverUrl = song.cover_url || '';
            return `
            <div class="song-item" data-song-name="${song.name}">
                <div class="song-cover">
                    ${song.has_cover ? `<img src="${coverUrl}" alt="${escapeHtml(song.name)}" loading="lazy">` :
                    `<div class="cover-placeholder" style="background: ${song.color}"><i class="fas fa-music"></i></div>`}
                </div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name.replace(/\.[^/.]+$/, ''))}</div>
                    <div class="song-meta"><span><i class="fas fa-clock"></i> ${song.duration}</span></div>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn play-song" title="Reproducir"><i class="fas fa-play"></i></button>
                    <button class="song-action-btn queue-song" title="Cola"><i class="fas fa-plus"></i></button>
                    <button class="song-action-btn download-song" title="Descargar"><i class="fas fa-download"></i></button>
                    <button class="song-action-btn favorite-song ${isFav ? 'favorited' : ''}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                    <button class="song-action-btn delete-song" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    } else {
        libraryContainer.classList.remove('grid-view');
        libraryContainer.innerHTML = songs.map(song => {
            const isFav = favorites.includes(song.name);
            const coverUrl = song.cover_url || '';
            return `
            <div class="song-item" data-song-name="${song.name}">
                <div class="song-cover">
                    ${song.has_cover ? `<img src="${coverUrl}" alt="${escapeHtml(song.name)}" loading="lazy">` :
                    `<div class="cover-placeholder" style="background: ${song.color}"><i class="fas fa-music"></i></div>`}
                </div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name.replace(/\.[^/.]+$/, ''))}</div>
                    <div class="song-meta">
                        <span><i class="fas fa-clock"></i> ${song.duration}</span>
                        <span><i class="fas fa-hdd"></i> ${song.size}</span>
                        <span><i class="fas fa-calendar"></i> ${song.date}</span>
                    </div>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn play-song"><i class="fas fa-play"></i></button>
                    <button class="song-action-btn queue-song"><i class="fas fa-plus"></i></button>
                    <button class="song-action-btn download-song"><i class="fas fa-download"></i></button>
                    <button class="song-action-btn favorite-song ${isFav ? 'favorited' : ''}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                    <button class="song-action-btn delete-song"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }
    attachSongEventListeners();
    enhanceCoverClickListeners();
}

function attachSongEventListeners() {
    document.querySelectorAll('.song-item').forEach(item => {
        const songName = item.dataset.songName;
        const song = window.musicLibrary?.find(s => s.name === songName);
        if (!song) return;
        
        item.querySelector('.play-song')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.player) window.player.playTrack(song);
        });
        item.querySelector('.queue-song')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.player) window.player.addToQueue(song);
        });
        item.querySelector('.download-song')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await downloadSong(song.name);
        });
        const favBtn = item.querySelector('.favorite-song');
        favBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isFav = favBtn.classList.contains('favorited');
            if (isFav) {
                favBtn.classList.remove('favorited');
                favBtn.innerHTML = '<i class="far fa-heart"></i>';
                if (window.removeFromFavorites) window.removeFromFavorites(song.name);
            } else {
                favBtn.classList.add('favorited');
                favBtn.innerHTML = '<i class="fas fa-heart"></i>';
                if (window.addToFavorites) window.addToFavorites(song.name);
            }
        });
        item.querySelector('.delete-song')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(`¿Eliminar "${song.name}"?`)) return;
            const btn = e.currentTarget;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const res = await fetch(`/api/delete/${encodeURIComponent(song.name)}`, { method: 'DELETE' });
            if (res.ok) {
                item.remove();
                window.musicLibrary = window.musicLibrary.filter(s => s.name !== song.name);
                totalSongs--;
                updateProgressBar();
            } else {
                btn.innerHTML = '<i class="fas fa-trash"></i>';
            }
        });
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.song-actions')) {
                if (window.player) {
                    window.player.playTrack(song);
                    // En móvil, abrir reproductor grande automáticamente
                    if (window.innerWidth <= 768) {
                        setTimeout(() => {
                            document.getElementById('fullscreen-player')?.classList.add('active');
                            window.player.syncFullscreenPlayer?.();
                        }, 100);
                    }
                }
            }
        });
    });
}

// FUNCIÓN DE DESCARGA CORREGIDA
async function downloadSong(songName) {
    try {
        // Codificar el nombre para la URL
        const encodedName = encodeURIComponent(songName);
        const url = `/api/download/${encodedName}`;
        console.log(`📥 Descargando: ${songName} -> ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = songName;  // Nombre original para el archivo descargado
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        if (window.showSaveIndicator) {
            window.showSaveIndicator(`Descargando: ${songName}`, 'download');
        }
    } catch (error) {
        console.error('Error al descargar:', error);
        if (window.showSaveIndicator) {
            window.showSaveIndicator('Error al descargar', 'error');
        }
    }
}

function updateProgressBar() {
    const progressEl = document.getElementById('library-progress');
    if (!progressEl) return;

    const loaded  = window.musicLibrary?.length || 0;
    const total   = totalSongs || 0;
    const percent = total > 0 ? (loaded / total) * 100 : 0;

    progressEl.classList.remove('progress-done');
    progressEl.classList.add('progress-active');

    if (progressBar) progressBar.style.width = `${percent}%`;

    if (loaded >= total && total > 0) {
        setTimeout(() => {
            progressEl.classList.add('progress-done');
            setTimeout(() => progressEl.classList.remove('progress-active'), 450);
        }, 1800);
    }
}

function setupInfiniteScroll() {
    if (window.intersectionObserver) window.intersectionObserver.disconnect();
    const lastItem = libraryContainer?.querySelector('.song-item:last-child');
    if (!lastItem) return;
    window.intersectionObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreFiles && !isLoadingMore) loadMoreFiles();
    }, { rootMargin: '100px' });
    window.intersectionObserver.observe(lastItem);
}

async function loadMoreFiles() {
    isLoadingMore = true;
    const nextPage = currentPage + 1;
    const res = await fetch(`/api/files/more?page=${nextPage}&per_page=${FILES_PER_PAGE}`);
    const data = await res.json();
    if (data.files.length) {
        window.musicLibrary = [...window.musicLibrary, ...data.files];
        appendSongsToDOM(data.files);
        currentPage++;
        hasMoreFiles = data.has_more;
        updateProgressBar();
    }
    isLoadingMore = false;
    setupInfiniteScroll();
}

function appendSongsToDOM(newSongs) {
    const isGridView = document.getElementById('grid-view')?.classList.contains('active');
    const favorites = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
    let html = '';
    newSongs.forEach(song => {
        const isFav = favorites.includes(song.name);
        const coverUrl = song.cover_url || '';
        if (isGridView) {
            html += `<div class="song-item" data-song-name="${song.name}">
                <div class="song-cover">${song.has_cover ? `<img src="${coverUrl}">` : `<div class="cover-placeholder" style="background: ${song.color}"><i class="fas fa-music"></i></div>`}</div>
                <div class="song-info"><div class="song-title">${escapeHtml(song.name.replace(/\.[^/.]+$/, ''))}</div></div>
                <div class="song-actions">
                    <button class="song-action-btn play-song"><i class="fas fa-play"></i></button>
                    <button class="song-action-btn queue-song"><i class="fas fa-plus"></i></button>
                    <button class="song-action-btn download-song"><i class="fas fa-download"></i></button>
                    <button class="song-action-btn favorite-song ${isFav ? 'favorited' : ''}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                    <button class="song-action-btn delete-song"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        } else {
            html += `<div class="song-item" data-song-name="${song.name}">
                <div class="song-cover">${song.has_cover ? `<img src="${coverUrl}">` : `<div class="cover-placeholder" style="background: ${song.color}"><i class="fas fa-music"></i></div>`}</div>
                <div class="song-info">
                    <div class="song-title">${escapeHtml(song.name.replace(/\.[^/.]+$/, ''))}</div>
                    <div class="song-meta"><span><i class="fas fa-clock"></i> ${song.duration}</span><span><i class="fas fa-hdd"></i> ${song.size}</span></div>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn play-song"><i class="fas fa-play"></i></button>
                    <button class="song-action-btn queue-song"><i class="fas fa-plus"></i></button>
                    <button class="song-action-btn download-song"><i class="fas fa-download"></i></button>
                    <button class="song-action-btn favorite-song ${isFav ? 'favorited' : ''}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                    <button class="song-action-btn delete-song"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }
    });
    libraryContainer.insertAdjacentHTML('beforeend', html);
    attachSongEventListeners();
}

function enhanceCoverClickListeners() {
    document.querySelectorAll('.song-cover').forEach(cover => {
        if (cover.dataset.listener) return;
        cover.dataset.listener = 'true';
        cover.addEventListener('click', (e) => {
            e.stopPropagation();
            const songItem = cover.closest('.song-item');
            const songName = songItem?.dataset.songName;
            const song = window.musicLibrary?.find(s => s.name === songName);
            if (song && window.showSongDetail) window.showSongDetail(song);
        });
        if (!cover.querySelector('.cover-expand')) {
            const expand = document.createElement('div');
            expand.className = 'cover-expand';
            expand.innerHTML = '<i class="fas fa-expand"></i>';
            cover.appendChild(expand);
        }
    });
}

function startThumbnailProcessing() {
    fetch('/api/thumbnails/process', { method: 'POST' }).catch(e => console.log);
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.loadLibrary   = loadLibrary;
window.renderLibrary = renderLibrary;   // exportar para que ui.js pueda cambiar vista
window.initLibrary   = () => { loadLibrary(); };
window.downloadSong  = downloadSong;
