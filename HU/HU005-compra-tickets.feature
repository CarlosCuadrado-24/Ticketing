# language: es

Característica: Compra de Tickets (Flujo Completo)
  Como un usuario autenticado
  Quiero comprar tickets para un evento
  Para poder asistir al evento

  Antecedentes:
    Dado que estoy autenticado como "BUYER"
    Y existe un evento "Concierto Rock 2026" con los siguientes tickets:
      | type       | price | available |
      | VIP        | 150   | 50        |
      | GENERAL    | 75    | 200       |
      | EARLY_BIRD | 60    | 100       |

  # FASE 1: SELECCIÓN DE TICKETS
  Escenario: Seleccionar tickets y agregar al carrito
    Dado que estoy en la página de detalles del evento
    Cuando selecciono 2 tickets "VIP"
    Y hago clic en "Agregar al carrito"
    Entonces debo ver los tickets en mi carrito
    Y el subtotal debe ser $300
    Y debo ver el botón "Proceder al checkout"

  Escenario: Seleccionar múltiples tipos de tickets
    Dado que estoy en la página de detalles del evento
    Cuando selecciono:
      | type       | quantity |
      | VIP        | 2        |
      | GENERAL    | 3        |
    Y hago clic en "Agregar al carrito"
    Entonces mi carrito debe contener 5 tickets
    Y el subtotal debe ser $525 (2*150 + 3*75)

  Escenario: Intento de seleccionar más tickets que los disponibles
    Dado que solo hay 50 tickets VIP disponibles
    Cuando intento seleccionar 51 tickets VIP
    Entonces debo ver un mensaje de error "Solo hay 50 tickets disponibles"
    Y el campo de cantidad debe limitarse a 50

  # FASE 2: CREAR RESERVA TEMPORAL
  Escenario: Crear reserva temporal al proceder al checkout
    Dado que tengo 2 tickets VIP en mi carrito
    Cuando hago clic en "Proceder al checkout"
    Entonces debe crearse una reserva temporal
    Y la reserva debe expirar en 15 minutos
    Y debo ver un timer de cuenta regresiva "14:59"
    Y debo ser redirigido a la página de checkout

  Escenario: Reserva temporal NO descuenta disponibilidad
    Dado que hay 50 tickets VIP disponibles
    Cuando creo una reserva de 2 tickets VIP
    Entonces la disponibilidad mostrada debe seguir siendo 48
    Y otros usuarios deben ver 48 tickets disponibles
    Y la disponibilidad real debe calcularse como: total - vendidos - reservas activas

  Escenario: Timer de reserva visible durante checkout
    Dado que tengo una reserva activa
    Y estoy en la página de checkout
    Entonces debo ver un timer de cuenta regresiva
    Y el timer debe actualizarse cada segundo
    Y debe mostrar formato "MM:SS"

  # FASE 3: PROCESO DE PAGO
  Escenario: Completar pago exitosamente
    Dado que tengo una reserva activa de 2 tickets VIP
    Y estoy en la página de checkout
    Cuando ingreso los datos de pago:
      | cardNumber       | expiryDate | cvv |
      | 4111111111111111 | 12/26      | 123 |
    Y hago clic en "Pagar"
    Entonces el pago debe procesarse exitosamente
    Y la disponibilidad debe descontarse de 50 a 48
    Y debo recibir 2 tickets con códigos QR únicos
    Y debo ser redirigido a la página de confirmación

  Escenario: Cálculo de fees y total
    Dado que tengo 2 tickets VIP ($150 cada uno) en mi carrito
    Cuando estoy en el checkout
    Entonces debo ver el siguiente desglose:
      | concepto        | monto  |
      | Subtotal        | $300   |
      | Service Fee 5%  | $15    |
      | Processing Fee  | $5     |
      | Total           | $320   |

  Escenario: Pago fallido
    Dado que tengo una reserva activa
    Cuando ingreso una tarjeta que termina en "0000"
    Y hago clic en "Pagar"
    Entonces debo ver un mensaje de error "Pago rechazado"
    Y mi reserva debe seguir activa
    Y debo poder intentar con otra tarjeta
    Y la disponibilidad NO debe descontarse

  Escenario: Validación de datos de tarjeta
    Dado que estoy en la página de checkout
    Cuando ingreso un número de tarjeta inválido "1234"
    Entonces debo ver un mensaje de error "Número de tarjeta inválido"
    Y el botón "Pagar" debe estar deshabilitado

  # FASE 4: EXPIRACIÓN DE RESERVA
  Escenario: Reserva expira después de 15 minutos
    Dado que tengo una reserva activa
    Cuando pasan 15 minutos sin completar el pago
    Entonces la reserva debe marcarse como "EXPIRED"
    Y debo ver un mensaje "Tu reserva ha expirado"
    Y debo ser redirigido a la página del evento
    Y la disponibilidad debe recalcularse automáticamente

  Escenario: Intento de pagar con reserva expirada
    Dado que mi reserva ha expirado
    Cuando intento procesar el pago
    Entonces debo recibir un error "Reserva expirada"
    Y debo ser redirigido a la página del evento
    Y debo poder crear una nueva reserva

  @scheduler
  Escenario: Scheduler libera reservas expiradas automáticamente
    Dado que existen 10 reservas que expiraron hace 1 minuto
    Cuando el scheduler ejecuta la tarea de limpieza
    Entonces todas las reservas expiradas deben marcarse como "EXPIRED"
    Y la disponibilidad debe recalcularse
    Y debe enviarse una notificación WebSocket de disponibilidad actualizada

  # FASE 5: CONFIRMACIÓN Y TICKETS
  Escenario: Ver confirmación de compra con tickets
    Dado que completé el pago exitosamente
    Cuando estoy en la página de confirmación
    Entonces debo ver:
      | elemento                    |
      | Mensaje "Compra exitosa"    |
      | Detalles del evento         |
      | Lista de tickets comprados  |
      | Códigos QR de cada ticket   |
      | Botón "Descargar tickets"   |
      | Botón "Ver mis tickets"     |

  Escenario: Cada ticket tiene código QR único
    Dado que compré 3 tickets
    Entonces cada ticket debe tener:
      | campo          |
      | Código único   |
      | QR token único |
      | Precio pagado  |
      | Tipo de ticket |
      | Estado "PAID"  |
    Y los 3 códigos QR deben ser diferentes

  @email
  Escenario: Recibir email de confirmación
    Dado que completé la compra de 2 tickets
    Entonces debo recibir un email de confirmación
    Y el email debe contener:
      | elemento                |
      | Detalles del evento     |
      | Lista de tickets        |
      | Códigos QR adjuntos     |
      | PDF con los tickets     |
      | Imágenes PNG de QR      |

  @websocket
  Escenario: Actualización de disponibilidad en tiempo real después de compra
    Dado que hay 50 tickets VIP disponibles
    Y otro usuario está viendo el evento
    Cuando compro 2 tickets VIP exitosamente
    Entonces el otro usuario debe ver la disponibilidad actualizada a 48
    Y la actualización debe ocurrir en menos de 2 segundos
    Y debe recibirse vía WebSocket

  @transaccion
  Escenario: Transacción atómica en compra
    Dado que estoy comprando 3 tickets
    Cuando el pago es exitoso
    Pero ocurre un error al generar el tercer QR
    Entonces toda la transacción debe revertirse
    Y el pago debe cancelarse
    Y la disponibilidad NO debe descontarse
    Y NO deben crearse tickets en la base de datos

  Escenario: Compra concurrente de últimos tickets
    Dado que solo queda 1 ticket VIP disponible
    Y dos usuarios intentan comprarlo simultáneamente
    Cuando ambos procesan el pago al mismo tiempo
    Entonces solo uno debe completar la compra exitosamente
    Y el otro debe recibir un error "Tickets no disponibles"
    Y la disponibilidad debe ser 0

  Escenario: Ver mis tickets comprados
    Dado que he comprado tickets
    Cuando navego a "Mis Tickets"
    Entonces debo ver todos mis tickets comprados
    Y cada ticket debe mostrar:
      | campo           |
      | Nombre evento   |
      | Fecha evento    |
      | Tipo de ticket  |
      | Código QR       |
      | Estado          |
    Y debo poder descargar cada ticket
