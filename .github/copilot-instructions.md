## AI Agent Guide: Ticketing System (Full Stack)

Monorepo with NestJS backend (DDD + Clean Architecture) + Angular 21 frontend. Goal: enable productive, safe changes consistent with existing patterns.

---

## Architecture Overview

### Backend (`/backend`) - NestJS + TypeScript (Strict)
**Layer Structure** (Clean Architecture + DDD):
```
domain/          → Pure business logic (entities, value objects, interfaces)
application/     → Use cases, DTOs, services (orchestration)
infrastructure/  → Repositories (TypeORM), external services (MinIO)
presentation/    → Controllers (HTTP endpoints)
modules/         → NestJS dependency injection modules
```

**Key Patterns**:
- **Aggregate Roots**: `Event` (domain/entities/event.entity.ts) manages ticket availability via encapsulated `_ticketConfigurations`
- **Use Cases**: Single-responsibility classes injected into controllers (e.g., `CreateEventUseCase`)
- **Repository Pattern**: Interfaces in `domain/interfaces/*`, implementations in `infrastructure/persistence/*`
- **Value Objects**: Immutable types like `TicketType`, `Money` validate business rules in constructors
- **State Machine**: Reservation state transitions via Strategy pattern (`domain/states/*`)
- **File Uploads**: Use `@UseInterceptors(FileInterceptor('image'))` + `MinioService` for S3-compatible storage

**Critical Files**:
- `app.module.ts`: TypeORM config, global modules (EventEmitter, Schedule, ConfigModule)
- `main.ts`: Global pipes (ValidationPipe with `transform: true`), CORS, Swagger at `/api`
- `typeorm.config.ts`: Migration path, entities path, **synchronize: false** (migrations only)

### Frontend (`/frontend`) - Angular 21 + Standalone Components
**Key Patterns**:
- **Standalone Components**: All components use `standalone: true`, import dependencies directly (no NgModules)
- **Template Control Flow**: Use `@if`, `@for` (not `*ngIf`, `*ngFor`)
- **Signal Injection**: Use `inject()` for DI (not constructor injection): `private readonly router = inject(Router);`
- **Reactive Forms**: FormBuilder + FormGroup with validators (see `event-form.ts`)
- **Guards**: `authGuard`, `checkoutGuard` protect routes via `canActivate`
- **Tailwind CSS**: Utility classes in templates (configured in `tailwind.config.js`)

**Routes** (`app.routes.ts`):
- `/` → EventList, `/event/:id` → EventDetail, `/checkout` → Checkout (guarded)
- `/create-event`, `/event/:id/edit` → EventForm (image upload with preview)

**Services**:
- `Events` (events.ts): CRUD for events, uses `HttpClient` with typed `Observable<T>`
- File uploads: FormData assembly, **no manual Content-Type header** (Angular adds automatically)

---

## Developer Workflows

### Docker-First Development (Recommended)
**Start entire stack**:
```bash
docker-compose up -d --build  # Backend (3000), Frontend (4200), Postgres (5432), MinIO (9000/9001)
docker-compose logs -f backend  # Watch backend logs
```

**Backend inside container**:
```bash
docker-compose exec backend npm run migration:run     # Run pending migrations
docker-compose exec backend npm run test:property     # Run fast-check property tests
docker-compose exec backend npm test                  # Unit tests
```

**Local development** (if not using Docker):
- Backend: `cd backend && npm run start:dev` (requires local Postgres + MinIO)
- Frontend: `cd frontend && npm start` (→ https://localhost)

### Testing Strategy (3 Layers)
1. **Unit Tests**: `npm test` (Jest, colocated with source: `*.spec.ts`)
2. **Property Tests**: `npm run test:property` (fast-check, `test/properties/*.property.spec.ts`)
   - Example: `reservation-state-machine.property.spec.ts` validates all state transitions with 100 random runs
3. **Integration Tests**: `npm run test:integration` (test DB via docker profile: `docker-compose --profile test up -d`)

### Migrations (Critical)
**Always use migrations** (synchronize disabled in prod):
```bash
# Generate migration after entity changes
npm run migration:generate -- -n AddImageUrlToEvents

# Run migrations
npm run migration:run

# Rollback last migration
npm run migration:revert
```
Migrations live in `backend/src/infrastructure/persistence/migrations/`

---

## Project-Specific Conventions

### Backend Naming & Structure
- App bootstrap: `src/main.ts` bootstraps `App` with `appConfig` (router, HttpClient, global error listeners).
- Routing: `src/app/app.routes.ts` defines three routes: `'' → EventList`, `'event/:id' → EventDetail`, `'checkout' → Checkout`.
- Services (API integration):
  - `Events` (`src/app/services/events.ts`): GET `/events`, `/events/:id`.
  - `Orders` (`src/app/services/orders.ts`): POST `/orders`, GET `/orders/:id`, POST `/orders/:id/confirm`.
  - Base URL is hardcoded to `http://localhost:3000`; update here if backend host/port changes.
- Models: Typed interfaces live in `src/app/models/*.ts` and should be used across components/services.
- Core flow:
  - Event list → fetch events → render cards → link to detail.
  - Event detail → fetch event by route `id` → manage ticket quantities → create order → navigate to checkout with `orderId` query param.
  - Checkout → read `orderId` from query → fetch order → group tickets by `ticketType` → confirm payment → redirect home.

### Conventions & Patterns
- Standalone components: Components declare `standalone: true` and list required modules in `imports` (e.g. `CommonModule`, `RouterLink`, `FormsModule`).
- Template control flow: Uses Angular’s `@for` in templates instead of `*ngFor`.
- Observables: HttpClient methods return typed `Observable<T>`; components subscribe in `ngOnInit()` and handle results inline.
- Type safety: Use interfaces from `models` in service signatures and component state. Prices are sometimes coerced via `Number(...)` before math.
- Error handling: Global browser error listeners are provided via `provideBrowserGlobalErrorListeners()` in `app.config.ts`. Components handle API errors via the `error` callback in `subscribe`.
- Styling: Templates use utility-like class names; there is no Tailwind dependency declared. Keep styles in the component `.css` files.

### Build, Run, Test
- Dev server:
  - `npm start` (alias for `ng serve`) → https://localhost
  - VS Code task: “npm: start” is available in this workspace.
- Build:
  - `npm run build` (alias for `ng build`)
  - `npm run watch` builds with `--watch --configuration development`.
- Unit tests:
  - `npm test` (alias for `ng test`) runs with Vitest + jsdom. Spec files live alongside code (e.g., `src/app/services/*.spec.ts`, `src/app/components/**/**.spec.ts`).

### Integration Notes
- Backend API must be running at `http://localhost:3000` or services will fail. Endpoints used:
  - `GET /events`, `GET /events/:id`
  - `POST /orders` with `{ ticketIds: number[], userId: string }`
  - `GET /orders/:id`, `POST /orders/:id/confirm`
- CORS/auth: Not handled in this frontend; assume backend enables required CORS and auth (if any).

### Common Tasks (Examples)
- Add a new route + page:
  1) Create a standalone component under `src/app/components/<feature>/`.
  2) Import it and add a `{ path, component }` entry to `src/app/app.routes.ts`.
- Extend a service method:
  - In `orders.ts`:
    ```ts
    cancelOrder(id: number): Observable<Order> {
      return this.http.post<Order>(`${this.apiUrl}/${id}/cancel`, {});
    }
    ```
  - Use typed interfaces from `src/app/models/order.model.ts` in signatures and consumers.
- Use route params and query params:
  - Route param: `const id = this.route.snapshot.paramMap.get('id')` (see `EventDetail`).
  - Query param: subscribe to `this.route.queryParams` (see `Checkout`).

### Guardrails for Changes
- Keep components standalone and declare required Angular modules in `imports`.
- Preserve typed `Observable<T>` returns in services; do not return Promises.
- Update API base URLs only in service files; do not inline endpoint strings elsewhere.
- When doing math on prices, ensure numeric conversion as existing code does (`Number(...)`).

If anything here seems incomplete or unclear (e.g., additional backend endpoints, auth, or environment configs), please comment and I’ll refine this guide.

### Implementation Plan (Resumen en Español)
Este plan resume un roadmap TDD para ampliar el frontend a una solución completa de Ticketing. Ajusta según el estado actual del repo.

- Stack objetivo: Angular 17+ (standalone), Tailwind CSS, Signals, Jest + fast-check + Playwright.
- Fase 1: Setup
  - Inicializar proyecto Angular estricto; configurar Tailwind (`tailwindcss`, `postcss`, `autoprefixer`), estructura `core/`, `features/`, `shared/`.
- Fase 2: Núcleo (Modelos y Servicios)
  - Modelos: `Event`, `Ticket`, `Reservation`, `User`, `Checkout`.
  - `ApiService` genérico (baseUrl en `environment`), `StorageService` (localStorage).
- Fase 3: Auth con TDD
  - Tests de `AuthService`; implementar signals (`currentUser`, `isAuthenticated`, `isLoading`), `login/register/logout/refreshToken`, persistencia de tokens; property test de persistencia.
- Fase 4: HTTP & Guards
  - Interceptors: `AuthInterceptor` (Bearer), `ErrorInterceptor` (401/403/500). Guards: `AuthGuard`, `CheckoutGuard`.
- Fase 5: Shared UI
  - `Header`, `Footer`, `MobileMenu`, `LoadingSpinner`, `FormError`; Pipes de fecha y moneda.
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
