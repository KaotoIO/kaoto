import { CodeEditorControl } from '@patternfly/react-code-editor';
import { RedoIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

interface IRedoIcon {
  isVisible: boolean;
  onClick: () => void;
}

export const RedoButton: FunctionComponent<IRedoIcon> = (props) => {
  return (
    <CodeEditorControl
      key="redoButton"
      icon={<RedoIcon className="icon-redo" />}
      aria-label="Redo change"
      data-testid="sourceCode--redoButton"
      onClick={props.onClick}
      tooltipProps={{ content: 'Redo change', position: 'top' }}
      isVisible
    />
  );
};
