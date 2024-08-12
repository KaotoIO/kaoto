export enum FormTabsModes {
  REQUIRED_FIELDS = 'Required',
  ALL_FIELDS = 'All',
  USER_MODIFIED = 'Modified',
}

enum FormTabsTooltips {
  REQUIRED_TAB = 'Shows Required fields only',
  ALL_TAB = 'Shows All fields',
  MODIFIED_TAB = 'Shows Modified fields only',
}

export function getTabTooltip(mode: FormTabsModes): string {
  switch (mode) {
    case FormTabsModes.REQUIRED_FIELDS:
      return FormTabsTooltips.REQUIRED_TAB;
      break;
    case FormTabsModes.ALL_FIELDS:
      return FormTabsTooltips.ALL_TAB;
      break;
    case FormTabsModes.USER_MODIFIED:
      return FormTabsTooltips.MODIFIED_TAB;
  }
}
