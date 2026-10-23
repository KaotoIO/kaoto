import { ArrowLeft, ViewOff } from '@carbon/icons-react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';

import { useComponentLink } from '../../../hooks/ComponentLink';
import { Links } from '../../../router/links.models';

export const ReturnToSourceCodeFallback = () => {
  const backLink = useComponentLink(Links.SourceCode);

  return (
    <Bullseye>
      <EmptyState headingLevel="h4" icon={ViewOff} titleText="The provided source code cannot be shown">
        <EmptyStateBody>
          <p>It might be that the source code is not available, or that the source code is not valid.</p>
          <br />
          <p>Try to go back to the source code and check if the source code is valid.</p>
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" component={backLink} icon={<ArrowLeft />}>
              Go to the source code
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};
