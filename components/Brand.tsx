import React from 'react';

/**
 * StrataMDT branding.
 *
 * Logo: /public/strata-logo.png (the badge trimmed from StrataMDT.png in the
 * repo root, 256px). The favicon is app/icon.png, made from the same artwork.
 * To change it, replace those files. Set `logo` to null to fall back to the
 * built-in SVG mark. `roleLogos` entries left as null use the Lucide icons.
 */
export const BRAND = {
  name: 'StrataMDT',
  shortName: 'Strata',
  tagline: 'Mobile Data Terminal & Computer-Aided Dispatch',
  logo: '/strata-logo.png' as string | null,
  roleLogos: {
    dispatch: null,
    civilian: null,
    police: null,
    fire: null,
    tow: null,
  } as Record<string, string | null>,
};

/** Layered "strata" mark used until real logo artwork is provided. */
export const BrandMark = ({ size = 32, className = '' }: { size?: number; className?: string }) => {
  if (BRAND.logo) {
    // The badge is detailed, so draw it a little larger than the SVG mark's box
    const px = Math.round(size * 1.3);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={BRAND.logo}
        alt={BRAND.name}
        width={px}
        height={px}
        style={{ height: px, width: px, objectFit: 'contain' }}
        className={`flex-shrink-0 ${className}`}
        draggable={false}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label={BRAND.name}
      className={className}
    >
      <defs>
        <linearGradient id="strata-g1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38c3f8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#0c0f16" stroke="url(#strata-g1)" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M9 25.5 20 31l11-5.5" stroke="#38c3f8" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20 20 25.5 31 20" stroke="#38c3f8" strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9 9 14.5 20 20l11-5.5L20 9Z" fill="url(#strata-g1)" />
    </svg>
  );
};

/** Mark + wordmark. */
export const BrandLockup = ({ size = 32, subtitle }: { size?: number; subtitle?: string }) => (
  <div className="flex items-center gap-3">
    <BrandMark size={size} />
    <div className="leading-tight">
      <div className="font-semibold tracking-tight text-white" style={{ fontSize: Math.max(14, size * 0.5) }}>
        Strata<span className="text-accent-400">MDT</span>
      </div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  </div>
);
