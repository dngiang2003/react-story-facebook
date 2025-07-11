chrome.runtime.onInstalled.addListener(() => {
	console.log("React Story Facebook Extension Installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (
		changeInfo.status === "complete" &&
		tab.url?.includes("facebook.com/stories")
	) {
		chrome.scripting
			.executeScript({
				target: { tabId: tabId },
				files: ["story.js"],
			})
			.catch((err) => console.error("Script injection failed:", err));
	}
});
