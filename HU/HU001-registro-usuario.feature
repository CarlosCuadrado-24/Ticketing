# language: es

Característica: Registro de Usuario (Buyer)
  Como un usuario nuevo
  Quiero registrarme en el sistema
  Para poder comprar entradas para eventos


  Escenario: Registro exitoso de usuario
    Dado que estoy en la página de registro
    Cuando ingreso los siguientes datos:
      | campo      | valor                    |
      | email      | usuario@example.com      |
      | password   | Password123!             |
      | firstName  | Juan                     |
      | lastName   | Pérez                    |
    Y hago clic en el botón "Registrarse"
    Entonces debo ver un mensaje de confirmación "Registro exitoso"
    Y debo ser redirigido a la página principal
    Y debo estar autenticado en el sistema
    Y mi rol debe ser "BUYER"

  Escenario: Intento de registro con email ya existente
    Dado que existe un usuario con email "usuario@example.com"
    Y estoy en la página de registro
    Cuando ingreso los siguientes datos:
      | campo      | valor                    |
      | email      | usuario@example.com      |
      | password   | Password123!             |
      | firstName  | María                    |
      | lastName   | García                   |
    Y hago clic en el botón "Registrarse"
    Entonces debo ver un mensaje de error "Email ya registrado"
    Y debo permanecer en la página de registro

  Escenario: Intento de registro con contraseña débil
    Dado que estoy en la página de registro
    Cuando ingreso los siguientes datos:
      | campo      | valor                    |
      | email      | nuevo@example.com        |
      | password   | 123                      |
      | firstName  | Pedro                    |
      | lastName   | López                    |
    Y hago clic en el botón "Registrarse"
    Entonces debo ver un mensaje de error "La contraseña debe tener al menos 8 caracteres"
    Y no debo ser registrado en el sistema

  Escenario: Intento de registro con email inválido
    Dado que estoy en la página de registro
    Cuando ingreso los siguientes datos:
      | campo      | valor                    |
      | email      | email-invalido           |
      | password   | Password123!             |
      | firstName  | Ana                      |
      | lastName   | Martínez                 |
    Y hago clic en el botón "Registrarse"
    Entonces debo ver un mensaje de error "Email inválido"
    Y el botón "Registrarse" debe estar deshabilitado

  Escenario: Registro con campos vacíos
    Dado que estoy en la página de registro
    Cuando dejo todos los campos vacíos
    Y hago clic en el botón "Registrarse"
    Entonces debo ver mensajes de error en todos los campos requeridos
    Y el botón "Registrarse" debe estar deshabilitado

  @seguridad
  Escenario: Protección contra ataques de fuerza bruta en registro
    Dado que estoy en la página de registro
    Cuando intento registrarme 6 veces en 1 minuto
    Entonces debo recibir un error "Demasiados intentos, intente más tarde"
    Y debo esperar 1 minuto antes de poder intentar nuevamente

  @seguridad
  Escenario: Contraseña hasheada en base de datos
    Dado que me registro exitosamente con password "Password123!"
    Cuando consulto la base de datos
    Entonces la contraseña debe estar hasheada con bcrypt
    Y no debe ser visible en texto plano
