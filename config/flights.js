/* Dubai & Dips - the Connecting Flights map.
   ONE file for what the route map shows. Plain ES5, loaded before
   flights.js on any page that carries the map.

   GATES are the six D&D routes out of Houston. Each one is a destination
   on the map and a page on the site: change `href` here and the map, the
   cards under it and the footer all follow. Codes are real IATA codes;
   coordinates are the airports'. */
window.DD_FLIGHTS = {
  origin: { code: "HOU", city: "Houston", note: "Clear Lake", lon: -95.09, lat: 29.55 },

  gates: [
    { code: "DXB", city: "Dubai", country: "United Arab Emirates", page: "Menu", href: "/menu", lon: 55.36, lat: 25.25, flight: "DD 101" },
    { code: "FCO", city: "Rome", country: "Italy", page: "Gelato", href: "/gelato", lon: 12.25, lat: 41.80, flight: "DD 102" },
    { code: "IST", city: "Istanbul", country: "Türkiye", page: "Catering", href: "/catering", lon: 28.75, lat: 41.28, flight: "DD 103" },
    { code: "CDG", city: "Paris", country: "France", page: "The Journal", href: "/blog", lon: 2.55, lat: 49.01, flight: "DD 104" },
    { code: "CAI", city: "Cairo", country: "Egypt", page: "Meet the Crew", href: "/team", lon: 31.41, lat: 30.12, flight: "DD 105" },
    { code: "HND", city: "Tokyo", country: "Japan", page: "The Feed", href: "/feed", lon: 139.78, lat: 35.55, flight: "DD 106" }
  ],

  /* The "every flight in the world" texture: faint arcs between these
     airports. Hubs (weight 3) get more of them. [code, lon, lat, weight] */
  airports: [
    ["LAX", -118.41, 33.94, 3], ["SFO", -122.38, 37.62, 2], ["SEA", -122.31, 47.45, 2], ["DEN", -104.67, 39.86, 2], ["ORD", -87.90, 41.98, 3],
    ["ATL", -84.43, 33.64, 3], ["JFK", -73.78, 40.64, 3], ["MIA", -80.29, 25.79, 2], ["DFW", -97.04, 32.90, 3], ["IAH", -95.34, 29.98, 3],
    ["YYZ", -79.63, 43.68, 2], ["YVR", -123.18, 49.19, 1], ["MEX", -99.07, 19.44, 2], ["PTY", -79.38, 9.07, 1], ["BOG", -74.15, 4.70, 1],
    ["LIM", -77.11, -12.02, 1], ["GRU", -46.47, -23.43, 2], ["EZE", -58.54, -34.82, 1], ["SCL", -70.79, -33.39, 1], ["LHR", -0.46, 51.47, 3],
    ["CDG", 2.55, 49.01, 3], ["AMS", 4.76, 52.31, 3], ["FRA", 8.57, 50.03, 3], ["MAD", -3.57, 40.47, 2], ["BCN", 2.08, 41.30, 1],
    ["FCO", 12.25, 41.80, 2], ["MXP", 8.72, 45.63, 1], ["ZRH", 8.55, 47.46, 1], ["VIE", 16.57, 48.11, 1], ["CPH", 12.66, 55.62, 1],
    ["ARN", 17.92, 59.65, 1], ["OSL", 11.10, 60.19, 1], ["HEL", 24.96, 60.32, 1], ["WAW", 20.97, 52.17, 1], ["IST", 28.75, 41.28, 3],
    ["ATH", 23.94, 37.94, 1], ["CAI", 31.41, 30.12, 2], ["TLV", 34.89, 32.01, 1], ["DXB", 55.36, 25.25, 3], ["DOH", 51.61, 25.27, 3],
    ["AUH", 54.65, 24.43, 2], ["RUH", 46.70, 24.96, 1], ["JED", 39.16, 21.68, 1], ["NBO", 36.93, -1.32, 1], ["ADD", 38.80, 8.98, 2],
    ["JNB", 28.25, -26.14, 2], ["CPT", 18.60, -33.97, 1], ["LOS", 3.32, 6.58, 1], ["CMN", -7.59, 33.37, 1], ["ALG", 3.22, 36.69, 1],
    ["DEL", 77.10, 28.57, 2], ["BOM", 72.87, 19.09, 2], ["BLR", 77.71, 13.20, 1], ["CMB", 79.88, 7.18, 1], ["BKK", 100.75, 13.69, 2],
    ["SIN", 103.99, 1.36, 3], ["KUL", 101.71, 2.75, 2], ["CGK", 106.66, -6.13, 1], ["MNL", 121.02, 14.51, 1], ["HKG", 113.91, 22.31, 3],
    ["PVG", 121.81, 31.14, 2], ["PEK", 116.59, 40.08, 2], ["CAN", 113.30, 23.39, 1], ["ICN", 126.45, 37.46, 2], ["HND", 139.78, 35.55, 3],
    ["NRT", 140.39, 35.76, 2], ["TPE", 121.23, 25.08, 1], ["SYD", 151.18, -33.95, 2], ["MEL", 144.84, -37.67, 1], ["AKL", 174.79, -37.01, 1],
    ["PER", 115.97, -31.94, 1], ["HNL", -157.92, 21.32, 1], ["ANC", -149.99, 61.17, 1], ["KEF", -22.61, 63.99, 1], ["DUB", -6.27, 53.42, 1],
    ["LIS", -9.14, 38.77, 1], ["BRU", 4.48, 50.90, 1], ["MUC", 11.79, 48.35, 2], ["PRG", 14.26, 50.10, 1], ["BUD", 19.26, 47.44, 1],
    ["BEY", 35.49, 33.82, 1], ["AMM", 35.99, 31.72, 1], ["KWI", 47.97, 29.23, 1], ["MCT", 58.28, 23.59, 1], ["KHI", 67.16, 24.91, 1],
    ["DAC", 90.40, 23.84, 1], ["HAN", 105.81, 21.22, 1], ["SGN", 106.65, 10.82, 1], ["DPS", 115.17, -8.75, 1], ["BNE", 153.12, -27.38, 1],
    ["SVO", 37.41, 55.97, 2], ["BOS", -71.01, 42.36, 1], ["PHX", -112.01, 33.43, 1], ["LAS", -115.15, 36.08, 1], ["MSP", -93.22, 44.88, 1]
  ],

  /* how many faint arcs to draw (desktop / phone), and the flights */
  network: { desktop: 220, phone: 80 },
  flight: { seconds: 7.5, gapSeconds: 1.7 }
};
