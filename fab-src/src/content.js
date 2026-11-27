/**
 * Narrative copy for "THE CHANNEL".
 * `mono` spans render as technical monospace accents inside a beat.
 * Beats are anchored to the global scroll progress [0..1].
 */

export const TITLE_CARD = {
  eyebrow: 'NEUROMORPHIC BIOELECTRONICS & SEMICONDUCTOR PHYSICS',
  title: 'NBL',
  subtitle: 'Neuromorphic Bioelectronics Lab — light, etch and layer, and the sensors they become.',
  hint: 'SCROLL TO DESCEND',
  ctas: [
    { href: 'research.html', label: 'Research' },
    { href: '#lab', label: 'Enter the lab' },
  ],
};

export const SECTION_LABELS = [
  { at: 0.02, text: 'I · ENTRY' },
  { at: 0.31, text: 'II · THE CHANNEL' },
  { at: 0.62, text: 'III · EPILOGUE' },
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
    start: 0.305, dur: 0.030, side: 'left', depth: 220, kicker: '01 — LIGHT',
    words: [['Every device begins as ', ''], ['light', 'mono'], [' striking a mask — the same step that prints a CMOS chip.', '']],
  },
  {
    start: 0.337, dur: 0.030, side: 'right', depth: -180, kicker: '02 — PRINTED SYNAPSES',
    words: [
      ['At NBL the channel is printed, not etched away: a fully ', ''], ['screen-printed OECT', 'mono'],
      [' on flexible film that reproduces the memory of a biological synapse — ', ''],
      ['paired-pulse facilitation', 'mono'], [', short- and long-term plasticity, even logic.', ''],
    ],
  },
  {
    start: 0.369, dur: 0.030, side: 'left', depth: 320, kicker: '03 — ION GEL',
    words: [
      ['A solid ', ''], ['ion-gel', 'mono'],
      [' replaces the oxide, so ions do the gating. Photo-thermally reduced graphene oxide, written by light, switches at ', ''],
      ['low voltage', 'mono'], ['.', ''],
    ],
  },
  {
    start: 0.401, dur: 0.030, side: 'right', depth: -260, kicker: '04 — INTERFACE',
    words: [
      ['The organic electrochemical transistor swells as ', ''], ['ions', 'mono'],
      [' drift into the channel — a body-compatible volume transistor, and a natural artificial synapse.', ''],
    ],
  },
  {
    start: 0.433, dur: 0.030, side: 'left', depth: 180, kicker: '05 — PHD · IIT BOMBAY',
    words: [
      ['The thread began in a PhD on ', ''], ['OECTs for neuromorphic devices and sensors', 'mono'],
      [': one device family, two jobs — compute and sense.', ''],
    ],
  },
  {
    start: 0.465, dur: 0.030, side: 'right', depth: -200, kicker: '06 — BIOSENSING',
    words: [
      ['Immobilise a ', ''], ['protein', 'mono'],
      [' on the same channel and the transistor detects aromatic pollutants in water — and DNA-binding proteins — at ', ''],
      ['ultra-low concentrations', 'mono'], ['.', ''],
    ],
  },
  {
    start: 0.497, dur: 0.032, side: 'center', depth: 260, kicker: '07 — ONE PLATFORM',
    words: [
      ['One fab. One device. Neuromorphic computing and biosensing on the same thin film: ', ''],
      ['a lab for what a transistor can hear, and learn', 'mono'], ['.', ''],
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
/**
 * The cinema runs as one continuous descent — no chapter cards, no cuts, no
 * letterbox. Four seconds: the pacing is carried by the camera, not by
 * chapters.
 */
export const FILM = {
  duration: 5,
};

/**
 * The last movement: not an epilogue but a way out — the rest of the site,
 * set large.
 */
export const END = {
  kicker: 'MORE FROM THIS SITE',
  links: [
    { href: 'about.html', label: 'About', note: 'Profile, expertise, education' },
    { href: 'research.html', label: 'Research', note: 'Themes, milestones, the group' },
    { href: 'publications.html', label: 'Publications', note: 'Papers, preprints, posters' },
    { href: '#lab', label: 'The Lab', note: 'Neuromorphic Bioelectronics Lab (NBL)' },
    { href: 'contact.html', label: 'Contact', note: 'Email, links, collaboration' },
    { href: 'assets/Lokesh_Kumar_CV.pdf', label: 'Download CV', note: 'PDF' },
  ],
  foot: 'Neuromorphic Bioelectronics Lab (NBL) — Dr. Lokesh Kumar, Department of Physics, NIT Calicut',
};
