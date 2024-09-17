import { Links } from '../router/links.models';

export interface SelectedNavItem {
  groupId: number | string;
  itemId: number | string;
  to: string;
}

interface SingleNavElement {
  title: string;
  to: Links;
  hidden?: () => boolean;
}

interface NestedNavElement {
  title: string;
  children: SingleNavElement[];
  hidden?: () => boolean;
}

export type NavElements = Array<SingleNavElement | NestedNavElement>;
