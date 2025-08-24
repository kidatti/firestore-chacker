# Firestore Checker

HTML/CSS/JS のみで構成された Firebase Authentication によるログインで Firestore の確認を行えるツールです

## 機能

- **Firebase Authentication**: メール/パスワードでのログイン、Googleアカウントでのログイン
- **Firestore Database**: コレクションデータの読み取りと表示

## 実行方法

セキュリティ制約により、ファイルを直接ブラウザで開くのではなく、ローカルサーバーを使用してください：

```bash
# Python 3を使用する場合
python -m http.server 8000

# Node.jsのhttp-serverを使用する場合
npx http-server

# VS Code Live Serverなどを使用
```

ブラウザで `http://localhost:8000` にアクセスしてください。

### ログイン方法
1. **メール/パスワードログイン**: 登録済みのメールアドレスとパスワードでログイン
2. **Googleログイン**: 「Googleでログイン」ボタンをクリックして、Googleアカウントで認証

### データ操作
1. **データ読み取り**: コレクション名を入力して「データを読み込み」ボタンをクリック
2. **コレクション一覧**: 利用可能なコレクションが自動的に表示され、クリックで直接読み込み可能
3. **ログアウト**: 「ログアウト」ボタンでログアウト

## ファイル構成

- `index.html`: メインのHTMLファイル
- `styles.css`: スタイリング
- `app.js`: Firebase設定とアプリケーションロジック
- `README.md`: このファイル

### よくあるエラー

**認証関連**
- **「auth/invalid-email」**: メールアドレスの形式を確認してください
- **「auth/wrong-password」**: パスワードが正しくありません
- **「auth/user-not-found」**: ユーザーが見つかりません
- **「auth/popup-blocked」**: ブラウザのポップアップブロックを解除してください（Googleログイン時）
- **「auth/popup-closed-by-user」**: Googleログインポップアップがユーザーによって閉じられました

**データアクセス関連**
- **「permission-denied」**: Firestoreのセキュリティルールを確認してください
- **「not-found」**: 指定されたコレクションが見つかりません

### CORS エラーの対処

ファイルを直接ブラウザで開くとCORSエラーが発生する可能性があります。必ずローカルサーバーを使用してください。

## 注意事項

- Firebase 設定情報はクライアントサイドに露出されるため、適切なセキュリティルールの設定が重要です
- 本番環境では、Firebase App Check の使用を検討してください
- APIキーなどの機密情報は環境変数や設定ファイルで管理することを推奨します
