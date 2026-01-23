## AI Agent Guide: Ticketing System (Full Stack)
---

## Architecture Overview

### Backend (`/backend`) - NestJS + TypeScript (Strict)
**Layer Structure** (Clean Architecture + DDD):
## Guía del Agente IA: Sistema de Ticketing (Full Stack)

Monorepo con backend en NestJS (DDD + Clean Architecture) y frontend en Angular 21. Objetivo: permitir cambios productivos y seguros coherentes con los patrones existentes. IMPORTANTE: PRINCIPIOS SOLID, CÓDIGO LIMPIO.

---

## Resumen de la Arquitectura

### Backend (`/backend`) - NestJS + TypeScript (estricto)
**Estructura por capas** (Clean Architecture + DDD):
```
domain/          → Lógica de negocio pura (entidades, value objects, interfaces)
application/     → Casos de uso, DTOs, servicios (orquestación)
infrastructure/  → Repositorios (TypeORM), servicios externos (MinIO)
presentation/    → Controladores (endpoints HTTP)
modules/         → Módulos de inyección de dependencias de NestJS
```

**Patrones clave**:
- **Aggregate Roots**: `Event` (`domain/entities/event.entity.ts`) gestiona la disponibilidad de entradas mediante `_ticketConfigurations` encapsulado
- **Use Cases**: Clases con responsabilidad única inyectadas en controladores (ej.: `CreateEventUseCase`)
- **Repository Pattern**: Interfaces en `domain/interfaces/*`, implementaciones en `infrastructure/persistence/*`
- **Value Objects**: Tipos inmutables como `TicketType`, `Money` validan reglas de negocio en sus constructores
- **Máquina de estados**: Transiciones de reserva mediante Strategy pattern (`domain/states/*`)
- **Subida de archivos**: Usar `@UseInterceptors(FileInterceptor('image'))` + `MinioService` para almacenamiento compatible S3

**Archivos críticos**:
- `app.module.ts`: Configuración de TypeORM, módulos globales (EventEmitter, Schedule, ConfigModule)
- `main.ts`: Pipes globales (`ValidationPipe` con `transform: true`), CORS, Swagger en `/api`
- `typeorm.config.ts`: Ruta de migraciones, path de entidades, **synchronize: false** (usar migraciones)

### Frontend (`/frontend`) - Angular 21 + Componentes standalone
**Patrones clave**:
- **Componentes standalone**: Todos los componentes usan `standalone: true`, importan dependencias directamente (sin NgModules)
- **Control de flujo en plantillas**: Uso de `@if`, `@for` (en lugar de `*ngIf`, `*ngFor`)
- **Inyección por Signal**: Usar `inject()` para DI (no constructor): `private readonly router = inject(Router);`
- **Reactive Forms**: `FormBuilder` + `FormGroup` con validadores (ver `event-form.ts`)
- **Guards**: `authGuard`, `checkoutGuard` protegen rutas via `canActivate`
- **Tailwind CSS**: Clases utilitarias en plantillas (configurado en `tailwind.config.js`)

**Rutas** (`app.routes.ts`):
- `/` → `EventList`, `/event/:id` → `EventDetail`, `/checkout` → `Checkout` (protegida)
- `/create-event`, `/event/:id/edit` → `EventForm` (subida de imagen con vista previa)

**Servicios**:
- `Events` (`events.ts`): CRUD de eventos, usa `HttpClient` con `Observable<T>` tipado
- Subidas de archivo: ensamblar `FormData`, **no** establecer manualmente el `Content-Type` (Angular lo gestiona)

---

## Flujo de trabajo para desarrolladores

### Desarrollo recomendado: Docker-first
**Levantar todo el stack**:
```bash
docker-compose up -d --build  # Backend (3000), Frontend (4200), Postgres (5432), MinIO (9000/9001)
docker-compose logs -f backend  # Ver logs del backend
```

**Backend dentro del contenedor**:
```bash
docker-compose exec backend npm run migration:run     # Ejecutar migraciones pendientes
docker-compose exec backend npm run test:property     # Ejecutar property tests (fast-check)
docker-compose exec backend npm test                  # Tests unitarios
```

**Desarrollo local** (sin Docker):
- Backend: `cd backend && npm run start:dev` (requiere Postgres + MinIO locales)
- Frontend: `cd frontend && npm start` (→ https://localhost)

### Estrategia de testing (3 capas)
1. **Unit tests**: `npm test` (Jest, tests junto al código: `*.spec.ts`)
2. **Property tests**: `npm run test:property` (fast-check, `test/properties/*.property.spec.ts`)
   - Ejemplo: `reservation-state-machine.property.spec.ts` valida transiciones de estado con 100 ejecuciones aleatorias
3. **Integration tests**: `npm run test:integration` (usa test DB con perfil de Docker: `docker-compose --profile test up -d`)

### Migraciones (crítico)
**Siempre usar migraciones** (synchronize está deshabilitado en producción):
```bash
# Generar migración tras cambiar entidades
npm run migration:generate -- -n AddImageUrlToEvents

# Ejecutar migraciones
npm run migration:run

# Revertir la última migración
npm run migration:revert
```
Las migraciones se encuentran en `backend/src/infrastructure/persistence/migrations/`.

---

## Convenciones específicas del proyecto

### Nombres y estructura del backend
- Arranque de la app: `src/main.ts` inicializa `App` con `appConfig` (router, HttpClient, manejadores globales de errores).
- Rutas: `src/app/app.routes.ts` define tres rutas: `'' → EventList`, `'event/:id' → EventDetail`, `'checkout' → Checkout`.
- Servicios (integración con API):
  - `Events` (`src/app/services/events.ts`): GET `/events`, `/events/:id`.
  - `Orders` (`src/app/services/orders.ts`): POST `/orders`, GET `/orders/:id`, POST `/orders/:id/confirm`.
  - La base URL está fijada a `http://localhost:3000`; actualízala si cambian host/puerto del backend.
- Modelos: Interfaces tipadas en `src/app/models/*.ts` y deben usarse en componentes y servicios.
- Flujo core:
  - Lista de eventos → obtener eventos → renderizar tarjetas → navegar a detalle.
  - Detalle de evento → obtener evento por `id` → gestionar cantidades de tickets → crear orden → navegar a checkout con `orderId` como query param.
  - Checkout → leer `orderId` de query → obtener orden → agrupar tickets por `ticketType` → confirmar pago → redirigir al inicio.

### Convenciones y patrones
- Componentes standalone: Declarar `standalone: true` y listar módulos requeridos en `imports` (ej.: `CommonModule`, `RouterLink`, `FormsModule`).
- Control de flujo en plantillas: Uso de `@for` en plantillas en lugar de `*ngFor`.
- Observables: `HttpClient` devuelve `Observable<T>` tipados; los componentes se suscriben en `ngOnInit()` y manejan resultados inline.
- Seguridad de tipos: Usar interfaces desde `models` en las firmas de servicios y estado de componentes. En operaciones con precios, convertir explícitamente con `Number(...)` cuando sea necesario.
- Manejo de errores: Hay listeners globales en `app.config.ts` mediante `provideBrowserGlobalErrorListeners()`. Los componentes manejan errores de API en el callback `error` de `subscribe`.
- Estilos: Las plantillas usan clases con estilo utilitario; no hay dependencia declarada de Tailwind por defecto. Mantener estilos en `.css` de componente.

### Compilar, ejecutar, testear
- Servidor de desarrollo:
  - `npm start` (alias para `ng serve`) → https://localhost
  - Tarea de VS Code disponible: “npm: start”.
- Build:
  - `npm run build` (alias para `ng build`)
  - `npm run watch` para build en modo watch (`--configuration development`).
- Tests unitarios:
  - `npm test` (alias de `ng test`) se ejecuta con Vitest + jsdom. Los specs están junto al código (ej.: `src/app/services/*.spec.ts`).

### Notas de integración
- La API del backend debe estar disponible en `http://localhost:3000` o los servicios fallarán. Endpoints usados:
  - `GET /events`, `GET /events/:id`
  - `POST /orders` con `{ ticketIds: number[], userId: string }`
  - `GET /orders/:id`, `POST /orders/:id/confirm`
- CORS/auth: El frontend asume que el backend permite CORS y que la autenticación (si aplica) está habilitada en backend.

### Tareas comunes (ejemplos)
- Añadir una nueva ruta + página:
  1) Crear un componente standalone en `src/app/components/<feature>/`.
  2) Importarlo y agregar `{ path, component }` en `src/app/app.routes.ts`.
- Extender un método de servicio:
  - En `orders.ts`:
    ```ts
    cancelOrder(id: number): Observable<Order> {
      return this.http.post<Order>(`${this.apiUrl}/${id}/cancel`, {});
    }
    ```
  - Usar las interfaces tipadas desde `src/app/models/order.model.ts` en las firmas y consumidores.
- Uso de params y query params:
  - Param de ruta: `const id = this.route.snapshot.paramMap.get('id')` (ver `EventDetail`).
  - Query param: subscribirse a `this.route.queryParams` (ver `Checkout`).

### Reglas para cambios
- Mantener los componentes standalone y declarar los módulos angular necesarios en `imports`.
- Mantener `Observable<T>` en los servicios; evitar convertir a `Promise` en las firmas públicas.
- Actualizar la base URL de la API únicamente en los archivos de servicio; no poner endpoints hardcodeados en componentes.
- Al operar con precios, asegurar la conversión numérica cuando corresponda (`Number(...)`).

Si algo no está claro (endpoints adicionales, auth, configuraciones de entorno), comenta y ajusto la guía.

### Plan de implementación (Resumen en Español)
Este plan resume un roadmap TDD para ampliar el frontend hacia una solución completa de Ticketing. Ajustar según el estado actual del repo.

 - Stack objetivo: Angular 17+ (standalone), Tailwind CSS, Signals, Jest + fast-check + Playwright.
 - Fase 1: Setup
   - Inicializar proyecto Angular estricto; configurar Tailwind (`tailwindcss`, `postcss`, `autoprefixer`) y estructura `core/`, `features/`, `shared/`.
 - Fase 2: Núcleo (Modelos y Servicios)
   - Modelos: `Event`, `Ticket`, `Reservation`, `User`, `Checkout`.
   - `ApiService` genérico (baseUrl en `environment`), `StorageService` (localStorage).
 - Fase 3: Auth con TDD
   - Tests de `AuthService`; implementar signals (`currentUser`, `isAuthenticated`, `isLoading`), `login/register/logout/refreshToken`, persistencia de tokens; property test de persistencia.
 - Fase 4: HTTP & Guards
   - Interceptors: `AuthInterceptor` (Bearer), `ErrorInterceptor` (401/403/500). Guards: `AuthGuard`, `CheckoutGuard`.
 - Fase 5: Shared UI
   - `Header`, `Footer`, `MobileMenu`, `LoadingSpinner`, `FormError`; Pipes para fecha y moneda.
 - Fase 6: Events
   - `EventService` (signals: `events`, `selectedEvent`, `filters`, `isLoading`), `EventCard`, `EventList`, `EventFilters`; rutas lazy `/events` y `/events/:id`.
 - Fase 7: Checkout
   - `CheckoutService` (signals: `cart`, `reservation`, `timeRemaining`; computed: totales), `OrderSummary`, `ReservationTimer`, `ContactForm`, `PaymentForm`, `Checkout`, `Confirmation`, `QRCodeComponent`; rutas lazy `/checkout`.
 - Fase 8: Tickets (My Tickets)
   - `TicketService`, `TicketCard`, `MyTickets`, `TicketDetail`; ruta `/my-tickets`.
 - Fase 9: Auth UI
   - `Login`, `Register`, `ForgotPassword`; rutas `/login`, `/register`, `/forgot-password`.
 - Fase 10: Profile
   - `ProfileService`, `Profile`, `ChangePassword`, `PurchaseHistory`; rutas `/profile`.
 - Fase 11: Organizer
   - `OrganizerService`, `CreateEvent`, `TicketConfiguration`, `OrganizerDashboard`; rutas `/organizer`.
 - Fase 12: Errores y Accesibilidad
   - `ErrorHandlerService`, `NotificationService`, `Toast`, `NotFound`; auditoría A11y y property tests.
 - Fase 13: E2E con Playwright
   - Configurar `e2e/` y `playwright.config.ts`; tests: explorar eventos, detalle + selección, checkout, auth, mis tickets, responsive.
 - Fase Final: Cobertura > 80%, auditoría A11y, build prod, documentación.

Comandos útiles (ajusta scripts si migras a Jest/Playwright):
```bash
ng serve

ng build --configuration=production
npm test               # unit (actualmente Vitest)
npm run test:coverage  # si configuras cobertura
npm run test:e2e       # si añades Playwright
ng lint
```

Notas de alineación con este repo:
- Este proyecto ya usa Angular 21 + standalone y Vitest. El plan propone Jest/Playwright y Tailwind.
- Si adoptas el plan:
  - Mantén `Observable<T>` y servicios actuales; migra baseUrl a `environment` y elimina URLs hardcoded en `services`.
  - Puedes mantener Vitest o migrar a Jest; actualiza `package.json` y specs en consecuencia.
  - Tailwind no está configurado: añade `tailwind.config` y directivas en `src/styles.css` o migra a `styles.scss`.
  - Introduce lazy loading de forma incremental partiendo de [src/app/app.routes.ts](src/app/app.routes.ts).
