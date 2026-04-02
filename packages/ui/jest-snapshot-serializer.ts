// Custom snapshot serializer to normalize PatternFly dynamic IDs
// This ensures consistent snapshots by replacing dynamic IDs with static placeholders

import type { Config, NewPlugin, Refs } from 'pretty-format';

export const test = (val: unknown): boolean => {
  return typeof val === 'string' && (/pf-\d+[a-z0-9]+/.test(val) || /OUIA-Generated-Switch-\d+/.test(val));
};

export const serialize: NewPlugin['serialize'] = (
  val: string,
  config: Config,
  indentation: string,
  depth: number,
  refs: Refs,
  printer: (val: unknown, config: Config, indentation: string, depth: number, refs: Refs) => string,
): string => {
  // Replace PatternFly IDs (e.g., pf-17751366401919f0qru5zje9) with normalized IDs
  let normalized = val.replace(/pf-\d+[a-z0-9]+/g, 'pf-normalized-id');
  // Replace OUIA component IDs (e.g., OUIA-Generated-Switch-6) with normalized IDs
  normalized = normalized.replace(/OUIA-Generated-Switch-\d+/g, 'OUIA-Generated-Switch-normalized');
  return printer(normalized, config, indentation, depth, refs);
};
