import './ExportDocument.scss';

import { Download } from '@carbon/icons-react';
import { Button } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';

import { ExportDocumentPreviewModal } from './ExportDocumentPreviewModal';

export const ExportDocument: FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const onOpenPreview = async () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        icon={<Download />}
        title="Generate Route Documentation"
        onClick={onOpenPreview}
        variant="control"
        data-testid="documentationPreviewButton"
      />
      {isModalOpen && (
        <ExportDocumentPreviewModal
          onClose={() => {
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
};
