(function () {
    'use strict';

    const currentScript = document.currentScript;
    const config = {
        emojiUrl: currentScript?.dataset.emojiUrl || "",
        emojiDataId: currentScript?.dataset.emojiDataId || ""
    };

    if (window.StoryReactorInstance?.isInitialized) {
        console.log('StoryReactor is already running, refreshing navigation state...');
        window.StoryReactorInstance.handleNavigation();
        return;
    }

    if (window.StoryReactorInstance) {
        window.StoryReactorInstance.destroy();
        window.StoryReactorInstance = null;
    }

    class StoryReactor {
        constructor(options = {}) {
            this.config = options;
            this.emojiList = [];
            this.emojiCategories = [];
            this.filteredEmojis = [];
            this.container = null;
            this.searchInput = null;
            this.emojiListElement = null;
            this.favoriteListElement = null;
            this.comboListElement = null;
            this.managerDialog = null;
            this.managerSearchInput = null;
            this.managerCategoryTabsElement = null;
            this.managerEmojiListElement = null;
            this.managerFavoriteListElement = null;
            this.managerComboListElement = null;
            this.managerSubtitleElement = null;
            this.comboNameInput = null;
            this.comboDraftListElement = null;
            this.managerFilteredEmojis = [];
            this.managerEmojiPage = 0;
            this.managerEmojiItemsPerPage = 240;
            this.managerEmojiHasMore = false;
            this.isManagerEmojiLoading = false;
            this.groupCache = new Map();
            this.isInitialized = false;
            this.debounceTimeout = null;
            this.collator = new Intl.Collator(undefined, { sensitivity: 'base' });
            this.observer = null;
            this.pollingInterval = null;
            this.cacheKey = 'story_reactor_emoji_cache_v3';
            this.favoritesKey = 'story_reactor_favorite_reactions_v1';
            this.combosKey = 'story_reactor_reaction_combos_v1';
            this.favoriteReactions = [];
            this.reactionCombos = [];
            this.comboDraftReactions = [];
            this.editingComboId = null;
            this.activeEmojiGroup = 'all';
            this.activeManagerGroup = 'all';
            this.activeManagerTab = 'favorites';
            this.defaultFavoriteReactions = ["❤️", "😂", "😍", "👍", "👏", "🔥", "🎉", "😮"];
            this.maxFavoriteReactions = 24;
            this.maxReactionCombos = 20;
            this.maxComboReactions = 16;
            this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
            this.isAttached = false;
            this.retryCount = 0;
            this.maxRetries = 10; // Tăng số lần thử
            this.retryDelay = 500; // Giảm độ trễ để thử nhanh hơn
            this.maxReactionRetries = 2;
            this.currentPage = 0;
            this.itemsPerPage = 100;
            this.isLoading = false;
            this.hasMore = true;
            this.originalPushState = null;
            this.originalReplaceState = null;
            this.patchedPushState = null;
            this.patchedReplaceState = null;
            this.isHistoryPatched = false;

            // Bind methods to preserve context
            this.handleNavigation = this.handleNavigation.bind(this);
            this.checkAndAttach = this.checkAndAttach.bind(this);
            this.handlePopState = this.handlePopState.bind(this);
            this.handleHashChange = this.handleHashChange.bind(this);
            this.handleDocumentClick = this.handleDocumentClick.bind(this);
            this.handleDialogKeydown = this.handleDialogKeydown.bind(this);
            this.handleManagerEmojiScroll = typeof this.handleManagerEmojiScroll === 'function'
                ? this.handleManagerEmojiScroll.bind(this)
                : () => { };

            // Throttle functions
            this.throttledAttach = this.throttle(this.attachToFooter.bind(this), 100);
            this.throttledNavigation = this.throttle(this.handleNavigation, 200);
        }

        // Utility function for throttling
        throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        // Utility function for debouncing
        debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        async init() {
            if (this.isInitialized) return;

            try {
                await this.loadEmojiData();
                this.filteredEmojis = [...this.emojiList];
                this.favoriteReactions = await this.loadFavoriteReactions();
                this.reactionCombos = await this.loadReactionCombos();
                this.buildGroupCache();
                this.setupNavigationListener();
                this.startObserving();
                this.startPolling(); // Bắt đầu polling để kiểm tra footer
                this.handleNavigation();
                this.isInitialized = true;
                console.log('StoryReactor initialized successfully');
            } catch (err) {
                console.error('Failed to initialize StoryReactor:', err);
            }
        }

        async loadEmojiData() {
            const cachedData = this.getCachedData();
            if (cachedData) {
                const normalizedCachedData = this.normalizeEmojiData(cachedData);
                if (normalizedCachedData.length > 0) {
                    this.emojiList = normalizedCachedData;
                    return;
                }
            }

            try {
                const emojiData = this.getInlineEmojiData() || await this.fetchLocalEmojiData();
                const normalizedData = this.normalizeEmojiData(emojiData);
                if (normalizedData.length === 0) {
                    throw new Error('Local emoji data is empty or invalid');
                }

                this.emojiList = normalizedData;
                this.setCachedData(this.emojiList);
            } catch (err) {
                console.warn('Failed to load local emoji data:', err);
                this.emojiList = this.getFallbackEmojiData();
            }
        }

        normalizeEmojiData(data) {
            if (Array.isArray(data)) {
                return this.normalizeFlatEmojiData(data);
            }

            if (!data || !Array.isArray(data.categories)) {
                return [];
            }

            const seen = new Set();
            const normalized = [];
            this.emojiCategories = [];

            data.categories.forEach((category, index) => {
                if (!category || !Array.isArray(category.emojis)) return;

                const fallbackId = `category-${index + 1}`;
                const id = this.slugify(category.id || category.name || category.label || fallbackId) || fallbackId;
                const label = this.getCategoryLabel(category, id);
                const icon = category.icon || category.emojis[0]?.value || this.getCategoryIcon(id);
                const emojis = [];

                category.emojis.forEach(emoji => {
                    const item = this.normalizeEmojiRecord(emoji, { id, label, icon });
                    if (!item || seen.has(item.value)) return;

                    seen.add(item.value);
                    emojis.push(item);
                    normalized.push(item);
                });

                if (emojis.length > 0) {
                    this.emojiCategories.push({ id, label, icon, emojis });
                }
            });

            return normalized;
        }

        normalizeFlatEmojiData(data) {
            const seen = new Set();
            const normalized = [];
            this.emojiCategories = [];

            data.forEach(emoji => {
                const groupName = emoji?.group || emoji?.category || 'Emoji';
                const id = emoji?.categoryId || this.slugify(groupName) || 'emoji';
                const label = emoji?.group || emoji?.category || this.getCategoryLabel(null, id);
                const icon = emoji?.categoryIcon || this.getCategoryIcon(id);
                const item = this.normalizeEmojiRecord(emoji, { id, label, icon });
                if (!item || seen.has(item.value)) return;

                seen.add(item.value);
                normalized.push(item);
            });

            return normalized;
        }

        normalizeEmojiRecord(emoji, category) {
            if (!emoji || typeof emoji !== 'object') return null;

            const value = typeof emoji.value === 'string' ? emoji.value.trim() : '';
            if (!value) return null;

            const name = typeof emoji.name === 'string' && emoji.name.trim()
                ? emoji.name.trim()
                : value;
            const group = category.label || emoji.group || emoji.category || 'Emoji';
            const categoryId = category.id || emoji.categoryId || this.slugify(group) || 'emoji';

            return {
                ...emoji,
                value,
                name,
                group,
                category: group,
                categoryId,
                categoryIcon: category.icon || emoji.categoryIcon || value
            };
        }

        getCategoryLabel(category, id) {
            const explicitLabel = category?.label || category?.name || category?.title;
            if (typeof explicitLabel === 'string' && explicitLabel.trim()) {
                return explicitLabel.trim();
            }

            const labels = {
                people: 'Mặt & người',
                nature: 'Thiên nhiên',
                foods: 'Đồ ăn',
                activity: 'Hoạt động',
                places: 'Địa điểm',
                objects: 'Đồ vật',
                symbols: 'Ký hiệu',
                flags: 'Cờ'
            };

            return labels[id] || id
                .split('-')
                .filter(Boolean)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
        }

        getCategoryIcon(id) {
            const icons = {
                people: '😀',
                nature: '🐵',
                foods: '🍇',
                activity: '🎃',
                places: '🌍',
                objects: '👓',
                symbols: '🏧',
                flags: '🏁'
            };

            return icons[id] || '•';
        }

        slugify(value) {
            return String(value || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        getInlineEmojiData() {
            if (!this.config.emojiDataId) {
                return null;
            }

            const dataElement = document.getElementById(this.config.emojiDataId);
            if (!dataElement?.textContent) {
                return null;
            }

            return JSON.parse(dataElement.textContent);
        }

        async fetchLocalEmojiData() {
            if (!this.config.emojiUrl) {
                throw new Error('Missing local emoji URL');
            }

            const response = await fetch(this.config.emojiUrl, {
                cache: 'force-cache'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            return response.json();
        }

        getFallbackEmojiData() {
            return [
                { codes: "1F600", value: "😀", name: "grinning face", group: "Smileys & Emotion" },
                { codes: "1F602", value: "😂", name: "face with tears of joy", group: "Smileys & Emotion" },
                { codes: "2764", value: "❤️", name: "red heart", group: "Smileys & Emotion" },
                { codes: "1F44D", value: "👍", name: "thumbs up", group: "People & Body" },
                { codes: "1F44E", value: "👎", name: "thumbs down", group: "People & Body" }
            ];
        }

        getCachedData() {
            try {
                const cachedData = localStorage.getItem(this.cacheKey);
                if (cachedData) {
                    const { data, timestamp } = JSON.parse(cachedData);
                    if (Date.now() - timestamp < this.cacheTTL) {
                        return data;
                    }
                }
            } catch (err) {
                console.warn('Failed to read cache:', err);
            }
            return null;
        }

        setCachedData(data) {
            try {
                localStorage.setItem(this.cacheKey, JSON.stringify({
                    data: data,
                    timestamp: Date.now()
                }));
            } catch (err) {
                console.warn('Failed to cache data:', err);
            }
        }

        requestExtensionStorage(type, key, value) {
            return new Promise(resolve => {
                const requestId = `story_reactor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const timeout = setTimeout(() => {
                    window.removeEventListener("message", handleResponse);
                    resolve({ ok: false, error: "Storage bridge timeout" });
                }, 1000);

                const handleResponse = (event) => {
                    if (event.source !== window) return;

                    const message = event.data;
                    if (!message || message.source !== "story-reactor-content") return;
                    if (message.requestId !== requestId) return;

                    clearTimeout(timeout);
                    window.removeEventListener("message", handleResponse);
                    resolve(message);
                };

                window.addEventListener("message", handleResponse);
                window.postMessage({
                    source: "story-reactor-page",
                    type,
                    key,
                    value,
                    requestId
                }, window.location.origin);
            });
        }

        readLocalStorageJson(key) {
            try {
                const storedValue = localStorage.getItem(key);
                return storedValue ? JSON.parse(storedValue) : null;
            } catch (err) {
                console.warn(`Failed to read localStorage key ${key}:`, err);
                return null;
            }
        }

        writeLocalStorageJson(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (err) {
                console.warn(`Failed to write localStorage key ${key}:`, err);
            }
        }

        async loadFavoriteReactions() {
            const storedFavorites = await this.requestExtensionStorage("storage:get", this.favoritesKey);
            if (storedFavorites.ok && Array.isArray(storedFavorites.value)) {
                return this.normalizeFavoriteReactions(storedFavorites.value);
            }

            const localFavorites = this.readLocalStorageJson(this.favoritesKey);
            if (Array.isArray(localFavorites)) {
                const normalized = this.normalizeFavoriteReactions(localFavorites);
                this.saveFavoriteReactions(normalized);
                return normalized;
            }

            return this.normalizeFavoriteReactions(this.defaultFavoriteReactions);
        }

        saveFavoriteReactions(favoriteReactions = this.favoriteReactions) {
            const normalized = this.normalizeFavoriteReactions(favoriteReactions);
            this.writeLocalStorageJson(this.favoritesKey, normalized);
            this.requestExtensionStorage("storage:set", this.favoritesKey, normalized)
                .then(response => {
                    if (!response.ok) {
                        console.warn('Failed to save favorite reactions:', response.error);
                    }
                });
        }

        async loadReactionCombos() {
            const storedCombos = await this.requestExtensionStorage("storage:get", this.combosKey);
            if (storedCombos.ok && Array.isArray(storedCombos.value)) {
                return this.normalizeReactionCombos(storedCombos.value);
            }

            const localCombos = this.readLocalStorageJson(this.combosKey);
            if (Array.isArray(localCombos)) {
                const normalized = this.normalizeReactionCombos(localCombos);
                this.saveReactionCombos(normalized);
                return normalized;
            }

            return [];
        }

        saveReactionCombos(reactionCombos = this.reactionCombos) {
            const normalized = this.normalizeReactionCombos(reactionCombos);
            this.writeLocalStorageJson(this.combosKey, normalized);
            this.requestExtensionStorage("storage:set", this.combosKey, normalized)
                .then(response => {
                    if (!response.ok) {
                        console.warn('Failed to save reaction combos:', response.error);
                    }
                });
        }

        normalizeFavoriteReactions(list) {
            if (!Array.isArray(list)) {
                return [];
            }

            const seen = new Set();
            const normalized = [];

            list.forEach(emoji => {
                if (typeof emoji !== 'string') return;

                const value = emoji.trim();
                if (!value || seen.has(value)) return;

                seen.add(value);
                normalized.push(value);
            });

            return normalized.slice(0, this.maxFavoriteReactions);
        }

        normalizeReactionCombos(list) {
            if (!Array.isArray(list)) {
                return [];
            }

            const seenIds = new Set();
            return list
                .map((combo, index) => {
                    if (!combo || typeof combo !== 'object') return null;

                    const reactions = this.normalizeFavoriteReactions(combo.reactions)
                        .slice(0, this.maxComboReactions);
                    if (reactions.length === 0) return null;

                    const id = typeof combo.id === 'string' && combo.id.trim()
                        ? combo.id.trim()
                        : this.createComboId(index);
                    const uniqueId = seenIds.has(id) ? this.createComboId(index) : id;
                    const name = typeof combo.name === 'string' && combo.name.trim()
                        ? combo.name.trim().slice(0, 40)
                        : `Combo ${index + 1}`;

                    seenIds.add(uniqueId);
                    return { id: uniqueId, name, reactions };
                })
                .filter(Boolean)
                .slice(0, this.maxReactionCombos);
        }

        createComboId(seed = Date.now()) {
            return `combo_${seed}_${Math.random().toString(36).slice(2, 8)}`;
        }

        isFavoriteReaction(emoji) {
            return this.favoriteReactions.includes(emoji);
        }

        toggleFavoriteReaction(emoji) {
            if (!emoji) return;

            if (this.isFavoriteReaction(emoji)) {
                this.favoriteReactions = this.favoriteReactions.filter(item => item !== emoji);
                this.notifyInfo(`Đã bỏ ${emoji} khỏi yêu thích`);
            } else {
                this.favoriteReactions = [emoji, ...this.favoriteReactions.filter(item => item !== emoji)]
                    .slice(0, this.maxFavoriteReactions);
                this.notifyInfo(`Đã thêm ${emoji} vào yêu thích`);
            }

            this.saveFavoriteReactions();
            this.renderFavoriteReactions();
            this.renderManagerFavorites();
            this.updateManagerEmojiOptionState(emoji);
            this.updateRenderedFavoriteState(emoji);
        }

        moveFavoriteReaction(index, direction) {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= this.favoriteReactions.length) return;

            const next = [...this.favoriteReactions];
            const [item] = next.splice(index, 1);
            next.splice(targetIndex, 0, item);
            this.favoriteReactions = next;
            this.saveFavoriteReactions();
            this.renderFavoriteReactions();
            this.renderManagerFavorites();
        }

        removeFavoriteReaction(emoji) {
            if (!this.isFavoriteReaction(emoji)) return;

            this.favoriteReactions = this.favoriteReactions.filter(item => item !== emoji);
            this.saveFavoriteReactions();
            this.renderFavoriteReactions();
            this.renderManagerFavorites();
            this.updateManagerEmojiOptionState(emoji);
            this.updateRenderedFavoriteState(emoji);
            this.notifyInfo(`Đã bỏ ${emoji} khỏi yêu thích`);
        }

        moveComboDraftReaction(index, direction) {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= this.comboDraftReactions.length) return;

            const next = [...this.comboDraftReactions];
            const [item] = next.splice(index, 1);
            next.splice(targetIndex, 0, item);
            this.comboDraftReactions = next;
            this.renderComboDraft();
        }

        toggleComboDraftReaction(emoji) {
            if (!emoji) return;

            if (this.comboDraftReactions.includes(emoji)) {
                this.comboDraftReactions = this.comboDraftReactions.filter(item => item !== emoji);
            } else if (this.comboDraftReactions.length < this.maxComboReactions) {
                this.comboDraftReactions = [...this.comboDraftReactions, emoji];
            } else {
                this.notifyInfo(`Mỗi combo tối đa ${this.maxComboReactions} reaction`);
            }

            this.renderComboDraft();
            this.updateManagerEmojiOptionState(emoji);
        }

        resetComboEditor() {
            this.editingComboId = null;
            this.comboDraftReactions = [];
            if (this.comboNameInput) {
                this.comboNameInput.value = "";
            }
            this.renderComboDraft();
            this.renderManagerCombos();
            this.renderManagerEmojiPicker();
        }

        editReactionCombo(comboId) {
            const combo = this.reactionCombos.find(item => item.id === comboId);
            if (!combo) return;

            this.editingComboId = combo.id;
            this.comboDraftReactions = [...combo.reactions];
            if (this.comboNameInput) {
                this.comboNameInput.value = combo.name;
                this.comboNameInput.focus();
            }
            this.setActiveManagerTab('combos');
            this.renderComboDraft();
            this.renderManagerCombos();
            this.renderManagerEmojiPicker();
        }

        saveComboDraft() {
            const name = this.comboNameInput?.value.trim() || "";
            const reactions = this.normalizeFavoriteReactions(this.comboDraftReactions)
                .slice(0, this.maxComboReactions);

            if (!name) {
                this.notifyError('Hãy đặt tên combo trước khi lưu');
                this.comboNameInput?.focus();
                return;
            }

            if (reactions.length === 0) {
                this.notifyError('Combo cần ít nhất 1 reaction');
                return;
            }

            if (this.editingComboId) {
                this.reactionCombos = this.reactionCombos.map(combo => (
                    combo.id === this.editingComboId
                        ? { ...combo, name: name.slice(0, 40), reactions }
                        : combo
                ));
                this.notifyInfo(`Đã cập nhật combo ${name}`);
            } else {
                if (this.reactionCombos.length >= this.maxReactionCombos) {
                    this.notifyError(`Tối đa ${this.maxReactionCombos} combo`);
                    return;
                }

                this.reactionCombos = [
                    ...this.reactionCombos,
                    { id: this.createComboId(), name: name.slice(0, 40), reactions }
                ];
                this.notifyInfo(`Đã tạo combo ${name}`);
            }

            this.saveReactionCombos();
            this.renderReactionCombos();
            this.resetComboEditor();
        }

        deleteReactionCombo(comboId) {
            const combo = this.reactionCombos.find(item => item.id === comboId);
            if (!combo) return;

            if (!window.confirm(`Xóa combo "${combo.name}"?`)) return;

            this.reactionCombos = this.reactionCombos.filter(item => item.id !== comboId);
            this.saveReactionCombos();
            this.renderReactionCombos();
            this.renderManagerCombos();

            if (this.editingComboId === comboId) {
                this.resetComboEditor();
            }

            this.notifyInfo(`Đã xóa combo ${combo.name}`);
        }

        isStoryUrl() {
            const url = window.location.href;
            return url.includes('/stories/') && url.includes('facebook.com');
        }

        buildGroupCache() {
            this.groupCache.clear();
            this.emojiList.forEach(e => {
                const id = e.categoryId || this.slugify(e.group || e.category || 'emoji') || 'emoji';
                if (!this.groupCache.has(id)) {
                    this.groupCache.set(id, {
                        id,
                        label: e.group || e.category || this.getCategoryLabel(null, id),
                        icon: e.categoryIcon || this.getCategoryIcon(id) || e.value,
                        emojis: []
                    });
                }
                this.groupCache.get(id).emojis.push(e);
            });

            this.emojiCategories = Array.from(this.groupCache.values());
        }

        async setupUI() {
            const existingContainer = document.querySelector(".react-container");
            if (existingContainer) {
                existingContainer.remove();
            }

            this.container = document.createElement("div");
            this.container.className = "react-container";
            const accountLabel = document.createElement("div");
            accountLabel.className = "account-label";
            this.container.appendChild(accountLabel);

            const button = document.createElement("button");
            button.className = "btn-react";
            button.innerHTML = `<svg fill="#000000" width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g><path d="M19.8,26.1h-0.2c-2.4,0-4.8,0-7.2,0c-0.3,0-0.5-0.1-0.6-0.3c-2.5-3.2-5.1-6.3-7.6-9.5C4.1,16.1,4,16,4,15.8   c0-3.1,0-6.1,0-9.2c0-0.1,0-0.2,0.1-0.2h0.1c5.2,6.5,10.4,13,15.5,19.5c0,0,0,0.1,0.1,0.1L19.8,26.1L19.8,26.1z"/><path d="M27.8,16.3c-0.7,0.9-1.5,1.8-2.2,2.8c-0.2,0.2-0.4,0.3-0.6,0.3c-2.4,0-4.8,0-7.1,0c0,0-0.1,0-0.1,0c-0.1,0-0.2-0.1-0.1-0.2   c0,0,0-0.1,0.1-0.1c2.4-3,4.7-5.9,7.1-8.9c1-1.2,2-2.5,2.9-3.7c0-0.1,0.1-0.1,0.2-0.1c0,0,0.1,0,0.1,0c0,0.1,0,0.1,0,0.2   c0,3,0,6.1,0,9.1C28,16,27.9,16.2,27.8,16.3L27.8,16.3z"/></g></svg>`;

            const panel = document.createElement("div");
            panel.className = "emoji-panel";

            const favoriteSection = document.createElement("div");
            favoriteSection.className = "favorite-section";

            const favoriteHeader = document.createElement("div");
            favoriteHeader.className = "favorite-header";

            const favoriteTitle = document.createElement("span");
            favoriteTitle.className = "favorite-title";
            favoriteTitle.textContent = "Yêu thích";

            const favoriteManageButton = document.createElement("button");
            favoriteManageButton.type = "button";
            favoriteManageButton.className = "panel-action";
            favoriteManageButton.dataset.managerTab = "favorites";
            favoriteManageButton.textContent = "Sắp xếp";

            favoriteHeader.appendChild(favoriteTitle);
            favoriteHeader.appendChild(favoriteManageButton);

            this.favoriteListElement = document.createElement("div");
            this.favoriteListElement.className = "favorite-list";
            favoriteSection.appendChild(favoriteHeader);
            favoriteSection.appendChild(this.favoriteListElement);

            const comboSection = document.createElement("div");
            comboSection.className = "combo-section";

            const comboHeader = document.createElement("div");
            comboHeader.className = "combo-header";

            const comboTitle = document.createElement("span");
            comboTitle.className = "combo-title";
            comboTitle.textContent = "Combo";

            const comboManageButton = document.createElement("button");
            comboManageButton.type = "button";
            comboManageButton.className = "panel-action";
            comboManageButton.dataset.managerTab = "combos";
            comboManageButton.textContent = "Quản lý";

            comboHeader.appendChild(comboTitle);
            comboHeader.appendChild(comboManageButton);

            this.comboListElement = document.createElement("div");
            this.comboListElement.className = "combo-list";
            comboSection.appendChild(comboHeader);
            comboSection.appendChild(this.comboListElement);

            this.searchInput = document.createElement("input");
            this.searchInput.placeholder = "Tìm kiếm biểu tượng cảm xúc...";
            this.searchInput.className = "emoji-search";
            this.searchInput.type = "text";
            this.searchInput.autocomplete = "off";

            const listContainer = document.createElement("div");
            listContainer.className = "emoji-list-container";
            this.emojiListElement = document.createElement("ul");
            this.emojiListElement.className = "emoji-group";

            listContainer.addEventListener('scroll', this.throttle(() => {
                this.handleScroll(listContainer);
            }, 100));

            listContainer.appendChild(this.emojiListElement);
            panel.appendChild(favoriteSection);
            panel.appendChild(comboSection);
            panel.appendChild(this.searchInput);
            panel.appendChild(listContainer);
            this.container.appendChild(button);
            this.container.appendChild(panel);

            this.addEventListeners(button, panel);

            requestAnimationFrame(() => {
                this.currentPage = 0;
                this.hasMore = true;
                this.renderFavoriteReactions();
                this.renderReactionCombos();
                this.renderEmojis(this.filteredEmojis, true);
                this.renderGroupTabs();
            });
        }

        startObserving() {
            this.stopObserving();

            const footerSelectors = [
                "div[data-id] > div[role='contentinfo']",
                ".x11lhmoz.x78zum5.x1q0g3np",
                "[role='contentinfo']",
                ".x1cy8zhl.x9f619.x78zum5.x1q0g3np",
                ".x1yztbdb.x1sxj7lo", // Thêm selector mới cho Stories
                ".x1qjc9v5.x78zum5" // Selector bổ sung cho giao diện Stories
            ];

            const observerCallback = (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && this.isStoryUrl()) {
                        console.debug('Footer detected via IntersectionObserver:', entry.target);
                        this.checkAndAttach();
                    }
                });
            };

            this.observer = new IntersectionObserver(observerCallback, {
                root: null,
                threshold: 0.1
            });

            footerSelectors.forEach(selector => {
                const footer = document.querySelector(selector);
                if (footer) {
                    console.debug('Observing footer:', selector);
                    this.observer.observe(footer);
                }
            });
        }

        startPolling() {
            // Dừng polling cũ nếu có
            this.stopPolling();

            // Kiểm tra định kỳ mỗi 1 giây
            this.pollingInterval = setInterval(() => {
                if (this.isStoryUrl() && !this.isAttached) {
                    console.debug('Polling: Checking for footer...');
                    this.checkAndAttach();
                }
            }, 1000);
        }

        stopPolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        }

        stopObserving() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }

        async checkAndAttach() {
            if (!this.isStoryUrl()) {
                console.debug('Not on story page, skipping attachment');
                return;
            }

            // Chờ DOM ổn định
            await new Promise(resolve => setTimeout(resolve, 200));

            if (!this.container) {
                console.debug('Creating UI for the first time');
                await this.setupUI();
            }

            if (this.container && !this.isAttached) {
                this.throttledAttach();
            }
        }

        attachToFooter() {
            const footerSelectors = [
                "div[data-id] > div[role='contentinfo']",
                ".x11lhmoz.x78zum5.x1q0g3np",
                "[role='contentinfo']",
                ".x1cy8zhl.x9f619.x78zum5.x1q0g3np",
                ".x1yztbdb.x1sxj7lo", // Thêm selector mới cho Stories
                ".x1qjc9v5.x78zum5" // Selector bổ sung
            ];

            let footer = null;
            for (const selector of footerSelectors) {
                footer = document.querySelector(selector);
                if (footer) {
                    console.debug('Footer found with selector:', selector);
                    break;
                }
            }

            if (footer && this.container && !footer.contains(this.container)) {
                try {
                    footer.appendChild(this.container);
                    this.isAttached = true;
                    this.retryCount = 0;
                    console.log('StoryReactor attached to footer');
                } catch (err) {
                    console.error('Failed to attach to footer:', err);
                    this.scheduleRetry();
                }
            } else if (footer && this.container && footer.contains(this.container)) {
                this.isAttached = true;
                this.retryCount = 0;
            } else if (!footer) {
                console.debug('Footer not found, scheduling retry');
                this.scheduleRetry();
            }
        }

        scheduleRetry() {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.debug(`Scheduling retry ${this.retryCount}/${this.maxRetries}`);
                setTimeout(() => {
                    if (this.isStoryUrl()) {
                        this.attachToFooter();
                    }
                }, this.retryDelay * (this.retryCount + 1));
            } else {
                console.warn('Max retries reached, stopping attachment attempts');
            }
        }

        setupNavigationListener() {
            window.removeEventListener('popstate', this.handlePopState);
            window.removeEventListener('hashchange', this.handleHashChange);

            window.addEventListener('popstate', this.handlePopState);
            window.addEventListener('hashchange', this.handleHashChange);

            if (this.isHistoryPatched) {
                return;
            }

            this.originalPushState = history.pushState;
            this.originalReplaceState = history.replaceState;

            this.patchedPushState = (...args) => {
                this.originalPushState.apply(history, args);
                this.throttledNavigation();
            };

            this.patchedReplaceState = (...args) => {
                this.originalReplaceState.apply(history, args);
                this.throttledNavigation();
            };

            history.pushState = this.patchedPushState;
            history.replaceState = this.patchedReplaceState;

            this.isHistoryPatched = true;
        }

        handlePopState() {
            console.debug('Popstate event triggered');
            this.throttledNavigation();
        }

        handleHashChange() {
            console.debug('Hashchange event triggered');
            this.throttledNavigation();
        }

        handleNavigation() {
            this.isAttached = false;
            this.retryCount = 0;

            if (this.isStoryUrl()) {
                console.log('Navigated to story page');
                this.checkAndAttach();
            } else {
                console.log('Navigated away from story page');
                if (this.container && this.container.parentNode) {
                    this.container.remove();
                    this.isAttached = false;
                }
            }
        }

        handleScroll(container) {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight * 0.8 && !this.isLoading && this.hasMore) {
                this.loadMoreEmojis();
            }
        }

        loadMoreEmojis() {
            if (this.isLoading || !this.hasMore) return;

            this.isLoading = true;
            this.currentPage++;

            setTimeout(() => {
                this.renderEmojis(this.filteredEmojis, false);
                this.isLoading = false;
            }, 50);
        }

        renderFavoriteReactions() {
            if (!this.favoriteListElement) return;

            this.favoriteListElement.innerHTML = "";

            if (this.favoriteReactions.length === 0) {
                const empty = document.createElement("div");
                empty.className = "favorite-empty";
                empty.textContent = "Mở Sắp xếp để chọn emoji";
                this.favoriteListElement.appendChild(empty);
                return;
            }

            const frag = document.createDocumentFragment();

            this.favoriteReactions.forEach(emoji => {
                const item = document.createElement("div");
                item.className = "favorite-item";

                const reactionButton = document.createElement("button");
                reactionButton.type = "button";
                reactionButton.className = "favorite-reaction";
                reactionButton.dataset.emoji = emoji;
                reactionButton.textContent = emoji;
                reactionButton.title = `Gửi ${emoji}`;
                reactionButton.setAttribute("aria-label", `Gửi ${emoji}`);

                item.appendChild(reactionButton);
                frag.appendChild(item);
            });

            this.favoriteListElement.appendChild(frag);
        }

        renderReactionCombos() {
            if (!this.comboListElement) return;

            this.comboListElement.innerHTML = "";

            if (this.reactionCombos.length === 0) {
                const empty = document.createElement("div");
                empty.className = "combo-empty";
                empty.textContent = "Chưa có combo";
                this.comboListElement.appendChild(empty);
                return;
            }

            const frag = document.createDocumentFragment();
            this.reactionCombos.forEach(combo => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "combo-chip";
                button.dataset.comboId = combo.id;
                button.title = `${combo.name}: ${combo.reactions.join(" ")}`;
                button.setAttribute("aria-label", `Gửi combo ${combo.name}`);

                const name = document.createElement("span");
                name.className = "combo-chip-name";
                name.textContent = combo.name;

                const preview = document.createElement("span");
                preview.className = "combo-chip-preview";
                preview.textContent = combo.reactions.join("");

                button.appendChild(name);
                button.appendChild(preview);
                frag.appendChild(button);
            });

            this.comboListElement.appendChild(frag);
        }

        renderEmojis(list, reset = false) {
            if (!this.emojiListElement) return;

            requestAnimationFrame(() => {
                if (reset) {
                    this.emojiListElement.innerHTML = "";
                    this.currentPage = 0;
                    this.hasMore = true;
                }

                const startIndex = this.currentPage * this.itemsPerPage;
                const endIndex = startIndex + this.itemsPerPage;
                const emojisToRender = list.slice(startIndex, endIndex);

                this.hasMore = endIndex < list.length;

                if (emojisToRender.length === 0) {
                    this.hasMore = false;
                    return;
                }

                const frag = document.createDocumentFragment();

                emojisToRender.forEach((e, index) => {
                    const li = document.createElement("li");
                    li.className = "emoji";
                    li.title = e.name;
                    li.dataset.emoji = e.value;
                    li.style.animationDelay = `${index * 10}ms`;

                    const value = document.createElement("span");
                    value.className = "emoji-value";
                    value.textContent = e.value;

                    li.appendChild(value);
                    this.updateEmojiFavoriteState(li, e.value);
                    frag.appendChild(li);
                });

                this.emojiListElement.appendChild(frag);

                if (this.hasMore && !this.emojiListElement.querySelector('.loading-indicator')) {
                    const loadingIndicator = document.createElement("li");
                    loadingIndicator.className = "loading-indicator";
                    loadingIndicator.innerHTML = "⏳";
                    loadingIndicator.style.gridColumn = "1 / -1";
                    loadingIndicator.style.textAlign = "center";
                    loadingIndicator.style.padding = "10px";
                    loadingIndicator.style.fontSize = "16px";
                    this.emojiListElement.appendChild(loadingIndicator);
                } else if (!this.hasMore) {
                    const loadingIndicator = this.emojiListElement.querySelector('.loading-indicator');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }
                }
            });
        }

        updateEmojiFavoriteState(emojiElement, emoji) {
            const isFavorite = this.isFavoriteReaction(emoji);
            emojiElement.classList.toggle("is-favorite", isFavorite);
        }

        updateRenderedFavoriteState(emoji) {
            if (!this.emojiListElement) return;

            this.emojiListElement.querySelectorAll(".emoji").forEach(emojiElement => {
                if (emojiElement.dataset.emoji === emoji) {
                    this.updateEmojiFavoriteState(emojiElement, emoji);
                }
            });
        }

        ensureReactionManager() {
            if (this.managerDialog) return;

            const overlay = document.createElement("div");
            overlay.className = "reaction-manager-overlay";
            overlay.setAttribute("aria-hidden", "true");

            const dialog = document.createElement("div");
            dialog.className = "reaction-manager-dialog";
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");
            dialog.setAttribute("aria-label", "Quản lý reaction");

            const header = document.createElement("div");
            header.className = "manager-header";

            const titleWrap = document.createElement("div");
            const title = document.createElement("h2");
            title.className = "manager-title";
            title.textContent = "Quản lý reaction";
            this.managerSubtitleElement = document.createElement("p");
            this.managerSubtitleElement.className = "manager-subtitle";
            titleWrap.appendChild(title);
            titleWrap.appendChild(this.managerSubtitleElement);

            const closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.className = "manager-close";
            closeButton.dataset.managerAction = "close";
            closeButton.textContent = "×";
            closeButton.setAttribute("aria-label", "Đóng");

            header.appendChild(titleWrap);
            header.appendChild(closeButton);

            const tabs = document.createElement("div");
            tabs.className = "manager-tabs";
            ["favorites", "combos"].forEach(tabName => {
                const tab = document.createElement("button");
                tab.type = "button";
                tab.className = "manager-tab";
                tab.dataset.managerTab = tabName;
                tab.textContent = tabName === "favorites" ? "Yêu thích" : "Combo";
                tabs.appendChild(tab);
            });

            const body = document.createElement("div");
            body.className = "manager-body";

            const favoritePanel = document.createElement("section");
            favoritePanel.className = "manager-panel";
            favoritePanel.dataset.managerPanel = "favorites";

            const favoritePanelTitle = document.createElement("div");
            favoritePanelTitle.className = "manager-section-title";
            favoritePanelTitle.textContent = "Thứ tự yêu thích";
            this.managerFavoriteListElement = document.createElement("div");
            this.managerFavoriteListElement.className = "manager-sort-list";
            favoritePanel.appendChild(favoritePanelTitle);
            favoritePanel.appendChild(this.managerFavoriteListElement);

            const comboPanel = document.createElement("section");
            comboPanel.className = "manager-panel";
            comboPanel.dataset.managerPanel = "combos";

            const comboEditor = document.createElement("div");
            comboEditor.className = "combo-editor";

            const comboForm = document.createElement("div");
            comboForm.className = "combo-form";

            this.comboNameInput = document.createElement("input");
            this.comboNameInput.className = "combo-name-input";
            this.comboNameInput.type = "text";
            this.comboNameInput.maxLength = 40;
            this.comboNameInput.placeholder = "Tên combo";
            this.comboNameInput.autocomplete = "off";

            const saveComboButton = document.createElement("button");
            saveComboButton.type = "button";
            saveComboButton.className = "manager-primary";
            saveComboButton.dataset.managerAction = "save-combo";
            saveComboButton.textContent = "Lưu";

            const newComboButton = document.createElement("button");
            newComboButton.type = "button";
            newComboButton.className = "manager-secondary";
            newComboButton.dataset.managerAction = "new-combo";
            newComboButton.textContent = "Mới";

            comboForm.appendChild(this.comboNameInput);
            comboForm.appendChild(saveComboButton);
            comboForm.appendChild(newComboButton);

            const draftTitle = document.createElement("div");
            draftTitle.className = "manager-section-title";
            draftTitle.textContent = "Reaction trong combo";

            this.comboDraftListElement = document.createElement("div");
            this.comboDraftListElement.className = "combo-draft-list";

            comboEditor.appendChild(comboForm);
            comboEditor.appendChild(draftTitle);
            comboEditor.appendChild(this.comboDraftListElement);

            const savedComboTitle = document.createElement("div");
            savedComboTitle.className = "manager-section-title";
            savedComboTitle.textContent = "Combo đã lưu";
            this.managerComboListElement = document.createElement("div");
            this.managerComboListElement.className = "manager-combo-list";

            comboPanel.appendChild(comboEditor);
            comboPanel.appendChild(savedComboTitle);
            comboPanel.appendChild(this.managerComboListElement);

            const picker = document.createElement("section");
            picker.className = "manager-picker";

            const filterRow = document.createElement("div");
            filterRow.className = "manager-filter-row";

            this.managerSearchInput = document.createElement("input");
            this.managerSearchInput.className = "manager-search";
            this.managerSearchInput.type = "text";
            this.managerSearchInput.autocomplete = "off";

            this.managerCategoryTabsElement = document.createElement("div");
            this.managerCategoryTabsElement.className = "manager-category-tabs";
            this.managerCategoryTabsElement.setAttribute("aria-label", "Lọc theo loại emoji");

            this.managerEmojiListElement = document.createElement("div");
            this.managerEmojiListElement.className = "manager-emoji-list";

            filterRow.appendChild(this.managerSearchInput);
            filterRow.appendChild(this.managerCategoryTabsElement);
            picker.appendChild(filterRow);
            picker.appendChild(this.managerEmojiListElement);

            body.appendChild(favoritePanel);
            body.appendChild(comboPanel);
            body.appendChild(picker);

            dialog.appendChild(header);
            dialog.appendChild(tabs);
            dialog.appendChild(body);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            overlay.addEventListener("click", (e) => this.handleManagerClick(e));
            this.managerSearchInput.addEventListener("input", () => this.renderManagerEmojiPicker());
            this.managerCategoryTabsElement.addEventListener("click", (e) => {
                const target = e.target instanceof Element ? e.target : e.target?.parentElement;
                const tab = target?.closest(".manager-category-tab");
                if (!tab) return;

                e.preventDefault();
                this.activeManagerGroup = tab.dataset.group || "all";
                this.updateManagerCategoryTabState();
                this.renderManagerEmojiPicker();
            });
            this.managerEmojiListElement.addEventListener("scroll", this.handleManagerEmojiScroll);
            this.comboNameInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.saveComboDraft();
                }
            });

            this.managerDialog = overlay;
            this.renderManagerCategoryTabs();
        }

        openReactionManager(tab = "favorites") {
            this.ensureReactionManager();
            this.setActiveManagerTab(tab);
            this.managerDialog.classList.add("show");
            this.managerDialog.setAttribute("aria-hidden", "false");
            document.addEventListener("keydown", this.handleDialogKeydown);

            requestAnimationFrame(() => {
                if (this.activeManagerTab === "combos") {
                    this.comboNameInput?.focus();
                } else {
                    this.managerSearchInput?.focus();
                }
            });
        }

        closeReactionManager() {
            if (!this.managerDialog) return;

            this.managerDialog.classList.remove("show");
            this.managerDialog.setAttribute("aria-hidden", "true");
            document.removeEventListener("keydown", this.handleDialogKeydown);
            this.openReactionPanel();
        }

        renderManagerCategoryTabs() {
            if (!this.managerCategoryTabsElement) return;

            const currentValue = this.groupCache.has(this.activeManagerGroup)
                ? this.activeManagerGroup
                : "all";
            this.activeManagerGroup = currentValue;

            this.managerCategoryTabsElement.innerHTML = "";

            const allTab = document.createElement("button");
            allTab.type = "button";
            allTab.className = "manager-category-tab";
            allTab.dataset.group = "all";
            allTab.title = "Tất cả";
            allTab.textContent = "🗂️";
            this.managerCategoryTabsElement.appendChild(allTab);

            this.groupCache.forEach(group => {
                const tab = document.createElement("button");
                tab.type = "button";
                tab.className = "manager-category-tab";
                tab.dataset.group = group.id;
                tab.title = group.label;
                tab.textContent = group.icon || group.emojis[0]?.value || "•";
                this.managerCategoryTabsElement.appendChild(tab);
            });

            this.updateManagerCategoryTabState();
        }

        updateManagerCategoryTabState() {
            this.managerCategoryTabsElement
                ?.querySelectorAll(".manager-category-tab")
                .forEach(tab => {
                    const active = (tab.dataset.group || "all") === this.activeManagerGroup;
                    tab.classList.toggle("active", active);
                    tab.setAttribute("aria-pressed", active ? "true" : "false");
                });
        }

        openReactionPanel() {
            const panel = this.container?.querySelector(".emoji-panel");
            if (panel) {
                panel.classList.add("show");
            }
        }

        handleDialogKeydown(e) {
            if (e.key === "Escape") {
                this.closeReactionManager();
            }
        }

        setActiveManagerTab(tab) {
            this.activeManagerTab = tab === "combos" ? "combos" : "favorites";

            if (!this.managerDialog) return;

            this.managerDialog.querySelectorAll(".manager-tab").forEach(button => {
                button.classList.toggle("active", button.dataset.managerTab === this.activeManagerTab);
            });

            this.managerDialog.querySelectorAll(".manager-panel").forEach(panel => {
                panel.classList.toggle("active", panel.dataset.managerPanel === this.activeManagerTab);
            });

            if (this.managerSubtitleElement) {
                this.managerSubtitleElement.textContent = this.activeManagerTab === "favorites"
                    ? "Chọn emoji bằng nút lớn, rồi dùng mũi tên để sắp xếp thứ tự."
                    : "Đặt tên combo, chọn một hoặc nhiều emoji, rồi lưu để dùng nhanh.";
            }

            if (this.managerSearchInput) {
                this.managerSearchInput.placeholder = this.activeManagerTab === "favorites"
                    ? "Tìm emoji để thêm hoặc bỏ yêu thích..."
                    : "Tìm emoji để thêm vào combo...";
            }

            this.renderManagerCategoryTabs();
            this.renderManagerFavorites();
            this.renderManagerCombos();
            this.renderComboDraft();
            this.renderManagerEmojiPicker();
        }

        handleManagerClick(e) {
            const target = e.target instanceof Element ? e.target : e.target?.parentElement;
            if (!target) return;

            if (target === this.managerDialog || target.closest('[data-manager-action="close"]')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeReactionManager();
                return;
            }

            const tab = target.closest(".manager-tab, .panel-action");
            if (tab?.dataset.managerTab) {
                e.preventDefault();
                e.stopPropagation();
                this.setActiveManagerTab(tab.dataset.managerTab);
                if (target.closest(".panel-action")) {
                    this.openReactionManager(tab.dataset.managerTab);
                }
                return;
            }

            const emojiOption = target.closest(".manager-emoji-option");
            if (emojiOption) {
                e.preventDefault();
                const emoji = emojiOption.dataset.emoji;
                if (this.activeManagerTab === "favorites") {
                    this.toggleFavoriteReaction(emoji);
                } else {
                    this.toggleComboDraftReaction(emoji);
                }
                return;
            }

            const actionButton = target.closest("[data-manager-action]");
            if (!actionButton) return;

            e.preventDefault();
            const action = actionButton.dataset.managerAction;

            if (action === "move-favorite") {
                this.moveFavoriteReaction(Number(actionButton.dataset.index), Number(actionButton.dataset.direction));
            } else if (action === "remove-favorite") {
                this.removeFavoriteReaction(actionButton.dataset.emoji);
            } else if (action === "save-combo") {
                this.saveComboDraft();
            } else if (action === "new-combo") {
                this.resetComboEditor();
            } else if (action === "remove-draft") {
                this.comboDraftReactions = this.comboDraftReactions.filter(item => item !== actionButton.dataset.emoji);
                this.renderComboDraft();
                this.updateManagerEmojiOptionState(actionButton.dataset.emoji);
            } else if (action === "move-draft") {
                this.moveComboDraftReaction(Number(actionButton.dataset.index), Number(actionButton.dataset.direction));
            } else if (action === "edit-combo") {
                this.editReactionCombo(actionButton.dataset.comboId);
            } else if (action === "delete-combo") {
                this.deleteReactionCombo(actionButton.dataset.comboId);
            }
        }

        renderManagerFavorites() {
            if (!this.managerFavoriteListElement) return;

            this.managerFavoriteListElement.innerHTML = "";

            if (this.favoriteReactions.length === 0) {
                const empty = document.createElement("div");
                empty.className = "manager-empty";
                empty.textContent = "Chưa có yêu thích. Chọn emoji ở danh sách bên dưới.";
                this.managerFavoriteListElement.appendChild(empty);
                return;
            }

            const frag = document.createDocumentFragment();
            this.favoriteReactions.forEach((emoji, index) => {
                frag.appendChild(this.createSortableReactionRow({
                    emoji,
                    index,
                    total: this.favoriteReactions.length,
                    moveAction: "move-favorite",
                    removeAction: "remove-favorite"
                }));
            });

            this.managerFavoriteListElement.appendChild(frag);
        }

        renderComboDraft() {
            if (!this.comboDraftListElement) return;

            this.comboDraftListElement.innerHTML = "";

            if (this.comboDraftReactions.length === 0) {
                const empty = document.createElement("div");
                empty.className = "manager-empty";
                empty.textContent = "Chọn emoji ở danh sách bên dưới.";
                this.comboDraftListElement.appendChild(empty);
                return;
            }

            const frag = document.createDocumentFragment();
            this.comboDraftReactions.forEach((emoji, index) => {
                frag.appendChild(this.createSortableReactionRow({
                    emoji,
                    index,
                    total: this.comboDraftReactions.length,
                    moveAction: "move-draft",
                    removeAction: "remove-draft"
                }));
            });

            this.comboDraftListElement.appendChild(frag);
        }

        createSortableReactionRow({ emoji, index, total, moveAction, removeAction }) {
            const row = document.createElement("div");
            row.className = "manager-sort-row";

            const order = document.createElement("span");
            order.className = "manager-sort-index";
            order.textContent = String(index + 1);

            const preview = document.createElement("span");
            preview.className = "manager-sort-emoji";
            preview.textContent = emoji;

            const controls = document.createElement("div");
            controls.className = "manager-sort-controls";

            const up = document.createElement("button");
            up.type = "button";
            up.className = "manager-icon-button";
            up.dataset.managerAction = moveAction;
            up.dataset.index = String(index);
            up.dataset.direction = "-1";
            up.textContent = "↑";
            up.title = "Đưa lên";
            up.disabled = index === 0;

            const down = document.createElement("button");
            down.type = "button";
            down.className = "manager-icon-button";
            down.dataset.managerAction = moveAction;
            down.dataset.index = String(index);
            down.dataset.direction = "1";
            down.textContent = "↓";
            down.title = "Đưa xuống";
            down.disabled = index === total - 1;

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "manager-icon-button danger";
            remove.dataset.managerAction = removeAction;
            remove.dataset.emoji = emoji;
            remove.textContent = "×";
            remove.title = "Xóa";

            controls.appendChild(up);
            controls.appendChild(down);
            controls.appendChild(remove);

            row.appendChild(order);
            row.appendChild(preview);
            row.appendChild(controls);
            return row;
        }

        renderManagerCombos() {
            if (!this.managerComboListElement) return;

            this.managerComboListElement.innerHTML = "";

            if (this.reactionCombos.length === 0) {
                const empty = document.createElement("div");
                empty.className = "manager-empty";
                empty.textContent = "Chưa có combo nào.";
                this.managerComboListElement.appendChild(empty);
                return;
            }

            const frag = document.createDocumentFragment();
            this.reactionCombos.forEach(combo => {
                const row = document.createElement("div");
                row.className = "manager-combo-row";
                row.classList.toggle("editing", combo.id === this.editingComboId);

                const info = document.createElement("div");
                info.className = "manager-combo-info";

                const name = document.createElement("div");
                name.className = "manager-combo-name";
                name.textContent = combo.name;

                const preview = document.createElement("div");
                preview.className = "manager-combo-preview";
                preview.textContent = combo.reactions.join(" ");

                info.appendChild(name);
                info.appendChild(preview);

                const controls = document.createElement("div");
                controls.className = "manager-combo-controls";

                const edit = document.createElement("button");
                edit.type = "button";
                edit.className = "manager-secondary";
                edit.dataset.managerAction = "edit-combo";
                edit.dataset.comboId = combo.id;
                edit.textContent = "Sửa";

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "manager-secondary danger";
                remove.dataset.managerAction = "delete-combo";
                remove.dataset.comboId = combo.id;
                remove.textContent = "Xóa";

                controls.appendChild(edit);
                controls.appendChild(remove);

                row.appendChild(info);
                row.appendChild(controls);
                frag.appendChild(row);
            });

            this.managerComboListElement.appendChild(frag);
        }

        normalizeSearchTerm(term) {
            return String(term || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        }

        emojiMatchesSearch(em, search) {
            if (!search) return true;

            const name = this.normalizeSearchTerm(em.name);
            const group = this.normalizeSearchTerm(`${em.group || ""} ${em.categoryId || ""}`);
            return name.includes(search) || group.includes(search) || em.value.includes(search);
        }

        getEmojiListByGroup(groupId = "all") {
            if (!groupId || groupId === "all") {
                return this.emojiList;
            }

            return this.groupCache.get(groupId)?.emojis || [];
        }

        getFilteredEmojiList(groupId, term) {
            const search = this.normalizeSearchTerm(term);
            return this.getEmojiListByGroup(groupId).filter(em => this.emojiMatchesSearch(em, search));
        }

        applyPanelEmojiFilter() {
            this.filteredEmojis = this.getFilteredEmojiList(this.activeEmojiGroup, this.searchInput?.value || "");
            this.currentPage = 0;
            this.hasMore = true;
            this.renderEmojis(this.filteredEmojis, true);
        }

        renderManagerEmojiPicker() {
            if (!this.managerEmojiListElement) return;

            this.managerFilteredEmojis = this.getFilteredEmojiList(
                this.activeManagerGroup,
                this.managerSearchInput?.value || ""
            );
            this.managerEmojiPage = 0;
            this.managerEmojiHasMore = this.managerFilteredEmojis.length > 0;
            this.managerEmojiListElement.innerHTML = "";
            this.managerEmojiListElement.scrollTop = 0;

            if (this.managerFilteredEmojis.length === 0) {
                const empty = document.createElement("div");
                empty.className = "manager-empty manager-emoji-status";
                empty.textContent = "Không tìm thấy emoji phù hợp.";
                this.managerEmojiListElement.appendChild(empty);
                return;
            }

            this.loadMoreManagerEmojis();
        }

        handleManagerEmojiScroll() {
            if (!this.managerEmojiListElement || this.isManagerEmojiLoading || !this.managerEmojiHasMore) {
                return;
            }

            const { scrollTop, scrollHeight, clientHeight } = this.managerEmojiListElement;
            if (scrollTop + clientHeight >= scrollHeight * 0.75) {
                this.loadMoreManagerEmojis();
            }
        }

        loadMoreManagerEmojis() {
            if (!this.managerEmojiListElement || this.isManagerEmojiLoading || !this.managerEmojiHasMore) {
                return;
            }

            this.isManagerEmojiLoading = true;
            const startIndex = this.managerEmojiPage * this.managerEmojiItemsPerPage;
            const endIndex = startIndex + this.managerEmojiItemsPerPage;
            const list = this.managerFilteredEmojis.slice(startIndex, endIndex);

            if (list.length === 0) {
                this.managerEmojiHasMore = false;
                this.isManagerEmojiLoading = false;
                this.removeManagerEmojiStatus();
                return;
            }

            const frag = document.createDocumentFragment();
            list.forEach(em => {
                frag.appendChild(this.createManagerEmojiOption(em));
            });

            this.removeManagerEmojiStatus();
            this.managerEmojiListElement.appendChild(frag);
            this.managerEmojiPage++;
            this.managerEmojiHasMore = endIndex < this.managerFilteredEmojis.length;
            this.isManagerEmojiLoading = false;

            if (this.managerEmojiHasMore) {
                const status = document.createElement("div");
                status.className = "manager-empty manager-emoji-status";
                status.textContent = "Cuộn xuống để tải thêm emoji...";
                this.managerEmojiListElement.appendChild(status);
            }
        }

        createManagerEmojiOption(em) {
            const selected = this.activeManagerTab === "favorites"
                ? this.isFavoriteReaction(em.value)
                : this.comboDraftReactions.includes(em.value);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "manager-emoji-option";
            button.classList.toggle("selected", selected);
            button.dataset.emoji = em.value;
            button.title = `${em.name} - ${em.group}`;
            button.setAttribute("aria-label", selected ? `Bỏ ${em.value}` : `Chọn ${em.value}`);

            const value = document.createElement("span");
            value.className = "manager-emoji-value";
            value.textContent = em.value;

            const mark = document.createElement("span");
            mark.className = "manager-emoji-mark";
            mark.textContent = selected ? "✓" : "+";

            button.appendChild(value);
            button.appendChild(mark);
            return button;
        }

        updateManagerEmojiOptionState(emoji) {
            if (!this.managerEmojiListElement || !emoji) return;

            this.managerEmojiListElement
                .querySelectorAll(".manager-emoji-option")
                .forEach(button => {
                    if (button.dataset.emoji !== emoji) return;

                    const selected = this.activeManagerTab === "favorites"
                        ? this.isFavoriteReaction(emoji)
                        : this.comboDraftReactions.includes(emoji);

                    button.classList.toggle("selected", selected);
                    button.setAttribute("aria-label", selected ? `Bỏ ${emoji}` : `Chọn ${emoji}`);

                    const mark = button.querySelector(".manager-emoji-mark");
                    if (mark) {
                        mark.textContent = selected ? "✓" : "+";
                    }
                });
        }

        removeManagerEmojiStatus() {
            this.managerEmojiListElement
                ?.querySelectorAll(".manager-emoji-status")
                .forEach(element => element.remove());
        }

        renderGroupTabs() {
            if (!this.container) return;

            const panel = this.container.querySelector(".emoji-panel");
            if (!panel) return;

            const old = panel.querySelector(".emoji-group-tabs");
            if (old) old.remove();

            const tabContainer = document.createElement("div");
            tabContainer.className = "emoji-group-tabs";
            const frag = document.createDocumentFragment();

            const allTab = document.createElement("div");
            allTab.className = "emoji-tab";
            allTab.classList.toggle("active", this.activeEmojiGroup === "all");
            allTab.textContent = "🗂️";
            allTab.title = "Tất cả";
            allTab.dataset.group = "all";
            frag.appendChild(allTab);

            this.groupCache.forEach(group => {
                const tab = document.createElement("div");
                tab.className = "emoji-tab";
                tab.classList.toggle("active", this.activeEmojiGroup === group.id);
                tab.textContent = group.icon || group.emojis[0]?.value || "•";
                tab.title = group.label;
                tab.dataset.group = group.id;
                frag.appendChild(tab);
            });

            tabContainer.appendChild(frag);
            panel.appendChild(tabContainer);
        }

        addEventListeners(button, panel) {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                panel.classList.toggle("show");
            });

            const debouncedSearch = this.debounce(() => {
                this.applyPanelEmojiFilter();
            }, 200);

            this.searchInput.addEventListener("input", () => debouncedSearch());

            this.emojiListElement.addEventListener('click', (e) => {
                const emojiEl = e.target.closest('.emoji');
                if (emojiEl) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleReaction(emojiEl.dataset.emoji);
                }
            });

            panel.addEventListener('click', (e) => {
                const panelAction = e.target.closest('.panel-action');
                if (panelAction) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openReactionManager(panelAction.dataset.managerTab);
                    return;
                }

                const comboChip = e.target.closest('.combo-chip');
                if (comboChip) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleComboReaction(comboChip.dataset.comboId);
                    return;
                }

                const favoriteReaction = e.target.closest('.favorite-reaction');
                if (favoriteReaction) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleReaction(favoriteReaction.dataset.emoji);
                    return;
                }

                const tab = e.target.closest('.emoji-tab');
                if (tab) {
                    e.preventDefault();
                    e.stopPropagation();

                    this.activeEmojiGroup = tab.dataset.group || "all";
                    this.applyPanelEmojiFilter();

                    panel.querySelectorAll(".emoji-tab").forEach(t => t.classList.remove("active"));
                    tab.classList.add("active");
                }
            });

            document.removeEventListener('click', this.handleDocumentClick);
            document.addEventListener('click', this.handleDocumentClick);
        }

        handleDocumentClick(e) {
            if (!this.container || this.container.contains(e.target)) {
                return;
            }

            const panel = this.container.querySelector(".emoji-panel");
            if (panel) {
                panel.classList.remove("show");
            }
        }

        async handleReaction(emoji) {
            try {
                const [userId, fbDtsg, storyId] = await Promise.all([
                    this.getUserId(),
                    this.getFbDtsg(),
                    this.getStoryId()
                ]);

                console.debug('Reaction parameters:', { userId, fbDtsg, storyId, emoji });

                if (!userId || !fbDtsg || !storyId) {
                    throw new Error('Thiếu tham số bắt buộc');
                }

                await this.reactStory(userId, fbDtsg, storyId, emoji);
                this.notifySuccess(`Đã thả cảm xúc ${emoji}`);
                console.log('Gửi phản hồi thành công:', emoji);
            } catch (err) {
                this.notifyError('Không gửi được cảm xúc');
                console.error('Gửi phản hồi thất bại:', err);
            }
        }

        async handleComboReaction(comboId) {
            const combo = this.reactionCombos.find(item => item.id === comboId);
            if (!combo) return;

            try {
                const [userId, fbDtsg, storyId] = await Promise.all([
                    this.getUserId(),
                    this.getFbDtsg(),
                    this.getStoryId()
                ]);

                if (!userId || !fbDtsg || !storyId) {
                    throw new Error('Thiếu tham số bắt buộc');
                }

                let sent = 0;
                const failed = [];

                for (const reaction of combo.reactions) {
                    try {
                        await this.reactStory(userId, fbDtsg, storyId, reaction);
                        sent++;
                        await new Promise(resolve => setTimeout(resolve, 180));
                    } catch (err) {
                        failed.push(reaction);
                        console.error('Gửi reaction trong combo thất bại:', reaction, err);
                    }
                }

                if (failed.length === combo.reactions.length) {
                    this.notifyError(`Không gửi được combo ${combo.name}`);
                } else if (failed.length > 0) {
                    this.notifyWarning(`Combo ${combo.name}: gửi ${sent}/${combo.reactions.length}`);
                } else {
                    this.notifySuccess(`Đã gửi combo ${combo.name}`);
                }
            } catch (err) {
                this.notifyError(`Không gửi được combo ${combo.name}`);
                console.error('Gửi combo thất bại:', err);
            }
        }

        notifySuccess(message) {
            if (window.StoryReactorNotifications?.success) {
                window.StoryReactorNotifications.success(message);
            } else if (typeof window.showSuccess === 'function') {
                window.showSuccess(message);
            }
        }

        notifyError(message) {
            if (window.StoryReactorNotifications?.error) {
                window.StoryReactorNotifications.error(message);
            } else if (typeof window.showError === 'function') {
                window.showError(message);
            }
        }

        notifyWarning(message) {
            if (window.StoryReactorNotifications?.warning) {
                window.StoryReactorNotifications.warning(message);
            } else if (typeof window.showWarning === 'function') {
                window.showWarning(message);
            } else {
                this.notifyInfo(message);
            }
        }

        notifyInfo(message) {
            if (window.StoryReactorNotifications?.info) {
                window.StoryReactorNotifications.info(message);
            } else if (typeof window.showInfo === 'function') {
                window.showInfo(message);
            }
        }

        getStoryId() {
            const story = document.querySelector(".xh8yej3.x1n2onr6[data-id]") ||
                document.querySelector("[data-id]");
            let storyId = story?.dataset.id || "";

            if (storyId && !storyId.startsWith('Uzpf')) {
                try {
                    storyId = btoa(storyId);
                } catch (err) {
                    console.warn('Không thể mã hóa storyId sang base64:', err);
                }
            }
            return storyId;
        }

        getFbDtsg() {
            const scriptTags = document.querySelectorAll('script');
            for (const script of scriptTags) {
                const match = script.textContent.match(/"DTSGInitialData"[^"]*"token":"([^"]+)"/);
                if (match) return match[1];
            }

            const match = document.documentElement.innerHTML.match(/"DTSGInitialData",\[],{"token":"(.+?)"/);
            return match?.[1] || "";
        }

        getUserId() {
            const pageMatch = document.cookie.match(/i_user=(\d+)/);
            if (pageMatch) {
                return pageMatch[1];
            }
            const userMatch = document.cookie.match(/c_user=(\d+)/);
            return userMatch?.[1] || "";
        }

        getGraphqlEndpoint() {
            const supportedHosts = new Set(["www.facebook.com", "web.facebook.com"]);
            const host = supportedHosts.has(window.location.hostname)
                ? window.location.hostname
                : "www.facebook.com";

            return `https://${host}/api/graphql`;
        }

        async reactStory(userId, fbDtsg, storyId, reaction, attempt = 0) {
            try {
                const variables = {
                    input: {
                        attribution_id_v2: `StoriesCometSuspenseRoot.react,comet.stories.viewer,unexpected,${Date.now()},952132,,,;CometHomeRoot.react,comet.home,via_cold_start,${Date.now()},682755,4748854339,,`,
                        lightweight_reaction_actions: { offsets: [0], reaction },
                        message: reaction,
                        story_id: storyId,
                        story_reply_type: "LIGHT_WEIGHT",
                        actor_id: userId,
                        client_mutation_id: Math.floor(Math.random() * 1000000)
                    }
                };

                const body = new URLSearchParams({
                    av: userId,
                    __user: userId,
                    __a: 1,
                    fb_dtsg: fbDtsg,
                    fb_api_caller_class: "RelayModern",
                    fb_api_req_friendly_name: "useStoriesSendReplyMutation",
                    variables: JSON.stringify(variables),
                    server_timestamps: true,
                    doc_id: "9697491553691692"
                });

                const response = await fetch(this.getGraphqlEndpoint(), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/json",
                        "X-FB-Friendly-Name": "useStoriesSendReplyMutation",
                        "X-FB-LSD": "Bkr8euu7oUK5QiCzeEopBH"
                    },
                    body: body.toString()
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                if (result.errors) {
                    throw new Error('Lỗi GraphQL: ' + JSON.stringify(result.errors));
                }

                return result;
            } catch (err) {
                console.error('Thử gửi phản hồi thất bại:', err);
                if (attempt < this.maxReactionRetries) {
                    const nextAttempt = attempt + 1;
                    console.log(`Thử lại phản hồi... Lần ${nextAttempt}`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * nextAttempt));
                    return this.reactStory(userId, fbDtsg, storyId, reaction, nextAttempt);
                }
                throw err;
            }
        }

        destroy() {
            this.stopObserving();
            this.stopPolling();
            if (this.container && this.container.parentNode) {
                this.container.remove();
            }
            if (this.managerDialog && this.managerDialog.parentNode) {
                this.managerDialog.remove();
            }
            document.removeEventListener('click', this.handleDocumentClick);
            document.removeEventListener('keydown', this.handleDialogKeydown);
            window.removeEventListener('popstate', this.handlePopState);
            window.removeEventListener('hashchange', this.handleHashChange);
            if (this.isHistoryPatched) {
                if (history.pushState === this.patchedPushState) {
                    history.pushState = this.originalPushState;
                }

                if (history.replaceState === this.patchedReplaceState) {
                    history.replaceState = this.originalReplaceState;
                }
            }

            this.container = null;
            this.searchInput = null;
            this.emojiListElement = null;
            this.favoriteListElement = null;
            this.comboListElement = null;
            this.managerDialog = null;
            this.managerSearchInput = null;
            this.managerCategoryTabsElement = null;
            this.managerEmojiListElement = null;
            this.managerFavoriteListElement = null;
            this.managerComboListElement = null;
            this.managerSubtitleElement = null;
            this.comboNameInput = null;
            this.comboDraftListElement = null;
            this.managerFilteredEmojis = [];
            this.managerEmojiPage = 0;
            this.managerEmojiHasMore = false;
            this.isManagerEmojiLoading = false;
            this.activeEmojiGroup = "all";
            this.activeManagerGroup = "all";
            this.originalPushState = null;
            this.originalReplaceState = null;
            this.patchedPushState = null;
            this.patchedReplaceState = null;
            this.isHistoryPatched = false;
            this.isAttached = false;
            clearTimeout(this.debounceTimeout);
            this.isInitialized = false;
        }
    }

    const reactor = new StoryReactor(config);
    window.StoryReactorInstance = reactor;
    reactor.init();

    const cleanup = () => {
        if (window.StoryReactorInstance) {
            window.StoryReactorInstance.destroy();
            window.StoryReactorInstance = null;
        }
    };

    if (window.StoryReactorCleanup) {
        window.removeEventListener('beforeunload', window.StoryReactorCleanup);
    }

    window.StoryReactorCleanup = cleanup;
    window.addEventListener('beforeunload', cleanup);
})();
