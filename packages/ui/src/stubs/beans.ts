export const beansYaml = `
- beans:
  - name: myBean
    type: io.kaoto.MyBean
    properties:
      p1: p1v
      p2: p2v
  - name: myBean2
    type: io.kaoto.MyBean
    properties:
      p1:
        p1s1: p1s1v
`;

export const beansJson = {
  beans: [
    {
      name: 'myBean',
      type: 'io.kaoto.MyBean',
      properties: {
        p1: 'p1v',
        p2: 'p2v',
      },
    },
    {
      name: 'myBean2',
      type: 'io.kaoto.MyBean',
      properties: {
        p1: {
          p1s1: 'p1s1v',
        },
      },
    },
  ],
};

export const beanWithConstructorAandPropertiesXML = `
<beans>
  <bean name="beanFromProps" type="com.acme.MyBean"  builderClass="com.acme.MyBeanBuilder" builderMethod="createMyBean" >
    <constructors>
      <constructor index="0" value="true"/>
      <constructor index="1" value="Hello World"/>
    </constructors>
        <!-- and you can still have properties -->
    <properties>
      <property key="field1" value="f1_p" />
      <property key="field2" value="f2_p" />
      <property key="nested.field1" value="nf1_p" />
      <property key="nested.field2" value="nf2_p" />
    </properties>
   </bean>
 </beans>
  `;

export const beanWithConstructorAandProperties = {
  beans: [
    {
      name: 'beanFromProps',
      type: 'com.acme.MyBean',
      builderClass: 'com.acme.MyBeanBuilder',
      builderMethod: 'createMyBean',
      constructors: { 0: 'true', 1: 'Hello World' },
      properties: {
        field1: 'f1_p',
        field2: 'f2_p',
        'nested.field1': 'nf1_p',
        'nested.field2': 'nf2_p',
      },
    },
  ],
};
