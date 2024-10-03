export const getJoinPath = (path: string[]) => {
  if (!Array.isArray(path)) {
    return '';
  }

  return path.join('-');
};
