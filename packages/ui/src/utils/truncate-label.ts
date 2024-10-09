export const doTruncateLabel = (label: string | undefined): string | undefined => {
  if (label === undefined) return;

  return label.length > 18 ? label.substring(0, 15) + '...' : label;
};
