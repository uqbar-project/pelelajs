# Definición de Componentes

Los componentes en PelelaJS son piezas reutilizables de UI que encapsulan su propia lógica y presentación.

## Estructura de un Componente

Un componente en PelelaJS consta de dos archivos:

1. **Archivo `.pelela`**: Define el template HTML del componente
2. **Archivo `.ts`**: Define el ViewModel del componente

### Ubicación

Los componentes deben ubicarse en las siguientes carpetas:
- `lib/`
- `components/`
- `src/lib/`
- `src/components/`

El plugin de Vite escanea automáticamente estas carpetas y registra todos los componentes encontrados.

## Sintaxis del Template

A diferencia de las páginas normales que usan `<pelela>`, los componentes usan la etiqueta `<component>`:

```html
<component view-model="ValidationField">
  <div class="validation-row" if="hasErrors">
    <div class="validation" bind-content="errorMessage"></div>
  </div>
</component>
```

### Características del Template

- Debe tener exactamente una etiqueta `<component>` como raíz
- Debe especificar el atributo `view-model` con el nombre del ViewModel
- Puede usar todos los bindings de PelelaJS: `bind-content`, `bind-value`, `if`, `for-each`, etc.
- Puede incluir otros componentes anidados

## ViewModel del Componente

El ViewModel es una clase TypeScript que define la lógica del componente:

```typescript
export type DomainElement = {
  errorsFrom(field: string): string
  hasErrors(field: string): boolean
}

export class ValidationField {
  domainElement!: DomainElement
  field!: string

  get hasErrors() {
    return this.domainElement.hasErrors(this.field)
  }

  get errorMessage() {
    return this.domainElement.errorsFrom(this.field)
  }
}
```

### Características del ViewModel

- Es una clase TypeScript estándar
- Puede tener propiedades, métodos y getters
- Puede recibir props del componente padre
- Tiene acceso al scope del componente padre

## Ejemplo Completo

### lib/Counter.pelela

```html
<component view-model="Counter">
  <div class="counter">
    <button click="decrement">-</button>
    <span bind-content="value"></span>
    <button click="increment">+</button>
  </div>
</component>
```

### lib/Counter.ts

```typescript
export class Counter {
  value: number = 0
  min: number = 0
  max: number = 100

  increment() {
    if (this.value < this.max) {
      this.value++
    }
  }

  decrement() {
    if (this.value > this.min) {
      this.value--
    }
  }
}
```

## Estilos CSS

Los componentes pueden tener un archivo CSS asociado con el mismo nombre:

```
lib/
  Counter.pelela
  Counter.ts
  Counter.css
```

El plugin de Vite importará automáticamente el CSS cuando se use el componente.

## Auto-Registro

No es necesario registrar manualmente los componentes. El plugin de Vite los detecta automáticamente y genera código de registro.

Para que el auto-registro funcione, asegúrate de:

1. Colocar los componentes en las carpetas especificadas
2. Usar la sintaxis correcta con `<component view-model="...">`
3. Nombrar el archivo `.pelela` con PascalCase (ej: `ValidationField.pelela`)

## Convenciones de Nombres

- **Archivos**: Usar PascalCase (ej: `ValidationField.pelela`, `UserCard.ts`)
- **ViewModel**: El nombre de la clase debe coincidir con el atributo `view-model`
- **Uso**: Al usar el componente, usar PascalCase (ej: `<ValidationField />`)

