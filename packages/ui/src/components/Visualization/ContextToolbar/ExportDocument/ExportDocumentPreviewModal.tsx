import {
  Bullseye,
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Spinner,
  Split,
  SplitItem,
  TextInput,
  Toolbar,
  ToolbarItem,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { Element } from 'hast';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useVisibleVizNodes } from '../../../../hooks/use-visible-viz-nodes';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { DocumentationEntity } from '../../../../models/documentation';
import { VisibleFlowsContext } from '../../../../providers';
import { DocumentationService } from '../../../../services/documentation.service';
import { useGraphLayout } from '../../Custom/hooks/use-graph-layout.hook';
import { HiddenCanvas } from '../FlowExportImage/HiddenCanvas';
import { EntitiesMenu } from './EntitiesMenu';
import { markdownComponentMapping } from './MarkdownComponentMapping';

type IExportDocumentPreviewModal = {
  onClose: () => void;
};

const FILENAME_BASE = 'route-export';

export const ExportDocumentPreviewModal: FunctionComponent<IExportDocumentPreviewModal> = ({ onClose }) => {
  const { camelResource } = useEntityContext();
  const { visibleFlows, visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const { visualEntities } = useEntityContext();
  const [markdownText, setMarkdownText] = useState<string>('');
  const [flowImageBlob, setFlowImageBlob] = useState<Blob>();
  const [flowImageUrl, setFlowImageUrl] = useState<string>();
  const [downloadFileName, setDownloadFileName] = useState<string>(`${FILENAME_BASE}.zip`);
  const initialDocEntities = DocumentationService.getDocumentationEntities(camelResource, visibleFlows);
  const [documentationEntities, setDocumentationEntities] = useState<DocumentationEntity[]>(initialDocEntities);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const currentLayout = useGraphLayout();
  const { vizNodes, isResolving } = useVisibleVizNodes(visualEntities, visibleFlows);

  const onUpdateDocumentationEntities = (documentationEntities: DocumentationEntity[]) => {
    documentationEntities.forEach((docEntity) => {
      if (
        docEntity.isVisualEntity &&
        ((docEntity.isVisible && !visibleFlows[docEntity.entity!.id]) ||
          (!docEntity.isVisible && visibleFlows[docEntity.entity!.id]))
      ) {
        visualFlowsApi.toggleFlowVisible(docEntity.entity!.id);
      }
    });

    setDocumentationEntities([...documentationEntities]);
  };

  const handleBlobGenerated = (blob: Blob) => {
    setFlowImageBlob(blob);
    // Revoke previous object URL before creating a new one
    if (flowImageUrl) {
      URL.revokeObjectURL(flowImageUrl);
    }
    const imageUrl = URL.createObjectURL(blob);
    setFlowImageUrl(imageUrl);
    const md = DocumentationService.generateMarkdown(documentationEntities, imageUrl);
    setMarkdownText(md);
    setIsLoading(false);
  };

  const handleImageGenerationComplete = () => {
    setIsGeneratingImage(false);
  };

  useEffect(() => {
    setIsLoading(true);
    setIsGeneratingImage(true);
  }, [documentationEntities, visibleFlows]);

  const onDownload = async () => {
    if (!flowImageBlob) return;

    const md = DocumentationService.generateMarkdown(documentationEntities, FILENAME_BASE + '.png');

    const zipBlob = await DocumentationService.generateDocumentationZip(flowImageBlob, md, FILENAME_BASE);
    const downloadUrl = URL.createObjectURL(zipBlob);
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.download = downloadFileName;
    link.href = downloadUrl;
    link.click();
    // Revoke the temporary download URL after a short timeout
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 100);
  };

  const imageUrlTransform = (url: string, _key: string, _node: Readonly<Element>): string | null | undefined => url;

  const handleModalClose = () => {
    // Revoke the object URL when modal closes
    if (flowImageUrl) {
      URL.revokeObjectURL(flowImageUrl);
    }
    onClose();
  };

  return (
    <Modal
      aria-label="Generate Route Documentation"
      variant={ModalVariant.large}
      isOpen
      data-testid="documentationPreviewModal"
      onClose={handleModalClose}
      className="export-document-preview-modal"
    >
      <ModalHeader>
        <Form>
          <Toolbar isSticky>
            <Split hasGutter>
              <SplitItem>
                <ToolbarItem>
                  <FormGroup label="Visible Entities">
                    <EntitiesMenu
                      documentationEntities={documentationEntities}
                      onUpdate={(docEntities) => onUpdateDocumentationEntities(docEntities)}
                    />
                  </FormGroup>
                </ToolbarItem>
              </SplitItem>
              <SplitItem isFilled>
                <ToolbarItem>&nbsp;</ToolbarItem>
              </SplitItem>
              <SplitItem>
                <ToolbarItem>
                  <FormGroup label="Download File Name">
                    <TextInput
                      aria-label="Download File Name"
                      type="text"
                      value={downloadFileName}
                      onChange={(_event, value) => setDownloadFileName(value)}
                    />
                  </FormGroup>
                </ToolbarItem>
              </SplitItem>
              <SplitItem>
                <ToolbarItem>
                  <FormGroup label=" ">
                    <Button icon={<DownloadIcon />} variant="primary" onClick={onDownload}>
                      Download
                    </Button>
                  </FormGroup>
                </ToolbarItem>
              </SplitItem>
            </Split>
          </Toolbar>
        </Form>
      </ModalHeader>
      <ModalBody tabIndex={0} className="export-document-preview-body" data-testid="export-document-preview-body">
        {isLoading ? (
          <Bullseye>
            <Spinner aria-label="Loading markdown preview" data-testid="Loading markdown preview" />
          </Bullseye>
        ) : (
          <Markdown components={markdownComponentMapping} remarkPlugins={[remarkGfm]} urlTransform={imageUrlTransform}>
            {markdownText}
          </Markdown>
        )}
      </ModalBody>

      {isGeneratingImage && !isResolving && (
        <HiddenCanvas
          vizNodes={vizNodes}
          layout={currentLayout}
          onComplete={handleImageGenerationComplete}
          onBlobGenerated={handleBlobGenerated}
        />
      )}
    </Modal>
  );
};
