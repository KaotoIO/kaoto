import { ExpandableSection } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useState } from 'react';

interface ExpandableDetailsProps {
  details: object;
}

export const ExpandableDetails: FunctionComponent<PropsWithChildren<ExpandableDetailsProps>> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const onToggle = useCallback((_event: unknown, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  }, []);

  return (
    <>
      {props.children}

      <ExpandableSection
        toggleText={isExpanded ? 'Hide properties' : 'Show properties'}
        toggleId="expandable-section-toggle"
        contentId="expandable-section-content"
        onToggle={onToggle}
        isExpanded={isExpanded}
      >
        <code>
          <pre>{JSON.stringify(props.details, null, 2)}</pre>
        </code>
      </ExpandableSection>
    </>
  );
};
