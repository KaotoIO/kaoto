//POC - extend to include icons for all the EIP's
import defaultCamelIcon from '../assets/camel-logo.svg';
import questionIcon from '../assets/question-mark.svg';
import aggregator from '../assets/eip/aggregator.svg';
import channelAdapter from '../assets/eip/channel-adapter.svg';
import channelPurger from '../assets/eip/channel-purger.svg';
import channel from '../assets/eip/channel.svg';
import claimCheck from '../assets/eip/claim-check.svg';
import commandMessage from '../assets/eip/command-message.svg';
import competingConsumers from '../assets/eip/competing-consumers.svg';
import composedMessage from '../assets/eip/composed-message.svg';
import contentBasedRouter from '../assets/eip/content-based-router.svg';
import contentEnricher from '../assets/eip/content-enricher.svg';
import contentFilter from '../assets/eip/content-filter.svg';
import controlBus from '../assets/eip/control-bus.svg';
import corelationId from '../assets/eip/corelation-id.svg';
import datatypeChannel from '../assets/eip/datatype-channel.svg';
import deadLetterHannel from '../assets/eip/dead-letter-hannel.svg';
import detour from '../assets/eip/detour.svg';
import documentMessage from '../assets/eip/document-message.svg';
import durableSubscriber from '../assets/eip/durable-subscriber.svg';
import envelopeWrapper from '../assets/eip/envelope-wrapper.svg';
import eventDrivenConsumer from '../assets/eip/event-driven-consumer.svg';
import eventMessage from '../assets/eip/event-message.svg';
import invalidMessage from '../assets/eip/invalid-message.svg';
import messageBranch from '../assets/eip/message-branch.svg';
import messageBridge from '../assets/eip/message-bridge.svg';
import messageBus from '../assets/eip/message-bus.svg';
import messageDispatcher from '../assets/eip/message-dispatcher.svg';
import messageEndpoint from '../assets/eip/message-endpoint.svg';
import messageFilter from '../assets/eip/message-filter.svg';
import messageRouter from '../assets/eip/message-router.svg';
import messageSequence from '../assets/eip/message-sequence.svg';
import messageStore from '../assets/eip/message-store.svg';
import messageTranslator from '../assets/eip/message-translator.svg';
import message from '../assets/eip/message.svg';
import messagingGateway from '../assets/eip/messaging-gateway.svg';
import normalizer from '../assets/eip/normalizer.svg';
import polingConsumer from '../assets/eip/poling-consumer.svg';
import processManager from '../assets/eip/process-manager.svg';
import publishSubscribeChannel from '../assets/eip/publish-subscribe-channel.svg';
import recipientList from '../assets/eip/recipient-list.svg';
import requestReply from '../assets/eip/request-reply.svg';
import resequencer from '../assets/eip/resequencer.svg';
import returnAddress from '../assets/eip/return-address.svg';
import routingSlip from '../assets/eip/routing-slip.svg';
import selectiveConsumer from '../assets/eip/selective-consumer.svg';
import serviceArchivator from '../assets/eip/service-archivator.svg';
import splitter from '../assets/eip/splitter.svg';
import testMessage from '../assets/eip/test-message.svg';
import transactionalClient from '../assets/eip/transactional-client.svg';
import uaranteedDelivery from '../assets/eip/uaranteed-delivery.svg';
import wireTap from '../assets/eip/wire-tap.svg';

export class NodeIconResolver {
  static getIcon = (iconName: string | undefined): string => {
    switch (iconName) {
      case 'choice':
        return contentBasedRouter;
      case 'log':
        return 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTEyIDUxMjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPHBhdGggZD0iTTQ0OCwwSDY0QzQ2LjMyOCwwLDMyLDE0LjMxMywzMiwzMnY0NDhjMCwxNy42ODgsMTQuMzI4LDMyLDMyLDMyaDM4NGMxNy42ODgsMCwzMi0xNC4zMTIsMzItMzJWMzINCgkJQzQ4MCwxNC4zMTMsNDY1LjY4OCwwLDQ0OCwweiBNNjQsNDgwVjEyOGg4MHY2NEg5NnYxNmg0OHY0OEg5NnYxNmg0OHY0OEg5NnYxNmg0OHY0OEg5NnYxNmg0OHY4MEg2NHogTTQ0OCw0ODBIMTYwdi04MGgyNTZ2LTE2DQoJCUgxNjB2LTQ4aDI1NnYtMTZIMTYwdi00OGgyNTZ2LTE2SDE2MHYtNDhoMjU2di0xNkgxNjB2LTY0aDI4OFY0ODB6Ii8+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8L3N2Zz4NCg==';
      case 'claimCheck':
        return claimCheck;
      case 'aggregate':
        return aggregator;
      case 'enrich':
        return contentEnricher;
      case 'filter':
        return contentFilter;
      case 'split':
        return splitter;
      case 'wireTap':
        return wireTap;
      case 'marshal':
      case 'unmarshal':
        return messageTranslator;
      case 'recipientList':
        return recipientList;
      case 'resequence':
      case 'sort':
        return resequencer;
      case 'throttle':
      case 'threads':
        return eventDrivenConsumer;
      case 'loadBalance':
      case 'cicuitBreaker':
        return messageDispatcher;
      case 'serviceCall':
      case 'script':
        return messagingGateway;
      case 'saga':
      case 'transacted':
        return transactionalClient;
      case 'multicast':
        return messageDispatcher;
      case 'loop':
        return polingConsumer;
      case 'normalize':
        return normalizer;
      case 'validate':
      case 'selectiveConsumer':
        return selectiveConsumer;
      case 'idempotentConsumer':
      case 'resumableConsumer':
        return messageFilter;
      //---------

      case 'channel-purger':
        return channelPurger;
      case 'channel':
        return channel;
      case 'command-message':
        return commandMessage;
      case 'competing-consumers':
        return competingConsumers;
      case 'composed-message':
        return composedMessage;
      case 'control-bus':
        return controlBus;
      case 'datatype-channel':
        return datatypeChannel;
      case 'dead-letter-hannel':
        return deadLetterHannel;
      case 'detour':
        return detour;
      case 'document-message':
        return documentMessage;
      case 'durable-subscriber':
        return durableSubscriber;
      case 'envelope-wrapper':
        return envelopeWrapper;
      case 'event-driven-consumer':
        return eventDrivenConsumer;
      case 'event-message':
        return eventMessage;
      case 'invalid-message':
        return invalidMessage;
      case 'message-branch':
        return messageBranch;
      case 'message-bridge':
        return messageBridge;
      case 'message-bus':
        return messageBus;
      case 'message-endpoint':
        return messageEndpoint;
      case 'message-router':
        return messageRouter;
      case 'correlationId':
        return corelationId;
      case 'message-sequence':
        return messageSequence;
      case 'message-store':
        return messageStore;
      case 'message':
        return message;
      case 'process-manager':
        return processManager;
      case 'publish-subscribe-channel':
        return publishSubscribeChannel;
      case 'request-reply':
        return requestReply;
      case 'return-address':
        return returnAddress;
      case 'routing-slip':
        return routingSlip;
      case 'service-archivator':
        return serviceArchivator;
      case 'test-message':
        return testMessage;
      case 'guaranteed-delivery':
        return uaranteedDelivery;
      case 'channel-adapter':
        return channelAdapter;
      case '':
        return this.getUnknownIcon();
      default:
        return this.getDefaultCamelIcon();
    }
  };

  static getUnknownIcon = (): string => {
    return questionIcon;
  };
  static getDefaultCamelIcon = (): string => {
    return defaultCamelIcon;
  };
}
