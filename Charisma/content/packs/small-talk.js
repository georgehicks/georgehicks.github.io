/**
 * Focus pack: small-talk
 * Register by pushing onto __CHARISMA_PACKS__.
 * Optional `parent` id fills quizzes from a core module when this pack is thin.
 */
(function () {
  window.__CHARISMA_PACKS__ = window.__CHARISMA_PACKS__ || [];
  window.__CHARISMA_PACKS__.push(
{
      id: "small-talk",
      name: "Small Talk & Rapport",
      parent: "conversation",
      badge: "Rapport Builder",
      stats: ["rapport", "clarity", "humor"],
      principle: "Small talk isn't the goal — it's the on-ramp. Collaborative game, not performance. Simple openers and bridges cut the mental load of 'what do I say next?'",
      models: [
        "Make them feel good > try to be interesting.",
        "Reliable openers and bridges reduce awkwardness.",
        "Light curiosity beats carrying the whole conversation.",
        "Deepen without being weird or intrusive.",
        "At work, small talk builds trust for later business talk."
      ],
      opportunities: [
        "Start of meetings, calls, 1-on-1s",
        "Hallway / kitchen / elevator moments",
        "Networking and conferences",
        "After presentations",
        "When energy is flat or after awkward silence",
        "Including a quieter person"
      ],
      drills: [
        { title: "Temperature Check", time: "30–60s", text: "Surface and boring, or warmth/momentum? What's their energy?" },
        { title: "Awkwardness Detector", time: "instant", text: "Label internally: 'Awkwardness detected.' Naming reduces its power." }
      ],
      challenges: [
        { level: 1, title: "Better Opener", text: "Replace default 'How are you?' with specific warm observation or genuine curiosity." },
        { level: 1, title: "Active Listening Micro", text: "Truly hear one thing; ask one simple follow-up." },
        { level: 2, title: "Bridge Practice", text: "One natural bridge: 'That reminds me…' / 'Speaking of which…'" },
        { level: 3, title: "Move Slightly Deeper", text: "After good flow, one gentle more-meaningful question without intrusion." }
      ],
      quizzes: [
        {
          q: "High-value moment for small-talk skills:",
          choices: ["Only at parties", "When energy is flat, after silence, or someone is left out", "Only with close friends", "Never at work"],
          answer: 1,
          why: "Flat energy, silence, and exclusion are exactly when simple moves create outsized impact."
        },
        {
          q: "A strong Level-1 practice is:",
          choices: ["Prepare 20 jokes", "Specific warm opener instead of generic 'How are you?'", "Avoid all small talk", "Dominate the topic list"],
          answer: 1,
          why: "Better openers grease the wheels with almost zero extra time."
        }
      ]
    }
  );
})();
