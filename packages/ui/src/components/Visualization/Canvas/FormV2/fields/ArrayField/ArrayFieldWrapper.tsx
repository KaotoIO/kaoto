import {
  Card,
  CardBody,
  CardHeader,
  CardHeaderActionsObject,
  CardTitle,
  FormGroupLabelHelp,
  Popover,
} from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, ReactNode, useMemo } from 'react';

interface FieldWrapperProps {
  propName: string;
  type: 'array' | 'object' | 'expression';
  title: string;
  description?: string;
  defaultValue?: unknown;
  actions?: ReactNode;
}

export const ArrayFieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
  propName,
  type,
  title,
  description,
  defaultValue,
  actions,
  children,
}) => {
  const id = `${title}-popover`;

  const cardActions: CardHeaderActionsObject = useMemo(() => ({ actions, hasNoOffset: false }), [actions]);
  const shouldRenderChildren = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <Card data-testid={`${propName}__field-wrapper`}>
      <CardHeader actions={cardActions}>
        <CardTitle>
          {title}{' '}
          <Popover
            id={id}
            headerContent={
              <p className="kaoto-form__label">
                {title} {`<${type}>`}
              </p>
            }
            bodyContent={<p>{description}</p>}
            footerContent={<p>Default: {defaultValue?.toString() ?? 'no default value'}</p>}
            triggerAction="hover"
            withFocusTrap={false}
          >
            <FormGroupLabelHelp aria-label={`More info for ${title} field`} />
          </Popover>
        </CardTitle>
      </CardHeader>

      {shouldRenderChildren && (
        <CardBody data-testid={`${propName}__children`} className="pf-v6-c-form kaoto-form__label">
          {children}
        </CardBody>
      )}
    </Card>
  );
};
