import {
  find,
  forEach,
  groupBy
} from 'min-dash';

import { useService } from 'bpmn-js-properties-panel';

import { PropertyDescription } from '../../element-templates/components/PropertyDescription';
import { PropertyTooltip } from '../components/PropertyTooltip';

import { getPropertyValue, setPropertyValue, validateProperty } from '../util/propertyUtil';

import {
  Group,
  SelectEntry, isSelectEntryEdited,
  CheckboxEntry, isCheckboxEntryEdited,
  TextAreaEntry, isTextAreaEntryEdited,
  TextFieldEntry, isTextFieldEntryEdited,
  isFeelEntryEdited
} from '@bpmn-io/properties-panel';

import {
  PROPERTY_TYPE,
  ZEEBE_TASK_DEFINITION_TYPE_TYPE,
  ZEEBE_TASK_DEFINITION,
  ZEBBE_INPUT_TYPE,
  ZEEBE_OUTPUT_TYPE,
  ZEEBE_PROPERTY_TYPE,
  ZEEBE_TASK_HEADER_TYPE
} from '../util/bindingTypes';

import {
  FeelEntryWithVariableContext,
  FeelTextAreaEntryWithVariableContext,
  FeelEntry,
  FeelTextAreaEntry
} from '../../entries/FeelEntryWithContext';


const DEFAULT_CUSTOM_GROUP = {
  id: 'ElementTemplates__CustomProperties',
  label: 'Custom properties'
};


export function CustomProperties(props) {
  const {
    element,
    elementTemplate
  } = props;

  const groups = [];

  const {
    id,
    properties,
    groups: propertyGroups
  } = elementTemplate;

  // (1) group properties by group id
  const groupedProperties = groupByGroupId(properties);
  const defaultProps = [];

  forEach(groupedProperties, (properties, groupId) => {

    const group = findCustomGroup(propertyGroups, groupId);

    if (!group) {
      return defaultProps.push(...properties);
    }

    addCustomGroup(groups, {
      element,
      id: `ElementTemplates__CustomProperties-${groupId}`,
      label: group.label,
      openByDefault: group.openByDefault,
      properties: properties,
      templateId: `${id}-${groupId}`,
      tooltip: PropertyTooltip({ tooltip: group.tooltip })
    });
  });

  // (2) add default custom props
  if (defaultProps.length) {
    addCustomGroup(groups, {
      ...DEFAULT_CUSTOM_GROUP,
      element,
      properties: defaultProps,
      templateId: id
    });
  }

  return groups;
}

function addCustomGroup(groups, props) {

  const {
    element,
    id,
    label,
    openByDefault = true,
    properties,
    templateId,
    tooltip
  } = props;

  const customPropertiesGroup = {
    id,
    label,
    component: Group,
    entries: [],
    shouldOpen: openByDefault,
    tooltip
  };

  properties.forEach((property, index) => {
    const entry = createCustomEntry(`custom-entry-${ templateId }-${ index }`, element, property);

    if (entry) {
      customPropertiesGroup.entries.push(entry);
    }
  });

  if (customPropertiesGroup.entries.length) {
    groups.push(customPropertiesGroup);
  }
}

function createCustomEntry(id, element, property) {
  let { type, feel } = property;

  if (!type) {
    type = getDefaultType(property);
  }

  if (type === 'Boolean') {
    return {
      id,
      component: BooleanProperty,
      isEdited: isCheckboxEntryEdited,
      property
    };
  }

  if (type === 'Dropdown') {
    return {
      id,
      component: DropdownProperty,
      isEdited: isSelectEntryEdited,
      property
    };
  }

  if (type === 'String') {
    if (feel) {
      return {
        id,
        component: FeelProperty,
        isEdited: isFeelEntryEdited,
        property
      };
    }
    return {
      id,
      component: StringProperty,
      isEdited: isTextFieldEntryEdited,
      property
    };
  }

  if (type === 'Text') {
    if (feel) {
      return {
        id,
        component: FeelTextAreaProperty,
        isEdited: isFeelEntryEdited,
        property
      };
    }
    return {
      id,
      component: TextAreaProperty,
      isEdited: isTextAreaEntryEdited,
      property
    };
  }
}

function getDefaultType(property) {
  const { binding } = property;

  const { type } = binding;

  if ([
    PROPERTY_TYPE,
    ZEEBE_TASK_DEFINITION_TYPE_TYPE,
    ZEEBE_TASK_DEFINITION,
    ZEBBE_INPUT_TYPE,
    ZEEBE_OUTPUT_TYPE,
    ZEEBE_PROPERTY_TYPE,
    ZEEBE_TASK_HEADER_TYPE
  ].includes(type)) {
    return 'String';
  }
}

function BooleanProperty(props) {
  const {
    element,
    id,
    property
  } = props;

  const {
    description,
    editable,
    label,
    tooltip
  } = property;

  const bpmnFactory = useService('bpmnFactory'),
        commandStack = useService('commandStack');

  return CheckboxEntry({
    element,
    getValue: propertyGetter(element, property),
    id,
    label,
    description: PropertyDescription({ description }),
    setValue: propertySetter(bpmnFactory, commandStack, element, property),
    disabled: editable === false,
    tooltip: PropertyTooltip({ tooltip })
  });
}

function DropdownProperty(props) {
  const {
    element,
    id,
    property
  } = props;

  const {
    description,
    editable,
    label,
    tooltip
  } = property;

  const bpmnFactory = useService('bpmnFactory'),
        commandStack = useService('commandStack'),
        translate = useService('translate');

  const getOptions = () => {
    const { choices, optional } = property;
    let dropdownOptions = [];

    dropdownOptions = choices.map(({ name, value }) => {
      return {
        label: name,
        value
      };
    });

    if (optional) {
      dropdownOptions = [ { label: '', value: undefined }, ...dropdownOptions ];
    }

    return dropdownOptions;
  };

  return SelectEntry({
    element,
    id,
    label,
    getOptions,
    description: PropertyDescription({ description }),
    getValue: propertyGetter(element, property),
    setValue: propertySetter(bpmnFactory, commandStack, element, property),
    validate: propertyValidator(translate, property),
    disabled: editable === false,
    tooltip: PropertyTooltip({ tooltip })
  });
}

function FeelTextAreaProperty(props) {
  const {
    element,
    id,
    property
  } = props;

  const {
    description,
    editable,
    label,
    feel,
    tooltip
  } = property;

  const bpmnFactory = useService('bpmnFactory'),
        commandStack = useService('commandStack'),
        debounce = useService('debounceInput'),
        translate = useService('translate');

  const TextAreaComponent =
    !isExternalProperty(property)
      ? FeelTextAreaEntryWithVariableContext
      : FeelTextAreaEntry;

  return TextAreaComponent({
    debounce,
    element,
    getValue: propertyGetter(element, property),
    id,
    label,
    feel,
    description: PropertyDescription({ description }),
    setValue: propertySetter(bpmnFactory, commandStack, element, property),
    validate: propertyValidator(translate, property),
    disabled: editable === false,
    tooltip: PropertyTooltip({ tooltip })
  });
}

function FeelProperty(props) {
  const {
    element,
    id,
    property
  } = props;

  const {
    description,
    editable,
    label,
    feel,
    tooltip
  } = property;

  const bpmnFactory = useService('bpmnFactory'),
        commandStack = useService('commandStack'),
        debounce = useService('debounceInput'),
        translate = useService('translate');

  const TextFieldComponent =
    !isExternalProperty(property)
      ? FeelEntryWithVariableContext
      : FeelEntry;

  return TextFieldComponent({
    debounce,
    element,
    getValue: propertyGetter(element, property),
    id,
    label,
    feel,
    description: PropertyDescription({ description }),
    setValue: propertySetter(bpmnFactory, commandStack, element, property),
    validate: propertyValidator(translate, property),
    disabled: editable === false,
    tooltip: PropertyTooltip({ tooltip })
  });
}

function StringProperty(props) {
  const {
    element,
    id,
    property
  } = props;

  const {
    description,
    editable,
    label,
    feel,
    tooltip
  } = property;

  const bpmnFactory = useService('bpmnFactory'),
        commandStack = useService('commandStack'),
        debounce = useService('debounceInput'),
        translate = useService('translate');

  return TextFieldEntry({
    debounce,
    element,
    getValue: propertyGetter(element, property),
    id,
    label,
    feel,
    description: PropertyDescription({ description }),
    setValue: propertySetter(bpmnFactory, commandStack, element, property),
    validate: propertyValidator(translate, property),
    disabled: editable === false,
    tooltip: PropertyTooltip({ tooltip })
  });
}

function TextAreaProperty(props) {
  const {
    element,
    id,
    property
  } = props;

  const {
    description,
    editable,
    label,
    feel,
    language,
    tooltip
  } = property;

  const bpmnFactory = useService('bpmnFactory'),
        commandStack = useService('commandStack'),
        debounce = useService('debounceInput'),
        translate = useService('translate');

  return TextAreaEntry({
    debounce,
    element,
    id,
    label,
    feel,
    monospace: !!language,
    autoResize: true,
    description: PropertyDescription({ description }),
    getValue: propertyGetter(element, property),
    setValue: propertySetter(bpmnFactory, commandStack, element, property),
    validate: propertyValidator(translate, property),
    disabled: editable === false,
    tooltip: PropertyTooltip({ tooltip })
  });
}

function propertyGetter(element, property) {
  return function getValue() {
    return getPropertyValue(element, property);
  };
}

function propertySetter(bpmnFactory, commandStack, element, property) {
  return function setValue(value) {
    return setPropertyValue(bpmnFactory, commandStack, element, property, value);
  };
}

function propertyValidator(translate, property) {
  return value => validateProperty(value, property, translate);
}



function groupByGroupId(properties) {
  return groupBy(properties, 'group');
}

function findCustomGroup(groups, id) {
  return find(groups, g => g.id === id);
}

/**
 * Is the given property executed by the engine?
 *
 * @param { { binding: { type: string } } } property
 * @return {boolean}
 */
function isExternalProperty(property) {
  return [ 'zeebe:property', 'zeebe:taskHeader' ].includes(property.binding.type);
}