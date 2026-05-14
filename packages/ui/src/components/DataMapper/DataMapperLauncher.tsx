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
import {
  Alert,
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Popover,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { HelpIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { IVisualizationNode } from '../../models';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext } from '../../providers';
import { MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { isXSLTComponent } from '../../utils';
import type { XsltComponentDef } from '../../utils/is-xslt-component';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const navigate = useNavigate();
  const metadata = useContext(MetadataContext);
  const entitiesContext = useContext(EntitiesContext);
  const [xsltFileExists, setXsltFileExists] = useState<boolean>(false);
  const [localXsltDocumentName, setLocalXsltDocumentName] = useState<string>('');

  const xsltDocumentName = useMemo(() => {
    const xsltComponent = vizNode?.getNodeDefinition()?.steps?.find(isXSLTComponent) as XsltComponentDef;
    return DataMapperStepService.getXsltFileName(xsltComponent);
  }, [vizNode]);

  const isXsltDocumentDefined = useMemo(() => {
    return isDefined(xsltDocumentName);
  }, [xsltDocumentName]);

  useEffect(() => {
    const checkFile = async () => {
      if (!xsltDocumentName || !metadata) {
        setXsltFileExists(false);
        return;
      }
      const content = await metadata.getResourceContent(xsltDocumentName);
      setXsltFileExists(content !== undefined);
    };
    checkFile();
  }, [xsltDocumentName, metadata]);

  useEffect(() => {
    if (xsltDocumentName) {
      setLocalXsltDocumentName(xsltDocumentName);
    }
  }, [xsltDocumentName]);

  const isXsltDocumentNameValid = useMemo(() => {
    if (localXsltDocumentName === xsltDocumentName) {
      return true;
    }

    const trimmed = localXsltDocumentName.trim();

    // Empty value
    if (!trimmed) {
      return false;
    }

    /**
     * Valid filename rules:
     * - must end with .xsl
     * - filename before extension cannot be empty
     * - disallow invalid filename characters
     */
    // eslint-disable-next-line no-control-regex
    const xsltFileNameRegex = /^(?!\.)([^<>:"/\\|?*\x00-\x1F]+)\.(xsl)$/i;

    return xsltFileNameRegex.test(trimmed);
  }, [localXsltDocumentName, xsltDocumentName]);

  const validationState = useMemo(() => {
    if (!isXsltDocumentNameValid) {
      return ValidatedOptions.error;
    }

    return ValidatedOptions.default;
  }, [isXsltDocumentNameValid]);

  const onXsltDocumentNameChange = useCallback((_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setLocalXsltDocumentName(value);
  }, []);

  const onClick = useCallback(async () => {
    const oldPath = xsltDocumentName;
    const newPath = localXsltDocumentName.trim();

    if (newPath !== oldPath && vizNode && metadata && entitiesContext && oldPath) {
      const metadataId = DataMapperStepService.getDataMapperMetadataId(vizNode);
      const meta = await metadata.getMetadata<IDataMapperMetadata>(metadataId);

      if (meta) {
        const content = await metadata.getResourceContent(oldPath);
        if (content !== undefined) {
          await metadata.saveResourceContent(newPath, content);
          await DataMapperMetadataService.updateXsltPath(metadata, metadataId, meta, newPath);
          DataMapperStepService.updateXsltFileName(vizNode, newPath, entitiesContext);
          await metadata.deleteResource(oldPath);
        }
      }
    }

    navigate(`${Links.DataMapper}/${vizNode?.getNodeDefinition()?.id}`);
  }, [localXsltDocumentName, xsltDocumentName, metadata, entitiesContext, navigate, vizNode]);

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
        <Form>
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
            <TextInput
              value={localXsltDocumentName}
              onChange={onXsltDocumentNameChange}
              title="The name of the XSLT document that is used by the Kaoto DataMapper"
              validated={validationState}
              id="xslt-document-path"
            />
            {!isXsltDocumentNameValid && (
              <HelperText>
                <HelperTextItem variant="error">
                  XSLT document name is required and must be a valid filename ending with .xsl.
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
        </Form>
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
        isDisabled={xsltFileExists && !isXsltDocumentNameValid}
        icon={<WrenchIcon />}
      >
        Configure
      </Button>
    </section>
  );
};

export default DataMapperLauncher;
