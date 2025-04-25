// ==UserScript==
// @name         YouTube コメントと返信を自動展開 ✅
// @name:en      YouTube Auto Expand Comments and Replies ✅
// @name:ja      YouTube コメントと返信を自動展開 ✅
// @name:zh-CN   自动展开 YouTube 评论与回复 ✅
// @name:zh-TW   自動展開 YouTube 評論與回覆 ✅
// @name:ko      YouTube 댓글 및 답글 자동 확장 ✅
// @name:fr      Déploiement automatique des commentaires YouTube ✅
// @name:es      Expansión automática de comentarios de YouTube ✅
// @name:de      YouTube-Kommentare automatisch erweitern ✅
// @name:pt-BR   Expandir automaticamente os comentários do YouTube ✅
// @name:ru      Авторазворачивание комментариев на YouTube ✅
// @version      2.9.0
// @description         安定動作でYouTubeのコメントと返信、「他の返信を表示」も自動展開！現行UIに完全対応。
// @description:en      Reliably auto-expands YouTube comments, replies, and "Show more replies". Fully updated for current UI.
// @description:zh-CN   稳定展开YouTube评论和回复，包括“显示更多回复”。兼容新界面。
// @description:zh-TW   穩定展開YouTube評論和回覆，包括「顯示更多回覆」。支援最新介面。
// @description:ko      YouTube의 댓글과 답글을 안정적으로 자동 확장. 최신 UI에 대응.
// @description:fr      Déploie automatiquement les commentaires et réponses YouTube. Compatible avec la nouvelle interface.
// @description:es      Expande automáticamente los comentarios y respuestas en YouTube. Totalmente actualizado para la nueva interfaz.
// @description:de      Erweiterung von YouTube-Kommentaren und Antworten – automatisch und zuverlässig. Für aktuelle Oberfläche optimiert.
// @description:pt-BR   Expande automaticamente comentários e respostas no YouTube. Compatível com a nova UI.
// @description:ru      Автоматически разворачивает комментарии и ответы на YouTube. Полностью адаптирован к новому интерфейсу.
// @namespace    https://github.com/koyasi777/youtube-auto-expand-comments
// @author       koyasi777
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @run-at       document-end
// @license      MIT
// @homepageURL  https://github.com/koyasi777/youtube-auto-expand-comments
// @supportURL   https://github.com/koyasi777/youtube-auto-expand-comments/issues
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        INITIAL_DELAY: 1500,
        CLICK_INTERVAL: 500,
        EXPANDED_CLASS: 'yt-auto-expanded',
        DEBUG: false
    };

    const SELECTORS = {
        COMMENTS: 'ytd-comments#comments',
        COMMENT_THREAD: 'ytd-comment-thread-renderer',
        MORE_COMMENTS: 'ytd-continuation-item-renderer #button:not([disabled])',
        SHOW_REPLIES: '#more-replies > yt-button-shape > button:not([disabled])',
        HIDDEN_REPLIES: 'ytd-comment-replies-renderer ytd-button-renderer#more-replies button:not([disabled])',
        CONTINUATION_REPLIES: 'ytd-comment-replies-renderer ytd-continuation-item-renderer ytd-button-renderer button:not([disabled])',
        READ_MORE: 'tp-yt-paper-button#more[aria-expanded="false"]:not([aria-disabled="true"])',
        NOTIFICATION_TOOLTIP: 'ytd-notification-topbar-button-renderer tp-yt-paper-tooltip'
    };

    class YouTubeCommentExpander {
        constructor() {
            this.observer = null;
            this.io = null;
            this.ioTargets = [];
            this.ioControlInterval = null;
            this.expandedComments = new Set();
        }

        log(...args) {
            if (CONFIG.DEBUG) console.log('[YTCExpander]', ...args);
        }

        isNotificationOpen() {
            const notificationBtn = document.querySelector('ytd-notification-topbar-button-renderer button[aria-expanded="true"]');
            return !!notificationBtn;
        }

        getCommentId(thread) {
            const timestamp = thread.querySelector('#header-author time')?.getAttribute('datetime') || '';
            const id = thread.getAttribute('data-thread-id') || '';
            return `${id}-${timestamp}`;
        }

        isCommentExpanded(thread) {
            return this.expandedComments.has(this.getCommentId(thread));
        }

        markAsExpanded(thread) {
            thread.classList.add(CONFIG.EXPANDED_CLASS);
            this.expandedComments.add(this.getCommentId(thread));
        }

        async clickElements(selector) {
            const elements = Array.from(document.querySelectorAll(selector));
            for (const el of elements) {
                const thread = el.closest(SELECTORS.COMMENT_THREAD);
                if (thread && this.isCommentExpanded(thread)) continue;

                const inComment = thread || el.closest(SELECTORS.COMMENTS);
                if (!inComment) continue;

                el.scrollIntoView({ behavior: 'auto', block: 'center' });
                await new Promise(r => setTimeout(r, 100));

                if (el.disabled || el.getAttribute('aria-expanded') === 'true') continue;

                try {
                    el.click();
                    if (thread) this.markAsExpanded(thread);
                    await new Promise(r => setTimeout(r, CONFIG.CLICK_INTERVAL));
                } catch (e) {
                    this.log('Click error:', e);
                }
            }
        }

        async processVisibleElements() {
            await this.clickElements(SELECTORS.MORE_COMMENTS);
            await this.clickElements(SELECTORS.SHOW_REPLIES);
            await this.clickElements(SELECTORS.HIDDEN_REPLIES);
            await this.clickElements(SELECTORS.CONTINUATION_REPLIES);
            await this.clickElements(SELECTORS.READ_MORE);
        }

        setupMutationObserver() {
            const container = document.querySelector(SELECTORS.COMMENTS);
            if (!container) return false;
            this.observer = new MutationObserver(() => this.processVisibleElements());
            this.observer.observe(container, { childList: true, subtree: true });
            return true;
        }

        setupReadMoreIntersectionObserver() {
            const observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        if (!el || el.getAttribute('aria-expanded') === 'true') continue;
                        try {
                            el.click();
                            // ★ 一部を表示ボタンを非表示にする処理を追加
                            setTimeout(() => {
                                const less = el.parentElement?.parentElement?.querySelector('tp-yt-paper-button#less');
                                if (less) less.style.display = 'none';
                            }, 500);
                        } catch (e) {
                            this.log('ReadMore IO click error', e);
                        }
                    }
                }
            });

            const observeAllReadMores = () => {
                const buttons = document.querySelectorAll(SELECTORS.READ_MORE);
                buttons.forEach(btn => observer.observe(btn));
            };

            observeAllReadMores();

            const container = document.querySelector(SELECTORS.COMMENTS);
            if (container) {
                new MutationObserver(observeAllReadMores).observe(container, { childList: true, subtree: true });
            }
        }

        setupIntersectionObserver() {
            this.io = new IntersectionObserver(entries => {
                if (this.isNotificationOpen()) return;
                for (const entry of entries) {
                    const inComment = entry.target.closest(SELECTORS.COMMENT_THREAD) || entry.target.closest(SELECTORS.COMMENTS);
                    if (entry.isIntersecting && inComment) {
                        try {
                            entry.target.click();
                        } catch (e) {
                            this.log('IO click error', e);
                        }
                    }
                }
            });

            const register = () => {
                const buttons = document.querySelectorAll(
                    `${SELECTORS.MORE_COMMENTS},${SELECTORS.SHOW_REPLIES},${SELECTORS.HIDDEN_REPLIES},${SELECTORS.CONTINUATION_REPLIES}`
                );
                this.ioTargets = Array.from(buttons).filter(btn =>
                    btn.closest(SELECTORS.COMMENT_THREAD) || btn.closest(SELECTORS.COMMENTS)
                );
                this.ioTargets.forEach(btn => this.io.observe(btn));
            };

            register();

            const container = document.querySelector(SELECTORS.COMMENTS);
            if (container) {
                new MutationObserver(register).observe(container, { childList: true, subtree: true });
            }

            this.ioControlInterval = setInterval(() => {
                if (this.isNotificationOpen()) {
                    this.io.disconnect();
                } else {
                    this.ioTargets.forEach(el => {
                        try {
                            this.io.observe(el);
                        } catch {}
                    });
                }
            }, 500);
        }

        async init() {
            if (!location.pathname.startsWith('/watch')) return;
            for (let i = 0; i < 10 && !document.querySelector(SELECTORS.COMMENTS); i++) {
                await new Promise(r => setTimeout(r, CONFIG.INITIAL_DELAY));
            }
            if (!document.querySelector(SELECTORS.COMMENTS)) return;

            this.setupMutationObserver();
            this.setupReadMoreIntersectionObserver();
            this.setupIntersectionObserver();
            await this.processVisibleElements();
            this.log('Expander initialized');
        }

        cleanup() {
            if (this.observer) this.observer.disconnect();
            if (this.io) this.io.disconnect();
            clearInterval(this.ioControlInterval);
            this.expandedComments.clear();
        }
    }

    const expander = new YouTubeCommentExpander();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => expander.init(), CONFIG.INITIAL_DELAY));
    } else {
        setTimeout(() => expander.init(), CONFIG.INITIAL_DELAY);
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            expander.cleanup();
            setTimeout(() => expander.init(), CONFIG.INITIAL_DELAY);
        }
    }).observe(document.body, { childList: true, subtree: true });
})();
