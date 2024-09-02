import { Button } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';
import { useComponentLink } from '../../hooks/ComponentLink';
import { IVisualizationNode } from '../../models';
import { Links } from '../../router/links.models';

export const DataMapperLauncher: FunctionComponent<{ vizNode?: IVisualizationNode }> = () => {
  const backLink = useComponentLink(Links.DataMapper);

  return (
    <Button variant="primary" component={backLink} icon={<WrenchIcon />}>
      Configure
    </Button>
  );
};

export default DataMapperLauncher;
