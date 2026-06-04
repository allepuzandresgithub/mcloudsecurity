// admin.js - Panel de administración de usuarios

let currentUserRole = 'user';

async function initAdminPanel() {
    const user = await fetchCurrentUser();
    if (!user) return;
    currentUserRole = user.role || 'user';

    // Mostrar/ocultar elementos según rol
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = currentUserRole === 'admin' ? '' : 'none';
    });

    // Rellenar info del usuario en sidebar
    const nameEl   = document.getElementById('sidebar-username');
    const statsEl  = document.getElementById('sidebar-user-stats');
    const avatarEl = document.getElementById('sidebar-avatar-img');
    const roleEl   = document.getElementById('sidebar-role-badge');

    if (nameEl) nameEl.textContent = user.username || '';

    const sc = user.song_count || 0;
    if (statsEl) statsEl.textContent = `${sc} ${sc === 1 ? 'canción' : 'canciones'} · ${user.storage_used_mb || 0} MB`;

    if (avatarEl && user.avatar_url) avatarEl.src = user.avatar_url;

    // Solo mostrar badge si es admin, nunca mostrar "Usuario"
    if (roleEl) {
        if (user.role === 'admin') {
            roleEl.textContent = 'Admin';
            roleEl.style.display = '';
        } else {
            roleEl.style.display = 'none';
        }
    }

    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login';
        });
    }
}

async function fetchCurrentUser() {
    try {
        const res = await fetch('/api/user');
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// -------------------------------------------------------------------
// Panel de usuarios (solo admin)
// -------------------------------------------------------------------
async function loadAdminUsers() {
    const container = document.getElementById('admin-users-list');
    const statsEl   = document.getElementById('admin-global-stats');
    if (!container) return;

    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando usuarios...</p></div>';

    try {
        const [usersRes, statsRes] = await Promise.all([
            fetch('/api/admin/users'),
            fetch('/api/admin/stats')
        ]);

        if (!usersRes.ok) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><p>Sin permisos de administrador</p></div>';
            return;
        }

        const { users } = await usersRes.json();
        const stats = statsRes.ok ? await statsRes.json() : {};

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="admin-stat-card">
                    <i class="fas fa-users"></i>
                    <div><strong>${stats.total_users || 0}</strong><span>Usuarios</span></div>
                </div>
                <div class="admin-stat-card">
                    <i class="fas fa-music"></i>
                    <div><strong>${stats.total_songs || 0}</strong><span>Canciones totales</span></div>
                </div>
                <div class="admin-stat-card">
                    <i class="fas fa-hdd"></i>
                    <div><strong>${stats.total_size_gb || 0} GB</strong><span>Almacenamiento</span></div>
                </div>
            `;
        }

        if (!users || !users.length) {
            container.innerHTML = '<div class="empty-state"><p>No hay usuarios registrados</p></div>';
            return;
        }

        container.innerHTML = '';
        users.forEach(user => renderUserRow(container, user));

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Error cargando usuarios</p></div>`;
        console.error(err);
    }
}

function renderUserRow(container, user) {
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    row.dataset.userId = user.id;

    const lastLogin = user.last_login
        ? new Date(user.last_login).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
        : 'Nunca';

    const isAdmin  = user.role === 'admin';
    const initials = (user.username || '?').slice(0, 2).toUpperCase();

    row.innerHTML = `
        <div class="admin-user-avatar" style="background: var(--gradient-primary);">
            ${user.avatar_url && !user.avatar_url.includes('default')
                ? `<img src="${user.avatar_url}" alt="${user.username}">`
                : `<span>${initials}</span>`}
        </div>
        <div class="admin-user-info">
            <div class="admin-user-name">
                ${user.username}
                <span class="role-badge ${isAdmin ? 'role-admin' : 'role-user'}">${isAdmin ? 'Admin' : 'Usuario'}</span>
            </div>
            <div class="admin-user-meta">${user.email}</div>
            <div class="admin-user-meta">
                <i class="fas fa-music"></i> ${user.song_count || 0} canciones &nbsp;
                <i class="fas fa-hdd"></i> ${user.storage_mb || 0} MB &nbsp;
                <i class="fas fa-clock"></i> ${lastLogin}
            </div>
        </div>
        <div class="admin-user-actions">
            <button class="btn-admin-action ${isAdmin ? 'btn-demote' : 'btn-promote'}"
                    onclick="toggleUserRole(${user.id}, '${isAdmin ? 'user' : 'admin'}', this)"
                    title="${isAdmin ? 'Quitar admin' : 'Hacer admin'}">
                <i class="fas fa-${isAdmin ? 'user-minus' : 'user-shield'}"></i>
                ${isAdmin ? 'Quitar admin' : 'Hacer admin'}
            </button>
            <button class="btn-admin-action btn-delete-user"
                    onclick="confirmDeleteUser(${user.id}, '${user.username}')"
                    title="Eliminar usuario">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(row);
}

async function toggleUserRole(userId, newRole, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });
        if (res.ok) {
            showToast(`Rol actualizado a "${newRole}"`, 'success');
            loadAdminUsers();
        } else {
            showToast('Error actualizando rol', 'error');
            btn.disabled = false;
        }
    } catch {
        showToast('Error de conexión', 'error');
        btn.disabled = false;
    }
}

function confirmDeleteUser(userId, username) {
    if (!confirm(`¿Eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) return;
    deleteUser(userId);
}

async function deleteUser(userId) {
    try {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Usuario eliminado', 'success');
            const row = document.querySelector(`.admin-user-row[data-user-id="${userId}"]`);
            if (row) row.remove();
        } else {
            showToast(data.error || 'Error eliminando usuario', 'error');
        }
    } catch {
        showToast('Error de conexión', 'error');
    }
}

// -------------------------------------------------------------------
// Toast notifications
// -------------------------------------------------------------------
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: 'check-circle', error: 'exclamation-circle',
                    info: 'info-circle', warning: 'exclamation-triangle' };
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-show'));

    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

// Exportar globales
window.initAdminPanel   = initAdminPanel;
window.loadAdminUsers   = loadAdminUsers;
window.toggleUserRole   = toggleUserRole;
window.confirmDeleteUser = confirmDeleteUser;
window.showToast        = showToast;
