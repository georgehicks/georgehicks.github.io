/**
 * Core module: presence
 * Register by pushing onto __CHARISMA_MODULES__ (script order = Learn tab order).
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push(
{
      id: "presence",
      name: "Presence & Magnetism",
      short: "Presence",
      badge: "Presence Holder",
      stats: ["presence", "calm"],
      principle: "Presence is felt more than heard. How you occupy space, use body, eyes, and energy determines whether people are drawn to you or subtly look away.",
      models: [
        "People read your comfort with yourself and the situation.",
        "Small posture, gesture, eye contact, and tone shifts change magnetism.",
        "Nervous energy is contagious; calm grounded energy is too.",
        "Powerful in groups, presentations, and when you want attention without force."
      ],
      opportunities: [
        "Walking into a room or joining a group",
        "Presenting or speaking in meetings/pitches",
        "One-on-ones where full attention matters",
        "Situations where you tend to shrink or feel invisible",
        "Conflict or tense moments — calm de-escalates",
        "Commanding attention without raising your voice"
      ],
      drills: [
        { title: "Entrance & Space Check", time: "on entry", text: "Am I taking up normal space or shrinking?" },
        { title: "Energy Read", time: "after", text: "Did my energy feel calm/grounded, scattered, or flat?" }
      ],
      challenges: [
        { level: 1, title: "Grounded Entrance", text: "Before entering your next meeting or social setting, take one conscious breath and intend to occupy space comfortably." },
        { level: 2, title: "Eye Contact + Warmth", text: "In 3 conversations, combine steady (not staring) eye contact with slightly warmer tone or small smile." },
        { level: 2, title: "Presenting Presence", text: "In your next speaking moment, consciously slow movements and breathing for the first 60 seconds." }
      ],
      reflections: [
        "Where did I notice my presence (or lack of it) most clearly?",
        "What small physical or energetic shift made a difference?"
      ],
      resources: [],
      quizzes: [
        {
          q: "Presence is primarily:",
          choices: ["How loud you speak", "How you occupy space and energy — felt more than heard", "How many people you know in the room", "Wearing the right clothes"],
          answer: 1,
          why: "Body, eyes, energy, and comfort level broadcast more than words alone."
        },
        {
          q: "In a tense moment, magnetic presence usually means:",
          choices: ["Matching their intensity and volume", "Calm, grounded energy that de-escalates", "Leaving the room immediately", "Filling silence with jokes nonstop"],
          answer: 1,
          why: "Calm is contagious. Grounded energy de-escalates better than matching heat."
        },
        {
          q: "Before entering a room, a useful micro-practice is:",
          choices: ["Check your phone one more time", "One conscious breath + intention to occupy space comfortably", "Plan a long monologue", "Wait until someone invites you in"],
          answer: 1,
          why: "Grounded entrance sets how others read you in the first seconds."
        }
      ]
    }
  );
})();
