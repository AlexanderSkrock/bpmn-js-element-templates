import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import { v4 as uuid } from 'uuid';

/**
 * The BPMN 2.0 extension attribute name under
 * which the element template ID is stored.
 *
 * @type {String}
 */
export const TEMPLATE_ID_ATTR = 'zeebe:modelerTemplate';

/**
 * The BPMN 2.0 extension attribute name under
 * which the element template version is stored.
 *
 * @type {String}
 */
export const TEMPLATE_VERSION_ATTR = 'zeebe:modelerTemplateVersion';


/**
 * Get template id for a given diagram element.
 *
 * @param {djs.model.Base} element
 *
 * @return {String}
 */
export function getTemplateId(element) {
  const businessObject = getBusinessObject(element);

  if (businessObject) {
    return businessObject.get(TEMPLATE_ID_ATTR);
  }
}

/**
 * Get template version for a given diagram element.
 *
 * @param {djs.model.Base} element
 *
 * @return {String}
 */
export function getTemplateVersion(element) {
  const businessObject = getBusinessObject(element);

  if (businessObject) {
    return businessObject.get(TEMPLATE_VERSION_ATTR);
  }
}

/**
 * Find extension with given type in
 * BPMN element, diagram element or ExtensionElement.
 *
 * @param {ModdleElement|djs.model.Base} element
 * @param {String} type
 *
 * @return {ModdleElement} the extension
 */
export function findExtension(element, type) {
  const businessObject = getBusinessObject(element);

  let extensionElements;

  if (is(businessObject, 'bpmn:ExtensionElements')) {
    extensionElements = businessObject;
  } else {
    extensionElements = businessObject.get('extensionElements');
  }

  if (!extensionElements) {
    return;
  }

  return extensionElements.get('values').find((value) => {
    return is(value, type);
  });
}

export function findExtensions(element, types) {
  const businessObject = getBusinessObject(element);

  let extensionElements;

  if (is(businessObject, 'bpmn:ExtensionElements')) {
    extensionElements = businessObject;
  } else {
    extensionElements = businessObject.get('extensionElements');
  }

  if (!extensionElements) {
    return null;
  }

  return extensionElements.get('values').filter((value) => {
    return isAny(value, types);
  });
}

export function findZeebeProperty(zeebeProperties, binding) {
  return zeebeProperties.get('properties').find((value) => {
    return value.name === binding.name;
  });
}

export function findInputParameter(ioMapping, binding) {
  const parameters = ioMapping.get('inputParameters');

  return parameters.find((parameter) => {
    return parameter.target === binding.name;
  });
}

export function findOutputParameter(ioMapping, binding) {
  const parameters = ioMapping.get('outputParameters');

  return parameters.find((parameter) => {
    return parameter.source === binding.source;
  });
}

export function findTaskHeader(taskHeaders, binding) {
  const headers = taskHeaders.get('values');

  return headers.find((header) => {
    return header.key === binding.key;
  });
}

export function findMessage(businessObject) {
  if (is(businessObject, 'bpmn:Event')) {
    const eventDefinitions = businessObject.get('eventDefinitions');

    if (!eventDefinitions || !eventDefinitions.length) {
      return;
    }

    businessObject = eventDefinitions[0];
  }

  if (!businessObject) {
    return;
  }

  return businessObject.get('messageRef');
}

export function findZeebeSubscription(message) {
  return findExtension(message, 'zeebe:Subscription');
}

export function getDefaultValue(property) {

  if (property.value !== undefined) {
    return property.value;
  }

  if (property.generatedValue) {
    const { type } = property.generatedValue;

    if (type === 'uuid') {
      return uuid();
    }
  }
}
