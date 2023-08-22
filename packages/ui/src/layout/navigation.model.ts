import { Links } from '../router/links';

export interface SelectedNavItem {
  groupId: number | string;
  itemId: number | string;
  to: string;
}

interface SingleNavElement {
  title: string;
  to: Links;
}

interface NestedNavElement {
  title: string;
  children: SingleNavElement[];
}

export type NavElements = Array<SingleNavElement | NestedNavElement>;
