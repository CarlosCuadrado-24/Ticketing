# Análisis del Sistema de Ticketing - Funcionalidades y Propuestas

## 📋 Tabla de Contenido
1. [Contexto del Sistema](#contexto-del-sistema)
2. [Funcionalidades Actuales](#funcionalidades-actuales)
3. [Nuevas Funcionalidades Propuestas](#nuevas-funcionalidades-propuestas)

---

## 🎯 Contexto del Sistema

### Descripción General
Sistema completo de venta de entradas para eventos (Ticketing System) construido con arquitectura moderna full-stack. El sistema permite la gestión integral de eventos, reservas de tickets, procesamiento de pagos y validación de entradas mediante códigos QR.

### Stack Tecnológico

| Componente | Tecnología | Versión/Detalles |
|------------|------------|------------------|
| **Backend** | NestJS + TypeScript | Modo estricto, Clean Architecture + DDD |
| **Frontend** | Angular | 21+ (Standalone Components) |
| **Base de Datos** | PostgreSQL | 15 |
| **ORM** | TypeORM | Con migraciones |
| **Testing** | Jest + fast-check | Unit, Integration y Property Tests |
| **Almacenamiento** | MinIO | S3-compatible para imágenes |
| **Contenedores** | Docker Compose | Dev y Prod |
| **Validación QR** | JWT Tokens | Únicos por ticket |

### Arquitectura Backend (Clean Architecture + DDD)

```
backend/src/
├── domain/              # Capa de Dominio (Pure Business Logic)
│   ├── entities/        # Agregados y Entidades
│   ├── value-objects/   # Objetos de Valor Inmutables
│   ├── states/          # Patrón State (Reservas)
│   ├── interfaces/      # Contratos de Repositorios
│   └── exceptions/      # Excepciones de Negocio
├── application/         # Capa de Aplicación
│   ├── use-cases/       # Casos de Uso (Un propósito cada uno)
│   ├── dto/             # Data Transfer Objects
│   └── services/        # Servicios de Aplicación
├── infrastructure/      # Capa de Infraestructura
│   ├── persistence/     # Implementación de Repositorios (TypeORM)
│   ├── external/        # Servicios Externos (MinIO, Email)
│   └── auth/            # Autenticación JWT
└── presentation/        # Capa de Presentación
    ├── controllers/     # Controladores HTTP (REST API)
    └── guards/          # Guards de Autenticación/Autorización
```

### Patrones de Diseño Implementados

1. **Repository Pattern**: Abstracción de acceso a datos
   - Interfaces en `domain/interfaces`
   - Implementaciones en `infrastructure/persistence`

2. **State Pattern**: Gestión del ciclo de vida de reservas
   - `ACTIVE` → `CONFIRMED` | `CANCELLED` | `EXPIRED`
   - Estados en `domain/states/`

3. **Value Objects**: Validación de reglas de negocio
   - `Email`, `Money`, `TicketType`, `TicketQuantity`
   - Inmutables, validación en constructor

4. **Aggregate Root**: Event como raíz del agregado
   - Encapsula `TicketConfiguration[]`
   - Control de disponibilidad de tickets

5. **Use Case Pattern**: Lógica de negocio aislada
   - Un caso de uso = una responsabilidad
   - Inyectados en controllers

### Arquitectura Frontend (Angular 21+)

```
frontend/src/app/
├── components/          # Componentes Standalone
├── features/           # Módulos de Funcionalidades
├── core/               # Servicios Core
├── shared/             # Componentes/Pipes Compartidos
├── models/             # Interfaces TypeScript
└── services/           # Servicios HTTP
```

**Características Angular 21**:
- Componentes Standalone (sin NgModules)
- Template Control Flow (`@if`, `@for`)
- Signal Injection (`inject()`)
- Reactive Forms
- Guards para protección de rutas

---

## 🎪 Funcionalidades Actuales

### 1. Gestión de Eventos

#### 1.1 Crear Eventos
**Endpoint**: `POST /events`  
**Autenticación**: JWT requerido  
**Características**:
- Nombre, fecha, ubicación, nombre del venue
- Carga de imagen (MinIO S3-compatible)
- Configuración de tipos de tickets con precios y cantidades
- Asignación automática al organizador (createdBy)

**Entidades Involucradas**:
```typescript
Event {
  id: string
  name: string
  date: Date
  location: string
  venueName: string
  ticketConfigurations: TicketConfiguration[]
  imageUrl?: string
  createdBy?: string
}

TicketConfiguration {
  type: TicketType (VIP, GENERAL, PREFERENCIAL)
  price: Money (amount + currency)
  totalQuantity: number
  availableQuantity: number
}
```

#### 1.2 Listar Eventos
**Endpoint**: `GET /events`  
**Autenticación**: Opcional  
**Características**:
- Lista todos los eventos disponibles
- Incluye información de disponibilidad de tickets
- Muestra imágenes (URLs de MinIO)

#### 1.3 Obtener Detalle de Evento
**Endpoint**: `GET /events/:id`  
**Características**:
- Información completa del evento
- Disponibilidad actual de cada tipo de ticket
- Información del organizador

#### 1.4 Actualizar Eventos
**Endpoint**: `PUT /events/:id`  
**Autenticación**: JWT requerido  
**Características**:
- Modificar información del evento
- Actualizar configuración de tickets
- Cambiar imagen del evento

#### 1.5 Eliminar Eventos
**Endpoint**: `DELETE /events/:id`  
**Autenticación**: JWT requerido  
**Reglas de Negocio**:
- Solo el organizador o admin puede eliminar
- Validación de tickets vendidos

### 2. Sistema de Reservas (Gestión de Inventario)

#### 2.1 Crear Reserva Temporal
**Endpoint**: `POST /reservations`  
**Características**:
- Reserva temporal de 15 minutos
- Estado inicial: `ACTIVE`
- Decremento automático de disponibilidad
- Validación de tickets suficientes

**Flujo de Negocio**:
```
1. Usuario selecciona tickets
2. Sistema verifica disponibilidad
3. Si hay tickets suficientes:
   - Crea reserva con estado ACTIVE
   - Decrementa disponibilidad
   - Establece expiración (15 min)
   - Retorna ID de reserva
4. Si no hay tickets:
   - HTTP 409 Conflict
   - Mensaje: "Insufficient tickets available"
```

**Entidad Reservation**:
```typescript
Reservation {
  id: string
  eventId: string
  ticketType: TicketType
  quantity: TicketQuantity
  buyerEmail: Email
  totalAmount: Money
  expiresAt: Date (now + 15 minutes)
  createdAt: Date
  _state: IReservationState (State Pattern)
}
```

#### 2.2 Procesamiento de Pagos
**Endpoint**: `POST /reservations/:id/payment`  
**Características**:
- Validación de monto y moneda
- Simulación de pasarela de pago
- Transiciones de estado según resultado

**Flujo de Pago Exitoso**:
```
1. Valida monto exacto de la reserva
2. Procesa pago (simulado)
3. Cambia estado a CONFIRMED
4. Genera tickets con QR únicos
5. Envía email con tickets (PDF)
6. HTTP 200 OK con transactionId
```

**Flujo de Pago Fallido**:
```
1. Detecta error en pago
2. Cambia estado a CANCELLED
3. Libera tickets (incrementa disponibilidad)
4. HTTP 402 Payment Required
5. Usuario puede intentar de nuevo
```

#### 2.3 Job de Expiración Automática
**Tecnología**: NestJS Scheduler (Cron)  
**Frecuencia**: Cada 1 minuto  
**Lógica**:
```typescript
@Cron('*/1 * * * *')
async handleExpiredReservations() {
  // Buscar reservas ACTIVE con expiresAt < now
  // Para cada reserva expirada:
  //   - Cambiar estado a EXPIRED
  //   - Liberar tickets (incrementar disponibilidad)
  //   - Log de expiración
}
```

### 3. Gestión de Tickets

#### 3.1 Compra Directa de Tickets
**Endpoint**: `POST /tickets/purchase`  
**Características**:
- Compra sin reserva previa (flujo alternativo)
- Generación automática de QR
- Envío de email con tickets

**Flujo**:
```
1. Valida disponibilidad
2. Decrementa inventario
3. Genera tickets con códigos únicos
4. Crea QR tokens (UUID)
5. Envía email con PDF
6. Retorna tickets generados
```

**Entidad Ticket**:
```typescript
Ticket {
  id: string
  code: string (único)
  eventId: string
  type: TicketType
  buyerEmail: Email
  price: Money
  purchaseDate: Date
  qrToken: string (UUID para validación)
  status: TicketStatus (PAID | USED)
  usedAt: Date | null
}
```

#### 3.2 Consultar Mis Tickets
**Endpoint**: `GET /tickets/user` o `GET /tickets/me`  
**Autenticación**: JWT requerido  
**Características**:
- Lista todos los tickets del usuario autenticado
- Incluye información del evento
- Muestra estado del ticket (PAID/USED)
- QR token para validación

#### 3.3 Validación de QR
**Endpoint**: `POST /tickets/validate-qr`  
**Características**:
- Valida QR token único
- Marca ticket como USED
- Registro de timestamp de uso
- Previene doble uso

**Flujo de Validación**:
```
1. Escanea QR en entrada del evento
2. Extrae qrToken del código
3. Busca ticket por qrToken
4. Validaciones:
   - Ticket existe
   - Estado = PAID (no USED)
   - EventId coincide
5. Si válido:
   - Marca como USED
   - Registra usedAt timestamp
   - Retorna éxito
6. Si inválido:
   - Retorna error específico
```

#### 3.4 Reenvío de Email con Tickets
**Endpoint**: `POST /tickets/resend-email`  
**Características**:
- Reenvía PDF con tickets al comprador
- Útil si email original se perdió
- Valida que el usuario es el propietario

### 4. Autenticación y Autorización

#### 4.1 Registro de Usuarios
**Endpoint**: `POST /auth/register`  
**Características**:
- Email único como identificador
- Hash de contraseña (bcrypt)
- Roles: BUYER (default), ORGANIZER, ADMIN
- Validación de formato de email

**Entidad User**:
```typescript
User {
  id: string
  email: Email (Value Object)
  passwordHash: string
  name: string
  role: UserRole (BUYER | ORGANIZER | ADMIN)
  createdAt: Date
}
```

#### 4.2 Login
**Endpoint**: `POST /auth/login`  
**Características**:
- Autenticación por email + password
- Generación de JWT token
- Payload incluye: userId, email, role
- Token expira en 24h (configurable)

#### 4.3 Guards Implementados

**JwtAuthGuard**:
- Valida token JWT en header Authorization
- Decodifica payload y agrega a request.user
- Usado en endpoints protegidos

**AdminGuard**:
- Requiere role = ADMIN
- Usado en endpoints de administración

**AdminOrOrganizerGuard**:
- Permite ADMIN o ORGANIZER
- Usado en estadísticas de eventos

**OptionalJwtAuthGuard**:
- JWT opcional (permite anónimos)
- Usado en listado público de eventos

### 5. Panel de Administración

#### 5.1 Gestión de Usuarios
**Endpoints**:
- `GET /admin/users` - Listar usuarios con paginación y filtros
- `GET /admin/users/:id` - Detalle de usuario
- `PUT /admin/users/:id` - Actualizar usuario
- `DELETE /admin/users/:id` - Eliminar usuario
- `POST /admin/users/admin` - Crear usuario admin

**Características**:
- Paginación (page, limit)
- Filtros por rol, email
- Solo accesible por ADMIN

#### 5.2 Dashboard de Estadísticas
**Endpoint**: `GET /admin/dashboard/stats`  
**Métricas**:
```typescript
{
  totalUsers: number
  totalEvents: number
  totalTicketsSold: number
  totalRevenue: {
    amount: number
    currency: string
  }
  eventsByStatus: {
    upcoming: number
    ongoing: number
    past: number
  }
  ticketsByStatus: {
    paid: number
    used: number
  }
}
```

#### 5.3 Estadísticas de Eventos
**Endpoint**: `GET /admin/events/stats?eventId=...`  
**Acceso**: ADMIN o ORGANIZER (solo sus eventos)  
**Métricas**:
```typescript
{
  eventId: string
  eventName: string
  totalTicketsSold: number
  ticketsUsed: number
  revenue: {
    amount: number
    currency: string
  }
  ticketsByType: {
    VIP: { sold: number, used: number }
    GENERAL: { sold: number, used: number }
    PREFERENCIAL: { sold: number, used: number }
  }
  salesByDate: Array<{
    date: string
    sales: number
  }>
}
```

### 6. Gestión de Archivos

#### 6.1 Carga de Imágenes de Eventos
**Tecnología**: MinIO (S3-compatible)  
**Endpoint**: `POST /events` (con multipart/form-data)  
**Características**:
- Bucket: `ticketing-events`
- Formatos: jpg, jpeg, png, gif
- Tamaño máximo: 5MB
- Nombres únicos: `{uuid}-{originalName}`
- URL pública generada automáticamente

#### 6.2 Descarga de Imágenes
**Endpoint**: `GET /events/:id/image/:filename`  
**Características**:
- Streaming de archivos desde MinIO
- Content-Type apropiado
- Cache headers

### 7. Notificaciones por Email

#### 7.1 Email de Confirmación de Compra
**Trigger**: Pago exitoso  
**Contenido**:
- Información del evento
- Detalles de los tickets comprados
- PDF adjunto con QR codes
- Instrucciones de uso

**Template**: HTML con estilos inline  
**Variables**:
```typescript
{
  buyerName: string
  eventName: string
  eventDate: string
  eventLocation: string
  tickets: Array<{
    code: string
    type: string
    qrToken: string
  }>
  totalAmount: string
  purchaseDate: string
}
```

#### 7.2 Email de Recordatorio
**Endpoint**: `POST /tickets/send-reminder`  
**Características**:
- Envío manual de recordatorio
- 24-48h antes del evento
- Incluye información actualizada del evento

### 8. WebSockets (Tiempo Real)

#### 8.1 Actualizaciones de Disponibilidad
**Gateway**: `WebSocketGateway`  
**Eventos**:
```typescript
// Cliente escucha:
'ticketAvailabilityUpdated' -> {
  eventId: string
  ticketType: TicketType
  availableQuantity: number
}

'reservationCreated' -> {
  eventId: string
  ticketType: TicketType
  quantity: number
}

'reservationExpired' -> {
  eventId: string
  ticketType: TicketType
  quantityReleased: number
}
```

**Uso en Frontend**:
- Actualización en vivo de disponibilidad
- Notificaciones de tickets liberados
- Sincronización multi-usuario

### 9. Seguridad y Validación

#### 9.1 Validación de DTOs
**Tecnología**: class-validator + class-transformer  
**Características**:
- Validación automática en controllers
- Transform: true (conversión de tipos)
- WhiteList: true (elimina props no declaradas)
- ForbidNonWhitelisted: true (rechaza props extras)

**Ejemplo CreateEventDto**:
```typescript
class CreateEventDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketConfigurationDto)
  ticketConfigurations: TicketConfigurationDto[];
}
```

#### 9.2 CORS
**Configuración**: `main.ts`  
**Orígenes permitidos**:
- `http://localhost:4200` (dev)
- `https://ticketing.example.com` (prod)

#### 9.3 CSRF Protection
**Endpoint**: `GET /csrf/token`  
**Características**:
- Tokens CSRF para formularios
- Validación en requests mutantes

#### 9.4 Rate Limiting
**Características**:
- Límite por IP
- Protección contra DDoS
- Configurado en API Gateway

### 10. Testing

#### 10.1 Tests Unitarios (Jest)
**Ubicación**: `*.spec.ts` (colocados con código)  
**Cobertura**:
- Entidades de dominio
- Value Objects
- Use Cases
- Services

**Ejemplo**:
```typescript
describe('Event Entity', () => {
  it('should reserve tickets correctly', () => {
    const event = createTestEvent();
    event.reserveTickets(TicketType.VIP, 2);
    expect(event.getAvailability(TicketType.VIP)).toBe(8);
  });
});
```

#### 10.2 Property Tests (fast-check)
**Ubicación**: `test/properties/*.property.spec.ts`  
**Características**:
- Generación de datos aleatorios
- Verificación de propiedades invariantes
- 100 ejecuciones por test

**Ejemplos**:
```typescript
// Email Format Property Test
fc.assert(
  fc.property(fc.emailAddress(), (email) => {
    const emailVO = new Email(email);
    expect(emailVO.value).toBe(email);
  })
);

// Money Pricing Property Test
fc.assert(
  fc.property(
    fc.double({ min: 0.01, max: 10000 }),
    fc.constantFrom('USD', 'EUR', 'COP'),
    (amount, currency) => {
      const money = new Money(amount, currency);
      expect(money.amount).toBeGreaterThan(0);
    }
  )
);

// Reservation State Machine Property Test
fc.assert(
  fc.property(fc.constantFrom('confirm', 'cancel', 'expire'), (action) => {
    const reservation = createActiveReservation();
    // Verify state transitions are valid
    // Verify invariants are maintained
  })
);
```

#### 10.3 Tests de Integración
**Ubicación**: `test/integration/*.integration.spec.ts`  
**Características**:
- Base de datos de prueba (test-db)
- Limpieza entre tests
- Tests end-to-end de flujos

**Comando**:
```bash
docker-compose --profile test up -d
npm run test:integration
```

---

## 🚀 Nuevas Funcionalidades Propuestas

### Funcionalidad 1: Sistema de Recomendaciones Inteligentes de Tickets Alternativos

#### 📊 Contexto y Justificación

**Problema Actual**:
Cuando un usuario intenta reservar tickets que ya no están disponibles por concurrencia (otra persona los compró primero), el sistema simplemente retorna un error 409 Conflict con mensaje "Insufficient tickets available". El usuario debe volver a la página del evento, ver qué tickets quedan disponibles, y repetir todo el proceso de selección y reserva.

**Impacto del Problema**:
- 🔴 Alta tasa de abandono del flujo de compra
- 🔴 Frustración del usuario (tiempo perdido)
- 🔴 Pérdida de ventas potenciales
- 🔴 Mala experiencia de usuario en eventos populares

**Solución Propuesta**:
Sistema inteligente que, ante un fallo de reserva por falta de disponibilidad, analiza automáticamente alternativas viables y las sugiere al usuario con mensajes personalizados según el tipo de evento.

#### 🎯 Descripción Detallada

**¿Qué hace?**
Cuando una reserva falla por falta de tickets:
1. El sistema analiza los tickets disponibles del mismo evento
2. Calcula un "score de compatibilidad" para cada alternativa
3. Ordena las alternativas de mejor a peor
4. Presenta las 3 mejores opciones al usuario
5. Incluye mensajes personalizados según el tipo de evento

**Criterios de Puntuación** (Fórmula de Score):
```typescript
Score = (w1 * DistanciaPreferencia) + (w2 * DeltaPrecio) + (w3 * MismaZona) + (w4 * CalidadVision)

Donde:
- DistanciaPreferencia: Cercanía al tipo de ticket original (0-100)
  VIP → PREFERENCIAL = 70 pts
  VIP → GENERAL = 40 pts
  PREFERENCIAL → GENERAL = 60 pts
  PREFERENCIAL → VIP = 85 pts
  GENERAL → PREFERENCIAL = 80 pts
  GENERAL → VIP = 50 pts

- DeltaPrecio: Diferencia de precio respecto al original (0-100)
  ±10% = 100 pts
  ±20% = 70 pts
  ±30% = 40 pts
  >30% = 10 pts

- MismaZona: Si pertenece a la misma categoría (0 o 100)
  Si = 100 pts
  No = 0 pts

- CalidadVision: Metadato de calidad de asiento (0-100)
  Excelente = 100 pts
  Buena = 70 pts
  Regular = 40 pts
  No especificada = 50 pts

- Pesos (w1, w2, w3, w4):
  w1 = 0.4, w2 = 0.3, w3 = 0.2, w4 = 0.1
```

**Mensajes Personalizados por Tipo de Evento**:

```typescript
// Plantillas según tipo de evento
const templates = {
  CONCIERTO: {
    VIP_NO_DISPONIBLE: "¡Mala suerte! Las entradas VIP se agotaron. 🎸 Pero aún puedes vivir la experiencia con estas opciones:",
    SUGERENCIA_PREFERENCIAL: "🎤 Zona Preferencial - Vista directa al escenario",
    SUGERENCIA_GENERAL: "🎵 Zona General - Ambiente único del concierto"
  },
  DEPORTES: {
    VIP_NO_DISPONIBLE: "Los palcos VIP están completos. ⚽ ¡Pero el partido sigue siendo épico desde estas ubicaciones!",
    SUGERENCIA_PREFERENCIAL: "🏟️ Tribunas Preferenciales - Vista privilegiada del campo",
    SUGERENCIA_GENERAL: "📣 Tribunas Populares - Vibra con la afición"
  },
  TEATRO: {
    VIP_NO_DISPONIBLE: "Las butacas VIP se reservaron. 🎭 Te sugerimos estas alternativas con excelente visibilidad:",
    SUGERENCIA_PREFERENCIAL: "🎪 Platea - Visión perfecta del escenario",
    SUGERENCIA_GENERAL: "🎬 Anfiteatro - Disfruta toda la obra"
  },
  CONFERENCIA: {
    VIP_NO_DISPONIBLE: "Las entradas VIP se agotaron. 💼 Estas opciones también te dan acceso completo:",
    SUGERENCIA_PREFERENCIAL: "🎓 Zona Preferente - Cerca del expositor",
    SUGERENCIA_GENERAL: "📚 Zona General - Acceso completo al evento"
  }
};
```

#### 🔧 Implementación Técnica

**Cambios en el Backend**:

1. **Nuevo Value Object**: `TicketRecommendation`
```typescript
// backend/src/domain/value-objects/ticket-recommendation.vo.ts
export class TicketRecommendation {
  constructor(
    public readonly ticketType: TicketType,
    public readonly availableQuantity: number,
    public readonly price: Money,
    public readonly score: number, // 0-100
    public readonly message: string,
    public readonly reasons: string[] // ["Similar price", "Better location"]
  ) {}
}
```

2. **Nuevo Use Case**: `GetAlternativeTicketsUseCase`
```typescript
// backend/src/application/use-cases/get-alternative-tickets.use-case.ts
export class GetAlternativeTicketsUseCase {
  async execute(
    eventId: string,
    requestedType: TicketType,
    requestedQuantity: number,
    eventCategory: EventCategory
  ): Promise<TicketRecommendation[]> {
    // 1. Obtener evento con configuraciones
    // 2. Filtrar tickets disponibles (quantity >= requestedQuantity)
    // 3. Calcular score para cada alternativa
    // 4. Ordenar por score descendente
    // 5. Tomar top 3
    // 6. Generar mensajes personalizados por categoría
    // 7. Retornar recomendaciones
  }
}
```

3. **Nuevo Service**: `RecommendationScoringService`
```typescript
// backend/src/application/services/recommendation-scoring.service.ts
export class RecommendationScoringService {
  calculateScore(
    originalType: TicketType,
    alternativeType: TicketType,
    originalPrice: Money,
    alternativePrice: Money,
    sameZone: boolean,
    qualityRating: number
  ): number {
    const distanceScore = this.calculateDistanceScore(originalType, alternativeType);
    const priceScore = this.calculatePriceScore(originalPrice, alternativePrice);
    const zoneScore = sameZone ? 100 : 0;
    
    return (
      0.4 * distanceScore +
      0.3 * priceScore +
      0.2 * zoneScore +
      0.1 * qualityRating
    );
  }
}
```

4. **Actualizar ReservationController**:
```typescript
// backend/src/presentation/controllers/reservation.controller.ts
@Post()
async create(@Body() dto: CreateReservationDto) {
  try {
    return await this.createReservationUseCase.execute(dto);
  } catch (error) {
    if (error.message.includes('Insufficient')) {
      // En lugar de solo retornar error, obtener alternativas
      const alternatives = await this.getAlternativeTicketsUseCase.execute(
        dto.eventId,
        dto.ticketType,
        dto.quantity,
        event.category
      );
      
      throw new ConflictException({
        message: 'Tickets not available',
        alternatives: alternatives.map(alt => ({
          ticketType: alt.ticketType,
          available: alt.availableQuantity,
          price: alt.price,
          score: alt.score,
          message: alt.message,
          reasons: alt.reasons
        }))
      });
    }
    throw error;
  }
}
```

5. **Nueva Entidad**: Añadir campo `category` a Event
```typescript
// backend/src/domain/entities/event.entity.ts
export enum EventCategory {
  CONCIERTO = 'CONCIERTO',
  DEPORTES = 'DEPORTES',
  TEATRO = 'TEATRO',
  CONFERENCIA = 'CONFERENCIA',
  OTRO = 'OTRO'
}

export class Event {
  constructor(
    // ... campos existentes
    public readonly category: EventCategory = EventCategory.OTRO
  ) {}
}
```

6. **Migración de Base de Datos**:
```sql
-- backend/src/infrastructure/persistence/migrations/1706000000000-AddEventCategory.ts
ALTER TABLE events 
ADD COLUMN category VARCHAR(50) DEFAULT 'OTRO';

CREATE INDEX idx_events_category ON events(category);
```

**Cambios en el Frontend**:

1. **Nuevo Componente**: `AlternativeTicketsModal`
```typescript
// frontend/src/app/components/alternative-tickets-modal/alternative-tickets-modal.ts
@Component({
  selector: 'app-alternative-tickets-modal',
  standalone: true,
  template: `
    <div class="modal-overlay" @if="visible">
      <div class="modal-content">
        <h2>⚠️ Tickets No Disponibles</h2>
        <p class="message">{{ errorMessage }}</p>
        
        <div class="alternatives-section">
          <h3>💡 Alternativas Recomendadas</h3>
          
          @for (alt of alternatives; track alt.ticketType) {
            <div class="alternative-card" 
                 [class.best]="$index === 0"
                 (click)="selectAlternative(alt)">
              
              @if ($index === 0) {
                <span class="badge-best">Mejor Opción</span>
              }
              
              <div class="ticket-info">
                <h4>{{ alt.ticketType }}</h4>
                <p class="price">{{ alt.price.amount | currency }} {{ alt.price.currency }}</p>
                <p class="available">{{ alt.available }} disponibles</p>
              </div>
              
              <div class="recommendation">
                <p class="message">{{ alt.message }}</p>
                <ul class="reasons">
                  @for (reason of alt.reasons; track reason) {
                    <li>✓ {{ reason }}</li>
                  }
                </ul>
                <div class="score-bar">
                  <div class="score-fill" [style.width.%]="alt.score"></div>
                </div>
                <span class="score-text">{{ alt.score }}% compatible</span>
              </div>
              
              <button class="btn-select">Seleccionar esta opción</button>
            </div>
          }
        </div>
        
        <div class="actions">
          <button class="btn-secondary" (click)="close()">Volver atrás</button>
        </div>
      </div>
    </div>
  `
})
export class AlternativeTicketsModal {
  visible = signal(false);
  alternatives = signal<TicketAlternative[]>([]);
  errorMessage = signal('');
  
  open(error: any) {
    this.errorMessage.set(error.message);
    this.alternatives.set(error.alternatives || []);
    this.visible.set(true);
  }
  
  selectAlternative(alt: TicketAlternative) {
    // Emitir evento para actualizar selección
    this.alternativeSelected.emit(alt);
    this.close();
  }
  
  close() {
    this.visible.set(false);
  }
}
```

2. **Actualizar Service de Reservas**:
```typescript
// frontend/src/app/services/reservations.service.ts
createReservation(data: CreateReservationDto): Observable<Reservation> {
  return this.http.post<Reservation>(`${this.apiUrl}/reservations`, data)
    .pipe(
      catchError(error => {
        if (error.status === 409 && error.error.alternatives) {
          // Error con alternativas - lo propagamos para que el componente lo maneje
          return throwError(() => ({
            type: 'ALTERNATIVES_AVAILABLE',
            message: error.error.message,
            alternatives: error.error.alternatives
          }));
        }
        return throwError(() => error);
      })
    );
}
```

3. **Actualizar EventDetail Component**:
```typescript
// frontend/src/app/components/event-detail/event-detail.ts
@Component({
  standalone: true,
  imports: [AlternativeTicketsModal, ...],
  template: `
    <!-- ... UI existente ... -->
    
    <app-alternative-tickets-modal
      #alternativesModal
      (alternativeSelected)="onAlternativeSelected($event)">
    </app-alternative-tickets-modal>
  `
})
export class EventDetail {
  @ViewChild('alternativesModal') alternativesModal!: AlternativeTicketsModal;
  
  createReservation() {
    this.reservationService.createReservation(this.formData)
      .subscribe({
        next: (reservation) => {
          // Flujo normal - redirigir a checkout
          this.router.navigate(['/checkout'], { 
            queryParams: { reservationId: reservation.id } 
          });
        },
        error: (error) => {
          if (error.type === 'ALTERNATIVES_AVAILABLE') {
            // Mostrar modal con alternativas
            this.alternativesModal.open(error);
          } else {
            // Otro tipo de error
            this.showErrorToast(error.message);
          }
        }
      });
  }
  
  onAlternativeSelected(alternative: TicketAlternative) {
    // Actualizar formulario con la alternativa seleccionada
    this.ticketTypeControl.setValue(alternative.ticketType);
    // Intentar reserva nuevamente
    this.createReservation();
  }
}
```

#### 📈 Métricas de Éxito

**KPIs a Medir**:
1. **Tasa de Conversión**:
   - Antes: % de usuarios que completan compra tras error 409
   - Después: % de usuarios que aceptan alternativa y completan compra
   - Objetivo: +40% de conversión

2. **Tasa de Abandono**:
   - Antes: % que abandonan tras error 409
   - Después: % que abandonan tras ver alternativas
   - Objetivo: -30% de abandono

3. **Tiempo de Decisión**:
   - Tiempo promedio entre error y nueva selección
   - Objetivo: <15 segundos (vs. 2-3 minutos antes)

4. **Satisfacción del Usuario**:
   - Encuesta post-compra: "¿Las alternativas sugeridas fueron útiles?"
   - Objetivo: >4.5/5 estrellas

#### 💻 Esfuerzo de Implementación

**Estimación**: 16-20 horas

| Tarea | Horas | Prioridad |
|-------|-------|-----------|
| Añadir campo category a Event + migración | 1 | Alta |
| Crear TicketRecommendation VO | 1 | Alta |
| Implementar RecommendationScoringService | 3 | Alta |
| Implementar GetAlternativeTicketsUseCase | 3 | Alta |
| Actualizar ReservationController | 2 | Alta |
| Tests unitarios backend (scoring, use case) | 2 | Alta |
| Crear AlternativeTicketsModal en frontend | 3 | Alta |
| Actualizar EventDetail component | 2 | Alta |
| Styling del modal (Tailwind) | 1 | Media |
| Tests E2E del flujo completo | 2 | Media |

**Riesgos**:
- 🟡 **Medio**: Complejidad del scoring - requiere ajuste de pesos
- 🟢 **Bajo**: Cambios en la DB (solo añadir columna)
- 🟢 **Bajo**: No afecta flujos existentes (solo mejora caso de error)

#### ✅ Criterios de Aceptación

1. ✅ **AC1**: Cuando una reserva falla por falta de tickets, el sistema analiza automáticamente alternativas disponibles

2. ✅ **AC2**: El scoring pondera correctamente:
   - Distancia de preferencia (40%)
   - Delta de precio (30%)
   - Misma zona (20%)
   - Calidad de visión (10%)

3. ✅ **AC3**: Solo se sugieren tickets con rango de precio ±30% del original (priorizando ±10%)

4. ✅ **AC4**: Los mensajes se personalizan según la categoría del evento (CONCIERTO, DEPORTES, TEATRO, CONFERENCIA, OTRO)

5. ✅ **AC5**: El modal muestra máximo 3 alternativas ordenadas por score

6. ✅ **AC6**: La mejor alternativa (score más alto) se marca visualmente con badge "Mejor Opción"

7. ✅ **AC7**: Cada alternativa muestra:
   - Tipo de ticket
   - Precio
   - Disponibilidad
   - Mensaje personalizado
   - Razones (listado)
   - Barra de compatibilidad (score visual)

8. ✅ **AC8**: El usuario puede seleccionar una alternativa con un click y el sistema intenta la reserva automáticamente

9. ✅ **AC9**: El usuario puede cerrar el modal y volver a la página del evento

10. ✅ **AC10**: La funcionalidad ejecuta en <500ms desde el error hasta mostrar alternativas

#### 🎁 Valor Agregado

**Para el Usuario**:
- ✨ Ahorra tiempo (no buscar manualmente)
- ✨ Reduce frustración (solución proactiva)
- ✨ Mejora confianza (sistema inteligente)
- ✨ Información contextual (mensajes personalizados)

**Para el Negocio**:
- 💰 Aumenta conversión en eventos populares
- 💰 Reduce abandono del carrito
- 💰 Mejora experiencia de usuario
- 💰 Diferenciador competitivo (funcionalidad única)

**Nota**: Esta funcionalidad es especialmente valiosa en eventos de alta demanda donde la concurrencia es frecuente.

---

### Funcionalidad 2: Sistema de Notificaciones Push en Tiempo Real con WebSockets

#### 📊 Contexto y Justificación

**Problema Actual**:
El sistema tiene WebSocket Gateway implementado, pero solo se usa internamente para actualizaciones de disponibilidad. Los usuarios NO reciben notificaciones en tiempo real sobre:
- Liberación de tickets por reservas expiradas
- Cambios de precios o nuevas configuraciones
- Recordatorios antes del evento
- Actualizaciones del evento (cambio de fecha/ubicación)

**Impacto del Problema**:
- 🔴 Usuarios pierden oportunidades de comprar tickets liberados
- 🔴 Falta de engagement con la plataforma
- 🔴 Recordatorios solo por email (fácil ignorar)
- 🔴 Información desactualizada si el usuario no recarga la página

**Solución Propuesta**:
Sistema de notificaciones push en tiempo real que informa al usuario de eventos relevantes mientras navega la aplicación, con persistencia de notificaciones no leídas y centro de notificaciones.

#### 🎯 Descripción Detallada

**¿Qué hace?**
1. El usuario se conecta por WebSocket al entrar a la aplicación
2. El backend envía notificaciones en tiempo real según eventos del sistema
3. El frontend muestra notificaciones tipo "toast" no intrusivas
4. Las notificaciones se persisten en BD para consulta histórica
5. Centro de notificaciones muestra todas las notificaciones (leídas/no leídas)
6. Badge con contador de notificaciones no leídas en header

**Tipos de Notificaciones**:

```typescript
enum NotificationType {
  TICKETS_AVAILABLE = 'TICKETS_AVAILABLE',     // Tickets liberados
  PRICE_CHANGE = 'PRICE_CHANGE',               // Cambio de precio
  EVENT_UPDATED = 'EVENT_UPDATED',             // Evento actualizado
  EVENT_REMINDER = 'EVENT_REMINDER',           // Recordatorio 24h antes
  RESERVATION_EXPIRING = 'RESERVATION_EXPIRING', // Reserva por expirar (5 min)
  PURCHASE_CONFIRMED = 'PURCHASE_CONFIRMED',   // Confirmación de compra
  TICKET_VALIDATED = 'TICKET_VALIDATED'        // Ticket validado en evento
}
```

**Ejemplos de Notificaciones**:

```typescript
// Tickets liberados
{
  type: 'TICKETS_AVAILABLE',
  title: '¡Tickets disponibles! 🎉',
  message: '5 tickets VIP liberados para "Concierto Rock 2026"',
  action: {
    label: 'Ver evento',
    route: '/events/123'
  },
  priority: 'HIGH',
  timestamp: '2026-01-20T15:30:00Z'
}

// Cambio de precio
{
  type: 'PRICE_CHANGE',
  title: '💰 Cambio de precio',
  message: 'Entradas GENERAL para "Festival Verano" ahora $45.000 (antes $50.000)',
  action: {
    label: 'Aprovechar',
    route: '/events/456'
  },
  priority: 'MEDIUM'
}

// Recordatorio de evento
{
  type: 'EVENT_REMINDER',
  title: '⏰ Tu evento es mañana',
  message: '"Teatro Clásico" - Mañana 20:00 en Teatro Nacional',
  action: {
    label: 'Ver mis tickets',
    route: '/tickets/me'
  },
  priority: 'HIGH'
}

// Reserva por expirar
{
  type: 'RESERVATION_EXPIRING',
  title: '⚠️ Tu reserva expira pronto',
  message: '5 minutos para completar tu compra de "Festival Música"',
  action: {
    label: 'Pagar ahora',
    route: '/checkout?reservationId=789'
  },
  priority: 'URGENT'
}
```

#### 🔧 Implementación Técnica

**Cambios en el Backend**:

1. **Nueva Entidad**: `Notification`
```typescript
// backend/src/domain/entities/notification.entity.ts
export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly message: string,
    public readonly action: NotificationAction | null,
    public readonly priority: NotificationPriority,
    public readonly createdAt: Date,
    public readonly readAt: Date | null = null,
    public readonly metadata: Record<string, any> = {}
  ) {}

  markAsRead(): Notification {
    return new Notification(
      this.id,
      this.userId,
      this.type,
      this.title,
      this.message,
      this.action,
      this.priority,
      this.createdAt,
      new Date(),
      this.metadata
    );
  }

  get isRead(): boolean {
    return this.readAt !== null;
  }
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationAction {
  label: string;
  route: string;
}
```

2. **Repository**: `INotificationRepository`
```typescript
// backend/src/domain/interfaces/notification-repository.interface.ts
export interface INotificationRepository {
  create(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, limit?: number): Promise<Notification[]>;
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteOlderThan(date: Date): Promise<void>;
}
```

3. **Service**: `NotificationService`
```typescript
// backend/src/application/services/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    private readonly webSocketGateway: EventWebSocketGateway
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    action: NotificationAction | null = null,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // 1. Crear notificación en BD
    const notification = new Notification(
      uuidv4(),
      userId,
      type,
      title,
      message,
      action,
      priority,
      new Date(),
      null,
      metadata
    );
    
    await this.notificationRepository.create(notification);

    // 2. Enviar por WebSocket si usuario está conectado
    this.webSocketGateway.sendNotificationToUser(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      action: notification.action,
      priority: notification.priority,
      timestamp: notification.createdAt.toISOString()
    });
  }

  async notifyTicketsAvailable(eventId: string, ticketType: TicketType, quantity: number): Promise<void> {
    // Buscar usuarios interesados (ej: los que tienen el evento en favoritos)
    const interestedUsers = await this.findInterestedUsers(eventId);
    
    const event = await this.eventRepository.findById(eventId);
    
    for (const user of interestedUsers) {
      await this.sendNotification(
        user.id,
        NotificationType.TICKETS_AVAILABLE,
        '¡Tickets disponibles! 🎉',
        `${quantity} tickets ${ticketType} liberados para "${event.name}"`,
        { label: 'Ver evento', route: `/events/${eventId}` },
        NotificationPriority.HIGH,
        { eventId, ticketType, quantity }
      );
    }
  }

  async notifyEventReminder(userId: string, event: Event, ticket: Ticket): Promise<void> {
    await this.sendNotification(
      userId,
      NotificationType.EVENT_REMINDER,
      '⏰ Tu evento es mañana',
      `"${event.name}" - Mañana ${format(event.date, 'HH:mm')} en ${event.location}`,
      { label: 'Ver mis tickets', route: '/tickets/me' },
      NotificationPriority.HIGH,
      { eventId: event.id, ticketId: ticket.id }
    );
  }

  async notifyReservationExpiring(reservationId: string, userId: string, minutesLeft: number): Promise<void> {
    const reservation = await this.reservationRepository.findById(reservationId);
    
    await this.sendNotification(
      userId,
      NotificationType.RESERVATION_EXPIRING,
      '⚠️ Tu reserva expira pronto',
      `${minutesLeft} minutos para completar tu compra`,
      { label: 'Pagar ahora', route: `/checkout?reservationId=${reservationId}` },
      NotificationPriority.URGENT,
      { reservationId, minutesLeft }
    );
  }
}
```

4. **Actualizar WebSocket Gateway**:
```typescript
// backend/src/infrastructure/websocket/event-websocket.gateway.ts
@WebSocketGateway({ cors: true, namespace: '/events' })
export class EventWebSocketGateway {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ): void {
    this.userSockets.set(data.userId, client.id);
    console.log(`User ${data.userId} authenticated on socket ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    // Remover usuario del mapa
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  sendNotificationToUser(userId: string, notification: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      console.log(`Notification sent to user ${userId}:`, notification.title);
    }
  }

  broadcastNotification(notification: any): void {
    this.server.emit('notification', notification);
  }
}
```

5. **Nuevo Controller**: `NotificationController`
```typescript
// backend/src/presentation/controllers/notification.controller.ts
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all notifications for authenticated user' })
  async getMyNotifications(@Req() req: any): Promise<NotificationResponse[]> {
    const userId = req.user.id;
    const notifications = await this.notificationRepository.findByUserId(userId, 50);
    return notifications.map(n => this.toResponse(n));
  }

  @Get('unread')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notifications' })
  async getUnread(@Req() req: any): Promise<NotificationResponse[]> {
    const userId = req.user.id;
    const notifications = await this.notificationRepository.findUnreadByUserId(userId);
    return notifications.map(n => this.toResponse(n));
  }

  @Get('unread/count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@Req() req: any): Promise<{ count: number }> {
    const userId = req.user.id;
    const notifications = await this.notificationRepository.findUnreadByUserId(userId);
    return { count: notifications.length };
  }

  @Put(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string): Promise<void> {
    await this.notificationRepository.markAsRead(id);
  }

  @Put('read-all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any): Promise<void> {
    const userId = req.user.id;
    await this.notificationRepository.markAllAsRead(userId);
  }
}
```

6. **Scheduled Job**: Enviar recordatorios automáticos
```typescript
// backend/src/infrastructure/schedulers/notification.scheduler.ts
@Injectable()
export class NotificationScheduler {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: ITicketRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly notificationService: NotificationService
  ) {}

  @Cron('0 */30 * * * *') // Cada 30 minutos
  async sendEventReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Buscar eventos que ocurren mañana
    const upcomingEvents = await this.eventRepository.findByDateRange(
      tomorrow,
      new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    );

    for (const event of upcomingEvents) {
      // Buscar tickets de este evento
      const tickets = await this.ticketRepository.findByEventId(event.id);
      
      for (const ticket of tickets) {
        if (ticket.status === TicketStatus.PAID) {
          await this.notificationService.notifyEventReminder(
            ticket.buyerEmail.value, // Necesitamos userId aquí
            event,
            ticket
          );
        }
      }
    }
  }

  @Cron('*/5 * * * *') // Cada 5 minutos
  async notifyExpiringReservations(): Promise<void> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const expiringReservations = await this.reservationRepository.findActiveExpiringBetween(
      now,
      fiveMinutesFromNow
    );

    for (const reservation of expiringReservations) {
      const minutesLeft = Math.ceil((reservation.expiresAt.getTime() - now.getTime()) / 60000);
      
      await this.notificationService.notifyReservationExpiring(
        reservation.id,
        reservation.buyerEmail.value, // Necesitamos userId aquí
        minutesLeft
      );
    }
  }
}
```

**Cambios en el Frontend**:

1. **Service**: `WebSocketService`
```typescript
// frontend/src/app/core/services/websocket.service.ts
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket!: Socket;
  private readonly notifications$ = new Subject<Notification>();
  
  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3000/events', {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      
      // Autenticar usuario
      const user = this.authService.currentUser();
      if (user) {
        this.socket.emit('authenticate', { userId: user.id });
      }
    });

    this.socket.on('notification', (notification: any) => {
      console.log('Notification received:', notification);
      this.notifications$.next(notification);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  onNotification(): Observable<Notification> {
    return this.notifications$.asObservable();
  }
}
```

2. **Service**: `NotificationService`
```typescript
// frontend/src/app/core/services/notification.service.ts
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService);
  private readonly router = inject(Router);
  
  readonly unreadCount = signal(0);
  readonly notifications = signal<Notification[]>([]);
  
  private readonly apiUrl = 'http://localhost:3000/notifications';

  init(): void {
    // Conectar WebSocket
    this.wsService.connect();

    // Escuchar notificaciones
    this.wsService.onNotification().subscribe(notification => {
      this.handleNotification(notification);
    });

    // Cargar notificaciones iniciales
    this.loadNotifications();
    this.loadUnreadCount();
  }

  private handleNotification(notification: Notification): void {
    // Añadir a lista
    this.notifications.update(notifs => [notification, ...notifs]);
    
    // Incrementar contador
    this.unreadCount.update(count => count + 1);
    
    // Mostrar toast
    this.showToast(notification);
  }

  private showToast(notification: Notification): void {
    // Usar librería de toasts (ej: ngx-sonner, primeng-toast)
    const toast = {
      severity: this.getSeverity(notification.priority),
      summary: notification.title,
      detail: notification.message,
      life: this.getLife(notification.priority),
      sticky: notification.priority === 'URGENT'
    };

    // Si tiene acción, añadir botón
    if (notification.action) {
      toast['actions'] = [{
        label: notification.action.label,
        onClick: () => this.router.navigateByUrl(notification.action.route)
      }];
    }

    // Mostrar toast (depende de la librería)
  }

  private getSeverity(priority: string): string {
    const map = {
      'LOW': 'info',
      'MEDIUM': 'info',
      'HIGH': 'warn',
      'URGENT': 'error'
    };
    return map[priority] || 'info';
  }

  private getLife(priority: string): number {
    const map = {
      'LOW': 3000,
      'MEDIUM': 5000,
      'HIGH': 7000,
      'URGENT': 0 // No auto-close
    };
    return map[priority] || 5000;
  }

  loadNotifications(): void {
    this.http.get<Notification[]>(`${this.apiUrl}`)
      .subscribe(notifications => {
        this.notifications.set(notifications);
      });
  }

  loadUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.apiUrl}/unread/count`)
      .subscribe(data => {
        this.unreadCount.set(data.count);
      });
  }

  markAsRead(id: string): void {
    this.http.put(`${this.apiUrl}/${id}/read`, {})
      .subscribe(() => {
        this.notifications.update(notifs => 
          notifs.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
        );
        this.unreadCount.update(count => Math.max(0, count - 1));
      });
  }

  markAllAsRead(): void {
    this.http.put(`${this.apiUrl}/read-all`, {})
      .subscribe(() => {
        this.notifications.update(notifs => 
          notifs.map(n => ({ ...n, readAt: new Date().toISOString() }))
        );
        this.unreadCount.set(0);
      });
  }
}
```

3. **Component**: `NotificationBell` (Header)
```typescript
// frontend/src/app/shared/components/notification-bell/notification-bell.ts
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-bell" (click)="togglePanel()">
      <span class="icon">🔔</span>
      @if (unreadCount() > 0) {
        <span class="badge">{{ unreadCount() }}</span>
      }
    </div>
    
    @if (showPanel()) {
      <div class="notification-panel">
        <div class="panel-header">
          <h3>Notificaciones</h3>
          @if (unreadCount() > 0) {
            <button (click)="markAllAsRead()">Marcar todas como leídas</button>
          }
        </div>
        
        <div class="notifications-list">
          @if (notifications().length === 0) {
            <div class="empty-state">
              <p>No tienes notificaciones</p>
            </div>
          }
          
          @for (notif of notifications(); track notif.id) {
            <div class="notification-item" 
                 [class.unread]="!notif.readAt"
                 (click)="handleNotificationClick(notif)">
              <div class="notification-content">
                <h4>{{ notif.title }}</h4>
                <p>{{ notif.message }}</p>
                <span class="timestamp">{{ notif.timestamp | timeAgo }}</span>
              </div>
              @if (!notif.readAt) {
                <span class="unread-dot"></span>
              }
            </div>
          }
        </div>
        
        <div class="panel-footer">
          <a routerLink="/notifications">Ver todas</a>
        </div>
      </div>
    }
  `,
  styles: [`
    .notification-bell {
      position: relative;
      cursor: pointer;
      padding: 8px;
    }
    
    .badge {
      position: absolute;
      top: 0;
      right: 0;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    
    .notification-panel {
      position: absolute;
      top: 60px;
      right: 20px;
      width: 400px;
      max-height: 600px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    
    .notification-item {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .notification-item:hover {
      background: #f9fafb;
    }
    
    .notification-item.unread {
      background: #eff6ff;
    }
    
    .unread-dot {
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border-radius: 50%;
    }
  `]
})
export class NotificationBell {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  
  readonly unreadCount = this.notificationService.unreadCount;
  readonly notifications = this.notificationService.notifications;
  readonly showPanel = signal(false);
  
  togglePanel(): void {
    this.showPanel.update(show => !show);
  }
  
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
  
  handleNotificationClick(notif: Notification): void {
    // Marcar como leída
    if (!notif.readAt) {
      this.notificationService.markAsRead(notif.id);
    }
    
    // Navegar si tiene acción
    if (notif.action) {
      this.router.navigateByUrl(notif.action.route);
    }
    
    // Cerrar panel
    this.showPanel.set(false);
  }
}
```

4. **Añadir al App Component**:
```typescript
// frontend/src/app/app.ts
export class App implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  
  ngOnInit(): void {
    // Inicializar notificaciones si usuario está autenticado
    if (this.authService.isAuthenticated()) {
      this.notificationService.init();
    }
    
    // Escuchar cambios de autenticación
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.notificationService.init();
      }
    });
  }
}
```

5. **Añadir Bell al Header**:
```typescript
// frontend/src/app/components/header/header.html
<header>
  <div class="logo">Ticketing</div>
  
  <nav>
    <!-- ... links ... -->
  </nav>
  
  @if (isAuthenticated()) {
    <app-notification-bell />
  }
  
  <div class="user-menu">
    <!-- ... -->
  </div>
</header>
```

#### 📈 Métricas de Éxito

**KPIs a Medir**:
1. **Engagement**:
   - % de usuarios que activan notificaciones
   - Promedio de notificaciones por usuario/día
   - % de notificaciones clickeadas

2. **Conversión**:
   - % de usuarios que compran tras notificación de tickets disponibles
   - Tiempo promedio entre notificación y acción

3. **Retención**:
   - % de usuarios que regresan tras recibir notificación
   - Frecuencia de visitas tras activar notificaciones

4. **Satisfacción**:
   - % de usuarios que NO desactivan notificaciones
   - Rating de utilidad de notificaciones (encuesta)

#### 💻 Esfuerzo de Implementación

**Estimación**: 18-24 horas

| Tarea | Horas | Prioridad |
|-------|-------|-----------|
| Crear entidad Notification + repository | 2 | Alta |
| Implementar NotificationService backend | 3 | Alta |
| Actualizar WebSocket Gateway (autenticación de usuarios) | 2 | Alta |
| Crear NotificationController (REST API) | 2 | Alta |
| Implementar NotificationScheduler (recordatorios) | 2 | Alta |
| Migración de BD (tabla notifications) | 1 | Alta |
| WebSocketService frontend | 2 | Alta |
| NotificationService frontend | 2 | Alta |
| Componente NotificationBell | 3 | Alta |
| Integrar librería de toasts (ngx-sonner) | 1 | Media |
| Styling y animaciones | 2 | Media |
| Tests unitarios e integración | 2 | Media |

**Riesgos**:
- 🟡 **Medio**: WebSocket requiere servidor siempre activo
- 🟡 **Medio**: Escalar a múltiples instancias requiere Redis (pub/sub)
- 🟢 **Bajo**: Funcionalidad optional (no bloquea flujos existentes)

#### ✅ Criterios de Aceptación

1. ✅ **AC1**: Cuando el usuario se autentica, se conecta automáticamente al WebSocket

2. ✅ **AC2**: Las notificaciones se persisten en base de datos

3. ✅ **AC3**: Las notificaciones se muestran como toasts no intrusivos en la esquina inferior derecha

4. ✅ **AC4**: El header muestra badge con contador de notificaciones no leídas

5. ✅ **AC5**: Al hacer click en el icono de campana, se abre panel con últimas notificaciones

6. ✅ **AC6**: El usuario puede marcar notificaciones como leídas

7. ✅ **AC7**: El usuario puede marcar todas las notificaciones como leídas

8. ✅ **AC8**: Las notificaciones URGENT no se cierran automáticamente

9. ✅ **AC9**: Las notificaciones con acción muestran botón clickeable

10. ✅ **AC10**: Se envían recordatorios automáticos 24h antes del evento

11. ✅ **AC11**: Se notifica cuando una reserva está por expirar (5 minutos antes)

12. ✅ **AC12**: Se notifica cuando se liberan tickets de eventos con alta demanda

#### 🎁 Valor Agregado

**Para el Usuario**:
- ✨ Información en tiempo real sin recargar página
- ✨ No pierde oportunidades de comprar tickets liberados
- ✨ Recordatorios automáticos de eventos
- ✨ Alertas de reservas por expirar

**Para el Negocio**:
- 💰 Aumenta engagement con la plataforma
- 💰 Reduce abandono de reservas (alertas de expiración)
- 💰 Aumenta ventas de tickets liberados (notificaciones inmediatas)
- 💰 Mejora retención de usuarios

---

### Funcionalidad 3: Sistema de Favoritos y Listas de Deseos con Analytics

#### 📊 Contexto y Justificación

**Problema Actual**:
Los usuarios NO pueden:
- Guardar eventos de interés para ver más tarde
- Seguir eventos próximos a salir a la venta
- Recibir notificaciones cuando tickets de eventos favoritos están disponibles
- Ver historial de eventos que les interesan

El sistema NO puede:
- Identificar qué eventos son más populares antes de la venta
- Medir interés real en eventos futuros
- Segmentar usuarios por preferencias
- Enviar notificaciones personalizadas

**Impacto del Problema**:
- 🔴 Usuarios deben buscar eventos manualmente cada vez
- 🔴 Pérdida de información valiosa sobre interés pre-venta
- 🔴 No hay forma de medir "demand hype" de eventos
- 🔴 Marketing genérico (no personalizado por preferencias)

**Solución Propuesta**:
Sistema de favoritos con analytics que permite a usuarios guardar eventos de interés y al negocio medir demanda real, segmentar usuarios y personalizar notificaciones.

#### 🎯 Descripción Detallada

**¿Qué hace?**

**Para el Usuario**:
1. Puede agregar eventos a su lista de favoritos (icono ❤️)
2. Ve lista de todos sus eventos favoritos en una página dedicada
3. Recibe notificaciones cuando:
   - Se liberan tickets del evento favorito
   - Cambia el precio de tickets
   - Se actualiza información del evento
   - Quedan 48h para el evento
4. Puede crear listas personalizadas (ej: "Conciertos 2026", "Con amigos")
5. Compartir listas con amigos

**Para el Negocio**:
1. Dashboard de analytics con:
   - Eventos más agregados a favoritos
   - Interés pre-venta (antes de que tickets salgan)
   - Tasa de conversión: favoritos → compras
   - Segmentación de usuarios por categorías de interés
2. Reportes de demanda para organizadores
3. Targeting de notificaciones por preferencias

**Entidades Involucradas**:

```typescript
// Favorito individual
class EventFavorite {
  id: string
  userId: string
  eventId: string
  addedAt: Date
  notifyOnAvailability: boolean
  notifyOnPriceChange: boolean
  notes?: string // Notas personales del usuario
}

// Lista personalizada
class FavoriteList {
  id: string
  userId: string
  name: string // "Conciertos 2026", "Con amigos"
  description?: string
  isPublic: boolean
  eventIds: string[]
  createdAt: Date
  updatedAt: Date
}

// Analytics
interface EventPopularity {
  eventId: string
  eventName: string
  favoriteCount: number
  addedInLast24h: number
  addedInLast7d: number
  conversionRate: number // favoritos → compras
  trend: 'UP' | 'DOWN' | 'STABLE'
}
```

#### 🔧 Implementación Técnica

**Cambios en el Backend**:

1. **Nueva Entidad**: `EventFavorite`
```typescript
// backend/src/domain/entities/event-favorite.entity.ts
export class EventFavorite {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly eventId: string,
    public readonly addedAt: Date,
    public readonly notifyOnAvailability: boolean = true,
    public readonly notifyOnPriceChange: boolean = false,
    public readonly notes: string | null = null
  ) {}

  withNotes(notes: string): EventFavorite {
    return new EventFavorite(
      this.id,
      this.userId,
      this.eventId,
      this.addedAt,
      this.notifyOnAvailability,
      this.notifyOnPriceChange,
      notes
    );
  }

  withNotificationPreferences(
    onAvailability: boolean,
    onPriceChange: boolean
  ): EventFavorite {
    return new EventFavorite(
      this.id,
      this.userId,
      this.eventId,
      this.addedAt,
      onAvailability,
      onPriceChange,
      this.notes
    );
  }
}
```

2. **Repository**: `IEventFavoriteRepository`
```typescript
// backend/src/domain/interfaces/event-favorite-repository.interface.ts
export interface IEventFavoriteRepository {
  create(favorite: EventFavorite): Promise<EventFavorite>;
  findById(id: string): Promise<EventFavorite | null>;
  findByUserIdAndEventId(userId: string, eventId: string): Promise<EventFavorite | null>;
  findByUserId(userId: string): Promise<EventFavorite[]>;
  findByEventId(eventId: string): Promise<EventFavorite[]>;
  findUsersInterestedInEvent(eventId: string): Promise<string[]>; // userIds
  delete(id: string): Promise<void>;
  countByEventId(eventId: string): Promise<number>;
  
  // Analytics
  getTopFavoriteEvents(limit: number): Promise<EventPopularityDto[]>;
  getFavoriteCountInPeriod(eventId: string, from: Date, to: Date): Promise<number>;
  getUserFavoritesByCategory(userId: string): Promise<Map<EventCategory, number>>;
}
```

3. **Use Cases**:

```typescript
// backend/src/application/use-cases/add-event-to-favorites.use-case.ts
export class AddEventToFavoritesUseCase {
  async execute(dto: AddToFavoritesDto): Promise<EventFavorite> {
    // 1. Verificar que el evento existe
    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // 2. Verificar que no está ya en favoritos
    const existing = await this.favoriteRepository.findByUserIdAndEventId(
      dto.userId,
      dto.eventId
    );
    if (existing) {
      throw new ConflictException('Event already in favorites');
    }

    // 3. Crear favorito
    const favorite = new EventFavorite(
      uuidv4(),
      dto.userId,
      dto.eventId,
      new Date(),
      dto.notifyOnAvailability ?? true,
      dto.notifyOnPriceChange ?? false,
      dto.notes ?? null
    );

    // 4. Guardar
    await this.favoriteRepository.create(favorite);

    // 5. Emitir evento de dominio (para analytics)
    this.eventEmitter.emit('event.added_to_favorites', {
      userId: dto.userId,
      eventId: dto.eventId,
      eventCategory: event.category,
      timestamp: new Date()
    });

    return favorite;
  }
}

// backend/src/application/use-cases/get-favorite-events.use-case.ts
export class GetFavoriteEventsUseCase {
  async execute(userId: string): Promise<EventWithFavoriteDto[]> {
    // 1. Obtener favoritos del usuario
    const favorites = await this.favoriteRepository.findByUserId(userId);

    // 2. Obtener eventos completos
    const events = await Promise.all(
      favorites.map(fav => this.eventRepository.findById(fav.eventId))
    );

    // 3. Mapear a DTO con info de favorito
    return events.map((event, idx) => ({
      ...event,
      favorite: {
        id: favorites[idx].id,
        addedAt: favorites[idx].addedAt,
        notifyOnAvailability: favorites[idx].notifyOnAvailability,
        notifyOnPriceChange: favorites[idx].notifyOnPriceChange,
        notes: favorites[idx].notes
      }
    }));
  }
}

// backend/src/application/use-cases/get-favorite-analytics.use-case.ts
export class GetFavoriteAnalyticsUseCase {
  async execute(eventId?: string): Promise<FavoriteAnalyticsDto> {
    if (eventId) {
      // Analytics de un evento específico
      return this.getEventAnalytics(eventId);
    } else {
      // Analytics globales
      return this.getGlobalAnalytics();
    }
  }

  private async getEventAnalytics(eventId: string): Promise<EventAnalyticsDto> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalFavorites,
      favoritesLast24h,
      favoritesLast7d,
      ticketsSold
    ] = await Promise.all([
      this.favoriteRepository.countByEventId(eventId),
      this.favoriteRepository.getFavoriteCountInPeriod(eventId, yesterday, now),
      this.favoriteRepository.getFavoriteCountInPeriod(eventId, lastWeek, now),
      this.ticketRepository.countByEventId(eventId)
    ]);

    const conversionRate = totalFavorites > 0 
      ? (ticketsSold / totalFavorites) * 100 
      : 0;

    const trend = this.calculateTrend(favoritesLast24h, favoritesLast7d);

    return {
      eventId,
      eventName: event.name,
      totalFavorites,
      favoritesLast24h,
      favoritesLast7d,
      ticketsSold,
      conversionRate,
      trend
    };
  }

  private async getGlobalAnalytics(): Promise<GlobalFavoriteAnalyticsDto> {
    const topEvents = await this.favoriteRepository.getTopFavoriteEvents(10);
    
    return {
      topEvents,
      totalFavorites: topEvents.reduce((sum, e) => sum + e.favoriteCount, 0)
    };
  }

  private calculateTrend(last24h: number, last7d: number): 'UP' | 'DOWN' | 'STABLE' {
    const dailyAverage7d = last7d / 7;
    const percentChange = ((last24h - dailyAverage7d) / dailyAverage7d) * 100;

    if (percentChange > 20) return 'UP';
    if (percentChange < -20) return 'DOWN';
    return 'STABLE';
  }
}
```

4. **Controller**: `FavoriteController`
```typescript
// backend/src/presentation/controllers/favorite.controller.ts
@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(
    private readonly addToFavoritesUseCase: AddEventToFavoritesUseCase,
    private readonly removeFromFavoritesUseCase: RemoveFromFavoritesUseCase,
    private readonly getFavoriteEventsUseCase: GetFavoriteEventsUseCase
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add event to favorites' })
  async addToFavorites(
    @Req() req: any,
    @Body() dto: AddToFavoritesDto
  ): Promise<EventFavorite> {
    return this.addToFavoritesUseCase.execute({
      ...dto,
      userId: req.user.id
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my favorite events' })
  async getMyFavorites(@Req() req: any): Promise<EventWithFavoriteDto[]> {
    return this.getFavoriteEventsUseCase.execute(req.user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove event from favorites' })
  async removeFromFavorites(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<void> {
    await this.removeFromFavoritesUseCase.execute(id, req.user.id);
  }

  @Get(':eventId/check')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if event is in favorites' })
  async checkFavorite(
    @Param('eventId') eventId: string,
    @Req() req: any
  ): Promise<{ isFavorite: boolean; favoriteId?: string }> {
    const favorite = await this.favoriteRepository.findByUserIdAndEventId(
      req.user.id,
      eventId
    );
    
    return {
      isFavorite: !!favorite,
      favoriteId: favorite?.id
    };
  }
}
```

5. **Analytics Controller** (Admin/Organizer only):
```typescript
// backend/src/presentation/controllers/favorite-analytics.controller.ts
@ApiTags('analytics')
@Controller('analytics/favorites')
@UseGuards(JwtAuthGuard, AdminOrOrganizerGuard)
export class FavoriteAnalyticsController {
  constructor(
    private readonly getFavoriteAnalyticsUseCase: GetFavoriteAnalyticsUseCase
  ) {}

  @Get('global')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get global favorite analytics' })
  async getGlobalAnalytics(): Promise<GlobalFavoriteAnalyticsDto> {
    return this.getFavoriteAnalyticsUseCase.execute();
  }

  @Get('event/:eventId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for specific event' })
  async getEventAnalytics(
    @Param('eventId') eventId: string
  ): Promise<EventAnalyticsDto> {
    return this.getFavoriteAnalyticsUseCase.execute(eventId);
  }

  @Get('trending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trending events (most added to favorites recently)' })
  async getTrendingEvents(): Promise<EventPopularityDto[]> {
    return this.favoriteRepository.getTopFavoriteEvents(10);
  }
}
```

6. **Integración con Notificaciones**:
```typescript
// Actualizar NotificationService para usar favoritos
async notifyTicketsAvailable(eventId: string, ticketType: TicketType, quantity: number) {
  // Buscar usuarios que tienen este evento en favoritos con notificaciones activadas
  const favorites = await this.favoriteRepository.findByEventId(eventId);
  const interestedUsers = favorites.filter(fav => fav.notifyOnAvailability);

  const event = await this.eventRepository.findById(eventId);

  for (const favorite of interestedUsers) {
    await this.sendNotification(
      favorite.userId,
      NotificationType.TICKETS_AVAILABLE,
      '¡Tickets disponibles! 🎉',
      `${quantity} tickets ${ticketType} liberados para "${event.name}"`,
      { label: 'Ver evento', route: `/events/${eventId}` },
      NotificationPriority.HIGH,
      { eventId, ticketType, quantity }
    );
  }
}
```

**Cambios en el Frontend**:

1. **Service**: `FavoriteService`
```typescript
// frontend/src/app/services/favorite.service.ts
@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  
  readonly favorites = signal<EventWithFavorite[]>([]);
  readonly favoriteIds = computed(() => 
    new Set(this.favorites().map(f => f.id))
  );
  
  private readonly apiUrl = 'http://localhost:3000/favorites';

  loadFavorites(): void {
    this.http.get<EventWithFavorite[]>(this.apiUrl)
      .subscribe(favorites => {
        this.favorites.set(favorites);
      });
  }

  addToFavorites(eventId: string, preferences?: FavoritePreferences): Observable<EventFavorite> {
    return this.http.post<EventFavorite>(this.apiUrl, {
      eventId,
      notifyOnAvailability: preferences?.notifyOnAvailability ?? true,
      notifyOnPriceChange: preferences?.notifyOnPriceChange ?? false,
      notes: preferences?.notes ?? null
    }).pipe(
      tap(() => this.loadFavorites()) // Recargar lista
    );
  }

  removeFromFavorites(favoriteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${favoriteId}`)
      .pipe(
        tap(() => this.loadFavorites()) // Recargar lista
      );
  }

  isFavorite(eventId: string): boolean {
    return this.favoriteIds().has(eventId);
  }

  checkFavorite(eventId: string): Observable<{ isFavorite: boolean; favoriteId?: string }> {
    return this.http.get<{ isFavorite: boolean; favoriteId?: string }>(
      `${this.apiUrl}/${eventId}/check`
    );
  }
}
```

2. **Component**: `FavoriteButton`
```typescript
// frontend/src/app/shared/components/favorite-button/favorite-button.ts
@Component({
  selector: 'app-favorite-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="favorite-btn"
      [class.active]="isFavorite()"
      (click)="toggleFavorite()"
      [disabled]="loading()">
      
      @if (loading()) {
        <span class="spinner"></span>
      } @else {
        <span class="icon">{{ isFavorite() ? '❤️' : '🤍' }}</span>
      }
      
      @if (showLabel()) {
        <span class="label">
          {{ isFavorite() ? 'En favoritos' : 'Agregar a favoritos' }}
        </span>
      }
    </button>
  `,
  styles: [`
    .favorite-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .favorite-btn:hover {
      border-color: #ef4444;
      transform: scale(1.05);
    }
    
    .favorite-btn.active {
      background: #fef2f2;
      border-color: #ef4444;
    }
    
    .icon {
      font-size: 20px;
      transition: transform 0.3s;
    }
    
    .favorite-btn:hover .icon {
      transform: scale(1.2);
    }
  `]
})
export class FavoriteButton {
  @Input({ required: true }) eventId!: string;
  @Input() showLabel = false;
  
  private readonly favoriteService = inject(FavoriteService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  readonly loading = signal(false);
  readonly isFavorite = computed(() => 
    this.favoriteService.isFavorite(this.eventId)
  );
  
  toggleFavorite(): void {
    if (!this.authService.isAuthenticated()) {
      // Redirigir a login
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.loading.set(true);

    if (this.isFavorite()) {
      // Remover de favoritos
      const favoriteId = this.getFavoriteId();
      this.favoriteService.removeFromFavorites(favoriteId)
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.showToast('Eliminado de favoritos');
          },
          error: () => {
            this.loading.set(false);
            this.showToast('Error al eliminar', 'error');
          }
        });
    } else {
      // Agregar a favoritos
      this.favoriteService.addToFavorites(this.eventId)
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.showToast('¡Agregado a favoritos! 🎉');
          },
          error: () => {
            this.loading.set(false);
            this.showToast('Error al agregar', 'error');
          }
        });
    }
  }

  private getFavoriteId(): string {
    const favorite = this.favoriteService.favorites().find(f => f.id === this.eventId);
    return favorite?.favorite.id ?? '';
  }

  private showToast(message: string, severity: 'success' | 'error' = 'success'): void {
    // Mostrar toast (usar librería)
  }
}
```

3. **Page**: `MyFavorites`
```typescript
// frontend/src/app/pages/my-favorites/my-favorites.ts
@Component({
  selector: 'app-my-favorites',
  standalone: true,
  imports: [CommonModule, EventCard, FavoriteButton],
  template: `
    <div class="favorites-page">
      <header>
        <h1>Mis Favoritos ❤️</h1>
        <p>{{ favorites().length }} eventos guardados</p>
      </header>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      }

      @if (!loading() && favorites().length === 0) {
        <div class="empty-state">
          <span class="icon">🤍</span>
          <h2>No tienes favoritos aún</h2>
          <p>Explora eventos y guarda los que te interesen</p>
          <a routerLink="/events" class="btn-primary">Explorar eventos</a>
        </div>
      }

      <div class="favorites-grid">
        @for (event of favorites(); track event.id) {
          <div class="favorite-item">
            <app-event-card [event]="event" />
            
            <div class="favorite-info">
              <p class="added-date">
                Agregado {{ event.favorite.addedAt | timeAgo }}
              </p>
              
              @if (event.favorite.notes) {
                <p class="notes">📝 {{ event.favorite.notes }}</p>
              }
              
              <div class="notification-settings">
                <label>
                  <input 
                    type="checkbox" 
                    [checked]="event.favorite.notifyOnAvailability"
                    (change)="updateNotificationPreference(event, 'availability', $event)">
                  Notificar cuando haya tickets disponibles
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    [checked]="event.favorite.notifyOnPriceChange"
                    (change)="updateNotificationPreference(event, 'price', $event)">
                  Notificar cambios de precio
                </label>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .favorites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      padding: 24px;
    }
    
    .favorite-item {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s;
    }
    
    .favorite-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }
    
    .favorite-info {
      padding: 16px;
      background: #f9fafb;
    }
    
    .empty-state {
      text-align: center;
      padding: 80px 20px;
    }
    
    .empty-state .icon {
      font-size: 80px;
    }
  `]
})
export class MyFavorites implements OnInit {
  private readonly favoriteService = inject(FavoriteService);
  
  readonly favorites = this.favoriteService.favorites;
  readonly loading = signal(true);
  
  ngOnInit(): void {
    this.favoriteService.loadFavorites();
    
    // Simular carga
    setTimeout(() => this.loading.set(false), 500);
  }
  
  updateNotificationPreference(
    event: EventWithFavorite,
    type: 'availability' | 'price',
    changeEvent: any
  ): void {
    // Llamar API para actualizar preferencias
    const newValue = changeEvent.target.checked;
    // ... implementar actualización
  }
}
```

4. **Añadir a EventCard**:
```typescript
// Actualizar EventCard para incluir botón de favoritos
<div class="event-card">
  <img [src]="event.imageUrl" />
  
  <app-favorite-button 
    [eventId]="event.id" 
    class="favorite-btn-overlay" />
  
  <div class="event-info">
    <!-- ... resto del contenido ... -->
  </div>
</div>
```

5. **Dashboard de Analytics** (Admin):
```typescript
// frontend/src/app/pages/admin/favorite-analytics/favorite-analytics.ts
@Component({
  selector: 'app-favorite-analytics',
  standalone: true,
  template: `
    <div class="analytics-dashboard">
      <h1>📊 Analytics de Favoritos</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>Eventos Más Populares</h3>
          <div class="top-events-list">
            @for (event of topEvents(); track event.eventId) {
              <div class="event-item">
                <span class="rank">{{ $index + 1 }}</span>
                <div class="event-details">
                  <h4>{{ event.eventName }}</h4>
                  <p>❤️ {{ event.favoriteCount }} favoritos</p>
                  <p>🎫 {{ event.ticketsSold }} vendidos</p>
                  <p>📈 Conversión: {{ event.conversionRate }}%</p>
                  <span class="trend" [class]="event.trend">
                    {{ event.trend === 'UP' ? '📈' : event.trend === 'DOWN' ? '📉' : '➡️' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="stat-card">
          <h3>Tendencias</h3>
          <!-- Gráfico de favoritos en el tiempo -->
        </div>
      </div>
    </div>
  `
})
export class FavoriteAnalytics implements OnInit {
  private readonly http = inject(HttpClient);
  
  readonly topEvents = signal<EventPopularity[]>([]);
  
  ngOnInit(): void {
    this.loadAnalytics();
  }
  
  loadAnalytics(): void {
    this.http.get<EventPopularity[]>('http://localhost:3000/analytics/favorites/global')
      .subscribe(data => {
        this.topEvents.set(data);
      });
  }
}
```

#### 📈 Métricas de Éxito

**KPIs a Medir**:
1. **Adopción**:
   - % de usuarios que usan favoritos
   - Promedio de favoritos por usuario
   - % de usuarios con >5 favoritos

2. **Engagement**:
   - Frecuencia de visitas a página de favoritos
   - % de usuarios que regresan tras notificación de favoritos

3. **Conversión**:
   - Tasa de conversión: favoritos → compras
   - Comparar conversión de eventos con muchos favoritos vs. pocos

4. **Business Intelligence**:
   - Correlación entre favoritos pre-venta y ventas reales
   - Predicción de demanda basada en tendencias de favoritos

#### 💻 Esfuerzo de Implementación

**Estimación**: 20-26 horas

| Tarea | Horas | Prioridad |
|-------|-------|-----------|
| Crear entidad EventFavorite + repository | 2 | Alta |
| Implementar AddToFavoritesUseCase | 2 | Alta |
| Implementar GetFavoriteEventsUseCase | 2 | Alta |
| Implementar GetFavoriteAnalyticsUseCase | 3 | Alta |
| Crear FavoriteController | 2 | Alta |
| Crear FavoriteAnalyticsController | 2 | Media |
| Migración de BD (tabla event_favorites) | 1 | Alta |
| Integrar con NotificationService | 2 | Alta |
| FavoriteService frontend | 2 | Alta |
| Componente FavoriteButton | 2 | Alta |
| Página MyFavorites | 3 | Alta |
| Dashboard de Analytics (admin) | 3 | Media |
| Tests unitarios e integración | 2 | Media |

**Riesgos**:
- 🟢 **Bajo**: Funcionalidad independiente (no afecta flujos existentes)
- 🟢 **Bajo**: Cambios en BD sencillos (nueva tabla)
- 🟡 **Medio**: Analytics requiere queries complejas (optimización)

#### ✅ Criterios de Aceptación

1. ✅ **AC1**: Usuario autenticado puede agregar eventos a favoritos

2. ✅ **AC2**: El botón de favoritos muestra estado visual claro (corazón lleno/vacío)

3. ✅ **AC3**: El usuario puede ver lista completa de favoritos en página dedicada

4. ✅ **AC4**: El usuario puede configurar preferencias de notificación por favorito

5. ✅ **AC5**: El sistema envía notificaciones cuando se liberan tickets de eventos favoritos

6. ✅ **AC6**: El sistema envía notificaciones de cambios de precio si el usuario lo configuró

7. ✅ **AC7**: Los administradores pueden ver analytics de favoritos en dashboard

8. ✅ **AC8**: Los analytics muestran:
   - Top 10 eventos más agregados
   - Favoritos añadidos en últimas 24h y 7d
   - Tasa de conversión favoritos → compras
   - Tendencia (UP/DOWN/STABLE)

9. ✅ **AC9**: Los organizadores pueden ver analytics de sus propios eventos

10. ✅ **AC10**: El sistema detecta eventos trending (muchos favoritos en poco tiempo)

#### 🎁 Valor Agregado

**Para el Usuario**:
- ✨ No pierde de vista eventos de interés
- ✨ Notificaciones personalizadas (solo eventos que le importan)
- ✨ Gestión centralizada de intereses
- ✨ Ahorra tiempo (no buscar manualmente)

**Para el Negocio**:
- 💰 **Business Intelligence**: Medir demanda ANTES de la venta
- 💰 Predicción de ventas basada en favoritos
- 💰 Segmentación de usuarios por preferencias
- 💰 Marketing personalizado por categorías de interés
- 💰 Identificar eventos trending para promocionar
- 💰 Aumentar conversión (notificaciones dirigidas)

---

## 📝 Resumen Ejecutivo

### Comparación de las 3 Funcionalidades Propuestas

| Característica | Recomendaciones Inteligentes | Notificaciones Push | Favoritos + Analytics |
|----------------|----------------------------|-------------------|---------------------|
| **Complejidad** | Media | Media-Alta | Media |
| **Tiempo Estimado** | 16-20h | 18-24h | 20-26h |
| **Impacto Usuario** | Alto (reduce frustración) | Alto (engagement) | Medio-Alto (conveniencia) |
| **Impacto Negocio** | Alto (↑ conversión) | Medio (↑ retención) | Muy Alto (BI + segmentación) |
| **Riesgo Técnico** | Bajo | Medio (WebSocket) | Bajo |
| **Valor Inmediato** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Valor Largo Plazo** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Recomendación de Priorización

**Opción 1: Máximo Impacto Inmediato**
1. Recomendaciones Inteligentes (primero)
2. Notificaciones Push (segundo)
3. Favoritos + Analytics (tercero)

**Opción 2: Balance Estratégico**
1. Favoritos + Analytics (primero - fundamento para las otras)
2. Notificaciones Push (segundo - usa datos de favoritos)
3. Recomendaciones Inteligentes (tercero)

**Opción 3: Prototipado Rápido**
- Implementar versiones básicas de las 3 en paralelo
- Iterar basándose en feedback

### Dependencias entre Funcionalidades

- **Favoritos → Notificaciones**: Los favoritos alimentan el sistema de notificaciones personalizadas
- **Favoritos → Recomendaciones**: El historial de favoritos puede mejorar el scoring de recomendaciones
- **Notificaciones ← Recomendaciones**: Notificar cuando hay alternativas disponibles

### ROI Estimado

| Funcionalidad | Inversión (horas) | Retorno Esperado |
|---------------|------------------|------------------|
| Recomendaciones | 16-20h | +40% conversión en eventos de alta demanda |
| Notificaciones | 18-24h | +25% retención, -30% abandono de reservas |
| Favoritos + Analytics | 20-26h | Datos para decisiones estratégicas + segmentación |

---

## 🎯 Conclusión

Las 3 funcionalidades propuestas son **viables, puntuales y agregan valor significativo** al sistema de Ticketing:

1. **Recomendaciones Inteligentes**: Soluciona un punto de fricción crítico (tickets no disponibles)
2. **Notificaciones Push**: Aumenta engagement y reduce abandono
3. **Favoritos + Analytics**: Genera inteligencia de negocio y mejora experiencia

Todas son **implementables sin mayor complicación**, ya que:
- Aprovechan la arquitectura existente (Clean Architecture + DDD)
- No rompen flujos actuales
- Añaden tablas nuevas sin afectar esquema existente
- Usan patrones ya establecidos en el proyecto

**Recomendación Final**: Implementar en el orden sugerido (Opción 1 o 2 según prioridades del negocio), validando cada una con métricas antes de continuar.

---

**Fecha del Documento**: 20 de Enero, 2026  
**Versión**: 1.0  
**Autor**: Análisis del Sistema de Ticketing
