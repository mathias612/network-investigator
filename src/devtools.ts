console.log("[Browser Investigator] DevTools script loading...");

// Immediate panel creation - no delays or waiting
// Creating the panel as early as possible can help with positioning
(function () {
  "use strict";

  // Create the panel with minimal delay
  chrome.devtools.panels.create(
    "Network Investigator",
    "network-icon.svg",
    "sidePanel.html",
    function (panel) {
      console.log(
        "[Network Investigator] DevTools panel created successfully",
        panel,
      );

      if (panel) {
        // Panel event listeners
        panel.onShown.addListener(function () {
          console.log("[Network Investigator] Panel shown");
        });

        panel.onHidden.addListener(function () {
          console.log("[Network Investigator] Panel hidden");
        });
      }
    },
  );
})();
