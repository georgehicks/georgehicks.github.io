/**
 * Rewire — common trigger presets + starter examples
 */
(function () {
  var TRIGGER_PRESETS = [
    { id: "criticized", label: "Being criticized or corrected", situation: "someone criticizes or corrects me" },
    { id: "interrupted", label: "Being interrupted or rushed", situation: "I get interrupted or rushed" },
    { id: "ignored", label: "Being ignored or left out", situation: "I feel ignored or left out" },
    { id: "plans-change", label: "Last-minute plan changes", situation: "plans change at the last minute" },
    { id: "someone-upset", label: "Someone being upset with me", situation: "someone is upset with me" },
    { id: "mistake", label: "Making a mistake", situation: "I make a mistake" },
    { id: "disrespected", label: "Feeling disrespected", situation: "I feel disrespected" },
    { id: "compared", label: "Being compared to someone else", situation: "I get compared to someone else" },
    { id: "uncertain-expectations", label: "Uncertainty about expectations", situation: "I'm not sure what's expected of me" },
    { id: "overloaded", label: "Being asked to do more than I can carry", situation: "I'm asked to take on more than I can carry" }
  ];

  /** Full starter cards — situation + old way + new response + reframe */
  var EXAMPLE_TRIGGERS = [
    {
      id: "ex-criticized",
      label: "someone criticizes or corrects me",
      situation: "someone criticizes or corrects me",
      oldReaction: "get defensive, explain myself, or shut down",
      response: "pause one breath, say “thanks for the feedback,” and ask one clarifying question",
      reframe: "Feedback is information about the work — not a verdict on my worth.",
      tags: ["criticized"]
    },
    {
      id: "ex-plans-change",
      label: "plans change at the last minute",
      situation: "plans change at the last minute",
      oldReaction: "spiral about control, snap, or go quiet and resentful",
      response: "name the change out loud, ask what is still possible, and pick one next step",
      reframe: "Flexibility is a skill I can practice — not proof that I don’t matter.",
      tags: ["plans-change"]
    },
    {
      id: "ex-mistake",
      label: "I make a mistake",
      situation: "I make a mistake",
      oldReaction: "replay it for hours and attack myself",
      response: "name what happened in one sentence, take one repair step, then move on",
      reframe: "A mistake is data. Repair beats rumination.",
      tags: ["mistake"]
    },
    {
      id: "ex-overloaded",
      label: "I'm asked to take on more than I can carry",
      situation: "I'm asked to take on more than I can carry",
      oldReaction: "say yes automatically and burn later",
      response: "pause and say “let me check my load and get back to you,” then decide once",
      reframe: "A thoughtful no protects the yeses that matter.",
      tags: ["overloaded"]
    },
    {
      id: "ex-someone-upset",
      label: "someone is upset with me",
      situation: "someone is upset with me",
      oldReaction: "over-explain, people-please, or freeze",
      response: "listen fully first, reflect what I heard, then respond — without rushing to fix it",
      reframe: "Their emotion can be real without meaning I am unsafe or worthless.",
      tags: ["someone-upset"]
    },
    {
      id: "ex-interrupted",
      label: "I get interrupted or rushed",
      situation: "I get interrupted or rushed",
      oldReaction: "snap, trail off, or abandon my point",
      response: "one breath, then: “I want to finish this thought — then I’m with you”",
      reframe: "I can be kind and still hold the floor for a moment.",
      tags: ["interrupted"]
    }
  ];

  var EXAMPLE_HABITS = [
    {
      id: "ex-habit-breath",
      label: "One full breath before I reply",
      cue: "When I feel a surge — message, criticism, or rush"
    },
    {
      id: "ex-habit-check",
      label: "Ask: what do I actually want here?",
      cue: "Before saying yes to a new ask"
    },
    {
      id: "ex-habit-repair",
      label: "One small repair if I slip",
      cue: "When I notice I used the old reaction"
    }
  ];

  window.RewirePresets = {
    TRIGGER_PRESETS: TRIGGER_PRESETS,
    EXAMPLE_TRIGGERS: EXAMPLE_TRIGGERS,
    EXAMPLE_HABITS: EXAMPLE_HABITS
  };
})();
