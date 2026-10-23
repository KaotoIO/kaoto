import { Undo } from '@carbon/icons-react';
import { CodeEditorControl } from '@patternfly/react-code-editor';
import { FunctionComponent } from 'react';

interface IUndoIcon {
  onClick: () => void;
}

export const UndoButton: FunctionComponent<IUndoIcon> = (props) => {
  return (
    <CodeEditorControl
      key="undoButton"
      icon={<Undo className="icon-undo" />}
      aria-label="Undo change"
      data-testid="sourceCode--undoButton"
      onClick={props.onClick}
      tooltipProps={{ content: 'Undo change', position: 'top' }}
      isVisible
    />
  );
};
