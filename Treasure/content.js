/* Treasuring — authored content. Prayer lines match the spec (section 3) exactly.
   Thoughts are authored and not editable in the product. References are cited, never quoted. */
(function (root) {
  'use strict';

  var LINES = {
    'place-heart': { to: 'Jesus',       text: 'Jesus, I place my heart with you.',  label: '' },
    'into-hands':  { to: 'Father',      text: 'Father, into your hands.',           label: 'let it go' },
    'my-part':     { to: 'Father',      text: 'Father, what is my part today?',     label: 'one thing, or none' },
    'thank-you':   { to: 'Father',      text: 'Father, thank you.',                 label: 'receive it as gift' },
    'understand':  { to: 'Holy Spirit', text: 'Holy Spirit, help me understand.',   label: 'ask what is true here' },
    'hold':        { to: 'Jesus',       text: 'Jesus, I hold this to you.',         label: 'stay with it a moment' },
    // Addition beyond spec section 3: the bin for a lie. It is spoken to Jesus, like the hold line.
    'lie':         { to: 'Jesus',       text: 'Jesus, I put this lie down.',        label: 'put it down' },
    // Additions beyond section 3, for the Insight screen. "Lord" is the author's wording for Jesus.
    'not-him':     { to: 'Jesus',       text: 'Jesus, this isn\u2019t from you.',    label: 'it is not His' },
    'know':        { to: 'Lord',        text: 'Lord, what do you want me to know about this?', label: 'ask, then listen' },
    'do':          { to: 'Lord',        text: 'Lord, what do you want me to do about this?',   label: 'one thing, or none' }
  };
  // How something may come, offered as options after asking. The app never writes God's words; the person does.
  var SENSED = ['A word or phrase', 'A verse', 'A picture or memory'];
  var TEST_IT = 'Test it: does it agree with Scripture, and with what a wise believer would say? (1 John 4:1)';

  // Additions beyond spec section 3 (flagged in the handoff): the prayer-for-a-person lines.
  var PRAY_NOW = 'Father, I pray for {name} now.';
  var CLAIM = 'Father, in Jesus’ name, I claim {word} for {name}.';

  var QUESTIONS = [
    'Holy Spirit, is this from Him?',
    'Father, is there one part for me today?',
    'Father, is thank you the truer word?'
  ];

  // truth:false = a lie (with the partial truth it borrowed); truth:true = true, with why it can feel false.
  var THOUGHTS = [
    // — lies —
    { id: 'l01', truth: false, text: 'I should be further along by now.', note: 'It borrows a real thing: He does want you to grow. But He is not holding a deadline you missed. He knows how you are formed and remembers that you are dust (Psalm 103:14).' },
    { id: 'l02', truth: false, text: 'If I don’t keep watch, something will go wrong.', note: 'It borrows a real thing: you are meant to be watchful and to do your part. But keeping the world safe was never your job. He who keeps you does not slumber (Psalm 121:3–4).' },
    { id: 'l03', truth: false, text: 'God is disappointed in me.', note: 'It borrows a real thing: sin matters to Him. But for those in Christ there is no condemnation (Romans 8:1), and He is near to the brokenhearted (Psalm 34:18).' },
    { id: 'l04', truth: false, text: 'I have to earn this.', note: 'It borrows a real thing: obedience is good. But you are saved by grace, as a gift, so that no one can boast (Ephesians 2:8–9).' },
    { id: 'l05', truth: false, text: 'Everyone else has it together.', note: 'It borrows a real thing: some people do look settled. But you are comparing their outside to your inside. The Lord looks at the heart (1 Samuel 16:7).' },
    { id: 'l06', truth: false, text: 'I’m too much for people.', note: 'It borrows a real thing: someone may once have made you feel that. But He is not tired of you, and He invites all your cares (1 Peter 5:7).' },
    { id: 'l07', truth: false, text: 'It’s all up to me.', note: 'It borrows a real thing: you do have a part. But the outcome is His. The Lord establishes the steps (Proverbs 16:9).' },
    { id: 'l08', truth: false, text: 'I can’t rest until it’s all done.', note: 'It borrows a real thing: work is good. But He gives sleep to those He loves (Psalm 127:2).' },
    { id: 'l09', truth: false, text: 'I’ve already lost my chance.', note: 'It borrows a real thing: some seasons do close. But He is the God who restores the years that were eaten away (Joel 2:25).' },
    { id: 'l10', truth: false, text: 'My prayers don’t go anywhere.', note: 'It borrows a real thing: it can feel like silence. But His ears are open to your cry (Psalm 34:15), and the Spirit prays for you when you cannot find the words (Romans 8:26).' },
    { id: 'l11', truth: false, text: 'I’m alone in this.', note: 'It borrows a real thing: no one near may see it. But He is with you always (Matthew 28:20) and will never leave you (Hebrews 13:5).' },
    { id: 'l12', truth: false, text: 'I’ve done it too many times to be forgiven.', note: 'It borrows a real thing: you have done it before. But if we confess, He is faithful and just to forgive and to cleanse (1 John 1:9).' },
    { id: 'l13', truth: false, text: 'I need to know how this ends before I can trust.', note: 'It borrows a real thing: wanting to know is human. But trust walks on the light given for the next step (Proverbs 3:5–6).' },
    { id: 'l14', truth: false, text: 'I have to fix everything I said before I can come to Him.', note: 'It borrows a real thing: making things right with people matters (Matthew 5:23–24). But you come to Him first, with confidence, as you are (Hebrews 4:16).' },
    { id: 'l15', truth: false, text: 'I’m only worth something when I’m useful.', note: 'It borrows a real thing: serving is good. But you are worth more than the birds He feeds (Luke 12:24), before you do anything at all.' },
    { id: 'l16', truth: false, text: 'It’s too small to bring to Him.', note: 'It borrows a real thing: it may be small. But He invites you to bring everything to Him in prayer (Philippians 4:6).' },
    { id: 'l17', truth: false, text: 'He’s angry about how I spent today.', note: 'It borrows a real thing: a day can be spent badly. But He is compassionate and slow to anger, and has removed our sins as far as the east is from the west (Psalm 103:8, 12).' },
    { id: 'l18', truth: false, text: 'If this goes badly, hoping was foolish.', note: 'It borrows a real thing: hope has hurt before. But hope in Him does not put us to shame (Romans 5:5).' },
    { id: 'l19', truth: false, text: 'I’ve missed too much to catch up.', note: 'It borrows a real thing: days do get missed. But His mercies are new every morning (Lamentations 3:22–23).' },
    { id: 'l20', truth: false, text: 'I must never feel this way.', note: 'It borrows a real thing: some feelings lead us wrong. But He invites you to pour out your heart to Him (Psalm 62:8). The feeling can come to Him as it is.' },
    { id: 'l21', truth: false, text: 'They will never change.', note: 'It borrows a real thing: change can be slow, and it is not yours to force. But nothing is impossible with God (Luke 1:37).' },
    { id: 'l22', truth: false, text: 'I’m the only one who sees this clearly.', note: 'It borrows a real thing: you may be seeing something real. But the wise listen to counsel (Proverbs 12:15), and you do not see the whole.' },
    { id: 'l23', truth: false, text: 'It’s safer not to hope.', note: 'It borrows a real thing: disappointment hurts. But the psalmist waits and hopes in the Lord (Psalm 130:5).' },
    { id: 'l24', truth: false, text: 'I have to settle all of this before bed.', note: 'It borrows a real thing: wanting it settled. But tomorrow has its own worries, and today has enough of its own (Matthew 6:34).' },
    { id: 'l25', truth: false, text: 'I’ll never get free of this.', note: 'It borrows a real thing: it has lasted a long time. But if the Son sets you free, you are free indeed (John 8:36).' },
    { id: 'l26', truth: false, text: 'I have to be strong for everyone.', note: 'It borrows a real thing: people do lean on you. But His power is made perfect in weakness (2 Corinthians 12:9).' },
    { id: 'l27', truth: false, text: 'He only listens when I’ve been good.', note: 'It borrows a real thing: how we live matters. But the one who simply asked for mercy went home right with God (Luke 18:13–14).' },
    { id: 'l28', truth: false, text: 'I keep worrying, so I must not have faith.', note: 'It borrows a real thing: worry is not trust. But “I believe; help my unbelief” was received (Mark 9:24).' },
    // — truths —
    { id: 't01', truth: true, text: 'He is with me right now.', note: 'It can feel false because presence is not always felt. But He said He is with you always (Matthew 28:20). It does not depend on the feeling.' },
    { id: 't02', truth: true, text: 'I am forgiven.', note: 'It can feel false because guilt lingers after forgiveness. The feeling is not the verdict (1 John 1:9; Colossians 2:13).' },
    { id: 't03', truth: true, text: 'I don’t have to carry this alone.', note: 'It can feel false because no one may be in the room. But He invites you to cast it on Him (1 Peter 5:7; Matthew 11:28).' },
    { id: 't04', truth: true, text: 'The outcome isn’t mine to control.', note: 'It can feel false because it sounds like neglect. But you may do your part and leave the result with Him (Proverbs 16:9).' },
    { id: 't05', truth: true, text: 'I can lie down in peace.', note: 'It can feel false while things are unsettled. Rest does not wait for the problem to be solved (Psalm 4:8).' },
    { id: 't06', truth: true, text: 'He knows what I need before I ask.', note: 'It can feel false when a need is still unmet. He knows, and He still invites you to ask (Matthew 6:8).' },
    { id: 't07', truth: true, text: 'I am loved.', note: 'It can feel false when you feel unlovable. His love does not rest on how you feel (Romans 8:38–39).' },
    { id: 't08', truth: true, text: 'God is for me.', note: 'It can feel false in hard seasons. But if God is for us, who can be against us (Romans 8:31).' },
    { id: 't09', truth: true, text: 'Nothing here is too hard for Him.', note: 'It can feel false when the problem is large. Nothing is too hard for Him (Jeremiah 32:17).' },
    { id: 't10', truth: true, text: 'My part is small, and it is enough.', note: 'It can feel false when a small part seems pointless. One plants, another waters, and God gives the growth (1 Corinthians 3:6–7).' },
    { id: 't11', truth: true, text: 'I’m allowed to ask Him for help.', note: 'It can feel false when you feel you should manage. But you are invited to come boldly for mercy and grace (Hebrews 4:16).' },
    { id: 't12', truth: true, text: 'My feelings are not too much for Him.', note: 'It can feel false when you have been told to hide them. He invites you to pour out your heart (Psalm 62:8).' },
    { id: 't13', truth: true, text: 'He goes ahead of me into tomorrow.', note: 'It can feel false when tomorrow looks heavy. The Lord goes before you and will not leave you (Deuteronomy 31:8).' },
    { id: 't14', truth: true, text: 'I can come to Him just as I am.', note: 'It can feel false when you feel unready. The weary and heavy-laden are invited (Matthew 11:28).' },
    { id: 't15', truth: true, text: 'He hears me.', note: 'It can feel false when nothing seems to change. He listens, and has promised to (Psalm 34:15; 1 John 5:14).' },
    { id: 't16', truth: true, text: 'I belong to Him.', note: 'It can feel false when you feel adrift. He has called you by name (Isaiah 43:1), and no one snatches His sheep from His hand (John 10:27–28).' },
    { id: 't17', truth: true, text: 'There is still something to thank Him for.', note: 'It can feel false on a heavy day. Thanks can sit beside the heaviness without denying it (1 Thessalonians 5:18).' },
    { id: 't18', truth: true, text: 'He is patient with me.', note: 'It can feel false when you are impatient with yourself. He is slow to anger (Psalm 103:8; 2 Peter 3:9).' },
    { id: 't19', truth: true, text: 'I need other people too.', note: 'It can feel false because it feels like weakness. Two are better than one (Ecclesiastes 4:9–10).' },
    { id: 't20', truth: true, text: 'I can’t make myself peaceful, but He can give it.', note: 'It can feel false when you try harder and nothing changes. The peace is His to give (John 14:27).' },
    { id: 't21', truth: true, text: 'Not every thought I have is from Him.', note: 'It can feel false because thoughts feel like me. We are told to test the spirits (1 John 4:1) and take thoughts captive (2 Corinthians 10:5).' },
    { id: 't22', truth: true, text: 'He isn’t finished with me.', note: 'It can feel like a threat when you feel behind. It is a promise: He who began a good work will carry it on (Philippians 1:6).' },
    { id: 't23', truth: true, text: 'I don’t have to understand everything.', note: 'It can feel false when you want answers. His ways are higher than ours (Isaiah 55:8–9).' },
    { id: 't24', truth: true, text: 'He understands my weakness.', note: 'It can feel false when you feel only judged. Our high priest sympathizes with our weaknesses (Hebrews 4:15).' },
    { id: 't25', truth: true, text: 'Jesus is praying for me.', note: 'It can feel false because you cannot hear it. He lives to intercede (Romans 8:34; Hebrews 7:25).' },
    { id: 't26', truth: true, text: 'He is gentle with the weary.', note: 'It can feel false when you expect a scolding. He does not break a bruised reed (Isaiah 42:3).' },
    { id: 't27', truth: true, text: 'I am not what I did.', note: 'It can feel false because memory is loud. In Christ you are a new creation (2 Corinthians 5:17).' },
    { id: 't28', truth: true, text: 'I can ask for wisdom.', note: 'It can feel false when you think you should already know. He gives generously to all who ask (James 1:5).' }
  ];

  var SEEDS = {
    people: ['A family member', 'A friend', 'An acquaintance', 'A neighbor', 'Someone at work', 'Someone who is sick', 'Someone hard to love', 'A leader over me'],
    concerns: ['Money', 'My health', 'Something I have to decide', 'A conversation I’m dreading', 'What I said earlier', 'The work waiting for me', 'The future', 'What someone thinks of me', 'A deadline', 'Being behind', 'Something I forgot', 'The news', 'A habit I can’t shake', 'Whether I’m doing enough'],
    thanks: ['A meal', 'Breath in my lungs', 'Someone who was kind', 'The quiet right now', 'A bed to sleep in', 'Something that went right today', 'Light through a window', 'A friend', 'That He is near', 'Forgiveness', 'A task finished', 'Something I almost missed'],
    feelings: ['Tightness in my chest', 'Shame', 'Wonder', 'The urge to check', 'Dread', 'Relief', 'The old accusation', 'Restlessness', 'Loneliness', 'Irritation', 'Heaviness', 'Gladness', 'Numbness', 'Weariness', 'Longing', 'Fear of being seen'],
    claims: ['salvation', 'healing', 'peace', 'protection', 'wisdom', 'provision', 'strength', 'courage', 'comfort', 'joy', 'rest', 'hope', 'freedom', 'guidance', 'forgiveness', 'reconciliation', 'faith', 'endurance', 'a soft heart', 'deliverance from fear', 'truth', 'patience', 'clear thinking', 'a way through', 'good sleep', 'belonging', 'His nearness']
  };

  // One-tap answers for "what is my part today?" so the keyboard is not needed. "None" is always valid.
  var PARTS = ['Make the call', 'Say sorry', 'Ask for help', 'Take one small step', 'Wait', 'Rest', 'Write it down', 'Tell someone', 'Pray for them', 'Do the next thing'];

  var content = {
    LINES: LINES, PRAY_NOW: PRAY_NOW, CLAIM: CLAIM, QUESTIONS: QUESTIONS,
    THOUGHTS: THOUGHTS, SEEDS: SEEDS, PARTS: PARTS, SENSED: SENSED, TEST_IT: TEST_IT
    
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = content;
  else root.TreasureContent = content;
})(typeof self !== 'undefined' ? self : this);
