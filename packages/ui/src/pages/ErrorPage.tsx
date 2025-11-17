import './ErrorPage.scss';

import { Bullseye, Button, EmptyState, EmptyStateBody, EmptyStateVariant, Icon } from '@patternfly/react-core';
import { ArrowLeftIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-left-icon';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { FunctionComponent } from 'react';
import { useRouteError } from 'react-router-dom';

import { useComponentLink } from '../hooks/ComponentLink';
import { Links } from '../router/links.models';

const ErrorIcon: FunctionComponent = () => (
  <Icon className="error__icon" status="danger" size="xl">
    <ExclamationCircleIcon />
  </Icon>
);

export const ErrorPage: FunctionComponent = () => {
  const backLink = useComponentLink(Links.Home);
  const error = useRouteError() as { statusText?: string; message: string };
  console.error(error);

  return (
    <Bullseye id="error-page">
      <EmptyState headingLevel="h2" icon={ErrorIcon} titleText="Sorry, an error occured" variant={EmptyStateVariant.sm}>
        <EmptyStateBody>
          <p>Trying to load the previous page led to the following error:</p>
          <p className="pf-u-font-family-monospace"> {error.statusText || error.message}</p>
          <br />

          <Button variant="primary" component={backLink} icon={<ArrowLeftIcon />}>
            Return home
          </Button>
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};
