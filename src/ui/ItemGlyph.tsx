import type { Slot } from '../sim/types';

interface Props {
  slot: Slot;
  size?: number;
}

/** Line-art slot placeholders; swap for real item icons when the art pass lands. */
export default function ItemGlyph({ slot, size = 28 }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  switch (slot) {
    case 'weapon':
      return (
        <svg {...props}>
          <path d="M17 3l4 4-10 10-4-4L17 3z" />
          <path d="M7 13l4 4" />
          <path d="M4 20l4-4" />
        </svg>
      );
    case 'helm':
      return (
        <svg {...props}>
          <path d="M5 13a7 7 0 0 1 14 0v4h-3v-4a4 4 0 0 0-8 0v4H5v-4z" />
          <path d="M9 17v3M15 17v3" />
        </svg>
      );
    case 'armor':
      return (
        <svg {...props}>
          <path d="M8 4l4 2 4-2 3 4-2 3v9H7v-9L5 8l3-4z" />
          <path d="M7 12h10" />
        </svg>
      );
    case 'boots':
      return (
        <svg {...props}>
          <path d="M8 4v8l-3 3v5h10v-3l-4-3V4H8z" />
          <path d="M5 20h13" />
        </svg>
      );
    case 'ring':
      return (
        <svg {...props}>
          <circle cx="12" cy="15" r="5" />
          <path d="M9 7l3-3 3 3-3 3-3-3z" />
        </svg>
      );
    case 'amulet':
      return (
        <svg {...props}>
          <path d="M6 3c0 6 2 8 6 8s6-2 6-8" />
          <circle cx="12" cy="16" r="4" />
        </svg>
      );
    default:
      return null;
  }
}
