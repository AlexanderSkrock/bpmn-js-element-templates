import TestContainer from 'mocha-test-container-support';
import { act } from '@testing-library/preact';

import {
  bootstrapModeler,
  bootstrapPropertiesPanel,
  inject
} from 'test/TestHelper';

import coreModule from 'bpmn-js/lib/core';
import elementTemplatesModule from 'src/cloud-element-templates';
import modelingModule from 'bpmn-js/lib/features/modeling';
import zeebeModdlePackage from 'zeebe-bpmn-moddle/resources/zeebe';
import { BpmnPropertiesPanelModule } from 'bpmn-js-properties-panel';

import ZeebeBehaviorsModule from 'camunda-bpmn-js-behaviors/lib/camunda-cloud';


import diagramXML from './fixtures/condition.bpmn';
import messageDiagramXML from './fixtures/condition-message.bpmn';
import messageCorrelationDiagramXML from './fixtures/message-correlation-key.bpmn';

import template from './fixtures/condition.json';
import updateTemplates from './fixtures/condition-update.json';

import messageTemplates from './fixtures/condition-message.json';
import messageCorrelationTemplate from './fixtures/message-correlation-key.json';

import calledElementTemplate from './fixtures/condition-called-element.json';

import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import { findExtension, findMessage, findZeebeSubscription } from 'src/cloud-element-templates/Helper';
import ElementTemplatesConditionChecker from 'src/cloud-element-templates/ElementTemplatesConditionChecker';
import { getBpmnJS } from 'bpmn-js/test/helper';
import { isString } from 'min-dash';
import { query as domQuery } from 'min-dom';


describe('provider/cloud-element-templates - ElementTemplatesConditionChecker', function() {

  let container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    container: container,
    modules: [
      coreModule,
      elementTemplatesModule,
      modelingModule,
      ElementTemplatesConditionChecker,
      BpmnPropertiesPanelModule,
      {
        propertiesPanel: [ 'value', { registerProvider() {} } ]
      },
      ZeebeBehaviorsModule
    ],
    moddleExtensions: {
      zeebe: zeebeModdlePackage
    }
  }));


  describe('update property', function() {

    it('should add conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        const businessObject = getBusinessObject(element);

        // then
        expect(businessObject.get('customProperty')).to.exist;

        // empty values are not persisted in XML
        expect(businessObject.get('noDefaultProperty')).not.to.exist;

        expect(businessObject.get('isActiveCondition')).to.exist;
        expect(businessObject.get('isActiveCondition')).to.equal('otherProperty visible');
      })
    );


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2');
        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: ''
        });

        const businessObject = getBusinessObject(element);

        // then
        expect(businessObject.get('customProperty')).to.be.undefined;
        expect(businessObject.get('isActiveCondition')).to.be.undefined;
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        let businessObject = getBusinessObject(element);
        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        // then
        expectPropertyValue(businessObject, 'nameProp=foo');

        // when
        modeling.updateProperties(element, {
          name: 'bar'
        });

        // then
        expectPropertyValue(businessObject, 'nameProp=bar');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_1');
      changeTemplate(element, template);

      // when
      modeling.updateProperties(element, {
        name: 'foo'
      });

      const businessObject = getBusinessObject(element);

      // assume
      expect(businessObject.get('customProperty')).to.exist;

      // when
      commandStack.undo();

      expect(businessObject.get('customProperty')).to.be.undefined;
    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_1');
      changeTemplate(element, template);

      // when
      modeling.updateProperties(element, {
        name: 'foo'
      });

      const businessObject = getBusinessObject(element);

      // when
      commandStack.undo();

      // assume
      expect(businessObject.get('customProperty')).to.be.undefined;

      // when
      commandStack.redo();

      // then
      expect(businessObject.get('customProperty')).to.exist;

    }));

  });


  describe('update zeebe:taskDefinition:type and zeebe:taskDefinition', function() {

    it('should add conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        const businessObject = getBusinessObject(element);
        const taskDefinition = findExtension(businessObject, 'zeebe:TaskDefinition');

        // then
        expect(taskDefinition).to.exist;
      })
    );


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2');
        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: ''
        });

        const businessObject = getBusinessObject(element);
        const taskDefinition = findExtension(businessObject, 'zeebe:TaskDefinition');

        // then
        expect(taskDefinition).to.be.undefined;
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        let businessObject = getBusinessObject(element);

        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        // then
        expectTaskDefinitionType(businessObject, 'nameProp=foo');

        // when
        modeling.updateProperties(element, {
          name: 'foobar'
        });

        // then
        expectTaskDefinitionType(businessObject, 'nameProp=foobar');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_2');
      changeTemplate(element, template);

      // when
      modeling.updateProperties(element, {
        name: ''
      });

      const businessObject = getBusinessObject(element);

      // then
      expect(findExtension(businessObject, 'zeebe:TaskDefinition')).to.be.undefined;

      // when
      commandStack.undo();

      expect(findExtension(businessObject, 'zeebe:TaskDefinition')).to.exist;
    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_2');
      changeTemplate(element, template);

      // when
      modeling.updateProperties(element, {
        name: ''
      });

      const businessObject = getBusinessObject(element);

      // when
      commandStack.undo();

      expect(findExtension(businessObject, 'zeebe:TaskDefinition')).to.exist;

      // when
      commandStack.redo();

      // then
      expect(findExtension(businessObject, 'zeebe:TaskDefinition')).to.be.undefined;

    }));

  });


  describe('update zeebe:ioMapping', function() {

    it('should add conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        const ioMapping = findExtension(businessObject, 'zeebe:IoMapping');
        const inputs = ioMapping.get('zeebe:inputParameters');
        const outputs = ioMapping.get('zeebe:outputParameters');

        // then
        expect(inputs).to.have.lengthOf(1);
        expect(outputs).to.have.lengthOf(1);
      })
    );


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'bar'
        });

        const ioMapping = findExtension(businessObject, 'zeebe:IoMapping');
        const outputs = ioMapping.get('zeebe:outputParameters');

        // then
        expect(outputs).to.be.empty;
      })
    );


    it('should clear IO mapping if no input parameters', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: ''
        });

        const ioMapping = findExtension(businessObject, 'zeebe:IoMapping');

        // then
        expect(ioMapping).to.be.undefined;
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        // then
        expectOutputTarget(businessObject, 'nameProp=foo');

        // when
        modeling.updateProperties(element, {
          name: 'foobar'
        });

        // then
        expectOutputTarget(businessObject, 'nameProp=foobar');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_2');
      changeTemplate(element, template);

      const businessObject = getBusinessObject(element);

      // when
      modeling.updateProperties(element, {
        name: ''
      });

      // assume
      expect(findExtension(businessObject, 'zeebe:IoMapping')).to.be.undefined;

      // when
      commandStack.undo();

      expect(findExtension(businessObject, 'zeebe:IoMapping')).to.exist;

    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_2');
      changeTemplate(element, template);

      const businessObject = getBusinessObject(element);

      modeling.updateProperties(element, {
        name: ''
      });

      // when
      commandStack.undo();

      // assume
      expect(findExtension(businessObject, 'zeebe:IoMapping')).to.exist;

      // when
      commandStack.redo();

      // then
      expect(findExtension(businessObject, 'zeebe:IoMapping')).to.be.undefined;

    }));

  });


  describe('update zeebe:taskHeader', function() {

    it('should add conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        const taskHeaders = findExtension(businessObject, 'zeebe:TaskHeaders').get('values');

        // then
        expect(taskHeaders).to.have.lengthOf(1);
      })
    );


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'bar'
        });

        const taskHeaders = findExtension(businessObject, 'zeebe:TaskHeaders');

        // then
        expect(taskHeaders).to.be.undefined;
      })
    );


    it('should clear taskHeaders if no task headers', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'bar'
        });

        const taskHeaders = findExtension(businessObject, 'zeebe:TaskHeaders');

        // then
        expect(taskHeaders).to.be.undefined;
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1');
        changeTemplate(element, template);

        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        // then
        expectTaskHeaderValue(businessObject, 'nameProp=foo');

        // when
        modeling.updateProperties(element, {
          name: 'foobar'
        });

        // then
        expectTaskHeaderValue(businessObject, 'nameProp=foobar');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_1');
      changeTemplate(element, template);

      const businessObject = getBusinessObject(element);

      // when
      modeling.updateProperties(element, {
        name: 'foo'
      });

      // assume
      expect(findExtension(businessObject, 'zeebe:TaskHeaders')).to.exist;

      // when
      commandStack.undo();

      // then
      expect(findExtension(businessObject, 'zeebe:TaskHeaders')).not.to.exist;

    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_1');
      changeTemplate(element, template);

      const businessObject = getBusinessObject(element);

      // when
      modeling.updateProperties(element, {
        name: 'foo'
      });

      commandStack.undo();

      // assume
      expect(findExtension(businessObject, 'zeebe:TaskHeaders')).not.to.exist;

      // when
      commandStack.redo();

      // then
      expect(findExtension(businessObject, 'zeebe:TaskHeaders')).to.exist;
    }));

  });


  describe('update zeebe:property', function() {

    describe('adding conditional entries', function() {

      it('should add conditional entries', inject(
        async function(elementRegistry, modeling) {

          // given
          const element = elementRegistry.get('Task_1'),
                businessObject = getBusinessObject(element);

          changeTemplate(element, template);

          // when
          modeling.updateProperties(element, {
            name: 'foo'
          });

          // then
          const zeebeProperties = findExtension(businessObject, 'zeebe:Properties');

          expect(zeebeProperties).to.exist;
          expect(zeebeProperties.get('zeebe:properties')).to.have.lengthOf(1);
        })
      );


      it('should switch between conditional properties', inject(
        async function(elementRegistry, modeling) {

          // given
          const element = elementRegistry.get('Task_1'),
                businessObject = getBusinessObject(element);

          changeTemplate(element, template);

          // when
          modeling.updateProperties(element, {
            name: 'foo'
          });

          // then
          expectZeebePropertyValue(businessObject, '');

          // when
          modeling.updateProperties(element, {
            name: 'foobar'
          });

          // then
          expectZeebePropertyValue(businessObject, 'nameProp=foobar');
        })
      );


      it('undo', inject(function(commandStack, elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1'),
              businessObject = getBusinessObject(element);

        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        // assume
        expect(findExtension(businessObject, 'zeebe:Properties')).to.exist;

        // when
        commandStack.undo();

        // then
        expect(findExtension(businessObject, 'zeebe:Properties')).not.to.exist;
      }));


      it('redo', inject(function(commandStack, elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_1'),
              businessObject = getBusinessObject(element);

        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        commandStack.undo();

        // assume
        expect(findExtension(businessObject, 'zeebe:TaskHeaders')).not.to.exist;

        // when
        commandStack.redo();

        // then
        const zeebeProperties = findExtension(businessObject, 'zeebe:Properties');

        expect(zeebeProperties).to.exist;
        expect(zeebeProperties.get('zeebe:properties')).to.have.lengthOf(1);
      }));

    });


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Task_2'),
              businessObject = getBusinessObject(element);

        changeTemplate(element, template);

        // when
        modeling.updateProperties(element, {
          name: 'bar'
        });

        // then
        const zeebeProperties = findExtension(businessObject, 'zeebe:Properties');
        expect(zeebeProperties).not.to.exist;
      })
    );

  });


  describe('update bpmn:Message#property', function() {

    const template = messageTemplates[0];

    beforeEach(bootstrapModeler(messageDiagramXML, {
      container: container,
      modules: [
        coreModule,
        elementTemplatesModule,
        modelingModule,
        ElementTemplatesConditionChecker,
        BpmnPropertiesPanelModule,
        {
          propertiesPanel: [ 'value', { registerProvider() {} } ]
        }
      ],
      moddleExtensions: {
        zeebe: zeebeModdlePackage
      }
    }));

    beforeEach(inject(function(elementTemplates) {
      elementTemplates.set([ template ]);
    }));


    it('should add conditional entries', inject(async function(elementRegistry) {

      // given
      let element = elementRegistry.get('Event_3');

      // when
      element = changeTemplate(element, template);

      // then
      const message = findMessage(getBusinessObject(element));

      expect(message).to.have.property('name', 'one');
    }));


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Event_1');
        const property = findExtension(element, 'zeebe:Properties').get('properties')[0];

        // when
        modeling.updateModdleProperties(element, property, {
          value: 'three'
        });

        // then
        const message = findMessage(getBusinessObject(element));

        expect(message).not.to.have.property('name');
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('Event_1');
        const property = findExtension(element, 'zeebe:Properties').get('properties')[0];

        // when
        modeling.updateModdleProperties(element, property, {
          value: 'two'
        });

        // then
        const message = findMessage(getBusinessObject(element));

        expect(message).to.have.property('name', 'two');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      let element = elementRegistry.get('Event_1');
      const property = findExtension(element, 'zeebe:Properties').get('properties')[0];

      // when
      modeling.updateModdleProperties(element, property, {
        value: 'three'
      });

      // assume
      const message = findMessage(getBusinessObject(element));
      expect(message).not.to.have.property('name');

      // when
      commandStack.undo();

      expect(message).to.have.property('name', 'one');
    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      let element = elementRegistry.get('Event_1');
      const property = findExtension(element, 'zeebe:Properties').get('properties')[0];

      // when
      modeling.updateModdleProperties(element, property, {
        value: 'three'
      });

      // assume
      const message = findMessage(getBusinessObject(element));

      // when
      commandStack.undo();

      // assume
      expect(message).to.have.property('name', 'one');

      // when
      commandStack.redo();

      // then
      expect(message).not.to.have.property('name');
    }));


    it('should set zeebe:modelerTemplate on created message', inject(function(elementRegistry) {

      // given
      let element = elementRegistry.get('Event_3');

      // when
      element = changeTemplate(element, template);

      // then
      const message = findMessage(getBusinessObject(element));

      expect(message.get('zeebe:modelerTemplate')).to.eql(template.id);
    }));
  });


  describe('update bpmn:Message#zeebe:subscription#property', function() {

    const template = messageTemplates[1];

    beforeEach(bootstrapModeler(messageDiagramXML, {
      container: container,
      modules: [
        coreModule,
        elementTemplatesModule,
        modelingModule,
        ElementTemplatesConditionChecker,
        BpmnPropertiesPanelModule,
        {
          propertiesPanel: [ 'value', { registerProvider() {} } ]
        },
        ZeebeBehaviorsModule
      ],
      moddleExtensions: {
        zeebe: zeebeModdlePackage
      }
    }));

    beforeEach(inject(function(elementTemplates) {
      elementTemplates.set([ template ]);
    }));


    describe('correlationKey visibility', function() {

      beforeEach(bootstrapPropertiesPanel(messageCorrelationDiagramXML, {
        container: container,
        modules: [
          coreModule,
          elementTemplatesModule,
          modelingModule,
          ElementTemplatesConditionChecker,
          BpmnPropertiesPanelModule,
          ZeebeBehaviorsModule
        ],
        moddleExtensions: {
          zeebe: zeebeModdlePackage
        }
      }));

      beforeEach(inject(function(elementTemplates) {
        elementTemplates.set([ messageCorrelationTemplate ]);
      }));


      it('should show correlation key - MessageStartSubprocess', inject(async function(elementRegistry, selection) {

        // given
        let element = elementRegistry.get('MessageStartSubprocess');

        // when
        element = changeTemplate(element, messageCorrelationTemplate);
        await act(() => selection.select(element));

        // then
        const correlationKeyEntry = domQuery('[data-entry-id="custom-entry-message-correlation-key-rendering-1"]', container);
        expect(correlationKeyEntry).to.exist;
      }));


      it('should NOT show correlation key', inject(async function(elementRegistry, selection) {

        // given
        let element = elementRegistry.get('MessageStart');

        // when
        element = changeTemplate(element, messageCorrelationTemplate);
        await act(() => selection.select(element));

        // then
        const correlationKeyEntry = domQuery('[data-entry-id="custom-entry-message-correlation-key-rendering-1"]', container);
        expect(correlationKeyEntry).not.to.exist;
      }));

    });


    it('should add conditional entries', inject(async function(elementRegistry) {

      // given
      let element = elementRegistry.get('SubscriptionEvent_3');

      // when
      element = changeTemplate(element, template);

      // then
      const message = findMessage(getBusinessObject(element));
      const subscription = findZeebeSubscription(message);

      expect(subscription).to.have.property('correlationKey', 'one');
    }));


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('SubscriptionEvent_1');
        const property = findExtension(element, 'zeebe:Properties').get('properties')[0];

        // when
        modeling.updateModdleProperties(element, property, {
          value: 'three'
        });

        // then
        const message = findMessage(getBusinessObject(element));
        const subscription = findZeebeSubscription(message);

        expect(subscription).not.to.exist;
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = elementRegistry.get('SubscriptionEvent_1');
        const property = findExtension(element, 'zeebe:Properties').get('properties')[0];

        // when
        modeling.updateModdleProperties(element, property, {
          value: 'two'
        });

        // then
        const message = findMessage(getBusinessObject(element));
        const subscription = findZeebeSubscription(message);

        expect(subscription).to.have.property('correlationKey', 'two');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      let element = elementRegistry.get('SubscriptionEvent_1'),
          bo = getBusinessObject(element);
      const property = findExtension(bo, 'zeebe:Properties').get('properties')[0];

      // when
      modeling.updateModdleProperties(element, property, {
        value: 'three'
      });

      // assume
      let subscription = findZeebeSubscription(findMessage(bo));
      expect(subscription).to.not.exist;

      // when
      commandStack.undo();

      subscription = findZeebeSubscription(findMessage(bo));
      expect(subscription).to.have.property('correlationKey', 'one');
    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      let element = elementRegistry.get('SubscriptionEvent_1'),
          bo = getBusinessObject(element);
      const property = findExtension(bo, 'zeebe:Properties').get('properties')[0];

      // when
      modeling.updateModdleProperties(element, property, {
        value: 'three'
      });

      // assume
      let subscription = findZeebeSubscription(findMessage(bo));
      expect(subscription).to.not.exist;

      // when
      commandStack.undo();

      // assume
      subscription = findZeebeSubscription(findMessage(bo));
      expect(subscription).to.have.property('correlationKey', 'one');

      // when
      commandStack.redo();

      // then
      subscription = findZeebeSubscription(findMessage(bo));
      expect(subscription).to.not.exist;
    }));


    it('should set zeebe:modelerTemplate on created message', inject(function(elementRegistry) {

      // given
      let element = elementRegistry.get('SubscriptionEvent_3');

      // when
      element = changeTemplate(element, template);

      // then
      const message = findMessage(getBusinessObject(element));

      expect(message.get('zeebe:modelerTemplate')).to.eql(template.id);
    }));

  });


  describe('update zeebe:calledElement', function() {

    it('should add conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = changeTemplate(elementRegistry.get('Task_1'), calledElementTemplate);
        const businessObject = getBusinessObject(element);

        // when
        modeling.updateProperties(element, {
          name: 'foo'
        });

        const calledElement = findExtension(businessObject, 'zeebe:CalledElement');

        // then
        expect(calledElement).to.have.property('processId', 'one');
      })
    );


    it('should remove conditional entries', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = changeTemplate(elementRegistry.get('Task_1'), calledElementTemplate);
        const businessObject = getBusinessObject(element);

        modeling.updateProperties(element, {
          name: 'foo'
        });

        // when
        modeling.updateProperties(element, {
          name: ''
        });

        const calledElement = findExtension(businessObject, 'zeebe:CalledElement');

        // then
        expect(calledElement).not.to.exist;
      })
    );


    it('should switch between conditional properties', inject(
      async function(elementRegistry, modeling) {

        // given
        const element = changeTemplate(elementRegistry.get('Task_1'), calledElementTemplate);
        const businessObject = getBusinessObject(element);

        modeling.updateProperties(element, {
          name: 'foo'
        });

        // when
        modeling.updateProperties(element, {
          name: 'bar'
        });

        const calledElement = findExtension(businessObject, 'zeebe:CalledElement');

        // then
        expect(calledElement).to.have.property('processId', 'two');
      })
    );


    it('undo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = changeTemplate(elementRegistry.get('Task_1'), calledElementTemplate);
      const businessObject = getBusinessObject(element);

      modeling.updateProperties(element, {
        name: 'foo'
      });

      // when
      commandStack.undo();

      const calledElement = findExtension(businessObject, 'zeebe:CalledElement');

      // then
      expect(calledElement).not.to.exist;
    }));


    it('redo', inject(function(commandStack, elementRegistry, modeling) {

      // given
      const element = changeTemplate(elementRegistry.get('Task_1'), calledElementTemplate);
      const businessObject = getBusinessObject(element);

      modeling.updateProperties(element, {
        name: 'foo'
      });
      commandStack.undo();

      // when
      commandStack.redo();

      const calledElement = findExtension(businessObject, 'zeebe:CalledElement');

      // then
      expect(calledElement).to.have.property('processId', 'one');
    }));

  });


  describe('update referenced element', function() {

    const template = messageTemplates[2];

    beforeEach(bootstrapModeler(messageDiagramXML, {
      container: container,
      modules: [
        coreModule,
        elementTemplatesModule,
        modelingModule,
        ElementTemplatesConditionChecker,
        BpmnPropertiesPanelModule,
        {
          propertiesPanel: [ 'value', { registerProvider() {} } ]
        }
      ],
      moddleExtensions: {
        zeebe: zeebeModdlePackage
      }
    }));

    beforeEach(inject(function(elementTemplates) {
      elementTemplates.set([ template ]);
    }));


    it('should remove bpmn:Message if none bpmn:Message bindings are left', inject(
      async function(elementRegistry, modeling, bpmnjs) {

        // given
        const element = elementRegistry.get('Event_4');
        const property = findExtension(element, 'zeebe:Properties').get('properties')[0];
        const initialMessage = findMessage(getBusinessObject(element));
        const initialRootElements = bpmnjs.getDefinitions().get('rootElements');

        // assume
        expect(initialMessage).to.exist;

        // when
        modeling.updateModdleProperties(element, property, {
          value: 'three'
        });

        // then
        const message = findMessage(getBusinessObject(element));

        expect(message).not.to.exist;

        const rootElements = bpmnjs.getDefinitions().get('rootElements');
        expect(rootElements).to.have.lengthOf(initialRootElements.length - 1);
      })
    );


    it('should recreate bpmn:Message if message bindings are active again', inject(
      async function(elementRegistry, modeling, bpmnjs) {

        // given
        const element = elementRegistry.get('Event_4');
        const property = findExtension(element, 'zeebe:Properties').get('properties')[0];
        const initialMessage = findMessage(getBusinessObject(element));
        const initialRootElements = bpmnjs.getDefinitions().get('rootElements');

        // assume
        expect(initialMessage).to.exist;

        // when
        modeling.updateModdleProperties(element, property, {
          value: 'three'
        });
        modeling.updateModdleProperties(element, property, {
          value: 'two'
        });

        // then
        const message = findMessage(getBusinessObject(element));
        expect(message).to.exist;

        const rootElements = bpmnjs.getDefinitions().get('rootElements');
        expect(rootElements).to.have.lengthOf(initialRootElements.length);
      })
    );
  });


  describe('update template', function() {

    it('should keep property value when condition property is still active', inject(function(elementRegistry, modeling) {

      // given
      const element = elementRegistry.get('Task_1');
      changeTemplate(element, updateTemplates[0]);

      modeling.updateProperties(element, {
        name: 'foo'
      });

      const businessObject = getBusinessObject(element);

      // assume
      expect(businessObject.get('customProperty')).to.exist;
      expect(businessObject.get('customProperty')).to.eql('defaultValue');


      // when
      modeling.updateProperties(element, {
        customProperty: 'customValue'
      });

      // assume
      expect(businessObject.get('customProperty')).to.eql('customValue');

      // when
      changeTemplate(element, updateTemplates[1], updateTemplates[0]);

      // then
      expect(businessObject.get('customProperty')).to.eql('customValue');

    }));

  });
});



// helpers //////////

function changeTemplate(element, newTemplate, oldTemplate) {
  const templates = [];

  newTemplate && templates.push(newTemplate);
  oldTemplate && templates.push(oldTemplate);

  return getBpmnJS().invoke(function(elementTemplates, elementRegistry) {
    if (isString(element)) {
      element = elementRegistry.get(element);
    }

    expect(element).to.exist;

    elementTemplates.set(templates);

    return elementTemplates.applyTemplate(element, newTemplate);
  });
}

function expectPropertyValue(businessObject, value) {
  const property = businessObject.get('customProperty');

  expect(property).to.exist;
  expect(property).to.eql(value);
}

function expectTaskDefinitionType(businessObject, type) {
  const taskDefinition = findExtension(businessObject, 'zeebe:TaskDefinition');

  expect(taskDefinition).to.exist;
  expect(taskDefinition.type).to.eql(type);
}

function expectOutputTarget(businessObject, target) {
  const ioMapping = findExtension(businessObject, 'zeebe:IoMapping');
  const outputs = ioMapping.get('zeebe:outputParameters');

  expect(outputs).to.have.lengthOf(1);
  expect(outputs[0].target).to.eql(target);
}


function expectTaskHeaderValue(businessObject, value) {
  const taskHeaders = findExtension(businessObject, 'zeebe:TaskHeaders').get('values');

  expect(taskHeaders).to.have.lengthOf(1);
  expect(taskHeaders[0].value).to.eql(value);
}

function expectZeebePropertyValue(businessObject, value) {
  const zeebeProperties = findExtension(businessObject, 'zeebe:Properties');
  const properties = zeebeProperties.get('zeebe:properties');

  expect(zeebeProperties).to.exist;
  expect(properties).to.have.lengthOf(1);
  expect(properties[0].value).to.eql(value);
}