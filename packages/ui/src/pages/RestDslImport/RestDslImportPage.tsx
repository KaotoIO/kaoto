import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Links } from '../../router/links.models';
import { RestDslImportWizard } from './RestDslImportWizard';

export const RestDslImportPage: FunctionComponent = () => {
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    navigate(Links.Home);
  }, [navigate]);

  const handleGoToDesigner = useCallback(() => {
    navigate(Links.Home);
  }, [navigate]);

  return (
    <>
      <Title headingLevel="h1">Import OpenAPI</Title>
      <RestDslImportWizard onClose={handleClose} onGoToDesigner={handleGoToDesigner} />
    </>
  );
};
