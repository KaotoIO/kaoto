import './ErrorDetails.scss';

import { Accordion, AccordionItem, CodeSnippet } from '@carbon/react';
import { FunctionComponent, useState } from 'react';

interface ErrorDetailsProps {
  message?: string;
}

export const ErrorDetails: FunctionComponent<ErrorDetailsProps> = ({ message }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Accordion className="error-details" size="sm" isFlush>
      <AccordionItem
        title={isOpen ? 'Show less' : 'Show more'}
        open={isOpen}
        onHeadingClick={({ isOpen }) => {
          setIsOpen(isOpen);
        }}
      >
        <CodeSnippet className="error-details-message" type="multi" hideCopyButton data-testid="error-details-message">
          {message}
        </CodeSnippet>
      </AccordionItem>
    </Accordion>
  );
};
