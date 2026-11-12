import './FormToolbar.scss';

import { Layer } from '@carbon/react';
import { Fragment, FunctionComponent } from 'react';

import { FormFilterField } from './FormFilterField';
import { FormSectionTabs } from './FormSectionTabs';

interface FormToolbarProps {
  showFilterField?: boolean;
  showSectionTabs?: boolean;
  /**
   * Wrap the controls in a Carbon `<Layer>` so their background differs from the toolbar surface.
   * Skip it when an ancestor already provides one.
   */
  withLayer?: boolean;
  /**
   * Called when Escape is pressed on the empty filter field.
   */
  onDismiss?: () => void;
}

/**
 * Sticky toolbar rendered before the form fields. It must NOT use the `kaoto-form` class and it must stay
 * a sibling placed before `<Form>`, otherwise the `.kaoto-form:has(*) + .kaoto-form__empty` rule breaks.
 * It is rendered outside the form `<Layer>`, so its surface matches the container the form lives in.
 */
export const FormToolbar: FunctionComponent<FormToolbarProps> = ({
  showFilterField,
  showSectionTabs,
  withLayer,
  onDismiss,
}) => {
  const LayerWrapper = withLayer ? Layer : Fragment;

  return (
    <div className="kaoto-form-toolbar" data-testid="kaoto-form-toolbar">
      <LayerWrapper>
        {showSectionTabs && <FormSectionTabs />}
        {showFilterField && <FormFilterField onDismiss={onDismiss} />}
      </LayerWrapper>
    </div>
  );
};
