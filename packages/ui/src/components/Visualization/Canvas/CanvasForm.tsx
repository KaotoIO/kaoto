import { FunctionComponent } from 'react';
import { CanvasNode } from './canvas.models';
import { FormService } from './form.service';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const schema = FormService.getSchema(props.selectedNode);

  return <p>Canvas form</p>;
};
