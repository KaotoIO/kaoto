import { ExpandableSection, capitalize } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

interface CustomExpandableSectionProps extends PropsWithChildren {
  groupName: string;
  isGroupExpanded?: boolean;
}

const WHITESPACE_REGEX = /\s/g;

export const CustomExpandableSection: FunctionComponent<CustomExpandableSectionProps> = ({
  groupName,
  isGroupExpanded = false,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(isGroupExpanded);
  }, [isGroupExpanded]);

  const onToggle = (_event: React.MouseEvent, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection
      toggleText={capitalize(`${groupName} properties`)}
      toggleId={`expandable-section-toggle-${groupName.replace(WHITESPACE_REGEX, '-')}`}
      contentId="expandable-section-content"
      onToggle={onToggle}
      isExpanded={isExpanded}
    >
      {children}
    </ExpandableSection>
  );
};
