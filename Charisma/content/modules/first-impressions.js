/**
 * Core module: first-impressions
 * Register by pushing onto __CHARISMA_MODULES__ (script order = Learn tab order).
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push(
{
      id: "first-impressions",
      name: "First Impressions",
      short: "First 30s",
      badge: "First Impression Radar",
      stats: ["presence", "rapport"],
      principle: "People decide very quickly how they feel about you based on the emotions you trigger in the first few seconds. Order of emotions matters more than any single technique.",
      models: [
        "First impressions are emotional before they are logical.",
        "Most people accidentally trigger neutral energy without realizing it.",
        "You can reset or upgrade a weak start if you catch it early.",
        "Make the other person feel seen, positive, and slightly elevated."
      ],
      opportunities: [
        "Meeting someone new at work (colleague, client, boss's boss)",
        "Walking into a meeting or event late",
        "Starting a sales call or presentation",
        "Networking events or conferences",
        "Social gatherings with new people",
        "Any situation where someone might be slightly guarded"
      ],
      drills: [
        { title: "The 10-Second Scan", time: "10s × 3+", text: "In any new interaction, note: Did I trigger warmth? Did I make them feel seen? Was there neutral 'I'm fine' energy from me?" },
        { title: "Emotion Detective", time: "instant", text: "After a conversation starts, label the emotion you think the other person is feeling toward you. No judgment — just data." }
      ],
      challenges: [
        { level: 1, title: "Warmth Opener", text: "In your next 3 interactions, deliberately do one small thing to create positive emotion early (specific compliment, warm tone, smile + eye contact)." },
        { level: 2, title: "Reset Practice", text: "If an interaction starts flat or awkward, consciously shift it in the first minute with a better answer or elevating the other person." },
        { level: 2, title: "Pitch First Minute", text: "Before your next meeting or pitch, spend 60 seconds deciding what emotion you want them to feel in the first 30 seconds." }
      ],
      reflections: [
        "What was the clearest first-impression moment I had today?",
        "Did I notice any default habits that create neutral energy?",
        "One tiny improvement for tomorrow?"
      ],
      resources: [
        { title: "6 Habits That Make First Impressions Amazing", url: "https://www.youtube.com/watch?v=fA28iMu0lAc", note: "Simu Liu breakdown — behaviors in action" },
        { title: "Stop Saying \"I'm Fine\"", url: "https://www.youtube.com/watch?v=5xzEgqoSdfQ", note: "Common verbal mistakes and better alternatives" }
      ],
      quizzes: [
        {
          q: "What matters most for a strong first impression?",
          choices: ["Having the perfect witty opener prepared", "The emotions you trigger in the first few seconds", "Listing your credentials quickly", "Staying perfectly neutral and professional"],
          answer: 1,
          why: "People decide emotionally first. Warmth, being seen, and slight elevation beat polished neutrality."
        },
        {
          q: "An interaction starts flat. Best move?",
          choices: ["Apologize for being awkward and move on", "Double down on small talk about the weather", "Consciously reset: warmth, specific observation, elevate them", "Wait for them to fix the energy"],
          answer: 2,
          why: "You can upgrade a weak start early. Active warmth beats hoping the vibe improves itself."
        },
        {
          q: "Most people accidentally create which default energy?",
          choices: ["Intense excitement", "Intimidating confidence", "Neutral / 'I'm fine' energy", "Hostile skepticism"],
          answer: 2,
          why: "Polite neutrality is the common trap — not bad, but not memorable or connecting."
        }
      ]
    }
  );
})();
