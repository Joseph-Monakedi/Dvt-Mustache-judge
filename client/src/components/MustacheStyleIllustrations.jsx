import React from 'react';

/**
 * Authentic Brovember Movember Mzansi Style Guide SVG Silhouettes
 * Accurately matching the 6 official styles from the Brovember Moustache Style Guide.
 */

export function LarnieSvg({ className = 'w-full h-auto', fill = 'currentColor', stroke = 'currentColor' }) {
  return (
    <svg viewBox="0 0 320 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="The Larnie Mustache">
      {/* Upper arched body with curled tips */}
      <path
        d="M160 62 C142 54 116 42 78 46 C52 48 34 58 26 72 C18 84 24 98 38 100 C52 102 64 90 62 76 C60 62 44 60 36 66 C28 72 26 82 32 88"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M160 62 C178 54 204 42 242 46 C268 48 286 58 294 72 C302 84 296 98 282 100 C268 102 256 90 258 76 C260 62 276 60 284 66 C292 72 294 82 288 88"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Solid sculpted wings */}
      <path
        d="M160 52 C135 34 85 36 50 56 C32 66 22 78 28 92 C34 104 50 102 60 90 C68 80 62 66 48 64 C36 62 28 74 34 84 C38 88 44 88 46 84 C48 78 40 74 36 78
           C46 54 90 48 124 58 C138 62 152 70 160 78
           C168 70 182 62 196 58 C230 48 274 54 284 78 C280 74 272 78 274 84 C276 88 282 88 286 84 C292 74 284 62 272 64 C258 66 252 80 260 90 C270 102 286 104 292 92 C298 78 288 66 270 56 C235 36 185 34 160 52 Z"
        fill={fill}
      />
      {/* Lower contour fill layer */}
      <path
        d="M160 70 C138 60 102 58 68 74 C50 82 44 94 54 96 C64 98 72 88 74 80 C86 64 126 62 160 76 C194 62 234 64 246 80 C248 88 256 98 266 96 C276 94 270 82 252 74 C218 58 182 60 160 70 Z"
        fill={fill}
        opacity="0.85"
      />
    </svg>
  );
}

export function FrenchCutSvg({ className = 'w-full h-auto', fill = 'currentColor', stroke = 'currentColor' }) {
  return (
    <svg viewBox="0 0 320 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="The French-Cut Mustache">
      {/* Left fine pencil blade */}
      <path
        d="M150 46 C124 44 90 44 56 40 C34 37 18 32 8 26 C16 34 36 43 62 47 C96 52 130 51 150 49 Z"
        fill={fill}
      />
      <path
        d="M150 46 C124 44 90 44 56 40 C34 37 18 32 8 26"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right fine pencil blade */}
      <path
        d="M170 46 C196 44 230 44 264 40 C286 37 302 32 312 26 C304 34 284 43 258 47 C224 52 190 51 170 49 Z"
        fill={fill}
      />
      <path
        d="M170 46 C196 44 230 44 264 40 C286 37 302 32 312 26"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Lower hairline definition line */}
      <path
        d="M148 53 C116 53 78 51 44 45 C30 42 16 38 10 33 C24 42 50 51 86 54 C112 56 138 55 148 54 Z"
        fill={fill}
        opacity="0.9"
      />
      <path
        d="M172 53 C204 53 242 51 276 45 C290 42 304 38 310 33 C296 42 270 51 234 54 C208 56 182 55 172 54 Z"
        fill={fill}
        opacity="0.9"
      />
    </svg>
  );
}

export function UpperLipSvg({ className = 'w-full h-auto', fill = 'currentColor' }) {
  return (
    <svg viewBox="0 0 320 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="The Upper-Lip Mustache">
      {/* Tier 1 - Top chevron dome */}
      <path
        d="M160 22 C134 22 98 32 64 48 C42 58 26 72 16 86 C32 80 56 68 84 56 C114 44 142 38 160 38 C178 38 206 44 236 56 C264 68 288 80 304 86 C294 72 278 58 256 48 C222 32 186 22 160 22 Z"
        fill={fill}
      />
      {/* Tier 2 - Main mid-body chevron */}
      <path
        d="M160 44 C132 44 94 56 62 72 C42 82 28 94 18 106 C36 98 62 84 94 72 C122 62 146 58 160 58 C174 58 198 62 226 72 C258 84 284 98 302 106 C292 94 278 82 258 72 C226 56 188 44 160 44 Z"
        fill={fill}
      />
      {/* Tier 3 - Bottom foundation bristle sweep */}
      <path
        d="M160 66 C136 66 100 78 72 92 C54 100 42 110 34 118 C52 110 76 98 106 88 C130 80 150 78 160 78 C170 78 190 80 214 88 C244 98 268 110 286 118 C278 110 266 100 248 92 C220 78 184 66 160 66 Z"
        fill={fill}
      />
    </svg>
  );
}

export function BuffaloSvg({ className = 'w-full h-auto', fill = 'currentColor' }) {
  return (
    <svg viewBox="0 0 320 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="The Buffalo Mustache">
      {/* Horn upper arc top line */}
      <path
        d="M160 58 C140 58 110 64 78 62 C50 60 28 48 10 28 C16 46 36 68 64 76 C94 84 130 76 160 76 C190 76 226 84 256 76 C284 68 304 46 310 28 C292 48 270 60 242 62 C210 64 180 58 160 58 Z"
        fill={fill}
      />
      {/* Middle horn sweep */}
      <path
        d="M160 72 C138 72 108 78 78 80 C48 82 28 72 16 56 C22 72 44 90 74 96 C104 102 136 92 160 92 C184 92 216 102 246 96 C276 90 298 72 304 56 C292 72 272 82 242 80 C212 78 182 72 160 72 Z"
        fill={fill}
      />
      {/* Bottom curved flare */}
      <path
        d="M160 88 C138 88 112 94 86 98 C60 102 42 96 30 84 C38 98 58 110 84 114 C112 118 140 108 160 108 C180 108 208 118 236 114 C262 110 282 98 290 84 C278 96 260 102 234 98 C208 94 182 88 160 88 Z"
        fill={fill}
      />
    </svg>
  );
}

export function ChopsSvg({ className = 'w-full h-auto', fill = 'currentColor' }) {
  return (
    <svg viewBox="0 0 320 180" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="The Chops Mustache">
      {/* Left Chop Arch & Vertical Drop */}
      <path
        d="M148 42 C120 42 90 46 72 62 C58 74 54 94 54 126 C54 148 52 166 48 174 C58 172 68 160 70 140 C72 114 74 90 86 78 C96 68 118 64 148 64 Z"
        fill={fill}
      />
      <path
        d="M146 24 C110 24 74 30 52 50 C34 66 30 92 30 132 C30 156 26 172 18 178 C30 178 42 164 46 142 C50 110 52 80 68 64 C82 50 110 44 146 44 Z"
        fill={fill}
      />
      {/* Right Chop Arch & Vertical Drop */}
      <path
        d="M172 42 C200 42 230 46 248 62 C262 74 266 94 266 126 C266 148 268 166 272 174 C262 172 252 160 250 140 C248 114 246 90 234 78 C224 68 202 64 172 64 Z"
        fill={fill}
      />
      <path
        d="M174 24 C210 24 246 30 268 50 C286 66 290 92 290 132 C290 156 294 172 302 178 C290 178 278 164 274 142 C270 110 268 80 252 64 C238 50 210 44 174 44 Z"
        fill={fill}
      />
      {/* Inner drop contour */}
      <path
        d="M148 54 C128 54 104 58 92 68 C82 78 80 96 80 124 C80 144 78 158 74 166 C80 162 86 150 88 134 C90 112 92 90 100 82 C108 74 124 70 148 70 Z"
        fill={fill}
        opacity="0.8"
      />
      <path
        d="M172 54 C192 54 216 58 228 68 C238 78 240 96 240 124 C240 144 242 158 246 166 C240 162 234 150 232 134 C230 112 228 90 220 82 C212 74 196 70 172 70 Z"
        fill={fill}
        opacity="0.8"
      />
    </svg>
  );
}

export function WhaleTaleSvg({ className = 'w-full h-auto', fill = 'currentColor' }) {
  return (
    <svg viewBox="0 0 320 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="The Whale Tale Mustache">
      {/* Top tiered fluke arch */}
      <path
        d="M160 26 C136 26 108 34 82 46 C60 56 42 68 28 80 C44 74 68 64 96 56 C122 48 144 44 160 44 C176 44 198 48 224 56 C252 64 276 74 292 80 C278 68 260 56 238 46 C212 34 184 26 160 26 Z"
        fill={fill}
      />
      {/* Mid tier with flared flukes */}
      <path
        d="M160 48 C132 48 100 58 72 72 C48 84 30 96 16 108 C34 100 62 88 94 78 C122 70 146 66 160 66 C174 66 198 70 226 78 C258 88 286 100 304 108 C290 96 272 84 248 72 C220 58 188 48 160 48 Z"
        fill={fill}
      />
      {/* Bottom tier base */}
      <path
        d="M160 70 C136 70 106 80 82 92 C60 102 44 112 34 120 C50 114 74 104 102 96 C126 90 146 88 160 88 C174 88 194 90 218 96 C246 104 270 114 286 120 C276 112 260 102 238 92 C214 80 184 70 160 70 Z"
        fill={fill}
      />
    </svg>
  );
}

/**
 * Universal component that returns the corresponding SVG for any style name
 */
export default function MustacheSilhouette({ styleName = '', className = 'w-full h-auto', fill = 'currentColor', stroke = 'currentColor' }) {
  const norm = (styleName || '').toLowerCase().replace(/['’]/g, '');
  
  if (norm.includes('larnie')) {
    return <LarnieSvg className={className} fill={fill} stroke={stroke} />;
  }
  if (norm.includes('french') || norm.includes('french-cut')) {
    return <FrenchCutSvg className={className} fill={fill} stroke={stroke} />;
  }
  if (norm.includes('upper') || norm.includes('upper-lip') || norm.includes('chevron')) {
    return <UpperLipSvg className={className} fill={fill} />;
  }
  if (norm.includes('buffalo')) {
    return <BuffaloSvg className={className} fill={fill} />;
  }
  if (norm.includes('chops')) {
    return <ChopsSvg className={className} fill={fill} />;
  }
  if (norm.includes('whale') || norm.includes('whale tale') || norm.includes('whale-tail')) {
    return <WhaleTaleSvg className={className} fill={fill} />;
  }

  // Fallback to Upper Lip / Classic
  return <UpperLipSvg className={className} fill={fill} />;
}
