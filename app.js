const API_BASE_URL = '/api'; //環境を変える場合ここを変更
let currentEditId = null;
let deleteModal = null;

//初期化
document.addEventListener('DOMContentLoaded', function() {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    document.getElementById('list-btn').addEventListener('click', () => showSection('list'));
    document.getElementById('create-btn').addEventListener('click', () => showSection('create'));
    document.getElementById('reload-btn').addEventListener('click', loadPosts);
    document.getElementById('clear-btn').addEventListener('click', () => document.getElementById('post-form').reset());
    document.getElementById('back-btn').addEventListener('click', () => showSection('list'));
    
    document.getElementById('post-form').addEventListener('submit', function(e) {
        e.preventDefault();
        createPost();
    });
    
    document.getElementById('edit-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updatePost();
    });
    
    showSection('list');
    }
);

//セクション表示と切り替え
function showSection(section) {
    ['list', 'create', 'edit'].forEach(s => {
        document.getElementById(s + '-section').style.display = s === section ? 'block' : 'none';
    });
    
    document.getElementById('list-btn').classList.toggle('active', section === 'list');
    document.getElementById('create-btn').classList.toggle('active', section === 'create');
    
    if (section === 'list') loadPosts();
}

//記事の一覧表示
async function loadPosts() {
    const container = document.getElementById('posts-container');
    //innderHTMLにメインの内容を表示
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border"></div></div>';
    
    try {
        const posts = await fetch(`${API_BASE_URL}/posts`).then(r => r.json());
        
        if (!posts.length) {
            container.innerHTML = '<div class="text-center py-4"><p>記事がありません</p></div>';
            return;
        }
        
        container.innerHTML = posts.map(post => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>${post.title}</h5>
                    <p>${(post.content || '').substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
                    <div class="d-flex justify-content-between">
                        <small>${new Date(post.created_at).toLocaleDateString('ja-JP')}</small>
                        <div>
                            <button class="btn btn-sm btn-outline-primary" onclick="editPost('${post.id}')">編集</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('${post.id}', '${post.title}')">削除</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">読み込みエラー</div>';
    }
}

//新規の投稿
async function createPost() {
    const data = new FormData(document.getElementById('post-form'));
    const post = { title: data.get('title').trim(), content: data.get('content').trim() };
    
    //空投稿かチェック
    if (!post.title || !post.content) {
        alert('タイトルと本文は必須です');
        return;
    }
    
    try {
        await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post)
        });
        
        document.getElementById('post-form').reset();
        showSection('list');
    } catch (error) {
        alert('投稿エラー: ' + error.message);
    }
}

//編集画面
async function editPost(id) {
    currentEditId = id;
    const post = await fetch(`${API_BASE_URL}/posts/${id}`).then(r => r.json());
    
    document.getElementById('edit-title').value = post.title;
    document.getElementById('edit-content').value = post.content;
    showSection('edit');
}

//投稿の更新
async function updatePost() {
    const data = new FormData(document.getElementById('edit-form'));
    const post = { title: data.get('title').trim(), content: data.get('content').trim() };
    
    await fetch(`${API_BASE_URL}/posts/${currentEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    });
    
    showSection('list');
}

//削除の確認
function confirmDelete(id, title) {
    document.getElementById('delete-title').textContent = title;
    document.getElementById('confirmDeleteBtn').onclick = () => deletePost(id);
    deleteModal.show();
}

//削除
async function deletePost(id) {
    await fetch(`${API_BASE_URL}/posts/${id}`, { method: 'DELETE' });
    deleteModal.hide();
    loadPosts();
}