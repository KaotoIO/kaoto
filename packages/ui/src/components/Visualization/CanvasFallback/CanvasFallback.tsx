import { Bullseye, EmptyState, EmptyStateBody,  } from '@patternfly/react-core';
import { EyeSlashIcon } from '@patternfly/react-icons';

export const CanvasFallback = () => {
  return (
    <Bullseye>
      <EmptyState  headingLevel="h4" icon={EyeSlashIcon}  titleText="The provided source code cannot be shown">
        <EmptyStateBody>
          <p>It might be that the source code is not available, or that the source code is not valid.</p>
          <br />
          <p>Try to go back to the source code and check if the source code is valid.</p>
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};
