import ElementTemplatesGroup from './components/ElementTemplatesGroup';

import {
  CustomProperties,
  InputProperties
} from './properties';

const CAMUNDA_INPUT_PARAMETER_TYPE = 'camunda:inputParameter';

const LOWER_PRIORITY = 300;


export default class ElementTemplatesPropertiesProvider {

  constructor(elementTemplates, propertiesPanel) {
    propertiesPanel.registerProvider(LOWER_PRIORITY, this);

    this._elementTemplates = elementTemplates;
  }

  getGroups(element) {
    return (groups) => {

      // (0) Copy provided groups
      groups = groups.slice();

      const templatesGroup = {
        element,
        id: 'template',
        label: 'Template',
        component: ElementTemplatesGroup,
        entries: []
      };

      // (1) Add templates group
      addGroupsAfter('documentation', groups, [ templatesGroup ]);

      const elementTemplate = this._elementTemplates.get(element);

      if (elementTemplate) {
        const customPropertiesGroups = CustomProperties({ element, elementTemplate });

        // (2) add custom properties groups
        addGroupsAfter('template', groups, [ ...customPropertiesGroups ]);

        // (3) update existing groups with element template specific properties
        updateInputGroup(groups, element, elementTemplate);
      }

      // @TODO(barmac): add template-specific groups and remove according to entriesVisible

      return groups;
    };
  }

}

ElementTemplatesPropertiesProvider.$inject = [ 'elementTemplates', 'propertiesPanel' ];


// helper /////////////////////

/**
 *
 * @param {string} id
 * @param {Array<{ id: string }} groups
 * @param {Array<{ id: string }>} groupsToAdd
 */
function addGroupsAfter(id, groups, groupsToAdd) {
  const index = groups.findIndex(group => group.id === id);

  if (index !== -1) {
    groups.splice(index, 0, ...groupsToAdd);
  } else {

    // add in the beginning if group with provided id is missing
    groups.unshift(...groupsToAdd);
  }
}

function updateInputGroup(groups, element, elementTemplate) {
  const inputGroup = findGroup(groups, 'CamundaPlatform__Input');

  if (!inputGroup) {
    return;
  }

  delete inputGroup.add;

  inputGroup.items = [];

  const properties = elementTemplate.properties.filter(({ binding, type }) => {
    return !type && binding.type === CAMUNDA_INPUT_PARAMETER_TYPE;
  });

  properties.forEach((property, index) => {
    const item = InputProperties({ element, index, property });

    if (item) {
      inputGroup.items.push(item);
    }
  });
}

// helpers //////////

function findGroup(groups, id) {
  return groups.find((group) => group.id === id);
}