/**
 * Rewire content registry — load after presets.js
 */
(function () {
  if (!window.RewirePresets || !window.RewirePresets.TRIGGER_PRESETS) {
    console.error("[Rewire] No presets loaded. Include content/presets.js before content/index.js.");
  }

  window.RewireContent = {
    presets: window.RewirePresets,
    TRIGGER_PRESETS: (window.RewirePresets && window.RewirePresets.TRIGGER_PRESETS) || []
  };
})();
