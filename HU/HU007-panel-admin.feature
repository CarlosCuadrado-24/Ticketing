# language: es

Característica: Panel de Administración
  Como administrador del sistema
  Quiero gestionar usuarios, eventos, tickets y ver reportes
  Para mantener el control del sistema

  Antecedentes:
    Dado que estoy autenticado como "ADMIN"
    Y tengo acceso al panel de administración

  # GESTIÓN DE USUARIOS
  Escenario: Ver lista de usuarios
    Dado que estoy en el panel de administración
    Cuando navego a la sección "Usuarios"
    Entonces debo ver una lista de todos los usuarios
    Y cada usuario debe mostrar:
      | campo      |
      | Email      |
      | Nombre     |
      | Rol        |
      | Estado     |
      | Fecha registro |
    Y debo poder filtrar por rol

  Escenario: Crear nuevo usuario
    Dado que estoy en la sección de usuarios
    Cuando hago clic en "Crear Usuario"
    Y ingreso los siguientes datos:
      | campo      | valor                |
      | email      | nuevo@example.com    |
      | password   | Password123!         |
      | firstName  | Nuevo                |
      | lastName   | Usuario              |
      | role       | ORGANIZER            |
    Y hago clic en "Guardar"
    Entonces el usuario debe crearse exitosamente
    Y debe aparecer en la lista de usuarios

  Escenario: Cambiar rol de usuario
    Dado que existe un usuario con rol "BUYER"
    Cuando cambio su rol a "ORGANIZER"
    Y confirmo el cambio
    Entonces el rol del usuario debe actualizarse
    Y el usuario debe tener los permisos de ORGANIZER

  Escenario: Desactivar usuario
    Dado que existe un usuario activo
    Cuando hago clic en "Desactivar"
    Y confirmo la acción
    Entonces el usuario debe marcarse como inactivo
    Y no debe poder iniciar sesión

  # GESTIÓN DE EVENTOS
  Escenario: Ver todos los eventos del sistema
    Dado que estoy en la sección "Eventos"
    Entonces debo ver todos los eventos creados
    Y debo poder filtrar por:
      | filtro       |
      | Estado       |
      | Fecha        |
      | Organizador  |
      | Ubicación    |

  Escenario: Editar evento existente
    Dado que existe un evento "Concierto Rock 2026"
    Cuando hago clic en "Editar"
    Y modifico el nombre a "Concierto Rock 2026 - Edición Especial"
    Y guardo los cambios
    Entonces el evento debe actualizarse
    Y los cambios deben reflejarse inmediatamente

  Escenario: Cancelar evento
    Dado que existe un evento activo
    Cuando hago clic en "Cancelar Evento"
    Y confirmo la cancelación
    Entonces el evento debe marcarse como "CANCELLED"
    Y debe enviarse notificación a todos los compradores
    Y debe iniciarse el proceso de reembolso

  Escenario: Ver estadísticas de evento
    Dado que estoy viendo un evento
    Cuando hago clic en "Estadísticas"
    Entonces debo ver:
      | métrica                  |
      | Tickets vendidos         |
      | Tickets disponibles      |
      | Ingresos totales         |
      | Ingresos por tipo        |
      | Tasa de conversión       |
      | Reservas activas         |
      | Reservas expiradas       |

  # GESTIÓN DE TICKETS
  Escenario: Ver todos los tickets del sistema
    Dado que estoy en la sección "Tickets"
    Entonces debo ver una lista de todos los tickets
    Y debo poder filtrar por:
      | filtro       |
      | Evento       |
      | Estado       |
      | Comprador    |
      | Fecha compra |
      | Tipo         |

  Escenario: Buscar ticket por código
    Dado que estoy en la sección de tickets
    Cuando busco el código "TKT-ABC123"
    Entonces debo ver los detalles completos del ticket
    Y debo ver el historial de cambios de estado

  Escenario: Cancelar ticket manualmente
    Dado que existe un ticket con estado "PAID"
    Cuando hago clic en "Cancelar Ticket"
    Y ingreso el motivo "Solicitud del cliente"
    Y confirmo la cancelación
    Entonces el ticket debe marcarse como "CANCELLED"
    Y la disponibilidad debe incrementarse
    Y debe registrarse el motivo de cancelación

  # GESTIÓN DE RESERVAS
  Escenario: Ver reservas activas
    Dado que estoy en la sección "Reservas"
    Cuando filtro por estado "PENDING"
    Entonces debo ver todas las reservas activas
    Y cada reserva debe mostrar:
      | campo              |
      | ID                 |
      | Evento             |
      | Comprador          |
      | Cantidad           |
      | Tiempo restante    |
      | Total              |

  Escenario: Ver reservas expiradas
    Dado que estoy en la sección "Reservas"
    Cuando filtro por estado "EXPIRED"
    Entonces debo ver todas las reservas que expiraron
    Y debo ver la fecha de expiración de cada una

  Escenario: Cancelar reserva manualmente
    Dado que existe una reserva activa
    Cuando hago clic en "Cancelar Reserva"
    Y confirmo la acción
    Entonces la reserva debe marcarse como "CANCELLED"
    Y la disponibilidad debe recalcularse

  # DASHBOARD Y REPORTES
  Escenario: Ver dashboard principal
    Dado que estoy en el panel de administración
    Cuando accedo al dashboard
    Entonces debo ver las siguientes métricas:
      | métrica                    |
      | Total de usuarios          |
      | Total de eventos           |
      | Tickets vendidos (total)   |
      | Ingresos totales           |
      | Eventos activos            |
      | Reservas activas           |
    Y debo ver gráficos de:
      | gráfico                    |
      | Ventas por día             |
      | Eventos más populares      |
      | Ingresos por mes           |
      | Distribución por tipo      |

  Escenario: Generar reporte de ventas
    Dado que estoy en la sección "Reportes"
    Cuando selecciono "Reporte de Ventas"
    Y selecciono el rango de fechas "01/01/2026 - 31/01/2026"
    Y hago clic en "Generar"
    Entonces debo ver un reporte con:
      | dato                       |
      | Total de ventas            |
      | Número de transacciones    |
      | Ticket promedio            |
      | Ventas por evento          |
      | Ventas por tipo de ticket  |
    Y debo poder exportar el reporte en PDF o Excel

  Escenario: Generar reporte de eventos
    Dado que estoy en la sección "Reportes"
    Cuando selecciono "Reporte de Eventos"
    Entonces debo ver:
      | métrica                    |
      | Eventos creados            |
      | Eventos completados        |
      | Eventos cancelados         |
      | Tasa de ocupación promedio |
      | Evento más vendido         |

  @seguridad
  Escenario: Solo ADMIN puede acceder al panel
    Dado que estoy autenticado como "BUYER"
    Cuando intento acceder al panel de administración
    Entonces debo recibir un error 403 "Acceso denegado"
    Y debo ser redirigido a la página principal

  @seguridad
  Escenario: Solo ADMIN puede acceder como "ORGANIZER"
    Dado que estoy autenticado como "ORGANIZER"
    Cuando intento acceder a la sección de usuarios
    Entonces debo recibir un error 403 "Acceso denegado"
    Pero debo poder acceder a mis propios eventos

  @auditoria
  Escenario: Registrar acciones de administrador
    Dado que estoy realizando acciones administrativas
    Cuando cambio el rol de un usuario
    O cancelo un evento
    O cancelo un ticket
    Entonces cada acción debe registrarse en el log de auditoría
    Y el log debe incluir:
      | campo              |
      | Usuario admin      |
      | Acción realizada   |
      | Fecha y hora       |
      | Entidad afectada   |
      | Valores anteriores |
      | Valores nuevos     |

  Escenario: Ver log de auditoría
    Dado que estoy en la sección "Auditoría"
    Entonces debo ver un historial de todas las acciones administrativas
    Y debo poder filtrar por:
      | filtro         |
      | Usuario        |
      | Tipo de acción |
      | Fecha          |
      | Entidad        |

  @performance
  Escenario: Dashboard carga rápidamente
    Dado que existen 1000 eventos y 10000 tickets en el sistema
    Cuando accedo al dashboard
    Entonces debe cargarse en menos de 3 segundos
    Y las métricas deben calcularse eficientemente

  Escenario: Exportar datos de usuarios
    Dado que estoy en la sección de usuarios
    Cuando hago clic en "Exportar"
    Y selecciono formato "CSV"
    Entonces debe descargarse un archivo CSV
    Y debe contener todos los usuarios con sus datos

  Escenario: Búsqueda global en el panel
    Dado que estoy en el panel de administración
    Cuando uso la búsqueda global con "Rock"
    Entonces debo ver resultados de:
      | tipo       |
      | Eventos    |
      | Usuarios   |
      | Tickets    |
    Y debo poder navegar a cada resultado
