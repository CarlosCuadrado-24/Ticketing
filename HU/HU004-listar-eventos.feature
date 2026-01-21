# language: es

Característica: Listar y Buscar Eventos
  Como un usuario del sistema
  Quiero ver la lista de eventos disponibles
  Para poder seleccionar uno y comprar entradas

  Antecedentes:
    Dado que existen los siguientes eventos en el sistema:
      | name                  | date                | location          | status    |
      | Concierto Rock 2026   | 2026-06-15T20:00:00 | Estadio Nacional  | ACTIVE    |
      | Festival Jazz         | 2026-07-20T18:00:00 | Teatro Colón      | ACTIVE    |
      | Partido Fútbol        | 2026-05-10T15:00:00 | Estadio El Campín | ACTIVE    |
      | Evento Pasado         | 2023-01-01T20:00:00 | Centro Eventos    | COMPLETED |

  Escenario: Ver lista de eventos disponibles
    Dado que estoy en la página principal
    Cuando accedo a la sección de eventos
    Entonces debo ver una lista de eventos activos
    Y cada evento debe mostrar:
      | campo       |
      | nombre      |
      | fecha       |
      | ubicación   |
      | imagen      |
      | disponibilidad |
    Y los eventos deben estar ordenados por fecha ascendente

  Escenario: Ver eventos sin autenticación
    Dado que NO estoy autenticado
    Cuando visito la página de eventos
    Entonces debo poder ver todos los eventos disponibles
    Y debo poder ver los detalles de cada evento
    Pero debo ver un botón "Iniciar sesión para comprar"

  Escenario: Ver disponibilidad en tiempo real
    Dado que estoy viendo la lista de eventos
    Y otro usuario compra tickets del "Concierto Rock 2026"
    Cuando la disponibilidad cambia
    Entonces debo ver la disponibilidad actualizada automáticamente
    Y no debo recargar la página

  Escenario: Filtrar eventos por fecha
    Dado que estoy en la página de eventos
    Cuando aplico un filtro de fecha "Junio 2026"
    Entonces debo ver solo eventos de ese mes
    Y debo ver "Concierto Rock 2026"
    Y NO debo ver "Festival Jazz" ni "Partido Fútbol"

  Escenario: Buscar eventos por nombre
    Dado que estoy en la página de eventos
    Cuando ingreso "Rock" en el campo de búsqueda
    Entonces debo ver solo "Concierto Rock 2026"
    Y NO debo ver otros eventos

  Escenario: Buscar eventos por ubicación
    Dado que estoy en la página de eventos
    Cuando ingreso "Estadio" en el campo de búsqueda
    Entonces debo ver "Concierto Rock 2026" y "Partido Fútbol"
    Y NO debo ver "Festival Jazz"

  Escenario: Ver eventos sin resultados
    Dado que estoy en la página de eventos
    Cuando busco "Evento Inexistente"
    Entonces debo ver un mensaje "No se encontraron eventos"
    Y debo ver una opción para limpiar los filtros

  Escenario: Ver detalles de un evento
    Dado que estoy viendo la lista de eventos
    Cuando hago clic en "Concierto Rock 2026"
    Entonces debo ser redirigido a la página de detalles del evento
    Y debo ver toda la información del evento:
      | campo              |
      | nombre             |
      | fecha y hora       |
      | ubicación          |
      | venue              |
      | imagen grande      |
      | tipos de tickets   |
      | precios            |
      | disponibilidad     |

  Escenario: Ver tipos de tickets disponibles en detalle
    Dado que estoy en la página de detalles de "Concierto Rock 2026"
    Entonces debo ver los siguientes tipos de tickets:
      | type       | price | available |
      | VIP        | $150  | 50        |
      | GENERAL    | $75   | 200       |
      | EARLY_BIRD | $60   | 100       |
    Y cada tipo debe mostrar su disponibilidad actual

  Escenario: Ver evento sin disponibilidad
    Dado que un evento tiene 0 tickets disponibles
    Cuando veo ese evento en la lista
    Entonces debe mostrar "Agotado"
    Y el botón de compra debe estar deshabilitado

  @websocket
  Escenario: Actualización en tiempo real de disponibilidad
    Dado que estoy viendo los detalles de un evento
    Y tengo una conexión WebSocket activa
    Cuando otro usuario compra 5 tickets VIP
    Entonces debo ver la disponibilidad actualizada de "50" a "45"
    Y la actualización debe ocurrir en menos de 2 segundos
    Y no debo recargar la página

  @performance
  Escenario: Carga rápida de lista de eventos
    Dado que existen 100 eventos en el sistema
    Cuando accedo a la página de eventos
    Entonces la lista debe cargarse en menos de 2 segundos
    Y las imágenes deben cargarse de forma lazy

  Escenario: Paginación de eventos
    Dado que existen más de 20 eventos
    Cuando accedo a la página de eventos
    Entonces debo ver 20 eventos por página
    Y debo ver controles de paginación
    Y debo poder navegar a la siguiente página

  Escenario: Ordenar eventos por fecha
    Dado que estoy en la página de eventos
    Cuando selecciono "Ordenar por fecha ascendente"
    Entonces los eventos deben mostrarse del más próximo al más lejano
    Y cuando selecciono "Ordenar por fecha descendente"
    Entonces los eventos deben mostrarse del más lejano al más próximo

  Escenario: Ordenar eventos por precio
    Dado que estoy en la página de eventos
    Cuando selecciono "Ordenar por precio"
    Entonces los eventos deben ordenarse por el precio mínimo de sus tickets
    Y debo ver primero los eventos más económicos
