export type COLOR = 'blue' | 'cyan' | 'green' | 'orange' | 'purple' | 'red' | 'grey' | 'gold';

export const getTagColor = (tag: string): COLOR => {
  switch (tag.toLowerCase()) {
    case 'stable':
      return 'green';
    case 'preview':
      return 'orange';
    case 'deprecated':
      return 'red';
    case 'component':
    case 'processor':
    case 'kamelet':
      return 'blue';
    default:
      return 'grey';
  }
};
