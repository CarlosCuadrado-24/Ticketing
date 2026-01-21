# Historia de Usuario 003: Crear y Gestionar Eventos

## 📋 Información General

| Campo | Valor |
|-------|-------|
| **ID** | HU-003 |
| **Título** | Crear y gestionar eventos como organizador |
| **Prioridad** | Alta |
| **Estimación** | 8 puntos |
| **Sprint** | 2 |
| **Estado** | ✅ Completado |

---

## 👤 Historia de Usuario

**Como** organizador de eventos  
**Quiero** crear y gestionar mis eventos en la plataforma  
**Para** vender entradas y controlar la información del evento

---

## 🎯 Criterios de Aceptación

### ✅ Criterio 1: Crear nuevo evento
- **Dado que** soy un organizador autenticado
- **Cuando** accedo a "Crear Evento"
- **Entonces** debo poder ingresar:
  - Nombre del evento
  - Fecha y hora
  - Ubicación (dirección)
  - Nombre del venue/lugar
  - Descripción
  - Imagen del evento
- **Y** el formulario debe validar que todos los campos requeridos estén completos

### ✅ Criterio 2: Configurar tipos de entradas
- **Dado que** estoy creando un evento
- **Cuando** configuro los tipos de entradas
- **Entonces** debo poder definir para cada tipo:
  - Nombre del tipo (VIP, General, Early Bird, etc.)
  - Precio
  - Cantidad total disponible
  - Descripción (opcional)
- **Y** debo poder agregar múltiples tipos de entradas
- **Y** debo poder eliminar tipos antes de guardar

### ✅ Criterio 3: Subir imagen del evento
- **Dado que** estoy creando un evento
- **Cuando** subo una imagen
- **Entonces** el sistema debe:
  - Aceptar formatos: JPG, PNG, GIF
  - Validar tamaño máximo: 5MB
  - Mostrar preview de la imagen
  - Permitir cambiar la imagen antes de guardar
- **Y** si no subo imagen, debe usar una imagen por defecto

### ✅ Criterio 4: Validaciones de negocio
- **Dado que** estoy creando un evento
- **Cuando** intento guardar
- **Entonces** el sistema debe validar:
  - La fecha debe ser futura
  - Debe haber al menos un tipo de entrada
  - Los precios deben ser mayores o iguales a 0
  - Las cantidades deben ser mayores a 0
  - El nombre no debe estar vacío

### ✅ Criterio 5: Confirmación de creación
- **Dado que** he completado todos los datos correctamente
- **Cuando** guardo el evento
- **Entonces** debo recibir confirmación de creación exitosa
- **Y** el evento debe aparecer en mi lista de eventos
- **Y** el evento debe estar visible para los compradores
- **Y** la disponibilidad inicial debe ser igual a la cantidad configurada

### ✅ Criterio 6: Ver mis eventos
- **Dado que** soy un organizador
- **Cuando** accedo a "Mis Eventos"
- **Entonces** debo ver una lista de todos mis eventos creados
- **Y** cada evento debe mostrar:
  - Nombre
  - Fecha
  - Estado (Activo, Completado, Cancelado)
  - Entradas vendidas / Total
  - Ingresos generados

### ✅ Criterio 7: Editar evento existente
- **Dado que** tengo un evento creado
- **Cuando** selecciono "Editar"
- **Entonces** debo poder modificar:
  - Nombre
  - Descripción
  - Imagen
  - Fecha (solo si no hay entradas vendidas)
- **Y** NO debo poder modificar:
  - Tipos de entradas ya creados
  - Precios (si ya hay ventas)

### ✅ Criterio 8: Ver estadísticas del evento
- **Dado que** tengo un evento con ventas
- **Cuando** accedo a las estadísticas
- **Entonces** debo ver:
  - Total de entradas vendidas
  - Entradas disponibles
  - Ingresos totales
  - Ingresos por tipo de entrada
  - Gráfico de ventas por día
  - Tasa de ocupación (%)

---

## 💼 Valor de Negocio

- **Permite** a organizadores gestionar sus eventos de forma autónoma
- **Reduce** la carga administrativa del equipo
- **Aumenta** la cantidad de eventos en la plataforma
- **Mejora** la experiencia del organizador con herramientas completas
- **Genera** ingresos por comisiones de venta

---



## 📝 Notas Adicionales

### Permisos
- Solo usuarios con rol "Organizador" o "Administrador" pueden crear eventos
- Los organizadores solo pueden editar sus propios eventos
- Los administradores pueden editar cualquier evento

### Limitaciones
- No se puede eliminar un evento con entradas vendidas
- No se puede cambiar la fecha si hay entradas vendidas
- No se puede reducir la cantidad total de entradas por debajo de las vendidas

### Comisiones
- La plataforma cobra 5% de comisión por venta
- El organizador recibe el 95% de cada venta
- Los pagos se procesan semanalmente

---

## 🎨 Flujo Visual

```
[Login como Organizador]
    ↓
[Dashboard de Organizador]
    ↓
[Crear Nuevo Evento]
    ↓
[Formulario de Evento]
├── Datos básicos
├── Configurar tipos de entradas
└── Subir imagen
    ↓
[Validaciones]
    ↓
[Guardar Evento]
    ↓
[Evento Publicado ✅]
    ↓
[Visible para Compradores]
```

---

## 🔐 Seguridad

- Solo organizadores autenticados pueden crear eventos
- Validación de permisos en cada operación
- Imágenes validadas por tipo y tamaño
- Protección CSRF en formularios
- Rate limiting para prevenir spam

---

**Creado por**: Product Owner  
**Fecha**: Enero 2026  
**Última actualización**: Enero 2026
