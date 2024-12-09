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
import { useVisualizationController } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { useParams } from 'react-router-dom';
import DataMapper from '../../components/DataMapper/DataMapper';
import { IVisualizationNode } from '../../models';
import { getVisualizationNodesFromGraph } from '../../utils';

export const DataMapperPage: FunctionComponent = () => {
  const controller = useVisualizationController();
  const params = useParams();

  const vizNode = getVisualizationNodesFromGraph(
    controller.getGraph(),
    (node: IVisualizationNode) => node.getComponentSchema()?.definition?.id === params.id,
  )[0];

  return <DataMapper vizNode={vizNode} />;
};

export default DataMapperPage;
