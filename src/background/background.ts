// Background script for Browser Investigator
// Minimal service worker for extension lifecycle

// Extension installation/startup
// @ts-ignore
chrome.runtime.onStartup?.addListener(() => {
  console.log("[Network Investigator] Extension started");
});

// @ts-ignore
chrome.runtime.onInstalled?.addListener(() => {
  console.log("[Network Investigator] Extension installed");
});

// Removed screenshot functionality to comply with Chrome Web Store requirements

// Keep service worker alive (required for Manifest V3)
console.log("[Network Investigator] Background script loaded");
