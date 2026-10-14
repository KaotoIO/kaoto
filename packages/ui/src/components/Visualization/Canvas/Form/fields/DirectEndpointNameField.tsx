import { FieldProps } from '@kaoto/forms';
import { FunctionComponent } from 'react';

import { EndpointNameField } from './EndpointNameField';

export const DirectEndpointNameField: FunctionComponent<FieldProps> = (props) => (
  <EndpointNameField {...props} scheme="direct" />
);
