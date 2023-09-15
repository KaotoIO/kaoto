import { Button, FormGroup, Popover, Text, TextInput, TextVariants } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { ConnectedFieldProps, connectField } from 'uniforms';
import { ExpandableDetails } from './ExpandableDetails';

interface CustomTextFieldProps {
  'data-testid': string;
  value: string;
  [key: string]: string;
}

export const CustomTextField = connectField((props: ConnectedFieldProps<CustomTextFieldProps>) => {
  return (
    <ExpandableDetails details={props}>
      <FormGroup
        label={props.label}
        isRequired={!!props.required}
        fieldId={props.id}
        labelIcon={
          <Popover
            aria-label={'Property description'}
            headerContent={props.disabled ? 'Please use the source code editor to configure this property.' : ''}
            bodyContent={props.field.description}
            data-testid={'property-description-popover'}
            footerContent={
              <Text component={TextVariants.small}>Default: {props.defaultValue ?? <i>No default value</i>}</Text>
            }
          >
            <Button
              variant="plain"
              type="button"
              aria-label="More info for field"
              aria-describedby="form-group-label-info"
              className="pf-c-form__group-label-help"
              data-testid={'field-label-icon'}
            >
              <HelpIcon />
            </Button>
          </Popover>
        }
      >
        <TextInput
          id={props.id}
          isDisabled={props.disabled}
          readOnlyVariant={props.readOnly ? 'plain' : undefined}
          isRequired={!!props.required}
          value={props.value}
          onChange={(_event, value) => props.onChange?.(value)}
        />
      </FormGroup>
    </ExpandableDetails>
  );
});
