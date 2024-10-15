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
import { Alert, Button } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { IVisualizationNode } from '../../models';
import { MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const navigate = useNavigate();
  const metadata = useContext(MetadataContext);
  const id = vizNode?.getComponentSchema()?.definition?.id;

  const onClick = useCallback(() => {
    navigate(`${Links.DataMapper}/${id}`);
  }, [navigate, id]);

  return metadata ? (
    <Button variant="primary" onClick={onClick} icon={<WrenchIcon />}>
      Configure
    </Button>
  ) : (
    <Alert variant="info" title={'The Kaoto DataMapper cannot be configured'}>
      <p>
        At the moment, the Kaoto DataMapper cannot be configured using the browser directly. Please use the VS Code
        extension for an enhanced experience. The Kaoto extension is bundled in the&nbsp;
        <a href="https://marketplace.visualstudio.com/items?itemName=redhat.apache-camel-extension-pack">
          Extension Pack for Apache Camel
        </a>
      </p>
    </Alert>
  );
};

export default DataMapperLauncher;
