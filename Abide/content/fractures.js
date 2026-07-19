/**
 * Abide — soul fracture categories (double-mindedness)
 */
(function () {
  var FRACTURES = [
    {
      id: "unforgiveness",
      label: "Unforgiveness",
      framing: "Unforgiveness keeps a debt open and ties your soul to the offense.",
      prompt: "Is there someone you're holding something against — even quietly?",
      assertionId: "relentless-love"
    },
    {
      id: "worry",
      label: "Worry",
      framing: "Worry rehearses a future God hasn't handed you yet.",
      prompt: "What are you carrying right now that isn't today's to carry?",
      assertionId: "rest-in-god"
    },
    {
      id: "doubt",
      label: "Doubt",
      framing: "Doubt asks with one hand and holds back with the other — double-minded, unstable in all its ways.",
      prompt: "Where are you asking but not trusting?",
      assertionId: "ask-seek-knock"
    },
    {
      id: "fear",
      label: "Fear",
      framing: "Fear narrates a story where you face it alone.",
      prompt: "Name what you're afraid of. Say it plainly.",
      assertionId: "face-fears"
    },
    {
      id: "shame",
      label: "Shame",
      framing: "Shame says hide — that you, not just what you did, are the problem.",
      prompt: "What are you tempted to hide, even from God?",
      assertionId: "already-enough"
    },
    {
      id: "despair",
      label: "Despair",
      framing: "Despair has quietly stopped believing anything can be good again.",
      prompt: "Where have you given up hoping?",
      assertionId: "hope-with-god"
    },
    {
      id: "pride",
      label: "Pride",
      framing: "Pride says you don't need anyone — not even God.",
      prompt: "What are you carrying alone that you haven't asked for help with?",
      assertionId: "ask-for-help"
    },
    {
      id: "divided-loyalty",
      label: "Divided loyalty",
      framing: "A house divided cannot stand — serving two masters splits the soul in two.",
      prompt: "Where are you trying to please both God and something else?",
      assertionId: "belong-abide-move"
    }
  ];

  window.AbideFractures = {
    FRACTURES: FRACTURES,
    count: FRACTURES.length
  };
})();
