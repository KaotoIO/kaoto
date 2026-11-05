import { ArrowLeft, WarningFilled } from '@carbon/icons-react';
import { Bullseye, Button, EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { useRouteError } from 'react-router';

import { useComponentLink } from '../hooks/ComponentLink';
import { Links } from '../router/links.models';

export const ErrorPage: FunctionComponent = () => {
  const backLink = useComponentLink(Links.Home);
  const error = useRouteError() as { statusText?: string; message: string };
  console.error(error);

  return (
    <Bullseye id="error-page">
      <EmptyState
        headingLevel="h2"
        icon={WarningFilled}
        status="danger"
        titleText="Sorry, an error occured"
        variant={EmptyStateVariant.sm}
      >
        <EmptyStateBody>
          <p>Trying to load the previous page led to the following error:</p>
          <p className="pf-u-font-family-monospace"> {error.statusText || error.message}</p>
          <br />

          <Button variant="primary" component={backLink} icon={<ArrowLeft />}>
            Return home
          </Button>
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};
