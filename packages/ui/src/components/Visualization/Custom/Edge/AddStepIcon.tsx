import clsx from 'clsx';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, useCallback } from 'react';
import { AddStepMode, IDataTestID, IVisualizationNode } from '../../../../models';
import { useAddStep } from '../hooks/add-step.hook';
import './AddStepIcon.scss';

interface AddStepIconProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  mode?: AddStepMode.PrependStep | AddStepMode.AppendStep;
  className?: string;
  title?: string;
}

export const AddStepIcon: FunctionComponent<AddStepIconProps> = ({
  vizNode,
  mode = AddStepMode.PrependStep,
  className,
  title,
  children,
  'data-testid': dataTestId,
}) => {
  const { onAddStep } = useAddStep(vizNode, mode);
  const onClick: MouseEventHandler<HTMLDivElement> = useCallback(
    async (event) => {
      event.stopPropagation();
      await onAddStep();
    },
    [onAddStep],
  );

  return (
    <div
      className={clsx(className, 'add-step-icon')}
      title={title}
      onClick={onClick}
      data-testid={dataTestId}
      aria-hidden
    >
      <div className="add-step-icon__icon">{children}</div>
    </div>
  );
};
