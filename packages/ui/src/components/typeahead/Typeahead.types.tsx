import { IDataTestID } from '../../models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TypeaheadItem<T = any> {
  name: string;
  value: T;
  description?: string;
}

export interface TypeaheadProps extends IDataTestID {
  selectedItem?: TypeaheadItem;
  items: TypeaheadItem[];
  id?: string;
  placeholder?: string;
  onChange?: (item?: TypeaheadItem) => void;
  onCleanInput?: () => void;
  onCreate?: (value?: string, filterValue?: string) => void;
  onCreatePrefix?: string;
  disabled?: boolean;
}
