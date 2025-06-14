const API_BASE_URL = '/api';

function showSection(sectionName) {
    console.log(`セクション切り替え: ${sectionName}`);
    
    // 全セクションを非表示
    document.getElementById('list-section').style.display = 'none';
    document.getElementById('create-section').style.display = 'none';
    
    // ボタンのアクティブ状態をリセット
    const listBtn = document.getElementById('list-btn');
    const createBtn = document.getElementById('create-btn');
    
    listBtn.style.backgroundColor = '';
    createBtn.style.backgroundColor = '';
    
    // 選択されたセクションを表示
    if (sectionName === 'list') {
        document.getElementById('list-section').style.display = 'block';
        listBtn.style.backgroundColor = '#ccc';
        loadPosts(); // 記事一覧を自動読み込み
    } else if (sectionName === 'create') {
        document.getElementById('create-section').style.display = 'block';
        createBtn.style.backgroundColor = '#ccc';
    }
}

// メッセージ表示関数
function showMessage(containerId, message, type = 'info') {
    const container = document.getElementById(containerId);
    let messageClass = '';
    
    // メッセージタイプに応じたスタイル
    if (type === 'error') {
        messageClass = 'color: red; background-color: #ffe6e6; padding: 10px; border: 1px solid red; margin-bottom: 10px;';
    } else if (type === 'success') {
        messageClass = 'color: green; background-color: #e6ffe6; padding: 10px; border: 1px solid green; margin-bottom: 10px;';
    } else {
        messageClass = 'color: blue; background-color: #e6f3ff; padding: 10px; border: 1px solid blue; margin-bottom: 10px;';
    }
    
    container.innerHTML = `<div style="${messageClass}">${message}</div>`;
    
    // 3秒後にメッセージを消去
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

// 記事一覧読み込み
async function loadPosts() {
    console.log('記事一覧を読み込み開始');
    const container = document.getElementById('posts-container');
    container.innerHTML = '<p>読み込み中...</p>';

    try {
        console.log('APIリクエスト送信:', `${API_BASE_URL}/posts`);
        const response = await fetch(`${API_BASE_URL}/posts`);
        
        console.log('レスポンス受信:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const posts = await response.json();
        console.log('取得した記事データ:', posts);

        container.innerHTML = '';

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p>まだ記事がありません。新規投稿から記事を作成してください。</p>';
            return;
        }

        // 記事一覧を表示
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.style.cssText = 'border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; background-color: #f9f9f9;';
            
            const createdDate = post.created_at ? 
                new Date(post.created_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '不明';
            
            postElement.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #333;">${escapeHtml(post.title || 'タイトルなし')}</h3>
                <p style="margin: 0 0 10px 0; line-height: 1.5;">${escapeHtml((post.content || '').substring(0, 200))}${post.content && post.content.length > 200 ? '...' : ''}</p>
                <p style="margin: 0; color: #666; font-size: 0.9em;">
                    <small>投稿日: ${createdDate}</small><br>
                    <small>ID: ${post.id}</small>
                </p>
            `;
            container.appendChild(postElement);
        });

        showMessage('message-container', `${posts.length}件の記事を読み込みました`, 'success');
        console.log(`記事読み込み完了: ${posts.length}件`);
        
    } catch (error) {
        console.error('記事の読み込みエラー:', error);
        container.innerHTML = '<p style="color: red;">記事の読み込みに失敗しました。サーバーが起動しているか確認してください。</p>';
        showMessage('message-container', `読み込みエラー: ${error.message}`, 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

async function createPost() {
    console.log('作成開始');
    
    const formData = new FormData(document.getElementById('post-form'));
    const postData = {
        title: formData.get('title').trim(),
        content: formData.get('content').trim()
    };

    console.log('投稿データ:', postData);


    if (!postData.title || !postData.content) {
        showMessage('create-message-container', 'タイトルと本文は必須です', 'error');
        return;
    }

    if (postData.title.length > 200) {
        showMessage('create-message-container', 'タイトルは200文字以内で入力してください', 'error');
        return;
    }

    try {
        console.log('API呼び出し開始');
        
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });

        console.log('投稿レスポンス:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('投稿成功:', result);
            
            showMessage('create-message-container', '記事を投稿しました！', 'success');
            document.getElementById('post-form').reset();

            setTimeout(() => {
                showSection('list');
            }, 2000);
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('投稿失敗:', errorData);
            showMessage('create-message-container', `投稿に失敗しました: ${errorData.error || response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('投稿エラー:', error);
        showMessage('create-message-container', `投稿エラー: ${error.message}`, 'error');
    }
}

// サーバー接続テスト
async function testConnection() {
    console.log('接続テスト開始');
    try {
        const response = await fetch('/health');
        if (response.ok) {
            const data = await response.json();
            console.log('接続OK:', data);
            return true;
        } else {
            console.error('接続エラー:', response.status);
            return false;
        }
    } catch (error) {
        console.error('接続テストエラー:', error);
        return false;
    }
}

function setupFormValidation() {
    const titleInput = document.getElementById('title');
    const contentTextarea = document.getElementById('content');
    
    titleInput.addEventListener('input', function() {
        const length = this.value.length;
        if (length > 200) {
            this.style.borderColor = 'red';
        } else {
            this.style.borderColor = '';
        }
    });
    
    contentTextarea.addEventListener('input', function() {
        const length = this.value.length;
        if (length > 0 && length < 10) {
            this.style.borderColor = 'orange';
        } else {
            this.style.borderColor = '';
        }
    });
}


function initializeApp() {
    console.log('初期化開始');
    

    const postForm = document.getElementById('post-form');
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('フォーム送信イベント発生');
        createPost();
    });
    

    setupFormValidation();
    
    // 接続テスト
    testConnection().then(connected => {
        if (connected) {
            showSection('list');
        } else {
            showMessage('message-container', 'サーバーに接続できません。アプリケーションが起動しているか確認してください。', 'error');
        }
    });
    
    console.log('アプリケーション初期化完了');
}


document.addEventListener('DOMContentLoaded', initializeApp);


window.debugInfo = function() {
    console.log('=== DEBUG INFO ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Current section visible:', 
        document.getElementById('list-section').style.display !== 'none' ? 'list' : 'create');
    console.log('Posts container content:', document.getElementById('posts-container').innerHTML.substring(0, 100));
    console.log('==================');
};


window.addEventListener('error', function(e) {
    console.error('JavaScript実行エラー:', e.error);
    showMessage('message-container', 'アプリケーションエラーが発生しました', 'error');
});


window.addEventListener('unhandledrejection', function(e) {
    console.error('未処理のPromise拒否:', e.reason);
    showMessage('message-container', 'ネットワークエラーが発生しました', 'error');
});