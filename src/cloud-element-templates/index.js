import translateModule from 'diagram-js/lib/i18n/translate';

import ElementTemplatesConditionChecker from './ElementTemplatesConditionChecker';
import ElementTemplates from './ElementTemplates';
import ElementTemplatesLoader from './ElementTemplatesLoader';
import ReplaceBehavior from './ReplaceBehavior';
import commandsModule from './cmd';
import templateElementFactoryModule from './create';
import ElementTemplatesPropertiesProvider from './ElementTemplatesPropertiesProvider';
import UpdateTemplatePropertiesOrder from './UpdateTemplatePropertiesOrder';
import { ReferencedElementBehavior } from './ReferencedElementBehavior';
import { GeneratedValueBehavior } from './GeneratedValueBehavior';
import { CalledElementBehavior } from './CalledElementBehavior';


export default {
  __depends__: [
    commandsModule,
    templateElementFactoryModule,
    translateModule
  ],
  __init__: [
    'elementTemplatesLoader',
    'replaceBehavior',
    'elementTemplatesPropertiesProvider',
    'elementTemplatesConditionChecker',
    'generatedValueBehavior',
    'referencedElementBehavior',
    'updateTemplatePropertiesOrder',
    'calledElementBehavior'
  ],
  elementTemplates: [ 'type', ElementTemplates ],
  elementTemplatesLoader: [ 'type', ElementTemplatesLoader ],
  replaceBehavior: [ 'type', ReplaceBehavior ],
  elementTemplatesPropertiesProvider: [ 'type', ElementTemplatesPropertiesProvider ],
  elementTemplatesConditionChecker: [ 'type', ElementTemplatesConditionChecker ],
  generatedValueBehavior: [ 'type', GeneratedValueBehavior ],
  referencedElementBehavior: [ 'type', ReferencedElementBehavior ],
  updateTemplatePropertiesOrder: [ 'type', UpdateTemplatePropertiesOrder ],
  calledElementBehavior: [ 'type', CalledElementBehavior ]
};
