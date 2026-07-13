/**
 * Focus pack: presenting
 * Register by pushing onto __CHARISMA_PACKS__.
 * Optional `parent` id fills quizzes from a core module when this pack is thin.
 */
(function () {
  window.__CHARISMA_PACKS__ = window.__CHARISMA_PACKS__ || [];
  window.__CHARISMA_PACKS__.push(
{
      id: "presenting",
      name: "Presenting & Selling",
      parent: "storytelling",
      badge: "First Minute Master",
      stats: ["presence", "story", "rapport"],
      principle: "People buy from people they trust and like. Combine first impressions, presence, and storytelling so the message lands emotionally and logically.",
      models: [
        "First 30–60 seconds set receptivity.",
        "Stories beat bullet points for memory.",
        "Grounded presence builds trust more than sounding perfect.",
        "Make them feel understood and capable > hard push.",
        "You can design the emotional journey in a few minutes."
      ],
      opportunities: [
        "Formal presentations, pitches, demos",
        "Sales or client meetings",
        "Internal buy-in conversations",
        "Interviews or performance reviews",
        "Project updates and idea advocacy",
        "Explaining what you do"
      ],
      drills: [
        { title: "Desired Emotion Scan", time: "1 min before", text: "What emotion in the first 30–60s? Curious, confident in me, excited, reassured?" },
        { title: "Presence Check", time: "30s", text: "Grounded? Space? Calm breathing?" },
        { title: "Story Opportunity Radar", time: "prep", text: "Is there a short story better than facts alone?" }
      ],
      challenges: [
        { level: 1, title: "First 60 Seconds Intention", text: "Before next meeting/presentation, 60s on how you'll open (emotion + one move)." },
        { level: 1, title: "One Story Upgrade", text: "Replace one bullet with a 20–40s story or example." },
        { level: 2, title: "Presence Reset", text: "If speeding up or shrinking, slow down and ground for 10–15 seconds." },
        { level: 3, title: "Make Them the Hero", text: "Frame part of the pitch around how it helps them/their team." }
      ],
      quizzes: [
        {
          q: "Before a pitch, highest-leverage 60 seconds is spent on:",
          choices: ["Memorizing every slide number", "Desired emotion for the opening + one clear intention", "Checking email", "Adding more data slides"],
          answer: 1,
          why: "Emotional opening and presence intention shape receptivity for everything after."
        },
        {
          q: "In selling/idea-pitching, usually better than hard push:",
          choices: ["Making them feel understood and capable", "Talking without pause", "Avoiding their concerns", "Listing features only"],
          answer: 0,
          why: "Trust + feeling capable beats pressure. They should feel the idea serves them."
        }
      ]
    }
  );
})();
