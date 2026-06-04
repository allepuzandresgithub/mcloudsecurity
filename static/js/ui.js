// ui.js - Manejo de la interfaz de usuario MEJORADO

function initUI() {
    console.log('🎨 Inicializando UI...');
    
    // Detectar si es móvil
    if (window.isMobile) {
        initMobileUI();
        initMobileMenu();
    }
    
    // Toggle de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('✅ Toggle de tema configurado');
    }
    
    // Actualizar icono del tema
    updateThemeIcon();
    
    // Selector de tema en ajustes
    initThemeSelector();
    
    // Configurar reproductor grande
    initFullscreenPlayer();
    
    // Configurar botones de vista
    initViewButtons();
    
    // Configurar filtros
    initFilters();
    
    // Configurar ordenación
    initSorting();
    
    // Configurar botón de actualizar
    initRefreshButton();
    
    // Configurar botones de acción
    initActionButtons();
    
    // Inicializar descargador de YouTube
    if (window.initYouTubeDownloader) {
        window.initYouTubeDownloader();
    }
    
    console.log('✅ UI inicializada correctamente');
}

function initMobileUI() {
    console.log('📱 Inicializando UI móvil...');
    
    // Ajustar scroll para móvil
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.style.WebkitOverflowScrolling = 'touch';
        contentArea.style.overflowY = 'auto';
        contentArea.style.overflowX = 'hidden';
        
        // Mejorar scroll en iOS
        contentArea.addEventListener('touchstart', function() {
            this.style.overflowY = 'auto';
        });
        
        contentArea.addEventListener('touchmove', function(e) {
            if (this.scrollHeight > this.clientHeight) {
                e.stopPropagation();
            }
        });
        
        contentArea.addEventListener('touchend', function() {
            this.style.overflowY = 'auto';
        });
    }
    
    // Ajustar botones para toque
    document.querySelectorAll('button, .btn-action, .control-btn, .song-action-btn, .filter-tag').forEach(btn => {
        btn.style.minHeight = '44px';
        btn.style.minWidth = '44px';
        btn.style.touchAction = 'manipulation';
    });
    
    // Ajustar búsqueda para móvil
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.style.fontSize = '16px';
        searchInput.style.height = '44px';
        
        searchInput.addEventListener('focus', () => {
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    }
    
    console.log('✅ UI móvil inicializada');
}

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (!mobileMenuBtn || !sidebar || !sidebarOverlay) return;
    
    mobileMenuBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('active');
        sidebar.classList.toggle('active', !isOpen);
        sidebarOverlay.classList.toggle('active', !isOpen);
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    // Cerrar sidebar al hacer clic en un elemento de navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
    
    console.log('✅ Menú móvil configurado');
}

function initFullscreenPlayer() {
    const fullscreenBtn = document.getElementById('fullscreen-player-btn');
    const fullscreenPlayer = document.getElementById('fullscreen-player');
    const fullscreenClose = document.getElementById('fullscreen-close');
    
    if (fullscreenBtn && fullscreenPlayer && fullscreenClose) {
        fullscreenBtn.addEventListener('click', () => {
            fullscreenPlayer.classList.add('active');
            if (window.player) {
                window.player.syncFullscreenPlayer();
            }
            console.log('🖥️ Reproductor en pantalla completa activado');
        });
        
        fullscreenClose.addEventListener('click', () => {
            fullscreenPlayer.classList.remove('active');
            console.log('🖥️ Reproductor en pantalla completa cerrado');
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && fullscreenPlayer.classList.contains('active')) {
                fullscreenPlayer.classList.remove('active');
            }
        });
        
        if (window.isMobile) {
            fullscreenPlayer.addEventListener('click', (e) => {
                if (e.target === fullscreenPlayer) {
                    fullscreenPlayer.classList.remove('active');
                }
            });
        }
        
        console.log('✅ Reproductor en pantalla completa configurado');
    }
}

function initThemeSelector() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('musicTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    themeOptions.forEach(option => {
        if (option.dataset.theme === savedTheme) {
            option.classList.add('active');
        }
        
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('musicTheme', theme);
            
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            updateThemeIcon();
            
            console.log('🎨 Tema cambiado a:', theme);
        });
    });
    
    console.log('✅ Selector de tema configurado');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('musicTheme', newTheme);
    
    // Actualizar botones del selector de tema
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === newTheme) {
            option.classList.add('active');
        }
    });
    
    updateThemeIcon();
    console.log('🎨 Tema cambiado a:', newTheme);
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = themeToggle.querySelector('i');
    
    if (currentTheme === 'dark') {
        icon.className = 'fas fa-sun';
        icon.title = 'Cambiar a tema claro';
    } else {
        icon.className = 'fas fa-moon';
        icon.title = 'Cambiar a tema oscuro';
    }
}

function initViewButtons() {
    const gridViewBtn = document.getElementById('grid-view');
    const listViewBtn = document.getElementById('list-view');
    
    if (gridViewBtn && listViewBtn) {
        // Cargar preferencia guardada
        const savedViewMode = localStorage.getItem('musicViewMode') || 'list';
        
        if (savedViewMode === 'grid') {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        } else {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        }
        
        gridViewBtn.addEventListener('click', () => {
            toggleViewMode('grid');
        });
        
        listViewBtn.addEventListener('click', () => {
            toggleViewMode('list');
        });
        
        console.log('✅ Botones de vista configurados');
    }
}

function toggleViewMode(mode) {
    const gridBtn  = document.getElementById('grid-view');
    const listBtn  = document.getElementById('list-view');
    const favContainer  = document.getElementById('favorites-container');

    // Todos los contenedores que aplican la vista
    const containers = [
        document.getElementById('library-container'),
        favContainer
    ].filter(Boolean);

    if (!gridBtn || !listBtn) return;

    if (mode === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        localStorage.setItem('musicViewMode', 'grid');
        containers.forEach(c => c.classList.add('grid-view'));
    } else {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        localStorage.setItem('musicViewMode', 'list');
        containers.forEach(c => c.classList.remove('grid-view'));
    }
    
    // Re-renderizar para aplicar el nuevo layout (grid vs lista producen HTML distinto)
    if (window.renderLibrary && window.musicLibrary && window.musicLibrary.length > 0) {
        window.renderLibrary(window.musicLibrary);
    }
}

function initFilters() {
    const filterTags = document.querySelectorAll('.filter-tag');
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            
            const filter = tag.dataset.filter;
            if (window.applyFilter) {
                window.applyFilter(filter);
            }
            
            console.log(`🔍 Filtro aplicado: ${filter}`);
        });
    });
    
    console.log('✅ Filtros configurados');
}

function initSorting() {
    const sortSelect = document.getElementById('sort-select');
    
    if (sortSelect) {
        const savedSort = localStorage.getItem('musicSortMode') || 'date';
        sortSelect.value = savedSort;
        
        sortSelect.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            
            localStorage.setItem('musicSortMode', sortBy);
            
            if (window.sortLibrary) {
                window.sortLibrary(sortBy);
            }
            
            console.log(`🔢 Ordenación cambiada a: ${sortBy}`);
        });
        
        console.log('✅ Sistema de ordenación configurado');
    }
}

function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (window.refreshLibrary) {
                window.refreshLibrary();
            } else if (window.loadLibrary) {
                window.loadLibrary();
            }
            
            console.log('🔄 Biblioteca actualizada');
        });
        
        console.log('✅ Botón de actualización configurado');
    }
}

function initActionButtons() {
    // Botón de cola de reproducción
    const queueToggle = document.getElementById('queue-toggle');
    const queueSidebar = document.getElementById('queue-sidebar');
    const queueClose = document.getElementById('queue-close');
    
    if (queueToggle && queueSidebar && queueClose) {
        queueToggle.addEventListener('click', () => {
            queueSidebar.classList.toggle('open');
            console.log('📋 Cola de reproducción ' + (queueSidebar.classList.contains('open') ? 'abierta' : 'cerrada'));
        });
        
        queueClose.addEventListener('click', () => {
            queueSidebar.classList.remove('open');
            console.log('📋 Cola de reproducción cerrada');
        });
        
        if (!window.isMobile) {
            document.addEventListener('click', (e) => {
                if (queueSidebar.classList.contains('open') && 
                    !queueSidebar.contains(e.target) && 
                    e.target !== queueToggle) {
                    queueSidebar.classList.remove('open');
                }
            });
        }
        
        console.log('✅ Botón de cola de reproducción configurado');
    }
    
    // Botón de limpiar cola
    const clearQueueBtn = document.getElementById('clear-queue');
    if (clearQueueBtn) {
        clearQueueBtn.addEventListener('click', () => {
            if (window.player && window.player.clearQueue) {
                window.player.clearQueue();
            }
        });
    }
}

// Función para optimizar para móviles
function optimizeForMobile() {
    if (!window.isMobile) return;
    
    console.log('📱 Optimizando para móvil...');
    
    // Ajustar la fuente base
    document.documentElement.style.fontSize = '14px';
    
    // Asegurar que los botones sean tocables
    document.querySelectorAll('button:not(.mobile-menu-btn)').forEach(btn => {
        if (!btn.classList.contains('mobile-menu-btn')) {
            btn.style.minHeight = '44px';
            btn.style.minWidth = '44px';
            btn.style.padding = '12px 16px';
        }
    });
    
    // Ajustar el campo de búsqueda
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.style.height = '44px';
        searchInput.style.fontSize = '16px';
    }
    
    // Mejorar la barra de progreso del reproductor
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.height = '6px';
        progressBar.style.margin = '10px 0';
    }
    
    // Ajustar los controles del reproductor
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.style.width = '40px';
        btn.style.height = '40px';
        btn.style.fontSize = '18px';
    });
    
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.style.width = '50px';
        playBtn.style.height = '50px';
        playBtn.style.fontSize = '20px';
    }
    
    // Optimizar las tarjetas de canciones
    document.querySelectorAll('.song-item').forEach(item => {
        item.style.padding = '12px';
        item.style.marginBottom = '8px';
    });
    
    // Ajustar las imágenes de portada
    document.querySelectorAll('.song-cover').forEach(cover => {
        if (window.innerWidth < 768) {
            cover.style.width = '40px';
            cover.style.height = '40px';
        }
    });
}

// Llamar a la optimización móvil después de que se cargue todo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.isMobile) {
            optimizeForMobile();
        }
    }, 1000);
});

// Exportar funciones
window.initUI = initUI;
window.toggleTheme = toggleTheme;
window.toggleViewMode = toggleViewMode;
window.optimizeForMobile = optimizeForMobile;
window.initMobileMenu = initMobileMenu;
