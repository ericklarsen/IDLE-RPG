import { PACING_STAGES, simulatePacing, type PacingPolicy } from '../src/sim/pacing';
import type { WingId } from '../src/sim/types';

const HOURS = Number(process.env.HOURS ?? 12);
const POLICY = process.env.POLICY as PacingPolicy | undefined;
const SEED = process.env.SEED ? Number(process.env.SEED) : undefined;
// WING=stormpinions:12 wears a maxed wing for power regression checks.
const WING = process.env.WING
  ? {
      id: process.env.WING.split(':')[0] as WingId,
      level: Number(process.env.WING.split(':')[1] ?? 1),
    }
  : undefined;

function time(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(2)}h`;
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

const runs = POLICY
  ? [{ policy: POLICY, seed: SEED ?? 1 }]
  : [
      { policy: 'engaged' as const, seed: 1 },
      { policy: 'engaged' as const, seed: 2 },
      { policy: 'engaged' as const, seed: 3 },
      { policy: 'casual' as const, seed: 1 },
      { policy: 'idle' as const, seed: 1 },
    ];

for (const run of runs) {
  const result = simulatePacing({
    policy: run.policy,
    seed: run.seed,
    seconds: HOURS * 3600,
    wing: WING,
  });

  console.log(`\n${run.policy} · seed ${run.seed} · ${HOURS}h limit`);
  console.log(
    PACING_STAGES.map(
      (stage) => `stage ${stage}: ${time(result.reached[stage])}`,
    ).join('  |  '),
  );
  console.log(
    `first kill ${time(result.firstKill)} · first enhance ${time(result.firstEnhance)} · ` +
      `final stage ${result.final.stage} · lvl ${result.final.level} · ` +
      `atk ${result.final.atk} · gear ${result.final.gearScore} · ` +
      `dust ${fmt(result.final.dust)} · surge ${(result.surgeUptime * 100).toFixed(1)}%`,
  );
  if (result.offline) {
    console.log(
      `8h offline at stage ${result.final.stage}: ${result.offline.kills} kills · ` +
        `${fmt(result.offline.gold)} gold · ${fmt(result.offline.exp)} exp · ` +
        `+${result.offline.levels} levels · ${result.offline.drops} drops`,
    );
  }
}
