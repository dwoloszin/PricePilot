// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Bullseye / target icon – matches the "Bem na Mosca" brand.
 * Pass `className` to control size (e.g. "w-5 h-5" or "w-10 h-10").
 * Pass `color="white"` for use on dark/colored backgrounds.
 */
export default function TargetLogo({ className, color = 'color' }) {
  const isWhite = color === 'white';

  const outer  = isWhite ? '#ffffff'   : '#ef4444';
  const mid    = isWhite ? '#ffffff'   : '#ffffff';
  const ring2  = isWhite ? 'rgba(255,255,255,0.55)' : '#ef4444';
  const inner  = isWhite ? '#ffffff'   : '#ffffff';
  const bull   = isWhite ? 'rgba(255,255,255,0.85)' : '#ef4444';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-6 h-6', className)}
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="10.5" fill={outer} fillOpacity={isWhite ? 0.25 : 1} />
      {/* White gap */}
      <circle cx="12" cy="12" r="8"    fill={mid}   />
      {/* Middle red ring */}
      <circle cx="12" cy="12" r="8"    fill={ring2} />
      {/* Inner white gap */}
      <circle cx="12" cy="12" r="5"    fill={inner} />
      {/* Inner red ring */}
      <circle cx="12" cy="12" r="5"    fill={ring2} />
      {/* Bullseye */}
      <circle cx="12" cy="12" r="2.5"  fill={bull}  />

      {/* Crosshair lines */}
      <line x1="12" y1="1"  x2="12" y2="4"  stroke={isWhite ? 'rgba(255,255,255,0.7)' : '#ef4444'} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12" y1="20" x2="12" y2="23" stroke={isWhite ? 'rgba(255,255,255,0.7)' : '#ef4444'} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="1"  y1="12" x2="4"  y2="12" stroke={isWhite ? 'rgba(255,255,255,0.7)' : '#ef4444'} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="20" y1="12" x2="23" y2="12" stroke={isWhite ? 'rgba(255,255,255,0.7)' : '#ef4444'} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
