export const aggregateXml = `
<aggregate aggregationStrategy="myAppender"
           aggregationStrategyMethodName="append"
           aggregationStrategyMethodAllowNull="true"
           completionSize="3">
           <correlationExpression>
            <constant resultType="java.lang.Integer">true</constant>
           </correlationExpression>
    <completionPredicate>
        <constant>predicate</constant>
    </completionPredicate>
      <completionTimeoutExpression>
        <datasonnet>datasonnet</datasonnet>
    </completionTimeoutExpression>
    <completionSizeExpression>
        <header>head</header>
    </completionSizeExpression>
    <to uri="mock:result"/>
</aggregate>
`;

export const circuitBreakerXml = `
<circuitBreaker>
  <onFallback>
    <transform>
      <constant>Fallback message</constant>
    </transform>
  </onFallback>
   <to uri="http://fooservice.com/slow"/>
</circuitBreaker>
`;

export const filterXml = `
<filter>
  <xpath>/person[@name='James']</xpath>
  <to uri="mock:result"/>
</filter>
`;

export const loadBalanceXml = `
<loadBalance>
  <roundRobinLoadBalancer/>
  <to uri="seda:x"/>
  <to uri="seda:y"/>
  <to uri="seda:z"/>
</loadBalance>
`;

export const loopXml = `
<loop>
  <header>loop</header>
  <to uri="mock:result"/>
</loop>
`;

export const multicastXml = `
<multicast  aggregationStrategy="#class:com.foo.MyAggregationStrategy" 
parallelProcessing="true" timeout="5000">
  <to uri="direct:b"/>
  <to uri="direct:c"/>
  <to uri="direct:d"/>
</multicast>
`;

export const pipelineXml = `
<pipeline>
  <to uri="bean:foo"/>
  <to uri="bean:bar"/>
  <to uri="activemq:wine"/>
</pipeline>
`;

export const resequenceXml = `
<resequence>
  <simple>body</simple>
  <batchConfig batchSize="300" batchTimeout="4000"/>
  <to uri="mock:result"/>
</resequence>
`;

export const sagaXml = `
<saga>
  <compensation uri="direct:compensation" />
  <completion uri="direct:completion" />
  <option key="myOptionKey">
    <constant>myOptionValue</constant>
  </option>
  <option key="myOptionKey2">
    <constant>myOptionValue2</constant>
  </option>
</saga>
`;

export const splitXml = `
<split parallelProcessing="true">
  <simple>body</simple>
  <to uri="direct:b"/>
  <to uri="direct:c"/>
  <to uri="direct:d"/>
</split>
`;

export const choiceXml = `
<choice>
  <when>
    <xpath>/ns1:foo/</xpath>
    <to uri="mock:bar"/>
  </when>
  <otherwise>
    <to uri="mock:other"/>
  </otherwise>
</choice>
`;

export const doTryXml = `
<doTry>
  <to uri="mock:try"/>
  <doCatch>
    <exception>java.lang.Exception</exception>
    <to uri="mock:catch"/>
  </doCatch>
  <doFinally>
    <to uri="mock:finally"/>
  </doFinally>
</doTry>
`;

export const deadLetterChannelXml = `
<errorHandler>
  <deadLetterChannel deadLetterUri="mock:dead">
    <redeliveryPolicy maximumRedeliveries="3" redeliveryDelay="250"/>
  </deadLetterChannel>
</errorHandler>
`;

export const enrichXml = `
<enrich>
  <simple>http:myserver/\${header.orderId}/order</simple>
</enrich>
`;

export const dynamicRouterXml = `
<dynamicRouter>
  <method beanType="com.foo.MySlipBean" method="slip"/>
</dynamicRouter>
`;

export const recipientListXml = `
<recipientList parallelProcessing="true">
  <header>myHeader</header>
</recipientList>
`;

export const routingSlipXml = `
<routingSlip ignoreInvalidEndpoints="true">
  <header>myHeader</header>
</routingSlip>
`;

export const throttleXml = `
<throttle timePeriodMillis="10000">
  <constant>3</constant>
</throttle>
`;
