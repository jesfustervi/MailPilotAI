/**
 * BACKGROUND SERVICE WORKER
 */

// 1. Initial config when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log("🚀 MailMind: Extension installed and ready.");

    // Configure that clicking the extension icon opens the SidePanel
    chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error("Error configuring SidePanel:", error));
});

// 2. Listen for messages from other scripts (like zoho-adapter.ts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Action to open the SidePanel from the button injected in Zoho
    if (message.action === "OPEN_PANEL") {
        if (sender.tab?.windowId) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId });
            sendResponse({ status: "Opening SidePanel" });
        }
    }

    // Here you could add logic to save Supabase session data
    if (message.action === "AUTH_SUCCESS") {
        console.log("User authenticated successfully.");
    }

    return true; // Keep the communication channel open for asynchronous responses
});

// 3. Global error handling
self.addEventListener('unhandledrejection', (event) => {
    console.error("❌ Unhandled error in Background Script:", event.reason);
});