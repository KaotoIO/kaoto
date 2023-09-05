import { CodeEditorControl } from '@patternfly/react-code-editor';
import { CheckCircleIcon, SyncAltIcon } from '@patternfly/react-icons';
import { FunctionComponent, useEffect, useState } from 'react';
import './SyncButton.scss';

interface ISyncIcon {
  isDirty: boolean;
  isVisible: boolean;
  onClick: () => void;
}

export const SyncButton: FunctionComponent<ISyncIcon> = (props) => {
  const [tooltipProps, setTooltipProps] = useState({ content: 'Sync your code', position: 'top' });

  useEffect(() => {
    setTooltipProps({
      content: props.isDirty ? 'Sync your code' : 'Code is synced',
      position: 'top',
    });
  }, [props.isDirty]);

  return (
    <CodeEditorControl
      key="updateButton"
      icon={props.isDirty ? <SyncAltIcon className="icon-warning" /> : <CheckCircleIcon className="icon-success" />}
      aria-label="Apply the code"
      data-testid="sourceCode--applyButton"
      onClick={props.onClick}
      tooltipProps={tooltipProps}
      isVisible={props.isVisible}
    />
  );
};
