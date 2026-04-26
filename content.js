class ContentInjector {
	static injectScript(path, attributes = {}) {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = chrome.runtime.getURL(path);

			Object.entries(attributes).forEach(([key, value]) => {
				script.dataset[key] = value;
			});

			script.onload = () => {
				script.remove();
				resolve();
			};
			script.onerror = () => reject(new Error(`Failed to inject ${path}`));
			(document.head || document.documentElement).appendChild(script);
		});
	}
}

(() => {
	const INJECTED_ATTR = "data-story-reactor-bundle-injected";
	const EMOJI_DATA_ID = "story-reactor-emoji-data";
	const STORAGE_PAGE_SOURCE = "story-reactor-page";
	const STORAGE_CONTENT_SOURCE = "story-reactor-content";
	const STORAGE_KEYS = new Set([
		"story_reactor_favorite_reactions_v1",
		"story_reactor_reaction_combos_v1",
	]);
	let lastUrl = "";

	const isStoryUrl = () => {
		return window.location.hostname === "www.facebook.com" &&
			window.location.pathname.includes("/stories");
	};

	const readStorage = (key) => {
		return new Promise((resolve, reject) => {
			chrome.storage.local.get(key, (result) => {
				const error = chrome.runtime.lastError;
				if (error) {
					reject(new Error(error.message));
					return;
				}

				resolve(result[key]);
			});
		});
	};

	const writeStorage = (key, value) => {
		return new Promise((resolve, reject) => {
			chrome.storage.local.set({ [key]: value }, () => {
				const error = chrome.runtime.lastError;
				if (error) {
					reject(new Error(error.message));
					return;
				}

				resolve();
			});
		});
	};

	const setupStorageBridge = () => {
		if (window.__StoryReactorStorageBridgeInstalled) return;
		window.__StoryReactorStorageBridgeInstalled = true;

		window.addEventListener("message", async (event) => {
			if (event.source !== window) return;

			const message = event.data;
			if (!message || message.source !== STORAGE_PAGE_SOURCE) return;
			if (typeof message.requestId !== "string" || !STORAGE_KEYS.has(message.key)) return;

			const respond = (payload) => {
				window.postMessage({
					source: STORAGE_CONTENT_SOURCE,
					requestId: message.requestId,
					...payload,
				}, window.location.origin);
			};

			try {
				if (message.type === "storage:get") {
					respond({ ok: true, value: await readStorage(message.key) });
					return;
				}

				if (message.type === "storage:set") {
					await writeStorage(message.key, message.value);
					respond({ ok: true });
					return;
				}

				respond({ ok: false, error: "Unsupported storage action" });
			} catch (err) {
				respond({ ok: false, error: err.message || "Storage bridge failed" });
			}
		});
	};

	const injectEmojiData = async () => {
		if (document.getElementById(EMOJI_DATA_ID)) return;

		const response = await fetch(chrome.runtime.getURL("data/emoji.json"), {
			cache: "force-cache",
		});

		if (!response.ok) {
			throw new Error(`Failed to load data/emoji.json: HTTP ${response.status}`);
		}

		const dataElement = document.createElement("script");
		dataElement.id = EMOJI_DATA_ID;
		dataElement.type = "application/json";
		dataElement.textContent = await response.text();
		(document.head || document.documentElement).appendChild(dataElement);
	};

	const injectBundle = async () => {
		if (document.documentElement.hasAttribute(INJECTED_ATTR)) return;

		document.documentElement.setAttribute(INJECTED_ATTR, "true");

		try {
			await ContentInjector.injectScript("js/notification.js");
			await injectEmojiData();
			await ContentInjector.injectScript("story.js", {
				emojiUrl: chrome.runtime.getURL("data/emoji.json"),
				emojiDataId: EMOJI_DATA_ID,
			});
		} catch (err) {
			document.documentElement.removeAttribute(INJECTED_ATTR);
			console.error("Failed to inject Story Reactor bundle:", err);
		}
	};

	const handleLocationChange = () => {
		const currentUrl = window.location.href;
		if (currentUrl === lastUrl) return;

		lastUrl = currentUrl;
		if (isStoryUrl()) {
			injectBundle();
		}
	};

	setupStorageBridge();
	handleLocationChange();
	setInterval(handleLocationChange, 750);
})();
