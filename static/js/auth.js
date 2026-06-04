// auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorDiv = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            errorDiv.textContent = '';
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (res.ok) {
                    window.location.href = '/';
                } else {
                    errorDiv.textContent = data.error || 'Error al iniciar sesión';
                }
            } catch (err) {
                errorDiv.textContent = 'Error de conexión';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            errorDiv.textContent = '';
            if (password.length < 6) {
                errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres';
                return;
            }
            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    window.location.href = '/login';
                } else {
                    errorDiv.textContent = data.error || 'Error al registrarse';
                }
            } catch (err) {
                errorDiv.textContent = 'Error de conexión';
            }
        });
    }
});
