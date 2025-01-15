import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren } from 'react';

interface ObjectFieldWrapperProps {
  title: string;
}

export const ObjectFieldWrapper: FunctionComponent<PropsWithChildren<ObjectFieldWrapperProps>> = ({
  title,
  children,
}) => {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>

      <CardBody className="pf-v6-c-form">{children}</CardBody>
    </Card>
  );
};
