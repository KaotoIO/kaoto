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
  type: 'array' | 'object' | 'expression';
  title: string;
  description?: string;
  defaultValue?: unknown;
  actions?: ReactNode;
}

export const ArrayFieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
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
    <Card>
      <CardHeader actions={cardActions}>
        <CardTitle>
          {title}{' '}
          <Popover
            id={id}
            headerContent={
              <p>
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

      {shouldRenderChildren && <CardBody className="pf-v6-c-form kaoto-form__label">{children}</CardBody>}
    </Card>
  );
};
