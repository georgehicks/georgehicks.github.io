/**
 * Abide — Scripture canon (38)
 * Themes: rest in the Vine; belong / abide / move; sow & work with God.
 *
 * Translation note: ESV-style wording for personal use.
 * Swap `text` fields if you standardize on another version.
 *
 * Schema:
 *   id, ref, text, group (A–G), themes[], assertions[]
 */
(function () {
  var GROUPS = [
    { id: "A", name: "Abide / the Vine", short: "Vine", focus: "Remain in Christ; fruit flows from union." },
    { id: "B", name: "Rest / Presence", short: "Rest", focus: "Stillness, presence, Sabbath rest." },
    { id: "C", name: "Father / Son / Spirit", short: "Trinity", focus: "Belong to the Father, abide in the Son, move by the Spirit." },
    { id: "D", name: "Ask / Seek / Trust", short: "Ask", focus: "Ask, seek, knock; listen, obey, trust; accept what unfolds." },
    { id: "E", name: "Love / Enough / Home", short: "Love", focus: "Relentless love; already enough; already home." },
    { id: "F", name: "Capacity / With-ness", short: "With", focus: "Bear, do, walk — God always with you." },
    { id: "G", name: "Work / Effort / Sow–Reap", short: "Sow", focus: "Serve and sow; plant and water; God gives growth." }
  ];

  var VERSES = [
    // ── A. Abide / the Vine ──────────────────────────────────────────
    {
      id: 1,
      ref: "John 15:4",
      text: "Abide in me, and I in you. As the branch cannot bear fruit by itself, unless it abides in the vine, neither can you, unless you abide in me.",
      group: "A",
      themes: ["abide", "vine", "fruit", "union"],
      assertions: ["belong-abide-move", "breathe"]
    },
    {
      id: 2,
      ref: "John 15:5",
      text: "I am the vine; you are the branches. Whoever abides in me and I in him, he it is that bears much fruit, for apart from me you can do nothing.",
      group: "A",
      themes: ["abide", "vine", "fruit", "dependence"],
      assertions: ["belong-abide-move", "do-all", "bear-all"]
    },
    {
      id: 3,
      ref: "John 15:7",
      text: "If you abide in me, and my words abide in you, ask whatever you wish, and it will be done for you.",
      group: "A",
      themes: ["abide", "ask", "word"],
      assertions: ["ask-seek-knock", "belong-abide-move"]
    },
    {
      id: 4,
      ref: "John 15:9",
      text: "As the Father has loved me, so have I loved you. Abide in my love.",
      group: "A",
      themes: ["abide", "love", "father"],
      assertions: ["receive-love", "relentless-love", "belong-abide-move"]
    },
    {
      id: 5,
      ref: "1 John 2:28",
      text: "And now, little children, abide in him, so that when he appears we may have confidence and not shrink from him in shame at his coming.",
      group: "A",
      themes: ["abide", "confidence", "coming"],
      assertions: ["already-home", "belong-abide-move"]
    },

    // ── B. Rest / Presence ───────────────────────────────────────────
    {
      id: 6,
      ref: "Matthew 11:28–29",
      text: "Come to me, all who labor and are heavy laden, and I will give you rest. Take my yoke upon you, and learn from me, for I am gentle and lowly in heart, and you will find rest for your souls.",
      group: "B",
      themes: ["rest", "yoke", "come"],
      assertions: ["rest-in-god", "receive-love", "breathe"]
    },
    {
      id: 7,
      ref: "Psalm 46:10",
      text: "Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!",
      group: "B",
      themes: ["still", "rest", "know"],
      assertions: ["rest-in-god", "breathe"]
    },
    {
      id: 8,
      ref: "Psalm 62:5",
      text: "For God alone, O my soul, wait in silence, for my hope is from him.",
      group: "B",
      themes: ["wait", "silence", "hope"],
      assertions: ["rest-in-god", "ask-seek-knock"]
    },
    {
      id: 9,
      ref: "Hebrews 4:9–10",
      text: "So then, there remains a Sabbath rest for the people of God, for whoever has entered God's rest has also rested from his works as God did from his.",
      group: "B",
      themes: ["sabbath", "rest", "works"],
      assertions: ["rest-in-god", "already-home"]
    },
    {
      id: 10,
      ref: "Exodus 33:14",
      text: "And he said, \"My presence will go with you, and I will give you rest.\"",
      group: "B",
      themes: ["presence", "rest", "with"],
      assertions: ["god-always-with", "rest-in-god", "breathe"]
    },

    // ── C. Father / Son / Spirit ─────────────────────────────────────
    {
      id: 11,
      ref: "Romans 8:14–16",
      text: "For all who are led by the Spirit of God are sons of God. For you did not receive the spirit of slavery to fall back into fear, but you have received the Spirit of adoption as sons, by whom we cry, \"Abba! Father!\" The Spirit himself bears witness with our spirit that we are children of God.",
      group: "C",
      themes: ["spirit", "adoption", "father", "children"],
      assertions: ["belong-abide-move", "who-god-says", "already-enough"]
    },
    {
      id: 12,
      ref: "Galatians 5:25",
      text: "If we live by the Spirit, let us also keep in step with the Spirit.",
      group: "C",
      themes: ["spirit", "walk", "step"],
      assertions: ["belong-abide-move", "walk-with-god"]
    },
    {
      id: 13,
      ref: "John 14:16–17",
      text: "And I will ask the Father, and he will give you another Helper, to be with you forever, even the Spirit of truth, whom the world cannot receive, because it neither sees him nor knows him. You know him, for he dwells with you and will be in you.",
      group: "C",
      themes: ["spirit", "helper", "truth", "indwelling"],
      assertions: ["belong-abide-move", "god-always-with", "prefer-truth"]
    },
    {
      id: 14,
      ref: "Acts 17:28",
      text: "In him we live and move and have our being.",
      group: "C",
      themes: ["live", "move", "being"],
      assertions: ["belong-abide-move", "breathe", "god-always-with"]
    },
    {
      id: 15,
      ref: "John 14:6",
      text: "Jesus said to him, \"I am the way, and the truth, and the life. No one comes to the Father except through me.\"",
      group: "C",
      themes: ["way", "truth", "life", "father"],
      assertions: ["belong-abide-move", "prefer-truth", "already-home"]
    },

    // ── D. Ask / Seek / Trust ────────────────────────────────────────
    {
      id: 16,
      ref: "Matthew 7:7",
      text: "Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.",
      group: "D",
      themes: ["ask", "seek", "knock"],
      assertions: ["ask-seek-knock", "ask-for-help"]
    },
    {
      id: 17,
      ref: "Proverbs 3:5–6",
      text: "Trust in the LORD with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.",
      group: "D",
      themes: ["trust", "paths", "acknowledge"],
      assertions: ["ask-seek-knock", "walk-with-god", "aim-with-god"]
    },
    {
      id: 18,
      ref: "James 1:5",
      text: "If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him.",
      group: "D",
      themes: ["wisdom", "ask", "generosity"],
      assertions: ["ask-seek-knock", "prefer-truth", "ask-for-help"]
    },
    {
      id: 19,
      ref: "John 10:27",
      text: "My sheep hear my voice, and I know them, and they follow me.",
      group: "D",
      themes: ["hear", "follow", "know"],
      assertions: ["ask-seek-knock", "walk-with-god"]
    },
    {
      id: 20,
      ref: "Psalm 37:7",
      text: "Be still before the LORD and wait patiently for him; fret not yourself over the one who prospers in his way, over the man who carries out evil devices!",
      group: "D",
      themes: ["still", "wait", "patience"],
      assertions: ["ask-seek-knock", "rest-in-god"]
    },

    // ── E. Love / Enough / Home ──────────────────────────────────────
    {
      id: 21,
      ref: "Romans 8:38–39",
      text: "For I am sure that neither death nor life, nor angels nor rulers, nor things present nor things to come, nor powers, nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord.",
      group: "E",
      themes: ["love", "secure", "inseparable"],
      assertions: ["relentless-love", "receive-love", "god-always-with"]
    },
    {
      id: 22,
      ref: "1 John 4:16",
      text: "So we have come to know and to believe the love that God has for us. God is love, and whoever abides in love abides in God, and God abides in him.",
      group: "E",
      themes: ["love", "abide", "believe"],
      assertions: ["relentless-love", "receive-love", "belong-abide-move"]
    },
    {
      id: 23,
      ref: "1 John 3:1",
      text: "See what kind of love the Father has given to us, that we should be called children of God; and so we are. The reason why the world does not know us is that it did not know him.",
      group: "E",
      themes: ["love", "children", "identity"],
      assertions: ["who-god-says", "already-enough", "receive-love"]
    },
    {
      id: 24,
      ref: "Zephaniah 3:17",
      text: "The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing.",
      group: "E",
      themes: ["love", "midst", "quiet", "rejoice"],
      assertions: ["receive-love", "rest-in-god", "god-always-with"]
    },
    {
      id: 25,
      ref: "Colossians 2:9–10",
      text: "For in him the whole fullness of deity dwells bodily, and you have been filled in him, who is the head of all rule and authority.",
      group: "E",
      themes: ["fullness", "filled", "enough"],
      assertions: ["already-enough", "already-home", "who-god-says"]
    },

    // ── F. Capacity / With-ness ──────────────────────────────────────
    {
      id: 26,
      ref: "Philippians 4:13",
      text: "I can do all things through him who strengthens me.",
      group: "F",
      themes: ["strength", "can", "christ"],
      assertions: ["do-all", "take-a-step", "bear-all"]
    },
    {
      id: 27,
      ref: "2 Corinthians 12:9",
      text: "But he said to me, \"My grace is sufficient for you, for my power is made perfect in weakness.\" Therefore I will boast all the more gladly of my weaknesses, so that the power of Christ may rest upon me.",
      group: "F",
      themes: ["grace", "sufficient", "weakness", "power"],
      assertions: ["already-enough", "bear-all", "ask-for-help"]
    },
    {
      id: 28,
      ref: "Isaiah 41:10",
      text: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.",
      group: "F",
      themes: ["with", "strengthen", "help", "fear-not"],
      assertions: ["god-always-with", "ask-for-help", "take-a-step"]
    },
    {
      id: 29,
      ref: "Hebrews 13:5",
      text: "Keep your life free from love of money, and be content with what you have, for he has said, \"I will never leave you nor forsake you.\"",
      group: "F",
      themes: ["never-leave", "content", "with"],
      assertions: ["god-always-with", "already-enough", "already-home"]
    },
    {
      id: 30,
      ref: "Galatians 2:20",
      text: "I have been crucified with Christ. It is no longer I who live, but Christ who lives in me. And the life I now live in the flesh I live by faith in the Son of God, who loved me and gave himself for me.",
      group: "F",
      themes: ["christ-in-me", "faith", "love", "identity"],
      assertions: ["already-home", "relentless-love", "who-god-says", "belong-abide-move"]
    },

    // ── G. Work / Effort / Sow–Reap ──────────────────────────────────
    {
      id: 31,
      ref: "Galatians 6:7–9",
      text: "Do not be deceived: God is not mocked, for whatever one sows, that will he also reap. For the one who sows to his own flesh will from the flesh reap corruption, but the one who sows to the Spirit will from the Spirit reap eternal life. And let us not grow weary of doing good, for in due season we will reap, if we do not give up.",
      group: "G",
      themes: ["sow", "reap", "spirit", "perseverance"],
      assertions: ["prefer-serve-sow", "take-a-step", "walk-with-god"]
    },
    {
      id: 32,
      ref: "2 Corinthians 9:6",
      text: "The point is this: whoever sows sparingly will also reap sparingly, and whoever sows bountifully will also reap bountifully.",
      group: "G",
      themes: ["sow", "reap", "generosity"],
      assertions: ["prefer-serve-sow", "relentless-love"]
    },
    {
      id: 33,
      ref: "Colossians 3:23–24",
      text: "Whatever you do, work heartily, as for the Lord and not for men, knowing that from the Lord you will receive the inheritance as your reward. You are serving the Lord Christ.",
      group: "G",
      themes: ["work", "serve", "reward"],
      assertions: ["prefer-serve-sow", "aim-with-god", "walk-with-god"]
    },
    {
      id: 34,
      ref: "1 Corinthians 15:58",
      text: "Therefore, my beloved brothers, be steadfast, immovable, always abounding in the work of the Lord, knowing that in the Lord your labor is not in vain.",
      group: "G",
      themes: ["work", "steadfast", "not-in-vain"],
      assertions: ["prefer-serve-sow", "take-a-step", "do-all"]
    },
    {
      id: 35,
      ref: "1 Corinthians 3:6–7",
      text: "I planted, Apollos watered, but God gave the growth. So neither he who plants nor he who waters is anything, but only God who gives the growth.",
      group: "G",
      themes: ["plant", "water", "growth", "god-gives"],
      assertions: ["prefer-serve-sow", "already-enough", "ask-seek-knock"]
    },
    {
      id: 36,
      ref: "Philippians 2:12–13",
      text: "Therefore, my beloved, as you have always obeyed, so now, not only as in my presence but much more in my absence, work out your own salvation with fear and trembling, for it is God who works in you, both to will and to work for his good pleasure.",
      group: "G",
      themes: ["work-out", "god-works", "both-and"],
      assertions: ["aim-with-god", "take-a-step", "belong-abide-move"]
    },
    {
      id: 37,
      ref: "Hosea 10:12",
      text: "Sow for yourselves righteousness; reap steadfast love; break up your fallow ground, for it is the time to seek the LORD, that he may come and rain righteousness upon you.",
      group: "G",
      themes: ["sow", "reap", "seek", "righteousness"],
      assertions: ["prefer-serve-sow", "ask-seek-knock", "aim-with-god"]
    },
    {
      id: 38,
      ref: "Matthew 25:21",
      text: "His master said to him, \"Well done, good and faithful servant. You have been faithful over a little; I will set you over much. Enter into the joy of your master.\"",
      group: "G",
      themes: ["faithful", "servant", "joy"],
      assertions: ["prefer-serve-sow", "take-a-step", "who-god-says"]
    }
  ];

  /** Assertion ids used in the realignment ladder (for verse linking). */
  var ASSERTION_LABELS = {
    "belong-abide-move": "I belong to the Father, abide in the Son, move by the Spirit.",
    "breathe": "I breathe in His presence.",
    "ask-seek-knock": "I ask, seek, and knock; I listen, obey, and trust Him, accepting what unfolds.",
    "prefer-truth": "I prefer truth, grace, wisdom…",
    "prefer-serve-sow": "I prefer truth, grace, wisdom, and serving and sowing.",
    "relentless-love": "I move with faith in His relentless love.",
    "take-a-step": "I can take a step.",
    "ask-for-help": "I can ask for help.",
    "rest-in-god": "I can rest in God.",
    "receive-love": "I can receive His Love.",
    "bear-all": "I can bear all things in Christ.",
    "do-all": "I can do all things in Christ.",
    "already-home": "I am already Home in Christ.",
    "already-enough": "I am already enough in Christ.",
    "aim-with-god": "I can aim with God.",
    "walk-with-god": "I can walk with God.",
    "god-always-with": "God is always with me.",
    "who-god-says": "Who does God say I am?"
  };

  function byGroup(groupId) {
    return VERSES.filter(function (v) { return v.group === groupId; });
  }

  function byId(id) {
    for (var i = 0; i < VERSES.length; i++) {
      if (VERSES[i].id === id) return VERSES[i];
    }
    return null;
  }

  function byAssertion(assertionId) {
    return VERSES.filter(function (v) {
      return v.assertions && v.assertions.indexOf(assertionId) !== -1;
    });
  }

  function groupMeta(groupId) {
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].id === groupId) return GROUPS[i];
    }
    return null;
  }

  window.AbideVerses = {
    GROUPS: GROUPS,
    VERSES: VERSES,
    ASSERTION_LABELS: ASSERTION_LABELS,
    byGroup: byGroup,
    byId: byId,
    byAssertion: byAssertion,
    groupMeta: groupMeta,
    count: VERSES.length
  };
})();
