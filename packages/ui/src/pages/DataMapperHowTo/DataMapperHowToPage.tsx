/*
    Copyright (C) 2024 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { Bullseye, List, ListComponent, ListItem, OrderType, Stack, StackItem, Title } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import icon_component_datamapper from '../../assets/components/datamapper.png';
import './DataMapperHowToPage.scss';
import catalog_datamapper from '../../assets/data-mapper/kaoto-datamapper-catalog.png';
import datamapper_step from '../../assets/data-mapper/datamapper-step.png';
import configure_button from '../../assets/data-mapper/configure-button.png';
import kaoto_design from '../../assets/data-mapper/kaoto-design.png';
import source_target from '../../assets/data-mapper/source-target.png';
import add_parameter from '../../assets/data-mapper/add-parameter.png';
import add_parameter_confirm from '../../assets/data-mapper/add_parameter_confirm.png';
import attach_schema_source_body from '../../assets/data-mapper/attach-schema-source-body.png';
import attach_schema_target_body from '../../assets/data-mapper/attach-schema-target-body.png';
import attach_schema_parameter from '../../assets/data-mapper/attach-schema-parameter.png';
import data_mapping from '../../assets/data-mapper/data-mapping.png';

export const DataMapperHowToPage: FunctionComponent = () => {
  return (
    <Bullseye className="datamapper-howto">
      <img className="data-mapper-icon" src={icon_component_datamapper} alt="Kaoto DataMapper icon" />
      <Title headingLevel="h1">Looking to configure the Kaoto DataMapper?</Title>

      <section>
        <Stack hasGutter>
          <StackItem>
            <p>
              The Kaoto DataMapper is a powerful graphical tool that allows you to design data mapping between different
              formats with Drag and Drop.
            </p>
          </StackItem>
          <StackItem>
            <p>To get started, follow the steps below:</p>
            <List component={ListComponent.ol} type={OrderType.number}>
              <ListItem>
                <p>
                  Add a Kaoto DataMapper step in your Camel route. When you <strong>Append</strong>,{' '}
                  <strong>Prepend</strong> or <strong>Replace</strong> a step in the Kaoto Design view, you can find the{' '}
                  <strong>Kaoto DataMapper</strong> step in the catalog.
                </p>
                <img src={catalog_datamapper} alt="Kaoto DataMapper step in the catalog" />
              </ListItem>
              <ListItem>
                <p>
                  Click the added <strong>Kaoto DataMapper</strong> step in the Kaoto Design view. It opens up{' '}
                  <strong>Kaoto DataMapper</strong> config form.
                </p>
                <img src={datamapper_step} alt="Kaoto DataMapper step" />
              </ListItem>
              <ListItem>
                <p>
                  In the <strong>Kaoto DataMapper</strong> config form, click <strong>Configure</strong> button. The
                  blank <strong>Kaoto DataMapper</strong> canvas will launch.
                </p>
                <img src={configure_button} alt="Configure button" />
              </ListItem>
              <ListItem>
                <p>
                  In the DataMapper canvas, you can see <strong>Source</strong> at the left and <strong>Target</strong>{' '}
                  at the right.
                </p>
                <img src={source_target} alt="Source and Target" />
                <p>
                  The <strong>Source</strong> is in an other word input, which the DataMapper step reads the data from.
                  This is mapped to the incoming Camel <strong>Message</strong> to the DataMapper step, as well as Camel{' '}
                  <strong>Variables</strong> and <strong>Exchange Properties</strong>.
                </p>
                <p>
                  The <strong>Target</strong> is in an other word output, which the DataMapper step writes the data to.
                  This is mapped to the outgoing Camel <strong>Message</strong> from the DataMapper step.
                </p>
              </ListItem>
              <ListItem>
                <p>
                  Add Parameter(s). The <strong>Parameters</strong> inside the <strong>Source</strong> is mapped to any
                  of incoming Camel <strong>Variables</strong>, <strong>Message Headers</strong> and{' '}
                  <strong>Exchange Properties</strong>. For example, if there is an incoming Camel Variable{' '}
                  <code>&quot;orderSequence&quot;</code>, you can consume it by adding a Parameter{' '}
                  <code>&quot;orderSequence&quot;</code> in the DataMapper Source section.
                </p>
                <p>
                  <img src={add_parameter} alt="Add Parameter" />
                </p>
                <p>
                  <img src={add_parameter_confirm} alt="Add Parameter orderSequence" />
                </p>
              </ListItem>
              <ListItem>
                <p>
                  Attach Document schema(s). Attach the schema file of the incoming Camel <strong>Message Body</strong>{' '}
                  to the <strong>Source Body</strong> if it&apos;s a structured data.
                </p>
                <img src={attach_schema_source_body} alt="Attach source body schema" />
                <p>
                  Attach the schema file of the outgoing Camel <strong>Message Body</strong> to the{' '}
                  <strong>Target Body</strong> if it&apos;s a structured data.
                </p>
                <img src={attach_schema_target_body} alt="Attach target body schema" />
                <p>
                  If any of the Parameter(s) is/are structured data, you can also attach the schema for{' '}
                  <strong>Parameters</strong> as well.
                </p>
                <img src={attach_schema_parameter} alt="Attach Parameter schema" />
              </ListItem>
              <ListItem>
                <p>
                  Now you can start designing your data mappings by drag and drop between <strong>Source</strong> and{' '}
                  <strong>Target</strong>
                </p>
                <img src={data_mapping} alt="Data Mapping" />
              </ListItem>
              <ListItem>
                <p>
                  Once you finish designing data mappings, click <strong>Design</strong> tab to go back to the Kaoto
                  main canvas.
                </p>
                <img src={kaoto_design} alt="Design tab" />
              </ListItem>
            </List>
          </StackItem>
        </Stack>
      </section>
    </Bullseye>
  );
};
