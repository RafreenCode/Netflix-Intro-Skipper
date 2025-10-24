/**
 * @fileoverview Background script for Netflix Intro Skipper Chrome Extension
 * @version 1.0.0
 * @license MIT
 */

/**
 * Listens for extension installation and initialization
 * Logs when the extension is successfully installed
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log('Netflix Intro Skipper extension installed');
});

/**
 * Handles clicks on the extension icon in the browser toolbar
 * Sends a message to the content script to get the current status
 * @param {chrome.tabs.Tab} tab - The current active tab
 */
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
        if (response) {
            console.log('Extension status:', response);
        }
    });
});