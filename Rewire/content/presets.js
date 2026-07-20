/**
 * Rewire — trigger template registry + starter habit ideas
 */
(function () {
  var TEMPLATE_CATEGORIES = [
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
    {
      id: "criticized",
      category: "criticism",
      situation: "someone criticizes or corrects me",
      oldReaction: "get defensive, explain myself, or shut down",
      response: "pause one breath, say “thanks for the feedback,” and ask one clarifying question",
      reframe: "Feedback is information about the work — not a verdict on my worth."
    },
    {
      id: "flaw-pointed-out",
      category: "criticism",
      situation: "someone points out a flaw in something I made",
      oldReaction: "rush to defend it or apologize repeatedly",
      response: "say “thank you for looking closely” and ask what they’d change",
      reframe: "A flaw in the work is not a flaw in me."
    },
    {
      id: "bad-review",
      category: "criticism",
      situation: "I get a bad review or rating",
      oldReaction: "spiral, catastrophize, or dismiss it as unfair",
      response: "read it once, note one true thing in it, and set it aside until tomorrow",
      reframe: "One review is one data point, not my whole story."
    },
    {
      id: "corrected-publicly",
      category: "criticism",
      situation: "someone corrects me in front of other people",
      oldReaction: "get flustered, argue back, or shut down publicly",
      response: "say “good catch, thank you” and keep going",
      reframe: "Being wrong in public doesn’t make me small."
    },
    {
      id: "unsolicited-advice",
      category: "criticism",
      situation: "I get advice I didn’t ask for",
      oldReaction: "get defensive or silently resent it",
      response: "say “thanks, I’ll think about that” — and actually decide later, on my own terms",
      reframe: "I can hear advice without being obligated to take it."
    },

    // ── Conflict & Anger ─────────────────────────────────────────────
    {
      id: "someone-upset",
      category: "conflict",
      situation: "someone is upset with me",
      oldReaction: "over-explain, people-please, or freeze",
      response: "listen fully first, reflect what I heard, then respond — without rushing to fix it",
      reframe: "Their emotion can be real without meaning I am unsafe or worthless."
    },
    {
      id: "raised-voice",
      category: "conflict",
      situation: "someone raises their voice at me",
      oldReaction: "raise mine back, freeze, or cave completely",
      response: "lower my own voice, take one breath, and say “I want to hear you — can we slow down”",
      reframe: "I can stay steady without matching their volume."
    },
    {
      id: "escalating-argument",
      category: "conflict",
      situation: "an argument starts escalating",
      oldReaction: "keep pushing to win or go silent and shut down",
      response: "name it out loud: “this is getting heated — can we pause for a minute”",
      reframe: "Winning the argument isn’t the same as being right."
    },
    {
      id: "unfair-accusation",
      category: "conflict",
      situation: "someone accuses me of something unfair",
      oldReaction: "over-defend, get sarcastic, or go silent",
      response: "ask them to say more about what they saw, before I respond",
      reframe: "I don’t have to accept an accusation to hear it out."
    },
    {
      id: "must-confront",
      category: "conflict",
      situation: "I need to confront someone about something they did",
      oldReaction: "avoid it for days or blurt it out badly once I’m already upset",
      response: "write down the one thing I want to say, then say it calmly and directly",
      reframe: "A clear, kind confrontation is a form of respect, not an attack."
    },
    {
      id: "disrespected",
      category: "conflict",
      situation: "I feel disrespected or talked down to",
      oldReaction: "shrink, go quiet, or lash out",
      response: "name it plainly: “I want to be spoken to differently” — then wait for the response",
      reframe: "My voice matters even when someone else is loud."
    },

    // ── Time & Interruption ───────────────────────────────────────────
    {
      id: "plans-change",
      category: "time",
      situation: "plans change at the last minute",
      oldReaction: "spiral about control, snap, or go quiet and resentful",
      response: "name the change out loud, ask what is still possible, and pick one next step",
      reframe: "Flexibility is a skill I can practice — not proof that I don’t matter."
    },
    {
      id: "interrupted",
      category: "time",
      situation: "I get interrupted or rushed",
      oldReaction: "snap, trail off, or abandon my point",
      response: "one breath, then: “I want to finish this thought — then I’m with you”",
      reframe: "I can be kind and still hold the floor for a moment."
    },
    {
      id: "running-late",
      category: "time",
      situation: "I’m running late and can’t fix it",
      oldReaction: "spiral, rush recklessly, or beat myself up the whole way",
      response: "text one honest update, then move at a normal pace",
      reframe: "Arriving a few minutes late is recoverable. It isn’t worth trading my safety for."
    },
    {
      id: "unannounced-ask",
      category: "time",
      situation: "someone shows up or asks for my time right now, unannounced",
      oldReaction: "drop everything and say yes, resentfully",
      response: "say “give me two minutes to wrap this up” before I switch",
      reframe: "I can be generous without being available on demand."
    },
    {
      id: "open-ended-wait",
      category: "time",
      situation: "I’m waiting and don’t know how long it will take",
      oldReaction: "check obsessively, spiral, or numb out on my phone",
      response: "pick one small task to do while I wait, and check in on a timer instead of constantly",
      reframe: "Waiting is a season, not a verdict on how things will turn out."
    },

    // ── Performance & Mistakes ─────────────────────────────────────────
    {
      id: "mistake",
      category: "performance",
      situation: "I make a mistake",
      oldReaction: "replay it for hours and attack myself",
      response: "name what happened in one sentence, take one repair step, then move on",
      reframe: "A mistake is data. Repair beats rumination."
    },
    {
      id: "being-watched",
      category: "performance",
      situation: "I’m being watched or evaluated while I work",
      oldReaction: "tense up, second-guess every move, or perform instead of working",
      response: "name it internally — “I’m being watched” — take one breath, and keep working at my normal pace",
      reframe: "Being seen doesn’t change whether the work is good."
    },
    {
      id: "dont-know-answer",
      category: "performance",
      situation: "I don’t know the answer to something I’m expected to know",
      oldReaction: "bluff, panic, or over-apologize",
      response: "say “I don’t know — let me find out and get back to you”",
      reframe: "Not knowing yet is a fact, not a failure."
    },
    {
      id: "missed-deadline",
      category: "performance",
      situation: "I miss a deadline",
      oldReaction: "avoid the person, over-explain, or spiral in shame",
      response: "message them directly with a new date, no lengthy excuse",
      reframe: "A missed deadline is a scheduling problem to solve, not proof I’m unreliable."
    },
    {
      id: "didnt-turn-out",
      category: "performance",
      situation: "something I made doesn’t turn out the way I hoped",
      oldReaction: "trash it, hide it, or decide I’m just not good at this",
      response: "name one specific thing that worked and one thing to change next time",
      reframe: "Every version teaches me something the last one couldn’t."
    },

    // ── Belonging & Comparison ───────────────────────────────────────
    {
      id: "left-out",
      category: "belonging",
      situation: "I’m left out of something others were invited to",
      oldReaction: "spiral about what’s wrong with me, or pretend I don’t care",
      response: "let myself feel it for a minute, then reach out to someone I do want to connect with",
      reframe: "Being left out of one thing doesn’t erase where I do belong."
    },
    {
      id: "compared",
      category: "belonging",
      situation: "I get compared to someone else",
      oldReaction: "compete, dismiss them, or shrink",
      response: "notice the comparison, name one thing that’s actually true about my own path, and let the rest go",
      reframe: "Their timeline was never mine to keep."
    },
    {
      id: "no-response",
      category: "belonging",
      situation: "no one responds to something I shared",
      oldReaction: "spiral, delete it, or decide it wasn’t worth sharing",
      response: "let it sit for a day before deciding what it means, if anything",
      reframe: "Silence usually says more about other people’s bandwidth than my worth."
    },
    {
      id: "feel-outsider",
      category: "belonging",
      situation: "I walk into a room and feel like an outsider",
      oldReaction: "shrink to the wall or perform to be liked",
      response: "find one person to make real eye contact with and ask a real question",
      reframe: "I don’t have to earn a place I already have a right to."
    },
    {
      id: "someone-pulling-away",
      category: "belonging",
      situation: "someone I care about seems to be pulling away",
      oldReaction: "chase, over-message, or withdraw first to protect myself",
      response: "name it gently and directly — “I’ve noticed some distance — is everything okay?”",
      reframe: "Naming distance is safer than guessing at it alone."
    },

    // ── Overload & Boundaries ─────────────────────────────────────────
    {
      id: "overloaded",
      category: "overload",
      situation: "I’m asked to take on more than I can carry",
      oldReaction: "say yes automatically and burn later",
      response: "pause and say “let me check my load and get back to you,” then decide once",
      reframe: "A thoughtful no protects the yeses that matter."
    },
    {
      id: "yes-on-the-spot",
      category: "overload",
      situation: "I’m asked to say yes on the spot",
      oldReaction: "agree automatically to avoid the awkwardness",
      response: "say “let me check and get back to you by [time]”",
      reframe: "A pause before yes is not a rejection."
    },
    {
      id: "overcommitted-again",
      category: "overload",
      situation: "I realize I’ve overcommitted again",
      oldReaction: "push through silently and burn out",
      response: "look at the list, pick one thing to renegotiate or drop, and say so today",
      reframe: "Renegotiating early is kinder than failing quietly later."
    },
    {
      id: "not-mine-to-do",
      category: "overload",
      situation: "someone asks me to do something that isn’t mine to do",
      oldReaction: "take it on anyway to keep the peace",
      response: "say “that’s not mine to own, but here’s who might help”",
      reframe: "Redirecting a task isn’t refusing to help."
    },
    {
      id: "saying-no",
      category: "overload",
      situation: "I need to say no to someone I don’t want to disappoint",
      oldReaction: "say yes anyway, or over-explain a no into an essay",
      response: "say the no in one plain sentence, without a wall of justification",
      reframe: "A short, kind no respects both of us more than a long, guilty one."
    },

    // ── Uncertainty & Control ─────────────────────────────────────────
    {
      id: "unclear-expectations",
      category: "uncertainty",
      situation: "I’m not sure what’s expected of me",
      oldReaction: "guess and hope, or spiral trying to read minds",
      response: "ask one direct clarifying question instead of guessing",
      reframe: "Asking for clarity is competence, not weakness."
    },
    {
      id: "decision-out-of-hands",
      category: "uncertainty",
      situation: "a decision that affects me is out of my hands",
      oldReaction: "obsess over outcomes I can’t control",
      response: "name what is actually mine to decide, and put my energy there instead",
      reframe: "Peace doesn’t require control — it requires knowing what’s actually mine."
    },
    {
      id: "waiting-on-results",
      category: "uncertainty",
      situation: "I have to wait for results I can’t influence anymore",
      oldReaction: "replay every choice that led here",
      response: "set the phone down, do one grounding thing, and check back at a set time",
      reframe: "Replaying it now changes nothing except my peace today."
    },
    {
      id: "plan-changed-no-details",
      category: "uncertainty",
      situation: "the plan changes and I don’t have the new details yet",
      oldReaction: "fill in the blanks with worst-case guesses",
      response: "ask one question to get the actual details before reacting",
      reframe: "An unclear plan is unfinished information, not a disaster."
    },
    {
      id: "quick-decision-not-enough-info",
      category: "uncertainty",
      situation: "I’m asked to decide quickly without enough information",
      oldReaction: "freeze, or decide just to make the pressure stop",
      response: "ask for the smallest amount of extra time that’s reasonable, then decide",
      reframe: "A rushed yes I regret costs more than a short, honest pause."
    },

    // ── Self-talk & Shame ─────────────────────────────────────────────
    {
      id: "self-criticism-spiral",
      category: "selftalk",
      situation: "I catch myself spiraling in self-criticism",
      oldReaction: "let it run and pile on more",
      response: "name it out loud — “I’m spiraling” — and ask what I’d say to a friend in this spot",
      reframe: "The voice that’s loudest isn’t automatically the one that’s true."
    },
    {
      id: "comparing-to-should-be",
      category: "selftalk",
      situation: "I compare who I am now to who I think I should be by now",
      oldReaction: "spiral into shame about lost time",
      response: "name one real thing I’ve built or learned since then",
      reframe: "There is no universal schedule I’m behind on."
    },
    {
      id: "old-failure-memory",
      category: "selftalk",
      situation: "an old failure or embarrassment resurfaces in my mind",
      oldReaction: "relive it and wince for the rest of the day",
      response: "notice it, say “that was then,” and name one way I’ve grown since",
      reframe: "The person who did that isn’t fully the person here now."
    },
    {
      id: "falling-behind",
      category: "selftalk",
      situation: "I feel like I’m falling behind everyone else",
      oldReaction: "either spiral or numb out and stop trying",
      response: "name one small next step and take it today, regardless of anyone else’s pace",
      reframe: "A different pace isn’t the same as losing."
    },
    {
      id: "want-to-hide-something",
      category: "selftalk",
      situation: "I want to hide something I’m ashamed of",
      oldReaction: "isolate, deflect, or overcompensate to distract from it",
      response: "tell one safe person the actual thing, in one sentence",
      reframe: "What’s hidden tends to grow; what’s spoken tends to shrink."
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
    TEMPLATE_CATEGORIES: TEMPLATE_CATEGORIES,
    TRIGGER_TEMPLATES: TRIGGER_TEMPLATES,
    EXAMPLE_HABITS: EXAMPLE_HABITS
  };
})();
