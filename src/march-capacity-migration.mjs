import {normalizeActiveBearPlan} from './bear-plan-defaults.mjs';
// Saved capacities are archived, never converted into active deployment counts.
export const normalizeMarchCapacities=profile=>normalizeActiveBearPlan(profile);
