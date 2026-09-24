/* Dubai & Dips - what the departures board says.
   ONE file for every phrase on the board's split-flap status tiles. Edit
   freely: no code change is needed. Plain ES5, loaded before site.js.

   How the board uses it
   - Each row cycles through its own set, one phrase every CYCLE_MS, the
     rows staggered by STAGGER_MS so they never flip together.
   - A row's set is picked by its destination code in /menu-board.json
     (DXB, FCO, NRT, ...). A code with no set here uses GENERAL.
   - Whether the shop is open comes from HOURS in config/ordering.js,
     worked out in the shop's own timezone:
       OPEN          rows cycle their open set.
       CLOSING SOON  (the last CLOSING_SOON_MINUTES of the day, also in
                     config/ordering.js) row 1 locks to FINAL_CALL; the
                     others keep cycling.
       CLOSED        every row cycles CLOSED, except row 1, which shows the
                     real next opening (OPENS 9AM, OPENS SUN 10AM). No row
                     ever says NOW BOARDING while the shop is closed.
   - A row whose status is "sold-out" in /menu-board.json shows SOLD OUT
     while the shop is open.
   - Phrases are at most 14 characters (letters, numbers, spaces and
     : - & . /). Longer ones are cut to 14. The board sizes its tiles to
     the longest phrase in use and centres shorter ones.
   - HIGHLIGHT phrases get the Browned Sugar tiles; everything else sits
     on the green. */
window.DD_DEPARTURES = {
  CYCLE_MS: 4500,
  STAGGER_MS: 600,

  FINAL_CALL: "FINAL CALL",
  OPENS: "OPENS",          /* row 1 when closed: OPENS 9AM, OPENS SUN 10AM */
  SOLD_OUT: "SOLD OUT",
  SEASONAL: "SEASONAL",    /* added to the front of a "seasonal" row's set */
  HIGHLIGHT: ["NOW BOARDING", "FINAL CALL"],

  OPEN: {
    GENERAL: ["NOW BOARDING", "ON TIME", "NO LAYOVERS", "FIRST CLASS",
              "UPGRADE: YES", "CARRY-ON OK", "NO PASSPORT", "SEAT 2D OPEN",
              "SWEET SKIES", "WHEELS UP"],
    DXB: ["NOW BOARDING", "PISTACHIO ON", "KUNAFA CRUNCH", "GOLD CLASS",
          "DESERT CHILL", "DXB DIRECT"],                                   /* Dubai */
    FCO: ["ON TIME", "FRESH PULL", "BREWING NOW", "CIAO CREMA",
          "DOPPIO READY", "ESPRESSO GO"],                                  /* Italy */
    NRT: ["ON TIME", "MATCHA MODE", "WHISKED FRESH", "ZEN ON BOARD"],     /* Japan: the matchas */
    IST: ["ON TIME", "BAKLAVA BOUND", "EXTRA DIP"],                        /* Turkey */
    CAI: ["ON TIME", "SPHINX SIPS", "NILE CRUISING"],                      /* Egypt: no row flies here yet */
    EUR: ["ON TIME", "SWEET EUROTRIP", "CROSSING OVER"]                    /* Europe: no row flies here yet */
  },

  CLOSED: ["GATE CLOSED", "CREW ASLEEP", "RED-EYE SOON", "SEE YOU SOON", "DREAM ROUTE"]
};
