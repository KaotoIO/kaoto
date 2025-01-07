import { LabelProps } from '@patternfly/react-core';

export const getTagColor = (tag: string): LabelProps['color'] => {
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
