import { Accordion, AccordionItem, CodeSnippet } from '@carbon/react';
import { FunctionComponent, useState } from 'react';

import styles from './ErrorDetails.module.scss';

interface ErrorDetailsProps {
  message?: string;
}

export const ErrorDetails: FunctionComponent<ErrorDetailsProps> = ({ message }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Accordion className={styles['error-details']} size="sm" isFlush>
      <AccordionItem
        title={isOpen ? 'Show less' : 'Show more'}
        open={isOpen}
        onHeadingClick={({ isOpen }) => {
          setIsOpen(isOpen);
        }}
      >
        <CodeSnippet
          className={styles['error-details-message']}
          type="multi"
          hideCopyButton
          data-testid="error-details-message"
        >
          {message}
        </CodeSnippet>
      </AccordionItem>
    </Accordion>
  );
};
