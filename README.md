# YouTube コメントと返信を自動展開 ✅

## 📌 概要

YouTube のコメント欄を手動で開くのは面倒？  
このユーザースクリプトを使えば、**コメント・返信・「他の返信を表示」** を自動でクリックして展開します！

- 💯 高い安定性：最新のYouTube UIに対応
- 🔁 スクロール・動的読み込みにも自動対応
- 🔎 MutationObserver + IntersectionObserver のW採用で抜群の反応性

---

## ⚙️ インストール方法

1. お使いのブラウザに **[Violentmonkey](https://violentmonkey.github.io/)** または **[Tampermonkey](https://www.tampermonkey.net/)** をインストール  
2. 以下のリンクからスクリプトをインストール：  
   👉 [このスクリプトをインストールする](https://raw.githubusercontent.com/koyasi777/youtube-auto-comment-expander/main/youtube-auto-comment-expander.user.js)

---

## 💡 主な機能

- YouTube動画ページでコメントを自動展開
- 「返信を表示」「他の返信を表示」も対象
- 再クリック防止機能付き
- スクロール時や動画切り替え時にも反応
- UI更新にも強い、柔軟なセレクタ設計

---

## 🌐 対応ページ

```js
// @match https://www.youtube.com/*
```

---

## 🧠 技術仕様

- `MutationObserver` で新規読み込みコメントを監視
- `IntersectionObserver` によりスクロールで表示された要素を検出・自動クリック
- `Set` により展開済みコメントの記録と重複防止
- DOM変更に対してスロットリング付きで反応

---

## 🛠 トラブルシューティング

- 動作しない場合、他のYouTube用ユーザースクリプトと競合している可能性があります。
- ページ読み込み後、数秒待ってから動作開始します（初期遅延あり）

---

## 📜 ライセンス

MIT License  
自由に改変・再配布いただけますが、利用は自己責任でお願いします。

---

> コメント欄を、自動で一気に開放しよう。  
> すべての会話が、そこにある。
