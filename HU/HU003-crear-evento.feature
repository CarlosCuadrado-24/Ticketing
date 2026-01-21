# language: es

Característica: Creación de Evento
  Como un organizador o administrador
  Quiero crear eventos en el sistema
  Para que los usuarios puedan comprar entradas

  Antecedentes:
    Dado que estoy autenticado como "ORGANIZER" o "ADMIN"
    Y tengo permisos para crear eventos

  Escenario: Crear evento exitosamente con todos los datos
    Dado que estoy en la página de creación de eventos
    Cuando ingreso los siguientes datos del evento:
      | campo       | valor                           |
      | name        | Concierto Rock 2026             |
      | date        | 2026-06-15T20:00:00Z            |
      | location    | Estadio Nacional                |
      | venueName   | Estadio Nacional - Bogotá       |
    Y configuro los siguientes tipos de tickets:
      | type       | price | currency | quantity |
      | VIP        | 150   | USD      | 50       |
      | GENERAL    | 75    | USD      | 200      |
      | EARLY_BIRD | 60    | USD      | 100      |
    Y subo una imagen del evento "concierto.jpg"
    Y hago clic en "Crear Evento"
    Entonces debo ver un mensaje "Evento creado exitosamente"
    Y el evento debe aparecer en la lista de eventos
    Y la disponibilidad inicial debe ser:
      | type       | available |
      | VIP        | 50        |
      | GENERAL    | 200       |
      | EARLY_BIRD | 100       |

  Escenario: Crear evento sin imagen
    Dado que estoy en la página de creación de eventos
    Cuando ingreso todos los datos requeridos excepto la imagen
    Y hago clic en "Crear Evento"
    Entonces el evento debe crearse exitosamente
    Y debe tener una imagen por defecto

  Escenario: Intento de crear evento sin autenticación
    Dado que NO estoy autenticado
    Cuando intento acceder a la página de creación de eventos
    Entonces debo ser redirigido a la página de login
    Y debo ver un mensaje "Debe iniciar sesión"

  Escenario: Intento de crear evento como BUYER
    Dado que estoy autenticado como "BUYER"
    Cuando intento acceder a la página de creación de eventos
    Entonces debo recibir un error 403 "Acceso denegado"
    Y debo ser redirigido a la página principal

  Escenario: Crear evento con fecha pasada
    Dado que estoy en la página de creación de eventos
    Cuando ingreso una fecha en el pasado "2023-01-01T20:00:00Z"
    Y completo los demás campos requeridos
    Y hago clic en "Crear Evento"
    Entonces debo ver un mensaje de error "La fecha debe ser futura"
    Y el evento no debe ser creado

  Escenario: Crear evento sin configuración de tickets
    Dado que estoy en la página de creación de eventos
    Cuando ingreso todos los datos del evento
    Pero no configuro ningún tipo de ticket
    Y hago clic en "Crear Evento"
    Entonces debo ver un mensaje de error "Debe configurar al menos un tipo de ticket"
    Y el evento no debe ser creado

  Escenario: Crear evento con precio negativo
    Dado que estoy en la página de creación de eventos
    Cuando configuro un ticket con precio "-50"
    Entonces debo ver un mensaje de error "El precio debe ser mayor o igual a 0"
    Y el botón "Crear Evento" debe estar deshabilitado

  Escenario: Crear evento con cantidad de tickets inválida
    Dado que estoy en la página de creación de eventos
    Cuando configuro un ticket con cantidad "0" o negativa
    Entonces debo ver un mensaje de error "La cantidad debe ser mayor a 0"
    Y el botón "Crear Evento" debe estar deshabilitado

  @imagen
  Escenario: Subir imagen de evento con formato válido
    Dado que estoy creando un evento
    Cuando subo una imagen con formato "JPEG", "PNG" o "GIF"
    Y el tamaño es menor a 5MB
    Entonces la imagen debe ser aceptada
    Y debe subirse a MinIO storage
    Y debe generarse una URL pública

  @imagen
  Escenario: Intento de subir imagen con formato inválido
    Dado que estoy creando un evento
    Cuando intento subir una imagen con formato "PDF" o "TXT"
    Entonces debo ver un mensaje de error "Formato de imagen no válido"
    Y la imagen no debe ser subida

  @imagen
  Escenario: Intento de subir imagen muy grande
    Dado que estoy creando un evento
    Cuando intento subir una imagen mayor a 5MB
    Entonces debo ver un mensaje de error "La imagen no debe superar 5MB"
    Y la imagen no debe ser subida

  @transaccion
  Escenario: Creación de evento con transacción atómica
    Dado que estoy creando un evento con 3 tipos de tickets
    Cuando ocurre un error al crear el tercer tipo de ticket
    Entonces toda la transacción debe revertirse
    Y el evento no debe existir en la base de datos
    Y ningún tipo de ticket debe ser creado

  Escenario: Evento creado visible para todos los usuarios
    Dado que creo un evento exitosamente
    Cuando un usuario no autenticado visita la página de eventos
    Entonces debe poder ver el evento en la lista
    Y debe poder ver los detalles del evento
    Pero no debe poder comprarlo sin autenticarse
