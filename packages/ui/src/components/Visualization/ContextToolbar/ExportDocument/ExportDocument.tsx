import { Button } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { FunctionComponent, useState } from 'react';
import './ExportDocument.scss';
import { ExportDocumentPreviewModal } from './ExportDocumentPreviewModal';

export const ExportDocument: FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const onOpenPreview = async () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        icon={<DownloadIcon />}
        title="Generate Route Documentation"
        onClick={onOpenPreview}
        variant="control"
        data-testid="documentationPreviewButton"
      />
      {isModalOpen && <ExportDocumentPreviewModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};
