import "./styles.css";
import { defineViewModel, defineComponent, mountTemplate } from "pelelajs";
import { App } from "./src/app";
import template from "./src/app.pelela";

import { ValidationField } from "./lib/ValidationField";
import validationFieldTemplate from "./lib/ValidationField.pelela";
import { Contador } from "./lib/Contador";
import contadorTemplate from "./lib/Contador.pelela";
import { Badge } from "./lib/Badge";
import badgeTemplate from "./lib/Badge.pelela";
import { Card } from "./lib/Card";
import cardTemplate from "./lib/Card.pelela";

console.log('[pelela] Registrando componentes manualmente...');

defineComponent('ValidationField', {
  viewModelName: 'ValidationField',
  viewModelConstructor: ValidationField,
  template: validationFieldTemplate,
});

defineComponent('Contador', {
  viewModelName: 'Contador',
  viewModelConstructor: Contador,
  template: contadorTemplate,
});

defineComponent('Badge', {
  viewModelName: 'Badge',
  viewModelConstructor: Badge,
  template: badgeTemplate,
});

defineComponent('Card', {
  viewModelName: 'Card',
  viewModelConstructor: Card,
  template: cardTemplate,
});

console.log('[pelela] Componentes registrados');

defineViewModel("App", App);

const root = document.getElementById("app") ?? document.body;
mountTemplate(root, template);

