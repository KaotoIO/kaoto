import { EditorApi } from '@kie-tools-core/editor/dist/api';
import { forwardRef, PropsWithChildren, useCallback, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { SourceCodeApiContext } from '../providers/source-code.provider';
import { EventNotifier } from '../utils';

export interface EnvelopeProviderRef extends EditorApi {
  setContent: (path: string, content: string) => Promise<void>;
  getContent: () => Promise<string>;
}

export interface EnvelopeProviderProps extends PropsWithChildren {
  onNewEdit: (edit: string) => Promise<void>;
}

export const EnvelopeProvider = forwardRef<EnvelopeProviderRef, EnvelopeProviderProps>(
  ({ onNewEdit, children }, ref) => {
    const sourceCodeRef = useRef<string>('');
    const sourceCodeApiContext = useContext(SourceCodeApiContext);
    const eventNotifier = EventNotifier.getInstance();

    /**
     * Callback is exposed to the Channel that is called when a new file is opened.
     * It sets the originalContent to the received value.
     */
    const setContent = useCallback(
      (path: string, content: string) => {
        /**
         * If the new content is the same as the current one, we don't need to update the Editor,
         * as it will regenerate the Camel Resource, hence disconnecting the configuration form (if open).
         *
         * This happens due to the multiplying architecture lifecycle, where the content is set
         * after saving the file.
         *
         * The lifecycle is:
         * 1. User edits the file either adding a new node or modifying an existing one using the form
         * 2. User saves the file
         * 3. The Envelope uses the `getContent` callback to retrieve the new content
         * 4. The Envelope sets the new content using the `setContent` callback
         *
         * At this point, both the new content and the current content are the same, so the Editor
         * don't need to be updated.
         */
        if (sourceCodeRef.current === content) return;

        sourceCodeApiContext.setCodeAndNotify(content, path);
        sourceCodeRef.current = content;
      },
      [sourceCodeApiContext],
    );

    /**
     * Subscribe to the `entities:updated` event to update the File content.
     */
    useEffect(() => {
      const unsubscribeFromEntities = eventNotifier.subscribe('entities:updated', (newContent: string) => {
        onNewEdit(newContent);
        sourceCodeRef.current = newContent;
      });

      const unsubscribeFromSourceCode = eventNotifier.subscribe('code:updated', ({ code: newContent }) => {
        /** Ignore the first change, from an empty string to the file content  */
        if (sourceCodeRef.current !== '') {
          onNewEdit(newContent);
        }
        sourceCodeRef.current = newContent;
      });

      return () => {
        unsubscribeFromEntities();
        unsubscribeFromSourceCode();
      };
    }, [eventNotifier, onNewEdit]);

    /**
     * The useImperativeHandler gives the control of the Editor component to who has it's reference,
     * making it possible to communicate with the Editor.
     * It returns all methods that are determined on the EditorApi.
     */
    useImperativeHandle(ref, () => ({
      /* Callback is exposed to the Channel to set the content of the file into the current Editor. */
      setContent: (path: string, content: string) => Promise.resolve(setContent(path, content)),

      /**
       * Callback is exposed to the Channel to retrieve the current value of the Editor. It returns the value of
       * the editorContent, which is the state that has the kaoto yaml.
       */
      getContent: () => Promise.resolve(sourceCodeRef.current),
      getPreview: () => Promise.resolve(undefined),
      undo: (): Promise<void> => {
        return Promise.resolve();
      },
      redo: (): Promise<void> => {
        return Promise.resolve();
      },
      validate: () => Promise.resolve([]),
      setTheme: () => Promise.resolve(),
    }));

    return <>{children};</>;
  },
);
