import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';
import { ExpandableSection, capitalize } from '@patternfly/react-core';

interface CustomExpandableSectionProps extends PropsWithChildren {
  groupName: string;
  isGroupExpanded: boolean;
}

export const CustomExpandableSection: FunctionComponent<CustomExpandableSectionProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(props.isGroupExpanded);
  }, [props.isGroupExpanded]);

  const onToggle = (_event: React.MouseEvent, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection
      toggleText={capitalize(`${props.groupName} properties`)}
      toggleId="expandable-section-toggle"
      contentId="expandable-section-content"
      onToggle={onToggle}
      isExpanded={isExpanded}
    >
      {props.children}
    </ExpandableSection>
  );
};
