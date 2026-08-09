/**
 * DORA performance classification levels.
 * Based on Google's 2023 State of DevOps Report.
 */
export enum DoraLevel {
  ELITE  = 'ELITE',
  HIGH   = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW    = 'LOW',
}

export interface DoraThresholds {
  deployFreqPerDay: number;   // minimum deployments/day for this level
  leadTimeHours:    number;   // maximum lead time hours
  cfrPercent:       number;   // maximum change failure rate %
  mttrHours:        number;   // maximum MTTR hours
}

export const DORA_THRESHOLDS: Record<DoraLevel, DoraThresholds> = {
  [DoraLevel.ELITE]: {
    deployFreqPerDay: 1,
    leadTimeHours:    1,
    cfrPercent:       5,
    mttrHours:        1,
  },
  [DoraLevel.HIGH]: {
    deployFreqPerDay: 1 / 7,   // once per week
    leadTimeHours:    24,
    cfrPercent:       10,
    mttrHours:        24,
  },
  [DoraLevel.MEDIUM]: {
    deployFreqPerDay: 1 / 30,  // once per month
    leadTimeHours:    168,      // 1 week
    cfrPercent:       15,
    mttrHours:        168,
  },
  [DoraLevel.LOW]: {
    deployFreqPerDay: 0,
    leadTimeHours:    Infinity,
    cfrPercent:       Infinity,
    mttrHours:        Infinity,
  },
};