import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ArrowLeftIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { Links } from '../../../router/links.models';
import { useComponentLink } from '../../../hooks/ComponentLink';

export const ReturnToSourceCodeFallback = () => {
  const backLink = useComponentLink(Links.SourceCode);

  return (
    <Bullseye>
      <EmptyState headingLevel="h4" icon={EyeSlashIcon} titleText="The provided source code cannot be shown">
        <EmptyStateBody>
          <p>It might be that the source code is not available, or that the source code is not valid.</p>
          <br />
          <p>Try to go back to the source code and check if the source code is valid.</p>
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" component={backLink} icon={<ArrowLeftIcon />}>
              Go to the source code
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};
