/**
 * Abide — Fronts: long-term plans, held before Him
 * Default categories for the weekly deep dive. User customizations are
 * stored separately in localStorage (see app.js LS_FRONTS_KEY) and override
 * this list entirely once the user edits, adds, or removes a front.
 */
(function () {
  var DEFAULT_FRONTS = [
    {
      id: "work",
      label: "Work & Business",
      framing: "Risks, opportunities, decisions, team, customers, excellence of effort."
    },
    {
      id: "finances",
      label: "Finances",
      framing: "Income, expenses, investments, savings, giving. Watch especially for any desire to create a safety net that reduces the need to depend on God."
    },
    {
      id: "relationships",
      label: "Relationships",
      framing: "Family, close friends, colleagues, conflicts, forgiveness, service."
    },
    {
      id: "health",
      label: "Health & Energy",
      framing: "Body, sleep, capacity, rest, limits."
    },
    {
      id: "horizon",
      label: "Future Horizon",
      framing: "What is coming that needs preparation? Scan the landscape honestly, then submit the scan to Jesus rather than using it to quiet fear."
    }
  ];

  window.AbideFronts = {
    DEFAULT_FRONTS: DEFAULT_FRONTS,
    count: DEFAULT_FRONTS.length
  };
})();
