import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { ArrowLeftIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { Links } from '../../../router/links.models';
import { useComponentLink } from '../../../hooks/ComponentLink';

export const CanvasFallback = () => {
  const backLink = useComponentLink(Links.SourceCode);

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
