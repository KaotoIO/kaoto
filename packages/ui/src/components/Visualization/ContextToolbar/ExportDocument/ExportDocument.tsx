import {
  Button,
  Form,
  FormGroup,
  ModalBody,
  ModalHeader,
  Split,
  SplitItem,
  TextInput,
  Toolbar,
  ToolbarItem,
} from '@patternfly/react-core';
import { DownloadIcon, FileIcon } from '@patternfly/react-icons';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { DocumentationService } from '../../../../services/documentation.service';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Element } from 'hast';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import './ExportDocument.scss';
import { EntitiesContext, VisibleFlowsContext } from '../../../../providers';
import { markdownComponentMapping } from './MarkdownComponentMapping';
import { EntitiesMenu } from './EntitiesMenu';
import { DocumentationEntity } from '../../../../models/documentation';

export const ExportDocument: FunctionComponent = () => {
  const fileNameBase = 'route-export';
  const { entities, visualEntities } = useContext(EntitiesContext)!;
  const { visibleFlows, visualFlowsApi } = useContext(VisibleFlowsContext)!;

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [markdownText, setMarkdownText] = useState<string>('');
  const [flowImageBlob, setFlowImageBlob] = useState<Blob>();
  const [downloadFileName, setDownloadFileName] = useState<string>(fileNameBase + '.zip');

  const [documentationEntities, setDocumentationEntities] = useState<DocumentationEntity[]>([]);

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
    setTimeout(async () => {
      const imageBlob = await DocumentationService.generateFlowImage();
      if (!imageBlob) {
        console.error('Failed to generate flow diagram image');
        return;
      }
      setFlowImageBlob(imageBlob);
      const imageUrl = window.URL.createObjectURL(imageBlob);
      if (!imageUrl) {
        console.error('Failed to create image URL');
        return;
      }

      const md = DocumentationService.generateMarkdown(documentationEntities, imageUrl);
      setMarkdownText(md);
    });
  }, [documentationEntities, visibleFlows]);

  const onOpenPreview = async () => {
    setDocumentationEntities(DocumentationService.getDocumentationEntities(entities, visualEntities, visibleFlows));
    setIsModalOpen(true);
  };

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

  return (
    <>
      <Button
        icon={<FileIcon />}
        title="Route Documentation Preview"
        onClick={onOpenPreview}
        variant="control"
        data-testid="documentationPreviewButton"
      />
      <Modal
        aria-label="Route Documentation Preview"
        variant={ModalVariant.large}
        isOpen={isModalOpen}
        data-testid="documentationPreviewModal"
        onClose={() => setIsModalOpen(false)}
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
        <ModalBody tabIndex={0} className="export-document-preview-body">
          <Markdown components={markdownComponentMapping} remarkPlugins={[remarkGfm]} urlTransform={imageUrlTransform}>
            {markdownText}
          </Markdown>
        </ModalBody>
      </Modal>
    </>
  );
};
