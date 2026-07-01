export const C = {
  // Design system blues
  blue01:      '#F7FEFF',
  blue02:      '#EDF4FA',
  blue03:      '#E7F9FF',
  blue04:      '#68DBFF',
  primary:     '#027EAC',   // Blue-05
  primaryDark: '#026C98',   // Blue-06
  blue07:      '#015878',
  text:        '#0B3857',   // Blue-09 — headings & primary text
  // Greys
  border:      '#D3E1ED',   // Grey-05
  textLight:   '#A2AEB9',   // Grey-06
  textMuted:   '#677883',   // Grey-07
  // Semantic
  bgLight:     '#E7F9FF',   // Blue-03
  bgRange:     '#E7F9FF',
  placeholder: '#A2AEB9',   // Grey-06
  // Status
  greenBg:     '#EDFFEE',
  green:       '#118819',
  redBg:       '#FCE9ED',
  red:         '#B70808',
  white:       '#FFFFFF',
} as const;

export const NUNITO = 'Nunito, sans-serif';

// Typography helpers (for inline styles)
export const T = {
  h1:         { fontFamily: NUNITO, fontSize: 32, fontWeight: 600, lineHeight: '40px' },
  h2:         { fontFamily: NUNITO, fontSize: 24, fontWeight: 700, lineHeight: '40px' },
  h3:         { fontFamily: NUNITO, fontSize: 18, fontWeight: 700, lineHeight: '32px' },
  blockTitle: { fontFamily: NUNITO, fontSize: 14, fontWeight: 300, lineHeight: '24px' },
  body:       { fontFamily: NUNITO, fontSize: 14, fontWeight: 400, lineHeight: '24px' },
  bodyBold:   { fontFamily: NUNITO, fontSize: 14, fontWeight: 800, lineHeight: '24px' },
  button:     { fontFamily: NUNITO, fontSize: 14, fontWeight: 700, lineHeight: '24px' },
  caption:    { fontFamily: NUNITO, fontSize: 12, fontWeight: 400, lineHeight: '16px' },
  nav:        { fontFamily: NUNITO, fontSize: 24, fontWeight: 500, lineHeight: '32px' },
} as const;
