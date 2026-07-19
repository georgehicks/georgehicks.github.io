/**
 * Rewire content registry — load after presets.js
 */
(function () {
  if (!window.RewirePresets || !window.RewirePresets.TRIGGER_PRESETS) {
    console.error("[Rewire] No presets loaded. Include content/presets.js before content/index.js.");
  }

  var p = window.RewirePresets || {};
  window.RewireContent = {
    presets: p,
    TRIGGER_PRESETS: p.TRIGGER_PRESETS || [],
    EXAMPLE_TRIGGERS: p.EXAMPLE_TRIGGERS || [],
    EXAMPLE_HABITS: p.EXAMPLE_HABITS || []
  };
})();
