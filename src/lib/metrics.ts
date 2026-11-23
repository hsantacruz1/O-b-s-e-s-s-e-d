import type { MetricDef } from './types';

export type MetricMode = 'total' | 'higher' | 'lower';

export function metricMode(m: Pick<MetricDef, 'kind' | 'lowerIsBetter'>): MetricMode {
  if (m.kind === 'count') return 'total';
  return m.lowerIsBetter ? 'lower' : 'higher';
}

export const MODE_LABEL: Record<MetricMode, string> = { total: 'Σ adds up', higher: '↑ higher wins', lower: '↓ lower wins' };
export const MODE_HINT: Record<MetricMode, string> = {
  total: 'Counts add up over time (songs, pages, miles)',
  higher: 'A reading where bigger is better (bench press)',
  lower: 'A reading where smaller is better (mile time)',
};

export function nextMode(m: MetricMode): Pick<MetricDef, 'kind' | 'lowerIsBetter'> {
  if (m === 'total') return { kind: 'measure', lowerIsBetter: false };
  if (m === 'higher') return { kind: 'measure', lowerIsBetter: true };
  return { kind: 'count', lowerIsBetter: false };
}
