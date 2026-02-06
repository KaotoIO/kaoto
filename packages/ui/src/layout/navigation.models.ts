export interface SelectedNavItem {
  groupId: number | string;
  itemId: number | string;
  to: string;
}

interface SingleNavElement {
  title: string;
  to: string;
  hidden?: () => boolean;
  onClick?: () => void;
  isActive?: boolean | ((pathname: string) => boolean);
}

interface NestedNavElement {
  title: string;
  children: SingleNavElement[];
  hidden?: () => boolean;
}

export type NavElements = Array<SingleNavElement | NestedNavElement>;
