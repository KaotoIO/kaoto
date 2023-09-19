import { Button, Popover, Text, TextVariants } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type FieldLabelIconProps = {
  defaultValue?: any;
  description?: string;
  disabled: boolean;
};

/**
 * Returns a label tooltip element for the form or undefined if the field has no description
 * @returns
 * @param props
 */
export const FieldLabelIcon = (props: FieldLabelIconProps) => {
  const headerContent = props.disabled
    ? 'Please use the source code editor to configure this property.'
    : '';
  const bodyContent = props.description ? props.description : '';

  const footerContent = () => {
    return (
      <Text component={TextVariants.small}>
        Default: {props.defaultValue ?? <i>No default value</i>}
      </Text>
    );
  };

  return (
    <Popover
      aria-label={'Property description'}
      headerContent={headerContent}
      bodyContent={bodyContent}
      data-testid={'property-description-popover'}
      footerContent={footerContent}
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
  );
};
