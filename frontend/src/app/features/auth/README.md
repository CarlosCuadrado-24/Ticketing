# Componente de Autenticación Unificado

## Estructura Creada

Se ha creado un componente unificado de autenticación siguiendo el diseño del mock proporcionado.

### Archivos Creados

```
frontend/src/app/features/auth/components/auth/
├── auth.ts          # Componente TypeScript con lógica
├── auth.html        # Template HTML con diseño split-screen
├── auth.css         # Estilos CSS
└── auth.spec.ts     # Tests unitarios
```

## Características Implementadas

### ✅ Diseño Split-Screen
- **Lado Izquierdo (Desktop)**: Imagen de fondo con overlay y texto promocional
- **Lado Derecho**: Formularios de Login y Registro con tabs

### ✅ Tabs Interactivos
- Tab "Log In" y "Register" en la misma pantalla
- Cambio dinámico entre formularios sin navegación
- Indicador visual del tab activo (borde azul)

### ✅ Formulario de Login
- Email con validación
- Password con toggle de visibilidad
- Checkbox "Remember me"
- Link "Forgot password?"
- Botones de social login (Google, Apple)
- Estado de carga

### ✅ Formulario de Registro
- First Name y Last Name
- Email con validación
- Password con validación de mínimo 6 caracteres
- Confirm Password con validación de coincidencia
- Checkbox de términos y condiciones (obligatorio)
- Botones de social login (Google, Apple)
- Mensaje de éxito con redirección automática

### ✅ Validaciones
- Email format
- Password mínimo 6 caracteres
- Passwords coincidentes en registro
- Campos requeridos
- Términos y condiciones obligatorios

### ✅ UX/UI
- Iconos Material Symbols
- Estados hover en todos los elementos interactivos
- Animaciones suaves (scale, hover, transitions)
- Mensajes de error y éxito
- Loading states con spinner
- Responsive (desktop y mobile)
- Dark mode support

### ✅ Integración
- Conectado con AuthService usando Angular Signals
- Redirección a home después de login/registro exitoso
- Manejo de errores del backend
- Guards aplicados a rutas protegidas

## Rutas Actualizadas

```typescript
/auth          → AuthComponent (página principal)
/login         → Redirige a /auth
/register      → Redirige a /auth
```

## Colores del Mock Aplicados

- **Primary**: `#1313ec` (azul)
- **Background Light**: `#f6f6f8`
- **Background Dark**: `#101022`
- **Borders**: `#dbdbe6` / `#f0f0f4`
- **Text**: `#111118` / `#616189`

## Tests Incluidos

El archivo `auth.spec.ts` incluye tests para:
- Creación del componente
- Cambio entre modos (login/register)
- Toggle de visibilidad de password
- Validación de formularios
- Validación de passwords coincidentes
- Llamadas a AuthService
- Manejo de errores
- Redirección después de éxito

## Cómo Usar

1. Navegar a `https://localhost/auth`
2. Usar los tabs para cambiar entre Login y Register
3. Completar el formulario correspondiente
4. El sistema redirige automáticamente después de autenticar

## Notas Técnicas

- Usa Angular 21 Standalone Components
- Reactive Forms con FormBuilder
- Angular Signals para estado reactivo
- Template-driven control flow (`@if`, `@else`)
- Material Symbols para iconos
- Tailwind CSS para estilos
- TypeScript strict mode
