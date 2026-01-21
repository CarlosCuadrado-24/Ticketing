# 🏗️ Architecture Documentation - Ticketing System

## 📋 Overview

This Angular 21 application implements a modern ticketing system using **Standalone Components**, **Angular Signals**, and **Clean Architecture** principles. The refactoring addresses all critical issues identified in the senior code review.

## 🎯 Architectural Principles Applied

### SOLID Principles

#### ✅ Single Responsibility Principle (SRP)
- **Before**: `CheckoutService` handled cart, reservations, payments, and persistence (150+ lines)
- **After**: Split into specialized services:
  - `CartService`: Shopping cart management
  - `ReservationService`: Ticket reservations and timers
  - `PaymentService`: Payment processing
  - `CheckoutService`: Orchestration only

#### ✅ Open/Closed Principle (OCP)
- **BaseApiService**: Abstract class for HTTP operations, extensible without modification
- **PaymentProcessorFactory**: Factory pattern for different payment processors
- **ValidationStrategyFactory**: Strategy pattern for different validation types

#### ✅ Liskov Substitution Principle (LSP)
- All service implementations can be substituted with their interfaces
- Payment processors are interchangeable through common interface

#### ✅ Interface Segregation Principle (ISP)
- **Before**: Large `Event` interface with 15+ optional properties
- **After**: Segregated interfaces:
  - `BaseEvent`: Core properties only
  - `EventWithTickets`: Event + ticket information
  - `EventWithOrganizer`: Event + organizer details
  - `EventWithVenue`: Event + venue information

#### ✅ Dependency Inversion Principle (DIP)
- Services depend on abstractions (interfaces) not concrete implementations
- Dependency injection used throughout

### Clean Code Principles

#### ✅ Meaningful Names
```typescript
// Before
readonly processingFee = computed(() => 5);

// After
readonly processingFee = computed(() => BUSINESS_RULES.PROCESSING_FEE);
```

#### ✅ Small Functions
- Maximum 30 lines per function
- Single responsibility per method
- Complex operations broken into smaller, focused methods

#### ✅ No Magic Numbers/Strings
```typescript
// Before
const CART_STORAGE_KEY = 'ticketing_cart';
const tax = computed(() => Math.round(this.subtotal() * 0.05 * 100) / 100);

// After
import { STORAGE_KEYS, BUSINESS_RULES } from '../config';
const tax = computed(() => Math.round(this.subtotal() * BUSINESS_RULES.TAX_RATE * 100) / 100);
```

## 🏛️ Architecture Layers

### 1. Presentation Layer
```
src/app/components/          # UI Components
src/app/features/           # Feature modules
src/app/shared/components/  # Reusable components
```

### 2. Application Layer
```
src/app/core/services/      # Core business services
src/app/features/*/services/ # Feature-specific services
src/app/shared/services/    # Shared utilities
```

### 3. Domain Layer
```
src/app/models/             # Domain models and interfaces
src/app/config/             # Business rules and constants
```

### 4. Infrastructure Layer
```
src/app/core/interceptors/  # HTTP interceptors
src/app/core/guards/        # Route guards
```

## 🔧 Design Patterns Implemented

### 1. Factory Pattern
```typescript
// PaymentProcessorFactory
const processor = this.paymentFactory.createProcessor(PaymentProcessorType.STRIPE);
```

### 2. Strategy Pattern
```typescript
// ValidationStrategyFactory
const validator = this.validationFactory.createStrategy(ValidationType.EMAIL);
```

### 3. Repository Pattern
```typescript
// BaseApiService
export abstract class BaseApiService<T extends BaseEntity> {
  getAll(): Observable<T[]> { /* ... */ }
  getById(id: string): Observable<T> { /* ... */ }
}
```

### 4. Observer Pattern
```typescript
// Angular Signals for reactive state management
readonly isAuthenticated = computed(() => !!this._currentUser() && this.tokenService.hasAccessToken());
```

### 5. Decorator Pattern
```typescript
// HTTP Interceptors
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Add authentication headers
};
```

## 📊 Service Architecture

### Core Services Hierarchy

```
BaseApiService (Abstract)
├── EventService extends BaseApiService<Event>
├── TicketsService extends BaseApiService<Ticket>
└── AdminService extends BaseApiService<User>

AuthService
├── CsrfService (Composition)
└── TokenService (Composition)

CheckoutService (Orchestrator)
├── CartService (Composition)
├── ReservationService (Composition)
└── PaymentService (Composition)
```

### Shared Services

```
TicketMappingService    # Centralized ticket logic
ImageService           # Image URL handling
ValidationService      # Input validation
LoggingService        # Structured logging
```

## 🔄 Data Flow

### Authentication Flow
```
1. User Login → AuthService
2. AuthService → CsrfService (get token)
3. AuthService → HTTP Request (with CSRF)
4. Success → TokenService (store tokens)
5. Success → Update user state (signals)
```

### Checkout Flow
```
1. Add to Cart → CartService
2. Create Reservation → ReservationService
3. Start Timer → ReservationService
4. Process Payment → PaymentService
5. Complete Order → Clear cart & reservations
```

## 📁 File Organization

```
src/app/
├── components/              # Presentation components
├── core/                   # Core functionality
│   ├── guards/            # Route guards
│   ├── interceptors/      # HTTP interceptors
│   └── services/          # Core services
├── features/              # Feature modules
│   └── checkout/
│       ├── components/    # Feature components
│       ├── services/      # Feature services
│       └── factories/     # Feature factories
├── models/                # Domain models
├── shared/                # Shared utilities
│   ├── components/        # Reusable components
│   ├── pipes/            # Custom pipes
│   ├── services/         # Utility services
│   └── strategies/       # Strategy implementations
└── config/               # Configuration & constants
```

## 🧪 Testing Strategy

### Unit Tests (Target: 80% coverage)
- All services have comprehensive unit tests
- Mock dependencies using Angular testing utilities
- Test both success and error scenarios

### Integration Tests
- Test service interactions
- Validate HTTP interceptors
- Test component-service integration

### E2E Tests
- Complete user workflows
- Payment processing flows
- Authentication scenarios

## 🚀 Performance Optimizations

### 1. OnPush Change Detection
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 2. Lazy Loading
```typescript
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes')
  }
];
```

### 3. Signal-based State Management
- Reactive updates without zone.js overhead
- Computed values for derived state
- Minimal re-renders

## 🔒 Security Measures

### 1. CSRF Protection
- Centralized CSRF token management
- Automatic token refresh
- Token caching with expiration

### 2. Token Management
- Secure token storage (sessionStorage)
- Automatic token refresh
- Token expiration handling

### 3. Input Validation
- Strategy pattern for different validation types
- Client-side and server-side validation
- XSS prevention through Angular's built-in sanitization

## 📈 Monitoring & Logging

### Structured Logging
```typescript
this.loggingService.logAuth('login', { userId: user.id });
this.loggingService.logPayment('completed', { orderId, amount });
```

### Error Tracking
- Centralized error handling in BaseApiService
- Remote error logging for production
- User-friendly error messages

## 🔧 Configuration Management

### Environment-based Configuration
```typescript
// Development
BUSINESS_RULES.PROCESSING_FEE = 5;

// Production
BUSINESS_RULES.PROCESSING_FEE = environment.processingFee;
```

### Feature Flags
```typescript
const features = {
  enableNewPaymentFlow: environment.production,
  enableAdvancedLogging: !environment.production
};
```

## 📊 Metrics & KPIs

### Code Quality Metrics
- **Cyclomatic Complexity**: < 7 per method
- **Lines per Function**: < 30
- **Class Size**: < 200 lines
- **Test Coverage**: > 80%

### Performance Metrics
- **Bundle Size**: Optimized with tree shaking
- **Load Time**: < 3 seconds initial load
- **Memory Usage**: Monitored for leaks

## 🔄 Migration Guide

### From Old to New Architecture

1. **Replace magic strings**:
   ```typescript
   // Old
   localStorage.getItem('ticketing_cart')
   
   // New
   localStorage.getItem(STORAGE_KEYS.CART)
   ```

2. **Use new service composition**:
   ```typescript
   // Old
   checkoutService.addToCart(...)
   
   // New (same interface, better implementation)
   checkoutService.addToCart(...)
   ```

3. **Update imports**:
   ```typescript
   // Old
   import { Event } from '../models/event.model';
   
   // New
   import { BaseEvent, EventWithTickets } from '../models';
   ```

## 🎯 Future Enhancements

### Planned Improvements
1. **Micro-frontends**: Split into smaller, deployable units
2. **GraphQL**: Replace REST APIs for better data fetching
3. **PWA**: Add offline capabilities
4. **Real-time**: WebSocket integration for live updates
5. **AI/ML**: Recommendation engine for events

### Technical Debt Reduction
- Continuous refactoring of legacy components
- Migration to newer Angular features
- Performance optimization based on metrics

---

This architecture provides a solid foundation for a scalable, maintainable ticketing system that follows industry best practices and senior-level code standards.