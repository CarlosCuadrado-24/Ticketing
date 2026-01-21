# Historia de Usuario 004: Validar Entradas con QR

## 📋 Información General

| Campo | Valor |
|-------|-------|
| **ID** | HU-004 |
| **Título** | Validar entradas en el evento mediante código QR |
| **Prioridad** | Crítica |
| **Estimación** | 8 puntos |
| **Sprint** | 3 |
| **Estado** | ✅ Completado |

---

## 👤 Historia de Usuario

**Como** personal del evento (staff)  
**Quiero** escanear y validar códigos QR de las entradas  
**Para** controlar el acceso al evento y prevenir fraudes

---

## 🎯 Criterios de Aceptación

### ✅ Criterio 1: Acceso a la herramienta de escaneo
- **Dado que** soy personal del evento autenticado
- **Cuando** accedo a la aplicación
- **Entonces** debo ver la opción "Escanear QR"
- **Y** debo poder activar la cámara de mi dispositivo
- **Y** el sistema debe solicitar permisos de cámara

### ✅ Criterio 2: Escanear código QR válido
- **Dado que** tengo la cámara activa
- **Cuando** escaneo un código QR válido de una entrada
- **Entonces** el sistema debe:
  - Validar el código automáticamente
  - Mostrar mensaje "✅ Acceso Permitido" en verde
  - Mostrar detalles de la entrada:
    - Código de entrada
    - Tipo de entrada (VIP, General, etc.)
    - Nombre del comprador
    - Evento
  - Marcar la entrada como "Usada"
  - Registrar fecha y hora de validación
  - Emitir sonido de confirmación

### ✅ Criterio 3: Detectar entrada ya usada
- **Dado que** escaneo un código QR
- **Cuando** la entrada ya fue validada anteriormente
- **Entonces** el sistema debe:
  - Mostrar mensaje "❌ Entrada ya utilizada" en rojo
  - Mostrar cuándo fue usada (fecha y hora)
  - Mostrar quién la validó
  - Emitir sonido de alerta
  - NO permitir el acceso

### ✅ Criterio 4: Detectar código QR inválido
- **Dado que** escaneo un código QR
- **Cuando** el código no existe en el sistema
- **Entonces** el sistema debe:
  - Mostrar mensaje "❌ Código QR inválido" en rojo
  - Emitir sonido de alerta
  - Sugerir verificar con el comprador
  - NO permitir el acceso

### ✅ Criterio 5: Validación rápida y eficiente
- **Dado que** estoy validando entradas
- **Cuando** escaneo un código QR
- **Entonces** la validación debe completarse en menos de 2 segundos
- **Y** debo poder escanear el siguiente código inmediatamente
- **Y** no debe haber demoras entre escaneos

### ✅ Criterio 6: Historial de validaciones
- **Dado que** he validado varias entradas
- **Cuando** accedo al historial
- **Entonces** debo ver una lista de todas las validaciones realizadas
- **Y** cada entrada debe mostrar:
  - Código de entrada
  - Hora de validación
  - Estado (Permitido/Rechazado)
  - Tipo de entrada
- **Y** la lista debe estar ordenada por hora (más reciente primero)

### ✅ Criterio 7: Estadísticas en tiempo real
- **Dado que** estoy validando entradas
- **Cuando** accedo al panel de estadísticas
- **Entonces** debo ver:
  - Total de entradas vendidas
  - Entradas validadas hasta el momento
  - Entradas pendientes de validar
  - Porcentaje de asistencia
  - Gráfico de validaciones por hora
- **Y** las estadísticas deben actualizarse en tiempo real

### ✅ Criterio 8: Validación manual por código
- **Dado que** no puedo escanear el QR (código dañado, sin cámara, etc.)
- **Cuando** ingreso manualmente el código de entrada
- **Entonces** el sistema debe validar el código igual que con escaneo
- **Y** debe mostrar los mismos resultados y validaciones

---

## 💼 Valor de Negocio

- **Previene** el fraude y uso de entradas falsas
- **Agiliza** el proceso de ingreso al evento
- **Mejora** la experiencia del asistente con acceso rápido
- **Proporciona** control total sobre la asistencia
- **Genera** datos en tiempo real sobre la asistencia

---

## 📊 Métricas de Éxito

- Tiempo promedio de validación: < 2 segundos
- Tasa de validaciones exitosas: > 95%
- Intentos de fraude detectados: 100%
- Satisfacción del staff: > 4.5/5

---

## 📝 Notas Adicionales

### Permisos
- Solo usuarios con rol "Staff" pueden validar entradas
- Cada staff puede validar entradas de cualquier evento asignado
- Los administradores tienen acceso completo

### Seguridad
- Cada código QR es único e irrepetible
- Los códigos QR no pueden ser duplicados
- El sistema detecta intentos de uso múltiple
- Se registra quién validó cada entrada

### Dispositivos Compatibles
- Smartphones (iOS y Android)
- Tablets
- Laptops con cámara
- Cualquier dispositivo con navegador moderno

### Modo Offline
- En futuras versiones: validación offline con sincronización posterior
- Actualmente requiere conexión a internet

---

## 🎨 Flujo Visual

```
[Login como Staff]
    ↓
[Seleccionar "Escanear QR"]
    ↓
[Solicitar permiso de cámara]
    ↓
[Activar cámara]
    ↓
[Apuntar a código QR]
    ↓
[Detección automática]
    ↓
[Validar en servidor]
    ↓
┌─────────────┬──────────────┬─────────────┐
│   VÁLIDO    │   YA USADO   │  INVÁLIDO   │
│   ✅ Verde  │   ❌ Rojo    │  ❌ Rojo    │
│  Permitir   │   Denegar    │   Denegar   │
└─────────────┴──────────────┴─────────────┘
    ↓
[Registrar validación]
    ↓
[Listo para siguiente escaneo]
```

---

## 🔐 Seguridad

- Autenticación requerida (solo staff)
- Cada validación registrada con timestamp
- Auditoría completa de todas las validaciones
- Códigos QR únicos e irrepetibles
- Detección de intentos de fraude

---

## 📱 Experiencia de Usuario

### Feedback Visual
- ✅ Verde: Acceso permitido
- ❌ Rojo: Acceso denegado
- ⚠️ Amarillo: Advertencias

### Feedback Sonoro
- ✅ Sonido de confirmación (beep corto)
- ❌ Sonido de alerta (beep largo)

### Feedback Táctil
- Vibración en dispositivos móviles

---

**Creado por**: Product Owner  
**Fecha**: Enero 2026  
**Última actualización**: Enero 2026
