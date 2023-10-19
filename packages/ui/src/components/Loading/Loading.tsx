import { Bullseye, Spinner } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren } from 'react';

export const Loading: FunctionComponent<PropsWithChildren> = (props) => {
  return (
    <Bullseye>
      <Spinner size="lg" aria-label="Loading" /> {props.children}
    </Bullseye>
  );
};
