import NavIcon, { type NavName } from './NavIcon';

export type ScreenId = 'battle' | 'gear' | 'forge' | 'arena' | 'menu';

const ITEMS: { id: ScreenId; label: string; icon: NavName }[] = [
  { id: 'battle', label: 'BATTLE', icon: 'battle' },
  { id: 'gear', label: 'GEAR', icon: 'gear' },
  { id: 'forge', label: 'FORGE', icon: 'forge' },
  { id: 'arena', label: 'ARENA', icon: 'arena' },
  { id: 'menu', label: 'MENU', icon: 'menu' },
];

interface Props {
  active: ScreenId;
  onChange: (id: ScreenId) => void;
  /** Tabs holding something the player can claim or run right now. */
  alerts?: ScreenId[];
}

/** Persistent comic tab bar; every section is its own page behind it. */
export default function Dock({ active, onChange, alerts = [] }: Props) {
  return (
    <nav className="dock" aria-label="Sections">
      {ITEMS.map((item) => {
        const alert = alerts.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`dock-btn dock-${item.id}${active === item.id ? ' on' : ''}`}
            aria-current={active === item.id ? 'page' : undefined}
            aria-label={alert ? `${item.label} (ready)` : item.label}
            onClick={() => onChange(item.id)}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
            {alert && <span className="dock-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}
