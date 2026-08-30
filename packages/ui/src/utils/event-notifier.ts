interface Events {
  'code:updated': { code: string; path?: string };
  'entities:updated': string;
}

export class EventNotifier extends EventTarget {
  private static instance: EventNotifier | undefined;

  static getInstance(): EventNotifier {
    this.instance ??= new EventNotifier();

    return this.instance;
  }

  next<EventName extends keyof Events>(event: EventName, payload: Events[EventName]): void {
    this.dispatchEvent(
      new CustomEvent(event, {
        detail: payload,
      }),
    );
  }

  subscribe<EventName extends keyof Events, EventPayload extends Events[EventName]>(
    event: EventName,
    consumerListener: (payload: EventPayload) => void,
  ): () => void {
    const localListener = (event: Event) => {
      consumerListener((event as CustomEvent).detail);
    };

    super.addEventListener(event, localListener);

    return () => {
      this.removeEventListener(event, localListener);
    };
  }
}
