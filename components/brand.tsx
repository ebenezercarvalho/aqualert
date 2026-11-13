import React from 'react';

// Palette sampled from the "Semana da Inovação 2026" artwork
export const PALETTE = {
  navy: '#1F3A6D',
  navyDeep: '#132342',
  navySoft: '#2D4E8E',
  orange: '#EE7A3B',
  orangeSoft: '#FDF0E8',
  yellow: '#F8C14A',
  yellowSoft: '#FEF9ED',
  green: '#5C9234',
  greenSoft: '#F1F7EC',
  teal: '#4BAAB0',
  tealSoft: '#EBF6F7',
  card: '#FFFFFF',
  ink: '#1E293B',
  inkSoft: '#64748B',
  border: '#E2E8F0',
} as const;

export type BrandColor = 'navy' | 'orange' | 'yellow' | 'green' | 'teal';

export const BRAND_BG: Record<BrandColor, string> = {
  navy: PALETTE.navy,
  orange: PALETTE.orange,
  yellow: PALETTE.yellow,
  green: PALETTE.green,
  teal: PALETTE.teal,
};

export const BRAND_SOFT_BG: Record<BrandColor, string> = {
  navy: PALETTE.navySoft,
  orange: PALETTE.orangeSoft,
  yellow: PALETTE.yellowSoft,
  green: PALETTE.greenSoft,
  teal: PALETTE.tealSoft,
};

// Irregular, cut-paper shapes like the ones in the artwork
export const SHAPES = {
  a: 'polygon(8% 0%, 70% 3%, 100% 22%, 96% 78%, 72% 100%, 18% 96%, 0% 70%, 2% 18%)',
  b: 'polygon(25% 0%, 80% 6%, 100% 40%, 92% 85%, 55% 100%, 12% 92%, 0% 50%, 6% 12%)',
  c: 'polygon(15% 5%, 60% 0%, 95% 15%, 100% 60%, 80% 95%, 35% 100%, 3% 80%, 0% 35%)',
  d: 'polygon(30% 0%, 100% 8%, 96% 70%, 70% 100%, 6% 92%, 0% 30%)',
  banner: 'polygon(0% 3%, 94% 0%, 100% 50%, 92% 100%, 0% 97%)',
  leaf: 'polygon(0% 0%, 64% 8%, 100% 100%, 22% 92%)',
} as const;

export type ShapeKey = keyof typeof SHAPES;

interface BlobProps {
  color: string;
  shape?: ShapeKey;
  round?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Clean shape matching the playful geometric inspiration of the event artwork */
export const Blob: React.FC<BlobProps> = ({ color, shape = 'a', round, className = '', style, children }) => (
  <div
    className={`transition-transform duration-300 ${className}`}
    style={{
      backgroundColor: color,
      clipPath: round ? undefined : SHAPES[shape],
      borderRadius: round ? '50%' : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

// Letter rhythm that mimics the hand-lettered "Inovação"
const SIZE = [1.2, 0.92, 1.05, 0.94, 1.08, 0.96, 1.06, 0.98];
const ROT = [-3, 2, -1.5, 2.5, -2, 1.5, -2, 1.5];
const LIFT = [0, -0.04, 0.02, -0.02, 0.02, -0.03, 0.01, -0.01];

interface PlayfulTextProps {
  text: string;
  className?: string;
  emphasis?: number[];
}

/** Bouncy hand-lettered word, in the exact style of "Inovação" from the event artwork. */
export const PlayfulText: React.FC<PlayfulTextProps> = ({ text, className = '', emphasis = [] }) => (
  <span className={`font-display font-extrabold inline-flex items-end leading-[0.9] ${className}`}>
    <span className="sr-only">{text}</span>
    {Array.from(text).map((ch, i) =>
      ch === ' ' ? (
        <span key={i} aria-hidden="true" style={{ width: '0.28em' }} />
      ) : (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block transition-transform duration-300 hover:-translate-y-1"
          style={{
            fontSize: `${emphasis.includes(i) ? 1.25 : SIZE[i % SIZE.length]}em`,
            transform: `rotate(${ROT[i % ROT.length]}deg) translateY(${LIFT[i % LIFT.length]}em)`,
          }}
        >
          {ch}
        </span>
      )
    )}
  </span>
);

/** Two overlapping speech bubbles (teal + yellow) from the artwork. */
export const SpeechBubbles: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 100" className={className} aria-hidden="true">
    <path d="M18 8h70a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14H50l-16 12 3-12H18A14 14 0 0 1 4 40V22A14 14 0 0 1 18 8Z" fill={PALETTE.teal} />
    <path d="M64 46h34a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12h-4l2 12-14-12H64a12 12 0 0 1-12-12V58a12 12 0 0 1 12-12Z" fill={PALETTE.yellow} />
  </svg>
);

/** AQUALERT mark: clean, modern droplet with water waves and telemetry dots. */
export const AqualertLogo: React.FC<{ size?: number; className?: string }> = ({ size = 44, className = '' }) => {
  const rawId = React.useId();
  const gradId = `aquaGrad-${rawId.replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1F3A6D" />
          <stop offset="100%" stopColor="#132342" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradId})`} />
      <path d="M32 11C32 11 19 28 19 38.5a13 13 0 0 0 26 0C45 28 32 11 32 11Z" fill="#FFFFFF" />
      <path d="M23 40q4.5-4 9 0t9 0" stroke={PALETTE.teal} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M25 45q3.5-3 7 0t7 0" stroke={PALETTE.orange} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="27" r="2.8" fill={PALETTE.yellow} />
    </svg>
  );
};

/** Professional clean card with crisp borders and soft elevation */
export const PaperCard: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode; as?: 'div' | 'section' | 'article' }> = ({
  className = '',
  style,
  children,
  as: Tag = 'div',
}) => (
  <Tag style={style} className={`clean-card rounded-2xl ${className}`}>
    {children}
  </Tag>
);

/** Section title with an alert dot. */
export const SectionKicker: React.FC<{ color?: BrandColor; children: React.ReactNode }> = ({ color = 'orange', children }) => (
  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_BG[color] }} />
    {children}
  </span>
);
