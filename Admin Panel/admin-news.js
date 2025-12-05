// admin/admin-news.js
// --- NEW: Import API_URL from admin.js ---
import { API_URL } from './admin.js';

// Global variable for the Quill editor instance
let newsQuill;
// Track editing state
let isEditingNews = false;

// --- Initialization called by admin.js ---
export function initNews() {
    console.log("Initializing News Tab...");

    // 1. Initialize Quill Editor if not already done
    // Ensure the element exists before init
    if (!newsQuill && document.getElementById('news-quill-editor')) {
        // Check if Quill is loaded (from CDN)
        if (typeof Quill !== 'undefined') {
            newsQuill = new Quill('#news-quill-editor', {
                theme: 'snow',
                modules: {
                    toolbar: {
                        container: [
                            // --- FONT & SIZE ---
                            [{ 'font': [] }],
                            [{ 'size': ['small', false, 'large', 'huge'] }], // custom dropdown
                            
                            // --- HEADERS ---
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

                            // --- FORMATTING ---
                            ['bold', 'italic', 'underline', 'strike'], // toggles
                            [{ 'color': [] }, { 'background': [] }], // dropdowns with defaults from theme
                            [{ 'script': 'sub'}, { 'script': 'super' }], // superscript/subscript

                            // --- BLOCKS ---
                            ['blockquote', 'code-block'],

                            // --- LISTS & INDENT ---
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'indent': '-1'}, { 'indent': '+1' }], // outdent/indent
                            [{ 'direction': 'rtl' }], // text direction

                            // --- ALIGNMENT ---
                            [{ 'align': [] }],

                            // --- MEDIA & LINKS ---
                            ['link', 'image', 'video'],

                            // --- UTILS ---
                            ['clean'] // remove formatting button
                        ],
                        // Custom handler for image button click
                        handlers: { image: newsImageHandler }
                    }
                }
            });
        } else {
            console.error("Quill library not loaded!");
        }
    }

    // 2. Setup Event Listeners
    const btnAdd = document.getElementById('btn-add-news');
    if(btnAdd) btnAdd.addEventListener('click', () => openNewsEditor());
    
    const btnCancel = document.getElementById('btn-cancel-news');
    if(btnCancel) btnCancel.addEventListener('click', closeNewsEditor);
    
    const formNews = document.getElementById('news-form');
    if(formNews) formNews.addEventListener('submit', saveNewsArticle);

    // 3. Load initial data
    loadNews();
}


// --- Image Upload Handler for Quill ---
function newsImageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            // Get token from localStorage since this is an admin action
            const token = localStorage.getItem('admin-token');
            
            const res = await fetch(`${API_URL}/api/news/upload`, {
                method: 'POST',
                headers: { 'x-auth-token': token }, // Add auth header
                body: formData // Browser sets Content-Type automatically for FormData
            });
            const data = await res.json();

            if (res.ok) {
                // Insert image URL at current cursor position
                const range = newsQuill.getSelection();
                newsQuill.insertEmbed(range ? range.index : 0, 'image', data.url);
            } else {
                alert('Image upload failed: ' + (data.msg || res.statusText));
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Error uploading image to server.');
        }
    };
}


// --- CRUD Operations ---

// READ (Load List)
async function loadNews() {
    try {
        const token = localStorage.getItem('admin-token');
        const res = await fetch(`${API_URL}/api/news/admin`, {
            headers: { 'x-auth-token': token }
        }); 
        const articles = await res.json();
        
        const tbody = document.querySelector('#news-table tbody');
        if(!tbody) return;
        
        tbody.innerHTML = '';

        articles.forEach(article => {
            const row = document.createElement('tr');
            
            // Create buttons dynamically to attach listeners directly (safer than onclick string)
            const editBtn = document.createElement('button');
            editBtn.className = "btn-edit";
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.onclick = () => editNews(article);
            
            const delBtn = document.createElement('button');
            delBtn.className = "btn-delete";
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.onclick = () => deleteNews(article._id);
            
            const actionsTd = document.createElement('td');
            actionsTd.appendChild(editBtn);
            actionsTd.appendChild(delBtn);

            row.innerHTML = `
                <td>${new Date(article.createdAt).toLocaleDateString()}</td>
                <td><strong>${article.title}</strong></td>
                <td>${article.category}</td>
                <td>
                    <span class="status-badge ${article.isPublished ? 'published' : 'draft'}">
                        ${article.isPublished ? 'Published' : 'Draft'}
                    </span>
                </td>
            `;
            row.appendChild(actionsTd);
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading news:', err);
    }
}

// CREATE / UPDATE (Save)
async function saveNewsArticle(e) {
    e.preventDefault();
    
    // Get raw text content for preview generation (strip HTML)
    const rawText = newsQuill.getText();
    // Generate preview: First 150 chars + ellipsis if longer
    let autoPreview = rawText.trim().substring(0, 150);
    if (rawText.trim().length > 150) autoPreview += '...';
    // If empty (e.g. only images), use a placeholder
    if (!autoPreview) autoPreview = "Click to view details.";

    const articleData = {
        title: document.getElementById('news-title').value,
        category: document.getElementById('news-category').value,
        isPublished: document.getElementById('news-published').checked,
        preview: autoPreview, // Use auto-generated preview
        content: newsQuill.root.innerHTML // Get HTML from Quill
    };

    // Basic validation for rich text area
    if (newsQuill.getText().trim().length === 0 && articleData.content.indexOf('<img') === -1) {
         alert('Content body cannot be empty.');
         return;
    }

    const articleId = document.getElementById('news-id').value;
    const endpoint = isEditingNews 
        ? `${API_URL}/api/news/${articleId}` 
        : `${API_URL}/api/news`;
    const method = isEditingNews ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('admin-token');
        const res = await fetch(endpoint, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(articleData)
        });

        if (res.ok) {
            closeNewsEditor();
            loadNews();
        } else {
            const data = await res.json();
            alert('Error saving article: ' + data.msg);
        }
    } catch (err) {
        console.error('Error saving article:', err);
        alert('Server error while saving article.');
    }
}

// DELETE
async function deleteNews(id) {
    if (!confirm('Are you sure you want to delete this article? This cannot be undone.')) return;

    try {
        const token = localStorage.getItem('admin-token');
        const res = await fetch(`${API_URL}/api/news/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            loadNews();
        } else {
             alert('Error deleting article');
        }
    } catch (err) {
        console.error('Error deleting article:', err);
    }
}


// --- View Switching Helpers ---

// Triggered by Edit button in table
export function editNews(article) {
    openNewsEditor(article);
};

function openNewsEditor(articleToEdit = null) {
    resetNewsForm();
    document.getElementById('news-list-view').classList.add('hidden');
    document.getElementById('news-editor-view').classList.remove('hidden');

    if (articleToEdit) {
        isEditingNews = true;
        document.getElementById('news-id').value = articleToEdit._id;
        document.getElementById('news-title').value = articleToEdit.title;
        document.getElementById('news-category').value = articleToEdit.category;
        document.getElementById('news-published').checked = articleToEdit.isPublished;
        
        // Note: We no longer populate a preview field since it's auto-generated on save
        
        // Load content into Quill editor
        newsQuill.root.innerHTML = articleToEdit.content;
    }
}

function closeNewsEditor() {
    resetNewsForm();
    document.getElementById('news-editor-view').classList.add('hidden');
    document.getElementById('news-list-view').classList.remove('hidden');
}

function resetNewsForm() {
    isEditingNews = false;
    document.getElementById('news-id').value = '';
    document.getElementById('news-form').reset();
    if (newsQuill) newsQuill.setContents([]); // Clear editor
}