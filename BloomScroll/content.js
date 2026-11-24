/* Manna — content. Hand-written cards plus structure. Public-domain text and Scripture live in text.js; places in places.js.
   Quotes are short and attributed. Nothing here is a quote unless it carries quotation marks and a source; "threads" are my own
   paraphrases and are labelled as such. Jamie Winship's quotes are ones George supplied from his books; nothing else is put in his (or anyone's) mouth. */
(function (root) {
  'use strict';

  // arousal: 3 = lively, 2 = engaged, 1 = reflective, 0 = still. The descent leans from high toward low.
  var CATS = [
    { id: 'scripture',    label: 'Scripture',      arousal: 0 },
    { id: 'wisdom',       label: 'Wisdom',         arousal: 1 },
    { id: 'want',         label: 'What I Want',    arousal: 1 },
    { id: 'relationship', label: 'Relationship',   arousal: 1 },
    { id: 'philosophy',   label: 'Philosophy',     arousal: 1 },
    { id: 'journeys',     label: 'Bible places',   arousal: 1 },
    { id: 'science',      label: 'Discovery',      arousal: 2 },
    { id: 'places',       label: 'Beautiful places', arousal: 2 },
    { id: 'math',         label: 'Mental math',    arousal: 3 },
    { id: 'riddles',      label: 'Riddles',        arousal: 3 },
    { id: 'jokes',        label: 'Dad jokes',      arousal: 3 },
    { id: 'games',        label: 'Play',           arousal: 3 }
  ];

  // What am I reaching for tonight? Tunes the mix (multipliers on category weight) and the landing words.
  var MOODS = [
    { id: 'wired',  label: 'Wired',          tune: { math: 0.5, games: 0.4, scripture: 1.6, wisdom: 1.4, places: 1.4 },
      land: 'Your mind has been running. Let it come down, here, with Him.' },
    { id: 'numb',   label: 'Numb',           tune: { jokes: 1.6, places: 1.6, riddles: 1.3, science: 1.3, scripture: 1.2 },
      land: 'You wanted the day to stop pressing. He is not asking you to feel more than you can. Just be with Him.' },
    { id: 'bored',  label: 'Restless',       tune: { math: 1.5, games: 1.5, riddles: 1.4, science: 1.4 },
      land: 'The restlessness is a hunger. Bring it to Him instead of to the next thing.' },
    { id: 'lonely', label: 'Lonely',         tune: { relationship: 1.8, scripture: 1.5, want: 1.2, jokes: 1.2 },
      land: 'You are not alone in this room. Say His name and stay a while.' },
    { id: 'hungry', label: 'Hungry to grow', tune: { wisdom: 1.8, philosophy: 1.5, science: 1.3, want: 1.4, scripture: 1.3 },
      land: 'You came for wisdom. Here is the One it comes from.' },
    { id: 'heavy',  label: 'Heavy',          tune: { scripture: 2, wisdom: 1.5, want: 1.3, places: 1.3, math: 0.3, games: 0.3 },
      land: 'Bring the weight. He is the One who carries it.' }
  ];

  // For the landing: a verse (key into MannaText.verses) for the night.
  var NIGHT_VERSES = ['Psalm 4:8', 'Psalm 127:2', 'Matthew 11:28-30', 'Psalm 131:1-2', 'Psalm 62:1-2', 'Isaiah 26:3', 'Psalm 23:1-4', 'John 14:27', '1 Peter 5:6-7', 'Zephaniah 3:17'];

  // ---------- short attributed quotes ----------
  var QUOTES = [
    { a: 'C. S. Lewis', w: 'Mere Christianity', t: 'If I find in myself a desire which no experience in this world can satisfy, the most probable explanation is that I was made for another world.' },
    { a: 'C. S. Lewis', w: 'Mere Christianity', t: 'Aim at Heaven and you will get earth thrown in: aim at earth and you will get neither.' },
    { a: 'C. S. Lewis', w: 'Mere Christianity', t: 'The Son of God became a man to enable men to become sons of God.' },
    { a: 'C. S. Lewis', w: 'Mere Christianity', t: 'Pride gets no pleasure out of having something, only out of having more of it than the next man.' },
    { a: 'C. S. Lewis', w: 'The Weight of Glory', t: 'We are half-hearted creatures, fooling about with drink and sex and ambition when infinite joy is offered us…' },
    { a: 'C. S. Lewis', w: 'The Screwtape Letters', t: 'The safest road to Hell is the gradual one — the gentle slope, soft underfoot, without sudden turnings, without milestones, without signposts.' },
    { a: 'C. S. Lewis', w: 'The Four Loves', t: 'Friendship is born at that moment when one person says to another: "What! You too? I thought I was the only one."' },
    { a: 'C. S. Lewis', w: 'Letters to Malcolm', t: 'Joy is the serious business of Heaven.' },
    { a: 'C. S. Lewis', w: 'A Grief Observed', t: 'We are not necessarily doubting that God will do the best for us; we are wondering how painful the best will turn out to be.' },
    { a: 'C. S. Lewis', w: 'God in the Dock', t: 'Of all tyrannies, a tyranny sincerely exercised for the good of its victims may be the most oppressive.' },
    { a: 'Oswald Chambers', w: 'My Utmost for His Highest', t: 'Prayer does not fit us for the greater works; prayer is the greater work.' },
    { a: 'Oswald Chambers', w: 'My Utmost for His Highest', t: 'Faith never knows where it is being led, but it loves and knows the One who is leading.' },
    { a: 'Oswald Chambers', w: 'My Utmost for His Highest', t: 'Beware of anything that competes with your loyalty to Jesus Christ.' },
    { a: 'Augustine', w: 'Confessions', t: 'You have made us for yourself, and our heart is restless until it rests in you.' },
    { a: 'A. W. Tozer', w: 'The Knowledge of the Holy', t: 'What comes into our minds when we think about God is the most important thing about us.' },
    { a: 'Dallas Willard', w: 'The Great Omission', t: 'Grace is not opposed to effort, it is opposed to earning.' },
    { a: 'Corrie ten Boom', w: '', t: 'Worry does not empty tomorrow of its sorrow; it empties today of its strength.' },
    { a: 'Simone Weil', w: 'Letter to Joë Bousquet', t: 'Attention is the rarest and purest form of generosity.' },
    { a: 'Søren Kierkegaard', w: 'The Sickness Unto Death', t: 'The most common form of despair is not being who you are.' },
    { a: 'Henry David Thoreau', w: 'Walden', t: 'The mass of men lead lives of quiet desperation.' },
    { a: 'Seneca', w: 'Letters to Lucilius', t: 'We suffer more often in imagination than in reality.' },
    { a: 'Blaise Pascal', w: 'Pensées', t: 'The heart has its reasons which reason knows nothing of.' },
    { a: 'Brother Lawrence', w: 'The Practice of the Presence of God', t: 'We should establish ourselves in a sense of God\'s presence by continually conversing with Him.' },
    // Jamie Winship — quotes George supplied (Living Fearless; The War of Worldviews: Choosing Connection in a Culture of Separation).
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'Nothing carries more potential for change than individual acts of human kindness.' },
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'People are mostly afraid all the time. In fact, the number one exhortation in Scripture is, ‘Do not be afraid.’ We can only become fearless as we follow God in our true identity and experience in real life the truth of God’s promises to us.' },
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'If you endeavor to love God with your mind, your mind is opened up beyond the rational into the intuitive. The intuitive mind is the place where we pray and dream and hope for things as they ought to be, things yet unseen by the rational mind. If you endeavor to love God with your heart, you engage the emotional intelligence center of your being. Both negative and positive emotions become invitations from God into transformation. If you endeavor to love God with your soul, life becomes nearly unimaginable—the impossible moves into the sphere of possibility. If you endeavor to love God with your body, you will physically change. You will look different. You will move beyond being well into being fit.' },
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'The most common form of human despair is not being who you are.' },
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'All who are obsessed with being secure in life will lose it all—including their lives.' },
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'The journey in discovering your true identity in the kingdom of God is an eternal journey. There is no end to the depths of who God made you to be.' },
    { a: 'Jamie Winship', w: 'Living Fearless', t: 'The obstacle to experiencing God anywhere in life is shame. Shame (feeling unworthy, not good enough) needs to be confessed. You know why? Shame is a false identity… Fear, guilt, and shame are false identities.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: 'All external conflict comes from internal conflict. All internal conflict is sourced in fear. All fear is sourced in a wrong view of reality/God, a wrong view of myself, and a wrong view of others.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: 'I discussed with the men how much they (and the rest of the world) operate in a scarcity mindset, searching for certainty and perfection because we’re afraid of not being good enough or strong enough or smart enough to protect ourselves and our families from the rest of the scarcity mindset predatory world. We’re trapped in repetition compulsion that leads to constant fear and conflict. The only way out is through connection with God first—the presence of Someone, not the absence of something.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: 'The external conflicts in which we regularly find ourselves come as a result of the inner conflict swirling at our heart level. The inner conflict is sourced in a fear that derives from our constant abiding in a false view of God, which leads to a false view of ourselves and a false view of other people, especially strangers. Unless we experience God in a personal, experiential manner, the repetition compulsion cycle cannot be broken, because the overriding separation worldview lie is too deeply entrenched.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: 'The separation worldview hates disorder, complexity, and perplexity. It craves certainty, power, and control. Unfortunately nothing in God’s reality works that way. Everything and everyone is in process, and to deny or resist that process is to not grow.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: 'We cannot give away what we do not have. But listen! What we do have, we will give away. Wounded people will wound other people. Hurt people will hurt other people. Fearful, angry people will produce fear and anger in other people.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: 'Being a Jesus follower is for losers. If anything is clear in the Gospels, it’s that Jesus is for losers. … The truth is, everybody is a loser. It’s just that some know it and others are better at pretending it ain’t so. Everyone has separated and fallen away.' },
    { a: 'Jamie Winship', w: 'The War of Worldviews', t: '1. Caesar separates people—Jesus unites people. 2. Caesar conscripts people—Jesus liberates people. 3. Caesar taxes people—Jesus cancels people’s debts. 4. Caesar creates war—Jesus creates peace.' }
  ];

  // My own paraphrases of well-known threads (clearly labelled in the UI; not quotes).
  var THREADS = [
    { a: 'John Eldredge', w: 'Wild at Heart', t: 'A thread from his teaching: beneath a man\'s restlessness sit three longings — a battle to fight, an adventure to live, and a beauty to rescue. They were put there by God. The danger is not the desire but where we send it.' },
    { a: 'John Eldredge', w: 'Captivating', t: 'A thread from his teaching: a woman\'s deepest longings are to be loved, to have a part in something that matters, and to share her beauty. The Lord is not embarrassed by them — He made them.' },
    { a: 'John Eldredge', w: 'Walking with God', t: 'A thread from his teaching: the Christian life was meant to be a conversation. Ask Him a simple question, then wait with an open hand. He is not far.' },
    { a: 'C. S. Lewis', w: 'Mere Christianity', t: 'A thread from Lewis: the Christian does not become good by trying harder at being good, but by letting Christ live in him — the way a branch bears fruit without straining.' },
    { a: 'Oswald Chambers', w: 'My Utmost for His Highest', t: 'A thread from Chambers: devotion is not a mood but a decision. He keeps returning to the same call — be wholly His, and leave the results with Him.' }
  ];

  // ---------- discovery ----------
  var SCIENCE = [
    { h: 'A light-day away', t: 'Voyager 1, launched in 1977, is reaching a distance of about one light-day from Earth in late 2026. A radio message to it now takes a full day to arrive. It is still working.', ref: 'Psalm 19:1-2' },
    { h: 'Sunlight is old', t: 'The sunlight on your face left the Sun about eight minutes ago. But the energy that made it spent tens of thousands of years working its way out from the Sun\'s core before that.', ref: 'Psalm 19:1-2' },
    { h: 'Three hearts', t: 'An octopus has three hearts and blue blood, and most of its neurons are in its arms. Each arm can taste what it touches.' },
    { h: 'The quiet network', t: 'About nine in ten land plants live in partnership with fungi that thread through their roots, trading minerals for sugar. The forest floor is more of a marketplace than it looks.' },
    { h: 'The dance with a map in it', t: 'A honeybee that finds good flowers goes home and dances. The angle of her waggle shows the direction relative to the Sun; the length of it shows the distance. Her sisters go straight there.' },
    { h: 'Tardigrades', t: 'In 2007 tardigrades — animals about a millimetre long — were exposed to the vacuum of space for ten days. Many came back to life and some laid eggs. Nobody designed them for it, as far as we know.' },
    { h: 'One photon', t: 'Under the right conditions, a rod cell in your eye can respond to a single photon of light. You were made to see in near-darkness.', ref: 'Psalm 139:23-24' },
    { h: 'A hundred thousand', t: 'Your heart beats about a hundred thousand times a day — a few billion times in a long life — and nobody asks it to.', ref: 'Psalm 127:2' },
    { h: 'The washing of the brain', t: 'Research (first in mice, with growing evidence in people) suggests the brain clears waste more actively in deep sleep through a fluid system around its blood vessels. Sleep is not downtime; it is work.', ref: 'Psalm 4:8' },
    { h: 'Evening light', t: 'Bright, blue-rich light late in the evening can delay the body\'s melatonin and push sleep later. This is why Bloom Scroll warms and dims as you scroll.', ref: 'Psalm 127:2' },
    { h: 'Ice floats', t: 'Almost every liquid gets denser as it freezes. Water does the opposite below four degrees Celsius, so ice floats and lakes freeze from the top, leaving life underneath. A small oddity that everything depends on.', ref: 'Genesis 1:1' },
    { h: 'The first generation', t: 'The monarch butterfly that flies south over thousands of miles is not the one that flew north in spring. It is a great-grandchild, finding a forest it has never seen.' },
    { h: 'Pole to pole', t: 'The Arctic tern breeds near the Arctic and spends the other half of the year around Antarctica, a round trip that can be tens of thousands of kilometres. It sees more daylight than any other animal.' },
    { h: 'The resonance', t: 'In 1953 Fred Hoyle argued that carbon — and so life — could only form in stars if the carbon-12 nucleus had an energy level at a particular value. Experiments found it. Hoyle later said the universe looked like "a put-up job".', ref: 'Job 38:4-7' },
    { h: 'The Moon is leaving', t: 'The Moon drifts away from Earth by about 3.8 centimetres a year, about as fast as a fingernail grows. Billions of years ago it filled much more of the sky.' },
    { h: 'GPS and relativity', t: 'GPS satellites carry clocks that run a little fast in orbit (gravity is weaker there) and a little slow (they are moving). Engineers must correct for both — about 38 microseconds a day — or your map would drift by kilometres.' },
    { h: 'Ninety-nine point eight six', t: 'The Sun holds about 99.86 percent of all the mass in the solar system. Everything else — every planet, moon, comet and you — shares the remaining sliver.' },
    { h: 'Crows remember', t: 'Crows can recognise individual human faces and remember who treated them badly, and they can teach other crows. They also use tools, and drop nuts onto roads for cars to crack.' },
    { h: 'The afterglow', t: 'There is a faint glow of microwaves coming from every direction in the sky. It is the afterglow of the early universe, released about 380,000 years after the beginning. Old televisions picked up a little of it as static.', ref: 'Genesis 1:1' },
    { h: 'Fibonacci in a sunflower', t: 'Look into a sunflower\'s head and you will find spirals going both ways, and their counts are usually neighbouring Fibonacci numbers (like 34 and 55). The seeds pack efficiently by a simple rule that repeats.' },
    { h: 'How many stars', t: 'There are hundreds of billions of stars in our galaxy, and the best estimates run to hundreds of billions to a couple of trillion galaxies. David looked up at a few thousand and wrote Psalm 8.', ref: 'Psalm 19:1-2' },
    { h: 'Water on the move', t: 'A single sequoia can lift hundreds of litres of water a day from its roots to its crown, over 90 metres, with no pump — only evaporation and the strange cohesion of water.' }
  ];

  // ---------- philosophy (my own summaries; each ends with where it meets Christ) ----------
  var PHILOSOPHY = [
    { h: 'The cave', t: 'In Plato\'s cave, prisoners watch shadows on a wall and take them for the real world. One is dragged into the sunlight; it hurts. He understands. He goes back to tell the others, and they laugh.', turn: 'What shadows do I mistake for the real? Jesus: "You will know the truth, and the truth will set you free."', ref: 'John 8:31-32' },
    { h: 'The examined life', t: 'At his trial Socrates said an unexamined life is not worth living for a human being. He was not talking about analysing yourself to death, but about not drifting.', turn: 'The scroll is the easiest way to drift. Examine: what did I reach for tonight, and what was I really hungry for?', ref: 'Psalm 139:23-24' },
    { h: 'What is in our power', t: 'Epictetus, a slave who became a teacher, began with one division: some things are up to us — our judgments, our aims, our desires — and some are not: body, reputation, outcomes. Peace comes from keeping that line straight.', turn: 'The Christian keeps the line and adds a Person: do your part, and let go of the rest into hands that can hold it.', ref: '1 Peter 5:6-7' },
    { h: 'Diversion', t: 'Pascal noticed that people would sooner be busy, noisy, entertained, even tormented, than sit quietly with themselves. We hunt for the chase more than the prize, he said, because the chase keeps us from thinking about our condition.', turn: 'What would it be like to sit quietly and not be afraid, because Someone is there?', ref: 'Psalm 46:10' },
    { h: 'A restless heart', t: 'Augustine looked back on a life of chasing fame, pleasure and ideas. His summary: you made us for yourself, and our heart is restless until it rests in you.', turn: 'Restlessness is not the enemy. It is a compass pointed at home.', ref: 'Matthew 11:28-30' },
    { h: 'The chariot', t: 'Plato pictured the soul as a charioteer driving two horses — one noble, one unruly. Wisdom is not killing the unruly horse but driving it well.', turn: 'Paul puts it plainly: be transformed by the renewing of your mind. The Spirit teaches the charioteer.', ref: 'Romans 12:1-2' },
    { h: 'The good life', t: 'Aristotle asked what a human being is for. His answer was eudaimonia — flourishing — which comes from habits of virtue practised over a lifetime, not from a feeling.', turn: 'Fruit is not produced by straining either; it comes from staying in the Vine. The practice is to stay.', ref: 'John 15:4-5' },
    { h: 'Time', t: 'Augustine on time: "What then is time? If no one asks me, I know; if I want to explain it, I do not know." The past is memory, the future is expectation, and the present has no length at all.', turn: 'All we really ever have is now — which is exactly where He says He is.', ref: 'Matthew 6:33-34' },
    { h: 'Stoic dread', t: 'Seneca wrote that we suffer more in imagination than in reality. The Stoics practised imagining the worst on purpose so it lost its power to ambush.', turn: 'The believer goes one step beyond imagining it: He is with me in the valley.', ref: 'Psalm 23:1-4' },
    { h: 'Why anything at all', t: 'Leibniz asked the question that will not go away: why is there something rather than nothing? Every explanation we give is itself something that needs explaining.', turn: 'Scripture starts there on purpose.', ref: 'Genesis 1:1' },
    { h: 'The leap', t: 'Kierkegaard said most of us do not despair loudly; we despair by being someone else for years. The cure is not self-improvement but to rest transparently in the power that established the self.', turn: 'Who did He make you to be?', ref: 'Galatians 2:20' },
    { h: 'Attention', t: 'Simone Weil argued that the highest form of attention is a kind of waiting — empty, open, not grasping. Prayer, she said, is attention turned toward God.', turn: 'Every scroll is a small training in where your attention goes. Put it somewhere on purpose.', ref: 'Philippians 4:8' }
  ];

  // ---------- relationship (inspired by the Gottman Institute's published research; my own wording) ----------
  var RELATIONSHIP = [
    { h: 'Bids', t: 'A "bid" is any small reach for connection: a comment about the weather, a sigh, "look at this". In the Gottmans\' study of newlyweds, couples who stayed together had turned toward each other\'s bids about 86 percent of the time; those who later divorced, about 33 percent.', tryit: 'Tonight, notice one bid and turn toward it — look up, put the phone down, answer.' },
    { h: 'Four warning signs', t: 'The Gottmans named four patterns that predict a relationship\'s breakdown: criticism, contempt, defensiveness and stonewalling. Contempt — eye-rolling, sarcasm, mockery — is the most corrosive.', tryit: 'Which one do you reach for when you are tired? Name it, kindly, to yourself.' },
    { h: 'The antidotes', t: 'Each has a remedy: instead of criticism, a gentle start-up ("I feel… about… I need…"); instead of contempt, a culture of appreciation; instead of defensiveness, taking some responsibility; instead of stonewalling, a break to settle yourself, then return.', tryit: 'Re-say one criticism as "I feel… about… I need…".' },
    { h: 'Soft start-up', t: 'Research says conversations tend to end the way they begin. A harsh opening — "you always…" — almost always leads to a harsh ending. Start soft and specific.', tryit: 'Rewrite one complaint so it begins with how you feel and what you need.' },
    { h: 'Repair', t: 'Happy couples fight too. What they do differently is repair: a joke, "I\'m sorry", "can we start over?", a touch. Repair attempts that are accepted are one of the best predictors of staying together.', tryit: 'Make one repair attempt this week, and notice if you are accepting theirs.' },
    { h: 'Love maps', t: 'A love map is how well you know your partner\'s inner world — their worries, hopes, friends, what they dread this week. Partners who keep their maps updated weather change better.', tryit: 'Ask one question you do not know the answer to. Then ask a follow-up.' },
    { h: 'Five to one', t: 'In stable relationships, there are about five positive interactions for every negative one during conflict. Outside of conflict the ratio is even higher. Small kindnesses are the savings.', tryit: 'Say one specific thing you appreciate, out loud, today.' },
    { h: 'Flooding', t: 'When your heart races past about 100 beats a minute in an argument, your ability to listen shuts down. The Gottmans recommend a break of at least 20 minutes, doing something calming — not rehearsing your case — and then coming back.', tryit: 'Agree a signal now, while calm, for "I need a break, and I will come back."' },
    { h: 'Accepting influence', t: 'Marriages tend to thrive when each partner lets the other influence them. The question under it: "Am I on your team?"', tryit: 'Next time you disagree, find one thing they said that you can say yes to.' },
    { h: 'Perpetual problems', t: 'The Gottmans found that around two-thirds of a couple\'s conflicts never fully resolve — they are built into who the two people are. Happy couples learn to talk about them with humour and affection, rather than to win.', tryit: 'Is there a perpetual problem you could hold more gently? Pray about it before you talk about it.' },
    { h: 'Fondness and admiration', t: 'Contempt grows where we have lost sight of what we admired. The Gottmans use a simple practice: call to mind specific things you respect and enjoy in the other person, and say them.', tryit: 'Write three things you admired about them when you first met. Tell them one.' },
    { h: 'Rituals of connection', t: 'Small repeated rituals — a real hello at the door, a six-second kiss, a ten-minute conversation about the day that is not about logistics — build the relationship more than occasional big gestures.', tryit: 'Pick one ritual and attach it to something you already do every day.' },
    { h: 'Dreams within conflict', t: 'Behind a gridlocked argument there is usually a dream — something that matters deeply to one of you. The goal is not to settle the argument but to understand the dream.', tryit: 'Ask: "What does this mean to you? What is the story behind it?"' },
    { h: 'Turning toward God', t: 'The same pattern applies to Him: small bids all day — a glance, "Lord, help", a thank-you — and He turns toward every one.', tryit: 'Make one bid to Him now. Hear anything? You do not have to.' }
  ];

  // ---------- fun ----------
  var JOKES = [
    ['I\'m reading a book about anti-gravity.', 'It\'s impossible to put down.'],
    ['Why don\'t scientists trust atoms?', 'They make up everything.'],
    ['I used to hate facial hair…', '…but then it grew on me.'],
    ['What do you call cheese that isn\'t yours?', 'Nacho cheese.'],
    ['Why did the scarecrow win an award?', 'He was outstanding in his field.'],
    ['I only know 25 letters of the alphabet.', 'I don\'t know y.'],
    ['What do you call a fake noodle?', 'An impasta.'],
    ['How does a penguin build its house?', 'Igloos it together.'],
    ['Did you hear about the restaurant on the moon?', 'Great food, no atmosphere.'],
    ['Why can\'t you hear a pterodactyl in the bathroom?', 'Because the P is silent.'],
    ['I\'d tell you a construction joke…', '…but I\'m still working on it.'],
    ['What do you call a bear with no teeth?', 'A gummy bear.'],
    ['Why did the bicycle fall over?', 'It was two-tired.'],
    ['I got a job at a bakery.', 'I kneaded the dough.'],
    ['Why do melons have weddings?', 'Because they cantaloupe.'],
    ['What did the ocean say to the shore?', 'Nothing, it just waved.'],
    ['Why did the coffee file a police report?', 'It got mugged.'],
    ['What do you call a belt made of watches?', 'A waist of time.'],
    ['How do you organize a space party?', 'You planet.'],
    ['Why don\'t eggs tell jokes?', 'They\'d crack each other up.'],
    ['What did one wall say to the other?', '"I\'ll meet you at the corner."'],
    ['What do you call a dinosaur that crashes his car?', 'Tyrannosaurus wrecks.'],
    ['Parallel lines have so much in common.', 'It\'s a shame they\'ll never meet.'],
    ['Why did the math book look sad?', 'It had too many problems.'],
    ['What do you call a sleeping bull?', 'A bulldozer.'],
    ['Why was the broom late?', 'It over-swept.'],
    ['What do you call a fish wearing a bowtie?', 'Sofishticated.'],
    ['What do you call someone with no body and no nose?', 'Nobody knows.'],
    ['I used to be a banker…', '…but I lost interest.'],
    ['Why can\'t a nose be 12 inches long?', 'Because then it would be a foot.'],
    ['What time did the man go to the dentist?', 'Tooth-hurty.'],
    ['Why did the golfer bring two pairs of pants?', 'In case he got a hole in one.'],
    ['What do you call a boomerang that doesn\'t come back?', 'A stick.'],
    ['Why did the tomato turn red?', 'Because it saw the salad dressing.'],
    ['What do you call a pile of cats?', 'A meow-ntain.'],
    ['How do you make a Kleenex dance?', 'Put a little boogie in it.'],
    ['What kind of man was Boaz before he married Ruth?', 'Ruthless.'],
    ['Who was the greatest financier in the Bible?', 'Noah. He was floating a company while everyone else was in liquidation.'],
    ['Why is it so hard for a skeleton to tell a lie?', 'You can see right through them.'],
    ['What did the left eye say to the right eye?', 'Between us, something smells.']
  ].map(function (x) { return { q: x[0], a: x[1] }; });

  var RIDDLES = [
    ['What has keys but can\'t open locks?', 'A piano.'],
    ['What gets wetter the more it dries?', 'A towel.'],
    ['I speak without a mouth and hear without ears. What am I?', 'An echo.'],
    ['The more you take, the more you leave behind. What are they?', 'Footsteps.'],
    ['What can you catch but not throw?', 'A cold.'],
    ['What has hands but can\'t clap?', 'A clock.'],
    ['What comes once in a minute, twice in a moment, but never in a thousand years?', 'The letter M.'],
    ['What has a head and a tail but no body?', 'A coin.'],
    ['What belongs to you, but other people use it more than you do?', 'Your name.'],
    ['What is full of holes but still holds water?', 'A sponge.'],
    ['What goes up when the rain comes down?', 'An umbrella.'],
    ['What has one eye but cannot see?', 'A needle.'],
    ['What runs but never walks, and has a mouth but never talks?', 'A river.'],
    ['What can travel around the world while staying in a corner?', 'A stamp.'],
    ['What can you break without ever touching it?', 'A promise.'],
    ['Light as a feather, yet the strongest man cannot hold it for more than a few minutes. What is it?', 'Breath.'],
    ['What is always in front of you but can\'t be seen?', 'The future.'],
    ['A man looks at a portrait and says: "Brothers and sisters I have none, but that man\'s father is my father\'s son." Whose portrait is it?', 'His son\'s.'],
    ['Mary\'s father has five daughters: Nana, Nene, Nini, Nono — and what is the fifth\'s name?', 'Mary.'],
    ['Forward I am heavy, but backward I am not. What am I?', 'Ton.'],
    ['The more of me there is, the less you see. What am I?', 'Darkness.'],
    ['What has to be broken before you can use it?', 'An egg.'],
    ['I\'m tall when I\'m young and short when I\'m old. What am I?', 'A candle.'],
    ['Feed me and I live; give me water and I die. What am I?', 'Fire.'],
    ['What gets bigger the more you take away?', 'A hole.'],
    ['Two in a corner, one in a room, zero in a house, but one in a shelter. What is it?', 'The letter R.'],
    ['I was swallowed whole, yet came out alive and preached to a city that repented. Who am I?', 'Jonah.'],
    ['I climbed a tree to see Jesus passing by. Who am I?', 'Zacchaeus.'],
    ['Samson\'s riddle: "Out of the eater, something to eat; out of the strong, something sweet." What was it?', 'Honey, from the lion\'s carcass (Judges 14).'],
    ['What building has the most stories?', 'The library.']
  ].map(function (x) { return { q: x[0], a: x[1] }; });

  // ---------- What I Want ----------
  // theme: idol | scarcity | protect | promote | hollow. pull = what it feels like; world = where that road runs;
  // christ = the way of Christ (a verse key into MannaText.verses and a line); held = how a person in the Kingdom can hold the thing itself.
  var WANT = [
    { id: 'news', theme: 'idol', title: 'The late-night feed',
      pull: 'Just one more look. If I stay on top of everything, I\'ll feel in control. I\'ll be ready.',
      world: 'Control by information. Every article opens ten more. You end up more afraid and more tired, and not one thing you read can you do anything about tonight.',
      verse: 'Psalm 131:1-2', christ: 'A weaned child at its mother\'s breast. Not needing to know, because I am held.',
      held: 'Care about the world — as a person who prays for it. Pick one story, pray for the people in it, close it. Take news at a set time, in daylight.',
      pray: 'Jesus, I leave the world in Your hands tonight.' },
    { id: 'seen', theme: 'promote', title: 'Nobody noticed',
      pull: 'I did a good thing and no one said anything. I want them to see.',
      world: 'Reputation as air. Whoever applauds you holds you. You perform for the room and lose the Father who sees in secret.',
      verse: '1 Samuel 16:7', christ: 'He looks at the heart. I am already seen, and already chosen.',
      held: 'Letting good work be known is not wrong. Share it gladly; but give the credit away freely and do not need the reply.',
      pray: 'Father, You see me. That is enough.' },
    { id: 'bills', theme: 'scarcity', title: 'Not enough',
      pull: 'What if the money runs out? I need a bigger cushion before I can relax.',
      world: 'Security by accumulation. There is always a larger number you need. You work to fear less and fear more.',
      verse: 'Matthew 6:25-27', christ: 'Look at the birds. Your Father feeds them. You are worth more than they.',
      held: 'Plan, save and work well — they are gifts. Hold them as a steward holds a master\'s money, with an open hand and a ready one.',
      pray: 'Lord, You are my provider. Show me today\'s bread.' },
    { id: 'credit', theme: 'promote', title: 'Someone else got the credit',
      pull: 'I did the work and they got the praise. I need to set the record straight.',
      world: 'Self-promotion as survival. You build a case. Resentment becomes a room you live in.',
      verse: 'Philippians 2:3-4', christ: 'In humility consider others as more important. Not a pose — the way of the One who made Himself nothing.',
      held: 'It is fine to speak plainly and kindly about what you did. Do it once, in love, then let it go.',
      pray: 'Jesus, free me from needing to win.' },
    { id: 'sting', theme: 'protect', title: 'The sting of criticism',
      pull: 'That hurt. I\'m going to explain, defend, or go cold.',
      world: 'Self-protection. You wall off. The wall keeps out the hurt and the help.',
      verse: 'Proverbs 15:1', christ: 'A soft answer turns away wrath. Because my worth was settled at the cross, I do not have to defend it.',
      held: 'Weigh the criticism — some is true. Take what is true, let the rest fall off, and stay soft.',
      pray: 'Lord, what is true in this? Hold me while I hear it.' },
    { id: 'hollow', theme: 'hollow', title: 'None of it matters',
      pull: 'It\'s all pointless anyway. Everyone is in it for themselves. Why try?',
      world: 'Cynicism wearing wisdom\'s coat. It feels safe, because you can never be fooled. You also can never be moved.',
      verse: 'Ecclesiastes 3:11', christ: 'He has made everything beautiful in its time, and set eternity in our hearts. The ache is real — and it points somewhere.',
      held: 'Be honest about what is broken. Don\'t pretend. But name the ache as a hunger, and bring it to the One who made the hunger.',
      pray: 'Jesus, I want to want You. Meet me here.' },
    { id: 'buy', theme: 'idol', title: 'A little treat',
      pull: 'I\'ve had a hard day. I deserve this. It will make me feel better.',
      world: 'Comfort by consumption. The feeling lasts about an hour. You need a bigger one next time.',
      verse: 'Luke 12:15', christ: 'A man\'s life does not consist in the abundance of his possessions.',
      held: 'Good things are gifts. Enjoy a meal, a book, a tool, with thanks. The test is whether it is serving you or you are serving it.',
      pray: 'Father, I receive this as a gift. Thank You.' },
    { id: 'win', theme: 'protect', title: 'The argument',
      pull: 'I\'m right and I need them to see it.',
      world: 'Winning as safety. If you are right, you are safe. But now you have a case and not a person.',
      verse: 'Philippians 2:3-4', christ: 'Not looking to your own interests but also to the interests of others.',
      held: 'Truth matters and you can still hold your ground. Do it as a servant of the person, not an adversary.',
      pray: 'Jesus, give me love in front of my point.' },
    { id: 'ambition', theme: 'promote', title: 'Something big',
      pull: 'I want to build something that matters — and have people know it.',
      world: 'Ambition as identity. You are only as good as your last result; success terrifies you as much as failure.',
      verse: 'Colossians 3:23-24', christ: 'Whatever you do, work at it with all your heart, as working for the Lord. It is the Lord Christ you are serving.',
      held: 'Ambition can be a gift from Him. Offer it; build it; hold the results open-handed.',
      pray: 'Lord, this is Yours. Use it or end it.' },
    { id: 'numb', theme: 'idol', title: 'I just want to switch off',
      pull: 'I\'m worn out. I deserve to numb out. Nothing will ask anything of me.',
      world: 'Escape as rest. You get a screen and an hour — and wake up more tired.',
      verse: 'Matthew 11:28-30', christ: '"Come to Me, all you who are weary and burdened, and I will give you rest." Not escape from the weight; a different yoke.',
      held: 'Rest is holy; He made the Sabbath for you. Take it on purpose — sleep, a walk, a song, a long stretch with Him.',
      pray: 'Jesus, give me rest that rests me.' },
    { id: 'compare', theme: 'scarcity', title: 'Everyone else\'s life',
      pull: 'They have more, they\'re further along, they\'re happier.',
      world: 'Comparison. You look at everyone else\'s highlights and your own behind-the-scenes. There is no bottom to this.',
      verse: 'Psalm 37:4-5', christ: 'Delight yourself in the Lord. Commit your way to Him. My life is a gift made for me.',
      held: 'Let others\' good news be good news. Rejoice with them; it is a muscle that grows.',
      pray: 'Father, I thank You for my own path.' },
    { id: 'fomo', theme: 'scarcity', title: 'The next big thing',
      pull: 'If I don\'t keep up, I\'ll be left behind.',
      world: 'Fear of missing out. You are always a step behind a moving crowd.',
      verse: 'Isaiah 30:15', christ: 'In repentance and rest is your salvation; in quietness and trust is your strength.',
      held: 'Learn and stay current as it serves what you are called to. Let the rest pass by like weather.',
      pray: 'Lord, show me what is mine, and let the rest go by.' },
    { id: 'hoard', theme: 'scarcity', title: 'Laying it up',
      pull: 'I need to secure my future.',
      world: 'Treasure on earth. Moths, rust, thieves — and a heart that has moved in with the treasure.',
      verse: 'Matthew 6:19-21', christ: 'Where your treasure is, there your heart will be also.',
      held: 'Provide for your family and plan wisely. Keep giving — the best way to loosen a hand.',
      pray: 'Lord, show me where my treasure is.' },
    { id: 'needed', theme: 'promote', title: 'Being needed',
      pull: 'If I stop, it will fall apart. I\'m the one holding it together.',
      world: 'Indispensability. You have named yourself the Savior of a small kingdom.',
      verse: 'John 15:4-5', christ: 'Apart from Me you can do nothing. And with Me, I carry the weight.',
      held: 'Serve and be reliable. But let others learn too, and let God be God.',
      pray: 'Jesus, You hold it. I rest.' },
    { id: 'grudge', theme: 'protect', title: 'The grudge',
      pull: 'They don\'t deserve to be forgiven. I\'ll remember.',
      world: 'Resentment as justice. It keeps the injury alive and you in the room with it.',
      verse: 'Ephesians 4:31-32', christ: 'Be kind and compassionate, forgiving each other, just as in Christ God forgave you.',
      held: 'Forgiving is not saying it did not matter; it is handing the debt to a better judge. You can still set boundaries.',
      pray: 'Father, I give this to You — and I ask for Your heart toward them.' }
  ];

  var THEMES = {
    idol: 'An idol', scarcity: 'Scarcity', protect: 'Self-protection', promote: 'Self-promotion', hollow: 'Emptiness'
  };

  // Breathing prompts for the landing (spoken to Him, not at you).
  var BREATH = {
    in: ['Jesus', 'Lord', 'Father', 'Spirit', 'Abba', 'Come'],
    out: ['I am here', 'I rest', 'You are here', 'I receive', 'I am Yours', 'Thank You']
  };

  var TIPS = {
    add: 'Split the second number into tens and ones. 47 + 38: add 30 to get 77, then 8 to get 85. Or round up: 47 + 40 − 2.',
    sub: 'Count up instead of down. 82 − 47: from 47 up to 50 is 3, then 50 to 82 is 32. Total 35.',
    mul: 'Break it apart. 7 × 8 is 7 × 4, doubled. For × 5: half of ×10. For × 9: ×10 minus once.',
    div: 'Ask what you multiply by to get here. 72 ÷ 8: 8 × 9 is 72.',
    comp: 'Climb to the round number in steps. 100 − 64: 64 + 6 = 70, then 70 + 30 = 100. You added 36.',
    pct: '10% is shift the decimal. 5% is half of that, 20% is double it, 15% is 10% plus 5%.',
    sq: 'For a number ending in 5: take the tens digit, multiply by the next one, then write 25. 35² → 3 × 4 = 12, so 1225.'
  };

  root.MannaContent = {
    CATS: CATS, MOODS: MOODS, NIGHT_VERSES: NIGHT_VERSES, QUOTES: QUOTES, THREADS: THREADS,
    SCIENCE: SCIENCE, PHILOSOPHY: PHILOSOPHY, RELATIONSHIP: RELATIONSHIP, JOKES: JOKES, RIDDLES: RIDDLES,
    WANT: WANT, THEMES: THEMES, BREATH: BREATH, TIPS: TIPS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MannaContent;
})(typeof window !== 'undefined' ? window : globalThis);
