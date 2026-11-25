/**
 * Narrative copy for "THE CASCADE".
 * `mono` spans render as technical monospace accents inside a beat.
 * Beats are anchored to the global scroll progress [0..1].
 */

export const TITLE_CARD = {
  eyebrow: 'SEMICONDUCTOR FABRICATION — AN INTERACTIVE NARRATIVE',
  title: 'THE CASCADE',
  subtitle: 'Light, etch and layer — and the sensors they become.',
  hint: 'SCROLL TO DESCEND',
};

export const SECTION_LABELS = [
  { at: 0.02, text: 'I · ENTRY' },
  { at: 0.31, text: 'II · THE CASCADE' },
  { at: 0.62, text: 'IV · EPILOGUE' },
];

/**
 * Theory chapter. Each beat:
 *  - start/dur  : global scroll window the beat lives in
 *  - side       : screen placement, drives parallax depth
 *  - depth      : translateZ in px (positive = toward viewer)
 *  - words      : array of [text, kind] where kind is '' | 'mono'
 */
export const BEATS = [
  {
    start: 0.305, dur: 0.030, side: 'left', depth: 220, kicker: '01 — RESOLUTION',
    words: [['Every chip begins as ', ''], ['light', 'mono'], [' striking a mask.', '']],
  },
  {
    start: 0.337, dur: 0.030, side: 'right', depth: -180, kicker: '02 — LITHOGRAPHY',
    words: [
      ['EUV lithography prints at ', ''], ['13.5 nm', 'mono'],
      [' — patterns narrower than a ribosome, on a wafer the size of a dinner plate.', ''],
    ],
  },
  {
    start: 0.369, dur: 0.030, side: 'left', depth: 320, kicker: '03 — DEPOSITION',
    words: [
      ['Then layers. A dielectric a few atoms thick, then the channel itself: ', ''],
      ['PEDOT:PSS', 'mono'], [' printed in microdrops, or ', ''], ['P3HT', 'mono'],
      [' evaporated under vacuum.', ''],
    ],
  },
  {
    start: 0.401, dur: 0.030, side: 'right', depth: -260, kicker: '04 — ETCH',
    words: [
      ['Plasma etch strips everything the light did not protect — anisotropic, ', ''],
      ['300 W', 'mono'], [', ', ''], ['20 mTorr', 'mono'],
      [' — leaving a channel ', ''], ['20 µm', 'mono'], [' long.', ''],
    ],
  },
  {
    start: 0.433, dur: 0.030, side: 'left', depth: 180, kicker: '05 — INTERFACE',
    words: [
      ['The organic electrochemical transistor replaces the oxide gate with an electrolyte gel. ', ''],
      ['Ions', 'mono'], [' drift in, the channel swells, the drain current answers.', ''],
    ],
  },
  {
    start: 0.465, dur: 0.030, side: 'right', depth: -200, kicker: '06 — BIOSENSING',
    words: [
      ['Functionalise that same channel with ', ''], ['glucose oxidase', 'mono'],
      [' — or with a receptor protein — and the transistor becomes a biosensor, reading a body in ', ''],
      ['picoamperes', 'mono'], ['.', ''],
    ],
  },
  {
    start: 0.497, dur: 0.032, side: 'center', depth: 260, kicker: '07 — THE SAME FAB',
    words: [
      ['Same fab. Same cascade of light, etch and layer. A different question: not how fast it switches, ', ''],
      ['but what it can hear', 'mono'], ['.', ''],
    ],
  },
];

/** Process-flow decomposition shown while the fab model turns to wireframe. */
export const PROCESS_FLOW = [
  { id: 'dep', label: 'DEPOSITION', detail: 'dielectric · organic channel' },
  { id: 'litho', label: 'LITHOGRAPHY', detail: 'EUV · 13.5 nm' },
  { id: 'etch', label: 'ETCH', detail: 'plasma · anisotropic' },
  { id: 'encap', label: 'ENCAPSULATION', detail: 'gel electrolyte' },
  { id: 'integ', label: 'INTEGRATION', detail: 'OECT array' },
  { id: 'biosense', label: 'BIOSENSING', detail: 'enzyme · receptor' },
];

/**
 * The cinema. The flight is deliberately brisk — the light path is a short,
 * bright beat, and the sequence lands on the chip.
 * `at` values are fractions of the film and line up with the tunnel's
 * geometry: the optical path ends at z = -175, the reticle at -560, the
 * plasma at -1000, and the die at -1455.
 */
export const FILM = {
  sections: [
    { at: 0.00, code: 'OPTICAL PATH', note: 'λ = 13.5 nm · NA 0.35' },
    { at: 0.18, code: 'RETICLE ALIGNMENT', note: 'stage X/Y ± 2 nm' },
    { at: 0.43, code: 'PLASMA ETCH', note: 'Ar/CF₄ · 300 W · 20 mTorr' },
    { at: 0.68, code: 'SILICON LATTICE', note: 'diamond cubic · a = 5.43 Å' },
    { at: 0.89, code: 'CMOS ON CHIP', note: 'photoresist · 4 metal layers · 6T' },
  ],
  duration: 16,
};

export const EPILOGUE = {
  kicker: 'EPILOGUE',
  quote: 'We built this machine to etch silicon. Somewhere along the way, we taught it to read a body.',
  credits: [
    { role: 'SUBJECT', value: 'Organic electrochemical transistors · oxide semiconductors · bioelectronic sensors' },
    { role: 'METHOD', value: 'Charge, ions and atoms — the same physics, from wafer to sensor' },
    { role: 'VISUALS', value: 'Everything on this page is procedural: geometry, materials and simulation' },
    { role: 'SITE', value: 'Lokesh Kumar, PhD — Department of Physics, NIT Calicut' },
  ],
};
