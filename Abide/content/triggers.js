/**
 * Abide — Renew: recurring-situation templates, each anchored to an
 * existing assertion instead of a generic reframe.
 */
(function () {
  var TRIGGER_CATEGORIES = [
    { id: "criticism", label: "Criticism & Correction" },
    { id: "conflict", label: "Conflict & Anger" },
    { id: "time", label: "Time & Interruption" },
    { id: "performance", label: "Performance & Mistakes" },
    { id: "belonging", label: "Belonging & Comparison" },
    { id: "overload", label: "Overload & Boundaries" },
    { id: "uncertainty", label: "Uncertainty & Control" },
    { id: "selftalk", label: "Self-talk & Shame" }
  ];

  var TRIGGER_TEMPLATES = [
    // ── Criticism & Correction ──────────────────────────────────────
    { id: "criticized", category: "criticism", situation: "someone criticizes or corrects me", oldReaction: "get defensive, explain myself, or shut down", assertionId: "already-enough" },
    { id: "flaw-pointed-out", category: "criticism", situation: "someone points out a flaw in something I made", oldReaction: "rush to defend it or apologize repeatedly", assertionId: "already-enough" },
    { id: "bad-review", category: "criticism", situation: "I get a bad review or rating", oldReaction: "spiral, catastrophize, or dismiss it as unfair", assertionId: "already-enough" },
    { id: "corrected-publicly", category: "criticism", situation: "someone corrects me in front of other people", oldReaction: "get flustered, argue back, or shut down publicly", assertionId: "already-enough" },
    { id: "unsolicited-advice", category: "criticism", situation: "I get advice I didn’t ask for", oldReaction: "get defensive or silently resent it", assertionId: "walk-with-god" },

    // ── Conflict & Anger ─────────────────────────────────────────────
    { id: "someone-upset", category: "conflict", situation: "someone is upset with me", oldReaction: "over-explain, people-please, or freeze", assertionId: "relentless-love" },
    { id: "raised-voice", category: "conflict", situation: "someone raises their voice at me", oldReaction: "raise mine back, freeze, or cave completely", assertionId: "rest-in-god" },
    { id: "escalating-argument", category: "conflict", situation: "an argument starts escalating", oldReaction: "keep pushing to win or go silent and shut down", assertionId: "rest-in-god" },
    { id: "unfair-accusation", category: "conflict", situation: "someone accuses me of something unfair", oldReaction: "over-defend, get sarcastic, or go silent", assertionId: "already-enough" },
    { id: "must-confront", category: "conflict", situation: "I need to confront someone about something they did", oldReaction: "avoid it for days or blurt it out badly once I’m already upset", assertionId: "take-a-step" },
    { id: "disrespected", category: "conflict", situation: "I feel disrespected or talked down to", oldReaction: "shrink, go quiet, or lash out", assertionId: "already-enough" },

    // ── Time & Interruption ───────────────────────────────────────────
    { id: "plans-change", category: "time", situation: "plans change at the last minute", oldReaction: "spiral about control, snap, or go quiet and resentful", assertionId: "rest-in-god" },
    { id: "interrupted", category: "time", situation: "I get interrupted or rushed", oldReaction: "snap, trail off, or abandon my point", assertionId: "take-a-step" },
    { id: "running-late", category: "time", situation: "I’m running late and can’t fix it", oldReaction: "spiral, rush recklessly, or beat myself up the whole way", assertionId: "rest-in-god" },
    { id: "unannounced-ask", category: "time", situation: "someone shows up or asks for my time right now, unannounced", oldReaction: "drop everything and say yes, resentfully", assertionId: "walk-with-god" },
    { id: "open-ended-wait", category: "time", situation: "I’m waiting and don’t know how long it will take", oldReaction: "check obsessively, spiral, or numb out on my phone", assertionId: "rest-in-god" },

    // ── Performance & Mistakes ─────────────────────────────────────────
    { id: "mistake", category: "performance", situation: "I make a mistake", oldReaction: "replay it for hours and attack myself", assertionId: "already-enough" },
    { id: "being-watched", category: "performance", situation: "I’m being watched or evaluated while I work", oldReaction: "tense up, second-guess every move, or perform instead of working", assertionId: "already-enough" },
    { id: "dont-know-answer", category: "performance", situation: "I don’t know the answer to something I’m expected to know", oldReaction: "bluff, panic, or over-apologize", assertionId: "already-enough" },
    { id: "missed-deadline", category: "performance", situation: "I miss a deadline", oldReaction: "avoid the person, over-explain, or spiral in shame", assertionId: "already-enough" },
    { id: "didnt-turn-out", category: "performance", situation: "something I made doesn’t turn out the way I hoped", oldReaction: "trash it, hide it, or decide I’m just not good at this", assertionId: "do-all" },

    // ── Belonging & Comparison ───────────────────────────────────────
    { id: "left-out", category: "belonging", situation: "I’m left out of something others were invited to", oldReaction: "spiral about what’s wrong with me, or pretend I don’t care", assertionId: "already-home" },
    { id: "compared", category: "belonging", situation: "I get compared to someone else", oldReaction: "compete, dismiss them, or shrink", assertionId: "already-enough" },
    { id: "no-response", category: "belonging", situation: "no one responds to something I shared", oldReaction: "spiral, delete it, or decide it wasn’t worth sharing", assertionId: "receive-love" },
    { id: "feel-outsider", category: "belonging", situation: "I walk into a room and feel like an outsider", oldReaction: "shrink to the wall or perform to be liked", assertionId: "already-home" },
    { id: "someone-pulling-away", category: "belonging", situation: "someone I care about seems to be pulling away", oldReaction: "chase, over-message, or withdraw first to protect myself", assertionId: "god-always-with" },

    // ── Overload & Boundaries ─────────────────────────────────────────
    { id: "overloaded", category: "overload", situation: "I’m asked to take on more than I can carry", oldReaction: "say yes automatically and burn later", assertionId: "ask-for-help" },
    { id: "yes-on-the-spot", category: "overload", situation: "I’m asked to say yes on the spot", oldReaction: "agree automatically to avoid the awkwardness", assertionId: "rest-in-god" },
    { id: "overcommitted-again", category: "overload", situation: "I realize I’ve overcommitted again", oldReaction: "push through silently and burn out", assertionId: "ask-for-help" },
    { id: "not-mine-to-do", category: "overload", situation: "someone asks me to do something that isn’t mine to do", oldReaction: "take it on anyway to keep the peace", assertionId: "walk-with-god" },
    { id: "saying-no", category: "overload", situation: "I need to say no to someone I don’t want to disappoint", oldReaction: "say yes anyway, or over-explain a no into an essay", assertionId: "take-a-step" },

    // ── Uncertainty & Control ─────────────────────────────────────────
    { id: "unclear-expectations", category: "uncertainty", situation: "I’m not sure what’s expected of me", oldReaction: "guess and hope, or spiral trying to read minds", assertionId: "ask-seek-knock" },
    { id: "decision-out-of-hands", category: "uncertainty", situation: "a decision that affects me is out of my hands", oldReaction: "obsess over outcomes I can’t control", assertionId: "rest-in-god" },
    { id: "waiting-on-results", category: "uncertainty", situation: "I have to wait for results I can’t influence anymore", oldReaction: "replay every choice that led here", assertionId: "rest-in-god" },
    { id: "plan-changed-no-details", category: "uncertainty", situation: "the plan changes and I don’t have the new details yet", oldReaction: "fill in the blanks with worst-case guesses", assertionId: "ask-seek-knock" },
    { id: "quick-decision-not-enough-info", category: "uncertainty", situation: "I’m asked to decide quickly without enough information", oldReaction: "freeze, or decide just to make the pressure stop", assertionId: "hope-with-god" },

    // ── Self-talk & Shame ─────────────────────────────────────────────
    { id: "self-criticism-spiral", category: "selftalk", situation: "I catch myself spiraling in self-criticism", oldReaction: "let it run and pile on more", assertionId: "already-enough" },
    { id: "comparing-to-should-be", category: "selftalk", situation: "I compare who I am now to who I think I should be by now", oldReaction: "spiral into shame about lost time", assertionId: "already-enough" },
    { id: "old-failure-memory", category: "selftalk", situation: "an old failure or embarrassment resurfaces in my mind", oldReaction: "relive it and wince for the rest of the day", assertionId: "already-home" },
    { id: "falling-behind", category: "selftalk", situation: "I feel like I’m falling behind everyone else", oldReaction: "either spiral or numb out and stop trying", assertionId: "hope-with-god" },
    { id: "want-to-hide-something", category: "selftalk", situation: "I want to hide something I’m ashamed of", oldReaction: "isolate, deflect, or overcompensate to distract from it", assertionId: "face-mess" }
  ];

  window.AbideTriggers = {
    TRIGGER_CATEGORIES: TRIGGER_CATEGORIES,
    TRIGGER_TEMPLATES: TRIGGER_TEMPLATES,
    count: TRIGGER_TEMPLATES.length
  };
})();
