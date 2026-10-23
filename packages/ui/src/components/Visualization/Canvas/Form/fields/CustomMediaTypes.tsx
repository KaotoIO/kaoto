import { ArrayBadgesField, FieldProps } from '@kaoto/forms';
import { FunctionComponent } from 'react';

export const CustomMediaTypes: FunctionComponent<FieldProps> = (props) => {
  return <ArrayBadgesField {...props} placeholder="Add media type (e.g., application/vnd.api+json)" />;
};
