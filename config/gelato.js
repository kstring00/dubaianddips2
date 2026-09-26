/* Dubai & Dips - the /gelato page.
   Placeholder content until the owner supplies the real thing. Nothing here
   states a fact about the gelato; every line is marked for confirmation.
   Plain ES5. */
window.DD_GELATO = {
  /* Today's Flavors: shown on the split-flap board. Up to 14 characters
     each; letters, numbers, spaces and - & . / only. Replace freely. */
  flavors: [
    { name: "PISTACHIO", status: "on-time" },
    { name: "FLAVOR TWO", status: "on-time" },
    { name: "FLAVOR THREE", status: "on-time" },
    { name: "FLAVOR FOUR", status: "seasonal" },
    { name: "FLAVOR FIVE", status: "on-time" },
    { name: "FLAVOR SIX", status: "sold-out" }
  ],
  flavorsNote: "[OWNER TO CONFIRM: today's flavors. This list is a placeholder.]",

  tabs: {
    quality: {
      title: "The Quality",
      lines: [
        "[OWNER TO CONFIRM: what goes into the gelato, where the pistachio and milk come from, and what is never used.]",
        "[OWNER TO CONFIRM: the one thing about the quality you want every visitor to know.]"
      ]
    },
    fresh: {
      title: "Made Fresh Daily",
      lines: [
        "[OWNER TO CONFIRM: when the gelato is made, how often, and by whom.]",
        "[OWNER TO CONFIRM: how long a batch is kept, and what happens to what is left.]"
      ]
    },
    science: {
      title: "The Science",
      lines: [
        "[OWNER TO CONFIRM: the serving temperature, the overrun and the churn used here.]",
        "[OWNER TO CONFIRM: anything about the process that makes this gelato different.]"
      ]
    }
  }
};
