import { Suggestion, SuggestionRequestContext } from '@kaoto/forms';
import { KogitoEditorChannelApi } from '@kie-tools-core/editor/dist/api';
import { CatalogKind } from '../models';
import {
  CamelMainMavenInformation,
  CamelQuarkusMavenInformation,
  CamelSpringBootMavenInformation,
} from '../models/runtime-maven-information';
import { ISettingsModel } from '../models/settings';

export interface KaotoEditorChannelApi extends KogitoEditorChannelApi {
  /**
   * @deprecated Use `getVSCodeKaotoSettings().catalogUrl` instead
   * Returns the URL of the catalog.
   */
  getCatalogURL(): Promise<string | undefined>;

  /**
   * Returns the Kaoto VSCode settings defined.
   */
  getVSCodeKaotoSettings(): Promise<ISettingsModel>;

  /**
   * Get metadata querying a Kaoto metadata file.
   * @param key The key to retrieve the metadata from the Kaoto metadata file
   */
  getMetadata<T>(key: string): Promise<T | undefined>;

  /**
   * Save metadata to a Kaoto metadata file.
   * @param key The key to set the metadata
   * @param metadata The metadata to be saved
   */
  setMetadata<T>(key: string, metadata: T): Promise<void>;

  /**
   * Retrieve resource content
   * @param path The path of the resource relatively to the currently edited Camel file
   */
  getResourceContent(path: string): Promise<string | undefined>;

  /**
   * Save resource content
   * @param path The path of the resource relatively to the currently edited Camel file
   * @param content The content to be saved
   */
  saveResourceContent(path: string, content: string): Promise<void>;

  /**
   * Delete resource
   * @param path The path of the resource relatively to the currently edited Camel file
   * @return If the deletion was done succesfully
   */
  deleteResource(path: string): Promise<boolean>;

  /**
   * Show a file picker and ask the user to select one or more files available.
   * @param include The filter expression for the files to include
   * @param exclude The filter expression for the files to exclude
   * @param options The options to pass over. In VS Code, it is directly delivered as QuickPickOptions
   */
  askUserForFileSelection(
    include: string,
    exclude?: string,
    options?: Record<string, unknown>,
  ): Promise<string[] | string | undefined>;

  /**
   * Query the host application for suggestions
   * @param topic The topic for which suggestions are being requested (e.g., "properties", "kubernetes", "beans", etc.)
   * @param word The current word or input value for which suggestions are being requested
   * @param context Additional context for the suggestions, such as the property name and current input value.
   * @returns A promise that resolves to an array of suggestions, each containing a value, optional description, and optional group.
   */
  getSuggestions(topic: string, word: string, context: SuggestionRequestContext): Promise<Suggestion[]>;

  /**
   * @returns the runtime information if the opened file is part of a Maven project.
   * The returned Object is a direct parsing of the json string coming from Camel JBang.
   * In case it is not a Maven project or a problem occured, undefined is returned.
   */
  getRuntimeInfoFromMavenContext(): Promise<
    CamelMainMavenInformation | CamelQuarkusMavenInformation | CamelSpringBootMavenInformation | undefined
  >;

  /**
   * Notifies the host application that a step was added.
   * @param stepType The type of the step that was added (e.g., "component", "processor", "entity").
   * @param stepName The name of the step that was added.
   */
  onStepAdded(stepType: CatalogKind, stepName: string): Promise<void>;
}
