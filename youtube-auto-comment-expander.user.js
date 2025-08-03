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
// @description  安定動作でYouTubeのコメントと返信、「他の返信を表示」も自動展開！現行UIに完全対応。
// @description:en Reliably auto-expands YouTube comments, replies, and "Show more replies". Fully updated for current UI.
// @description:ja 安定動作でYouTubeのコメントと返信、「他の返信を表示」も自動展開！現行UIに完全対応。
// @description:zh-CN 稳定展开YouTube评论和回复，包括“显示更多回复”。兼容新界面。
// @description:zh-TW 穩定展開YouTube評論和回覆，包括「顯示更多回覆」。支援最新介面。
// @description:ko YouTube의 댓글과 답글을 안정적으로 자동 확장. 최신 UI에 대응.
// @description:fr Déploie automatiquement les commentaires et réponses YouTube. Compatible avec la nouvelle interface.
// @description:es Expande automáticamente los comentarios y respuestas en YouTube. Totalmente actualizado para la nueva interfaz.
// @description:de Erweiterung von YouTube-Kommentaren und Antworten – automatisch und zuverlässig. Für aktuelle Oberfläche optimiert.
// @description:pt-BR Expande automaticamente comentários e respostas no YouTube. Compatível com a nova UI.
// @description:ru Автоматически разворачивает комментарии и ответы на YouTube. Полностью адаптирован к новому интерфейсу.
// @version      5.6.0
// @namespace    https://github.com/koyasi777/youtube-auto-comment-expander
// @author       koyasi777
// @match        *://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-end
// @license      MIT
// @homepageURL  https://github.com/koyasi777/youtube-auto-comment-expander
// @supportURL   https://github.com/koyasi777/youtube-auto-comment-expander/issues
// ==/UserScript==

(function() {
    'use strict';

    class ConfigManager {
        constructor() {
            this.defaults = {
                scriptEnabled: true,
                debugMode: false,
                initialDelay: 2500,
                clickInterval: 130,
                expandComments: true,
                expandReplies: true,
                expandNestedReplies: true,
                expandLongComments: true,
            };
            this.config = {};
            this.load();
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
            this.mainObserver = null;
            this.actionObserver = null;
            this.readMoreObserver = null;
            this.rules = [
                { name: 'ExpandComments', selector: 'ytd-comments > #sections > #contents > ytd-continuation-item-renderer, ytd-engagement-panel-section-list-renderer > #contents > ytd-continuation-item-renderer', condition: () => this.config.get('expandComments') },
                { name: 'ExpandReplies', selector: '#more-replies', condition: () => this.config.get('expandReplies') },
                { name: 'ExpandNestedReplies', selector: 'ytd-comment-replies-renderer ytd-continuation-item-renderer button', condition: () => this.config.get('expandNestedReplies') },
            ];
        }

        log(level, ...args) { if (!this.config.get('debugMode')) return; console.log(`[YTCE:${level.toUpperCase()}]`, ...args); }

        setupObservers() {
            this.actionObserver = new IntersectionObserver(async (entries, observer) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && this.config.get('scriptEnabled')) {
                        const target = entry.target;
                        observer.unobserve(target);
                        this.log('debug', 'Action target in view, clicking.', target);
                        await new Promise(resolve => setTimeout(resolve, this.config.get('clickInterval')));
                        const clickable = target.querySelector('button, yt-button-shape') || target;
                        clickable.click();
                    }
                }
            }, { rootMargin: '0px 0px 500px 0px' });

            if (this.config.get('expandLongComments')) {
                this.readMoreObserver = new IntersectionObserver(async (entries, observer) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting && this.config.get('scriptEnabled')) {
                            const button = entry.target;
                            observer.unobserve(button);
                            this.log('debug', 'ReadMore button in view, clicking.', button);
                            await new Promise(resolve => setTimeout(resolve, this.config.get('clickInterval')));
                            button.click();
                            await new Promise(resolve => setTimeout(resolve, 200));
                            const commentViewModel = button.closest('ytd-comment-view-model, ytd-comment-renderer');
                            if (commentViewModel) {
                                const lessButton = commentViewModel.querySelector('.less-button, tp-yt-paper-button#less');
                                if (lessButton) lessButton.style.display = 'none';
                            }
                        }
                    }
                }, { threshold: 0.1 });
            }
        }

        observeNewNodes(node) {
            if (!(node instanceof Element)) return;
            for (const rule of this.rules) {
                if (rule.condition()) {
                    if (node.matches(rule.selector)) this.actionObserver.observe(node);
                    node.querySelectorAll(rule.selector).forEach(el => this.actionObserver.observe(el));
                }
            }
            if (this.readMoreObserver) {
                const readMoreSelector = '#content-text[collapsed], .more-button.ytd-comment-view-model, tp-yt-paper-button#more:not([aria-expanded="true"])';
                if (node.matches(readMoreSelector)) this.readMoreObserver.observe(node);
                node.querySelectorAll(readMoreSelector).forEach(btn => this.readMoreObserver.observe(btn));
            }
        }

        start(commentsContainer) {
            if (!this.config.get('scriptEnabled')) {
                this.log('info', 'Script is disabled by toggle, not starting.');
                return false;
            }
            if (!commentsContainer) { this.log('error', 'start() called without a valid container.'); return false; }
            this.stop();
            this.log('info', 'Comment container found. Starting observers.', commentsContainer);
            this.setupObservers();
            this.observeNewNodes(commentsContainer);
            this.mainObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) this.observeNewNodes(node);
                }
            });
            this.mainObserver.observe(commentsContainer, { childList: true, subtree: true });
            this.log('info', 'All observers started.');
            return true;
        }

        stop() {
            if (this.mainObserver) { this.mainObserver.disconnect(); this.mainObserver = null; }
            if (this.actionObserver) { this.actionObserver.disconnect(); this.actionObserver = null; }
            if (this.readMoreObserver) { this.readMoreObserver.disconnect(); this.readMoreObserver = null; }
            this.log('info', 'All observers stopped and state reset.');
        }
    }

    class UIManager {
        constructor(configManager, expander) {
            this.configManager = configManager;
            this.expander = expander;
            this.toggleContainerId = 'ytce-toggle-container';
            this.toggle = null;
            this.uiObserver = null;
            this.icons = {
                on: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"></path></svg>`,
                off: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M18 10H6V9h12v1zm3-7H3v1h18V3zM6 15h12v-1H6v1z"></path></svg>`,
            };
            this.injectStyles();
        }

        injectStyles() {
            GM_addStyle(`
                #${this.toggleContainerId} {
                    position: relative; display: flex; align-items: center; margin-left: 8px;
                    border: 1px solid var(--yt-spec-border-color, #ddd); border-radius: 16px;
                    padding: 0 6px; height: 32px; cursor: pointer;
                    background-color: var(--yt-spec-button-chip-background-hover, transparent);
                    transition: background-color 0.3s;
                }
                #${this.toggleContainerId}:hover { background-color: var(--yt-spec-badge-chip-background, #e8e8e8); }
                .ytce-toggle-icon {
                    width: 20px; height: 20px; margin-right: 6px;
                    display: flex; align-items: center; pointer-events: none;
                }
                .ytce-toggle-icon.on svg { fill: var(--yt-spec-call-to-action, #065fd4); }
                .ytce-toggle-icon.off svg { fill: var(--yt-spec-icon-disabled, #909090); }
                .ytce-toggle-switch { position: relative; display: inline-block; width: 30px; height: 16px; pointer-events: none; }
                .ytce-toggle-switch input { opacity: 0; width: 0; height: 0; }
                .ytce-toggle-slider {
                    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #ccc; transition: .4s; border-radius: 16px;
                }
                .ytce-toggle-slider:before {
                    position: absolute; content: ""; height: 10px; width: 10px;
                    left: 3px; bottom: 3px; background-color: white;
                    transition: .4s; border-radius: 50%;
                }
                input:checked + .ytce-toggle-slider { background-color: var(--yt-spec-call-to-action, #065fd4); }
                input:checked + .ytce-toggle-slider:before { transform: translateX(14px); }
            `);
        }

        createToggleElement() {
            if (document.getElementById(this.toggleContainerId)) return null;
            const container = document.createElement('div');
            container.id = this.toggleContainerId;
            const tooltip = document.createElement('tp-yt-paper-tooltip');
            tooltip.setAttribute('role', 'tooltip');
            const tooltipText = document.createElement('div');
            tooltipText.id = 'tooltip';
            tooltipText.className = 'style-scope tp-yt-paper-tooltip';
            tooltip.appendChild(tooltipText);
            const iconDiv = document.createElement('div');
            const switchLabel = document.createElement('label');
            switchLabel.className = 'ytce-toggle-switch';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            const slider = document.createElement('span');
            slider.className = 'ytce-toggle-slider';
            switchLabel.append(checkbox, slider);
            container.append(iconDiv, switchLabel, tooltip);
            this.toggle = { container, checkbox, iconDiv, tooltipText };
            container.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                this.onToggleChange();
            });
            const initialState = this.configManager.get('scriptEnabled');
            checkbox.checked = initialState;
            this.updateToggleVisuals(initialState);
            return container;
        }

        onToggleChange() {
            const isEnabled = this.toggle.checkbox.checked;
            this.configManager.set('scriptEnabled', isEnabled);
            this.updateToggleVisuals(isEnabled);
            this.expander.log('info', `Script ${isEnabled ? 'enabled' : 'disabled'} by toggle.`);
            if (isEnabled) {
                const commentsContainer = getCurrentCommentsContainer();
                if (commentsContainer) this.expander.start(commentsContainer);
            } else {
                this.expander.stop();
            }
        }

        updateToggleVisuals(isEnabled) {
            if (!this.toggle) return;
            this.toggle.iconDiv.innerHTML = this.icons[isEnabled ? 'on' : 'off'];
            this.toggle.iconDiv.className = `ytce-toggle-icon ${isEnabled ? 'on' : 'off'}`;
            this.toggle.tooltipText.textContent = `コメント自動展開: ${isEnabled ? 'ON' : 'OFF'}`;
        }

        observeCommentsHeader(containerSelector, sortMenuSelector, sortMenuLabelSelector, insertMode) {
            waitForElement(containerSelector, (container) => {
                this.stop();

                const updateUI = () => this.updateCommentsHeaderUI(sortMenuSelector, sortMenuLabelSelector, insertMode);

                this.uiObserver = new MutationObserver(updateUI);
                this.uiObserver.observe(container, { childList: true, subtree: true });
                updateUI();
                this.expander.log('info', `UI Observer started for "${containerSelector}".`);
            });
        }

        updateCommentsHeaderUI(sortMenuSelector, sortMenuLabelSelector, insertMode) {
            const sortMenu = document.querySelector(sortMenuSelector);
            if (!sortMenu) return;

            if (!document.getElementById(this.toggleContainerId)) {
                const toggleElement = this.createToggleElement();
                if (toggleElement) {
                    if (insertMode === 'append') {
                        sortMenu.parentElement.appendChild(toggleElement);
                    } else if (insertMode === 'after') {
                        sortMenu.insertAdjacentElement('afterend', toggleElement);
                    }
                    this.expander.log('debug', 'Toggle UI injected.');
                }
            }

            const label = document.querySelector(sortMenuLabelSelector);
            if (label && label.style.display !== 'none') {
                label.style.display = 'none';
                this.expander.log('debug', 'Sort menu label hidden.');
            }
        }

        initForWatchPage() {
            this.observeCommentsHeader(
                'ytd-comments#comments',
                '#comments #sort-menu',
                '#comments #sort-menu #icon-label',
                'append'
            );
        }

        initForShortsPage() {
            this.observeCommentsHeader(
                'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]',
                'ytd-engagement-panel-title-header-renderer #menu',
                'ytd-engagement-panel-title-header-renderer #menu #icon-label',
                'after'
            );
        }

        stop() {
            if (this.uiObserver) {
                this.uiObserver.disconnect();
                this.uiObserver = null;
                this.expander.log('info', 'UI Observer stopped.');
            }
        }
    }

    const configManager = new ConfigManager();
    let expander = null;
    let uiManager = null;
    let currentPath = '';

    function waitForElement(selector, callback, timeout = 15000) {
        let timeoutId = null;
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                if (timeoutId) clearTimeout(timeoutId);
                obs.disconnect();
                callback(element);
            }
        });
        timeoutId = setTimeout(() => {
            observer.disconnect();
            expander?.log('warn', `waitForElement timed out for selector: ${selector}`);
        }, timeout);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function getCurrentCommentsContainer() {
        if (location.pathname.startsWith('/watch')) {
            return document.querySelector('ytd-comments#comments');
        } else if (location.pathname.startsWith('/shorts/')) {
            return document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]');
        }
        return null;
    }

    function initializeScript() {
        const path = location.pathname + location.search;
        if (currentPath === path && expander) return;
        currentPath = path;

        if (expander) expander.stop();
        if (uiManager) uiManager.stop();

        expander = new YouTubeCommentExpander(configManager);
        uiManager = new UIManager(configManager, expander);

        setTimeout(() => {
            if (location.pathname.startsWith('/shorts/')) {
                expander.log('info', 'Shorts page detected. Initializing...');
                const commentsButtonSelector = '#comments-button button';
                waitForElement(commentsButtonSelector, (button) => {
                    button.click();
                    const commentsContainerSelector = 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]';
                    waitForElement(commentsContainerSelector, (container) => {
                        uiManager.initForShortsPage();
                        if (configManager.get('scriptEnabled')) expander.start(container);
                    });
                });
            } else if (location.pathname.startsWith('/watch')) {
                expander.log('info', 'Watch page detected. Initializing...');
                uiManager.initForWatchPage();
                const commentsContainerSelector = 'ytd-comments#comments';
                waitForElement(commentsContainerSelector, (container) => {
                    if (configManager.get('scriptEnabled')) expander.start(container);
                });
            } else {
                expander.log('info', 'Not a watch/shorts page. Script is idle.');
            }
        }, configManager.get('initialDelay'));
    }

    configManager.registerMenu();
    window.addEventListener('yt-navigate-finish', initializeScript, true);
    initializeScript();

})();
