/**
 * Core module: confidence
 * Register by pushing onto __CHARISMA_MODULES__ (script order = Learn tab order).
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push(
{
      id: "confidence",
      name: "Confidence",
      short: "Steady",
      badge: "Steady Under Pressure",
      stats: ["presence", "calm"],
      principle: "Confidence is not a fixed trait. It is a state you can access through mental and physical practices — especially in uncertainty. Nerves and confidence can coexist.",
      models: [
        "The goal is not zero nerves — it is acting effectively alongside them.",
        "Body signals shift your brain: posture, breathing, movement.",
        "Simple go-to behaviors beat trying to be perfect.",
        "Notice self-doubt without letting it control your next action."
      ],
      opportunities: [
        "Walking into a room where you don't know many people",
        "Speaking up in a meeting with senior people",
        "Handling unexpected questions or pushback",
        "Presenting or pitching ideas",
        "Social situations where you feel out of place",
        "Before difficult conversations"
      ],
      drills: [
        { title: "Nerves + Action", time: "instant", text: "When nerves show up, label: 'Nerves are here. I can still do the next small action.'" },
        { title: "Body Check", time: "10s", text: "Quick scan: Am I shrinking? Shoulders, breathing, eye contact. Just notice." }
      ],
      challenges: [
        { level: 1, title: "2-Minute State Shift", text: "Before any mildly stressful interaction, do one quick physical or breathing reset." },
        { level: 2, title: "Speak Up Micro", text: "In one meeting or conversation today, say one thing you would normally hold back." },
        { level: 2, title: "Awkwardness Antidote", text: "When you feel socially awkward, do one small confident behavior: more space, slower breath, warmer tone." }
      ],
      reflections: [
        "Where was the biggest gap between how I wanted to show up and how I did?",
        "What small action helped (or could have)?"
      ],
      resources: [],
      quizzes: [
        {
          q: "The charismatic approach to nervousness is:",
          choices: ["Eliminate all anxiety before acting", "Hide nerves completely so no one notices", "Act effectively alongside nerves", "Avoid situations that cause nerves"],
          answer: 2,
          why: "Nerves and confidence coexist. Label the nerves, then take the next small action."
        },
        {
          q: "You're about to speak in a senior meeting and feel doubt. Best micro-move?",
          choices: ["Wait until you're 100% sure", "Shrink and speak softly to seem humble", "Body reset + one clear contribution", "Over-explain to cover insecurity"],
          answer: 2,
          why: "A physical reset plus one simple go-to behavior beats perfectionism or over-talking."
        },
        {
          q: "Why do body/posture shifts help confidence?",
          choices: ["They trick others only, not you", "Your body sends signals to your brain and to others", "They replace the need for preparation", "They only work for extroverts"],
          answer: 1,
          why: "Outer game (posture, breath, voice) and inner game (reframing) both matter."
        }
      ]
    }
  );
})();
