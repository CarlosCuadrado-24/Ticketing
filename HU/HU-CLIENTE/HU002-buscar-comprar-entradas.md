# Historia de Usuario 002: Buscar y Comprar Entradas

## 📋 Información General

| Campo | Valor |
|-------|-------|
| **ID** | HU-002 |
| **Título** | Buscar eventos y comprar entradas |
| **Prioridad** | Crítica |
| **Estimación** | 13 puntos |
| **Sprint** | 2-3 |
| **Estado** | ✅ Completado |

---

## 👤 Historia de Usuario

**Como** comprador registrado  
**Quiero** buscar eventos disponibles y comprar entradas  
**Para** asistir a los eventos de mi interés

---

## 🎯 Criterios de Aceptación

### ✅ Criterio 1: Búsqueda de eventos
- **Dado que** estoy en la página principal
- **Cuando** busco eventos por nombre, fecha o ubicación
- **Entonces** debo ver una lista de eventos que coincidan con mi búsqueda
- **Y** cada evento debe mostrar:
  - Nombre del evento
  - Fecha y hora
  - Ubicación
  - Imagen
  - Disponibilidad de entradas
  - Rango de precios

### ✅ Criterio 2: Ver detalles del evento
- **Dado que** veo la lista de eventos
- **Cuando** hago clic en un evento
- **Entonces** debo ver todos los detalles:
  - Información completa del evento
  - Tipos de entradas disponibles (VIP, General, Early Bird)
  - Precio de cada tipo
  - Cantidad disponible de cada tipo
  - Descripción del evento

### ✅ Criterio 3: Seleccionar entradas
- **Dado que** estoy viendo los detalles de un evento
- **Cuando** selecciono la cantidad y tipo de entradas que deseo
- **Entonces** debo ver el total a pagar
- **Y** debo poder agregar las entradas a mi carrito
- **Y** debo ver un resumen de mi selección

### ✅ Criterio 4: Reserva temporal (15 minutos)
- **Dado que** he agregado entradas a mi carrito
- **Cuando** procedo al checkout
- **Entonces** las entradas deben reservarse temporalmente por 15 minutos
- **Y** debo ver un contador regresivo visible
- **Y** debo recibir una advertencia cuando queden 2 minutos

### ✅ Criterio 5: Proceso de pago
- **Dado que** tengo entradas reservadas
- **Cuando** ingreso mis datos de pago (tarjeta de crédito/débito)
- **Entonces** el sistema debe procesar el pago de forma segura
- **Y** debo ver el desglose completo:
  - Subtotal
  - Cargos por servicio (5%)
  - Cargo por procesamiento ($5)
  - Total a pagar

### ✅ Criterio 6: Confirmación de compra
- **Dado que** mi pago fue exitoso
- **Cuando** se completa la transacción
- **Entonces** debo recibir:
  - Confirmación en pantalla
  - Email con los detalles de la compra
  - Códigos QR de mis entradas (uno por entrada)
  - PDF descargable con todas las entradas
- **Y** las entradas deben aparecer en "Mis Entradas"

### ✅ Criterio 7: Expiración de reserva
- **Dado que** tengo una reserva activa
- **Cuando** pasan 15 minutos sin completar el pago
- **Entonces** mi reserva debe cancelarse automáticamente
- **Y** las entradas deben volver a estar disponibles
- **Y** debo recibir una notificación de expiración

### ✅ Criterio 8: Disponibilidad en tiempo real
- **Dado que** estoy viendo un evento
- **Cuando** otro usuario compra entradas
- **Entonces** debo ver la disponibilidad actualizada automáticamente
- **Y** no debo necesitar recargar la página

---

## 💼 Valor de Negocio

- **Genera** ingresos directos por venta de entradas
- **Mejora** la experiencia del usuario con proceso simple y rápido
- **Reduce** la pérdida de ventas con reservas temporales
- **Aumenta** la confianza con disponibilidad en tiempo real
- **Previene** sobreventa de entradas

---

## 📊 Métricas de Éxito

- Tasa de conversión: % de usuarios que completan la compra
- Tiempo promedio de compra: < 3 minutos
- Tasa de abandono de carrito: < 30%
- Satisfacción del usuario: > 4.5/5

---

## 📝 Notas Adicionales

### Tipos de Entradas
- **VIP**: Acceso premium, mejores ubicaciones
- **General**: Acceso estándar
- **Early Bird**: Descuento por compra anticipada

### Límites
- Máximo 10 entradas por transacción
- Reserva temporal de 15 minutos
- No se permite modificar la compra después del pago

### Pagos
- Tarjetas de crédito/débito aceptadas
- Procesamiento seguro con encriptación
- Confirmación inmediata

---

## 🎨 Flujo Visual

```
[Buscar Eventos] 
    ↓
[Ver Lista de Eventos]
    ↓
[Seleccionar Evento]
    ↓
[Ver Detalles + Tipos de Entradas]
    ↓
[Seleccionar Cantidad y Tipo]
    ↓
[Agregar al Carrito]
    ↓
[Proceder al Checkout]
    ↓
[Reserva Temporal (15 min) ⏱️]
    ↓
[Ingresar Datos de Pago 💳]
    ↓
[Procesar Pago]
    ↓
[Confirmación + QR Codes 🎫]
    ↓
[Email de Confirmación 📧]
```

---

**Creado por**: Product Owner  
**Fecha**: Enero 2026  
**Última actualización**: Enero 2026
