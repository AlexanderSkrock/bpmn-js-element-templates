import TestContainer from 'mocha-test-container-support';

import {
  act
} from '@testing-library/preact';

import {
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import { map } from 'min-dash';

import coreModule from 'bpmn-js/lib/core';
import modelingModule from 'bpmn-js/lib/features/modeling';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';

import zeebeModdlePackage from 'zeebe-bpmn-moddle/resources/zeebe';

import {
  bootstrapPropertiesPanel,
  clickInput as click,
  inject
} from 'test/TestHelper';

import { BpmnPropertiesPanelModule as BpmnPropertiesPanel } from 'bpmn-js-properties-panel';
import elementTemplatesModule from 'src/cloud-element-templates';
import { BpmnPropertiesProviderModule as BpmnPropertiesProvider } from 'bpmn-js-properties-panel';

import diagramXML from './ElementTemplatesPropertiesProvider.bpmn';
import templates from './ElementTemplatesPropertiesProvider.templates.json';
import entriesVisibleDiagramXML from './fixtures/entries-visible.bpmn';
import entriesVisibleTemplates from './fixtures/entries-visible.json';

import conditionTemplate from './fixtures/condition.json';
import multipleConditionTemplate from './fixtures/multiple-conditions.json';
import conditionXML from './fixtures/condition.bpmn';
import { changeInput } from '../../TestHelper';


describe('provider/cloud-element-templates - ElementTemplates', function() {

  let container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapPropertiesPanel(diagramXML, {
    container,
    modules: [
      BpmnPropertiesPanel,
      coreModule,
      BpmnPropertiesProvider,
      elementTemplatesModule,
      modelingModule
    ],
    moddleExtensions: {
      zeebe: zeebeModdlePackage
    },
    debounceInput: false,
    elementTemplates: templates
  }));


  describe('basics', function() {

    it('should display template group', inject(
      async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Task_1');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const group = domQuery('[data-group-id="group-ElementTemplates__Template"]', container);

        expect(group).to.exist;
      })
    );


    it('should display template group for deprecated template', inject(
      async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Deprecated');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const group = domQuery('[data-group-id="group-ElementTemplates__Template"]', container);

        expect(group).to.exist;
      })
    );


    it('should display template group for deprecated template (upgrade available)', inject(
      async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Deprecated_Upgrade');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const group = domQuery('[data-group-id="group-ElementTemplates__Template"]', container);

        expect(group).to.exist;
      })
    );


    it('should NOT display template group if no templates are available for element', inject(
      async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Gateway_1');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const group = domQuery('[data-group-id="group-ElementTemplates__Template"]', container);

        expect(group).not.to.exist;
      })
    );


    it('should display update template button update is available', inject(
      async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Task_2');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const updateAvailable = domQuery('.bio-properties-panel-template-update-available', container);

        expect(updateAvailable).to.exist;
      })
    );


    it('should NOT display update template button when no update is available', inject(
      async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('ServiceTask');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const updateAvailable = domQuery('.bio-properties-panel-template-update-available', container);

        expect(updateAvailable).not.to.exist;
      })
    );
  });


  describe('template#entriesVisible', function() {

    beforeEach(bootstrapPropertiesPanel(entriesVisibleDiagramXML, {
      container,
      modules: [
        BpmnPropertiesPanel,
        coreModule,
        BpmnPropertiesProvider,
        elementTemplatesModule,
        modelingModule
      ],
      moddleExtensions: {
        zeebe: zeebeModdlePackage
      },
      debounceInput: false,
      elementTemplates: entriesVisibleTemplates
    }));


    it('should show only general group, and template-related entries when entriesVisible is unset',
      inject(async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('ServiceTask');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        expectOnlyGroups(container, [
          'general',
          'ElementTemplates__Template'
        ]);
      })
    );


    it('should show only general group, and template-related entries when entriesVisible=false',
      inject(async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Task_2');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        expectOnlyGroups(container, [
          'general',
          'ElementTemplates__Template'
        ]);
      })
    );


    it('should show only general group, and template group when template is unknown',
      inject(async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('UnknownTemplateTask');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        expectOnlyGroups(container, [
          'general',
          'ElementTemplates__Template'
        ]);
      })
    );


    it('should show all available groups when entriesVisible=true',
      inject(async function(elementRegistry, selection) {

        // given
        const element = elementRegistry.get('Task_1');

        // when
        await act(() => {
          selection.select(element);
        });

        // then
        const groups = getGroupIds(container);

        expect(groups).to.contain('general');
        expect(groups).to.contain('ElementTemplates__Template');
        expect(groups).to.contain('documentation');
      })
    );
  });


  describe('template#select', function() {

    it('should fire `elementTemplates.select` when button is clicked template group', inject(
      async function(elementRegistry, selection, eventBus) {

        // given
        const spy = sinon.spy();
        const element = elementRegistry.get('Task_3');

        eventBus.on('elementTemplates.select', spy);

        await act(() => {
          selection.select(element);
        });
        const group = domQuery('[data-group-id="group-ElementTemplates__Template"]', container);
        const selectButton = domQuery('.bio-properties-panel-select-template-button', group);

        // when
        await act(() => {
          selectButton.click();
        });

        // then
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWithMatch({ element });
      })
    );
  });


  describe('template#remove', function() {

    it('should remove applied template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('Task_1');
        await act(() => selection.select(task));

        // when
        await removeTemplate(container);

        // then
        task = elementRegistry.get('Task_1');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
      })
    );


    it('should remove outdated template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('Task_2');
        await act(() => selection.select(task));

        // when
        await removeTemplate(container);

        // then
        task = elementRegistry.get('Task_2');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
      })
    );


    it('should remove unknown template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('UnknownTemplateTask');
        await act(() => selection.select(task));

        // when
        await removeTemplate(container);

        // then
        task = elementRegistry.get('UnknownTemplateTask');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
      })
    );


    it('should keep label', inject(
      async function(elementRegistry, selection, elementTemplates, modeling) {

        // given
        let task = elementRegistry.get('Task_1');

        modeling.updateLabel(task, 'old label');
        await act(() => selection.select(task));

        // when
        await removeTemplate(container);

        // then
        task = elementRegistry.get('Task_1');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
        expect(getLabel(task)).to.equal('old label');
      })
    );

  });


  describe('template#unlink', function() {

    it('should unlink applied template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('Task_1');
        await act(() => selection.select(task));

        // when
        await unlinkTemplate(container);

        // then
        task = elementRegistry.get('Task_1');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
      })
    );


    it('should unlink outdated template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('Task_2');
        await act(() => selection.select(task));

        // when
        await unlinkTemplate(container);

        // then
        task = elementRegistry.get('Task_2');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
      })
    );


    it('should unlink unknown template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('UnknownTemplateTask');
        await act(() => selection.select(task));

        // when
        await unlinkTemplate(container);

        // then
        task = elementRegistry.get('UnknownTemplateTask');
        const template = elementTemplates.get(task);

        expect(template).to.not.exist;
      })
    );
  });


  describe('template#update', function() {

    it('should update template', inject(
      async function(elementRegistry, selection, elementTemplates) {

        // given
        let task = elementRegistry.get('Task_2');
        await act(() => selection.select(task));

        // when
        await updateTemplate(container);

        // then
        task = elementRegistry.get('Task_2');
        const template = elementTemplates.get(task);

        expect(template).to.have.property('id', 'foo');
        expect(template).to.have.property('version', 3);
      })
    );
  });


  describe('conditional entries', function() {

    beforeEach(bootstrapPropertiesPanel(conditionXML, {
      container,
      modules: [
        BpmnPropertiesPanel,
        coreModule,
        elementTemplatesModule,
        modelingModule
      ],
      moddleExtensions: {
        zeebe: zeebeModdlePackage
      },
      debounceInput: false,
      elementTemplates: [
        conditionTemplate,
        multipleConditionTemplate
      ]
    }));


    describe('on creation', function() {

      it('should not show conditional entries', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_1');

          // when
          await act(() => {
            selection.select(element);
          });

          // then
          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          const listItems = domQueryAll('.bio-properties-panel-entry', group);

          expect(listItems).to.have.lengthOf(1);
        })
      );


      it('should show conditional entries', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_2');

          // when
          await act(() => {
            selection.select(element);
          });

          // then
          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          const listItems = domQueryAll('.bio-properties-panel-entry', group);

          expect(listItems).to.have.lengthOf(7);
        })
      );

    });


    describe('on input change', function() {

      it('should not show conditional entries', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_2');

          await act(() => {
            selection.select(element);
          });

          // assume
          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          let listItems = domQueryAll('.bio-properties-panel-entry', group);

          expect(listItems).to.have.lengthOf(7);

          // when
          const input = domQuery('input', listItems[0]);

          changeInput(input, '');
          listItems = domQueryAll('.bio-properties-panel-entry', group);

          // then
          expect(listItems).to.have.lengthOf(1);
        })
      );


      it('should show conditional entries', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_1');

          await act(() => {
            selection.select(element);
          });

          // assume
          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          let listItems = domQueryAll('.bio-properties-panel-entry', group);

          expect(listItems).to.have.lengthOf(1);

          // when
          const input = domQuery('input', listItems[0]);

          changeInput(input, 'foo');
          listItems = domQueryAll('.bio-properties-panel-entry', group);

          // then
          expect(listItems).to.have.lengthOf(7);
        })
      );

    });


    describe('multiple conditions', function() {

      it('should show if all conditions are met', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_3');

          // when
          await act(() => {
            selection.select(element);
          });

          // then
          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          const listItems = domQueryAll('.bio-properties-panel-entry', group);

          expect(listItems).to.have.lengthOf(3);
        })
      );


      it('should not show if no condition is met', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_3');

          await act(() => {
            selection.select(element);
          });

          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          let listItems = domQueryAll('.bio-properties-panel-entry', group);

          // when
          const input1 = domQuery('input', listItems[0]);
          const input2 = domQuery('input', listItems[1]);
          changeInput(input1, 'bar');
          changeInput(input2, 'bar');


          // then
          listItems = domQueryAll('.bio-properties-panel-entry', group);
          expect(listItems, group).to.have.lengthOf(2);
        })
      );


      it('should not show if at least one condition is not met', inject(
        async function(elementRegistry, selection) {

          // given
          const element = elementRegistry.get('Task_3');

          await act(() => {
            selection.select(element);
          });

          const group = domQuery('div[data-group-id="group-ElementTemplates__CustomProperties"]', container);
          let listItems = domQueryAll('.bio-properties-panel-entry', group);

          // when
          const input = domQuery('input', listItems[0]);
          changeInput(input, 'bar');

          // then
          listItems = domQueryAll('.bio-properties-panel-entry', group);
          expect(listItems, group).to.have.lengthOf(2);
        })
      );

    });

  });


  describe('templated message', function() {

    it('should hide templated message', inject(async function(elementRegistry, selection) {

      // given
      const event = elementRegistry.get('Event_1');

      // when
      await act(() => selection.select(event));
      const messageRefSelect = domQuery('select[name=messageRef]', container);

      // then
      expect(asOptionNamesList(messageRefSelect)).to.eql([
        '<none>',
        'Create new ...',
        'Message_1'
      ]);
    }));


    it('should still display select as first entry in group', inject(async function(elementRegistry, selection) {

      // given
      const event = elementRegistry.get('Event_1');

      // when
      await act(() => selection.select(event));
      const messageGroupEntries = domQueryAll('[data-group-id="group-message"] .bio-properties-panel-entry', container);
      const messageRefSelect = domQuery('[data-entry-id="messageRef"]', container);

      // then
      expect(messageGroupEntries[0]).to.eql(messageRefSelect);
    }));

  });


  describe('multiinstance characteristics', function() {

    it('should display multi-instance configuration', inject(
      async function(elementRegistry, selection, modeling, bpmnFactory) {

        // given
        const element = elementRegistry.get('Task_1'),
              loopCharacteristics = bpmnFactory.create('bpmn:MultiInstanceLoopCharacteristics');

        // when
        modeling.updateProperties(element, { loopCharacteristics });
        await act(() => {
          selection.select(element);
        });

        // then
        const group = domQuery('[data-group-id="group-multiInstance"]', container);

        expect(group).to.exist;
      })
    );
  });
});



// helper ////

/**
 * Remove template via dropdown menu.
 *
 * @param {Element} container
 */
function removeTemplate(container) {
  return clickDropdownItemWhere(container,
    button => domQuery('.bio-properties-panel-remove-template', button));
}

/**
 * Unlink template via dropdown menu.
 *
 * @param {Element} container
 */
function unlinkTemplate(container) {
  return clickDropdownItemWhere(container, element => element.textContent === 'Unlink');
}

/**
 * Update template via dropdown menu.
 *
 * @param {Element} container
 */
function updateTemplate(container) {
  return clickDropdownItemWhere(container, element => element.textContent === 'Update');
}

/**
 * Click dropdown item matching the condition.
 *
 * @param {Element} container
 * @param {(button: Element) => boolean} predicate
 * @returns
 */
function clickDropdownItemWhere(container, predicate) {
  if (!container) {
    throw new Error('container is missing');
  }

  const buttons = domQueryAll('.bio-properties-panel-dropdown-button__menu-item', container);

  for (const button of buttons) {
    if (predicate(button)) {
      return click(button);
    }
  }

  throw new Error('button is missing');
}

/**
 * Check if rendered groups match the provided ids.
 *
 * @param {Element} container
 * @param {string[]} expectedGroupIds
 */
function expectOnlyGroups(container, expectedGroupIds) {
  const groupIds = getGroupIds(container);

  expect(groupIds).to.deep.equal(expectedGroupIds);
}

/**
 * Get ids of rendered groups.
 *
 * @param {Element} container
 */
function getGroupIds(container) {
  if (!container) {
    throw new Error('container is missing');
  }

  const groups = domQueryAll('[data-group-id]', container);
  const groupIds = map(groups, group => withoutPrefix(group.dataset.groupId));

  return groupIds;
}

/**
 * @param {`group-${string}`} groupId
 * @returns {string}
 */
function withoutPrefix(groupId) {
  return groupId.slice(6);
}

function asOptionNamesList(select) {
  const names = [];
  const options = domQueryAll('option', select);

  options.forEach(o => names.push(o.label));

  return names;
}
