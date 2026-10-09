import { CatalogKind } from '@kaoto/editor-api';

import icon_action_camel from '../../../../../../assets/camel-logo.svg';
import icon_action_async from '../../../../../../assets/citrus/async-action.svg';
import icon_action_conditional from '../../../../../../assets/citrus/conditional-action.svg';
import icon_action_create_endpoint from '../../../../../../assets/citrus/create-endpoint-action.svg';
import icon_action_create_variables from '../../../../../../assets/citrus/create-variables-action.svg';
import icon_action_delay from '../../../../../../assets/citrus/delay-action.svg';
import icon_action_direct from '../../../../../../assets/citrus/direct.svg';
import icon_action_generic from '../../../../../../assets/citrus/generic-action.svg';
import icon_action_groovy from '../../../../../../assets/citrus/groovy-action.png';
import icon_action_http from '../../../../../../assets/citrus/http-action.svg';
import icon_action_iterate from '../../../../../../assets/citrus/iterate-action.svg';
import icon_action_jbang from '../../../../../../assets/citrus/jbang-action.png';
import icon_action_knative from '../../../../../../assets/citrus/knative-action.png';
import icon_action_mail from '../../../../../../assets/citrus/mail.svg';
import icon_action_parallel from '../../../../../../assets/citrus/parallel-action.svg';
import icon_action_print from '../../../../../../assets/citrus/print-action.svg';
import icon_action_receive from '../../../../../../assets/citrus/receive-action.svg';
import icon_action_repeat from '../../../../../../assets/citrus/repeat-action.svg';
import icon_action_repeat_on_error from '../../../../../../assets/citrus/repeat-on-error-action.svg';
import icon_action_selenium from '../../../../../../assets/citrus/selenium-action.png';
import icon_action_send from '../../../../../../assets/citrus/send-action.svg';
import icon_action_sequential from '../../../../../../assets/citrus/sequential-action.svg';
import icon_action_soap from '../../../../../../assets/citrus/soap-action.svg';
import icon_action_testcontainers from '../../../../../../assets/citrus/testcontainers-action.png';
import icon_action_wait from '../../../../../../assets/citrus/wait-action.svg';
import icon_action_websocket from '../../../../../../assets/citrus/websocket-action.svg';
import icon_citrus_logo from '../../../../../../assets/citrus-logo.png';
import icon_component_activemq from '../../../../../../assets/components/activemq.svg';
import icon_component_amqp from '../../../../../../assets/components/amqp.svg';
import icon_component_arangodb from '../../../../../../assets/components/arangodb.svg';
import icon_component_avro from '../../../../../../assets/components/avro.svg';
import icon_component_aws from '../../../../../../assets/components/aws.png';
import icon_component_aws_bedrock from '../../../../../../assets/components/aws-bedrock.svg';
import icon_component_aws_cloudtrail from '../../../../../../assets/components/aws-cloudtrail.svg';
import icon_component_aws_config from '../../../../../../assets/components/aws-config.svg';
import icon_component_aws_secrets_manager from '../../../../../../assets/components/aws-secrets-manager.svg';
import icon_component_aws2_athena from '../../../../../../assets/components/aws2-athena.svg';
import icon_component_aws2_cw from '../../../../../../assets/components/aws2-cw.svg';
import icon_component_aws2_ddb from '../../../../../../assets/components/aws2-ddb.svg';
import icon_component_aws2_ddbstream from '../../../../../../assets/components/aws2-ddbstream.svg';
import icon_component_aws2_ec2 from '../../../../../../assets/components/aws2-ec2.svg';
import icon_component_aws2_ecs from '../../../../../../assets/components/aws2-ecs.svg';
import icon_component_aws2_eks from '../../../../../../assets/components/aws2-eks.svg';
import icon_component_aws2_eventbridge from '../../../../../../assets/components/aws2-eventbridge.svg';
import icon_component_aws2_iam from '../../../../../../assets/components/aws2-iam.svg';
import icon_component_aws2_kinesis from '../../../../../../assets/components/aws2-kinesis.svg';
import icon_component_aws2_kinesis_firehose from '../../../../../../assets/components/aws2-kinesis-firehose.svg';
import icon_component_aws2_kms from '../../../../../../assets/components/aws2-kms.svg';
import icon_component_aws2_lambda from '../../../../../../assets/components/aws2-lambda.svg';
import icon_component_aws2_mq from '../../../../../../assets/components/aws2-mq.svg';
import icon_component_aws2_msk from '../../../../../../assets/components/aws2-msk.svg';
import icon_component_aws2_redshift_data from '../../../../../../assets/components/aws2-redshift-data.svg';
import icon_component_aws2_s3 from '../../../../../../assets/components/aws2-s3.svg';
import icon_component_aws2_ses from '../../../../../../assets/components/aws2-ses.svg';
import icon_component_aws2_sns from '../../../../../../assets/components/aws2-sns.svg';
import icon_component_aws2_sqs from '../../../../../../assets/components/aws2-sqs.svg';
import icon_component_aws2_step_functions from '../../../../../../assets/components/aws2-step-functions.svg';
import icon_component_aws2_timestream from '../../../../../../assets/components/aws2-timestream.svg';
import icon_component_aws2_translate from '../../../../../../assets/components/aws2-translate.svg';
import icon_component_azure_cosmosdb from '../../../../../../assets/components/azure-cosmosdb.svg';
import icon_component_azure_eventhubs from '../../../../../../assets/components/azure-eventhubs.svg';
import icon_component_azure_files from '../../../../../../assets/components/azure-files.svg';
import icon_component_azure_key_vault from '../../../../../../assets/components/azure-key-vault.svg';
import icon_component_azure_servicebus from '../../../../../../assets/components/azure-servicebus.svg';
import icon_component_azure_storage_blob from '../../../../../../assets/components/azure-storage-blob.svg';
import icon_component_azure_datalake from '../../../../../../assets/components/azure-storage-datalake.svg';
import icon_component_azure_storage_queue from '../../../../../../assets/components/azure-storage-queue.svg';
import icon_component_bean_component from '../../../../../../assets/components/bean.svg';
import icon_component_box from '../../../../../../assets/components/box.svg';
import icon_component_brain from '../../../../../../assets/components/brain.svg';
import icon_component_braintree from '../../../../../../assets/components/braintree.svg';
import icon_component_cics from '../../../../../../assets/components/cics.svg';
import icon_component_consul from '../../../../../../assets/components/consul.svg';
import icon_component_couchbase from '../../../../../../assets/components/couchbase.svg';
import icon_component_couchdb from '../../../../../../assets/components/couchdb.svg';
import icon_component_cql from '../../../../../../assets/components/cql.svg';
import icon_component_crypto from '../../../../../../assets/components/crypto.svg';
import icon_component_cxf from '../../../../../../assets/components/cxf.png';
import icon_component_daffodil from '../../../../../../assets/components/daffodil.svg';
import icon_component_datamapper from '../../../../../../assets/components/datamapper.png';
import icon_component_debezium from '../../../../../../assets/components/debezium.svg';
import icon_component_dhis2 from '../../../../../../assets/components/dhis2.svg';
import icon_component_direct from '../../../../../../assets/components/direct.svg';
import icon_component_djl from '../../../../../../assets/components/djl.png';
import icon_component_docker from '../../../../../../assets/components/docker.svg';
import icon_component_drill from '../../../../../../assets/components/drill.svg';
import icon_component_dropbox from '../../../../../../assets/components/dropbox.svg';
import icon_component_elasticsearch from '../../../../../../assets/components/elasticsearch.svg';
import icon_component_email from '../../../../../../assets/components/email.svg';
import icon_component_email_receive from '../../../../../../assets/components/email_receive.svg';
import icon_component_email_send from '../../../../../../assets/components/email_send.svg';
import icon_component_etcd3 from '../../../../../../assets/components/etcd3.svg';
import icon_component_exec from '../../../../../../assets/components/exec.svg';
import icon_component_facebook from '../../../../../../assets/components/facebook.svg';
import icon_component_fhir from '../../../../../../assets/components/fhir.svg';
import icon_component_file from '../../../../../../assets/components/file.svg';
import icon_component_file_watch from '../../../../../../assets/components/file-watch.svg';
import icon_component_flink from '../../../../../../assets/components/flink.svg';
import icon_component_flowable from '../../../../../../assets/components/flowable.svg';
import icon_component_freemarker from '../../../../../../assets/components/freemarker.svg';
import icon_component_ftp from '../../../../../../assets/components/ftp.png';
import icon_component_generic from '../../../../../../assets/components/generic-component.png';
import icon_component_git from '../../../../../../assets/components/git.svg';
import icon_component_github from '../../../../../../assets/components/github.svg';
import icon_component_google_bigquery from '../../../../../../assets/components/google-bigquery.svg';
import icon_component_google_calendar from '../../../../../../assets/components/google-calendar.svg';
import icon_component_google_drive from '../../../../../../assets/components/google-drive.svg';
import icon_component_google_functions from '../../../../../../assets/components/google-functions.svg';
import icon_component_google_mail from '../../../../../../assets/components/google-mail.svg';
import icon_component_google_pubsub from '../../../../../../assets/components/google-pubsub.svg';
import icon_component_google_secret_manager from '../../../../../../assets/components/google-secret-manager.svg';
import icon_component_google_sheets from '../../../../../../assets/components/google-sheets.svg';
import icon_component_google_storage from '../../../../../../assets/components/google-storage.svg';
import icon_component_graphql from '../../../../../../assets/components/graphql.svg';
import icon_component_grpc from '../../../../../../assets/components/grpc.svg';
import icon_component_hashicorp_vault from '../../../../../../assets/components/hashicorp-vault.svg';
import icon_component_hazelcast from '../../../../../../assets/components/hazelcast.png';
import icon_component_http from '../../../../../../assets/components/http.svg';
import icon_component_https from '../../../../../../assets/components/https.svg';
import icon_component_huawei from '../../../../../../assets/components/huawei.svg';
import icon_component_ibm from '../../../../../../assets/components/ibm.svg';
import icon_component_ignite from '../../../../../../assets/components/ignite.png';
import icon_component_infinispan from '../../../../../../assets/components/infinispan.svg';
import icon_component_influxdb from '../../../../../../assets/components/influxdb2.svg';
import icon_component_irc from '../../../../../../assets/components/irc.svg';
import icon_component_jdbc from '../../../../../../assets/components/jdbc.png';
import icon_component_jetty from '../../../../../../assets/components/jetty.svg';
import icon_component_jira from '../../../../../../assets/components/jira.svg';
import icon_component_jms from '../../../../../../assets/components/jms.png';
import icon_component_jte from '../../../../../../assets/components/jte.svg';
import icon_component_kafka from '../../../../../../assets/components/kafka.svg';
import icon_component_keycloak from '../../../../../../assets/components/keycloak.svg';
import icon_component_kserve from '../../../../../../assets/components/kserve.svg';
import icon_component_kubernetes_generic from '../../../../../../assets/components/kubernetes.svg';
import icon_component_kubernetes_config_maps from '../../../../../../assets/components/kubernetes-config-maps.svg';
import icon_component_kubernetes_cronjob from '../../../../../../assets/components/kubernetes-cronjob.svg';
import icon_component_kubernetes_custom_resources from '../../../../../../assets/components/kubernetes-custom-resources.svg';
import icon_component_kubernetes_deployments from '../../../../../../assets/components/kubernetes-deployments.svg';
import icon_component_kubernetes_hpa from '../../../../../../assets/components/kubernetes-hpa.svg';
import icon_component_kubernetes_job from '../../../../../../assets/components/kubernetes-job.svg';
import icon_component_kubernetes_namespaces from '../../../../../../assets/components/kubernetes-namespaces.svg';
import icon_component_kubernetes_nodes from '../../../../../../assets/components/kubernetes-nodes.svg';
import icon_component_kubernetes_persistent_volumes from '../../../../../../assets/components/kubernetes-persistent-volumes.svg';
import icon_component_kubernetes_persistent_volumes_claims from '../../../../../../assets/components/kubernetes-persistent-volumes-claims.svg';
import icon_component_kubernetes_pods from '../../../../../../assets/components/kubernetes-pods.svg';
import icon_component_kubernetes_replication_controller from '../../../../../../assets/components/kubernetes-replication-controller.svg';
import icon_component_kubernetes_resources_quota from '../../../../../../assets/components/kubernetes-resources-quota.svg';
import icon_component_kubernetes_secrets from '../../../../../../assets/components/kubernetes-secrets.svg';
import icon_component_kubernetes_service_account from '../../../../../../assets/components/kubernetes-service-account.svg';
import icon_component_kubernetes_services from '../../../../../../assets/components/kubernetes-services.svg';
import icon_component_kudu from '../../../../../../assets/components/kudu.svg';
import icon_component_langchain4j from '../../../../../../assets/components/langchain4j.svg';
import icon_component_log from '../../../../../../assets/components/log.svg';
import icon_component_lucene from '../../../../../../assets/components/lucene.svg';
import icon_component_mapstruct from '../../../../../../assets/components/mapstruct.svg';
import icon_component_micrometer from '../../../../../../assets/components/micrometer.svg';
import icon_component_milvus from '../../../../../../assets/components/milvus.svg';
import icon_component_minio from '../../../../../../assets/components/minio.svg';
import icon_component_mongodb from '../../../../../../assets/components/mongodb.svg';
import icon_component_mqtt from '../../../../../../assets/components/mqtt.svg';
import icon_component_mustache from '../../../../../../assets/components/mustache.svg';
import icon_component_mybatis from '../../../../../../assets/components/mybatis.svg';
import icon_component_neo4j from '../../../../../../assets/components/neo4j.svg';
import icon_component_netty from '../../../../../../assets/components/netty.png';
import icon_component_nitrite from '../../../../../../assets/components/nitrite.svg';
import icon_component_odata from '../../../../../../assets/components/odata.svg';
import icon_component_openapi from '../../../../../../assets/components/openapi.svg';
import icon_component_opensearch from '../../../../../../assets/components/opensearch.svg';
import icon_component_openshift from '../../../../../../assets/components/openshift.svg';
import icon_component_openstack from '../../../../../../assets/components/openstack.svg';
import icon_component_pdf from '../../../../../../assets/components/pdf.svg';
import icon_component_pinecone from '../../../../../../assets/components/pinecone.svg';
import icon_component_platformhttp from '../../../../../../assets/components/platformhttp.png';
import icon_component_policy from '../../../../../../assets/components/policy.png';
import icon_component_postgresql from '../../../../../../assets/components/postgresql.svg';
import icon_component_printer from '../../../../../../assets/components/printer.svg';
import icon_component_pulsar from '../../../../../../assets/components/pulsar.svg';
import icon_component_qdrant from '../../../../../../assets/components/qdrant.svg';
import icon_component_quartz from '../../../../../../assets/components/quartz.png';
import icon_component_rocketmq from '../../../../../../assets/components/rocketmq.svg';
import icon_component_rss from '../../../../../../assets/components/rss.svg';
import icon_component_salesforce from '../../../../../../assets/components/salesforce.svg';
import icon_component_sap from '../../../../../../assets/components/sap.svg';
import icon_component_servicenow from '../../../../../../assets/components/servicenow.svg';
import icon_component_servlet from '../../../../../../assets/components/servlet.png';
import icon_component_sftp from '../../../../../../assets/components/sftp.svg';
import icon_component_slack from '../../../../../../assets/components/slack.svg';
import icon_component_smooks from '../../../../../../assets/components/smooks.svg';
import icon_component_snmp from '../../../../../../assets/components/snmp.png';
import icon_component_splunk from '../../../../../../assets/components/splunk.svg';
import icon_component_spring from '../../../../../../assets/components/spring.svg';
import icon_component_sql from '../../../../../../assets/components/sql_db.png';
import icon_component_stitch from '../../../../../../assets/components/stitch.svg';
import icon_component_telegram from '../../../../../../assets/components/telegram.svg';
import icon_component_template from '../../../../../../assets/components/template.svg';
import icon_component_tensorflow from '../../../../../../assets/components/tensorflow.svg';
import icon_component_thymeleaf from '../../../../../../assets/components/thymeleaf.svg';
import icon_component_timer from '../../../../../../assets/components/timer.svg';
import icon_component_twilio from '../../../../../../assets/components/twilio.svg';
import icon_component_twitter from '../../../../../../assets/components/twitter.svg';
import icon_component_velocity from '../../../../../../assets/components/velocity.png';
import icon_component_vertx from '../../../../../../assets/components/vertx.svg';
import icon_component_wasm from '../../../../../../assets/components/wasm.svg';
import icon_component_weather from '../../../../../../assets/components/weather.svg';
import icon_component_webhooks from '../../../../../../assets/components/webhooks.svg';
import icon_component_whatsapp from '../../../../../../assets/components/whatsapp.svg';
import icon_component_wordpress from '../../../../../../assets/components/wordpress.svg';
import icon_component_workday from '../../../../../../assets/components/workday.svg';
import icon_component_xmpp from '../../../../../../assets/components/xmpp.svg';
import icon_component_xslt from '../../../../../../assets/components/xslt2.png';
import icon_component_zendesk from '../../../../../../assets/components/zendesk.svg';
import icon_eip_aggregate from '../../../../../../assets/eip/aggregate.png';
import icon_eip_bean from '../../../../../../assets/eip/bean.png';
import icon_eip_choice from '../../../../../../assets/eip/choice.png';
import icon_eip_circuit_breaker from '../../../../../../assets/eip/circuitBreaker.png';
import icon_eip_claim_check from '../../../../../../assets/eip/claimCheck.png';
import icon_eip_convert_body from '../../../../../../assets/eip/convertBody.png';
import icon_eip_convert_header from '../../../../../../assets/eip/convertHeaderTo.png';
import icon_eip_convert_variable from '../../../../../../assets/eip/convertVariableTo.png';
import icon_eip_delay from '../../../../../../assets/eip/delay.png';
import icon_eip_dynamic_router from '../../../../../../assets/eip/dynamic-router.png';
import icon_eip_enrich from '../../../../../../assets/eip/enrich.png';
import icon_eip_filter from '../../../../../../assets/eip/filter.png';
import icon_eip_generic from '../../../../../../assets/eip/generic.png';
import icon_eip_idempotent_consumer from '../../../../../../assets/eip/idempotentConsumer.png';
import icon_eip_load_balance from '../../../../../../assets/eip/load-balance.png';
import icon_eip_log from '../../../../../../assets/eip/log.svg';
import icon_eip_loop from '../../../../../../assets/eip/loop.png';
import icon_eip_multicast from '../../../../../../assets/eip/multicast.png';
import icon_eip_otherwise from '../../../../../../assets/eip/otherwise.png';
import icon_eip_pausable from '../../../../../../assets/eip/pausable.png';
import icon_eip_pipeline from '../../../../../../assets/eip/pipeline.png';
import icon_eip_poll_enrich from '../../../../../../assets/eip/poll-enrich.png';
import icon_eip_process from '../../../../../../assets/eip/process.png';
import icon_eip_recipient_list from '../../../../../../assets/eip/recipient-list.png';
import icon_eip_remove_header from '../../../../../../assets/eip/removeheader.png';
import icon_eip_remove_headers from '../../../../../../assets/eip/removeheaders.png';
import icon_eip_remove_properties from '../../../../../../assets/eip/removeproperties.png';
import icon_eip_remove_property from '../../../../../../assets/eip/removeproperty.png';
import icon_eip_remove_variable from '../../../../../../assets/eip/removeVariable.png';
import icon_eip_resequence from '../../../../../../assets/eip/resequence.png';
import icon_eip_resumable from '../../../../../../assets/eip/resumable.png';
import icon_eip_rollback from '../../../../../../assets/eip/rollback.png';
import icon_eip_route from '../../../../../../assets/eip/route.png';
import icon_eip_sample from '../../../../../../assets/eip/sample.png';
import icon_eip_script from '../../../../../../assets/eip/script.png';
import icon_eip_set_body from '../../../../../../assets/eip/setbody.png';
import icon_eip_set_header from '../../../../../../assets/eip/setheader.png';
import icon_eip_set_headers from '../../../../../../assets/eip/setheaders.png';
import icon_eip_set_property from '../../../../../../assets/eip/setproperty.png';
import icon_eip_set_variable from '../../../../../../assets/eip/setvariable.png';
import icon_eip_set_variables from '../../../../../../assets/eip/setvariables.png';
import icon_eip_sort from '../../../../../../assets/eip/sort.png';
import icon_eip_split from '../../../../../../assets/eip/split.png';
import icon_eip_step from '../../../../../../assets/eip/step.png';
import icon_eip_stop from '../../../../../../assets/eip/stop.png';
import icon_eip_threads from '../../../../../../assets/eip/threads.png';
import icon_eip_throttle from '../../../../../../assets/eip/throttle.png';
import icon_eip_throwException from '../../../../../../assets/eip/throw-exception.png';
import icon_eip_to from '../../../../../../assets/eip/to.png';
import icon_eip_to_d from '../../../../../../assets/eip/toD.png';
import icon_eip_transform from '../../../../../../assets/eip/transform.png';
import icon_eip_validate from '../../../../../../assets/eip/validate.png';
import icon_eip_when from '../../../../../../assets/eip/when.png';
import icon_eip_wiretap from '../../../../../../assets/eip/wiretap.png';
import expandIcon from '../../../../../../assets/expand.svg';
import questionIcon from '../../../../../../assets/question-mark.svg';
import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { EntityType } from '../../../../../entities';
import { PlaceholderType } from '../../../../../placeholder.constants';

export class NodeIconResolver {
  static async getIcon(elementName: string | undefined, type: CatalogKind): Promise<string> {
    if (!elementName) {
      return this.getUnknownIcon();
    }

    if (elementName.startsWith('kamelet:')) {
      const kameletIcon = await this.getKameletIcon(elementName);
      return kameletIcon ?? this.getUnknownIcon();
    }

    switch (type) {
      case CatalogKind.Kamelet:
        return this.getDefaultCamelIcon();
      case CatalogKind.Component:
        return this.getComponentIcon(elementName) ?? this.getDefaultCamelIcon();
      case CatalogKind.Pattern:
      case CatalogKind.Processor:
        return this.getEIPIcon(elementName) ?? this.getDefaultCamelIcon();
      case CatalogKind.Entity:
        return this.getVisualEntityIcon(elementName) ?? this.getDefaultCamelIcon();
      case CatalogKind.TestAction:
      case CatalogKind.TestActionGroup:
      case CatalogKind.TestContainer:
      case CatalogKind.TestEndpoint:
      case CatalogKind.TestFunction:
      case CatalogKind.TestValidationMatcher:
        return this.getCitrusComponentIcon(elementName) ?? this.getDefaultCitrusIcon();
      default:
        return this.getDefaultCamelIcon();
    }
  }

  static getDefaultCamelIcon(): string {
    return icon_component_generic;
  }

  static getDefaultCitrusIcon(): string {
    return icon_citrus_logo;
  }

  private static getUnknownIcon(): string {
    return questionIcon;
  }

  private static async getKameletIcon(elementName: string): Promise<string | undefined> {
    const kameletDefinition = await DynamicCatalogRegistry.get().getEntity(
      CatalogKind.Kamelet,
      elementName.replace('kamelet:', ''),
    );

    return kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'];
  }

  private static readonly CITRUS_COMPONENT_PREFIX_ICONS: Array<readonly [string, string]> = [
    ['agent', icon_citrus_logo],
    ['camel', icon_action_camel],
    ['direct', icon_action_direct],
    ['http', icon_action_http],
    ['kafka', icon_component_kafka],
    ['mail', icon_action_mail],
    ['soap', icon_action_soap],
    ['docker', icon_component_docker],
    ['kubernetes', icon_component_kubernetes_generic],
    ['k8s', icon_component_kubernetes_generic],
    ['knative', icon_action_knative],
    ['openapi', icon_component_openapi],
    ['testcontainers', icon_action_testcontainers],
    ['selenium', icon_action_selenium],
    ['spring', icon_component_spring],
    ['channel', icon_component_spring],
    ['vertx', icon_component_vertx],
    ['websocket', icon_action_websocket],
  ];

  private static readonly CITRUS_COMPONENT_ICONS: ReadonlyMap<string, string> = new Map(
    Object.entries({
      test: icon_citrus_logo,
      action: icon_action_generic,
      createVariables: icon_action_create_variables,
      createEndpoint: icon_action_create_endpoint,
      iterate: icon_action_iterate,
      repeat: icon_action_repeat,
      repeatOnError: icon_action_repeat_on_error,
      sequential: icon_action_sequential,
      parallel: icon_action_parallel,
      conditional: icon_action_conditional,
      async: icon_action_async,
      print: icon_action_print,
      echo: icon_action_print,
      groovy: icon_action_groovy,
      jbang: icon_action_jbang,
      delay: icon_action_delay,
      sleep: icon_action_delay,
      receive: icon_action_receive,
      send: icon_action_send,
      waitFor: icon_action_wait,
    }),
  );

  private static getCitrusComponentIcon(elementName: string): string | undefined {
    for (const [prefix, icon] of this.CITRUS_COMPONENT_PREFIX_ICONS) {
      if (elementName.startsWith(prefix)) {
        return icon;
      }
    }

    return this.CITRUS_COMPONENT_ICONS.get(elementName);
  }

  private static readonly COMPONENT_ICONS: ReadonlyMap<string, string> = new Map(
    Object.entries({
      activemq: icon_component_activemq,
      activemq6: icon_component_activemq,
      amqp: icon_component_amqp,
      arangodb: icon_component_arangodb,
      atom: icon_component_rss,
      avro: icon_component_avro,
      'aws2-textract': icon_component_aws,
      'aws2-transcribe': icon_component_aws,
      'aws-bedrock': icon_component_aws_bedrock,
      'aws-bedrock-agent': icon_component_aws_bedrock,
      'aws-bedrock-agent-runtime': icon_component_aws_bedrock,
      'aws-cloudtrail': icon_component_aws_cloudtrail,
      'aws-config': icon_component_aws_config,
      'aws-secrets-manager': icon_component_aws_secrets_manager,
      'aws2-athena': icon_component_aws2_athena,
      'aws2-cw': icon_component_aws2_cw,
      'aws2-ddb': icon_component_aws2_ddb,
      'aws2-ddbstream': icon_component_aws2_ddbstream,
      'aws2-ec2': icon_component_aws2_ec2,
      'aws2-ecs': icon_component_aws2_ecs,
      'aws2-eks': icon_component_aws2_eks,
      'aws2-eventbridge': icon_component_aws2_eventbridge,
      'aws2-iam': icon_component_aws2_iam,
      'aws2-kinesis': icon_component_aws2_kinesis,
      'aws2-kinesis-firehose': icon_component_aws2_kinesis_firehose,
      'aws2-kms': icon_component_aws2_kms,
      'aws2-lambda': icon_component_aws2_lambda,
      'aws2-mq': icon_component_aws2_mq,
      'aws2-msk': icon_component_aws2_msk,
      'aws2-redshift-data': icon_component_aws2_redshift_data,
      'aws2-s3': icon_component_aws2_s3,
      'aws2-ses': icon_component_aws2_ses,
      'aws2-sns': icon_component_aws2_sns,
      'aws2-sqs': icon_component_aws2_sqs,
      'aws2-step-functions': icon_component_aws2_step_functions,
      'aws2-sts': icon_component_aws,
      'aws2-timestream': icon_component_aws2_timestream,
      'aws2-translate': icon_component_aws2_translate,
      'azure-cosmosdb': icon_component_azure_cosmosdb,
      'azure-eventhubs': icon_component_azure_eventhubs,
      'azure-files': icon_component_azure_files,
      'azure-key-vault': icon_component_azure_key_vault,
      'azure-servicebus': icon_component_azure_servicebus,
      'azure-storage-blob': icon_component_azure_storage_blob,
      'azure-storage-datalake': icon_component_azure_datalake,
      'azure-storage-queue': icon_component_azure_storage_queue,
      bean: icon_component_bean_component,
      'bean-validator': icon_component_bean_component,
      bonita: icon_component_generic,
      box: icon_component_box,
      braintree: icon_component_braintree,
      browse: icon_component_generic,
      'caffeine-cache': icon_component_generic,
      'caffeine-loadcache': icon_component_generic,
      chatscript: icon_component_brain,
      chunk: icon_component_generic,
      cics: icon_component_cics,
      class: icon_component_bean_component,
      'cm-sms': icon_component_generic,
      coap: icon_component_generic,
      'coap+tcp': icon_component_generic,
      coaps: icon_component_generic,
      'coaps+tcp': icon_component_generic,
      cometd: icon_component_generic,
      cometds: icon_component_generic,
      consul: icon_component_consul,
      controlbus: icon_component_generic,
      couchbase: icon_component_couchbase,
      couchdb: icon_component_couchdb,
      cql: icon_component_cql,
      cron: icon_component_timer,
      crypto: icon_component_crypto,
      cxf: icon_component_cxf,
      cxfrs: icon_component_cxf,
      dataformat: icon_component_generic,
      dataset: icon_component_generic,
      'dataset-test': icon_component_generic,
      'debezium-db2': icon_component_debezium,
      'debezium-mongodb': icon_component_debezium,
      'debezium-mysql': icon_component_debezium,
      'debezium-oracle': icon_component_debezium,
      'debezium-postgres': icon_component_debezium,
      'debezium-sqlserver': icon_component_debezium,
      dfdl: icon_component_daffodil,
      dhis2: icon_component_dhis2,
      digitalocean: icon_component_generic,
      direct: icon_component_direct,
      disruptor: icon_component_djl,
      'disruptor-vm': icon_component_djl,
      djl: icon_component_djl,
      dns: icon_component_generic,
      docker: icon_component_docker,
      drill: icon_component_drill,
      dropbox: icon_component_dropbox,
      'dynamic-router': icon_component_generic,
      'dynamic-router-control': icon_component_generic,
      ehcache: icon_component_generic,
      elasticsearch: icon_component_elasticsearch,
      'elasticsearch-rest-client': icon_component_elasticsearch,
      etcd3: icon_component_etcd3,
      exec: icon_component_exec,
      facebook: icon_component_facebook,
      fhir: icon_component_fhir,
      file: icon_component_file,
      'file-watch': icon_component_file_watch,
      flatpack: icon_component_generic,
      flink: icon_component_flink,
      flowable: icon_component_flowable,
      fop: icon_component_generic,
      freemarker: icon_component_freemarker,
      ftp: icon_component_ftp,
      ftps: icon_component_ftp,
      geocoder: icon_component_generic,
      git: icon_component_git,
      github: icon_component_github,
      'google-bigquery': icon_component_google_bigquery,
      'google-bigquery-sql': icon_component_google_bigquery,
      'google-calendar': icon_component_google_calendar,
      'google-calendar-stream': icon_component_google_calendar,
      'google-drive': icon_component_google_drive,
      'google-functions': icon_component_google_functions,
      'google-mail': icon_component_google_mail,
      'google-mail-stream': icon_component_google_mail,
      'google-pubsub': icon_component_google_pubsub,
      'google-pubsub-lite': icon_component_google_pubsub,
      'google-secret-manager': icon_component_google_secret_manager,
      'google-sheets': icon_component_google_sheets,
      'google-sheets-stream': icon_component_google_sheets,
      'google-storage': icon_component_google_storage,
      grape: icon_component_generic,
      graphql: icon_component_graphql,
      grpc: icon_component_grpc,
      'guava-eventbus': icon_component_generic,
      'hashicorp-vault': icon_component_hashicorp_vault,
      'hazelcast-atomicvalue': icon_component_hazelcast,
      'hazelcast-instance': icon_component_hazelcast,
      'hazelcast-list': icon_component_hazelcast,
      'hazelcast-map': icon_component_hazelcast,
      'hazelcast-multimap': icon_component_hazelcast,
      'hazelcast-queue': icon_component_hazelcast,
      'hazelcast-replicatedmap': icon_component_hazelcast,
      'hazelcast-ringbuffer': icon_component_hazelcast,
      'hazelcast-seda': icon_component_hazelcast,
      'hazelcast-set': icon_component_hazelcast,
      'hazelcast-topic': icon_component_hazelcast,
      http: icon_component_http,
      https: icon_component_https,
      'hwcloud-dms': icon_component_huawei,
      'hwcloud-frs': icon_component_huawei,
      'hwcloud-functiongraph': icon_component_huawei,
      'hwcloud-iam': icon_component_huawei,
      'hwcloud-imagerecognition': icon_component_huawei,
      'hwcloud-obs': icon_component_huawei,
      'hwcloud-smn': icon_component_huawei,
      'ibm-secrets-manager': icon_component_ibm,
      'iec60870-client': icon_component_generic,
      'iec60870-server': icon_component_generic,
      'ignite-cache': icon_component_ignite,
      'ignite-compute': icon_component_ignite,
      'ignite-events': icon_component_ignite,
      'ignite-idgen': icon_component_ignite,
      'ignite-messaging': icon_component_ignite,
      'ignite-queue': icon_component_ignite,
      'ignite-set': icon_component_ignite,
      imap: icon_component_email,
      imaps: icon_component_email,
      infinispan: icon_component_infinispan,
      'infinispan-embedded': icon_component_infinispan,
      influxdb: icon_component_influxdb,
      influxdb2: icon_component_influxdb,
      irc: icon_component_irc,
      ironmq: icon_component_generic,
      jcache: icon_component_generic,
      jcr: icon_component_generic,
      jdbc: icon_component_jdbc,
      jetty: icon_component_jetty,
      jgroups: icon_component_generic,
      'jgroups-raft': icon_component_generic,
      jira: icon_component_jira,
      jms: icon_component_jms,
      jmx: icon_component_generic,
      jolt: icon_component_generic,
      jooq: icon_component_generic,
      jpa: icon_component_generic,
      jslt: icon_component_generic,
      'json-patch': icon_component_generic,
      'json-validator': icon_component_generic,
      jsonata: icon_component_generic,
      jt400: icon_component_ibm,
      jte: icon_component_jte,
      kafka: icon_component_kafka,
      /** case 'kamelet': --> handled elsewhere **/
      keycloak: icon_component_keycloak,
      kserve: icon_component_kserve,
      knative: icon_component_generic,
      'kubernetes-config-maps': icon_component_kubernetes_config_maps,
      'kubernetes-cronjob': icon_component_kubernetes_cronjob,
      'kubernetes-custom-resources': icon_component_kubernetes_custom_resources,
      'kubernetes-deployments': icon_component_kubernetes_deployments,
      'kubernetes-events': icon_component_kubernetes_generic,
      'kubernetes-hpa': icon_component_kubernetes_hpa,
      'kubernetes-job': icon_component_kubernetes_job,
      'kubernetes-namespaces': icon_component_kubernetes_namespaces,
      'kubernetes-nodes': icon_component_kubernetes_nodes,
      'kubernetes-persistent-volumes': icon_component_kubernetes_persistent_volumes,
      'kubernetes-persistent-volumes-claims': icon_component_kubernetes_persistent_volumes_claims,
      'kubernetes-pods': icon_component_kubernetes_pods,
      'kubernetes-replication-controllers': icon_component_kubernetes_replication_controller,
      'kubernetes-resources-quota': icon_component_kubernetes_resources_quota,
      'kubernetes-secrets': icon_component_kubernetes_secrets,
      'kubernetes-service-accounts': icon_component_kubernetes_service_account,
      'kubernetes-services': icon_component_kubernetes_services,
      kudu: icon_component_kudu,
      'langchain4j-agent': icon_component_langchain4j,
      'langchain4j-chat': icon_component_langchain4j,
      'langchain4j-embeddings': icon_component_langchain4j,
      'langchain4j-tools': icon_component_langchain4j,
      'langchain4j-web-search': icon_component_langchain4j,
      language: icon_component_generic,
      ldap: icon_component_policy,
      ldif: icon_component_generic,
      log: icon_component_log,
      lpr: icon_component_printer,
      lucene: icon_component_lucene,
      lumberjack: icon_component_generic,
      mapstruct: icon_component_mapstruct,
      master: icon_component_generic,
      metrics: icon_component_generic,
      micrometer: icon_component_micrometer,
      milvus: icon_component_milvus,
      mina: icon_component_generic,
      minio: icon_component_minio,
      mllp: icon_component_generic,
      mock: icon_component_generic,
      mongodb: icon_component_mongodb,
      'mongodb-gridfs': icon_component_mongodb,
      mustache: icon_component_mustache,
      mvel: icon_component_generic,
      mybatis: icon_component_mybatis,
      'mybatis-bean': icon_component_mybatis,
      nats: icon_component_generic,
      neo4j: icon_component_neo4j,
      netty: icon_component_netty,
      'netty-http': icon_component_netty,
      nitrite: icon_component_nitrite,
      oaipmh: icon_component_generic,
      olingo2: icon_component_odata,
      olingo4: icon_component_odata,
      opensearch: icon_component_opensearch,
      'openshift-build-configs': icon_component_openshift,
      'openshift-builds': icon_component_openshift,
      'openshift-deploymentconfigs': icon_component_openshift,
      'openstack-cinder': icon_component_openstack,
      'openstack-glance': icon_component_openstack,
      'openstack-keystone': icon_component_openstack,
      'openstack-neutron': icon_component_openstack,
      'openstack-nova': icon_component_openstack,
      'openstack-swift': icon_component_openstack,
      optaplanner: icon_component_generic,
      paho: icon_component_mqtt,
      'paho-mqtt5': icon_component_mqtt,
      pdf: icon_component_pdf,
      'pg-replication-slot': icon_component_postgresql,
      pgevent: icon_component_postgresql,
      pinecone: icon_component_pinecone,
      'platform-http': icon_component_platformhttp,
      plc4x: icon_component_generic,
      pop3: icon_component_email_receive,
      pop3s: icon_component_email_receive,
      pubnub: icon_component_generic,
      pulsar: icon_component_pulsar,
      qdrant: icon_component_qdrant,
      quartz: icon_component_quartz,
      quickfix: icon_component_generic,
      'reactive-streams': icon_component_generic,
      ref: icon_component_generic,
      rest: icon_component_generic,
      'rest-api': icon_component_generic,
      'rest-openapi': icon_component_openapi,
      robotframework: icon_component_generic,
      rocketmq: icon_component_rocketmq,
      rss: icon_component_rss,
      saga: icon_component_generic,
      salesforce: icon_component_salesforce,
      'sap-netweaver': icon_component_sap,
      scheduler: icon_component_timer,
      schematron: icon_component_generic,
      scp: icon_component_generic,
      seda: icon_component_generic,
      service: icon_component_generic,
      servicenow: icon_component_servicenow,
      servlet: icon_component_servlet,
      sftp: icon_component_sftp,
      sjms: icon_component_generic,
      sjms2: icon_component_generic,
      slack: icon_component_slack,
      smb: icon_component_generic,
      smooks: icon_component_smooks,
      smpp: icon_component_generic,
      smpps: icon_component_generic,
      smtp: icon_component_email_send,
      smtps: icon_component_email_send,
      snmp: icon_component_snmp,
      solr: icon_component_generic,
      solrCloud: icon_component_generic,
      solrs: icon_component_generic,
      splunk: icon_component_splunk,
      'splunk-hec': icon_component_splunk,
      'spring-batch': icon_component_spring,
      'spring-event': icon_component_spring,
      'spring-jdbc': icon_component_spring,
      'spring-ldap': icon_component_spring,
      'spring-rabbitmq': icon_component_spring,
      'spring-redis': icon_component_spring,
      'spring-ws': icon_component_spring,
      sql: icon_component_sql,
      'sql-stored': icon_component_sql,
      ssh: icon_component_exec,
      stax: icon_component_generic,
      stitch: icon_component_stitch,
      stomp: icon_component_generic,
      stream: icon_component_generic,
      'string-template': icon_component_template,
      stub: icon_component_generic,
      'tahu-edge': icon_component_generic,
      'tahu-host': icon_component_generic,
      telegram: icon_component_telegram,
      'tensorflow-serving': icon_component_tensorflow,
      thrift: icon_component_generic,
      thymeleaf: icon_component_thymeleaf,
      tika: icon_component_generic,
      timer: icon_component_timer,
      twilio: icon_component_twilio,
      'twitter-directmessage': icon_component_twitter,
      'twitter-search': icon_component_twitter,
      'twitter-timeline': icon_component_twitter,
      undertow: icon_component_generic,
      validator: icon_eip_validate,
      velocity: icon_component_velocity,
      vertx: icon_component_vertx,
      'vertx-http': icon_component_vertx,
      'vertx-websocket': icon_component_vertx,
      wasm: icon_component_wasm,
      weather: icon_component_weather,
      web3j: icon_component_generic,
      webhook: icon_component_webhooks,
      whatsapp: icon_component_whatsapp,
      wordpress: icon_component_wordpress,
      workday: icon_component_workday,
      xchange: icon_component_generic,
      xj: icon_component_generic,
      'xmlsecurity-sign': icon_component_generic,
      'xmlsecurity-verify': icon_component_generic,
      xmpp: icon_component_xmpp,
      xquery: icon_component_generic,
      xslt: icon_component_xslt,
      'xslt-saxon': icon_component_xslt,
      zeebe: icon_component_generic,
      zendesk: icon_component_zendesk,
      zookeeper: icon_component_generic,
      'zookeeper-master': icon_component_generic,

      /** Transform **/
      marshal: icon_eip_transform,
      unmarshal: icon_eip_transform,
    }),
  );

  private static getComponentIcon(elementName: string): string | undefined {
    return this.COMPONENT_ICONS.get(elementName);
  }

  private static readonly EIP_ICONS: ReadonlyMap<string, string> = new Map(
    Object.entries({
      aggregate: icon_eip_aggregate,
      bean: icon_eip_bean,
      choice: icon_eip_choice,
      circuitBreaker: icon_eip_circuit_breaker,
      claimCheck: icon_eip_claim_check,
      convertBodyTo: icon_eip_convert_body,
      convertHeaderTo: icon_eip_convert_header,
      convertVariableTo: icon_eip_convert_variable,
      customLoadBalancer: icon_eip_load_balance,
      delay: icon_eip_delay,
      dynamicRouter: icon_eip_dynamic_router,
      enrich: icon_eip_enrich,
      failover: icon_eip_generic, // is that used?
      filter: icon_eip_filter,
      from: expandIcon,
      idempotentConsumer: icon_eip_idempotent_consumer,
      // case 'kamelet': handled on top
      'kaoto-datamapper': icon_component_datamapper,
      loadBalance: icon_eip_load_balance,
      log: icon_eip_log,
      loop: icon_eip_loop,
      marshal: icon_eip_transform,
      multicast: icon_eip_multicast,
      onFallback: icon_eip_generic, // used?
      otherwise: icon_eip_otherwise,
      pausable: icon_eip_pausable,
      pipeline: icon_eip_pipeline,
      poll: icon_eip_poll_enrich,
      pollEnrich: icon_eip_poll_enrich,
      process: icon_eip_process,
      random: icon_eip_generic, // used?
      recipientList: icon_eip_recipient_list,
      removeHeader: icon_eip_remove_header,
      removeHeaders: icon_eip_remove_headers,
      removeProperties: icon_eip_remove_properties,
      removeProperty: icon_eip_remove_property,
      removeVariable: icon_eip_remove_variable,
      resequence: icon_eip_resequence,
      resumable: icon_eip_resumable,
      rollback: icon_eip_rollback,
      roundRobin: icon_eip_load_balance,
      routingSlip: icon_eip_generic,
      saga: icon_eip_generic,
      sample: icon_eip_sample,
      script: icon_eip_script,
      serviceCall: icon_eip_generic,
      setBody: icon_eip_set_body,
      setHeader: icon_eip_set_header,
      setHeaders: icon_eip_set_headers,
      setProperty: icon_eip_set_property,
      setVariable: icon_eip_set_variable,
      setVariables: icon_eip_set_variables,
      sort: icon_eip_sort,
      split: icon_eip_split,
      step: icon_eip_step,
      sticky: icon_eip_generic,
      stop: icon_eip_stop,
      langChain4j: icon_component_langchain4j,
      threads: icon_eip_threads,
      throttle: icon_eip_throttle,
      to: icon_eip_to,
      toD: icon_eip_to_d,
      topic: icon_eip_generic,
      transform: icon_eip_transform,
      unmarshal: icon_eip_transform,
      validate: icon_eip_validate,
      weighted: icon_eip_generic,
      when: icon_eip_when,
      wireTap: icon_eip_wiretap,
    }),
  );

  private static getEIPIcon(elementName: string): string | undefined {
    return this.EIP_ICONS.get(elementName);
  }

  private static getVisualEntityIcon(elementName: string): string | undefined {
    switch (elementName) {
      case EntityType.Route:
        return icon_eip_route;
      case EntityType.OnException:
        return icon_eip_throwException;
      case PlaceholderType.Placeholder:
        return expandIcon;
      default:
        return undefined;
    }
  }
}
