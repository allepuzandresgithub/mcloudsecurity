// player.js - Controlador del reproductor de audio - SHUFFLE COMPLETAMENTE CORREGIDO

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentTrack = null;
        this.queue = [];
        this.shuffleQueue = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.isRepeatOne = false;
        this.volume = 0.8;
        this.playbackRate = 1.0;
        this.shuffleIndex = -1;
        this.originalQueueBeforeShuffle = [];
        this.originalIndexBeforeShuffle = -1;
        
        this.init();
    }
    
    init() {
        console.log('🎵 Inicializando reproductor...');
        
        // Cargar volumen guardado
        const savedVolume = localStorage.getItem('musicPlayerVolume');
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
            this.audio.volume = this.volume;
            const volumeSlider = document.getElementById('volume-slider');
            if (volumeSlider) {
                volumeSlider.value = this.volume * 100;
            }
        }
        
        // Cargar estado de shuffle/repeat
        const savedShuffle = localStorage.getItem('musicPlayerShuffle');
        const savedRepeat = localStorage.getItem('musicPlayerRepeat');
        const savedRepeatOne = localStorage.getItem('musicPlayerRepeatOne');
        
        if (savedShuffle) this.isShuffle = savedShuffle === 'true';
        if (savedRepeat) this.isRepeat = savedRepeat === 'true';
        if (savedRepeatOne) this.isRepeatOne = savedRepeatOne === 'true';
        
        // Configurar audio
        this.audio.volume = this.volume;
        this.audio.playbackRate = this.playbackRate;
        
        // Event listeners del audio
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', (error) => this.onError(error));

        // Guardar estado al ocultar/cerrar la página (soporte mobile y desktop)
        window.addEventListener('beforeunload', () => this.savePlaybackState());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.savePlaybackState();
        });
        // Guardado periódico cada 10 s mientras reproduce
        setInterval(() => { if (this.isPlaying) this.savePlaybackState(); }, 10000);

        // Configurar controles UI
        this.setupControls();

        // Actualizar UI inicial
        this.updateShuffleButton();
        this.updateRepeatButton();

        console.log('✅ Reproductor inicializado');
    }
    
    setupControls() {
        console.log('🎛️ Configurando controles...');
        
        // Botón play/pause
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }
        
        // Botones de navegación
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prev());
        }
        
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.next());
        }
        
        // Botones de modo
        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }
        
        const repeatBtn = document.getElementById('repeat-btn');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => this.toggleRepeat());
        }
        
        // Control de volumen
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        }
        
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        // Control de progreso
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', (e) => this.seek(e));
        }
        
        // Botón de cola
        const queueBtn = document.getElementById('queue-toggle');
        if (queueBtn) {
            queueBtn.addEventListener('click', () => this.toggleQueueSidebar());
        }
        
        // Controles del reproductor grande
        const fullscreenPlayBtn = document.getElementById('fullscreen-play-btn');
        if (fullscreenPlayBtn) {
            fullscreenPlayBtn.addEventListener('click', () => this.togglePlay());
        }
        
        const fullscreenPrevBtn = document.getElementById('fullscreen-prev-btn');
        if (fullscreenPrevBtn) {
            fullscreenPrevBtn.addEventListener('click', () => this.prev());
        }
        
        const fullscreenNextBtn = document.getElementById('fullscreen-next-btn');
        if (fullscreenNextBtn) {
            fullscreenNextBtn.addEventListener('click', () => this.next());
        }
        
        const fullscreenShuffleBtn = document.getElementById('fullscreen-shuffle-btn');
        if (fullscreenShuffleBtn) {
            fullscreenShuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }
        
        const fullscreenRepeatBtn = document.getElementById('fullscreen-repeat-btn');
        if (fullscreenRepeatBtn) {
            fullscreenRepeatBtn.addEventListener('click', () => this.toggleRepeat());
        }
        
        // Control de progreso del reproductor grande
        const fullscreenProgressBar = document.getElementById('fullscreen-progress-bar');
        if (fullscreenProgressBar) {
            fullscreenProgressBar.addEventListener('click', (e) => this.seek(e));
        }
        
        // Botón cerrar cola
        const queueClose = document.getElementById('queue-close');
        if (queueClose) {
            queueClose.addEventListener('click', () => this.toggleQueueSidebar());
        }
        
        // Botones de la cola
        const clearQueueBtn = document.getElementById('clear-queue');
        if (clearQueueBtn) {
            clearQueueBtn.addEventListener('click', () => this.clearQueue());
        }
        
        // Botón de favoritos en el reproductor
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                if (this.currentTrack) {
                    const isFavorited = favoriteBtn.classList.contains('favorited');
                    
                    if (isFavorited) {
                        // Quitar de favoritos
                        favoriteBtn.classList.remove('favorited');
                        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                        if (window.removeFromFavorites) {
                            window.removeFromFavorites(this.currentTrack.name);
                        }
                    } else {
                        // Añadir a favoritos
                        favoriteBtn.classList.add('favorited');
                        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
                        if (window.addToFavorites) {
                            window.addToFavorites(this.currentTrack.name);
                        }
                    }
                    
                    // Actualizar iconos en la biblioteca
                    if (window.updateFavoriteIcons) {
                        window.updateFavoriteIcons();
                    }
                }
            });
        }
    }
    
    async playTrack(track, fromQueue = false) {
        if (!track) {
            console.error('❌ No hay track para reproducir');
            return;
        }
        
        console.log(`🎵 Reproduciendo: ${track.name}`);
        this.currentTrack = track;
        
        try {
            // Establecer fuente de audio
            this.audio.src = track.path;
            
            // Actualizar UI
            this.updateUI(track);
            
            // Reproducir
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            
            // Si no viene de la cola y no está en shuffle, añadir a la cola
            if (!fromQueue && !this.isShuffle) {
                const trackInQueue = this.queue.findIndex(q => q.name === track.name);
                if (trackInQueue === -1) {
                    this.queue.push(track);
                    this.currentIndex = this.queue.length - 1;
                } else {
                    this.currentIndex = trackInQueue;
                }
            }
            
            // Actualizar la cola UI
            this.updateQueueUI();
            
            // Sincronizar con reproductor grande
            this.syncFullscreenPlayer();
            
        } catch (error) {
            console.error('❌ Error reproduciendo:', error);
            
            // Intentar siguiente canción
            setTimeout(() => this.next(), 1000);
        }
    }
    
    addToQueue(track) {
        // Evitar duplicados
        if (!this.queue.some(q => q.name === track.name)) {
            this.queue.push(track);
            this.updateQueueUI();
        }
    }
    
    updateQueueUI() {
        const queueList = document.getElementById('queue-list');
        if (!queueList) return;
        
        if (this.queue.length === 0) {
            queueList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-stream"></i>
                    <h4>Cola vacía</h4>
                    <p>Añade canciones a la cola de reproducción</p>
                </div>
            `;
            return;
        }
        
        queueList.innerHTML = this.queue.map((track, index) => {
            const isCurrent = this.currentTrack && this.currentTrack.name === track.name;
            const isFavorited = window.isSongFavorited ? window.isSongFavorited(track.name) : false;
            
            return `
            <div class="queue-item ${isCurrent ? 'playing' : ''}" data-index="${index}">
                <div class="queue-item-cover">
                    ${track.has_cover ? 
                        `<img src="${track.cover_url}" alt="${track.name}" loading="lazy">` :
                        `<div class="cover-placeholder" style="background: ${track.color}">
                            <i class="fas fa-music"></i>
                        </div>`
                    }
                </div>
                <div class="queue-item-info">
                    <div class="queue-item-title">${track.name.replace(/\.[^/.]+$/, '')}</div>
                    <div class="queue-item-meta">
                        <span><i class="fas fa-clock"></i> ${track.duration}</span>
                        <span><i class="fas fa-${track.type === 'video' ? 'video' : 'music'}"></i> ${track.type}</span>
                        ${isFavorited ? '<span><i class="fas fa-heart" style="color: #ff4757;"></i></span>' : ''}
                    </div>
                </div>
                <div class="queue-item-actions">
                    <button class="queue-action-btn play-queue-item" title="Reproducir">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="queue-action-btn favorite-queue-item ${isFavorited ? 'favorited' : ''}" title="${isFavorited ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                        <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="queue-action-btn remove-queue-item" title="Eliminar de la cola">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
        
        // Añadir event listeners a los elementos de la cola
        document.querySelectorAll('.play-queue-item').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const queueItem = btn.closest('.queue-item');
                const trackIndex = parseInt(queueItem.dataset.index);
                const track = this.queue[trackIndex];
                if (track) {
                    this.playTrack(track, true);
                    this.currentIndex = trackIndex;
                }
            });
        });
        
        document.querySelectorAll('.favorite-queue-item').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const queueItem = btn.closest('.queue-item');
                const trackIndex = parseInt(queueItem.dataset.index);
                const track = this.queue[trackIndex];
                
                if (track) {
                    const isFavorited = btn.classList.contains('favorited');
                    
                    if (isFavorited) {
                        btn.classList.remove('favorited');
                        btn.innerHTML = '<i class="far fa-heart"></i>';
                        btn.title = 'Añadir a favoritos';
                        if (window.removeFromFavorites) {
                            window.removeFromFavorites(track.name);
                        }
                    } else {
                        btn.classList.add('favorited');
                        btn.innerHTML = '<i class="fas fa-heart"></i>';
                        btn.title = 'Quitar de favoritos';
                        if (window.addToFavorites) {
                            window.addToFavorites(track.name);
                        }
                    }
                    
                    // Actualizar el reproductor si esta canción está sonando
                    if (this.currentTrack && this.currentTrack.name === track.name) {
                        const playerFavoriteBtn = document.getElementById('favorite-btn');
                        if (playerFavoriteBtn) {
                            playerFavoriteBtn.classList.toggle('favorited', !isFavorited);
                            playerFavoriteBtn.innerHTML = !isFavorited ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
                        }
                    }
                }
            });
        });
        
        document.querySelectorAll('.remove-queue-item').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const queueItem = btn.closest('.queue-item');
                const trackIndex = parseInt(queueItem.dataset.index);
                const track = this.queue[trackIndex];
                
                // Eliminar de la cola
                this.queue.splice(trackIndex, 1);
                
                // Ajustar índice actual si es necesario
                if (this.currentIndex >= trackIndex) {
                    this.currentIndex = Math.max(0, this.currentIndex - 1);
                }
                
                // Actualizar UI
                this.updateQueueUI();
            });
        });
        
        // Click en el elemento de la cola
        document.querySelectorAll('.queue-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.queue-item-actions')) {
                    const trackIndex = parseInt(item.dataset.index);
                    const track = this.queue[trackIndex];
                    if (track) {
                        this.playTrack(track, true);
                        this.currentIndex = trackIndex;
                    }
                }
            });
        });
    }
    
    clearQueue() {
        this.queue = [];
        this.currentIndex = -1;
        this.updateQueueUI();
    }
    
    toggleQueueSidebar() {
        const queueSidebar = document.getElementById('queue-sidebar');
        if (queueSidebar) {
            queueSidebar.classList.toggle('open');
            
            // Si se abre, actualizar la lista
            if (queueSidebar.classList.contains('open')) {
                this.updateQueueUI();
            }
        }
    }
    
    togglePlay() {
        if (!this.currentTrack) {
            // Si no hay canción, intentar reproducir la primera de la biblioteca
            const firstTrack = window.musicLibrary?.[0];
            if (firstTrack) {
                this.playTrack(firstTrack);
            }
            return;
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.resume();
        }
        
        // Sincronizar con reproductor grande
        this.syncFullscreenPlayer();
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }
    
    resume() {
        this.audio.play();
        this.isPlaying = true;
        this.updatePlayButton();
    }
    
    next() {
        console.log('▶️ Siguiente canción...');
        
        if (this.isRepeatOne && this.currentTrack) {
            // Repetir la misma canción
            this.audio.currentTime = 0;
            this.audio.play();
            return;
        }
        
        if (this.isShuffle) {
            // MODO SHUFFLE - USAR TODA LA BIBLIOTECA
            if (!window.musicLibrary || window.musicLibrary.length === 0) {
                return;
            }
            
            // Si no hay cola shuffle o está vacía, crear una nueva
            if (this.shuffleQueue.length === 0) {
                this.shuffleQueue = this.shuffleArray([...window.musicLibrary]);
                this.shuffleIndex = -1;
            }
            
            // Si estamos al final, regenerar la cola shuffle
            if (this.shuffleIndex >= this.shuffleQueue.length - 1) {
                this.shuffleQueue = this.shuffleArray([...window.musicLibrary]);
                this.shuffleIndex = -1;
            }
            
            this.shuffleIndex++;
            const nextTrack = this.shuffleQueue[this.shuffleIndex];
            
            if (nextTrack) {
                this.playTrack(nextTrack, true);
                console.log(`🔀 Siguiente en shuffle: ${nextTrack.name} (${this.shuffleIndex + 1}/${this.shuffleQueue.length})`);
            }
            
        } else {
            // MODO NORMAL - USAR COLA
            if (this.queue.length === 0) {
                return;
            }
            
            if (this.currentIndex === -1 || this.currentIndex >= this.queue.length - 1) {
                if (this.isRepeat) {
                    // Volver al principio si está activado repeat
                    this.currentIndex = 0;
                } else {
                    return;
                }
            } else {
                this.currentIndex++;
            }
            
            const nextTrack = this.queue[this.currentIndex];
            if (nextTrack) {
                this.playTrack(nextTrack, true);
            }
        }
    }
    
    prev() {
        console.log('◀️ Canción anterior...');
        
        if (this.isShuffle) {
            // En shuffle, volver a la canción anterior en la cola shuffle
            if (this.shuffleIndex <= 0) {
                // Si es la primera, ir a la última
                this.shuffleIndex = this.shuffleQueue.length - 1;
            } else {
                this.shuffleIndex--;
            }
            
            const prevTrack = this.shuffleQueue[this.shuffleIndex];
            if (prevTrack) {
                this.playTrack(prevTrack, true);
            }
            
        } else {
            // MODO NORMAL
            if (this.queue.length === 0) {
                return;
            }
            
            if (this.currentIndex <= 0) {
                // Si es la primera, ir a la última si repeat está activado
                if (this.isRepeat) {
                    this.currentIndex = this.queue.length - 1;
                } else {
                    return;
                }
            } else {
                this.currentIndex--;
            }
            
            const prevTrack = this.queue[this.currentIndex];
            if (prevTrack) {
                this.playTrack(prevTrack, true);
            }
        }
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        this.audio.volume = this.volume;
        
        // Guardar volumen en localStorage
        localStorage.setItem('musicPlayerVolume', this.volume);
        
        // Actualizar icono de volumen
        const volumeIcon = document.querySelector('#mute-btn i');
        if (volumeIcon) {
            if (this.volume === 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (this.volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        }
    }
    
    toggleMute() {
        this.audio.muted = !this.audio.muted;
        const volumeIcon = document.querySelector('#mute-btn i');
        if (volumeIcon) {
            volumeIcon.className = this.audio.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        }
    }
    
    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        localStorage.setItem('musicPlayerShuffle', this.isShuffle);
        
        if (this.isShuffle) {
            // Limpiar cola shuffle y regenerar
            this.shuffleQueue = [];
            this.shuffleIndex = -1;
        } else {
            this.shuffleQueue = [];
            this.shuffleIndex = -1;
        }
        
        this.updateShuffleButton();
    }
    
    updateShuffleButton() {
        const shuffleBtn = document.getElementById('shuffle-btn');
        const fullscreenShuffleBtn = document.getElementById('fullscreen-shuffle-btn');
        
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', this.isShuffle);
        }
        
        if (fullscreenShuffleBtn) {
            fullscreenShuffleBtn.classList.toggle('active', this.isShuffle);
        }
    }
    
    toggleRepeat() {
        // Ciclar entre: off -> repeat all -> repeat one
        if (!this.isRepeat && !this.isRepeatOne) {
            // Activar repeat all
            this.isRepeat = true;
            this.isRepeatOne = false;
        } else if (this.isRepeat && !this.isRepeatOne) {
            // Cambiar a repeat one
            this.isRepeat = false;
            this.isRepeatOne = true;
        } else {
            // Desactivar todo
            this.isRepeat = false;
            this.isRepeatOne = false;
        }
        
        localStorage.setItem('musicPlayerRepeat', this.isRepeat);
        localStorage.setItem('musicPlayerRepeatOne', this.isRepeatOne);
        
        this.updateRepeatButton();
        this.audio.loop = this.isRepeatOne;
    }
    
    updateRepeatButton() {
        const repeatBtn = document.getElementById('repeat-btn');
        const fullscreenRepeatBtn = document.getElementById('fullscreen-repeat-btn');
        
        if (repeatBtn) {
            repeatBtn.classList.toggle('active', this.isRepeat || this.isRepeatOne);
            
            // Cambiar icono según el modo
            const icon = repeatBtn.querySelector('i');
            if (this.isRepeatOne) {
                icon.className = 'fas fa-redo-alt';
                repeatBtn.title = 'Repetir una canción';
            } else {
                icon.className = 'fas fa-redo';
                repeatBtn.title = this.isRepeat ? 'Repetir toda la lista' : 'Repetición';
            }
        }
        
        if (fullscreenRepeatBtn) {
            fullscreenRepeatBtn.classList.toggle('active', this.isRepeat || this.isRepeatOne);
            
            const fullscreenIcon = fullscreenRepeatBtn.querySelector('i');
            if (this.isRepeatOne) {
                fullscreenIcon.className = 'fas fa-redo-alt';
                fullscreenRepeatBtn.title = 'Repetir una canción';
            } else {
                fullscreenIcon.className = 'fas fa-redo';
                fullscreenRepeatBtn.title = this.isRepeat ? 'Repetir toda la lista' : 'Repetición';
            }
        }
    }
    
    seek(event) {
        if (!this.audio.duration) return;
        
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = x / progressBar.clientWidth;
        
        this.audio.currentTime = percentage * this.audio.duration;
        
        // Sincronizar con reproductor grande
        this.syncFullscreenProgress();
    }
    
    updateProgress() {
        if (!this.audio.duration) return;
        
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        const progressElement = document.getElementById('progress');
        if (progressElement) {
            progressElement.style.width = `${progress}%`;
        }
        
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = this.formatTime(this.audio.currentTime);
        }
        
        // Sincronizar con reproductor grande si está activo
        const fullscreenPlayer = document.getElementById('fullscreen-player');
        if (fullscreenPlayer && fullscreenPlayer.classList.contains('active')) {
            this.syncFullscreenProgress();
        }
    }
    
    onLoadedMetadata() {
        const totalTimeElement = document.getElementById('total-time');
        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatTime(this.audio.duration);
        }
        
        // Sincronizar con reproductor grande
        this.syncFullscreenPlayer();
    }
    
    onEnded() {
        // Limpiar estado de reanudación: la canción terminó de forma natural
        localStorage.removeItem('musicPlayerResumeState');
        if (this.isRepeatOne) {
            this.audio.currentTime = 0;
            this.audio.play();
        } else {
            this.next();
        }
    }
    
    onError(error) {
        console.error('❌ Error en el reproductor:', error);
        
        // Intentar siguiente canción
        setTimeout(() => this.next(), 1000);
    }
    
    updateUI(track) {
        // Actualizar título y artista
        const titleElement = document.getElementById('current-track-title');
        if (titleElement) {
            titleElement.textContent = track.name.replace(/\.[^/.]+$/, ''); // Remover extensión
        }
        
        const artistElement = document.getElementById('current-track-artist');
        if (artistElement) {
            artistElement.textContent = 'MusicCloud';
        }
        
        // Actualizar portada
        const coverImg = document.getElementById('current-cover-img');
        const coverPlaceholder = document.getElementById('cover-placeholder');
        
        if (coverImg && coverPlaceholder) {
            if (track.cover_url && !track.cover_url.includes('default-cover')) {
                coverImg.src = track.cover_url;
                coverImg.style.display = 'block';
                coverPlaceholder.style.display = 'none';
            } else {
                coverImg.style.display = 'none';
                coverPlaceholder.style.display = 'flex';
            }
        }
        
        // Actualizar botón de favoritos - USAR FUNCIÓN GLOBAL
        const isFavorited = window.isSongFavorited ? window.isSongFavorited(track.name) : false;
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('favorited', isFavorited);
            favoriteBtn.innerHTML = isFavorited ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
            favoriteBtn.title = isFavorited ? 'Quitar de favoritos' : 'Añadir a favoritos';
        }
        
        // Marcar canción actual en la lista SIN SCROLL AUTOMÁTICO
        this.markCurrentSongInList(track);
    }
    
    markCurrentSongInList(track) {
        // Remover clase playing de todas las canciones
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        // Añadir clase playing a la canción actual SIN SCROLL
        const currentSongElement = document.querySelector(`.song-item[data-song-name="${track.name}"]`);
        if (currentSongElement) {
            currentSongElement.classList.add('playing');
            // COMENTADO: No hacer scroll automático para mantener la vista
            // if (!this.isElementInViewport(currentSongElement)) {
            //     currentSongElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // }
        }
        
        // También marcar en la cola
        document.querySelectorAll('.queue-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        const currentQueueItem = document.querySelector(`.queue-item[data-index="${this.currentIndex}"]`);
        if (currentQueueItem) {
            currentQueueItem.classList.add('playing');
        }
    }
    
    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    updatePlayButton() {
        const playIcon = document.getElementById('play-icon');
        const fullscreenPlayIcon = document.getElementById('fullscreen-play-icon');
        
        if (playIcon) {
            playIcon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
        
        if (fullscreenPlayIcon) {
            fullscreenPlayIcon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    syncFullscreenPlayer() {
        const fullscreenPlayer = document.getElementById('fullscreen-player');
        if (!fullscreenPlayer || !fullscreenPlayer.classList.contains('active')) return;
        
        if (!this.currentTrack) return;
        
        const track = this.currentTrack;
        
        // Actualizar información
        const title = document.getElementById('fullscreen-track-title');
        if (title) title.textContent = track.name.replace(/\.[^/.]+$/, '');
        
        const artist = document.getElementById('fullscreen-track-artist');
        if (artist) artist.textContent = 'MusicCloud';
        
        // Actualizar portada
        const coverImg = document.getElementById('fullscreen-cover-img');
        const coverPlaceholder = document.getElementById('fullscreen-cover-placeholder');
        
        if (coverImg && coverPlaceholder) {
            if (track.cover_url && !track.cover_url.includes('default-cover')) {
                coverImg.src = track.cover_url;
                coverImg.style.display = 'block';
                coverPlaceholder.style.display = 'none';
            } else {
                coverImg.style.display = 'none';
                coverPlaceholder.style.display = 'flex';
            }
        }
        
        // Actualizar favoritos en reproductor grande
        const isFavorited = window.isSongFavorited ? window.isSongFavorited(track.name) : false;
        const fullscreenFavoriteBtn = document.getElementById('fullscreen-favorite-btn');
        if (fullscreenFavoriteBtn) {
            fullscreenFavoriteBtn.classList.toggle('favorited', isFavorited);
            fullscreenFavoriteBtn.innerHTML = isFavorited ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        }
        
        // Sincronizar estado de reproducción
        this.updatePlayButton();
        
        // Sincronizar modos
        this.updateShuffleButton();
        this.updateRepeatButton();
        
        // Sincronizar progreso
        this.syncFullscreenProgress();
    }
    
    syncFullscreenProgress() {
        const fullscreenProgress = document.getElementById('fullscreen-progress');
        const fullscreenCurrentTime = document.getElementById('fullscreen-current-time');
        const fullscreenTotalTime = document.getElementById('fullscreen-total-time');
        
        if (fullscreenProgress && this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            fullscreenProgress.style.width = `${percent}%`;
        }
        
        if (fullscreenCurrentTime) {
            fullscreenCurrentTime.textContent = this.formatTime(this.audio.currentTime);
        }
        
        if (fullscreenTotalTime) {
            fullscreenTotalTime.textContent = this.formatTime(this.audio.duration);
        }
    }
    
    // Método para detener la reproducción
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayButton();
        this.currentTrack = null;
        
        // Actualizar UI
        const titleElement = document.getElementById('current-track-title');
        if (titleElement) {
            titleElement.textContent = 'No hay música seleccionada';
        }
        
        const artistElement = document.getElementById('current-track-artist');
        if (artistElement) {
            artistElement.textContent = 'Selecciona una canción para comenzar';
        }
        
        // Limpiar portada
        const coverImg = document.getElementById('current-cover-img');
        const coverPlaceholder = document.getElementById('cover-placeholder');
        
        if (coverImg && coverPlaceholder) {
            coverImg.style.display = 'none';
            coverPlaceholder.style.display = 'flex';
        }
        
        // Limpiar botón de favoritos
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.classList.remove('favorited');
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
            favoriteBtn.title = 'Añadir a favoritos';
        }
    }
    
    // Método para buscar y reproducir por nombre
    playSongByName(songName) {
        if (!window.musicLibrary) return false;
        
        const song = window.musicLibrary.find(s => s.name === songName);
        if (song) {
            this.playTrack(song);
            return true;
        }
        
        // Si no está en la biblioteca cargada, buscar en el servidor
        this.searchAndPlay(songName);
        return false;
    }
    
    async searchAndPlay(songName) {
        try {
            const response = await fetch(`/api/search/global?q=${encodeURIComponent(songName)}&limit=1`);
            if (response.ok) {
                const result = await response.json();
                if (result.files && result.files.length > 0) {
                    const song = result.files.find(s => s.name === songName);
                    if (song) {
                        this.playTrack(song);
                    }
                }
            }
        } catch (error) {
            console.error('Error buscando canción:', error);
        }
    }

    // ── Playback Resume ─────────────────────────────────────────────────────

    savePlaybackState() {
        if (!this.currentTrack || this.audio.currentTime < 5) return;
        try {
            const state = {
                track: this.currentTrack,
                position: this.audio.currentTime,
                queue: this.queue,
                queueIndex: this.currentIndex,
                shuffleQueue: this.shuffleQueue,
                shuffleIndex: this.shuffleIndex,
                savedAt: Date.now()
            };
            localStorage.setItem('musicPlayerResumeState', JSON.stringify(state));
        } catch (e) {
            console.warn('No se pudo guardar estado de reproducción:', e);
        }
    }

    restorePlaybackState() {
        try {
            const saved = localStorage.getItem('musicPlayerResumeState');
            if (!saved) return;
            const state = JSON.parse(saved);
            // Descartar estados con más de 7 días de antigüedad
            if (Date.now() - state.savedAt > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem('musicPlayerResumeState');
                return;
            }
            if (!state.track) return;
            this.showResumeToast(state);
        } catch (e) {
            localStorage.removeItem('musicPlayerResumeState');
        }
    }

    showResumeToast(state) {
        const existing = document.getElementById('resume-toast');
        if (existing) existing.remove();

        const safeName = state.track.name
            .replace(/\.[^/.]+$/, '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const position = this.formatTime(state.position);

        const toast = document.createElement('div');
        toast.id = 'resume-toast';
        toast.className = 'resume-toast';
        toast.innerHTML = `
            <div class="resume-toast-content">
                <div class="resume-toast-info">
                    <i class="fas fa-history"></i>
                    <div class="resume-toast-text">
                        <span class="resume-toast-label">Continuar reproducción</span>
                        <span class="resume-toast-track">${safeName} · ${position}</span>
                    </div>
                </div>
                <div class="resume-toast-actions">
                    <button class="resume-btn resume-confirm"><i class="fas fa-play"></i> Reanudar</button>
                    <button class="resume-btn resume-dismiss" title="Descartar"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        toast.querySelector('.resume-confirm').addEventListener('click', () => {
            this._dismissResumeToast(toast);
            this.executeRestore(state);
        });
        toast.querySelector('.resume-dismiss').addEventListener('click', () => {
            localStorage.removeItem('musicPlayerResumeState');
            this._dismissResumeToast(toast);
        });

        // Auto-descartar tras 10 s
        this._resumeToastTimer = setTimeout(() => this._dismissResumeToast(toast), 10000);
    }

    _dismissResumeToast(toast) {
        clearTimeout(this._resumeToastTimer);
        if (!toast) return;
        toast.classList.remove('visible');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }

    async executeRestore(state) {
        this.queue = state.queue || [];
        this.currentIndex = state.queueIndex ?? -1;
        this.shuffleQueue = state.shuffleQueue || [];
        this.shuffleIndex = state.shuffleIndex ?? -1;

        await this.playTrack(state.track, true);

        const seekOnLoad = () => { this.audio.currentTime = state.position; };
        if (this.audio.readyState >= 2) {
            seekOnLoad();
        } else {
            this.audio.addEventListener('loadedmetadata', seekOnLoad, { once: true });
        }

        localStorage.removeItem('musicPlayerResumeState');
    }
}

// Inicializar y exportar el reproductor
function initPlayer() {
    if (!window.player) {
        window.player = new MusicPlayer();
    }
    return window.player;
}

// Exportar para uso global
window.initPlayer = initPlayer;
window.MusicPlayer = MusicPlayer;
