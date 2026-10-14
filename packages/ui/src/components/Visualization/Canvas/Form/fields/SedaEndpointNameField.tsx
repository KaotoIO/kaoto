import { FieldProps } from '@kaoto/forms';
import { FunctionComponent } from 'react';

import { EndpointNameField } from './EndpointNameField';

export const SedaEndpointNameField: FunctionComponent<FieldProps> = (props) => (
  <EndpointNameField {...props} scheme="seda" />
);
