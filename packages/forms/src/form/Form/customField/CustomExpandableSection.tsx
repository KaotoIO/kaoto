import { Accordion, AccordionItem } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

interface CustomExpandableSectionProps extends PropsWithChildren {
  groupName: string;
  isGroupExpanded?: boolean;
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const CustomExpandableSection: FunctionComponent<CustomExpandableSectionProps> = ({
  groupName,
  isGroupExpanded = false,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(isGroupExpanded);
  }, [isGroupExpanded]);

  return (
    <Accordion>
      <AccordionItem
        title={capitalize(`${groupName} properties`)}
        open={isExpanded}
        onHeadingClick={() => setIsExpanded(!isExpanded)}
      >
        {children}
      </AccordionItem>
    </Accordion>
  );
};
