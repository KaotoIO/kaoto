import { ViewOff } from '@carbon/icons-react';
import { Bullseye, EmptyState, EmptyStateBody } from '@patternfly/react-core';

export const CanvasFallback = () => {
  return (
    <Bullseye>
      <EmptyState headingLevel="h4" icon={ViewOff} titleText="The provided source code cannot be shown">
        <EmptyStateBody>
          <p>It might be that the source code is not available, or that the source code is not valid.</p>
          <br />
          <p>Try to go back to the source code and check if the source code is valid.</p>
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};
