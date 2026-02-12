import { FieldProps } from '@kaoto/forms';
import { FunctionComponent } from 'react';

import { ArrayBadgesField } from './ArrayBadgesField';

export const CustomMediaTypes: FunctionComponent<FieldProps> = (props) => {
  return <ArrayBadgesField {...props} placeholder="Add media type (e.g., application/vnd.api+json)" />;
};
