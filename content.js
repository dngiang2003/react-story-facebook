class ContentInjector {
	static injectScript(url, type = "") {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			if (type) script.type = type;
			script.src = url;
			script.onload = () => {
				script.remove();
				resolve();
			};
			script.onerror = reject;
			(document.head || document.documentElement).appendChild(script);
		});
	}
}

if (window.location.href.includes("facebook.com/stories")) {
	ContentInjector.injectScript(chrome.runtime.getURL("story.js")).catch(
		(err) => console.error("Failed to inject story.js:", err)
	);
}
