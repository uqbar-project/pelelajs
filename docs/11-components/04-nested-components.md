# Componentes Anidados

PelelaJS soporta componentes anidados sin límite de profundidad, permitiendo construir interfaces complejas a partir de componentes simples y reutilizables.

## Concepto Básico

Un componente anidado es simplemente un componente que se usa dentro de otro componente:

```html
<!-- lib/Card.pelela -->
<component view-model="Card">
  <div class="card">
    <CardHeader titulo="titulo" />
    <CardBody contenido="contenido" />
    <CardFooter />
  </div>
</component>
```

## Ejemplo Completo

### Componente Badge

```typescript
// lib/Badge.ts
export class Badge {
  label!: string
  color: string = 'blue'
}
```

```html
<!-- lib/Badge.pelela -->
<component view-model="Badge">
  <span class="badge" bind-class="color">
    <span bind-content="label"></span>
  </span>
</component>
```

### Componente Card que Usa Badge

```typescript
// lib/Card.ts
export class Card {
  titulo!: string
  descripcion!: string
  estado!: string
}
```

```html
<!-- lib/Card.pelela -->
<component view-model="Card">
  <div class="card">
    <h3 bind-content="titulo"></h3>
    <p bind-content="descripcion"></p>
    <Badge label="estado" color="green" />
  </div>
</component>
```

### Uso en la Aplicación

```typescript
// src/app.ts
export class App {
  tarjetas = [
    { titulo: 'Tarea 1', descripcion: 'Descripción 1', estado: 'Completado' },
    { titulo: 'Tarea 2', descripcion: 'Descripción 2', estado: 'En Progreso' }
  ]
}
```

```html
<!-- src/app.pelela -->
<pelela view-model="App">
  <div for-each="tarjeta of tarjetas">
    <Card 
      titulo="tarjeta.titulo"
      descripcion="tarjeta.descripcion"
      estado="tarjeta.estado"
    />
  </div>
</pelela>
```

## Pasaje de Props a Través de Niveles

Los componentes pueden pasar props hacia abajo a sus hijos:

```html
<!-- Nivel 1: App -->
<Card titulo="miTitulo" />

<!-- Nivel 2: Card -->
<component view-model="Card">
  <CardHeader titulo="titulo" />
</component>

<!-- Nivel 3: CardHeader -->
<component view-model="CardHeader">
  <h3 bind-content="titulo"></h3>
</component>
```

### Prop Drilling

A veces necesitas pasar una prop a través de varios niveles:

```html
<!-- App -->
<UserProfile userId="currentUserId" />

<!-- UserProfile -->
<component view-model="UserProfile">
  <UserAvatar userId="userId" />
</component>

<!-- UserAvatar -->
<component view-model="UserAvatar">
  <img bind-src="avatarUrl" />
</component>
```

Cada nivel necesita declarar la prop en su ViewModel:

```typescript
// UserProfile.ts
export class UserProfile {
  userId!: string
}

// UserAvatar.ts
export class UserAvatar {
  userId!: string
  
  get avatarUrl() {
    return `/avatars/${this.userId}.jpg`
  }
}
```

## Scope Heredado

Los componentes hijos tienen acceso al scope de sus padres, no solo a las props:

```typescript
// ParentComponent.ts
export class ParentComponent {
  globalSetting = 'importante'
  userData = { name: 'Alice' }
}
```

```html
<!-- ParentComponent.pelela -->
<component view-model="ParentComponent">
  <ChildComponent />
</component>
```

```typescript
// ChildComponent.ts
export class ChildComponent {
  get canAccessParent() {
    // Puede acceder a globalSetting del padre
    return this.globalSetting === 'importante'
  }
}
```

Sin embargo, es mejor práctica pasar explícitamente las props necesarias para mayor claridad y reutilización.

## Detección de Ciclos Infinitos

PelelaJS detecta automáticamente ciclos infinitos en componentes:

```html
<!-- ComponentA.pelela -->
<component view-model="ComponentA">
  <ComponentB />
</component>

<!-- ComponentB.pelela -->
<component view-model="ComponentB">
  <ComponentA />  <!-- ERROR: Ciclo detectado! -->
</component>
```

Si intentas crear un ciclo, PelelaJS lanzará un `CircularComponentError`:

```
CircularComponentError: Circular component dependency detected: ComponentA -> ComponentB -> ComponentA
```

## Profundidad Ilimitada

No hay límite técnico en la profundidad de anidamiento:

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   └── Navigation
│   │       └── MenuItem (×5)
│   ├── Sidebar
│   │   └── Widget (×3)
│   └── Footer
└── MainContent
    └── UserList
        └── UserCard (×10)
            ├── Avatar
            └── Badge (×2)
```

Sin embargo, por razones de rendimiento y mantenibilidad, se recomienda mantener una estructura razonable (3-5 niveles típicamente).

## Componentes Recursivos Controlados

Aunque los ciclos directos están prohibidos, puedes crear estructuras recursivas controladas:

```typescript
// TreeNode.ts
export class TreeNode {
  label!: string
  children?: TreeNodeData[]
  
  get hasChildren() {
    return this.children && this.children.length > 0
  }
}

type TreeNodeData = {
  label: string
  children?: TreeNodeData[]
}
```

```html
<!-- TreeNode.pelela -->
<component view-model="TreeNode">
  <div class="tree-node">
    <span bind-content="label"></span>
    <div if="hasChildren" class="children">
      <div for-each="child of children">
        <TreeNode 
          label="child.label" 
          children="child.children"
        />
      </div>
    </div>
  </div>
</component>
```

Esto funciona porque:
1. La recursión está controlada por datos (el array `children`)
2. No hay ciclo directo en la definición del componente
3. La recursión termina cuando `children` está vacío

## Comunicación Entre Componentes

### 1. De Padre a Hijo (Props)

```html
<ChildComponent mensaje="parentMessage" />
```

### 2. De Hijo a Padre (Props Bidireccionales)

```html
<ChildComponent link-valor="sharedValue" />
```

### 3. Entre Hermanos (A través del Padre)

```html
<component view-model="Parent">
  <ComponentA link-valor="sharedData" />
  <ComponentB link-valor="sharedData" />
</component>
```

Ambos componentes modifican y leen `sharedData` del padre.

## Mejores Prácticas

### 1. Mantén los Componentes Pequeños

```typescript
// Bien: Componente enfocado
export class Button {
  label!: string
  onClick!: () => void
}

// Mal: Componente que hace demasiado
export class MegaComponent {
  // 50 propiedades...
  // 30 métodos...
}
```

### 2. Composición sobre Profundidad

En lugar de anidar profundamente:

```html
<Level1>
  <Level2>
    <Level3>
      <Level4>
        <Level5>
          <!-- Demasiado profundo -->
        </Level5>
      </Level4>
    </Level3>
  </Level2>
</Level1>
```

Considera aplanar:

```html
<Layout>
  <HeaderSection />
  <MainContent />
  <FooterSection />
</Layout>
```

### 3. Evita Prop Drilling Excesivo

Si una prop atraviesa muchos niveles sin ser usada:

```html
<!-- Mal -->
<A data="x">
  <B data="x">
    <C data="x">
      <D data="x">
        <E data="x">
          <!-- Finalmente usa data -->
        </E>
      </D>
    </C>
  </B>
</A>
```

Considera reestructurar la jerarquía o usar scope heredado estratégicamente.

### 4. Documenta Dependencias

```typescript
/**
 * Card que muestra información de usuario
 * 
 * Depende de:
 * - Avatar: Para mostrar la foto
 * - Badge: Para mostrar el estado
 * 
 * Props:
 * - usuario: Objeto con datos del usuario
 */
export class UserCard {
  usuario!: UserData
}
```

