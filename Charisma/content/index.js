/**
 * Content registry — load after all module/pack scripts.
 *
 * To add content:
 *   1. Create content/modules/<id>.js  OR  content/packs/<id>.js
 *   2. Push one object (see existing files for schema) onto
 *      __CHARISMA_MODULES__ or __CHARISMA_PACKS__
 *   3. Add the <script src="..."> in index.html (before content/index.js)
 *   4. Optionally add a badge in content/badges.js
 *   5. Add the path to ASSETS in sw.js for offline cache
 *
 * Module schema:
 *   id, name, short, badge, stats[], principle, models[], opportunities[],
 *   drills[{title,time,text}], challenges[{level,title,text}],
 *   reflections[], resources[{title,url,note}],
 *   quizzes[{q, choices, answer /* 0-based */, why}]
 *
 * Pack schema: same + parent (core module id), optional avoid[]
 */
(function () {
  var modules = window.__CHARISMA_MODULES__ || [];
  var packs = window.__CHARISMA_PACKS__ || [];
  var stats = window.__CHARISMA_STATS__ || [];
  var badges = window.__CHARISMA_BADGES__ || [];

  if (!modules.length) {
    console.error("[Charisma] No modules loaded. Check content/modules script tags.");
  }

  window.CharismaContent = {
    STATS: stats,
    MODULES: modules,
    PACKS: packs,
    BADGE_DEFS: badges
  };
})();
