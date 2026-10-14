import { FieldProps } from '@kaoto/forms';
import { FunctionComponent } from 'react';

import { EndpointNameField } from './DirectEndpointNameField';

export const SedaEndpointNameField: FunctionComponent<FieldProps> = (props) => (
  <EndpointNameField {...props} scheme="seda" />
);
