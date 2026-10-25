import { itemIconPaths } from '../data/itemIcons';
import type { Slot } from '../sim/types';

interface Props {
  slot: Slot;
  name: string;
  size?: number;
}

export default function ItemIcon({ slot, name, size = 32 }: Props) {
  const paths = itemIconPaths(slot, name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((path) => (
        <path key={path.color} d={path.d} fill={path.color} />
      ))}
    </svg>
  );
}
