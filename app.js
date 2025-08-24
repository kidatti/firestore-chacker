// Firebase SDKの動的インポート
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    getDocs,
    doc,
    getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定とアプリの変数
let app, auth, db, googleProvider;

// DOM要素の取得
const configSection = document.getElementById('config-section');
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');

// 設定画面の要素
const jsonTab = document.getElementById('json-tab');
const formTab = document.getElementById('form-tab');
const jsonConfig = document.getElementById('json-config');
const formConfig = document.getElementById('form-config');
const firebaseJsonInput = document.getElementById('firebase-json');
const jsonValidationStatus = document.getElementById('json-validation-status');
const jsonError = document.getElementById('json-error');

const apiKeyInput = document.getElementById('api-key');
const authDomainInput = document.getElementById('auth-domain');
const projectIdInput = document.getElementById('project-id');
const storageBucketInput = document.getElementById('storage-bucket');
const messagingSenderIdInput = document.getElementById('messaging-sender-id');
const appIdInput = document.getElementById('app-id');
const saveConfigBtn = document.getElementById('save-config-btn');
const clearConfigBtn = document.getElementById('clear-config-btn');
const clearSavedConfigBtn = document.getElementById('clear-saved-config-btn');
const savedConfigStatus = document.getElementById('saved-config-status');
const savedProjectId = document.getElementById('saved-project-id');
const savedAuthDomain = document.getElementById('saved-auth-domain');
const configError = document.getElementById('config-error');

// ログイン画面の要素
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const changeConfigBtn = document.getElementById('change-config-btn');
const logoutBtn = document.getElementById('logout-btn');
const changeConfigMainBtn = document.getElementById('change-config-main-btn');
const logoutClearConfigBtn = document.getElementById('logout-clear-config-btn');
const userEmailSpan = document.getElementById('user-email');
const authError = document.getElementById('auth-error');

// データ表示の要素
const collectionNameInput = document.getElementById('collection-name');
const loadDataBtn = document.getElementById('load-data-btn');
const loadCollectionsBtn = document.getElementById('load-collections-btn');
const collectionsList = document.getElementById('collections-list');
const loading = document.getElementById('loading');
const dataError = document.getElementById('data-error');
const dataCount = document.getElementById('data-count');
const dataContent = document.getElementById('data-content');

// ユーティリティ関数
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function hideError(element) {
    element.classList.remove('show');
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showConfigSection() {
    configSection.classList.remove('hidden');
    loginSection.classList.add('hidden');
    mainSection.classList.add('hidden');
}

function showLoginSection() {
    configSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
}

function showMainSection() {
    configSection.classList.add('hidden');
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
}

// Firebase設定関連の関数
function parseFirebaseConfig(jsonText) {
    try {
        // JavaScriptの変数宣言を含む形式から設定オブジェクトを抽出
        let configText = jsonText.trim();
        
        if (!configText) {
            throw new Error('設定が入力されていません');
        }
        
        // const firebaseConfig = { ... }; 形式の場合
        if (configText.includes('const') || configText.includes('var') || configText.includes('let')) {
            // = の後の部分を抽出
            const match = configText.match(/=\s*(\{[\s\S]*\});?\s*$/);
            if (match) {
                configText = match[1];
            } else {
                throw new Error('変数宣言の形式が正しくありません');
            }
        }
        
        // セミコロンを除去
        configText = configText.replace(/;?\s*$/, '');
        
        // 基本的なJSON形式チェック
        if (!configText.startsWith('{') || !configText.endsWith('}')) {
            throw new Error('オブジェクトの形式が正しくありません（{}で囲まれている必要があります）');
        }
        
        // JavaScriptオブジェクトをJSONに変換（プロパティ名を引用符で囲む）
        configText = configText.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
        
        // 末尾のカンマを除去
        configText = configText.replace(/,(\s*[}\]])/g, '$1');
        
        let config;
        try {
            config = JSON.parse(configText);
        } catch (parseError) {
            throw new Error(`JSON形式エラー: ${parseError.message}`);
        }
        
        // 必要なプロパティがあるかチェック
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`必須項目が不足しています: ${missingFields.join(', ')}`);
        }
        
        return config;
    } catch (error) {
        console.error('JSON解析エラー:', error);
        throw error;
    }
}

// JSON入力の検証とUI更新
function validateJsonInput(jsonText) {
    // 空の場合は何も表示しない
    if (!jsonText.trim()) {
        clearJsonValidationUI();
        return { isValid: false, config: null, error: null };
    }
    
    try {
        const config = parseFirebaseConfig(jsonText);
        showJsonValidationSuccess();
        return { isValid: true, config, error: null };
    } catch (error) {
        showJsonValidationError(error.message);
        return { isValid: false, config: null, error: error.message };
    }
}

// JSON検証UIの更新関数
function showJsonValidationSuccess() {
    firebaseJsonInput.classList.remove('json-invalid');
    firebaseJsonInput.classList.add('json-valid');
    jsonValidationStatus.textContent = '✓ 有効';
    jsonValidationStatus.className = 'json-validation-status valid';
    jsonError.classList.remove('show');
}

function showJsonValidationError(errorMessage) {
    firebaseJsonInput.classList.remove('json-valid');
    firebaseJsonInput.classList.add('json-invalid');
    jsonValidationStatus.textContent = '✗ エラー';
    jsonValidationStatus.className = 'json-validation-status invalid';
    jsonError.textContent = errorMessage;
    jsonError.classList.add('show');
}

function clearJsonValidationUI() {
    firebaseJsonInput.classList.remove('json-valid', 'json-invalid');
    jsonValidationStatus.textContent = '';
    jsonValidationStatus.className = 'json-validation-status';
    jsonError.classList.remove('show');
}

function loadSavedConfig() {
    const savedConfig = localStorage.getItem('firebaseConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            
            // JSON入力欄に整形されたJSONを表示
            firebaseJsonInput.value = JSON.stringify(config, null, 2);
            
            // フォーム入力欄にも値を設定
            apiKeyInput.value = config.apiKey || '';
            authDomainInput.value = config.authDomain || '';
            projectIdInput.value = config.projectId || '';
            storageBucketInput.value = config.storageBucket || '';
            messagingSenderIdInput.value = config.messagingSenderId || '';
            appIdInput.value = config.appId || '';
            
            // 保存された設定の状態表示を更新
            updateSavedConfigStatus(config);
            
            return config;
        } catch (error) {
            console.error('保存された設定の読み込みエラー:', error);
            return null;
        }
    } else {
        // 保存された設定がない場合は状態表示を隠す
        hideSavedConfigStatus();
    }
    return null;
}

// 保存された設定の状態表示を更新
function updateSavedConfigStatus(config) {
    if (config && config.projectId && config.authDomain) {
        savedProjectId.textContent = config.projectId;
        savedAuthDomain.textContent = config.authDomain;
        savedConfigStatus.classList.remove('hidden');
    } else {
        hideSavedConfigStatus();
    }
}

// 保存された設定の状態表示を隠す
function hideSavedConfigStatus() {
    savedConfigStatus.classList.add('hidden');
    savedProjectId.textContent = '-';
    savedAuthDomain.textContent = '-';
}

function getCurrentConfig() {
    // アクティブなタブに応じて設定を取得
    if (!jsonConfig.classList.contains('hidden')) {
        // JSON入力から設定を取得
        const jsonText = firebaseJsonInput.value.trim();
        if (!jsonText) {
            throw new Error('Firebase設定のJSONを入力してください');
        }
        
        // リアルタイム検証の結果を利用
        const validation = validateJsonInput(jsonText);
        if (!validation.isValid) {
            throw new Error(validation.error || 'JSON形式が正しくありません');
        }
        
        return validation.config;
    } else {
        // フォーム入力から設定を取得
        const config = {
            apiKey: apiKeyInput.value.trim(),
            authDomain: authDomainInput.value.trim(),
            projectId: projectIdInput.value.trim(),
            storageBucket: storageBucketInput.value.trim(),
            messagingSenderId: messagingSenderIdInput.value.trim(),
            appId: appIdInput.value.trim()
        };
        
        // 必須項目のチェック
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`必須項目が不足しています: ${missingFields.join(', ')}`);
        }
        
        return config;
    }
}

function saveConfig() {
    try {
        const config = getCurrentConfig();
        localStorage.setItem('firebaseConfig', JSON.stringify(config));
        return config;
    } catch (error) {
        showError(configError, error.message);
        return false;
    }
}

function initializeFirebase(config) {
    try {
        app = initializeApp(config);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        
        // 認証状態の監視を開始
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userEmailSpan.textContent = user.email;
                showMainSection();
                loadAvailableCollections();
            } else {
                showLoginSection();
            }
        });
        
        return true;
    } catch (error) {
        console.error('Firebase初期化エラー:', error);
        showError(configError, 'Firebase設定が無効です。設定を確認してください');
        return false;
    }
}

// 設定をクリアして設定画面に戻る
function clearConfigAndReturnToSetup() {
    localStorage.removeItem('firebaseConfig');
    
    // 入力フィールドをクリア
    firebaseJsonInput.value = '';
    apiKeyInput.value = '';
    authDomainInput.value = '';
    projectIdInput.value = '';
    storageBucketInput.value = '';
    messagingSenderIdInput.value = '';
    appIdInput.value = '';
    
    // JSON検証UIをクリア
    clearJsonValidationUI();
    
    // エラーメッセージをクリア
    hideError(configError);
    hideError(authError);
    hideError(dataError);
    
    // データをクリア
    emailInput.value = '';
    passwordInput.value = '';
    collectionNameInput.value = 'users';
    dataContent.innerHTML = '';
    dataCount.textContent = '';
    collectionsList.innerHTML = '';
    
    // 保存された設定表示をクリア
    hideSavedConfigStatus();
    
    // Firebase変数をリセット
    app = null;
    auth = null;
    db = null;
    googleProvider = null;
    
    // 設定画面に戻る
    showConfigSection();
}

// アプリ初期化
function initializeAppState() {
    const savedConfig = loadSavedConfig();
    
    if (savedConfig && initializeFirebase(savedConfig)) {
        // 設定が保存されており、Firebase初期化に成功した場合はログイン画面へ
        showLoginSection();
    } else {
        // 設定がない場合は設定画面を表示
        showConfigSection();
        // 設定画面でも保存された設定があるかチェック
        loadSavedConfig();
    }
}

// 設定保存ボタンのイベントリスナー
saveConfigBtn.addEventListener('click', () => {
    hideError(configError);
    
    const config = saveConfig();
    if (config) {
        saveConfigBtn.disabled = true;
        saveConfigBtn.textContent = '初期化中...';
        
        if (initializeFirebase(config)) {
            showLoginSection();
        }
        
        saveConfigBtn.disabled = false;
        saveConfigBtn.textContent = '設定を保存';
    }
});

// 設定クリアボタンのイベントリスナー
clearConfigBtn.addEventListener('click', () => {
    if (confirm('入力フィールドをクリアしますか？')) {
        firebaseJsonInput.value = '';
        apiKeyInput.value = '';
        authDomainInput.value = '';
        projectIdInput.value = '';
        storageBucketInput.value = '';
        messagingSenderIdInput.value = '';
        appIdInput.value = '';
        clearJsonValidationUI();
        hideError(configError);
    }
});

// 保存された設定削除ボタンのイベントリスナー
clearSavedConfigBtn.addEventListener('click', () => {
    if (confirm('保存されている設定を完全に削除しますか？この操作は元に戻せません。')) {
        localStorage.removeItem('firebaseConfig');
        
        // 入力フィールドもクリア
        firebaseJsonInput.value = '';
        apiKeyInput.value = '';
        authDomainInput.value = '';
        projectIdInput.value = '';
        storageBucketInput.value = '';
        messagingSenderIdInput.value = '';
        appIdInput.value = '';
        
        // JSON検証UIをクリア
        clearJsonValidationUI();
        
        // 状態表示を隠す
        hideSavedConfigStatus();
        
        // エラーメッセージをクリア
        hideError(configError);
        
        // 成功メッセージを表示
        showError(configError, '保存された設定を削除しました');
        setTimeout(() => {
            hideError(configError);
        }, 3000);
    }
});

// タブ切り替えのイベントリスナー
jsonTab.addEventListener('click', () => {
    jsonTab.classList.add('active');
    formTab.classList.remove('active');
    jsonConfig.classList.remove('hidden');
    formConfig.classList.add('hidden');
});

formTab.addEventListener('click', () => {
    formTab.classList.add('active');
    jsonTab.classList.remove('active');
    formConfig.classList.remove('hidden');
    jsonConfig.classList.add('hidden');
});

// JSON入力とフォーム入力の同期（リアルタイム検証付き）
firebaseJsonInput.addEventListener('input', () => {
    const validation = validateJsonInput(firebaseJsonInput.value);
    
    if (validation.isValid && validation.config) {
        // フォームにも反映
        apiKeyInput.value = validation.config.apiKey || '';
        authDomainInput.value = validation.config.authDomain || '';
        projectIdInput.value = validation.config.projectId || '';
        storageBucketInput.value = validation.config.storageBucket || '';
        messagingSenderIdInput.value = validation.config.messagingSenderId || '';
        appIdInput.value = validation.config.appId || '';
        hideError(configError);
    }
});

// フォーム入力の変更をJSON入力にも反映
function updateJsonFromForm() {
    try {
        const config = {
            apiKey: apiKeyInput.value.trim(),
            authDomain: authDomainInput.value.trim(),
            projectId: projectIdInput.value.trim(),
            storageBucket: storageBucketInput.value.trim(),
            messagingSenderId: messagingSenderIdInput.value.trim(),
            appId: appIdInput.value.trim()
        };
        
        // 空でない値のみを含むオブジェクトを作成
        const nonEmptyConfig = {};
        Object.keys(config).forEach(key => {
            if (config[key]) {
                nonEmptyConfig[key] = config[key];
            }
        });
        
        if (Object.keys(nonEmptyConfig).length > 0) {
            firebaseJsonInput.value = JSON.stringify(nonEmptyConfig, null, 2);
        }
    } catch (error) {
        // エラーは無視
    }
}

[apiKeyInput, authDomainInput, projectIdInput, storageBucketInput, messagingSenderIdInput, appIdInput].forEach(input => {
    input.addEventListener('input', updateJsonFromForm);
});

// ログイン機能
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError(authError, 'メールアドレスとパスワードを入力してください');
        return;
    }
    
    hideError(authError);
    loginBtn.disabled = true;
    loginBtn.textContent = 'ログイン中...';
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('ログインエラー:', error);
        let errorMessage = 'ログインに失敗しました';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'ユーザーが見つかりません';
                break;
            case 'auth/wrong-password':
                errorMessage = 'パスワードが間違っています';
                break;
            case 'auth/invalid-email':
                errorMessage = 'メールアドレスの形式が正しくありません';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
                break;
        }
        
        showError(authError, errorMessage);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'ログイン';
    }
});


// ログアウト機能
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // 入力フィールドをクリア
        emailInput.value = '';
        passwordInput.value = '';
        collectionNameInput.value = 'users';
        dataContent.innerHTML = '';
        dataCount.textContent = '';
        collectionsList.innerHTML = '';
        hideError(authError);
        hideError(dataError);
    } catch (error) {
        console.error('ログアウトエラー:', error);
    }
});

// ログアウト & 設定消去機能
logoutClearConfigBtn.addEventListener('click', async () => {
    if (confirm('ログアウトして設定も消去しますか？次回アクセス時に設定の再入力が必要になります。')) {
        try {
            if (auth && auth.currentUser) {
                await signOut(auth);
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
        }
        
        // 設定をクリアして設定画面に戻る
        clearConfigAndReturnToSetup();
    }
});

// 設定変更ボタン（ログイン画面）
changeConfigBtn.addEventListener('click', () => {
    clearConfigAndReturnToSetup();
});

// 設定変更ボタン（メイン画面）
changeConfigMainBtn.addEventListener('click', () => {
    if (confirm('設定を変更しますか？現在のログイン状態も解除されます。')) {
        logoutBtn.click(); // まずログアウト
        setTimeout(() => {
            clearConfigAndReturnToSetup();
        }, 500); // ログアウト処理を待つ
    }
});

// Firestoreデータ読み取り機能
loadDataBtn.addEventListener('click', async () => {
    const collectionName = collectionNameInput.value.trim();
    
    if (!collectionName) {
        showError(dataError, 'コレクション名を入力してください');
        return;
    }
    
    hideError(dataError);
    showLoading();
    loadDataBtn.disabled = true;
    loadDataBtn.textContent = '読み込み中...';
    
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const documents = [];
        
        querySnapshot.forEach((doc) => {
            documents.push({
                id: doc.id,
                data: doc.data()
            });
        });
        
        // データの表示
        displayData(documents, collectionName);
        
    } catch (error) {
        console.error('データ読み取りエラー:', error);
        let errorMessage = 'データの読み取りに失敗しました';
        
        switch (error.code) {
            case 'permission-denied':
                errorMessage = 'このコレクションにアクセスする権限がありません';
                break;
            case 'not-found':
                errorMessage = 'コレクションが見つかりません';
                break;
            case 'unavailable':
                errorMessage = 'Firestoreサービスが利用できません';
                break;
        }
        
        showError(dataError, errorMessage);
        dataContent.innerHTML = '';
        dataCount.textContent = '';
    } finally {
        hideLoading();
        loadDataBtn.disabled = false;
        loadDataBtn.textContent = 'データを読み込み';
    }
});

// データ表示関数
function displayData(documents, collectionName) {
    dataCount.textContent = `${collectionName}コレクション: ${documents.length}件のドキュメント`;
    
    if (documents.length === 0) {
        dataContent.innerHTML = '<div class="no-data">データが見つかりませんでした</div>';
        return;
    }
    
    const html = documents.map(doc => {
        const dataString = JSON.stringify(doc.data, null, 2);
        return `
            <div class="document">
                <div class="document-id">ドキュメントID: ${doc.id}</div>
                <div class="document-data">${dataString}</div>
            </div>
        `;
    }).join('');
    
    dataContent.innerHTML = html;
}

// Enterキーでログイン
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

// コレクション名入力でEnterキー
collectionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadDataBtn.click();
    }
});

// コレクション一覧読み込み機能
async function loadAvailableCollections() {
    // よくあるコレクション名を試してアクセス可能なものを探す
    const commonCollections = [
        'users', 'posts', 'products', 'orders', 'messages', 
        'comments', 'articles', 'categories', 'groups', 'tags',
        'events', 'photos', 'documents', 'settings', 'logs'
    ];
    
    const availableCollections = [];
    
    for (const collectionName of commonCollections) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            if (!querySnapshot.empty || querySnapshot.size >= 0) {
                availableCollections.push({
                    name: collectionName,
                    count: querySnapshot.size
                });
            }
        } catch (error) {
            // アクセスできないコレクションは無視
        }
    }
    
    displayCollectionsList(availableCollections);
}

// コレクション一覧表示
function displayCollectionsList(collections) {
    if (collections.length === 0) {
        collectionsList.innerHTML = '<div class="no-collections">利用可能なコレクションが見つかりませんでした</div>';
        return;
    }
    
    const html = collections.map(col => `
        <div class="collection-item" data-collection="${col.name}">
            <span class="collection-name">${col.name}</span>
            <span class="collection-count">${col.count}件</span>
        </div>
    `).join('');
    
    collectionsList.innerHTML = html;
    
    // クリックイベントを追加
    document.querySelectorAll('.collection-item').forEach(item => {
        item.addEventListener('click', () => {
            const collectionName = item.dataset.collection;
            collectionNameInput.value = collectionName;
            loadDataBtn.click();
        });
    });
}

// Googleログイン機能
googleLoginBtn.addEventListener('click', async () => {
    hideError(authError);
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = 'Googleでログイン中...';
    
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error('Googleログインエラー:', error);
        let errorMessage = 'Googleログインに失敗しました';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'ログインがキャンセルされました';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'ポップアップがブロックされました。ポップアップを許可してください';
                break;
            case 'auth/cancelled-popup-request':
                errorMessage = 'ログイン処理がキャンセルされました';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'ネットワークエラーが発生しました';
                break;
        }
        
        showError(authError, errorMessage);
    } finally {
        googleLoginBtn.disabled = false;
        googleLoginBtn.textContent = 'Googleでログイン';
    }
});

// コレクション再読み込みボタン
loadCollectionsBtn.addEventListener('click', loadAvailableCollections);

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    initializeAppState();
});