/**
 * Abide — realignment assertion ladder
 */
(function () {
  var ASSERTIONS = [
    {
      id: "belong-abide-move",
      text: "I belong to the Father, abide in the Son, move by the Spirit.",
      tier: "root"
    },
    {
      id: "breathe",
      text: "I breathe in His presence.",
      tier: "root"
    },
    {
      id: "ask-seek-knock",
      text: "I ask, seek, and knock; I listen, obey, and trust Him, accepting what unfolds.",
      tier: "root"
    },
    {
      id: "prefer-serve-sow",
      text: "I prefer truth, grace, wisdom, and serving and sowing.",
      tier: "root"
    },
    {
      id: "relentless-love",
      text: "I move with faith in His relentless love.",
      tier: "root"
    },
    {
      id: "take-a-step",
      text: "I can take a step.",
      tier: "capacity"
    },
    {
      id: "ask-for-help",
      text: "I can ask for help.",
      tier: "capacity"
    },
    {
      id: "rest-in-god",
      text: "I can rest in God.",
      tier: "capacity"
    },
    {
      id: "receive-love",
      text: "I can receive His Love.",
      tier: "capacity"
    },
    {
      id: "bear-all",
      text: "I can bear all things in Christ.",
      tier: "capacity"
    },
    {
      id: "do-all",
      text: "I can do all things in Christ.",
      tier: "capacity"
    },
    {
      id: "already-home",
      text: "I am already Home in Christ.",
      tier: "capacity"
    },
    {
      id: "already-enough",
      text: "I am already enough in Christ.",
      tier: "capacity"
    },
    {
      id: "face-fears",
      text: "I can face my fears with God.",
      tier: "capacity"
    },
    {
      id: "face-mess",
      text: "I can face any mess with God.",
      tier: "capacity"
    },
    {
      id: "hope-with-god",
      text: "I can hope with God.",
      tier: "capacity"
    },
    {
      id: "envision-dream-with-god",
      text: "I can envision and dream with God.",
      tier: "capacity"
    },
    {
      id: "walk-with-god",
      text: "I can walk with God.",
      tier: "capacity"
    },
    {
      id: "god-always-with",
      text: "I am always with God.",
      tier: "capacity"
    },
    {
      id: "who-god-says",
      text: "Who does God say I am?",
      tier: "identity",
      special: "identity"
    }
  ];

  var FEEL_PRESETS = [
    "anxious",
    "ashamed",
    "afraid",
    "numb",
    "restless",
    "heavy",
    "lonely",
    "overwhelmed",
    "angry",
    "scattered"
  ];

  var BELIEF_PRESETS = [
    "I am not enough",
    "There isn't enough",
    "I am alone",
    "I am a failure",
    "I am unlovable",
    "I am stuck",
    "I am too late",
    "I have to do this alone"
  ];

  window.AbideAssertions = {
    ASSERTIONS: ASSERTIONS,
    FEEL_PRESETS: FEEL_PRESETS,
    BELIEF_PRESETS: BELIEF_PRESETS,
    count: ASSERTIONS.length
  };
})();
