import { KogitoEditorEnvelopeApi } from '@kie-tools-core/editor/dist/api';

/**
 * Kaoto Editor Envelope API
 *
 * This type alias represents the envelope-side API type for the Kaoto editor,
 * separating it from the channel API (KaotoEditorChannelApi) as required by
 * @kie-tools v10.1.0+.
 *
 * Currently, Kaoto uses only the standard envelope API methods from KogitoEditorEnvelopeApi.
 * If custom envelope methods are needed in the future, this can be converted to an interface
 * that extends KogitoEditorEnvelopeApi.
 *
 * The envelope API defines methods that the editor envelope (wrapper) exposes,
 * while the channel API defines methods that the host application (VS Code, etc.) exposes.
 */
export type KaotoEditorEnvelopeApi = KogitoEditorEnvelopeApi;
