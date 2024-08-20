// generic icons
import expandIcon from '../assets/expand.svg';
import questionIcon from '../assets/question-mark.svg';

//EIP icons
import aggregate from '../assets/eip/aggregate.png';
import bean from '../assets/eip/bean.png';
import choice from '../assets/eip/choice.png';
import circuit_breaker from '../assets/eip/circuitBreaker.png';
import claim_check from '../assets/eip/claimCheck.png';
import convert_body from '../assets/eip/convertBody.png';
import delay from '../assets/eip/delay.png';
import dynamic_router from '../assets/eip/dynamic-router.png';
import enrich from '../assets/eip/enrich.png';
import filter from '../assets/eip/filter.png';
import generic_eip from '../assets/eip/generic.png';
import idempotent_consumer from '../assets/eip/idempotentConsumer.png';
import load_balance from '../assets/eip/load-balance.png';
import logEIP from '../assets/eip/log.png';
import loop from '../assets/eip/loop.png';
import multicast from '../assets/eip/multicast.png';
import otherwise from '../assets/eip/otherwise.png';
import throwException from '../assets/eip/throw-exception.png';
import pausable from '../assets/eip/pausable.png';
import pipeline from '../assets/eip/pipeline.png';
import poll from '../assets/eip/poll-enrich.png';
import poll_enrich from '../assets/eip/poll-enrich.png';
import process from '../assets/eip/process.png';
import recipient_list from '../assets/eip/recipient-list.png';
import remove_header from '../assets/eip/removeheader.png';
import remove_headers from '../assets/eip/removeheaders.png';
import remove_properties from '../assets/eip/removeproperties.png';
import remove_property from '../assets/eip/removeproperty.png';
import resequence from '../assets/eip/resequence.png';
import resumable from '../assets/eip/resumable.png';
import rollback from '../assets/eip/rollback.png';
import route from '../assets/eip/route.png';
import sample from '../assets/eip/sample.png';
import script from '../assets/eip/script.png';
import set_body from '../assets/eip/setbody.png';
import set_header from '../assets/eip/setheader.png';
import set_headers from '../assets/eip/setheaders.png';
import set_property from '../assets/eip/setproperty.png';
import sort from '../assets/eip/sort.png';
import split from '../assets/eip/split.png';
import step from '../assets/eip/step.png';
import stop from '../assets/eip/stop.png';
import threads from '../assets/eip/threads.png';
import throttle from '../assets/eip/throttle.png';
import to from '../assets/eip/to.png';
import to_d from '../assets/eip/toD.png';
import transform from '../assets/eip/transform.png';
import validate from '../assets/eip/validate.png';
import when from '../assets/eip/when.png';
import wiretap from '../assets/eip/wiretap.png';

// component icons
import activemq from '../assets/components/amq.svg';
import amqp from '../assets/components/amqp.svg';
import atlasmap from '../assets/components/atlasmap.svg';
import aws from '../assets/components/aws.png';
import aws2_ddb from '../assets/components/aws-ddb.svg';
import aws2_s3 from '../assets/components/aws-s3.svg';
import aws2_sns from '../assets/components/sns.svg';
import aws2_sqs from '../assets/components/sqs.svg';
import azure from '../assets/components/azure.png';
import cxf from '../assets/components/cxf.png';
import debezium from '../assets/components/debezium.png';
import dropbox from '../assets/components/dropbox.svg';
import facebook from '../assets/components/facebook.svg';
import fhir from '../assets/components/fhir.svg';
import file from '../assets/components/file.png';
import flink from '../assets/components/flink.svg';
import ftp from '../assets/components/ftp.png';
import generic_component from '../assets/components/generic-component.png';
import github from '../assets/components/github.svg';
import google_generic from '../assets/components/google-generic.svg';
import google_mail from '../assets/components/gmail.svg';
import google_calendar from '../assets/components/googlecalendar.svg';
import google_drive from '../assets/components/googledrive.svg';
import google_sheets from '../assets/components/googlesheets.svg';
import graphql from '../assets/components/graphql.png';
import hazelcast from '../assets/components/hazelcast.png';
import http from '../assets/components/http.svg';
import https from '../assets/components/https.svg';
import huawei from '../assets/components/huawei.svg';
import ignite from '../assets/components/ignite.png';
import irc from '../assets/components/irc.svg';
import jdbc from '../assets/components/jdbc.png';
import jira from '../assets/components/jira.svg';
import jms from '../assets/components/jms.png';
import kafka from '../assets/components/kafka.svg';
import kubernetes from '../assets/components/kubernetes.svg';
import logComponent from '../assets/components/log.svg';
import mail from '../assets/components/mail.png';
import mongodb from '../assets/components/mongodb.svg';
import mqtt from '../assets/components/mqtt3.png';
import netty from '../assets/components/netty.png';
import openshift from '../assets/components/openshift.png';
import openstack from '../assets/components/openstack.png';
import policy from '../assets/components/policy.png';
import quartz from '../assets/components/quartz.png';
import rss from '../assets/components/rss.png';
import salesforce from '../assets/components/salesforce.svg';
import sap_netweaver from '../assets/components/sap-netweaver.png';
import servicenow from '../assets/components/servicenow.svg';
import servlet from '../assets/components/servlet.png';
import sftp from '../assets/components/sftp.svg';
import slack from '../assets/components/slack.svg';
import smooks from '../assets/components/smooks.png';
import snmp from '../assets/components/snmp.png';
import spring from '../assets/components/spring.svg';
import splunk from '../assets/components/splunk.png';
import sql from '../assets/components/sql_db.png';
import sql_stored from '../assets/components/sql_db.png';
import telegram from '../assets/components/telegram.svg';
import timer from '../assets/components/timer.svg';
import twitter from '../assets/components/twitter.svg';
import velocity from '../assets/components/velocity.png';
import vertx from '../assets/components/vertx.png';
import webhook from '../assets/components/webhooks.svg';
import whatsapp from '../assets/components/whatsapp.png';
import workday from '../assets/components/workday.svg';
import xslt from '../assets/components/xslt2.png';

import { CatalogKind } from '../models/catalog-kind';
import { CamelCatalogService } from '../models/visualization/flows/camel-catalog.service';
import { EntityType } from '../models/camel/entities';

export const enum NodeIconType {
  Component,
  EIP,
  Kamelet,
  VisualEntity,
}

export class NodeIconResolver {
  static getIcon(elementName: string | undefined, type: NodeIconType): string {
    if (!elementName) {
      return this.getUnknownIcon();
    }

    if (elementName.startsWith('kamelet:')) {
      return this.getKameletIcon(elementName) ?? this.getUnknownIcon();
    }

    switch (type) {
      case NodeIconType.Kamelet:
        return this.getDefaultCamelIcon();
      case NodeIconType.Component:
        return this.getComponentIcon(elementName) ?? this.getDefaultCamelIcon();
      case NodeIconType.EIP:
        return this.getEIPIcon(elementName) ?? this.getDefaultCamelIcon();
      case NodeIconType.VisualEntity:
        return this.getVisualEntityIcon(elementName) ?? this.getDefaultCamelIcon();
    }
  }

  static getUnknownIcon(): string {
    return questionIcon;
  }

  static getPlaceholderIcon(): string {
    return expandIcon;
  }

  static getDefaultCamelIcon(): string {
    return generic_component;
  }

  private static getKameletIcon(elementName: string): string | undefined {
    const kameletDefinition = CamelCatalogService.getComponent(
      CatalogKind.Kamelet,
      elementName.replace('kamelet:', ''),
    );

    return kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'];
  }

  private static getComponentIcon(elementName: string): string | undefined {
    switch (elementName) {
      case 'activemq':
        return activemq;
      case 'amqp':
        return amqp;
      case 'arangodb':
      case 'as2':
      case 'asterisk':
      case 'atmosphere-websocket':
      case 'atom':
      case 'avro':
        return generic_component;
      case 'aws-cloudtrail':
      case 'aws-config':
      case 'aws-secrets-manager':
      case 'aws2-athena':
      case 'aws2-cw':
      case 'aws2-ec2':
      case 'aws2-ecs':
      case 'aws2-eks':
      case 'aws2-eventbridge':
      case 'aws2-iam':
      case 'aws2-kinesis':
      case 'aws2-kinesis-firehose':
      case 'aws2-kms':
      case 'aws2-lambda':
      case 'aws2-mq':
      case 'aws2-msk':
      case 'aws2-redshift-data':
      case 'aws2-ses':
      case 'aws2-step-functions':
      case 'aws2-sts':
      case 'aws2-timestream':
      case 'aws2-translate':
        return aws;
      case 'aws2-ddb':
      case 'aws2-ddbstream':
        return aws2_ddb;
      case 'aws2-s3':
        return aws2_s3;
      case 'aws2-sns':
        return aws2_sns;
      case 'aws2-sqs':
        return aws2_sqs;
      case 'azure-cosmosdb':
      case 'azure-eventhubs':
      case 'azure-files':
      case 'azure-key-vault':
      case 'azure-servicebus':
      case 'azure-storage-blob':
      case 'azure-storage-datalake':
      case 'azure-storage-queue':
        return azure;
      case 'bean':
      case 'bean-validator':
        return bean;
      case 'bonita':
      case 'box':
      case 'braintree':
      case 'browse':
      case 'caffeine-cache':
      case 'caffeine-loadcache':
      case 'chatscript':
      case 'chunk':
      case 'class':
      case 'cm-sms':
      case 'coap':
      case 'coap+tcp':
      case 'coaps':
      case 'coaps+tcp':
      case 'cometd':
      case 'cometds':
      case 'consul':
      case 'controlbus':
      case 'couchbase':
      case 'couchdb':
      case 'cql':
      case 'cron':
      case 'crypto':
        return generic_component;
      case 'cxf':
      case 'cxfrs':
        return cxf;
      case 'dataformat':
      case 'dataset':
      case 'dataset-test':
        return generic_component;
      case 'debezium-db2':
      case 'debezium-mongodb':
      case 'debezium-mysql':
      case 'debezium-oracle':
      case 'debezium-postgres':
      case 'debezium-sqlserver':
        return debezium;
      case 'dhis2':
      case 'digitalocean':
      case 'direct':
      case 'disruptor':
      case 'disruptor-vm':
      case 'djl':
      case 'dns':
      case 'docker':
      case 'drill':
        return generic_component;
      case 'dropbox':
        return dropbox;
      case 'dynamic-router':
      case 'ehcache':
      case 'elasticsearch':
      case 'etcd3':
      case 'exec':
        return generic_component;
      case 'facebook':
        return facebook;
      case 'fhir':
        return fhir;
      case 'file':
      case 'file-watch':
        return file;
      case 'flink':
        return flink;
      case 'flatpack':
      case 'fop':
      case 'freemarker':
        return generic_component;
      case 'ftp':
      case 'ftps':
        return ftp;
      case 'geocoder':
        return generic_component;
      case 'git':
      case 'github':
        return github;
      case 'google-bigquery':
      case 'google-bigquery-sql':
      case 'google-functions':
      case 'google-pubsub':
      case 'google-secret-manager':
      case 'google-storage':
        return google_generic;
      case 'google-calendar':
      case 'google-calendar-stream':
        return google_calendar;
      case 'google-drive':
        return google_drive;
      case 'google-mail':
      case 'google-mail-stream':
        return google_mail;
      case 'google-sheets':
      case 'google-sheets-stream':
        return google_sheets;
      case 'grape':
        return generic_component;
      case 'graphql':
        return graphql;
      case 'grpc':
      case 'guava-eventbus':
      case 'hashicorp-vault':
        return generic_component;
      case 'hazelcast-atomicvalue':
      case 'hazelcast-instance':
      case 'hazelcast-list':
      case 'hazelcast-map':
      case 'hazelcast-multimap':
      case 'hazelcast-queue':
      case 'hazelcast-replicatedmap':
      case 'hazelcast-ringbuffer':
      case 'hazelcast-seda':
      case 'hazelcast-set':
      case 'hazelcast-topic':
        return hazelcast;
      case 'hdfs':
        return generic_component;
      case 'http':
        return http;
      case 'https':
        return https;
      case 'hwcloud-dms':
      case 'hwcloud-frs':
      case 'hwcloud-functiongraph':
      case 'hwcloud-iam':
      case 'hwcloud-imagerecognition':
      case 'hwcloud-obs':
      case 'hwcloud-smn':
        return huawei;
      case 'iec60870-client':
      case 'iec60870-server':
        return generic_component;
      case 'ignite-cache':
      case 'ignite-compute':
      case 'ignite-events':
      case 'ignite-idgen':
      case 'ignite-messaging':
      case 'ignite-queue':
      case 'ignite-set':
        return ignite;
      case 'imap':
      case 'imaps':
        return mail;
      case 'infinispan':
      case 'infinispan-embedded':
      case 'influxdb':
      case 'influxdb2':
        return generic_component;
      case 'irc':
        return irc;
      case 'ironmq':
      case 'jcache':
      case 'jcr':
        return generic_component;
      case 'jdbc':
        return jdbc;
      case 'jetty':
      case 'jgroups':
      case 'jgroups-raft':
        return generic_component;
      case 'jira':
        return jira;
      case 'jms':
        return jms;
      case 'jmx':
      case 'jolt':
      case 'jooq':
      case 'jpa':
      case 'jslt':
      case 'json-patch':
      case 'json-validator':
      case 'jsonata':
      case 'jt400':
        return generic_component;
      case 'kafka':
        return kafka;
      //case 'kamelet': handled elsewhere
      case 'kubernetes-config-maps':
      case 'kubernetes-cronjob':
      case 'kubernetes-custom-resources':
      case 'kubernetes-deployments':
      case 'kubernetes-events':
      case 'kubernetes-hpa':
      case 'kubernetes-job':
      case 'kubernetes-namespaces':
      case 'kubernetes-nodes':
      case 'kubernetes-persistent-volumes':
      case 'kubernetes-persistent-volumes-claims':
      case 'kubernetes-pods':
      case 'kubernetes-replication-controllers':
      case 'kubernetes-resources-quota':
      case 'kubernetes-secrets':
      case 'kubernetes-service-accounts':
      case 'kubernetes-services':
        return kubernetes;
      case 'knative':
      case 'kudu':
      case 'language':
        return generic_component;
      case 'ldap':
        return policy;
      case 'ldif':
        return generic_component;
      case 'log':
        return logComponent;
      case 'lpr':
      case 'lucene':
      case 'lumberjack':
      case 'mapstruct':
        return generic_component;
      case 'marshal':
      case 'unmarshal':
        return transform;
      case 'master':
      case 'metrics':
      case 'micrometer':
      case 'mina':
      case 'minio':
      case 'mllp':
      case 'mock':
        return generic_component;
      case 'mongodb':
      case 'mongodb-gridfs':
        return mongodb;
      case 'mustache':
      case 'mvel':
      case 'mybatis':
      case 'mybatis-bean':
      case 'nats':
        return generic_component;
      case 'netty':
      case 'netty-http':
        return netty;
      case 'nitrite':
      case 'oaipmh':
      case 'olingo2':
      case 'olingo4':
      case 'opensearch':
        return generic_component;
      case 'openshift-build-configs':
      case 'openshift-builds':
      case 'openshift-deploymentconfigs':
        return openshift;
      case 'openstack-cinder':
      case 'openstack-glance':
      case 'openstack-keystone':
      case 'openstack-neutron':
      case 'openstack-nova':
      case 'openstack-swift':
        return openstack;
      case 'optaplanner':
        return generic_component;
      case 'paho':
      case 'paho-mqtt5':
        return mqtt;
      case 'pdf':
      case 'pg-replication-slot':
      case 'pgevent':
      case 'platform-http':
      case 'plc4x':
        return generic_component;
      case 'pop3':
      case 'pop3s':
        return mail;
      case 'pubnub':
      case 'pulsar':
        return generic_component;
      case 'quartz':
        return quartz;
      case 'quickfix':
      case 'reactive-streams':
      case 'ref':
      case 'rest':
      case 'rest-api':
      case 'rest-openapi':
      case 'robotframework':
      case 'rocketmq':
        return generic_component;
      case 'rss':
        return rss;
      case 'saga':
        return generic_component;
      case 'salesforce':
        return salesforce;
      case 'sap-netweaver':
        return sap_netweaver;
      case 'scheduler':
      case 'schematron':
      case 'scp':
      case 'seda':
      case 'service':
        return generic_component;
      case 'servicenow':
        return servicenow;
      case 'servlet':
        return servlet;
      case 'sftp':
        return sftp;
      case 'sjms':
      case 'sjms2':
        return generic_component;
      case 'slack':
        return slack;
      case 'smooks':
        return smooks;
      case 'smpp':
      case 'smpps':
        return generic_component;
      case 'smtp':
      case 'smtps':
        return mail;
      case 'snmp':
        return snmp;
      case 'splunk':
      case 'splunk-hec':
        return splunk;
      case 'spring-batch':
      case 'spring-event':
      case 'spring-jdbc':
      case 'spring-ldap':
      case 'spring-rabbitmq':
      case 'spring-redis':
      case 'spring-ws':
        return spring;
      case 'sql':
        return sql;
      case 'sql-stored':
        return sql_stored;
      case 'ssh':
      case 'stax':
      case 'stitch':
      case 'stomp':
      case 'stream':
      case 'string-template':
      case 'stub':
        return generic_component;
      case 'telegram':
        return telegram;
      case 'thrift':
      case 'thymeleaf':
      case 'tika':
        return generic_component;
      case 'timer':
        return timer;
      case 'twilio':
        return generic_component;
      case 'twitter-directmessage':
      case 'twitter-search':
      case 'twitter-timeline':
        return twitter;
      case 'undertow':
        return generic_component;
      case 'validator':
        return validate;
      case 'velocity':
        return velocity;
      case 'vertx':
      case 'vertx-http':
      case 'vertx-websocket':
        return vertx;
      case 'weather':
      case 'web3j':
        return generic_component;
      case 'webhook':
        return webhook;
      case 'whatsapp':
        return whatsapp;
      case 'wordpress':
        return generic_component;
      case 'workday':
        return workday;
      case 'xchange':
      case 'xj':
      case 'xmlsecurity-sign':
      case 'xmlsecurity-verify':
      case 'xmpp':
      case 'xquery':
        return generic_component;
      case 'xslt':
      case 'xslt-saxon':
        return xslt;
      case 'zeebe':
      case 'zendesk':
      case 'zookeeper':
      case 'zookeeper-master':
        return generic_component;
      default:
        return undefined;
    }
  }

  private static getEIPIcon(elementName: string): string | undefined {
    switch (elementName) {
      case 'aggregate':
        return aggregate;
      case 'bean':
        return bean;
      case 'choice':
        return choice;
      case 'circuitBreaker':
        return circuit_breaker;
      case 'claimCheck':
        return claim_check;
      case 'convertBodyTo':
        return convert_body;
      case 'customLoadBalancer':
        return load_balance;
      case 'delay':
        return delay;
      case 'dynamicRouter':
        return dynamic_router;
      case 'enrich':
        return enrich;
      case 'failover': // is that used?
        return generic_eip;
      case 'filter':
        return filter;
      case 'from':
        return expandIcon;
      case 'idempotentConsumer':
        return idempotent_consumer;
      // case 'kamelet': handled on top
      case 'kaoto-datamapper':
        return atlasmap;
      case 'loadBalance':
        return load_balance;
      case 'log':
        return logEIP;
      case 'loop':
        return loop;
      case 'marshal':
        return transform;
      case 'multicast':
        return multicast;
      case 'onFallback': // used?
        return generic_eip;
      case 'otherwise':
        return otherwise;
      case 'pausable':
        return pausable;
      case 'pipeline':
        return pipeline;
      case 'poll':
        return poll;
      case 'pollEnrich':
        return poll_enrich;
      case 'process':
        return process;
      case 'random': // used?
        return generic_eip;
      case 'recipientList':
        return recipient_list;
      case 'removeHeader':
        return remove_header;
      case 'removeHeaders':
        return remove_headers;
      case 'removeProperties':
        return remove_properties;
      case 'removeProperty':
        return remove_property;
      case 'resequence':
        return resequence;
      case 'resumable':
        return resumable;
      case 'rollback':
        return rollback;
      case 'roundRobin':
        return load_balance;
      case 'routingSlip':
        return generic_eip;
      case 'saga':
        return generic_eip; // todo saga
      case 'sample':
        return sample;
      case 'script':
        return script;
      case 'serviceCall': // used?
        return generic_eip;
      case 'setBody':
        return set_body;
      case 'setHeader':
        return set_header;
      case 'setHeaders':
        return set_headers;
      case 'setProperty':
        return set_property;
      case 'sort':
        return sort;
      case 'split':
        return split;
      case 'step':
        return step;
      case 'sticky': // used?
        return generic_eip;
      case 'stop':
        return stop;
      case 'threads':
        return threads;
      case 'throttle':
        return throttle;
      case 'to':
        return to;
      case 'toD':
        return to_d;
      case 'topic': // used?
        return generic_eip;
      case 'transform':
        return transform;
      case 'unmarshal':
        return transform;
      case 'validate':
        return validate;
      case 'weighted': // used?
        return generic_eip;
      case 'when':
        return when;
      case 'wireTap':
        return wiretap;
      default:
        return undefined;
    }
  }

  private static getVisualEntityIcon(elementName: string): string | undefined {
    switch (elementName) {
      case EntityType.Route:
        return route;
      case EntityType.OnException:
        return throwException;
      default:
        return undefined;
    }
  }
}
