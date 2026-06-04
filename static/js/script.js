// YouTube Music Player - JavaScript

// Variables globales
let currentTrackIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let isMuted = false;
let currentVolume = 80;
let tracks = [];
let filteredTracks = [];
let playQueue = [];

// Elementos DOM
const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-icon');
const progressBar = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const currentTrackTitle = document.getElementById('current-track-title');
const currentTrackArtist = document.getElementById('current-track-artist');
const libraryGrid = document.getElementById('library-grid');
const queueList = document.getElementById('queue-list');
const searchInput = document.getElementById('search-input');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadLibrary();
    loadStats();
    setupEventListeners();
    
    // Cargar volumen guardado
    const savedVolume = localStorage.getItem('musicPlayerVolume');
    if (savedVolume) {
        currentVolume = parseInt(savedVolume);
        audioPlayer.volume = currentVolume / 100;
        document.querySelector('.volume-slider').value = currentVolume;
    }
    
    // Verificar si hay archivos
    checkForFiles();
});

// Configurar event listeners
function setupEventListeners() {
    // Reproductor de audio
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', function() {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('ended', playNext);
    
    // Buscador
    searchInput.addEventListener('input', debounce(searchTracks, 300));
    
    // Drag and drop para subir
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        dropArea.addEventListener('drop', handleDrop);
        dropArea.addEventListener('dragover', () => {
            dropArea.classList.add('drag-over');
        });
        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('drag-over');
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// Funciones del reproductor
function playTrack(trackIndex) {
    if (trackIndex < 0 || trackIndex >= filteredTracks.length) return;
    
    const track = filteredTracks[trackIndex];
    currentTrackIndex = trackIndex;
    
    // Actualizar UI
    currentTrackTitle.textContent = track.name.replace('.mp3', '').replace('.mp4', '');
    currentTrackArtist.textContent = 'YouTube Music';
    
    // Actualizar información en el panel derecho
    updateTrackInfo(track);
    
    // Establecer fuente de audio
    audioPlayer.src = track.path;
    
    // Reproducir
    audioPlayer.play();
    isPlaying = true;
    playBtn.classList.remove('fa-play');
    playBtn.classList.add('fa-pause');
    
    // Actualizar tarjetas
    updatePlayingCard();
    
    // Añadir a la cola si no está
    if (!playQueue.includes(trackIndex)) {
        playQueue.push(trackIndex);
        updateQueue();
    }
}

function togglePlay() {
    if (!audioPlayer.src) {
        if (filteredTracks.length > 0) {
            playTrack(0);
        }
        return;
    }
    
    if (isPlaying) {
        audioPlayer.pause();
        playBtn.classList.remove('fa-pause');
        playBtn.classList.add('fa-play');
    } else {
        audioPlayer.play();
        playBtn.classList.remove('fa-play');
        playBtn.classList.add('fa-pause');
    }
    isPlaying = !isPlaying;
}

function playNext() {
    if (filteredTracks.length === 0) return;
    
    let nextIndex;
    if (isShuffle) {
        nextIndex = Math.floor(Math.random() * filteredTracks.length);
    } else {
        nextIndex = (currentTrackIndex + 1) % filteredTracks.length;
    }
    
    if (isRepeat && nextIndex === currentTrackIndex) {
        // Repetir la misma canción
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else {
        playTrack(nextIndex);
    }
}

function playPrevious() {
    if (filteredTracks.length === 0) return;
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = filteredTracks.length - 1;
    
    playTrack(prevIndex);
}

function updateProgress() {
    if (!audioPlayer.duration) return;
    
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.style.width = `${progress}%`;
    
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
}

function seekAudio(event) {
    const progressBar = event.currentTarget;
    const clickPosition = event.offsetX;
    const progressBarWidth = progressBar.clientWidth;
    const percentage = clickPosition / progressBarWidth;
    
    audioPlayer.currentTime = percentage * audioPlayer.duration;
}

function changeVolume(value) {
    currentVolume = value;
    audioPlayer.volume = value / 100;
    localStorage.setItem('musicPlayerVolume', value);
    
    const volumeIcon = document.querySelector('.fa-volume-up');
    if (value == 0) {
        volumeIcon.classList.remove('fa-volume-up');
        volumeIcon.classList.add('fa-volume-mute');
    } else if (value < 50) {
        volumeIcon.classList.remove('fa-volume-up', 'fa-volume-mute');
        volumeIcon.classList.add('fa-volume-down');
    } else {
        volumeIcon.classList.remove('fa-volume-down', 'fa-volume-mute');
        volumeIcon.classList.add('fa-volume-up');
    }
}

function toggleMute() {
    isMuted = !isMuted;
    audioPlayer.muted = isMuted;
    
    const volumeIcon = document.querySelector('.fa-volume-up, .fa-volume-down, .fa-volume-mute');
    if (isMuted) {
        volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down');
        volumeIcon.classList.add('fa-volume-mute');
    } else {
        changeVolume(currentVolume);
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleIcon = document.getElementById('shuffle-icon');
    shuffleIcon.classList.toggle('active', isShuffle);
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const repeatIcon = document.getElementById('repeat-icon');
    repeatIcon.classList.toggle('active', isRepeat);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Funciones de la biblioteca
async function loadLibrary() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/files');
        if (!response.ok) throw new Error('Error al cargar archivos');
        
        tracks = await response.json();
        filteredTracks = [...tracks];
        
        renderLibrary();
        updateQueue();
        
        // Si hay tracks y no hay uno reproduciendo, poner el primero en la cola
        if (tracks.length > 0 && playQueue.length === 0) {
            playQueue = [0];
            updateQueue();
        }
        
    } catch (error) {
        console.error('Error:', error);
        libraryGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar la biblioteca</p>
                <button onclick="loadLibrary()" class="btn-retry">Reintentar</button>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function renderLibrary() {
    if (filteredTracks.length === 0) {
        libraryGrid.innerHTML = `
            <div class="empty-library">
                <i class="fas fa-music"></i>
                <h3>No hay música todavía</h3>
                <p>Usa el botón "Subir" para añadir archivos MP3/MP4</p>
            </div>
        `;
        return;
    }
    
    libraryGrid.innerHTML = filteredTracks.map((track, index) => `
        <div class="music-card ${index === currentTrackIndex ? 'playing' : ''}" 
             data-index="${index}"
             onclick="playTrack(${index})">
            <div class="card-cover">
                <i class="${track.icon}"></i>
                <div class="play-overlay">
                    <button class="play-btn-small" onclick="event.stopPropagation(); playTrack(${index})">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
            <div class="card-content">
                <h4>${track.name.replace('.mp3', '').replace('.mp4', '')}</h4>
                <div class="card-meta">
                    <span>${track.duration}</span>
                    <span>${track.size}</span>
                </div>
                <div class="card-actions">
                    <button class="action-btn-small" onclick="event.stopPropagation(); addToQueue(${index})">
                        <i class="fas fa-plus"></i> Cola
                    </button>
                    <button class="action-btn-small" onclick="event.stopPropagation(); downloadTrack('${track.name}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterByType(type) {
    const filterTags = document.querySelectorAll('.filter-tag');
    filterTags.forEach(tag => tag.classList.remove('active'));
    event.target.classList.add('active');
    
    if (type === 'all') {
        filteredTracks = [...tracks];
    } else if (type === 'audio') {
        filteredTracks = tracks.filter(track => track.type === 'audio');
    } else if (type === 'video') {
        filteredTracks = tracks.filter(track => track.type === 'video');
    } else if (type === 'recent') {
        filteredTracks = [...tracks].sort((a, b) => b.timestamp - a.timestamp);
    }
    
    renderLibrary();
}

function searchTracks() {
    const query = searchInput.value.toLowerCase();
    
    if (!query) {
        filteredTracks = [...tracks];
    } else {
        filteredTracks = tracks.filter(track => 
            track.name.toLowerCase().includes(query)
        );
    }
    
    renderLibrary();
}

function updatePlayingCard() {
    const cards = document.querySelectorAll('.music-card');
    cards.forEach(card => card.classList.remove('playing'));
    
    if (currentTrackIndex >= 0) {
        const currentCard = document.querySelector(`.music-card[data-index="${currentTrackIndex}"]`);
        if (currentCard) {
            currentCard.classList.add('playing');
            currentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Funciones de la cola
function addToQueue(trackIndex) {
    if (!playQueue.includes(trackIndex)) {
        playQueue.push(trackIndex);
        updateQueue();
        showNotification('Añadido a la cola');
    }
}

function updateQueue() {
    if (playQueue.length === 0) {
        queueList.innerHTML = '<p class="empty-queue">La cola está vacía</p>';
        return;
    }
    
    queueList.innerHTML = playQueue.map((trackIndex, queueIndex) => {
        const track = tracks[trackIndex];
        if (!track) return '';
        
        return `
            <div class="queue-item ${trackIndex === currentTrackIndex ? 'playing' : ''}" 
                 onclick="playTrack(${trackIndex})">
                <div>
                    <strong>${queueIndex + 1}. ${track.name.replace('.mp3', '').replace('.mp4', '')}</strong>
                    <br>
                    <small>${track.duration} • ${track.size}</small>
                </div>
                <button class="queue-remove" onclick="event.stopPropagation(); removeFromQueue(${queueIndex})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

function removeFromQueue(queueIndex) {
    playQueue.splice(queueIndex, 1);
    updateQueue();
}

// Funciones del panel derecho
function updateTrackInfo(track) {
    document.getElementById('info-track-title').textContent = 
        track.name.replace('.mp3', '').replace('.mp4', '');
    document.getElementById('info-track-artist').textContent = 'YouTube Music';
    document.getElementById('info-format').textContent = `Formato: ${track.name.split('.').pop().toUpperCase()}`;
    document.getElementById('info-size').textContent = `Tamaño: ${track.size}`;
    document.getElementById('info-date').textContent = `Fecha: ${track.date}`;
    
    // Intentar cargar carátula (si existe)
    const coverImg = document.getElementById('info-cover-img');
    const coverPlaceholder = document.getElementById('cover-placeholder');
    
    // Por ahora, solo placeholder
    coverImg.src = '';
    coverImg.style.display = 'none';
    coverPlaceholder.style.display = 'flex';
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Error al cargar estadísticas');
        
        const stats = await response.json();
        
        document.getElementById('stat-mp3').textContent = stats.mp3_count || 0;
        document.getElementById('stat-mp4').textContent = stats.mp4_count || 0;
        document.getElementById('stat-size').textContent = stats.total_size || '0 GB';
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Funciones de subida de archivos
function showUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('file-input').value = '';
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        document.getElementById('upload-progress').style.display = 'block';
        document.querySelector('.btn-upload-start').disabled = false;
    }
}

function startUpload() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput.files.length) return;
    
    const formData = new FormData();
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('files', fileInput.files[i]);
    }
    
    // Simular subida (necesitarías backend para esto)
    simulateUpload();
}

function simulateUpload() {
    const uploadBar = document.getElementById('upload-bar');
    const uploadStatus = document.getElementById('upload-status');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        uploadBar.style.width = `${progress}%`;
        uploadStatus.textContent = `Subiendo... ${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            uploadStatus.textContent = '¡Subida completada!';
            
            setTimeout(() => {
                closeUploadModal();
                loadLibrary();
                loadStats();
                showNotification('Archivos subidos correctamente');
            }, 1000);
        }
    }, 100);
}

// Funciones auxiliares
function showLoading(show) {
    if (show) {
        libraryGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando tu biblioteca...</p>
            </div>
        `;
    }
}

function showNotification(message, type = 'success') {
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animación
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function downloadTrack(filename) {
    window.open(`/music/${encodeURIComponent(filename)}`, '_blank');
}

function toggleRightPanel() {
    document.querySelector('.right-panel').classList.toggle('active');
}

function toggleView() {
    libraryGrid.classList.toggle('list-view');
    const viewBtn = document.querySelector('.btn-view i');
    if (libraryGrid.classList.contains('list-view')) {
        viewBtn.classList.remove('fa-th-list');
        viewBtn.classList.add('fa-th-large');
    } else {
        viewBtn.classList.remove('fa-th-large');
        viewBtn.classList.add('fa-th-list');
    }
}

function toggleSort() {
    // Alternar entre orden por nombre y fecha
    if (filteredTracks[0]?.name < filteredTracks[1]?.name) {
        filteredTracks.sort((a, b) => b.name.localeCompare(a.name));
    } else {
        filteredTracks.sort((a, b) => a.name.localeCompare(b.name));
    }
    renderLibrary();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function checkForFiles() {
    // Verificar si hay archivos cada 30 segundos
    setInterval(() => {
        if (tracks.length === 0) {
            loadLibrary();
        }
    }, 30000);
}

// Funciones de navegación
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(`${sectionId}-section`).classList.add('active');
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Cargar datos si es necesario
    if (sectionId === 'stats') {
        loadStats();
    }
}

// Inicializar sección de playlists
function initPlaylists() {
    const playlists = [
        { name: 'Favoritas', icon: 'fas fa-heart', count: 0 },
        { name: 'Recientes', icon: 'fas fa-clock', count: 0 },
        { name: 'Descargas', icon: 'fas fa-download', count: 0 }
    ];
    
    const container = document.getElementById('playlist-container');
    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-item">
            <i class="${playlist.icon}"></i>
            <span>${playlist.name}</span>
        </div>
    `).join('');
}
