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
import { FieldProps } from '../typings';

interface FieldWrapperProps extends FieldProps {
  type: string;
  title?: string;
  description?: string;
  defaultValue?: unknown;
  actions?: ReactNode;
}

export const FieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
  propName,
  type,
  title: propsTitle,
  description,
  defaultValue,
  actions,
  children,
}) => {
  const title = propsTitle ?? propName;
  const id = `${title}-popover`;

  const cardActions: CardHeaderActionsObject = useMemo(() => ({ actions, hasNoOffset: false }), [actions]);

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

      {children && <CardBody className="pf-v6-c-form">{children}</CardBody>}
    </Card>
  );
};
