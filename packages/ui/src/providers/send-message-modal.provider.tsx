import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ICamelMessagePayload, ISendMessageModalOptions } from '../models/send-message';
import type { SendMessageRequest, SendMessageTarget } from '../models/send-message-runtime';

export interface SendMessageRuntime {
  targets: SendMessageTarget[];
  send: (request: SendMessageRequest) => Promise<void>;
}

export interface SendMessageModalContextValue {
  runtime?: SendMessageRuntime;
  isOpen: boolean;
  options: ISendMessageModalOptions | null;
  openSendMessageModal: (options: ISendMessageModalOptions) => void;
  closeSendMessageModal: () => void;
  sendMessage: (payload: ICamelMessagePayload, targetId?: string) => Promise<void>;
  isSending: boolean;
  error: string | null;
  recentMessageFiles: File[];
  rememberMessageFile: (file: File) => void;
}

export const SendMessageModalContext = createContext<SendMessageModalContextValue | undefined>(undefined);

export const SendMessageModalProvider: FunctionComponent<
  PropsWithChildren<{ runtime?: SendMessageRuntime; enabled?: boolean }>
> = ({ children, runtime, enabled = true }) => {
  const session = useRef(0);
  const sending = useRef(false);
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
    session.current++;
    sending.current = false;
    setIsSending(false);
    setOptions(modalOptions);
    setError(null);
    setIsOpen(true);
  }, []);

  const closeSendMessageModal = useCallback(() => {
    session.current++;
    sending.current = false;
    setIsOpen(false);
    setOptions(null);
    setError(null);
    setIsSending(false);
  }, []);

  const sendMessage = useCallback(
    async (payload: ICamelMessagePayload, targetId?: string) => {
      if (sending.current) return;
      sending.current = true;
      const currentSession = session.current;
      setIsSending(true);
      setError(null);
      try {
        if (options?.onSend) {
          if (targetId === undefined) await options.onSend(payload);
          else await options.onSend(payload, targetId);
        }
        if (session.current === currentSession) closeSendMessageModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        if (session.current === currentSession) setError(message);
        throw err;
      } finally {
        if (session.current === currentSession) {
          sending.current = false;
          setIsSending(false);
        }
      }
    },
    [closeSendMessageModal, options],
  );

  const value = useMemo<SendMessageModalContextValue>(
    () => ({
      runtime,
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
      runtime,
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

  return (
    <SendMessageModalContext.Provider value={enabled ? value : undefined}>{children}</SendMessageModalContext.Provider>
  );
};

export const useSendMessageModal = (): SendMessageModalContextValue | undefined => {
  return useContext(SendMessageModalContext);
};
