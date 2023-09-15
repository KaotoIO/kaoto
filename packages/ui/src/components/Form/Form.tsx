import { Divider } from '@patternfly/react-core';
import { FunctionComponent, useEffect } from 'react';
import { useField } from 'uniforms';
import { stringify } from 'yaml';
import { CustomAutoField } from './CustomAutoField';

interface SideBarFormProps {
  path: string;
  model: Record<string, unknown> | undefined;
}

export const SideBarForm: FunctionComponent<SideBarFormProps> = (props) => {
  useEffect(() => {
    console.log(props.path);
  }, [props.path]);

  const [fieldProps, context] = useField('route.from.id', {});
  console.log({ fieldProps, context });

  return (
    <div>
      <CustomAutoField name="route.from" />
      <Divider />
      <pre>{stringify(props.model, null, 2)}</pre>
      <Divider />
      <pre>{JSON.stringify(props.model, null, 2)}</pre>
    </div>
  );
};
