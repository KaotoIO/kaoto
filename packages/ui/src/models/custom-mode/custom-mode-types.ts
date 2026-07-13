// kaoto/packages/ui/src/models/custom-mode/custom-mode-types.ts

/** A single tool permission group entry. Either a plain string (e.g. "read") or
 *  a tuple of [groupName, constraint] (e.g. ["edit", { fileRegex: "(\\.yaml$)" }]). */
export type CustomModeGroup = string | [string, { fileRegex: string }];

/** One mode definition — mirrors the YAML schema exactly. */
export interface CustomMode {
  slug: string;
  name: string;
  description: string;
  roleDefinition: string;
  whenToUse: string;
  customInstructions?: string;
  groups: CustomModeGroup[];
}

/** The top-level structure of a custom_modes.yaml file. */
export interface CustomModeFile {
  customModes: CustomMode[];
}
