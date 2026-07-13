/**
 * Focus pack: meetings
 * Register by pushing onto __CHARISMA_PACKS__.
 * Optional `parent` id fills quizzes from a core module when this pack is thin.
 */
(function () {
  window.__CHARISMA_PACKS__ = window.__CHARISMA_PACKS__ || [];
  window.__CHARISMA_PACKS__.push(
{
      id: "meetings",
      name: "Work Meetings",
      parent: "leadership",
      badge: "Meeting Influencer",
      stats: ["presence", "clarity", "calm", "rapport"],
      principle: "Meetings are high-leverage. Quality of presence + quality of contribution beats quantity of talking. Read and gently steer group energy.",
      models: [
        "First 1–2 minutes set how others perceive you.",
        "Influence without seniority: questions, inclusion, bridging ideas.",
        "Awkwardness drops with calm energy + clear respectful communication.",
        "Meetings practice many skills at once."
      ],
      opportunities: [
        "Walking in / joining the video call",
        "First 60–90s small-talk window",
        "Giving updates",
        "Silence after a hard question",
        "Someone dominating / others quiet",
        "Tension or disagreement",
        "Action items at the end"
      ],
      drills: [
        { title: "Entry & Presence Scan", time: "30–60s", text: "Energy/body: grounded, rushed, shrinking? Any warmth in first minute?" },
        { title: "Contribution Quality", time: "after speaking", text: "Clear point? Easy to engage? Story/example/bridge?" },
        { title: "Group Energy Read", time: "throughout", text: "Engaged vs checked out? Tension? Anyone left out?" }
      ],
      challenges: [
        { level: 1, title: "Strong Entry", text: "First 60 seconds: warm greeting, posture, calm energy, or specific opener." },
        { level: 1, title: "Clear Contribution", text: "One contribution with clear point + short example or story." },
        { level: 2, title: "Bridge or Transition", text: "'Building on what X said…' or 'One thing this makes me think…'" },
        { level: 3, title: "Steer Gently", text: "Include others, clarify next steps, or summarize helpfully." }
      ],
      quizzes: [
        {
          q: "Best signal of strong meeting charisma:",
          choices: ["Speaking the most", "Quality presence + clear contributions", "Always agreeing with the loudest person", "Multitasking on email"],
          answer: 1,
          why: "Presence and contribution quality build reputation more than airtime volume."
        },
        {
          q: "Someone is quiet who might have useful input. Charismatic move:",
          choices: ["Ignore and move on", "Bring them in with a simple relevant question", "Call them out for not talking", "End the meeting"],
          answer: 1,
          why: "Include moves create leadership and better group outcomes without authority."
        }
      ]
    }
  );
})();
