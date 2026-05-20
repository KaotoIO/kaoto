/*
    Copyright (C) 2024 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import './DataMapperLauncher.scss';

import { isDefined } from '@kaoto/forms';
import { Alert, Button, FormGroup, HelperText, HelperTextItem, Popover } from '@patternfly/react-core';
import { HelpIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { IVisualizationNode, ValidationResult, ValidationStatus } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext } from '../../providers';
import { MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { isXSLTComponent } from '../../utils';
import type { XsltComponentDef } from '../../utils/is-xslt-component';
import XsltDocumentRenameInput from './XsltDocumentRenameInput';

// XSLT filename validation regex
// Valid filename rules:
// - must end with .xsl
// - filename before extension cannot be empty
// - disallow invalid filename characters
// eslint-disable-next-line no-control-regex
const XSLT_FILENAME_REGEX = /^(?!\.)([^<>:"/\\|?*\x00-\x1F]+)\.(xsl)$/i;
const XSLT_FILENAME_REQUIRED = 'XSLT document name is required.';
const XSLT_FILENAME_FORMAT_ERROR = 'XSLT document name must be a valid filename ending with .xsl.';
const XSLT_FILENAME_ALREADY_EXISTS = 'An XSLT document with this name already exists.';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const navigate = useNavigate();
  const metadata = useContext(MetadataContext);
  const entitiesContext = useContext(EntitiesContext);

  const [xsltFileExists, setXsltFileExists] = useState<boolean>(false);
  const [currentFileName, setCurrentFileName] = useState<string | undefined>(undefined);
  const [isEditingFilename, setIsEditingFilename] = useState<boolean>(false);
  const [isSavingFile, setIsSavingFile] = useState<boolean>(false);

  const xsltDocumentName = useMemo(() => {
    const xsltComponent = vizNode?.getNodeDefinition()?.steps?.find(isXSLTComponent) as XsltComponentDef;
    const fileName = DataMapperStepService.getXsltFileName(xsltComponent);
    // Use local state if set, otherwise use the value from vizNode
    return currentFileName ?? fileName;
  }, [vizNode, currentFileName]);

  const isXsltDocumentDefined = useMemo(() => {
    return isDefined(xsltDocumentName);
  }, [xsltDocumentName]);

  useEffect(() => {
    const checkFile = async () => {
      if (!xsltDocumentName || !metadata) {
        setXsltFileExists(false);
        return;
      }
      const exists = await metadata.isResourceExist(xsltDocumentName);
      setXsltFileExists(exists);
    };
    checkFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateDocumentName = useCallback(
    async (value: string): Promise<ValidationResult> => {
      // Basic validation first (synchronous)
      if (!value) {
        return { status: ValidationStatus.Error, errMessages: [XSLT_FILENAME_REQUIRED] };
      }

      if (!XSLT_FILENAME_REGEX.test(value)) {
        return { status: ValidationStatus.Error, errMessages: [XSLT_FILENAME_FORMAT_ERROR] };
      }

      // Check for file existence (asynchronous)
      if (value !== xsltDocumentName && metadata) {
        const exists = await metadata.isResourceExist(value);
        if (exists) {
          return { status: ValidationStatus.Error, errMessages: [XSLT_FILENAME_ALREADY_EXISTS] };
        }
      }

      return { status: ValidationStatus.Success, errMessages: [] };
    },
    [xsltDocumentName, metadata],
  );

  const handleChange = useCallback(
    async (newPath: string) => {
      const oldPath = xsltDocumentName;

      if (newPath === oldPath || !vizNode || !metadata || !entitiesContext || !oldPath) {
        return;
      }

      const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
      const meta = await metadata.getMetadata<IDataMapperMetadata>(metadataId);

      if (!meta) {
        return;
      }

      const oldFileExists = await metadata.isResourceExist(oldPath);

      if (!oldFileExists) {
        return;
      }

      setIsSavingFile(true);
      try {
        const content = await metadata.getResourceContent(oldPath);

        if (content === undefined) {
          return;
        }

        await metadata.saveResourceContent(newPath, content);
        await DataMapperMetadataService.updateXsltPath(metadata, metadataId, meta, newPath);
        DataMapperStepService.updateXsltFileName(vizNode, newPath, entitiesContext);
        await metadata.deleteResource(oldPath);
        setCurrentFileName(newPath);
        setXsltFileExists(true);
      } finally {
        setIsSavingFile(false);
      }
    },
    [xsltDocumentName, metadata, entitiesContext, vizNode],
  );

  const onClick = useCallback(() => {
    navigate(`${Links.DataMapper}/${vizNode?.getNodeDefinition()?.id}`);
  }, [navigate, vizNode]);

  if (!isDefined(metadata)) {
    return (
      <Alert variant="info" title="The Kaoto DataMapper cannot be configured">
        <p>
          At the moment, the Kaoto DataMapper cannot be configured using the browser directly. Please use the Kaoto VS
          Code extension for an enhanced experience. The Kaoto extension can be found at the{' '}
          <a href="https://marketplace.visualstudio.com/items?itemName=redhat.vscode-kaoto">
            Visual Studio Code Marketplace{' '}
          </a>{' '}
          or in the <a href="https://open-vsx.org/extension/redhat/vscode-kaoto">Open VSX Registry</a>.
        </p>
      </Alert>
    );
  }

  return (
    <section className="data-mapper-launcher">
      {xsltFileExists && (
        <FormGroup
          label="Document"
          labelHelp={
            <Popover
              bodyContent="The name of the XSLT document that is used by the Kaoto DataMapper"
              triggerAction="hover"
              withFocusTrap={false}
            >
              <Button variant="plain" aria-label="More info" icon={<HelpIcon />} />
            </Popover>
          }
        >
          <XsltDocumentRenameInput
            value={xsltDocumentName}
            onChange={handleChange}
            onEditingStateChange={setIsEditingFilename}
            validator={validateDocumentName}
            textTitle="XSLT document name"
            editTitle="Edit document name"
            data-testid="xslt-document-name"
          />
        </FormGroup>
      )}
      {!isXsltDocumentDefined && (
        <HelperText>
          <HelperTextItem variant="error">
            This Kaoto DataMapper step is missing some configuration. Please click the configure button to configure it.
          </HelperTextItem>
        </HelperText>
      )}
      <Button
        variant="primary"
        title="Click to launch the Kaoto DataMapper editor"
        aria-label="Launch the Kaoto DataMapper editor"
        onClick={onClick}
        icon={<WrenchIcon />}
        isDisabled={isSavingFile || isEditingFilename}
      >
        Configure
      </Button>
    </section>
  );
};

export default DataMapperLauncher;
