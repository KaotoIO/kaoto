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
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IVisualizationNode } from '../../models';
import { MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { isDefined, isXSLTComponent } from '../../utils';
import type { XsltComponentDef } from '../../utils/is-xslt-component';
import './DataMapperLauncher.scss';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const navigate = useNavigate();
  const metadata = useContext(MetadataContext);
  const xsltDocument = useMemo(() => {
    const xsltComponent = vizNode?.getComponentSchema()?.definition?.steps?.find(isXSLTComponent) as XsltComponentDef;
    return DataMapperMetadataService.getXSLTDocumentName(xsltComponent);
  }, [vizNode]);
  const isXsltDocumentDefined = useMemo(() => {
    return isDefined(xsltDocument);
  }, [xsltDocument]);

  const onClick = useCallback(() => {
    navigate(`${Links.DataMapper}/${vizNode?.getComponentSchema()?.definition?.id}`);
  }, [navigate, vizNode]);

  if (!isDefined(metadata)) {
    return (
      <Alert variant="info" title="The Kaoto DataMapper cannot be configured">
        <p>
          At the moment, the Kaoto DataMapper cannot be configured using the browser directly. Please use the VS Code
          extension for an enhanced experience. The Kaoto extension is bundled in the&nbsp;
          <a href="https://marketplace.visualstudio.com/items?itemName=redhat.apache-camel-extension-pack">
            Extension Pack for Apache Camel
          </a>
        </p>
      </Alert>
    );
  }

  return (
    <section className="data-mapper-launcher">
      <Form>
        <FormGroup
          label="Document"
          labelIcon={
            <Popover
              bodyContent="The name of the XSLT document that is used by the Kaoto Data Mapper"
              triggerAction="hover"
              withFocusTrap={false}
            >
              <Button variant="plain" aria-label="More info" icon={<HelpIcon />} />
            </Popover>
          }
        >
          <TextInput
            readOnly
            value={xsltDocument}
            title="The name of the XSLT document that is used by the Kaoto Data Mapper"
            validated={isXsltDocumentDefined ? ValidatedOptions.default : ValidatedOptions.error}
          />
          {!isXsltDocumentDefined && (
            <HelperText>
              <HelperTextItem variant="error" hasIcon>
                This Kaoto DataMapper step is missing some configuration. Please click the configure button to configure
                it.
              </HelperTextItem>
            </HelperText>
          )}
        </FormGroup>
      </Form>

      <Button
        variant="primary"
        title="Click to launch the Kaoto Data Mapper editor"
        aria-label="Launch the Kaoto Data Mapper editor"
        onClick={onClick}
        icon={<WrenchIcon />}
      >
        Configure
      </Button>
    </section>
  );
};

export default DataMapperLauncher;
