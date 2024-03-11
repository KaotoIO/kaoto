import { FunctionComponent, useCallback, useState } from 'react';
import { Accordion, Card, CardBody, CardExpandableContent, CardHeader, CardTitle } from '@patternfly/react-core';
import { IDocument } from '../../models';
import { DocumentField } from './DocumentField';
import { useCanvas } from '../../hooks/useCanvas';

export type DocumentProps = {
  model: IDocument;
};

export const Document: FunctionComponent<DocumentProps> = ({ model }) => {
  const { reloadFieldReferences } = useCanvas();
  const [isExpanded, setExpanded] = useState<boolean>(true);
  const handleOnToggle = useCallback(() => {
    reloadFieldReferences();
  }, [reloadFieldReferences]);
  const handleOnExpand = useCallback(() => {
    setExpanded(!isExpanded);
    reloadFieldReferences();
  }, [isExpanded, reloadFieldReferences]);

  return (
    <Card isExpanded={isExpanded} isCompact>
      <CardHeader onExpand={handleOnExpand}>
        <CardTitle>{model.name}</CardTitle>
      </CardHeader>
      <CardExpandableContent>
        <CardBody>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleOnToggle}>
            {model.fields.map((field) => (
              <DocumentField field={field} key={field.name} onToggle={handleOnToggle} />
            ))}
          </Accordion>
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
