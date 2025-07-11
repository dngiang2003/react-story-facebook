class StoryReactor {
    constructor() {
        this.emojiList = [];
        this.filteredEmojis = [];
        this.container = null;
        this.searchInput = null;
        this.emojiListElement = null;
        this.categoryCache = new Map();
        this.isInitialized = false;
        this.debounceTimeout = null;
        this.collator = new Intl.Collator(undefined, { sensitivity: 'base' });
        this.retryInterval = null;
    }

    async init() {
        if (this.isInitialized) return;
        try {
            const response = await fetch('https://raw.githubusercontent.com/KimiZK-Dev/Tao-lao/refs/heads/main/emoji.json');
            this.emojiList = await response.json();
            this.filteredEmojis = [...this.emojiList];
            this.buildCategoryCache();
            if (this.isStoryUrl()) {
                this.setupUI();
                this.attachToFooterWithRetry();
            }
            this.isInitialized = true;
        } catch (err) {
            console.error('Failed to fetch emoji data:', err);
        }
    }

    isStoryUrl() {
        const urlPattern = /^https:\/\/www\.facebook\.com\/stories\/\d+\/UzpfSVNDOj[\w=]+\/\?bucket_count=\d+&source=story_tray$/;
        return urlPattern.test(window.location.href);
    }

    buildCategoryCache() {
        this.emojiList.forEach(e => {
            if (!this.categoryCache.has(e.category)) {
                this.categoryCache.set(e.category, []);
            }
            this.categoryCache.get(e.category).push(e);
        });
    }

    setupUI() {
        if (document.querySelector(".react-container")) return;

        this.container = document.createElement("div");
        this.container.className = "react-container";

        const button = document.createElement("button");
        button.className = "btn-react";
        button.innerHTML = `<svg fill="#000000" width="800px" height="800px" viewBox="0 0 32 32" id="Camada_1" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path d="M19.8,26.1h-0.2c-2.4,0-4.8,0-7.2,0c-0.3,0-0.5-0.1-0.6-0.3c-2.5-3.2-5.1-6.3-7.6-9.5C4.1,16.1,4,16,4,15.8   c0-3.1,0-6.1,0-9.2c0-0.1,0-0.2,0.1-0.2h0.1c5.2,6.5,10.4,13,15.5,19.5c0,0,0,0.1,0.1,0.1L19.8,26.1L19.8,26.1z"/><path d="M27.8,16.3c-0.7,0.9-1.5,1.8-2.2,2.8c-0.2,0.2-0.4,0.3-0.6,0.3c-2.4,0-4.8,0-7.1,0c0,0-0.1,0-0.1,0c-0.1,0-0.2-0.1-0.1-0.2   c0,0,0-0.1,0.1-0.1c2.4-3,4.7-5.9,7.1-8.9c1-1.2,2-2.5,2.9-3.7c0-0.1,0.1-0.1,0.2-0.1c0,0,0.1,0,0.1,0c0,0.1,0,0.1,0,0.2   c0,3,0,6.1,0,9.1C28,16,27.9,16.2,27.8,16.3L27.8,16.3z"/></g></svg>`;

        const panel = document.createElement("div");
        panel.className = "emoji-panel";

        this.searchInput = document.createElement("input");
        this.searchInput.placeholder = "Search emoji...";
        this.searchInput.className = "emoji-search";

        const listContainer = document.createElement("div");
        listContainer.className = "emoji-list-container";
        this.emojiListElement = document.createElement("ul");
        this.emojiListElement.className = "emoji-group";
        listContainer.appendChild(this.emojiListElement);

        panel.appendChild(this.searchInput);
        panel.appendChild(listContainer);

        this.container.appendChild(button);
        this.container.appendChild(panel);
        this.addEventListeners(button, panel);
        this.renderEmojis(this.filteredEmojis);
        this.renderCategoryTabs();
    }

    attachToFooterWithRetry() {
        const tryAttach = () => {
            const footer = document.querySelector(".x11lhmoz.x78zum5.x1q0g3np");
            if (footer && !footer.contains(this.container)) {
                footer.appendChild(this.container);
                clearInterval(this.retryInterval);
                this.retryInterval = null;
            }
        };

        // Kiểm tra ngay lập tức
        tryAttach();

        // Nếu chưa tìm thấy footer, thử lại mỗi 500ms (tối đa 10 lần)
        if (!this.retryInterval) {
            let retries = 0;
            this.retryInterval = setInterval(() => {
                tryAttach();
                retries++;
                if (retries >= 10) {
                    clearInterval(this.retryInterval);
                    this.retryInterval = null;
                    console.warn("Could not find stories footer after retries");
                }
            }, 500);
        }

        // Theo dõi thay đổi DOM bằng MutationObserver
        const observer = new MutationObserver(() => {
            tryAttach();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    renderEmojis(list) {
        this.emojiListElement.innerHTML = "";
        const frag = document.createDocumentFragment();
        list.forEach(e => {
            const li = document.createElement("li");
            li.className = "emoji";
            li.textContent = e.value;
            li.title = e.name;
            li.addEventListener("click", () => this.handleReaction(e.value));
            frag.appendChild(li);
        });
        this.emojiListElement.appendChild(frag);
    }

    renderCategoryTabs() {
        const panel = this.container.querySelector(".emoji-panel");
        const old = panel.querySelector(".emoji-category-tabs");
        if (old) old.remove();

        const tabContainer = document.createElement("div");
        tabContainer.className = "emoji-category-tabs";
        const frag = document.createDocumentFragment();

        const allTab = document.createElement("div");
        allTab.className = "emoji-tab active";
        allTab.textContent = "🗂️";
        allTab.title = "All";
        allTab.addEventListener("click", () => {
            this.filteredEmojis = [...this.emojiList];
            this.renderEmojis(this.filteredEmojis);
            tabContainer.querySelectorAll(".emoji-tab").forEach(t => t.classList.remove("active"));
            allTab.classList.add("active");
        });
        frag.appendChild(allTab);

        this.categoryCache.forEach((group, name) => {
            const emoji = group[Math.floor(Math.random() * group.length)];
            const tab = document.createElement("div");
            tab.className = "emoji-tab";
            tab.textContent = emoji.value;
            tab.title = name;
            tab.addEventListener("click", () => {
                this.filteredEmojis = group;
                this.renderEmojis(group);
                tabContainer.querySelectorAll(".emoji-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
            });
            frag.appendChild(tab);
        });

        tabContainer.appendChild(frag);
        panel.appendChild(tabContainer);
    }

    addEventListeners(button, panel) {
        button.addEventListener("click", () => {
            panel.classList.toggle("show");
        });

        this.searchInput.addEventListener("input", e => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                const term = e.target.value.toLowerCase();
                this.filteredEmojis = this.emojiList.filter(em => {
                    const name = em.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const search = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return name.includes(search) || em.value.includes(search);
                });
                this.renderEmojis(this.filteredEmojis);
            }, 150);
        });
    }

    async handleReaction(emoji) {
        try {
            const [userId, fbDtsg, storyId] = await Promise.all([
                this.getUserId(),
                this.getFbDtsg(),
                this.getStoryId()
            ]);
            await this.reactStory(userId, fbDtsg, storyId, emoji);
        } catch {}
    }

    getStoryId() {
        const story = document.querySelector(".xh8yej3.x1n2onr6[data-id]");
        return story?.dataset.id || "";
    }

    getFbDtsg() {
        const match = document.documentElement.innerHTML.match(/"DTSGInitialData",\[],{"token":"(.+?)"/);
        return match?.[1] || "";
    }

    getUserId() {
        const match = document.cookie.match(/c_user=(\d+)/);
        return match?.[1] || "";
    }

    async reactStory(userId, fbDtsg, storyId, reaction) {
        const variables = {
            input: {
                lightweight_reaction_actions: { offsets: [0], reaction },
                story_id: storyId,
                story_reply_type: "LIGHT_WEIGHT",
                actor_id: userId,
                client_mutation_id: Math.floor(Math.random() * 100)
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
            doc_id: "3769885849805751"
        });

        const res = await fetch("https://www.facebook.com/api/graphql/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });
        const result = await res.json();
        if (result.errors) throw new Error();
        return result;
    }
}

const reactor = new StoryReactor();
reactor.init();