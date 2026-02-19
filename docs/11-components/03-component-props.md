# Props de Componentes

Las props permiten pasar datos del componente padre a los componentes hijos. PelelaJS soporta dos tipos de props: unidireccionales y bidireccionales.

## Props Unidireccionales

Las props unidireccionales pasan datos del padre al hijo. El componente hijo puede leer el valor pero no modificarlo directamente en el padre.

### Sintaxis

```html
<ComponentName propName="value" />
```

### Tipos de Valores

#### 1. Literales String

```html
<Greeting mensaje="Hola Mundo" />
```

#### 2. Números

```html
<Counter inicial="0" max="100" />
```

El framework detecta automáticamente números y los convierte.

#### 3. Booleanos

```html
<Button activo="true" deshabilitado="false" />
```

#### 4. Referencias al ViewModel Padre

```html
<UserCard nombre="currentUser" edad="userAge" />
```

```typescript
class App {
  currentUser = "Alice"
  userAge = 25
}
```

El componente `UserCard` recibirá los valores actuales de `currentUser` y `userAge`.

#### 5. Propiedades Anidadas

```html
<DisplayName valor="usuario.perfil.nombre" />
```

```typescript
class App {
  usuario = {
    perfil: {
      nombre: "Bob"
    }
  }
}
```

### Acceso a Props en el Componente

Las props unidireccionales se acceden como propiedades normales del ViewModel:

```typescript
export class Greeting {
  mensaje!: string  // Prop unidireccional
  
  get mensajeCompleto() {
    return `${this.mensaje}!!!`
  }
}
```

```html
<component view-model="Greeting">
  <h1 bind-content="mensajeCompleto"></h1>
</component>
```

## Props Bidireccionales (link-*)

Las props bidireccionales sincronizan datos entre padre e hijo. Los cambios en cualquier dirección se reflejan en ambos.

### Sintaxis

Usa el prefijo `link-` para indicar binding bidireccional:

```html
<Contador link-valor="itemActual" />
```

### Funcionamiento

1. El componente hijo recibe el valor inicial del padre
2. Cuando el hijo modifica el valor, se actualiza automáticamente en el padre
3. Cuando el padre modifica el valor, se actualiza automáticamente en el hijo

### Ejemplo: Contador

```typescript
// lib/Contador.ts
export class Contador {
  valor!: number
  min: number = 0
  max: number = 100
  
  increment() {
    if (this.valor < this.max) {
      this.valor++  // Esto actualizará el padre automáticamente
    }
  }
  
  decrement() {
    if (this.valor > this.min) {
      this.valor--  // Esto actualizará el padre automáticamente
    }
  }
}
```

```html
<!-- lib/Contador.pelela -->
<component view-model="Contador">
  <div class="contador">
    <button click="decrement">-</button>
    <span bind-content="valor"></span>
    <button click="increment">+</button>
  </div>
</component>
```

```typescript
// src/app.ts
export class App {
  itemSeleccionado: number = 1
  totalProductos: number = 10
}
```

```html
<!-- src/app.pelela -->
<pelela view-model="App">
  <h1>Carrito de Compras</h1>
  
  <Contador 
    link-valor="itemSeleccionado" 
    min="1" 
    max="totalProductos" 
  />
  
  <p>Item actual: <span bind-content="itemSeleccionado"></span></p>
</pelela>
```

Cuando el usuario hace clic en los botones del `Contador`, `itemSeleccionado` en `App` se actualiza automáticamente.

### Propiedades Anidadas

Las props bidireccionales también soportan propiedades anidadas:

```html
<InputField link-valor="usuario.perfil.nombre" />
```

```typescript
class App {
  usuario = {
    perfil: {
      nombre: "Alice"
    }
  }
}
```

## Combinando Props Unidireccionales y Bidireccionales

Puedes usar ambos tipos en el mismo componente:

```html
<FormField 
  link-valor="formData.email"
  etiqueta="Email"
  tipo="email"
  requerido="true"
/>
```

- `link-valor`: Bidireccional - sincroniza el valor del campo
- `etiqueta`, `tipo`, `requerido`: Unidireccionales - configuran el componente

## Validación de Props

PelelaJS valida automáticamente las props:

### Error: Prop Bidireccional No Existe

```html
<Contador link-valor="propInexistente" />
```

Si `propInexistente` no existe en el padre, se lanzará `InvalidComponentPropError`.

### Error: Componente No Registrado

```html
<ComponenteInexistente />
```

Si el componente no está registrado, se lanzará `ComponentNotFoundError`.

## Mejores Prácticas

### 1. Usa Props Unidireccionales por Defecto

Prefiere props unidireccionales a menos que necesites sincronización bidireccional:

```html
<!-- Bien: Solo lectura -->
<UserDisplay nombre="userName" />

<!-- Solo si necesitas sincronización -->
<UserInput link-nombre="userName" />
```

### 2. Define Tipos en el ViewModel

```typescript
export class UserCard {
  nombre!: string      // Obligatorio
  edad?: number        // Opcional
  esActivo: boolean = false  // Con valor por defecto
}
```

### 3. Documenta Props Esperadas

```typescript
/**
 * Componente para mostrar información de usuario
 * 
 * Props:
 * - nombre: string - Nombre del usuario
 * - edad: number - Edad del usuario
 * - avatar: string - URL del avatar (opcional)
 */
export class UserCard {
  nombre!: string
  edad!: number
  avatar?: string
}
```

### 4. Valida Props en el Constructor o en Getters

```typescript
export class Counter {
  valor!: number
  min: number = 0
  max: number = 100
  
  get isValid() {
    return this.valor >= this.min && this.valor <= this.max
  }
  
  get clampedValue() {
    return Math.max(this.min, Math.min(this.max, this.valor))
  }
}
```

## Diferencias con React y Angular

### React (`props`)

En React, las props son inmutables en el hijo:

```jsx
function Counter({ value, onChange }) {
  // No puedes hacer: value++
  onChange(value + 1)
}
```

### Angular (`@Input` / `@Output`)

Angular separa explícitamente inputs y outputs:

```typescript
@Component({...})
export class Counter {
  @Input() value: number
  @Output() valueChange = new EventEmitter<number>()
  
  increment() {
    this.valueChange.emit(this.value + 1)
  }
}
```

### PelelaJS

PelelaJS simplifica esto:

```typescript
export class Counter {
  valor!: number  // Con link-valor, es bidireccional automáticamente
  
  increment() {
    this.valor++  // Sincroniza automáticamente
  }
}
```

```html
<Contador link-valor="count" />
```

