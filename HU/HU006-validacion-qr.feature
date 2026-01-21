# language: es

Característica: Validación de Tickets con QR
  Como personal del evento (STAFF)
  Quiero escanear y validar códigos QR de tickets
  Para controlar el acceso al evento

  Antecedentes:
    Dado que estoy autenticado como "STAFF"
    Y existe un evento "Concierto Rock 2026"
    Y existen los siguientes tickets:
      | code       | qrToken                              | status | buyerEmail          |
      | TKT-ABC123 | 550e8400-e29b-41d4-a716-446655440000 | PAID   | buyer@example.com   |
      | TKT-DEF456 | 550e8400-e29b-41d4-a716-446655440001 | USED   | buyer2@example.com  |
      | TKT-GHI789 | 550e8400-e29b-41d4-a716-446655440002 | PAID   | buyer3@example.com  |

  Escenario: Validar ticket exitosamente
    Dado que estoy en la página de escaneo QR
    Cuando escaneo el código QR "550e8400-e29b-41d4-a716-446655440000"
    Entonces el sistema debe validar el ticket
    Y debo ver un mensaje "✅ Acceso permitido"
    Y debo ver los detalles del ticket:
      | campo          | valor             |
      | Código         | TKT-ABC123        |
      | Tipo           | VIP               |
      | Comprador      | buyer@example.com |
      | Estado         | PAID → USED       |
    Y el ticket debe marcarse como "USED"
    Y debe registrarse la fecha y hora de uso

  Escenario: Intento de validar ticket ya usado
    Dado que estoy en la página de escaneo QR
    Cuando escaneo el código QR "550e8400-e29b-41d4-a716-446655440001"
    Entonces debo ver un mensaje de error "❌ Ticket ya utilizado"
    Y debo ver los detalles:
      | campo          | valor                |
      | Código         | TKT-DEF456           |
      | Estado         | USED                 |
      | Usado el       | 2026-06-15 19:30:00  |
    Y el ticket NO debe cambiar de estado
    Y debe sonar una alerta de error

  Escenario: Intento de validar QR inválido
    Dado que estoy en la página de escaneo QR
    Cuando escaneo un código QR que no existe "invalid-qr-code"
    Entonces debo ver un mensaje de error "❌ QR inválido"
    Y debe sonar una alerta de error
    Y no debe registrarse ninguna validación

  Escenario: Validar múltiples tickets consecutivamente
    Dado que estoy en la página de escaneo QR
    Cuando escaneo los siguientes códigos QR en secuencia:
      | qrToken                              | expectedResult |
      | 550e8400-e29b-41d4-a716-446655440000 | ✅ Permitido   |
      | 550e8400-e29b-41d4-a716-446655440002 | ✅ Permitido   |
      | 550e8400-e29b-41d4-a716-446655440001 | ❌ Ya usado    |
    Entonces debo ver los resultados correspondientes
    Y los tickets válidos deben marcarse como "USED"

  @camara
  Escenario: Activar cámara para escaneo
    Dado que estoy en la página de escaneo QR
    Cuando la página carga
    Entonces debe solicitarse permiso para usar la cámara
    Y cuando acepto el permiso
    Entonces la cámara debe activarse
    Y debe mostrarse el preview de video
    Y debe estar lista para escanear

  @camara
  Escenario: Denegar permiso de cámara
    Dado que estoy en la página de escaneo QR
    Cuando la página solicita permiso de cámara
    Y deniego el permiso
    Entonces debo ver un mensaje "Permiso de cámara requerido"
    Y debo ver instrucciones para habilitar la cámara
    Y no debe poder escanear códigos QR

  @camara
  Escenario: Escaneo automático al detectar QR
    Dado que tengo la cámara activa
    Cuando apunto la cámara a un código QR válido
    Entonces el sistema debe detectarlo automáticamente
    Y debe validar el ticket sin necesidad de hacer clic
    Y debe mostrar el resultado en menos de 2 segundos

  Escenario: Historial de validaciones
    Dado que he validado 5 tickets
    Cuando accedo al historial de validaciones
    Entonces debo ver una lista de todos los tickets validados
    Y cada entrada debe mostrar:
      | campo              |
      | Código del ticket  |
      | Hora de validación |
      | Estado             |
      | Comprador          |
    Y la lista debe estar ordenada por hora descendente

  @seguridad
  Escenario: Solo STAFF puede validar tickets
    Dado que estoy autenticado como "BUYER"
    Cuando intento acceder a la página de escaneo QR
    Entonces debo recibir un error 403 "Acceso denegado"
    Y debo ser redirigido a la página principal

  @seguridad
  Escenario: Validación requiere autenticación
    Dado que NO estoy autenticado
    Cuando intento acceder a la página de escaneo QR
    Entonces debo ser redirigido a la página de login
    Y después de autenticarme como STAFF
    Entonces debo poder acceder a la página de escaneo

  Escenario: Validar ticket de evento diferente
    Dado que estoy validando tickets para "Concierto Rock 2026"
    Cuando escaneo un ticket del evento "Festival Jazz"
    Entonces debo ver un mensaje de advertencia "⚠️ Ticket de otro evento"
    Y debo ver los detalles del evento correcto
    Y el ticket NO debe marcarse como usado
    Y debo poder confirmar si deseo validarlo de todas formas

  @offline
  Escenario: Modo offline para validación
    Dado que estoy en la página de escaneo QR
    Cuando pierdo la conexión a internet
    Entonces debo ver un mensaje "Modo offline activado"
    Y las validaciones deben guardarse localmente
    Y cuando recupero la conexión
    Entonces las validaciones deben sincronizarse con el servidor

  @performance
  Escenario: Validación rápida de tickets
    Dado que estoy escaneando tickets
    Cuando escaneo un código QR válido
    Entonces la validación debe completarse en menos de 1 segundo
    Y el resultado debe mostrarse inmediatamente
    Y debe estar listo para escanear el siguiente ticket

  Escenario: Estadísticas de validación en tiempo real
    Dado que estoy validando tickets
    Cuando accedo al panel de estadísticas
    Entonces debo ver:
      | métrica                    |
      | Total de tickets vendidos  |
      | Tickets validados          |
      | Tickets pendientes         |
      | Porcentaje de asistencia   |
      | Última validación          |
    Y las estadísticas deben actualizarse en tiempo real

  Escenario: Buscar ticket por código manualmente
    Dado que estoy en la página de validación
    Cuando ingreso manualmente el código "TKT-ABC123"
    Y hago clic en "Validar"
    Entonces el sistema debe buscar y validar el ticket
    Y debe mostrar el mismo resultado que al escanear el QR

  Escenario: Cancelar validación accidental
    Dado que acabo de validar un ticket por error
    Cuando hago clic en "Deshacer validación"
    Dentro de los primeros 30 segundos
    Entonces el ticket debe volver al estado "PAID"
    Y debe registrarse la cancelación en el log
    Y debe requerirse confirmación del STAFF
