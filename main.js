        // State
let prompts = [];
let currentCategory = 'all';
let editingPromptId = null;
let improvedContent = null;

// Initialize
async function initApp() {
    showLoading();
    try {
        const storedPrompts = await puter.kv.get('prompts');
        if (storedPrompts) {
            prompts = JSON.parse(storedPrompts);
        }
        renderPrompts();
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error loading prompts', 'error');
    } finally {
        hideLoading();
    }
}

// Render prompts
function renderPrompts() {
    const grid = document.getElementById('promptsGrid');
    if (!grid) {
        console.error('Error: promptsGrid element not found');
        return;
    }
    
    const searchTerm = document.querySelector('.search-box').value.toLowerCase();
    
    let filtered = prompts;
    if (currentCategory !== 'all') {
        filtered = prompts.filter(p => p.category === currentCategory);
    }
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchTerm) || 
            p.content.toLowerCase().includes(searchTerm) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }

    grid.innerHTML = filtered.length > 0 ? filtered.map(prompt => `
        <div class="prompt-card">
            <div class="prompt-title">${prompt.title}</div>
            <div class="prompt-description">${prompt.description || ''}</div>
            <div class="prompt-content">${prompt.content}</div>
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="copyPrompt('${prompt.id}')">Copy</button>
                <button class="btn btn-secondary" onclick="editPrompt('${prompt.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deletePrompt('${prompt.id}')">Delete</button>
            </div>
        </div>
    `).join('') : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No prompts found</p>';
}

// AI Improvement
async function improveWithAI() {
    const title = document.getElementById('promptTitle').value;
    const description = document.getElementById('promptDescription').value;
    const content = document.getElementById('promptContent').value;
    const category = document.getElementById('promptCategory').value;

    if (!content) {
        showToast('Please enter prompt content first', 'error');
        return;
    }

    showLoading();
    try {
        const aiPrompt = `As an AI prompt expert, please improve the following prompt while maintaining its core purpose.
            Original prompt: "${content}"
            Context: This is a ${category} prompt titled "${title}"
            Description: ${description}
            
            Please provide an improved version that is more effective, clearer, and more likely to generate better results.
            Only return the improved prompt text without any explanations.`;

        improvedContent = await puter.ai.chat(aiPrompt);
        
        document.getElementById('aiImprovedContent').textContent = improvedContent;
        document.getElementById('aiImprovement').style.display = 'block';
        showToast('Prompt improved successfully!', 'success');
    } catch (error) {
        console.error('Error improving prompt:', error);
        showToast('Error improving prompt. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function applyImprovement() {
    if (improvedContent) {
        document.getElementById('promptContent').value = improvedContent;
        document.getElementById('aiImprovement').style.display = 'none';
        improvedContent = null;
    }
}

// Modal management
function showAddPromptModal() {
    document.getElementById('modalTitle').textContent = 'Create New Prompt';
    document.getElementById('promptModal').style.display = 'flex';
    document.getElementById('promptTitle').value = '';
    document.getElementById('promptDescription').value = '';
    document.getElementById('promptContent').value = '';
    document.getElementById('aiImprovement').style.display = 'none';
    editingPromptId = null;
    improvedContent = null;
}

function hidePromptModal() {
    document.getElementById('promptModal').style.display = 'none';
    improvedContent = null;
}

// Prompt management
async function savePrompt() {
    const title = document.getElementById('promptTitle').value;
    const description = document.getElementById('promptDescription').value;
    const content = document.getElementById('promptContent').value;
    const category = document.getElementById('promptCategory').value;

    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    showLoading();
    try {
        const prompt = {
            id: editingPromptId || Date.now().toString(),
            title,
            description,
            content,
            category,
            created: editingPromptId ? undefined : new Date().toISOString(),
            updated: new Date().toISOString()
        };

        if (editingPromptId) {
            const index = prompts.findIndex(p => p.id === editingPromptId);
            prompts[index] = { ...prompts[index], ...prompt };
        } else {
            prompts.unshift(prompt);
        }

        await puter.kv.set('prompts', JSON.stringify(prompts));
        hidePromptModal();
        renderPrompts();
        showToast('Prompt saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving prompt:', error);
        showToast('Error saving prompt. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function deletePrompt(id) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    showLoading();
    try {
        prompts = prompts.filter(p => p.id !== id);
        await puter.kv.set('prompts', JSON.stringify(prompts));
        renderPrompts();
        showToast('Prompt deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting prompt:', error);
        showToast('Error deleting prompt. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function editPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    editingPromptId = id;
    document.getElementById('modalTitle').textContent = 'Edit Prompt';
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptDescription').value = prompt.description || '';
    document.getElementById('promptContent').value = prompt.content;
    document.getElementById('promptCategory').value = prompt.category;
    document.getElementById('aiImprovement').style.display = 'none';
    document.getElementById('promptModal').style.display = 'flex';
}

async function copyPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    try {
        await navigator.clipboard.writeText(prompt.content);
        showToast('Prompt copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('Error copying to clipboard. Please try again.', 'error');
    }
}

// Utility functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Event listeners
document.querySelector('.search-box').addEventListener('input', renderPrompts);

document.querySelector('nav').addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-item')) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderPrompts();
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);