export interface FieldProps {
  propName: string;
  required?: boolean;
  onRemove?: (propName: string) => void;
}
