# Sistema de Componentes de PelelaJS

El sistema de componentes de PelelaJS permite crear piezas reutilizables de UI con su propia lógica y presentación.

## Contenido

1. [**Definición de Componentes**](01-component-definition.md)
   - Estructura de un componente
   - Sintaxis del template
   - ViewModel del componente
   - Auto-registro
   - Convenciones de nombres

2. [**Uso de Componentes**](02-component-usage.md)
   - Sintaxis básica
   - Pasaje de props
   - Componentes en bucles y condicionales
   - Múltiples instancias
   - Acceso al scope padre

3. [**Props de Componentes**](03-component-props.md)
   - Props unidireccionales
   - Props bidireccionales (link-*)
   - Tipos de valores
   - Validación de props
   - Mejores prácticas

4. [**Componentes Anidados**](04-nested-components.md)
   - Concepto básico
   - Pasaje de props a través de niveles
   - Scope heredado
   - Detección de ciclos infinitos
   - Componentes recursivos controlados
   - Comunicación entre componentes

## Inicio Rápido

### 1. Definir un Componente

**lib/Counter.pelela**
```html
<component view-model="Counter">
  <div class="counter">
    <button click="decrement">-</button>
    <span bind-content="value"></span>
    <button click="increment">+</button>
  </div>
</component>
```

**lib/Counter.ts**
```typescript
export class Counter {
  value: number = 0
  min: number = 0
  max: number = 100

  increment() {
    if (this.value < this.max) this.value++
  }

  decrement() {
    if (this.value > this.min) this.value--
  }
}
```

### 2. Usar el Componente

```html
<pelela view-model="App">
  <h1>Mi Aplicación</h1>
  <Counter link-value="count" min="0" max="10" />
  <p>Valor actual: <span bind-content="count"></span></p>
</pelela>
```

```typescript
export class App {
  count: number = 0
}
```

## Características Principales

### ✅ Auto-Registro
Los componentes en las carpetas `lib/` o `components/` se registran automáticamente.

### ✅ Props Unidireccionales y Bidireccionales
- Props simples para pasar datos del padre al hijo
- Props `link-*` para sincronización bidireccional

### ✅ Componentes Anidados
Soporta anidamiento ilimitado con detección automática de ciclos.

### ✅ Scope Heredado
Los componentes hijos tienen acceso al scope de sus padres.

### ✅ Integración Completa
Funciona con todos los bindings de PelelaJS: `for-each`, `if`, `bind-value`, etc.

## Ejemplos

Consulta el ejemplo completo en [`examples/components-demo/`](../../examples/components-demo/) que incluye:
- Contador con binding bidireccional
- Componente de validación
- Componentes anidados (Card + Badge)
- Múltiples instancias

## Comparación con Otros Frameworks

### React
```jsx
// React: Props inmutables, eventos explícitos
<Counter value={count} onChange={setCount} />
```

### Angular
```typescript
// Angular: @Input/@Output separados
<app-counter [value]="count" (valueChange)="count=$event"></app-counter>
```

### PelelaJS
```html
<!-- PelelaJS: Binding bidireccional simple -->
<Counter link-value="count" />
```

## Filosofía de Diseño

1. **Simplicidad**: Sintaxis clara y mínima
2. **Reactividad**: Sincronización automática de datos
3. **Composición**: Componentes pequeños y reutilizables
4. **Convención sobre Configuración**: Auto-registro y detección automática

## Próximos Pasos

- Lee la [Definición de Componentes](01-component-definition.md) para empezar
- Consulta [Props de Componentes](03-component-props.md) para entender el pasaje de datos
- Explora el [ejemplo completo](../../examples/components-demo/) para ver todo en acción

