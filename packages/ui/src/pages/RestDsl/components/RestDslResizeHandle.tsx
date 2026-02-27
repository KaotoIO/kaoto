import { Button } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent } from 'react';

type RestDslResizeHandleProps = {
  onResizeStart: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const RestDslResizeHandle: FunctionComponent<RestDslResizeHandleProps> = ({ onResizeStart }) => {
  return (
    <Button
      variant="plain"
      className="rest-dsl-page-resize-handle"
      onMouseDown={onResizeStart}
      aria-label="Resize panels"
    >
      <hr className="rest-dsl-page-resize-handle-line" />
      <span className="rest-dsl-page-resize-grip" aria-hidden="true">
        ||
      </span>
    </Button>
  );
};
