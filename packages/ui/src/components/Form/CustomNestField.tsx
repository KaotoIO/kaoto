import { Card, CardBody } from '@patternfly/react-core/dist/js/components/Card';
import { ConnectedFieldProps, connectField, filterDOMProps, HTMLFieldProps } from 'uniforms';
import { CustomAutoField } from './CustomAutoField';

type CustomNestFieldProps = HTMLFieldProps<object, HTMLDivElement, { helperText?: string; itemProps?: object }>;

export const CustomNestField = connectField(
  ({
    children,
    error,
    errorMessage,
    fields,
    itemProps,
    label,
    name,
    showInlineError,
    disabled,
    ...props
  }: ConnectedFieldProps<CustomNestFieldProps>) => {
    return (
      <Card {...filterDOMProps(props)}>
        <CardBody className="pf-c-form">
          {label && (
            <label>
              <b>{label}</b>
            </label>
          )}
          {children ||
            fields?.map((field) => <CustomAutoField key={field} disabled={disabled} name={field} {...itemProps} />)}
        </CardBody>
      </Card>
    );
  },
);
