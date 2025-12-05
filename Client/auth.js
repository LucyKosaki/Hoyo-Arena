// --- This file handles authentication ---
import { ui } from './ui.js'; // Import the ui object

/**
 * Initializes all authentication-related event listeners.
 * @param {function} connectCallback - The function to call on successful login.
 * @param {function} logMessage - The main logger function.
 */
export function initAuth(connectCallback, logMessage) {
    // Now that initAuth() is called *after* initUI(), ui.loginForm is guaranteed to exist
    ui.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the page from reloading
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                ui.authMessage.textContent = 'Login successful!';
                localStorage.setItem('token', data.token); // Save the *new* token
                // Call the main callback function to connect the socket
                connectCallback(data.token);
            } else {
                ui.authMessage.textContent = data.msg || 'Login failed.';
            }
        } catch (err) {
            ui.authMessage.textContent = 'Server error. Is it running?';
            console.error("Login fetch error:", err); // Log the full error
        }
    });
    
    ui.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            const res = await fetch('http://localhost:5000/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                ui.authMessage.textContent = 'Registration successful! Please log in.';
                ui.registerForm.reset();
            } else {
                ui.authMessage.textContent = data.msg || 'Registration failed.';
            }
        } catch (err) {
            ui.authMessage.textContent = 'Server error. Is it running?';
            console.error("Register fetch error:", err); // Log the full error
        }
    });
}

/**
 * Shows the authentication screen and hides all others.
 */
export function showAuthScreen() {
    ui.authContainer.classList.remove('hidden');
    ui.lobbyScreen.classList.add('hidden');
    ui.gameWrapper.classList.add('hidden');
}