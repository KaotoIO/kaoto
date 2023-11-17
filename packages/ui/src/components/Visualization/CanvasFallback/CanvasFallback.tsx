import { Bullseye, EmptyState, EmptyStateBody, EmptyStateHeader, EmptyStateIcon } from '@patternfly/react-core';
import { EyeSlashIcon } from '@patternfly/react-icons';

export const CanvasFallback = () => {
  return (
    <Bullseye>
      <EmptyState>
        <EmptyStateHeader
          titleText="The provided source code cannot be shown"
          headingLevel="h4"
          icon={<EmptyStateIcon icon={EyeSlashIcon} />}
        />
        <EmptyStateBody>
          <p>It might be that the source code is not available, or that the source code is not valid.</p>
          <br />
          <p>Try to go back to the source code and check if the source code is valid.</p>
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};
