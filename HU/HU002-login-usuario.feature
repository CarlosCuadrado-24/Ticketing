# language: es

Característica: Login de Usuario
  Como un usuario registrado
  Quiero iniciar sesión en el sistema
  Para acceder a las funcionalidades según mi rol

  Antecedentes:
    Dado que existe un usuario con los siguientes datos:
      | email               | password     | role      |
      | buyer@example.com   | Password123! | BUYER     |
      | admin@example.com   | Admin123!    | ADMIN     |
      | organizer@test.com  | Org123!      | ORGANIZER |

  Escenario: Login exitoso como comprador
    Dado que estoy en la página de login
    Cuando ingreso las credenciales:
      | email             | password     |
      | buyer@example.com | Password123! |
    Y hago clic en "Iniciar Sesión"
    Entonces debo ver un mensaje "Bienvenido"
    Y debo ser redirigido a la página principal
    Y debo tener un token JWT válido
    Y mi sesión debe estar activa

  Escenario: Login exitoso como administrador
    Dado que estoy en la página de login
    Cuando ingreso las credenciales:
      | email             | password  |
      | admin@example.com | Admin123! |
    Y hago clic en "Iniciar Sesión"
    Entonces debo ser redirigido al panel de administración
    Y debo tener acceso a funcionalidades de administrador

  Escenario: Login con credenciales incorrectas
    Dado que estoy en la página de login
    Cuando ingreso las credenciales:
      | email             | password        |
      | buyer@example.com | PasswordIncorrecta |
    Y hago clic en "Iniciar Sesión"
    Entonces debo ver un mensaje de error "Credenciales inválidas"
    Y no debo estar autenticado
    Y no debo tener un token JWT

  Escenario: Login con usuario inexistente
    Dado que estoy en la página de login
    Cuando ingreso las credenciales:
      | email                  | password     |
      | noexiste@example.com   | Password123! |
    Y hago clic en "Iniciar Sesión"
    Entonces debo ver un mensaje de error "Credenciales inválidas"
    Y no debo estar autenticado

  Escenario: Login con campos vacíos
    Dado que estoy en la página de login
    Cuando dejo los campos de email y password vacíos
    Y hago clic en "Iniciar Sesión"
    Entonces debo ver mensajes de error "Email requerido" y "Contraseña requerida"
    Y el botón "Iniciar Sesión" debe estar deshabilitado

  @seguridad
  Escenario: Protección contra ataques de fuerza bruta
    Dado que estoy en la página de login
    Cuando intento iniciar sesión 6 veces con credenciales incorrectas
    Entonces debo recibir un error "Cuenta bloqueada temporalmente"
    Y debo esperar 15 minutos antes de poder intentar nuevamente

  @seguridad
  Escenario: Token JWT con expiración
    Dado que inicio sesión exitosamente
    Cuando obtengo mi token JWT
    Entonces el token debe tener una expiración de 15 minutos
    Y debe incluir mi información de usuario (id, email, role)
    Y debe estar firmado con el secreto del servidor

  @seguridad
  Escenario: Refresh token para renovar sesión
    Dado que tengo una sesión activa
    Cuando mi access token expira después de 15 minutos
    Y uso mi refresh token
    Entonces debo recibir un nuevo access token válido
    Y mi sesión debe continuar activa

  Escenario: Logout exitoso
    Dado que estoy autenticado en el sistema
    Cuando hago clic en "Cerrar Sesión"
    Entonces mis tokens deben ser invalidados
    Y debo ser redirigido a la página de login
    Y no debo tener acceso a rutas protegidas

  Escenario: Restaurar checkout pendiente después de login
    Dado que tengo items en mi carrito sin autenticar
    Y navego a la página de checkout
    Cuando me solicita iniciar sesión
    Y inicio sesión exitosamente
    Entonces mi carrito debe mantener los items seleccionados
    Y debo ser redirigido de vuelta al checkout
