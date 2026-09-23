import { IDataTestID } from './react-component';

export interface FieldProps extends IDataTestID {
  /** Property name, e.g. #.correlationExpression */
  propName: string;

  /** Whether the field is required */
  required?: boolean;

  /** Callback to signal what to do when the user remove the value */
  onRemove?: (propName: string) => void;
}
