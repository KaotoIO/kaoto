import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';

type DocumentFieldProps = {
  field: any;
  initialExpanded?: boolean;
};
export const DocumentField: FunctionComponent<DocumentFieldProps> = ({ field, initialExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

  const renderField = useCallback(
    (field: any) => {
      return (
        <AccordionItem>
          {field.fields && field.fields.length !== 0 ? (
            <>
              <AccordionToggle onClick={() => setIsExpanded(!isExpanded)} isExpanded={isExpanded} id={field.name}>
                {field.name}
              </AccordionToggle>
              <AccordionContent isHidden={!isExpanded} id={field.name}>
                {field.fields.map((f: any) => (
                  <DocumentField field={f} />
                ))}
              </AccordionContent>
            </>
          ) : (
            <AccordionContent id={field.name}>{field.name}</AccordionContent>
          )}
        </AccordionItem>
      );
    },
    [isExpanded],
  );

  return renderField(field);
};
