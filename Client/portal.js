// client/portal.js
const API_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
    initNews();
    initPortalAuth();
});

// --- NEWS LOGIC ---
let articles = [];
const itemsPerPage = 16;
let currentPage = 1;
let totalPages = 1;

async function fetchNews() {
    try {
        const res = await fetch(`${API_URL}/api/news/portal`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        articles = data.map(a => ({
            id: a._id,
            title: a.title,
            date: new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            preview: a.preview,
            content: a.content,
            category: a.category
        }));
        totalPages = Math.ceil(articles.length / itemsPerPage) || 1;
        renderPage(1);
        
        // Handle URL Deep Linking
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('article_id');
        if (articleId) {
            const found = articles.find(a => a.id === articleId);
            if (found) openArticle(found, false);
        }
        
    } catch (err) {
        document.getElementById('news-grid').innerHTML = '<p style="color: #ff6b6b;">Could not load news from server.</p>';
    }
}

function initNews() {
    fetchNews();
    
    document.getElementById('prev-page-btn').onclick = () => changePage(-1);
    document.getElementById('next-page-btn').onclick = () => changePage(1);
    
    const backBtn = document.getElementById('back-to-hub-btn');
    if (backBtn) backBtn.onclick = () => {
        closeArticle();
        history.pushState({}, "", window.location.pathname);
    };
    
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.articleId) {
            const found = articles.find(a => a.id === event.state.articleId);
            if (found) openArticle(found, false);
        } else {
            closeArticle();
        }
    });
}

function renderPage(page) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    
    if (articles.length === 0) {
        grid.innerHTML = '<p style="color: #ccc;">No news articles found.</p>';
        return;
    }

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    articles.slice(start, end).forEach(item => {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.innerHTML = `
            <div class="news-header"><h3>${item.title}</h3><span class="date">${item.date}</span></div>
            <p>${item.preview}</p><div class="corner-bottom"></div>
        `;
        div.onclick = () => openArticle(item, true);
        grid.appendChild(div);
    });

    document.getElementById('page-indicator').textContent = `Page ${page} / ${totalPages}`;
    document.getElementById('prev-page-btn').disabled = page === 1;
    document.getElementById('next-page-btn').disabled = page === totalPages;
}

function changePage(delta) {
    if (delta === -1 && currentPage > 1) { currentPage--; renderPage(currentPage); }
    if (delta === 1 && currentPage < totalPages) { currentPage++; renderPage(currentPage); }
}

function openArticle(item, pushHistory) {
    document.getElementById('full-article-title').textContent = item.title;
    document.getElementById('full-article-date').textContent = item.date;
    document.getElementById('full-article-body').innerHTML = item.content;
    
    document.getElementById('news-grid-view').classList.add('hidden');
    document.getElementById('single-article-view').classList.remove('hidden');
    
    if (pushHistory) {
        const newUrl = `${window.location.pathname}?article_id=${item.id}`;
        history.pushState({ articleId: item.id }, "", newUrl);
    }
}

function closeArticle() {
    document.getElementById('single-article-view').classList.add('hidden');
    document.getElementById('news-grid-view').classList.remove('hidden');
}

// --- AUTH LOGIC (Sidebar) ---
function initPortalAuth() {
    let isLoggedIn = false;
    const authMessage = document.getElementById('portal-auth-message');
    
    // Toggle
    document.getElementById('login-trigger-btn').addEventListener('click', () => {
        document.getElementById('login-dropdown').classList.toggle('closed');
        document.getElementById('login-trigger-btn').classList.toggle('active');
    });

    // Login
    document.getElementById('portal-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('pl-username').value;
        const password = document.getElementById('pl-password').value;
        
        try {
            const res = await fetch(`${API_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                isLoggedIn = true;
                localStorage.setItem('token', data.token);
                updateAuthUI(data.user.username);
                authMessage.textContent = "";
            } else {
                authMessage.textContent = data.msg;
                authMessage.className = "error";
            }
        } catch (err) {
            authMessage.textContent = "Server error.";
        }
    });

    // Register
    document.getElementById('portal-register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('pr-username').value;
        const password = document.getElementById('pr-password').value;
        try {
            const res = await fetch(`${API_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                authMessage.textContent = "Registered! You can now log in.";
                authMessage.className = "success";
                document.getElementById('portal-register-form').reset();
            } else {
                authMessage.textContent = data.msg;
                authMessage.className = "error";
            }
        } catch (err) {
            authMessage.textContent = "Server error.";
        }
    });

    // Logout
    document.getElementById('portal-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        isLoggedIn = false;
        updateAuthUI(null);
    });

    // Check existing session
    const token = localStorage.getItem('token');
    if (token) {
        // Optimistically show logged in state (In real app, verify token)
        isLoggedIn = true;
        updateAuthUI("Player"); 
    }
}

function updateAuthUI(username) {
    const loggedOut = document.getElementById('logged-out-content');
    const loggedIn = document.getElementById('logged-in-content');
    const triggerText = document.getElementById('login-text');
    const triggerIcon = document.getElementById('login-icon');
    
    if (username) {
        loggedOut.classList.add('hidden');
        loggedIn.classList.remove('hidden');
        triggerText.textContent = "My Account";
        triggerIcon.className = "fa-solid fa-user-check";
        document.getElementById('welcome-user-text').textContent = `Welcome, ${username}!`;
    } else {
        loggedOut.classList.remove('hidden');
        loggedIn.classList.add('hidden');
        triggerText.textContent = "Login / Register";
        triggerIcon.className = "fa-solid fa-lock";
    }
}