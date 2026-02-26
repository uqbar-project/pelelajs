# Demo de Componentes - PelelaJS

Este ejemplo demuestra el sistema completo de componentización de PelelaJS.

## Características Demostradas

### 1. Componente Contador con Binding Bidireccional
- Usa el patrón `link-nombrepropiedad` para binding bidireccional (ej. `link-valor`)
- Sin prefijo el binding es unidireccional (ej. `desde`, `hasta`)
- Demuestra cómo los cambios en el componente se reflejan automáticamente en el padre

### 2. Componente de Validación (ValidationField)
- Muestra mensajes de error condicionales
- Usa el binding `if` para renderizado condicional
- Recibe el objeto de dominio como prop

### 3. Componentes Anidados (Card + Badge)
- Card es un componente que usa Badge internamente
- Demuestra cómo pasar props a través de niveles
- Muestra la composición de componentes

### 4. Múltiples Instancias
- Varios Badges con diferentes configuraciones
- Cada instancia es independiente
- Demuestra la reutilización de componentes

## Estructura del Proyecto

```
components-demo/
├── lib/                    # Componentes reutilizables
│   ├── Badge.pelela
│   ├── Badge.ts
│   ├── Badge.css
│   ├── Card.pelela
│   ├── Card.ts
│   ├── Card.css
│   ├── Contador.pelela
│   ├── Contador.ts
│   ├── Contador.css
│   ├── ValidationField.pelela
│   ├── ValidationField.ts
│   └── ValidationField.css
├── src/                    # Aplicación principal
│   ├── app.pelela
│   ├── app.ts
│   └── app.css
├── main.ts
├── index.html
└── styles.css
```

## Cómo Ejecutar

1. Instalar dependencias (desde la raíz del monorepo):
```bash
pnpm install
```

2. Ejecutar el ejemplo:
```bash
cd examples/components-demo
pnpm dev
```

3. Abrir en el navegador:
```
http://localhost:5173
```

## Componentes Incluidos

### Contador
Componente interactivo con botones +/- que sincroniza su valor con el padre.

**Props:**
- `link-*`: Cualquier prop con prefijo `link-` es bidireccional (ej. `link-valor` sincroniza la prop `valor` con el padre)
- `desde`: Valor mínimo (unidireccional; si fuera `link-desde` sería bidireccional)
- `hasta`: Valor máximo (unidireccional)

### ValidationField
Muestra mensajes de error de validación.

**Props:**
- `domainElement`: Objeto que implementa la interfaz de validación
- `field`: Nombre del campo a validar

### Badge
Etiqueta visual con diferentes colores.

**Props:**
- `label`: Texto a mostrar
- `color`: Color del badge (blue, green, red, yellow)

### Card
Tarjeta que muestra información con un badge de estado.

**Props:**
- `titulo`: Título de la tarjeta
- `descripcion`: Descripción
- `estado`: Estado que determina el color del badge

## Conceptos Clave

### Props Unidireccionales
```html
<Badge label="Nuevo" color="blue" />
```

### Props Bidireccionales (link-nombrepropiedad)
Cualquier atributo con prefijo `link-` es bidireccional; el nombre de la prop es lo que sigue al guión.
```html
<Contador link-valor="itemSeleccionado" />
```
Si usaras `link-desde="indice"`, la prop `desde` del componente quedaría sincronizada bidireccionalmente con `indice` del padre.

### Componentes Anidados
```html
<Card titulo="..." descripcion="..." estado="...">
  <!-- Internamente usa Badge -->
</Card>
```

### Componentes en Bucles
```html
<div for-each="tarjeta of tarjetas">
  <Card titulo="tarjeta.titulo" ... />
</div>
```

## Aprendizajes

Este ejemplo te enseña:
1. Cómo definir componentes reutilizables
2. Cómo pasar datos con props unidireccionales y bidireccionales
3. Cómo componer componentes (anidamiento)
4. Cómo usar componentes en bucles y condicionales
5. Cómo manejar múltiples instancias del mismo componente

