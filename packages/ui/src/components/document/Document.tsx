import { FunctionComponent, useState } from 'react';
import { Accordion, Card, CardBody, CardExpandableContent, CardHeader, CardTitle } from '@patternfly/react-core';
import { IDocument } from '../../models';
import { DocumentField } from './DocumentField';

export type DocumentProps = {
  model: IDocument;
};

export const Document: FunctionComponent<DocumentProps> = ({ model }) => {
  const [isExpanded, setExpanded] = useState<boolean>(true);

  return (
    <Card isExpanded={isExpanded}>
      <CardHeader onExpand={() => setExpanded(!isExpanded)}>
        <CardTitle>{model.name}</CardTitle>
      </CardHeader>
      <CardExpandableContent>
        <CardBody>
          <Accordion isBordered={true} asDefinitionList={false}>
            {model.fields.map((field) => (
              <DocumentField field={field} key={field.name} />
            ))}
          </Accordion>
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
