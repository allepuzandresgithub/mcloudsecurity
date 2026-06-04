// right-panel.js - Panel de información desplegable desde la derecha

let rightPanelInitialized = false;
let currentSongDetail = null;

function initRightPanel() {
    if (rightPanelInitialized) return;
    
    console.log('📱 Inicializando panel derecho desplegable...');
    
    // Crear elementos del panel si no existen
    createRightPanelElements();
    
    // Configurar gestos táctiles
    setupTouchGestures();
    
    rightPanelInitialized = true;
    console.log('✅ Panel derecho inicializado');
}

function createRightPanelElements() {
    // Verificar si ya existen
    if (document.getElementById('right-panel-mobile')) return;
    
    const body = document.body;
    
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'right-panel-overlay';
    overlay.id = 'right-panel-overlay';
    
    // Crear panel
    const panel = document.createElement('div');
    panel.className = 'right-panel-mobile';
    panel.id = 'right-panel-mobile';
    
    body.appendChild(overlay);
    body.appendChild(panel);
    
    // Configurar eventos
    document.getElementById('right-panel-close').addEventListener('click', closeRightPanel);
    overlay.addEventListener('click', closeRightPanel);
    
    // Detectar gesto de scroll hacia la derecha
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchEndX - touchStartX;
        
        // Si el swipe es hacia la derecha y estamos cerca del borde izquierdo
        if (diff > swipeThreshold && touchStartX < 50) {
            const panel = document.getElementById('right-panel-mobile');
            if (panel && !panel.classList.contains('active') && currentSongDetail) {
                openRightPanel();
            }
        }
    }
}

function setupTouchGestures() {
    const panel = document.getElementById('right-panel-mobile');
    if (!panel) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    
    panel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    panel.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - touchStartX;
        const diffY = Math.abs(touchY - touchStartY);
        
        // Si el movimiento es principalmente horizontal y hacia la izquierda
        if (diffY < 50 && diffX < -30) {
            e.preventDefault();
            panel.style.transform = `translateX(${Math.max(-100, diffX)}px)`;
        }
    }, { passive: false });
    
    panel.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        
        panel.style.transform = '';
        
        if (diffX < -50) {
            closeRightPanel();
        }
    }, { passive: true });
}

async function showSongDetail(song) {
    if (!song) return;
    
    currentSongDetail = song;
    
    const panel = document.getElementById('right-panel-mobile');
    const content = document.getElementById('right-panel-content');
    
    if (!panel || !content) return;
    
    // Mostrar loading
    content.innerHTML = `
        <div class="loading-state" style="padding: 50px;">
            <div class="spinner"></div>
            <p>Cargando información...</p>
        </div>
    `;
    
    // Abrir panel
    openRightPanel();
    
    // Cargar información detallada
    try {
        // Intentar obtener información adicional del servidor
        let duration = song.duration;
        if (duration === '0:00' || duration === '0:00:00') {
            const response = await fetch('/api/durations/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: [song.name] })
            });
            if (response.ok) {
                const durations = await response.json();
                if (durations[song.name] && durations[song.name] !== '0:00') {
                    duration = durations[song.name];
                }
            }
        }
        
        const isFavorited = window.isSongFavorited ? window.isSongFavorited(song.name) : false;
        const extension = song.name.split('.').pop().toUpperCase();
        
        content.innerHTML = `
            <div class="song-detail-cover" onclick="expandCover('${song.cover_url}', '${song.name.replace(/\.[^/.]+$/, '')}')">
                ${song.has_cover && song.cover_url && !song.cover_url.includes('default-cover') ? 
                    `<img src="${song.cover_url}" alt="${song.name}">` :
                    `<div class="cover-placeholder" style="background: ${song.color}">
                        <i class="fas fa-music"></i>
                    </div>`
                }
            </div>
            <div class="song-detail-info">
                <h3 class="song-detail-title">${song.name.replace(/\.[^/.]+$/, '')}</h3>
                <p class="song-detail-artist">MusicCloud</p>
            </div>
            <div class="song-detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Duración</span>
                    <span class="meta-value"><i class="fas fa-clock"></i> ${duration}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Tamaño</span>
                    <span class="meta-value"><i class="fas fa-hdd"></i> ${song.size}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Formato</span>
                    <span class="meta-value"><i class="fas fa-${song.type === 'video' ? 'video' : 'music'}"></i> ${extension}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Fecha</span>
                    <span class="meta-value"><i class="fas fa-calendar"></i> ${song.date}</span>
                </div>
            </div>
            <div class="song-detail-actions">
                <button class="detail-action-btn" onclick="playFromDetail()">
                    <i class="fas fa-play"></i>
                    <span>Reproducir</span>
                </button>
                <button class="detail-action-btn" onclick="addToQueueFromDetail()">
                    <i class="fas fa-plus"></i>
                    <span>Cola</span>
                </button>
                <button class="detail-action-btn ${isFavorited ? 'favorited' : ''}" onclick="toggleFavoriteFromDetail()" id="detail-favorite-btn">
                    <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                    <span>${isFavorited ? 'Favorito' : 'Guardar'}</span>
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando detalles:', error);
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error al cargar información</h4>
                <p>${error.message}</p>
                <button class="btn-retry" onclick="showSongDetail(currentSongDetail)">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function openRightPanel() {
    const panel = document.getElementById('right-panel-mobile');
    const overlay = document.getElementById('right-panel-overlay');
    
    if (panel && overlay) {
        panel.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Mostrar indicador de cierre
        setTimeout(() => {
            if (panel.classList.contains('active')) {
                // Mostrar sugerencia de swipe para cerrar
            }
        }, 1000);
    }
}

function closeRightPanel() {
    const panel = document.getElementById('right-panel-mobile');
    const overlay = document.getElementById('right-panel-overlay');
    
    if (panel && overlay) {
        panel.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Funciones para acciones desde el panel
function playFromDetail() {
    if (currentSongDetail && window.player) {
        window.player.playTrack(currentSongDetail);
        closeRightPanel();
        showSaveIndicator('Reproduciendo', 'play');
    }
}

function addToQueueFromDetail() {
    if (currentSongDetail && window.player) {
        window.player.addToQueue(currentSongDetail);
        showSaveIndicator('Añadido a la cola', 'queue');
    }
}

function toggleFavoriteFromDetail() {
    if (!currentSongDetail) return;
    
    const btn = document.getElementById('detail-favorite-btn');
    const isFavorited = btn.classList.contains('favorited');
    const songName = currentSongDetail.name;
    
    if (isFavorited) {
        btn.classList.remove('favorited');
        btn.innerHTML = '<i class="far fa-heart"></i><span>Guardar</span>';
        if (window.removeFromFavorites) {
            window.removeFromFavorites(songName);
        }
        showSaveIndicator('Eliminado de favoritos', 'remove');
    } else {
        btn.classList.add('favorited');
        btn.innerHTML = '<i class="fas fa-heart"></i><span>Favorito</span>';
        if (window.addToFavorites) {
            window.addToFavorites(songName);
        }
        showSaveIndicator('Guardado en favoritos', 'save');
    }
    
    // Actualizar icono en el reproductor si es la canción actual
    if (window.player && window.player.currentTrack && window.player.currentTrack.name === songName) {
        const playerFav = document.getElementById('favorite-btn');
        if (playerFav) {
            playerFav.classList.toggle('favorited', !isFavorited);
            playerFav.innerHTML = !isFavorited ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        }
    }
}

function showSaveIndicator(message, type) {
    const indicator = document.createElement('div');
    indicator.className = 'save-song-indicator';
    
    let icon = 'fa-check-circle';
    let color = 'var(--success-color)';
    
    switch(type) {
        case 'save':
            icon = 'fa-heart';
            color = 'var(--error-color)';
            break;
        case 'remove':
            icon = 'fa-heart-broken';
            color = 'var(--text-secondary)';
            break;
        case 'queue':
            icon = 'fa-list';
            color = 'var(--primary-color)';
            break;
        case 'play':
            icon = 'fa-play';
            color = 'var(--primary-color)';
            break;
    }
    
    indicator.innerHTML = `
        <i class="fas ${icon}" style="color: ${color};"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.classList.add('fade-out');
        setTimeout(() => indicator.remove(), 300);
    }, 2000);
}

// Función para expandir la carátula
function expandCover(coverUrl, title) {
    const container = document.createElement('div');
    container.className = 'fullscreen-cover-fullscreen';
    container.innerHTML = `
        <button class="close-fullscreen-cover">
            <i class="fas fa-times"></i>
        </button>
        ${coverUrl && !coverUrl.includes('default-cover') ? 
            `<img src="${coverUrl}" alt="${title}">` :
            `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--gradient-primary);">
                <i class="fas fa-music" style="font-size: 200px; color: white;"></i>
            </div>`
        }
    `;
    
    document.body.appendChild(container);
    
    setTimeout(() => container.classList.add('active'), 10);
    
    container.addEventListener('click', (e) => {
        if (e.target === container || e.target.classList.contains('close-fullscreen-cover')) {
            container.classList.remove('active');
            setTimeout(() => container.remove(), 300);
        }
    });
}

// Modificar la función attachSongEventListeners en library.js para añadir el click en la carátula
function enhanceSongEventListeners() {
    document.querySelectorAll('.song-cover').forEach(cover => {
        cover.addEventListener('click', (e) => {
            e.stopPropagation();
            const songItem = cover.closest('.song-item');
            const songName = songItem.dataset.songName;
            const song = window.musicLibrary.find(s => s.name === songName);
            
            if (song) {
                // Mostrar en el panel derecho
                if (window.showSongDetail) {
                    window.showSongDetail(song);
                }
                
                // También abrir en el reproductor grande
                const fullscreenPlayer = document.getElementById('fullscreen-player');
                if (fullscreenPlayer && !fullscreenPlayer.classList.contains('active')) {
                    if (window.player && window.player.currentTrack) {
                        window.player.syncFullscreenPlayer();
                    }
                }
            }
        });
        
        // Añadir icono de expandir
        const expandIcon = document.createElement('div');
        expandIcon.className = 'cover-expand';
        expandIcon.innerHTML = '<i class="fas fa-expand"></i>';
        cover.appendChild(expandIcon);
    });
}

// Exportar funciones
window.initRightPanel = initRightPanel;
window.showSongDetail = showSongDetail;
window.closeRightPanel = closeRightPanel;
window.expandCover = expandCover;
window.playFromDetail = playFromDetail;
window.addToQueueFromDetail = addToQueueFromDetail;
window.toggleFavoriteFromDetail = toggleFavoriteFromDetail;
window.showSaveIndicator = showSaveIndicator;
window.enhanceSongEventListeners = enhanceSongEventListeners;
