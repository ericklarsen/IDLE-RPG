export type NavName = 'battle' | 'gear' | 'forge' | 'arena' | 'menu';

interface Props {
  name: NavName;
  size?: number;
}

/** Line icons for the dock, drawn to match the ItemGlyph stroke weight. */
export default function NavIcon({ name, size = 20 }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  switch (name) {
    case 'battle':
      return (
        <svg {...props}>
          <path d="M5 19l9-9" />
          <path d="M14 4l6 6-3 3-6-6 3-3z" />
          <path d="M5 19l-1 1" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...props}>
          <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'forge':
      return (
        <svg {...props}>
          <path d="M4 20h9" />
          <path d="M9 20V9l7-5 2 3-7 5" />
          <path d="M4 8l4-2" />
        </svg>
      );
    case 'arena':
      return (
        <svg {...props}>
          <path d="M7 3v18M17 3v18" />
          <path d="M7 6h10M7 12h10" />
          <path d="M3 4h4M17 4h4" />
        </svg>
      );
    case 'menu':
    default:
      return (
        <svg {...props}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}
