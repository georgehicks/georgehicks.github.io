/**
 * Rewire content registry — load after presets.js
 */
(function () {
  if (!window.RewirePresets || !window.RewirePresets.TRIGGER_TEMPLATES) {
    console.error("[Rewire] No presets loaded. Include content/presets.js before content/index.js.");
  }

  var p = window.RewirePresets || {};
  window.RewireContent = {
    presets: p,
    TEMPLATE_CATEGORIES: p.TEMPLATE_CATEGORIES || [],
    TRIGGER_TEMPLATES: p.TRIGGER_TEMPLATES || [],
    EXAMPLE_HABITS: p.EXAMPLE_HABITS || []
  };
})();
