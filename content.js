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
	let lastUrl = "";

	const isStoryUrl = () => {
		return window.location.hostname === "www.facebook.com" &&
			window.location.pathname.includes("/stories");
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
			await ContentInjector.injectScript("js/story.js", {
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

	handleLocationChange();
	setInterval(handleLocationChange, 750);
})();
