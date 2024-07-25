import { FunctionComponent } from 'react';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { ExpressionEditor } from '../expression/ExpressionEditor';

interface StepExpressionEditorProps {
  selectedNode: CanvasNode;
}

export const StepExpressionEditor: FunctionComponent<StepExpressionEditorProps> = (props) => {
  return (
    <div className="expression-metadata-editor">
      <ExpressionEditor
        expressionModel={props.selectedNode.data?.vizNode?.getComponentSchema()?.definition as Record<string, unknown>}
        onChangeExpressionModel={(model: Record<string, unknown>) =>
          props.selectedNode.data?.vizNode?.updateModel(model)
        }
      />
    </div>
  );
};
