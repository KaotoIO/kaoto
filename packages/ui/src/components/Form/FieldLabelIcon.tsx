import { Button, Popover, Text, TextVariants } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';
import './FieldLabelIcon.scss';

interface FieldLabelIconProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: any;
  description?: string;
}

/**
 * Returns a label tooltip element for the form or undefined if the field has no description
 * @returns
 * @param props
 */
export const FieldLabelIcon: FunctionComponent<FieldLabelIconProps> = (props) => {
  if (!props.description) {
    return null;
  }

  return (
    <Popover
      aria-label="Property description"
      bodyContent={props.description}
      data-testid="property-description-popover"
      footerContent={<Text component={TextVariants.small}>Default: {props.default ?? <i>No default value</i>}</Text>}
    >
      <Button
        variant="plain"
        type="button"
        aria-label="More info for field"
        className="field-label-icon"
        data-testid="field-label-icon"
      >
        <HelpIcon />
      </Button>
    </Popover>
  );
};
