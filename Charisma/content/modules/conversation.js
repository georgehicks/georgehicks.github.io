/**
 * Core module: conversation
 * Register by pushing onto __CHARISMA_MODULES__ (script order = Learn tab order).
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push(
{
      id: "conversation",
      name: "Expert Conversation",
      short: "Small talk",
      badge: "Conversation Navigator",
      stats: ["rapport", "clarity", "humor"],
      principle: "Good conversation creates safety and momentum so the other person wants to keep talking. Small talk is the on-ramp, not the destination. Make them feel good — don't perform.",
      models: [
        "Awkward silences often come from treating conversation as a performance.",
        "Simple bridges ('that reminds me…') move topics without force.",
        "Curiosity is less tiring than trying to be interesting.",
        "You can deepen from surface-level without being intrusive."
      ],
      opportunities: [
        "Small talk at the start of meetings or with new colleagues",
        "One-on-one catch-ups or coffee chats",
        "Group conversations — include quieter people",
        "After presentations or sales calls",
        "When conversation stays superficial and you want connection",
        "Situations where you previously felt awkward"
      ],
      drills: [
        { title: "Conversation Temperature Check", time: "30–60s", text: "Is this surface-level and boring, or is there spark/momentum? Just observe." },
        { title: "Bridge Spotting", time: "during talk", text: "Listen for natural bridges — shared context, emotion in their voice. Notice when you could use one." }
      ],
      challenges: [
        { level: 1, title: "Grease the Wheels", text: "In your next 3 small-talk situations, open with a specific genuine observation or light compliment instead of default 'How are you?'" },
        { level: 2, title: "Bridge Practice", text: "Use one 'that reminds me of…' or similar transition to move slightly deeper or more interesting." },
        { level: 2, title: "Include Someone", text: "In a group or meeting, bring a quieter person in with a simple question or observation." },
        { level: 3, title: "Conflict Lite", text: "If there's tension, stay curious instead of defensive for 30 seconds." }
      ],
      reflections: [
        "What small talk felt most awkward or flat today? Why?",
        "Did I create momentum that wouldn't have happened otherwise?",
        "One bridge or opener that worked?"
      ],
      resources: [
        { title: "How to Make Small Talk People Actually Enjoy", url: "https://www.youtube.com/watch?v=VTOO_9_ECA8", note: "11.5M+ views — highly practical" },
        { title: "How To Make Small Talk Fun", url: "https://www.youtube.com/watch?v=kFsgTa17Xwo", note: "Kanye & Kimmel breakdown" }
      ],
      quizzes: [
        {
          q: "What's the best mental model for small talk?",
          choices: ["A performance where you must be interesting", "A collaborative game that makes the other person feel good", "A test of who has more witty material", "Something to rush past to get to 'real' topics"],
          answer: 1,
          why: "Treat it as collaborative. Focus on their comfort and interest — momentum follows."
        },
        {
          q: "Conversation feels stuck. Strong move?",
          choices: ["Ask another generic 'How was your weekend?'", "Use a bridge from something they just said", "Talk more about yourself to fill silence", "End the conversation immediately"],
          answer: 1,
          why: "Bridges from their words reduce mental load and create natural flow."
        },
        {
          q: "Most social awkwardness comes from:",
          choices: ["Not knowing enough facts about topics", "Trying too hard to be interesting instead of making them feel good", "Speaking too slowly", "Smiling too much"],
          answer: 1,
          why: "Shift from 'impress' to 'make them feel comfortable and interested.'"
        }
      ]
    }
  );
})();
