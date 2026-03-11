# Uso de Componentes

Una vez definido un componente, puedes usarlo en cualquier template de PelelaJS (páginas o componentes).

## Sintaxis Básica

Los componentes se usan como elementos HTML con PascalCase:

```html
<pelela view-model="App">
  <h1>Mi Aplicación</h1>
  <ValidationField />
  <Counter />
</pelela>
```

## Auto-Cierre vs Etiquetas de Apertura/Cierre

Ambas sintaxis son válidas:

```html
<ValidationField />
```

```html
<ValidationField></ValidationField>
```

## Pasaje de Props

Los componentes pueden recibir datos del componente padre mediante props.

### Props Unidireccionales

Las props simples pasan datos del padre al hijo (solo lectura desde el hijo):

```html
<ValidationField elemento="apuesta" campo="monto" />
```

```html
<Counter min="1" max="10" />
```

### Props desde el ViewModel Padre

Las props pueden referenciar propiedades del ViewModel padre:

```html
<pelela view-model="App">
  <UserCard nombre="currentUser" edad="userAge" />
</pelela>
```

```typescript
class App {
  currentUser = "John Doe"
  userAge = 30
}
```

El componente `UserCard` recibirá los valores de `currentUser` y `userAge` del ViewModel padre.

### Props Literales

Las props pueden ser valores literales:

```html
<Badge label="Nuevo" color="red" />
```

Los valores literales se detectan automáticamente:
- **Strings**: Se pasan entre comillas (ej: `label="Nuevo"`)
- **Números**: Se pasan sin comillas (ej: `count="42"`)
- **Booleanos**: Se pasan como `true` o `false` (ej: `active="true"`)

## Componentes en Bucles

Los componentes pueden usarse dentro de `for-each`:

```html
<pelela view-model="App">
  <div for-each="user of users">
    <UserCard nombre="user.name" edad="user.age" />
  </div>
</pelela>
```

## Componentes Condicionales

Los componentes pueden usarse con `if`:

```html
<pelela view-model="App">
  <ErrorMessage if="hasError" />
  <SuccessMessage if="isSuccess" />
</pelela>
```

## Componentes Anidados

Los componentes pueden contener otros componentes:

```html
<component view-model="UserCard">
  <div class="card">
    <Avatar url="user.avatar" />
    <h3 bind-content="user.name"></h3>
    <Badge label="user.status" />
  </div>
</component>
```

No hay límite en la profundidad de anidamiento, pero ten cuidado con ciclos infinitos (un componente que se incluye a sí mismo).

## Múltiples Instancias

Puedes usar el mismo componente múltiples veces en la misma página:

```html
<pelela view-model="Dashboard">
  <Counter min="0" max="10" />
  <Counter min="1" max="5" />
  <Counter min="0" max="100" />
</pelela>
```

Cada instancia es independiente y tiene su propio estado.

## Acceso al Scope Padre

Los componentes tienen acceso a las propiedades del ViewModel padre, no solo a las props:

```typescript
class ParentComponent {
  userName = "Alice"
  userAge = 25
}
```

```html
<ChildComponent />
```

Dentro de `ChildComponent`, puedes acceder a `userName` y `userAge` del padre, incluso si no se pasaron como props.

Sin embargo, es mejor práctica pasar explícitamente las props necesarias para hacer el componente más reutilizable y fácil de entender.

## Ejemplo Completo

### Definición del Componente

```typescript
// lib/UserCard.ts
export class UserCard {
  nombre!: string
  edad!: number
  
  get greeting() {
    return `Hola, soy ${this.nombre} y tengo ${this.edad} años`
  }
}
```

```html
<!-- lib/UserCard.pelela -->
<component view-model="UserCard">
  <div class="user-card">
    <h3 bind-content="nombre"></h3>
    <p bind-content="edad"></p>
    <p bind-content="greeting"></p>
  </div>
</component>
```

### Uso del Componente

```typescript
// src/app.ts
export class App {
  users = [
    { name: "Alice", age: 25 },
    { name: "Bob", age: 30 },
    { name: "Charlie", age: 35 }
  ]
}
```

```html
<!-- src/app.pelela -->
<pelela view-model="App">
  <h1>Lista de Usuarios</h1>
  
  <div for-each="user of users">
    <UserCard nombre="user.name" edad="user.age" />
  </div>
</pelela>
```

