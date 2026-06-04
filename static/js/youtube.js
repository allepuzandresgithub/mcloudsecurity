// youtube.js - Descargas de YouTube con interfaz mejorada

let currentDownloadId = null;
let statusCheckInterval = null;

function initYouTubeDownloader() {
    console.log('📥 Inicializando descargador de YouTube...');

    const downloadBtn = document.getElementById('youtube-download-btn');
    const urlInput = document.getElementById('youtube-url');
    const downloadTypeRadios = document.querySelectorAll('input[name="downloadType"]');
    const playlistOptions = document.getElementById('playlist-options');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadYouTubeVideo);
    }
    
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') downloadYouTubeVideo();
        });
    }

    if (downloadTypeRadios.length && playlistOptions) {
        downloadTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                playlistOptions.style.display = this.value === 'playlist' ? 'flex' : 'none';
            });
        });
        
        const selected = document.querySelector('input[name="downloadType"]:checked');
        if (selected) {
            playlistOptions.style.display = selected.value === 'playlist' ? 'flex' : 'none';
        }
    }

    loadYouTubeDownloads();
}

function isMixRadioUrl(url) {
    try {
        const urlObj = new URL(url);
        const listParam = urlObj.searchParams.get('list');
        return listParam && listParam.startsWith('RD');
    } catch { 
        return false; 
    }
}

function isPlaylistUrl(url) {
    try {
        const urlObj = new URL(url);
        const listParam = urlObj.searchParams.get('list');
        return listParam && !listParam.startsWith('RD');
    } catch { 
        return false; 
    }
}

async function downloadYouTubeVideo() {
    const urlInput = document.getElementById('youtube-url');
    const downloadBtn = document.getElementById('youtube-download-btn');
    const selectedType = document.querySelector('input[name="downloadType"]:checked');
    const limitInput = document.getElementById('playlist-limit');

    let url = urlInput.value.trim();
    
    if (!url) {
        updateStatus('error', '❌ Por favor, introduce una URL de YouTube', 0);
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        updateStatus('error', '🔗 URL de YouTube no válida', 0);
        return;
    }

    // Detección automática de listas
    let type = selectedType ? selectedType.value : 'single';
    let limit = null;

    if (isMixRadioUrl(url) || isPlaylistUrl(url) || url.includes('list=')) {
        type = 'playlist';
        limit = isMixRadioUrl(url) ? 15 : 10;
        
        const playlistRadio = document.querySelector('input[name="downloadType"][value="playlist"]');
        if (playlistRadio) playlistRadio.checked = true;
        
        const playlistOptions = document.getElementById('playlist-options');
        if (playlistOptions) playlistOptions.style.display = 'flex';
        if (limitInput) limitInput.value = limit;
    } else {
        if (type === 'playlist' && limitInput) {
            limit = parseInt(limitInput.value) || 10;
        }
    }

    downloadBtn.disabled = true;
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    updateStatus('starting', type === 'playlist' ? '🎵 Preparando lista...' : '🎬 Preparando vídeo...', 0);

    try {
        const payload = { url, type };
        if (limit) payload.limit = limit;

        const response = await fetch('/api/youtube/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (response.ok) {
            currentDownloadId = result.download_id;
            startStatusChecking(currentDownloadId);
            urlInput.value = '';
            loadYouTubeDownloads();
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error iniciando descarga:', error);
        updateStatus('error', `⚠️ Error: ${error.message}`, 0);
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalText;
    }
}

function startStatusChecking(downloadId) {
    if (statusCheckInterval) clearInterval(statusCheckInterval);
    
    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/youtube/status/${downloadId}`);
            if (response.ok) {
                const status = await response.json();
                showCurrentDownloadStatus(status);
                
                if (status.status === 'completed' || status.status === 'error') {
                    clearInterval(statusCheckInterval);
                    statusCheckInterval = null;
                    
                    if (status.status === 'completed') {
                        if (window.loadLibrary) window.loadLibrary(true);
                        loadYouTubeDownloads();
                        
                        // Mostrar mensaje de éxito
                        setTimeout(() => {
                            const statusDiv = document.getElementById('youtube-current-status');
                            if (statusDiv) {
                                setTimeout(() => {
                                    if (statusDiv.firstChild) statusDiv.innerHTML = '';
                                }, 5000);
                            }
                        }, 3000);
                    }
                }
            } else {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
            }
        } catch (error) {
            console.error('Error verificando estado:', error);
        }
    }, 2000);
}

function updateStatus(status, message, progress) {
    const container = document.getElementById('youtube-current-status');
    if (!container) return;

    let statusColor = '#ff0000';
    let statusIcon = 'fas fa-clock';
    let statusTitle = 'Estado';

    switch(status) {
        case 'starting': 
            statusColor = '#f97316'; 
            statusIcon = 'fas fa-play-circle'; 
            statusTitle = 'Iniciando'; 
            break;
        case 'downloading': 
            statusColor = '#ff0000'; 
            statusIcon = 'fas fa-download'; 
            statusTitle = 'Descargando'; 
            break;
        case 'completed': 
            statusColor = '#10b981'; 
            statusIcon = 'fas fa-check-circle'; 
            statusTitle = 'Completado'; 
            break;
        case 'error': 
            statusColor = '#ef4444'; 
            statusIcon = 'fas fa-exclamation-triangle'; 
            statusTitle = 'Error'; 
            break;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });

    container.innerHTML = `
        <div class="yt-status-card" style="border-left-color: ${statusColor};">
            <div class="yt-status-header">
                <div><i class="${statusIcon}" style="color: ${statusColor};"></i> <strong>${statusTitle}</strong></div>
                <div style="font-size:0.7rem;">${timeStr}</div>
            </div>
            <div style="margin:8px 0">${message}</div>
            ${(status === 'downloading' || status === 'starting') && progress > 0 ? `
                <div class="yt-progress-container">
                    <div class="yt-progress-fill" style="width: ${progress}%; background: ${statusColor};"></div>
                </div>
                <div style="font-size:0.7rem; text-align:right; margin-top:4px;">${Math.round(progress)}%</div>
            ` : ''}
        </div>
    `;
}

function showCurrentDownloadStatus(status) {
    let msg = status.message || 'Procesando...';
    let progress = status.progress || 0;

    if (status.file_count !== undefined && status.status === 'completed') {
        const realCount = status.file_count;
        msg = `✅ ${realCount} ${realCount === 1 ? 'canción descargada' : 'canciones descargadas'}`;
        progress = 100;
    } else if (status.current_item && status.total_items) {
        msg = `🎵 Canción ${status.current_item} de ${status.total_items}`;
        progress = Math.round((status.current_item / status.total_items) * 100);
    } else if (status.total_items && status.status === 'downloading') {
        msg = `📥 Descargando lista (${status.processed_items || 0}/${status.total_items})`;
    }

    updateStatus(status.status, msg, progress);
}

async function loadYouTubeDownloads() {
    try {
        const response = await fetch('/api/youtube/downloads');
        if (response.ok) {
            const data = await response.json();
            displayYouTubeDownloads(data.downloads);
        }
    } catch (error) {
        console.error('Error cargando descargas:', error);
    }
}

function displayYouTubeDownloads(downloads) {
    const container = document.getElementById('youtube-downloads-list');
    if (!container) return;

    if (!downloads || Object.keys(downloads).length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-download"></i><p>No hay descargas recientes</p></div>';
        return;
    }

    const sortedDownloads = Object.entries(downloads)
        .sort(([, a], [, b]) => new Date(b.start_time) - new Date(a.start_time))
        .slice(0, 10);

    container.innerHTML = '';

    sortedDownloads.forEach(([id, download]) => {
        const item = document.createElement('div');
        item.className = 'yt-download-item';

        let statusIcon = 'fas fa-hourglass-half';
        let statusColor = '#64748b';
        let statusText = 'Pendiente';

        switch(download.status) {
            case 'starting': 
                statusIcon = 'fas fa-play-circle'; 
                statusColor = '#f97316'; 
                statusText = 'Iniciando'; 
                break;
            case 'downloading': 
                statusIcon = 'fas fa-download'; 
                statusColor = '#ff0000'; 
                statusText = 'Descargando'; 
                break;
            case 'completed': 
                statusIcon = 'fas fa-check-circle'; 
                statusColor = '#10b981'; 
                statusText = 'Completado'; 
                break;
            case 'error': 
                statusIcon = 'fas fa-exclamation-circle'; 
                statusColor = '#ef4444'; 
                statusText = 'Error'; 
                break;
        }

        const startTime = new Date(download.start_time);
        const timeStr = startTime.toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

        let fileCountHtml = '';
        if (download.file_count) {
            fileCountHtml = `<span class="yt-file-count"><i class="fas fa-music"></i> ${download.file_count} ${download.file_count === 1 ? 'canción' : 'canciones'}</span>`;
        }

        const typeBadge = download.type === 'playlist'
            ? '<span class="yt-badge yt-badge-playlist"><i class="fas fa-list"></i> Lista</span>'
            : '<span class="yt-badge yt-badge-single"><i class="fas fa-video"></i> Vídeo</span>';

        let itemMessage = download.message || 'En progreso';
        
        if (download.status === 'completed' && download.file_count) {
            itemMessage = `✅ ${download.file_count} ${download.file_count === 1 ? 'canción descargada' : 'canciones descargadas'}`;
        } else if (download.status === 'downloading' && download.current_item && download.total_items) {
            itemMessage = `🎵 Canción ${download.current_item} de ${download.total_items}`;
        } else if (download.status === 'error') {
            itemMessage = `❌ ${download.message || 'Error en la descarga'}`;
        }

        item.innerHTML = `
            <div class="yt-item-header">
                <div class="yt-item-status">
                    <i class="${statusIcon}" style="color: ${statusColor};"></i>
                    <strong>${statusText}</strong>
                </div>
                <div class="yt-item-badges">
                    ${typeBadge}
                    ${fileCountHtml}
                </div>
            </div>
            <div class="yt-item-message">${itemMessage}</div>
            <div class="yt-item-footer">
                <span class="yt-item-url">${download.url ? download.url.substring(0, 50) + '…' : 'URL'}</span>
                <span class="yt-item-time"><i class="far fa-clock"></i> ${timeStr}</span>
            </div>
            ${download.status === 'downloading' && download.progress ? `
                <div class="yt-progress-container" style="margin-top: 8px;">
                    <div class="yt-progress-fill" style="width: ${download.progress}%; background: ${statusColor};"></div>
                </div>
            ` : ''}
        `;
        container.appendChild(item);
    });
}

function isValidYouTubeUrl(url) {
    if (!url || url.trim() === '') return false;
    url = url.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/,
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+(&\S*)?$/,
        /^https?:\/\/youtu\.be\/[\w-]+$/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+$/,
        /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=[\w-]+$/,
        /^https?:\/\/(www\.)?music\.youtube\.com\/.+$/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

// Exportar funciones globales
window.initYouTubeDownloader = initYouTubeDownloader;
window.downloadYouTubeVideo = downloadYouTubeVideo;
window.loadYouTubeDownloads = loadYouTubeDownloads;
window.clearYoutubeHistory = clearYoutubeHistory;
