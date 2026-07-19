/**
 * Rewire — common trigger presets
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

  window.RewirePresets = {
    TRIGGER_PRESETS: TRIGGER_PRESETS
  };
})();
