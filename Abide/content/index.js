/**
 * Abide content registry — load after verses.js and assertions.js
 */
(function () {
  if (!window.AbideVerses || !window.AbideVerses.VERSES || !window.AbideVerses.VERSES.length) {
    console.error("[Abide] No verses loaded. Include content/verses.js before content/index.js.");
  }
  if (!window.AbideAssertions || !window.AbideAssertions.ASSERTIONS) {
    console.error("[Abide] No assertions loaded. Include content/assertions.js before content/index.js.");
  }
  if (!window.AbideFractures || !window.AbideFractures.FRACTURES) {
    console.error("[Abide] No fractures loaded. Include content/fractures.js before content/index.js.");
  }

  window.AbideContent = {
    verses: window.AbideVerses,
    VERSES: (window.AbideVerses && window.AbideVerses.VERSES) || [],
    GROUPS: (window.AbideVerses && window.AbideVerses.GROUPS) || [],
    ASSERTION_LABELS: (window.AbideVerses && window.AbideVerses.ASSERTION_LABELS) || {},
    assertions: window.AbideAssertions,
    ASSERTIONS: (window.AbideAssertions && window.AbideAssertions.ASSERTIONS) || [],
    FEEL_PRESETS: (window.AbideAssertions && window.AbideAssertions.FEEL_PRESETS) || [],
    BELIEF_PRESETS: (window.AbideAssertions && window.AbideAssertions.BELIEF_PRESETS) || [],
    fractures: window.AbideFractures,
    FRACTURES: (window.AbideFractures && window.AbideFractures.FRACTURES) || []
  };
})();
