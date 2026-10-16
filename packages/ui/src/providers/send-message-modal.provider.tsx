import { createContext, FunctionComponent, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { ICamelMessagePayload, ISendMessageModalOptions } from '../models/send-message';

export interface SendMessageModalContextValue {
  isOpen: boolean;
  options: ISendMessageModalOptions | null;
  openSendMessageModal: (options: ISendMessageModalOptions) => void;
  closeSendMessageModal: () => void;
  sendMessage: (payload: ICamelMessagePayload) => Promise<void>;
  isSending: boolean;
  error: string | null;
  recentMessageFiles: File[];
  rememberMessageFile: (file: File) => void;
}

export const SendMessageModalContext = createContext<SendMessageModalContextValue | undefined>(undefined);

export const SendMessageModalProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ISendMessageModalOptions | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentMessageFiles, setRecentMessageFiles] = useState<File[]>([]);

  const rememberMessageFile = useCallback((file: File) => {
    setRecentMessageFiles((previous) =>
      [
        file,
        ...previous.filter(
          (entry) => entry.name !== file.name || entry.size !== file.size || entry.lastModified !== file.lastModified,
        ),
      ].slice(0, 3),
    );
  }, []);

  const openSendMessageModal = useCallback((modalOptions: ISendMessageModalOptions) => {
    setOptions(modalOptions);
    setError(null);
    setIsOpen(true);
  }, []);

  const closeSendMessageModal = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
    setError(null);
    setIsSending(false);
  }, []);

  const sendMessage = useCallback(
    async (payload: ICamelMessagePayload) => {
      setIsSending(true);
      setError(null);
      try {
        if (options?.onSend) {
          await options.onSend(payload);
        }
        closeSendMessageModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [closeSendMessageModal, options],
  );

  const value = useMemo<SendMessageModalContextValue>(
    () => ({
      isOpen,
      options,
      openSendMessageModal,
      closeSendMessageModal,
      sendMessage,
      isSending,
      error,
      recentMessageFiles,
      rememberMessageFile,
    }),
    [
      isOpen,
      options,
      openSendMessageModal,
      closeSendMessageModal,
      sendMessage,
      isSending,
      error,
      recentMessageFiles,
      rememberMessageFile,
    ],
  );

  return <SendMessageModalContext.Provider value={value}>{children}</SendMessageModalContext.Provider>;
};

export const useSendMessageModal = (): SendMessageModalContextValue | undefined => {
  return useContext(SendMessageModalContext);
};
