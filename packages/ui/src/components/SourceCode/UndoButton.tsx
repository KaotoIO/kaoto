import { CodeEditorControl } from '@patternfly/react-code-editor';
import { UndoIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

interface IUndoIcon {
  isVisible: boolean;
  onClick: () => void;
}

export const UndoButton: FunctionComponent<IUndoIcon> = (props) => {
  return (
    <CodeEditorControl
      key="undoButton"
      icon={<UndoIcon className="icon-undo" />}
      aria-label="Undo change"
      data-testid="sourceCode--undoButton"
      onClick={props.onClick}
      tooltipProps={{ content: 'Undo change', position: 'top' }}
      isVisible={true}
    />
  );
};
