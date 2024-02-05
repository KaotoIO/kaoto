/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import {
  ElementType,
  HTMLAttributes,
  ReactElement,
  forwardRef,
  useEffect,
  useRef,
  useContext,
  // useEffect,
} from 'react';
import { useDrop } from 'react-dnd';
import { FieldsDndContext } from '../../providers/FieldsDndProvider';
import { IDragAndDropField } from '../../models';

export interface IFieldDropTargetChildren {
  isOver: boolean;
  isDroppable: boolean;
  isTarget: boolean;
  field: IDragAndDropField;
}

export interface IFieldDropTargetProps extends Omit<HTMLAttributes<HTMLElement>, 'onDrop'> {
  accept: string[];
  target: IDragAndDropField;
  canDrop: (draggedField: IDragAndDropField) => boolean;
  as?: ElementType;
  childrenWithProps: (props: IFieldDropTargetChildren) => ReactElement;
}

export const FieldDropTarget = forwardRef<HTMLElement, IFieldDropTargetProps>(function FieldDropTarget(
  { accept, target, canDrop, as: As = 'div', childrenWithProps, ...props },
  ref,
) {
  const { setHoveredTarget } = useContext(FieldsDndContext);
  const [{ isOver, isDroppable, isTarget, field }, dropRef] = useDrop<
    IDragAndDropField,
    IDragAndDropField,
    IFieldDropTargetChildren
  >({
    accept,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      isDroppable: monitor.canDrop(),
      isTarget: monitor.isOver() && monitor.canDrop(),
      field: monitor.getItem(),
    }),
    canDrop: (_, monitor) => canDrop(monitor.getItem()),
    drop: () => target,
  });

  const handleRef = (el: HTMLElement) => {
    if (ref) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // by default forwardedRef.current is readonly. Let's ignore it
      ref.current = el;
    }
    dropRef(el);
  };

  const wasOver = useRef(false);
  const wasTarget = useRef(false);
  useEffect(() => {
    if (isOver !== wasOver.current || isTarget !== wasTarget.current) {
      if (isTarget) {
        setHoveredTarget(target);
      } else if (!isOver) {
        setHoveredTarget(null);
      }
      wasOver.current = isOver;
      wasTarget.current = isTarget;
    }
  }, [isOver, isTarget, setHoveredTarget, target]);

  return (
    <As ref={handleRef} {...props}>
      {childrenWithProps({ isDroppable, isOver, isTarget, field })}
    </As>
  );
});
