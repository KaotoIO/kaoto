export const doTruncateLabel = (label: string | undefined): string | undefined => {
  if (label === undefined) return;

  return label.length > 15 ? label.substring(0, 12) + '...' : label;
};
