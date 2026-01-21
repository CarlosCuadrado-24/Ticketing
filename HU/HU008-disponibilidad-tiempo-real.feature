# language: es

Característica: Disponibilidad de Tickets en Tiempo Real
  Como usuario del sistema
  Quiero ver la disponibilidad de tickets actualizada en tiempo real
  Para tomar decisiones de compra informadas

  Antecedentes:
    Dado que existe un evento "Concierto Rock 2026"
    Y el evento tiene los siguientes tickets:
      | type       | total | sold | reserved | available |
      | VIP        | 50    | 10   | 5        | 35        |
      | GENERAL    | 200   | 50   | 10       | 140       |
      | EARLY_BIRD | 100   | 80   | 5        | 15        |

  # CÁLCULO DE DISPONIBILIDAD
  Escenario: Calcular disponibilidad real correctamente
    Dado que estoy viendo los detalles del evento
    Entonces la disponibilidad mostrada debe calcularse como:
      """
      disponibilidad = totalQuantity - ticketsVendidos - reservasActivas
      """
    Y para VIP debe mostrar: 50 - 10 - 5 = 35
    Y para GENERAL debe mostrar: 200 - 50 - 10 = 140
    Y para EARLY_BIRD debe mostrar: 100 - 80 - 5 = 15

  Escenario: Disponibilidad NO se descuenta al crear reserva
    Dado que hay 35 tickets VIP disponibles
    Cuando un usuario crea una reserva de 2 tickets VIP
    Entonces la disponibilidad calculada debe ser: 50 - 10 - 7 = 33
    Pero el campo "availableQuantity" en BD debe seguir siendo 35
    Y otros usuarios deben ver 33 tickets disponibles

  Escenario: Disponibilidad SÍ se descuenta al completar compra
    Dado que hay 35 tickets VIP disponibles (availableQuantity = 35)
    Cuando un usuario completa la compra de 2 tickets VIP
    Entonces el campo "availableQuantity" debe actualizarse a 33
    Y la disponibilidad calculada debe ser: 50 - 12 - 5 = 33
    Y otros usuarios deben ver 33 tickets disponibles

  Escenario: Disponibilidad se recalcula al expirar reserva
    Dado que hay una reserva de 5 tickets VIP que está por expirar
    Y la disponibilidad actual es 30
    Cuando la reserva expira
    Entonces la disponibilidad calculada debe incrementarse a 35
    Pero el campo "availableQuantity" NO debe cambiar
    Y otros usuarios deben ver 35 tickets disponibles

  # WEBSOCKET - ACTUALIZACIONES EN TIEMPO REAL
  @websocket
  Escenario: Suscribirse a actualizaciones de evento
    Dado que estoy viendo los detalles de un evento
    Cuando la página carga
    Entonces debe establecerse una conexión WebSocket
    Y debe suscribirse al room "event:{eventId}"
    Y debe estar listo para recibir actualizaciones

  @websocket
  Escenario: Recibir actualización cuando otro usuario compra
    Dado que estoy viendo un evento con 35 tickets VIP disponibles
    Y tengo una conexión WebSocket activa
    Cuando otro usuario compra 2 tickets VIP
    Entonces debo recibir un evento "availabilityUpdate" vía WebSocket
    Y el evento debe contener:
      | campo             | valor |
      | eventId           | {id}  |
      | ticketType        | VIP   |
      | availableQuantity | 33    |
      | totalQuantity     | 50    |
      | timestamp         | {now} |
    Y la UI debe actualizarse automáticamente a 33
    Y NO debo recargar la página

  @websocket
  Escenario: Recibir actualización cuando expira una reserva
    Dado que estoy viendo un evento
    Y hay una reserva de 5 tickets que expira
    Cuando el scheduler marca la reserva como expirada
    Entonces debo recibir una actualización WebSocket
    Y la disponibilidad debe incrementarse automáticamente
    Y debo ver la nueva disponibilidad sin recargar

  @websocket
  Escenario: Múltiples usuarios ven la misma disponibilidad
    Dado que 3 usuarios están viendo el mismo evento
    Cuando un usuario compra 5 tickets GENERAL
    Entonces los 3 usuarios deben recibir la actualización
    Y todos deben ver la misma disponibilidad actualizada
    Y la actualización debe ocurrir en menos de 2 segundos

  @websocket
  Escenario: Reconexión automática de WebSocket
    Dado que tengo una conexión WebSocket activa
    Cuando pierdo la conexión temporalmente
    Entonces el sistema debe intentar reconectar automáticamente
    Y cuando se reconecte
    Entonces debe volver a suscribirse al evento
    Y debe solicitar la disponibilidad actual

  # INDICADORES VISUALES
  Escenario: Mostrar indicador de disponibilidad baja
    Dado que estoy viendo un evento
    Cuando un tipo de ticket tiene menos de 10 unidades disponibles
    Entonces debo ver un indicador "⚠️ Pocas unidades disponibles"
    Y el texto debe estar en color naranja

  Escenario: Mostrar indicador de agotado
    Dado que estoy viendo un evento
    Cuando un tipo de ticket tiene 0 unidades disponibles
    Entonces debo ver un indicador "❌ Agotado"
    Y el botón de compra debe estar deshabilitado
    Y el texto debe estar en color rojo

  Escenario: Mostrar indicador de alta disponibilidad
    Dado que estoy viendo un evento
    Cuando un tipo de ticket tiene más de 50 unidades disponibles
    Entonces debo ver un indicador "✅ Disponible"
    Y el texto debe estar en color verde

  # CACHE INVALIDATION
  Escenario: Invalidar cache después de compra
    Dado que la disponibilidad está en cache
    Cuando un usuario completa una compra
    Entonces el cache debe invalidarse
    Y la próxima consulta debe obtener datos frescos de la BD
    Y debe enviarse notificación WebSocket a todos los clientes

  Escenario: Cache de disponibilidad con TTL corto
    Dado que consulto la disponibilidad de un evento
    Entonces los datos deben cachearse por máximo 30 segundos
    Y después de 30 segundos debe recalcularse
    Y debe considerar reservas activas y tickets vendidos

  # CONCURRENCIA
  @concurrencia
  Escenario: Compras concurrentes de últimos tickets
    Dado que solo quedan 2 tickets VIP disponibles
    Y 3 usuarios intentan comprar 1 ticket cada uno simultáneamente
    Cuando los 3 procesan el pago al mismo tiempo
    Entonces solo 2 compras deben completarse exitosamente
    Y 1 usuario debe recibir error "Tickets no disponibles"
    Y la disponibilidad final debe ser 0
    Y NO debe haber overselling

  @concurrencia
  Escenario: Reservas concurrentes
    Dado que hay 10 tickets VIP disponibles
    Y 5 usuarios intentan reservar 3 tickets cada uno simultáneamente
    Cuando todos crean reservas al mismo tiempo
    Entonces solo deben crearse reservas hasta agotar disponibilidad
    Y algunos usuarios deben recibir error "Insuficientes tickets"
    Y la suma de reservas NO debe exceder la disponibilidad

  # PERFORMANCE
  @performance
  Escenario: Cálculo rápido de disponibilidad
    Dado que consulto la disponibilidad de un evento
    Entonces el cálculo debe completarse en menos de 100ms
    Y debe incluir:
      | cálculo                    |
      | Total de tickets           |
      | Tickets vendidos (PAID)    |
      | Tickets usados (USED)      |
      | Reservas activas (PENDING) |

  @performance
  Escenario: Broadcast eficiente de actualizaciones
    Dado que 100 usuarios están viendo el mismo evento
    Cuando ocurre una compra
    Entonces la actualización debe enviarse a todos en menos de 2 segundos
    Y debe usar rooms de Socket.io para eficiencia
    Y NO debe enviar mensajes individuales

  # EDGE CASES
  Escenario: Disponibilidad negativa no permitida
    Dado que hay 5 tickets disponibles
    Cuando intento comprar 10 tickets
    Entonces debo recibir un error "Insuficientes tickets disponibles"
    Y la compra NO debe procesarse
    Y la disponibilidad debe permanecer en 5

  Escenario: Reserva expira durante el checkout
    Dado que tengo una reserva activa con 1 minuto restante
    Y estoy en la página de checkout
    Cuando la reserva expira mientras ingreso datos de pago
    Entonces debo ver una notificación "Tu reserva ha expirado"
    Y el timer debe mostrar "00:00"
    Y debo ser redirigido a la página del evento
    Y debo poder crear una nueva reserva si hay disponibilidad

  Escenario: Múltiples tipos de tickets con diferentes disponibilidades
    Dado que estoy viendo un evento con 3 tipos de tickets
    Cuando VIP está agotado
    Y GENERAL tiene 50 disponibles
    Y EARLY_BIRD tiene 5 disponibles
    Entonces debo ver claramente el estado de cada tipo
    Y solo debo poder comprar GENERAL y EARLY_BIRD
    Y VIP debe mostrar "Agotado"

  Escenario: Actualización de disponibilidad después de cancelación
    Dado que un usuario cancela su compra de 3 tickets
    Cuando el administrador procesa la cancelación
    Entonces la disponibilidad debe incrementarse en 3
    Y debe enviarse actualización WebSocket
    Y otros usuarios deben ver la disponibilidad actualizada
