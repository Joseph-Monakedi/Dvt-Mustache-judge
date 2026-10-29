import React from 'react';

/**
 * Authentic Movember Moustache Style Guide Images
 * Extracted directly from the official uploaded style guide document.
 */

export const STYLE_IMAGES = {
  'the-larnie': '/styles/the-larnie.png',
  'the-french-cut': '/styles/the-french-cut.png',
  'the-upper-lip': '/styles/the-upper-lip.png',
  'the-buffalo': '/styles/the-buffalo.png',
  'the-chops': '/styles/the-chops.png',
  'the-whale-tale': '/styles/the-whale-tale.png'
};

export function getStyleImage(styleName = '') {
  const norm = (styleName || '').toLowerCase().replace(/['’\s-]/g, '');
  if (norm.includes('larnie')) return STYLE_IMAGES['the-larnie'];
  if (norm.includes('french')) return STYLE_IMAGES['the-french-cut'];
  if (norm.includes('upper') || norm.includes('chevron')) return STYLE_IMAGES['the-upper-lip'];
  if (norm.includes('buffalo')) return STYLE_IMAGES['the-buffalo'];
  if (norm.includes('chops')) return STYLE_IMAGES['the-chops'];
  if (norm.includes('whale')) return STYLE_IMAGES['the-whale-tale'];
  return STYLE_IMAGES['the-upper-lip'];
}

export function LarnieSvg({ className = 'w-full h-auto', alt = 'The Larnie' }) {
  return (
    <img 
      src={STYLE_IMAGES['the-larnie']} 
      alt={alt} 
      className={`object-contain max-h-full max-w-full select-none ${className}`} 
      loading="lazy" 
    />
  );
}

export function FrenchCutSvg({ className = 'w-full h-auto', alt = 'The French-Cut' }) {
  return (
    <img 
      src={STYLE_IMAGES['the-french-cut']} 
      alt={alt} 
      className={`object-contain max-h-full max-w-full select-none ${className}`} 
      loading="lazy" 
    />
  );
}

export function UpperLipSvg({ className = 'w-full h-auto', alt = 'The Upper-Lip' }) {
  return (
    <img 
      src={STYLE_IMAGES['the-upper-lip']} 
      alt={alt} 
      className={`object-contain max-h-full max-w-full select-none ${className}`} 
      loading="lazy" 
    />
  );
}

export function BuffaloSvg({ className = 'w-full h-auto', alt = 'The Buffalo' }) {
  return (
    <img 
      src={STYLE_IMAGES['the-buffalo']} 
      alt={alt} 
      className={`object-contain max-h-full max-w-full select-none ${className}`} 
      loading="lazy" 
    />
  );
}

export function ChopsSvg({ className = 'w-full h-auto', alt = 'The Chops' }) {
  return (
    <img 
      src={STYLE_IMAGES['the-chops']} 
      alt={alt} 
      className={`object-contain max-h-full max-w-full select-none ${className}`} 
      loading="lazy" 
    />
  );
}

export function WhaleTaleSvg({ className = 'w-full h-auto', alt = 'The Whale Tale' }) {
  return (
    <img 
      src={STYLE_IMAGES['the-whale-tale']} 
      alt={alt} 
      className={`object-contain max-h-full max-w-full select-none ${className}`} 
      loading="lazy" 
    />
  );
}

/**
 * Universal component that returns the corresponding authentic image for any style name
 */
export default function MustacheSilhouette({ styleName = '', className = 'w-full h-auto', alt }) {
  const imgSrc = getStyleImage(styleName);
  return (
    <img 
      src={imgSrc} 
      alt={alt || styleName || 'Moustache Style'} 
      className={`object-contain max-h-full max-w-full select-none ${className}`}
      loading="lazy"
    />
  );
}
