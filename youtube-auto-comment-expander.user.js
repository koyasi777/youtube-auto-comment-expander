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
// @version      4.0.0
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
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @license      MIT
// @homepageURL  https://github.com/koyasi777/youtube-auto-expand-comments
// @supportURL   https://github.com/koyasi777/youtube-auto-expand-comments/issues
// ==/UserScript==

(function() {
    'use strict';

    class ConfigManager {
        constructor() {
            this.defaults = { debugMode: false, initialDelay: 1500, clickInterval: 350, expandComments: true, expandReplies: true, expandNestedReplies: true, expandLongComments: true, };
            this.config = {}; this.load();
        }
        load() { for (const key in this.defaults) this.config[key] = GM_getValue(key, this.defaults[key]); }
        get(key) { return this.config[key]; }
        set(key, value) { this.config[key] = value; GM_setValue(key, value); }
        reset() { for (const key in this.defaults) this.set(key, this.defaults[key]); }
        registerMenu() {
            GM_registerMenuCommand('⚙️ コメント自動展開 設定', () => this.showSettingsPrompt());
            GM_registerMenuCommand('🗑️ 設定をリセット', () => { if (confirm('本当に全ての設定をリセットしますか？')) { this.reset(); alert('設定がリセットされました。ページをリロードして反映させてください。'); } });
        }
        showSettingsPrompt() {
            const newSettings = {};
            for (const key in this.defaults) {
                const currentValue = this.get(key), type = typeof this.defaults[key];
                let newValue = prompt(`${key} (${type}) [デフォルト: ${this.defaults[key]}]\n現在の値: ${currentValue}`, currentValue);
                if (newValue === null) return;
                if (type === 'boolean') newSettings[key] = newValue.toLowerCase() === 'true';
                else if (type === 'number') { newSettings[key] = parseInt(newValue, 10); if (isNaN(newSettings[key])) newSettings[key] = this.defaults[key]; }
                else newSettings[key] = newValue;
            }
            for (const key in newSettings) this.set(key, newSettings[key]);
            alert('設定が更新されました。ページをリロードして反映させてください。');
        }
    }

    class YouTubeCommentExpander {
        constructor(config) {
            this.config = config;
            this.processedElements = new WeakSet();
            this.mainObserver = null;
            this.readMoreObserver = null;
            this.actionQueue = [];
            this.isProcessingQueue = false;

            this.rules = [{
                name: 'ExpandComments',
                selector: '#comments > #contents > ytd-continuation-item-renderer > .ytd-item-section-renderer > yt-button-shape',
                parentSelector: 'ytd-continuation-item-renderer',
                condition: () => this.config.get('expandComments'),
                once: false,
            }, {
                name: 'ExpandReplies',
                selector: '#more-replies',
                parentSelector: 'ytd-comment-thread-renderer',
                condition: () => this.config.get('expandReplies'),
                once: true,
            }, {
                name: 'ExpandNestedReplies',
                selector: 'ytd-comment-replies-renderer ytd-continuation-item-renderer button.yt-spec-button-shape-next',
                parentSelector: 'ytd-continuation-item-renderer',
                condition: () => this.config.get('expandNestedReplies'),
                once: false,
            }];
        }

        log(level, ...args) { if (!this.config.get('debugMode')) return; console.log(`[YTCE:${level.toUpperCase()}]`, ...args); }
        enqueueAction(element, rule) { this.actionQueue.push({ element, rule }); if (!this.isProcessingQueue) this.processQueue(); }
        async processQueue() {
            if (this.actionQueue.length === 0) { this.isProcessingQueue = false; return; }
            this.isProcessingQueue = true;
            const { element, rule } = this.actionQueue.shift();
            const parentElement = rule.parentSelector ? element.closest(rule.parentSelector) : element;
            if (document.body.contains(element) && parentElement && !this.processedElements.has(parentElement)) {
                await this.performAction(element, rule, parentElement);
            }
            this.processQueue();
        }
        async performAction(element, rule, parentElement) {
            try {
                this.log('debug', `Performing action on '${rule.name}'`);
                await new Promise(resolve => setTimeout(resolve, this.config.get('clickInterval')));
                element.click();
                this.processedElements.add(parentElement);
            } catch (error) {
                this.log('error', `Action failed for '${rule.name}'`, error);
                if (parentElement) this.processedElements.add(parentElement);
            }
        }
        applyRulesToNode(node) {
            if (!(node instanceof Element)) return;
            for (const rule of this.rules) {
                if (!rule.condition(node)) continue;
                if (node.matches(rule.selector)) this.checkAndEnqueue(node, rule);
                node.querySelectorAll(rule.selector).forEach(el => this.checkAndEnqueue(el, rule));
            }
        }
        checkAndEnqueue(element, rule) {
            const parentElement = rule.parentSelector ? element.closest(rule.parentSelector) : element;
            if (!parentElement || this.processedElements.has(parentElement)) return;
            this.enqueueAction(element, rule);
        }

        setupReadMoreObserver() {
            if (!this.config.get('expandLongComments')) return () => {};

            const readMoreSelector = [ '#content-text[collapsed]', '.more-button.ytd-comment-view-model', 'tp-yt-paper-button#more:not([aria-expanded="true"])' ].join(', ');

            this.readMoreObserver = new IntersectionObserver(async (entries, observer) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const button = entry.target;
                        observer.unobserve(button);

                        this.log('debug', 'ReadMore button in view, clicking.');
                        await new Promise(resolve => setTimeout(resolve, this.config.get('clickInterval')));
                        button.click();

                        await new Promise(resolve => setTimeout(resolve, 100));
                        const commentViewModel = button.closest('ytd-comment-view-model, ytd-comment-renderer');
                        if (commentViewModel) {
                            const lessButton = commentViewModel.querySelector('.less-button, tp-yt-paper-button#less');
                            if (lessButton) { lessButton.style.display = 'none'; }
                        }
                    }
                }
            }, { threshold: 0.5 });

            const observeNewButtons = (rootNode) => {
                if (!(rootNode instanceof Element)) return;
                rootNode.querySelectorAll(readMoreSelector).forEach(btn => this.readMoreObserver.observe(btn));
            };
            return observeNewButtons;
        }

        start() {
            const commentsContainer = document.querySelector('ytd-comments#comments');
            if (!commentsContainer) { this.log('info', 'Comment section not found.'); return false; }

            const observeNewReadMoreButtons = this.setupReadMoreObserver();
            observeNewReadMoreButtons(commentsContainer);

            this.mainObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        this.applyRulesToNode(node);
                        observeNewReadMoreButtons(node);
                    }
                }
            });
            this.mainObserver.observe(commentsContainer, { childList: true, subtree: true });

            this.log('info', 'All observers started.');
            this.applyRulesToNode(commentsContainer);
            return true;
        }

        stop() {
            if (this.mainObserver) { this.mainObserver.disconnect(); this.mainObserver = null; }
            if (this.readMoreObserver) { this.readMoreObserver.disconnect(); this.readMoreObserver = null; }
            this.log('info', 'All observers stopped.');
            this.processedElements = new WeakSet(); this.actionQueue = []; this.isProcessingQueue = false;
        }
    }

    const configManager = new ConfigManager();
    let expander = null;

    function initializeScript() {
        if (expander) { expander.stop(); expander = null; }
        if (location.pathname !== '/watch') { configManager.get('debugMode') && console.log('[YTCE:INFO] Not a watch page. Script is idle.'); return; }
        setTimeout(() => {
            expander = new YouTubeCommentExpander(configManager);
            if (!expander.start()) setTimeout(() => { if (expander && !expander.mainObserver) expander.start(); }, 3000);
        }, configManager.get('initialDelay'));
    }

    configManager.registerMenu();
    window.addEventListener('yt-navigate-finish', initializeScript);
    if (document.readyState === 'complete' || document.readyState === 'interactive') initializeScript();
    else document.addEventListener('DOMContentLoaded', initializeScript, { once: true });
})();
