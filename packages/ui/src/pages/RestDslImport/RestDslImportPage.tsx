import { FunctionComponent, useCallback } from 'react';
import { useNavigate } from 'react-router';

import { Links } from '../../router/links.models';
import { RestDslImportWizard } from './RestDslImportWizard';

export const RestDslImportPage: FunctionComponent = () => {
  const navigate = useNavigate();

  const handleClose = useCallback(async () => {
    await navigate(Links.RestEditor);
  }, [navigate]);

  const handleGoToDesigner = useCallback(async () => {
    await navigate(Links.Home);
  }, [navigate]);

  const handleOpenSettings = useCallback(async () => {
    await navigate(Links.Settings);
  }, [navigate]);

  return (
    <>
      <h1 className="rest-dsl-import-title">Import OpenAPI</h1>
      <RestDslImportWizard
        onClose={handleClose}
        onGoToDesigner={handleGoToDesigner}
        onOpenSettings={handleOpenSettings}
      />
    </>
  );
};
