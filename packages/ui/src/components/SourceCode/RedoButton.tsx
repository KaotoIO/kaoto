import { Redo } from '@carbon/icons-react';
import { CodeEditorControl } from '@patternfly/react-code-editor';
import { FunctionComponent } from 'react';

interface IRedoIcon {
  onClick: () => void;
}

export const RedoButton: FunctionComponent<IRedoIcon> = (props) => {
  return (
    <CodeEditorControl
      key="redoButton"
      icon={<Redo className="icon-redo" />}
      aria-label="Redo change"
      data-testid="sourceCode--redoButton"
      onClick={props.onClick}
      tooltipProps={{ content: 'Redo change', position: 'top' }}
      isVisible
    />
  );
};
