# 📋 LISTA DE COMPONENTES DOCUMENTABLES - PelelaJS Core

## **1. ARQUITECTURA Y CICLO DE VIDA**
- [x] **1.1** Arquitectura General del Framework
- [x] **1.2** Ciclo de Vida de la Aplicación (desde bootstrap hasta render)
- [x] **1.3** Flujo de Datos Reactivo (data flow completo)

## **2. SISTEMA DE BOOTSTRAP**
- [x] **2.1** Proceso de Bootstrap
  - Búsqueda de elementos `<pelela view-model="...">`
  - Instanciación de ViewModels
  - Inicialización del sistema reactivo
- [x] **2.2** mountTemplate (montaje dinámico de templates)

## **3. SISTEMA DE REACTIVIDAD**
- [x] **3.1** ReactiveProxy (createReactiveViewModel)
  - Proxy handlers (get, set, delete)
  - Operadores especiales ($raw, $set, $delete)
  - Manejo de objetos anidados
  - Manejo de arrays y métodos de mutación
  - Cache de proxies (proxyCache, rawObjectCache)
- [x] **3.2** Change Detection
  - Sistema de tracking de cambios (changedPath)
  - Propagación de cambios en propiedades anidadas

## **4. SISTEMA DE BINDINGS**

### **4.1 Sistema de Binding General**
- [x] Setup de bindings (setupBindings)
- [x] Render pipeline (executeRenderPipeline)
- [x] BindingsCollection (estructura de datos)

### **4.2 Dependency Tracker**
- [x] Registro de dependencias
- [x] Algoritmo de matching de paths
- [x] Renderizado selectivo (getDependentBindings)
- [x] Optimización de renders

### **4.3 Bindings Específicos**

#### **4.3.1 bind-value**
- [x] Setup y configuración
- [x] Two-way data binding
- [x] Manejo de inputs (HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement)
- [x] Conversión de tipos (números, strings)
- [x] Render de valores en elementos no-input

#### **4.3.2 if (conditional rendering)**
- [ ] Setup y configuración
- [ ] Evaluación de condiciones booleanas
- [ ] Preservación de display original
- [ ] Show/hide mediante display CSS

#### **4.3.3 bind-class**
- [ ] Setup y configuración
- [ ] Soporte de múltiples formatos:
  - String único
  - Array de clases
  - Objeto con condiciones (key-value)
- [ ] Preservación de clases estáticas

#### **4.3.4 bind-style**
- [ ] Setup y configuración
- [ ] Aplicación de estilos dinámicos
- [ ] Formato de objeto de estilos
- [ ] Limpieza de estilos

#### **4.3.5 click (event binding)**
- [ ] Setup de event listeners
- [ ] Invocación de handlers del ViewModel
- [ ] Context binding (this)
- [ ] Validación de handlers

#### **4.3.6 for-each (list rendering)**
- [ ] Parsing de expresiones (`item of collection`)
- [ ] Sistema de templates
- [ ] Placeholder comments
- [ ] Extended ViewModel (proxy para scope local)
- [ ] Creación dinámica de elementos
- [ ] Reconciliación de elementos:
  - Agregado de nuevos elementos
  - Remoción de elementos extras
  - Actualización de elementos existentes
- [ ] Bindings anidados dentro de for-each
- [ ] Mapeo de elementos (mapElementPath)

## **5. SISTEMA DE PROPIEDADES ANIDADAS**
- [x] **5.1** getNestedProperty (lectura de paths con dots)
- [x] **5.2** setNestedProperty (escritura de paths con dots)
- [x] **5.3** Validación de propiedades anidadas

## **6. REGISTRO DE VIEWMODELS**
- [ ] **6.1** ViewModelRegistry
  - Registro de ViewModels (defineViewModel/registerViewModel)
  - Obtención de ViewModels (getViewModel)
  - Verificación de existencia (hasViewModel)
  - Limpieza del registro (clearRegistry)

## **7. SISTEMA DE VALIDACIÓN**
- [ ] **7.1** assertViewModelProperty
  - Validación de propiedades en ViewModel
  - Soporte de propiedades anidadas
  - Generación de mensajes de error informativos

## **8. SISTEMA DE ERRORES**
- [ ] **8.1** PelelaError (base)
- [ ] **8.2** PropertyValidationError
- [ ] **8.3** ViewModelRegistrationError
- [ ] **8.4** InvalidHandlerError

## **9. TIPOS Y CONTRATOS**
- [ ] **9.1** ViewModelConstructor
- [ ] **9.2** PelelaOptions
- [ ] **9.3** PelelaElement
- [ ] **9.4** ViewModel Type
- [ ] **9.5** ReactiveViewModel Type
- [ ] **9.6** Tipos de Bindings (ValueBinding, IfBinding, ClassBinding, StyleBinding, ForEachBinding)

## **10. INTEGRACIÓN CON VITE**
- [ ] **10.1** vite-plugin-pelelajs
  - Procesamiento de archivos .pelela
  - Transformación a TypeScript

---

## 📊 RESUMEN ESTADÍSTICO

**Total de categorías principales:** 10
**Total de sub-componentes:** ~35 temas específicos

## 🎯 PRIORIDAD SUGERIDA PARA DOCUMENTACIÓN

### 🔴 **Alta Prioridad** (conceptos fundamentales)
1. Arquitectura General del Framework (1.1)
2. Ciclo de Vida de la Aplicación (1.2)
3. Sistema de Reactividad (3.1, 3.2)
4. Sistema de Binding General (4.1)
5. Dependency Tracker (4.2)

### 🟡 **Media Prioridad** (bindings específicos)
6. bind-value (4.3.1)
7. for-each (4.3.6)
8. if (4.3.2)
9. bind-class (4.3.3)
10. click (4.3.5)

### 🟢 **Baja Prioridad** (utilidades y complementos)
11. Sistema de Propiedades Anidadas (5)
12. Registro de ViewModels (6)
13. Sistema de Validación (7)
14. Sistema de Errores (8)
15. Tipos y Contratos (9)

---

## 📝 FORMATO DE DOCUMENTACIÓN

Cada documentación incluirá:

- ✅ Descripción técnica detallada
- ✅ Diagramas ASCII del flujo
- ✅ Ejemplos de código prácticos
- ✅ Paso a paso interno del código
- ✅ Edge cases y consideraciones especiales
- ✅ Relación con otros componentes

---

## 📂 ESTRUCTURA DE CARPETAS SUGERIDA

```
docs/
├── TODO.md (este archivo)
├── 01-architecture/
│   ├── 01-general-architecture.md
│   ├── 02-application-lifecycle.md
│   └── 03-reactive-data-flow.md
├── 02-bootstrap/
│   ├── 01-bootstrap-process.md
│   └── 02-mount-template.md
├── 03-reactivity/
│   ├── 01-reactive-proxy.md
│   └── 02-change-detection.md
├── 04-bindings/
│   ├── 01-binding-system.md
│   ├── 02-dependency-tracker.md
│   ├── 03-bind-value.md
│   ├── 04-if-binding.md
│   ├── 05-bind-class.md
│   ├── 06-bind-style.md
│   ├── 07-click-binding.md
│   └── 08-for-each-binding.md
├── 05-nested-properties/
│   └── 01-nested-properties.md
├── 06-registry/
│   └── 01-viewmodel-registry.md
├── 07-validation/
│   └── 01-property-validation.md
├── 08-errors/
│   └── 01-error-system.md
├── 09-types/
│   └── 01-types-contracts.md
└── 10-vite-integration/
    └── 01-vite-plugin.md
```

