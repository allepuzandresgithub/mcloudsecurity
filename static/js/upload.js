// upload.js - Manejo de subida de archivos

function initUploader() {
    console.log('📤 Inicializando sistema de subida...');
    
    const uploadModal = document.getElementById('upload-modal');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadClose = document.getElementById('upload-close');
    const uploadCancel = document.getElementById('upload-cancel');
    const browseBtn = document.getElementById('browse-btn');
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const fileList = document.getElementById('file-list');
    const uploadStart = document.getElementById('upload-start');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadBar = document.getElementById('upload-bar');
    const uploadStatus = document.getElementById('upload-status');
    const uploadPercentage = document.getElementById('upload-percentage');

    let filesToUpload = [];

    // Abrir modal
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadModal.classList.add('active');
            console.log('📤 Modal de subida abierto');
        });
    }

    // Cerrar modal
    if (uploadClose) {
        uploadClose.addEventListener('click', () => {
            uploadModal.classList.remove('active');
            resetUploader();
            console.log('📤 Modal de subida cerrado');
        });
    }

    if (uploadCancel) {
        uploadCancel.addEventListener('click', () => {
            uploadModal.classList.remove('active');
            resetUploader();
            console.log('📤 Modal de subida cancelado');
        });
    }

    // Cerrar modal al hacer clic fuera
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
            resetUploader();
        }
    });

    // Seleccionar archivos
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    dropArea.addEventListener('dragenter', () => {
        dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragover', () => {
        dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', handleDrop);

    // Iniciar subida
    uploadStart.addEventListener('click', startUpload);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        handleFiles(files);
        dropArea.classList.remove('drag-over');
    }

    function handleFiles(files) {
        const allowedTypes = [
            'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a',
            'audio/webm', 'audio/ogg', 'audio/flac', 'audio/wav',
            'audio/x-ms-wma', 'audio/aac', 'video/mp4', 'video/webm'
        ];
        
        filesToUpload = [];
        
        Array.from(files).forEach(file => {
            // Verificar tipo de archivo
            if (allowedTypes.includes(file.type) || 
                file.name.match(/\.(mp3|mp4|m4a|webm|ogg|flac|wav|wma|aac)$/i)) {
                filesToUpload.push(file);
            } else {
                console.warn(`Archivo no soportado: ${file.name} (${file.type})`);
                showNotification(`Formato no soportado: ${file.name}`, 'error');
            }
        });
        
        if (filesToUpload.length > 0) {
            updateFileList();
            uploadStart.disabled = false;
            console.log(`📤 ${filesToUpload.length} archivos listos para subir`);
        }
    }

    function updateFileList() {
        fileList.innerHTML = '';
        
        if (filesToUpload.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = '<i class="fas fa-music"></i> No hay archivos seleccionados';
            fileList.appendChild(li);
            return;
        }
        
        filesToUpload.forEach((file, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-file-audio"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatBytes(file.size)})</span>
                <button class="remove-file" data-index="${index}" title="Eliminar">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(li);
        });

        // Añadir event listeners para eliminar archivos
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const fileName = filesToUpload[index].name;
                filesToUpload.splice(index, 1);
                updateFileList();
                if (filesToUpload.length === 0) {
                    uploadStart.disabled = true;
                }
                console.log(`📤 Archivo eliminado: ${fileName}`);
            });
        });
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async function startUpload() {
        if (filesToUpload.length === 0) return;

        uploadProgress.style.display = 'block';
        uploadStart.disabled = true;
        browseBtn.disabled = true;
        uploadStatus.textContent = 'Preparando subida...';
        uploadBar.style.width = '0%';
        uploadPercentage.textContent = '0%';

        const formData = new FormData();
        filesToUpload.forEach(file => {
            formData.append('files', file);
        });

        try {
            console.log(`📤 Iniciando subida de ${filesToUpload.length} archivos...`);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                // Mostrar progreso simulado (realmente no hay progreso parcial en la API actual)
                uploadStatus.textContent = 'Procesando archivos...';
                
                // Simular progreso
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 10;
                    if (progress > 90) progress = 90;
                    uploadBar.style.width = `${progress}%`;
                    uploadPercentage.textContent = `${progress}%`;
                    
                    if (progress >= 90) {
                        clearInterval(progressInterval);
                    }
                }, 200);

                // Esperar a que se complete realmente
                uploadStatus.textContent = 'Subiendo archivos...';
                uploadBar.style.width = '100%';
                uploadPercentage.textContent = '100%';
                
                setTimeout(() => {
                    uploadStatus.textContent = '¡Subida completada!';
                    
                    // Mostrar notificación
                    showNotification(`Subidos ${result.files.length} archivos correctamente`, 'success');
                    
                    // Actualizar biblioteca después de 1 segundo
                    setTimeout(() => {
                        if (window.loadLibrary) {
                            window.loadLibrary();
                        }
                        uploadModal.classList.remove('active');
                        resetUploader();
                    }, 1000);
                    
                }, 1000);

                console.log(`✅ Subida completada: ${result.message}`);

            } else {
                throw new Error(result.error || 'Error desconocido en el servidor');
            }
        } catch (error) {
            console.error('❌ Error en subida:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
            uploadBar.style.width = '0%';
            uploadPercentage.textContent = '0%';
            uploadStart.disabled = false;
            browseBtn.disabled = false;
            
            showNotification(`Error al subir archivos: ${error.message}`, 'error');
        }
    }

    function resetUploader() {
        filesToUpload = [];
        fileList.innerHTML = '';
        uploadProgress.style.display = 'none';
        uploadBar.style.width = '0%';
        uploadStatus.textContent = 'Preparando...';
        uploadPercentage.textContent = '0%';
        uploadStart.disabled = true;
        browseBtn.disabled = false;
        dropArea.classList.remove('drag-over');
        fileInput.value = '';
    }

    function showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                  type === 'error' ? 'exclamation-circle' : 
                                  type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${type === 'success' ? 'Éxito' : 
                                                 type === 'error' ? 'Error' : 
                                                 type === 'warning' ? 'Advertencia' : 'Información'}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Añadir al contenedor de notificaciones
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Configurar cierre
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('hiding');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    console.log('✅ Sistema de subida inicializado');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-modal')) {
        initUploader();
    }
});

// Exportar funciones
window.initUploader = initUploader;
