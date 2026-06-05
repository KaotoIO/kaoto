import './ExportDocument.scss';

import { Download } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent, useState } from 'react';

import { ExportDocumentPreviewModal } from './ExportDocumentPreviewModal';

export const ExportDocument: FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const onOpenPreview = async () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <IconButton
        label="Generate Route Documentation"
        onClick={onOpenPreview}
        kind="ghost"
        data-testid="documentationPreviewButton"
      >
        <Download />
      </IconButton>
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
