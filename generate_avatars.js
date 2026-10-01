const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'DvtMustacheJudge.Api', 'wwwroot', 'mock-avatars');
fs.mkdirSync(outputDir, { recursive: true });

const avatars = [
  { id: 'thabo', name: 'Thabo M.', color1: '#007FBA', color2: '#003F66', style: 'chevron', label: 'Chevron' },
  { id: 'francois', name: 'Francois v.d.M.', color1: '#9B51E0', color2: '#4A154B', style: 'handlebar', label: 'Handlebar' },
  { id: 'liam', name: 'Liam D.', color1: '#00B4D8', color2: '#0077B6', style: 'painters', label: "Painter's Brush" },
  { id: 'sipho', name: 'Sipho K.', color1: '#F2994A', color2: '#C05621', style: 'walrus', label: 'Walrus' },
  { id: 'johan', name: 'Johan B.', color1: '#EB5757', color2: '#9B2C2C', style: 'horseshoe', label: 'Horseshoe' },
  { id: 'sarah', name: 'Sarah Q.', color1: '#E056FD', color2: '#6807F9', style: 'handlebar', label: 'Handlebar' },
  { id: 'kyle', name: 'Kyle W.', color1: '#27AE60', color2: '#22543D', style: 'pencil', label: 'Pencil' },
  { id: 'naledi', name: 'Naledi T.', color1: '#2D9CDB', color2: '#1A365D', style: 'stubble', label: 'Stubbled Maverick' },
  { id: 'pieter', name: 'Pieter P.', color1: '#4A5568', color2: '#1A202C', style: 'chevron', label: 'Chevron' },
  { id: 'devon', name: 'Devon S.', color1: '#319795', color2: '#234E52', style: 'handlebar', label: 'Handlebar' },
  { id: 'tariq', name: 'Tariq E.', color1: '#D69E2E', color2: '#744210', style: 'painters', label: "Painter's Brush" },
  { id: 'chen', name: 'Chen W.', color1: '#3182CE', color2: '#2B6CB0', style: 'pencil', label: 'Pencil' },
  { id: 'kabelo', name: 'Kabelo Z.', color1: '#DD6B20', color2: '#7B341E', style: 'peachfuzz', label: 'Peach Fuzz' },
  { id: 'marcus', name: 'Marcus V.', color1: '#718096', color2: '#2D3748', style: 'stubble', label: 'Stubbled Maverick' },
  { id: 'andre', name: 'Andre N.', color1: '#ED8936', color2: '#9C4221', style: 'peachfuzz', label: 'Peach Fuzz' }
];

function getMustacheSvg(style) {
  switch (style) {
    case 'chevron':
      return `<path d="M 60,118 Q 80,108 100,112 Q 120,108 140,118 Q 128,135 100,128 Q 72,135 60,118 Z" fill="#2D3748" />`;
    case 'handlebar':
      return `<path d="M 45,115 C 60,95 85,110 100,114 C 115,110 140,95 155,115 C 160,122 150,130 140,124 C 125,118 112,122 100,126 C 88,122 75,118 60,124 C 50,130 40,122 45,115 Z" fill="#1A202C" />`;
    case 'walrus':
      return `<path d="M 55,110 Q 80,105 100,110 Q 120,105 145,110 C 150,135 130,150 100,146 C 70,150 50,135 55,110 Z" fill="#3D2817" />`;
    case 'horseshoe':
      return `<path d="M 65,110 Q 82,105 100,108 Q 118,105 135,110 L 132,150 Q 124,152 120,150 L 122,122 Q 100,120 78,122 L 80,150 Q 76,152 68,150 Z" fill="#23272F" />`;
    case 'pencil':
      return `<path d="M 68,116 Q 84,113 100,115 Q 116,113 132,116 Q 100,119 68,116 Z" stroke="#1A202C" stroke-width="4" stroke-linecap="round" fill="none" />`;
    case 'painters':
      return `<path d="M 62,112 Q 80,108 100,110 Q 120,108 138,112 L 136,128 Q 100,130 64,128 Z" fill="#2B2D42" />`;
    case 'stubble':
      return `
        <ellipse cx="100" cy="120" rx="35" ry="12" fill="none" stroke="#4A5568" stroke-width="1.5" stroke-dasharray="2,3" />
        <ellipse cx="100" cy="122" rx="25" ry="8" fill="none" stroke="#2D3748" stroke-width="2" stroke-dasharray="2,4" />
      `;
    case 'peachfuzz':
      return `
        <ellipse cx="100" cy="118" rx="22" ry="6" fill="none" stroke="#D69E2E" stroke-width="1.5" stroke-dasharray="1,4" opacity="0.85" />
      `;
    default:
      return `<path d="M 65,115 Q 82,108 100,112 Q 118,108 135,115 Q 100,128 65,115 Z" fill="#333" />`;
  }
}

for (const a of avatars) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg-${a.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${a.color1}" />
      <stop offset="100%" stop-color="${a.color2}" />
    </linearGradient>
    <linearGradient id="skin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FBD38D" />
      <stop offset="100%" stop-color="#F6AD55" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="40" fill="url(#bg-${a.id})" />
  <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />
  <!-- Head -->
  <ellipse cx="100" cy="105" rx="52" ry="62" fill="url(#skin)" />
  <!-- Eyes -->
  <circle cx="82" cy="90" r="5" fill="#2D3748" />
  <circle cx="118" cy="90" r="5" fill="#2D3748" />
  <circle cx="84" cy="88" r="1.5" fill="#FFF" />
  <circle cx="120" cy="88" r="1.5" fill="#FFF" />
  <!-- Eyebrows -->
  <path d="M 72,82 Q 82,78 92,82" stroke="#4A5568" stroke-width="3" stroke-linecap="round" fill="none" />
  <path d="M 108,82 Q 118,78 128,82" stroke="#4A5568" stroke-width="3" stroke-linecap="round" fill="none" />
  <!-- Nose -->
  <path d="M 98,92 Q 100,104 95,106 Q 100,108 105,106" stroke="#DD6B20" stroke-width="2.5" stroke-linecap="round" fill="none" />
  <!-- Mustache -->
  ${getMustacheSvg(a.style)}
  <!-- Mouth -->
  <path d="M 88,135 Q 100,142 112,135" stroke="#C53030" stroke-width="2.5" stroke-linecap="round" fill="none" />
  <!-- Badge text -->
  <rect x="25" y="172" width="150" height="20" rx="10" fill="rgba(0,0,0,0.5)" />
  <text x="100" y="186" fill="#FFF" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${a.name}</text>
</svg>`;

  fs.writeFileSync(path.join(outputDir, `${a.id}.svg`), svg, 'utf8');
}
console.log('Generated 15 mock avatar SVGs in ' + outputDir);
