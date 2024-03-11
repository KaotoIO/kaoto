import { FunctionComponent } from 'react';
import { RestConfigurationEditor } from '.';
import { RestServicesEditor } from './RestServicesEditor';
import { RestOperationsEditor } from './RestOperationsEditor';

export const RestEditor: FunctionComponent = () => {
  return (
    <>
      <RestConfigurationEditor />
      <br />
      <RestServicesEditor />
      <br />
      <RestOperationsEditor />
    </>
  );
};
