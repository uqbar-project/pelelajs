# Demo de Componentes - PelelaJS

Este ejemplo demuestra el sistema completo de componentización de PelelaJS.

## Características Demostradas

### 1. Componente Contador con Binding Bidireccional
- Usa `link-valor` para sincronizar el estado entre padre e hijo
- Props `desde` y `hasta` para configurar límites
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
- `link-valor`: Propiedad bidireccional para el valor actual
- `desde`: Valor mínimo (unidireccional)
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

### Props Bidireccionales (link-*)
```html
<Contador link-valor="itemSeleccionado" />
```

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

