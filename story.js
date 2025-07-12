(function() {
    'use strict';

    // Check if StoryReactor is already initialized
    if (window.StoryReactorInstance) {
        console.log('StoryReactor is already running, cleaning up...');
        window.StoryReactorInstance.destroy();
        window.StoryReactorInstance = null;
    }

    class StoryReactor {
        constructor() {
            this.emojiList = [];
            this.filteredEmojis = [];
            this.container = null;
            this.searchInput = null;
            this.emojiListElement = null;
            this.groupCache = new Map();
            this.isInitialized = false;
            this.debounceTimeout = null;
            this.collator = new Intl.Collator(undefined, { sensitivity: 'base' });
            this.observer = null;
            this.pollingInterval = null;
            this.cacheKey = 'emoji_cache';
            this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
            this.isAttached = false;
            this.retryCount = 0;
            this.maxRetries = 10; // Tăng số lần thử
            this.retryDelay = 500; // Giảm độ trễ để thử nhanh hơn
            this.currentPage = 0;
            this.itemsPerPage = 100;
            this.isLoading = false;
            this.hasMore = true;

            // Bind methods to preserve context
            this.handleNavigation = this.handleNavigation.bind(this);
            this.checkAndAttach = this.checkAndAttach.bind(this);
            this.handlePopState = this.handlePopState.bind(this);
            this.handleHashChange = this.handleHashChange.bind(this);

            // Throttle functions
            this.throttledAttach = this.throttle(this.attachToFooter.bind(this), 100);
            this.throttledNavigation = this.throttle(this.handleNavigation, 200);
        }

        // Utility function for throttling
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
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
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        async init() {
            if (this.isInitialized) return;

            try {
                await this.loadEmojiData();
                this.filteredEmojis = [...this.emojiList];
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
                this.emojiList = cachedData;
                return;
            }

            for (let i = 0; i < 3; i++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const response = await fetch('https://raw.githubusercontent.com/KimiZK-Dev/Tao-lao/refs/heads/main/emoji.json', {
                        signal: controller.signal,
                        cache: 'force-cache'
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    this.emojiList = await response.json();
                    this.setCachedData(this.emojiList);
                    return;
                } catch (err) {
                    console.warn(`Fetch attempt ${i + 1} failed:`, err);
                    if (i === 2) {
                        this.emojiList = [
                            { codes: "1F600", value: "😀", name: "grinning face", group: "Smileys & Emotion" },
                            { codes: "1F602", value: "😂", name: "face with tears of joy", group: "Smileys & Emotion" },
                            { codes: "2764", value: "❤️", name: "red heart", group: "Smileys & Emotion" },
                            { codes: "1F44D", value: "👍", name: "thumbs up", group: "People & Body" },
                            { codes: "1F44E", value: "👎", name: "thumbs down", group: "People & Body" }
                        ];
                    }
                }
            }
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

        isStoryUrl() {
            const url = window.location.href;
            return url.includes('/stories/') && url.includes('facebook.com');
        }

        buildGroupCache() {
            this.groupCache.clear();
            this.emojiList.forEach(e => {
                const group = e.group || e.category;
                if (!this.groupCache.has(group)) {
                    this.groupCache.set(group, []);
                }
                this.groupCache.get(group).push(e);
            });
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
            panel.appendChild(this.searchInput);
            panel.appendChild(listContainer);
            this.container.appendChild(button);
            this.container.appendChild(panel);

            this.addEventListeners(button, panel);

            requestAnimationFrame(() => {
                this.currentPage = 0;
                this.hasMore = true;
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

            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;

            history.pushState = (...args) => {
                originalPushState.apply(history, args);
                this.throttledNavigation();
            };

            history.replaceState = (...args) => {
                originalReplaceState.apply(history, args);
                this.throttledNavigation();
            };
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
                    li.textContent = e.value;
                    li.title = e.name;
                    li.dataset.emoji = e.value;
                    li.style.animationDelay = `${index * 10}ms`;
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
            allTab.className = "emoji-tab active";
            allTab.textContent = "🗂️";
            allTab.title = "Tất cả";
            allTab.dataset.group = "all";
            frag.appendChild(allTab);

            this.groupCache.forEach((group, name) => {
                const emoji = group[0];
                const tab = document.createElement("div");
                tab.className = "emoji-tab";
                tab.textContent = emoji.value;
                tab.title = name;
                tab.dataset.group = name;
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

            const debouncedSearch = this.debounce((term) => {
                this.filteredEmojis = this.emojiList.filter(em => {
                    const name = em.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const search = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return name.includes(search) || em.value.includes(search);
                });
                this.currentPage = 0;
                this.hasMore = true;
                this.renderEmojis(this.filteredEmojis, true);
            }, 200);

            this.searchInput.addEventListener("input", (e) => {
                const term = e.target.value.toLowerCase();
                debouncedSearch(term);
            });

            this.emojiListElement.addEventListener('click', (e) => {
                const emojiEl = e.target.closest('.emoji');
                if (emojiEl) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleReaction(emojiEl.dataset.emoji);
                }
            });

            panel.addEventListener('click', (e) => {
                const tab = e.target.closest('.emoji-tab');
                if (tab) {
                    e.preventDefault();
                    e.stopPropagation();

                    this.filteredEmojis = tab.dataset.group === 'all' 
                        ? [...this.emojiList] 
                        : this.groupCache.get(tab.dataset.group) || [];

                    this.currentPage = 0;
                    this.hasMore = true;
                    this.renderEmojis(this.filteredEmojis, true);

                    panel.querySelectorAll(".emoji-tab").forEach(t => t.classList.remove("active"));
                    tab.classList.add("active");
                }
            });

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) {
                    panel.classList.remove("show");
                }
            });
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
                console.log('Gửi phản hồi thành công:', emoji);
            } catch (err) {
                console.error('Gửi phản hồi thất bại:', err);
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

        async reactStory(userId, fbDtsg, storyId, reaction) {
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

                const response = await fetch("https://www.facebook.com/api/graphql/", {
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
                if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(`Thử lại phản hồi... Lần ${this.retryCount}`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryCount));
                    return this.reactStory(userId, fbDtsg, storyId, reaction);
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
            window.removeEventListener('popstate', this.handlePopState);
            window.removeEventListener('hashchange', this.handleHashChange);
            clearTimeout(this.debounceTimeout);
            this.isInitialized = false;
        }
    }

    const reactor = new StoryReactor();
    window.StoryReactorInstance = reactor;
    reactor.init();

    const cleanup = () => {
        if (window.StoryReactorInstance) {
            window.StoryReactorInstance.destroy();
            window.StoryReactorInstance = null;
        }
    };

    window.addEventListener('beforeunload', cleanup);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            reactor.handleNavigation();
        });
    }
})();