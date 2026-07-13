/**
 * Core module: leadership
 * Register by pushing onto __CHARISMA_MODULES__ (script order = Learn tab order).
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push(
{
      id: "leadership",
      name: "Leadership & Influence",
      short: "Lead & calm",
      badge: "Calm Leader",
      stats: ["calm", "clarity", "rapport"],
      principle: "Leadership charisma makes others feel capable, motivated, and part of something bigger. Handle groups smoothly; navigate conflict without damaging relationships.",
      models: [
        "People follow leaders who make them feel understood and capable.",
        "Including everyone and finding the seam in conversation creates natural leadership.",
        "Conflict: honest, non-blaming language disarms rather than escalates.",
        "Influence works best when they feel it's their idea or in their interest."
      ],
      opportunities: [
        "Leading meetings or projects without formal authority",
        "Disagreements or tense conversations at work",
        "Presenting ideas for buy-in",
        "Group social or professional settings",
        "Giving feedback or difficult conversations",
        "Moments of awkwardness or exclusion in a group"
      ],
      drills: [
        { title: "Group Role Notice", time: "in groups", text: "Who is leading? Who is left out? What small move could include someone?" },
        { title: "Conflict Temperature", time: "on tension", text: "Label: 'Potential conflict moment. Stay curious.'" }
      ],
      challenges: [
        { level: 1, title: "Include Move", text: "In one group interaction, bring someone in (direct question, reference what they said)." },
        { level: 2, title: "De-escalation Lite", text: "If tension arises, respond with one honest but non-blaming sentence." },
        { level: 2, title: "Influence Without Push", text: "State your opinion as a question or possibility first: 'What if we…?' or 'One thing I've been wondering…'" },
        { level: 3, title: "Humor in Tension", text: "Use one light, appropriate humorous comment to ease tension if it feels natural." }
      ],
      reflections: [
        "Did any leadership or influence moments appear today?",
        "How did I handle (or notice) conflict or group dynamics?"
      ],
      resources: [],
      quizzes: [
        {
          q: "Influence works best when:",
          choices: ["You push hardest and longest", "The other person feels understood and the idea serves them", "You use formal authority only", "You avoid disagreement entirely"],
          answer: 1,
          why: "People buy into ideas when they feel capable and that it's in their interest."
        },
        {
          q: "Best first response when you sense rising conflict:",
          choices: ["Win the argument quickly", "Label internally: stay curious; slow down", "Send a long email after", "Match their defensive tone"],
          answer: 1,
          why: "Awareness + calm curiosity prevents escalation before techniques even start."
        },
        {
          q: "A low-authority leadership move in a meeting:",
          choices: ["Dominate airtime", "Include a quieter person or bridge two ideas", "Stay completely silent", "Critique without offering a path"],
          answer: 1,
          why: "Including others and finding seams creates natural leadership without rank."
        }
      ]
    }
  );
})();
