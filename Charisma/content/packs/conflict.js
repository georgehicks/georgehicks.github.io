/**
 * Focus pack: conflict
 * Register by pushing onto __CHARISMA_PACKS__.
 * Optional `parent` id fills quizzes from a core module when this pack is thin.
 */
(function () {
  window.__CHARISMA_PACKS__ = window.__CHARISMA_PACKS__ || [];
  window.__CHARISMA_PACKS__.push(
{
      id: "conflict",
      name: "Conflict Navigation",
      parent: "leadership",
      badge: "Conflict De-escalator",
      stats: ["calm", "clarity", "rapport"],
      principle: "Most conflict escalates when people feel attacked or unheard. Stay calm, be honest without blame, protect the relationship — de-escalate and collaborate rather than 'win.'",
      models: [
        "Calm presence is a top de-escalation tool.",
        "Non-blaming language: 'I noticed…' / 'One thing I'm wondering…'",
        "Often about respect and being heard, not the surface issue.",
        "You can disagree strongly and still protect the relationship.",
        "At work, how you handle conflict shapes reputation more than being right."
      ],
      opportunities: [
        "Critical feedback or pushback on ideas",
        "Disagreements in meetings",
        "Combative or passive-aggressive moments",
        "Giving hard feedback",
        "Heated Slack/email threads",
        "Early signs: tone change, shorter replies, sighing, silence"
      ],
      drills: [
        { title: "Conflict Temperature", time: "30–60s", text: "Cool / Warm / Hot? Productive disagreement or unproductive conflict?" },
        { title: "Defensive Trigger Scan", time: "during", text: "What triggered me — content, tone, status, feeling misunderstood?" }
      ],
      challenges: [
        { level: 1, title: "Stay Calm First", text: "In next mild tension, slow breathing and speaking pace for 30–60 seconds." },
        { level: 1, title: "Acknowledge First", text: "When someone is frustrated, start with acknowledgment before defending." },
        { level: 2, title: "Non-Blaming Statement", text: "Use one: 'One thing I noticed…' / 'I might be missing something…' / 'Help me understand…'" },
        { level: 3, title: "Repair Attempt", text: "After tension, one small repair later — light humor, appreciation, or clarifying question." }
      ],
      quizzes: [
        {
          q: "Best opening when someone is frustrated with you:",
          choices: ["Explain immediately why they're wrong", "Acknowledge their experience first, then explore", "Change the subject", "Match their intensity so they feel heard"],
          answer: 1,
          why: "Feeling heard reduces heat. Acknowledgment before defense protects the relationship."
        },
        {
          q: "Which line is more charismatic under disagreement?",
          choices: ["'You're not listening to me.'", "'Help me understand how you're seeing this…'", "'We already decided this.'", "'Fine, whatever you want.'"],
          answer: 1,
          why: "Curious, non-blaming language invites collaboration instead of a status fight."
        }
      ]
    }
  );
})();
