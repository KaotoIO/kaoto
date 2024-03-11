import { FunctionComponent, useState } from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import { RestConfigurationForm } from './RestConfigurationForm';

export const RestConfigurationEditor: FunctionComponent = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  const onToggle = (_event: React.MouseEvent, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection
      toggleText={'Rest Configuration'}
      onToggle={onToggle}
      isExpanded={isExpanded}
      displaySize="lg"
      isWidthLimited
    >
      <RestConfigurationForm />
    </ExpandableSection>
  );
};
