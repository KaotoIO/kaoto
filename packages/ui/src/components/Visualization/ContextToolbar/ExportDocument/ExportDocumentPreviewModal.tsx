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

import { DocumentationEntity } from '../../../../models/documentation';
import { EntitiesContext, VisibleFlowsContext } from '../../../../providers';
import { DocumentationService } from '../../../../services/documentation.service';
import { EntitiesMenu } from './EntitiesMenu';
import { markdownComponentMapping } from './MarkdownComponentMapping';

type IExportDocumentPreviewModal = {
  isOpen?: boolean;
  onClose: () => void;
};

export const ExportDocumentPreviewModal: FunctionComponent<IExportDocumentPreviewModal> = ({
  isOpen = true,
  onClose,
}) => {
  const fileNameBase = 'route-export';
  const { camelResource } = useContext(EntitiesContext)!;
  const { visibleFlows, visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const [markdownText, setMarkdownText] = useState<string>('');
  const [flowImageBlob, setFlowImageBlob] = useState<Blob>();
  const [downloadFileName, setDownloadFileName] = useState<string>(fileNameBase + '.zip');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(isOpen);
  const initialDocEntities = DocumentationService.getDocumentationEntities(camelResource, visibleFlows);
  const [documentationEntities, setDocumentationEntities] = useState<DocumentationEntity[]>(initialDocEntities);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  useEffect(() => {
    setIsLoading(true);
    const updatePreview = () => {
      let imageUrl = '';
      DocumentationService.generateFlowImage()
        .then((imageBlob) => {
          if (imageBlob) {
            setFlowImageBlob(imageBlob);
            imageUrl = window.URL.createObjectURL(imageBlob);
          }
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          const md = DocumentationService.generateMarkdown(documentationEntities, imageUrl);
          setMarkdownText(md);
          setIsLoading(false);
        });
    };

    // A workaround for React 18 synchronous useEffect execution, which causes the flow image
    // to be captured before the entity visibility reflects
    // https://react.dev/reference/react/useEffect#caveats
    const timeout = setTimeout(updatePreview);
    return () => {
      clearTimeout(timeout);
    };
  }, [documentationEntities, visibleFlows]);

  const onDownload = async () => {
    if (!flowImageBlob) return;

    const md = DocumentationService.generateMarkdown(documentationEntities, fileNameBase + '.png');

    const zipBlob = await DocumentationService.generateDocumentationZip(flowImageBlob, md, fileNameBase);
    const dataUrl = window.URL.createObjectURL(zipBlob);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = downloadFileName;
    link.href = dataUrl;
    link.click();
  };

  const imageUrlTransform = (url: string, _key: string, _node: Readonly<Element>): string | null | undefined => url;

  const handleModalClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  return (
    <Modal
      aria-label="Generate Route Documentation"
      variant={ModalVariant.large}
      isOpen={isModalOpen}
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
            <Spinner aria-label="Loading markdown preview" />
          </Bullseye>
        ) : (
          <Markdown components={markdownComponentMapping} remarkPlugins={[remarkGfm]} urlTransform={imageUrlTransform}>
            {markdownText}
          </Markdown>
        )}
      </ModalBody>
    </Modal>
  );
};
