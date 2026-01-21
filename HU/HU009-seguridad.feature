# language: es

Característica: Seguridad del Sistema
  Como sistema de ticketing
  Quiero implementar medidas de seguridad robustas
  Para proteger los datos de usuarios y prevenir ataques

  # AUTENTICACIÓN JWT
  @jwt
  Escenario: Generar token JWT al iniciar sesión
    Dado que un usuario inicia sesión exitosamente
    Entonces debe generarse un access token JWT
    Y debe generarse un refresh token JWT
    Y el access token debe expirar en 15 minutos
    Y el refresh token debe expirar en 7 días
    Y ambos tokens deben almacenarse en HttpOnly cookies

  @jwt
  Escenario: Validar token JWT en requests protegidos
    Dado que tengo un token JWT válido
    Cuando hago un request a un endpoint protegido
    Entonces el sistema debe validar el token
    Y debe extraer la información del usuario (id, email, role)
    Y debe permitir el acceso si el token es válido

  @jwt
  Escenario: Rechazar token JWT expirado
    Dado que mi access token ha expirado
    Cuando intento acceder a un endpoint protegido
    Entonces debo recibir un error 401 "Token expirado"
    Y debo usar mi refresh token para obtener un nuevo access token

  @jwt
  Escenario: Renovar access token con refresh token
    Dado que mi access token ha expirado
    Y tengo un refresh token válido
    Cuando envío el refresh token al endpoint /auth/refresh
    Entonces debo recibir un nuevo access token
    Y el nuevo token debe ser válido por 15 minutos
    Y mi sesión debe continuar activa

  @jwt
  Escenario: Rechazar token JWT manipulado
    Dado que tengo un token JWT
    Cuando modifico el payload del token manualmente
    Y intento usarlo en un request
    Entonces debo recibir un error 401 "Token inválido"
    Y el acceso debe ser denegado

  # AUTORIZACIÓN BASADA EN ROLES (RBAC)
  @rbac
  Escenario: ADMIN puede acceder a todas las funcionalidades
    Dado que estoy autenticado como "ADMIN"
    Entonces debo poder:
      | acción                      |
      | Ver panel de administración |
      | Gestionar usuarios          |
      | Gestionar eventos           |
      | Ver reportes                |
      | Cancelar tickets            |
      | Validar QR                  |

  @rbac
  Escenario: ORGANIZER puede gestionar sus eventos
    Dado que estoy autenticado como "ORGANIZER"
    Entonces debo poder:
      | acción                    |
      | Crear eventos             |
      | Editar mis eventos        |
      | Ver estadísticas          |
    Pero NO debo poder:
      | acción                    |
      | Gestionar usuarios        |
      | Editar eventos de otros   |
      | Acceder panel admin       |

  @rbac
  Escenario: BUYER solo puede comprar tickets
    Dado que estoy autenticado como "BUYER"
    Entonces debo poder:
      | acción                |
      | Ver eventos           |
      | Comprar tickets       |
      | Ver mis tickets       |
    Pero NO debo poder:
      | acción                |
      | Crear eventos         |
      | Validar QR            |
      | Acceder panel admin   |

  @rbac
  Escenario: STAFF solo puede validar tickets
    Dado que estoy autenticado como "STAFF"
    Entonces debo poder:
      | acción                |
      | Escanear QR           |
      | Validar tickets       |
      | Ver historial         |
    Pero NO debo poder:
      | acción                |
      | Comprar tickets       |
      | Crear eventos         |
      | Acceder panel admin   |

  # PROTECCIÓN CSRF
  @csrf
  Escenario: Obtener token CSRF antes de operaciones mutantes
    Dado que voy a realizar una operación POST, PUT o DELETE
    Cuando solicito un token CSRF en GET /api/csrf/token
    Entonces debo recibir un token CSRF válido
    Y debo incluirlo en el header "X-CSRF-Token" de mi request

  @csrf
  Escenario: Rechazar request sin token CSRF
    Dado que intento hacer un POST sin token CSRF
    Cuando envío el request
    Entonces debo recibir un error 403 "CSRF token missing"
    Y la operación NO debe ejecutarse

  @csrf
  Escenario: Rechazar request con token CSRF inválido
    Dado que intento hacer un POST con un token CSRF inválido
    Cuando envío el request
    Entonces debo recibir un error 403 "CSRF token invalid"
    Y la operación NO debe ejecutarse

  # RATE LIMITING
  @rate-limiting
  Escenario: Limitar requests por minuto
    Dado que la configuración es 10 requests por minuto
    Cuando hago 11 requests en 1 minuto
    Entonces los primeros 10 deben procesarse exitosamente
    Y el request 11 debe recibir error 429 "Too Many Requests"
    Y debo esperar hasta el siguiente minuto

  @rate-limiting
  Escenario: Rate limiting específico para registro
    Dado que el endpoint /auth/register tiene límite de 5 por hora
    Cuando intento registrarme 6 veces en 1 hora
    Entonces los primeros 5 intentos deben procesarse
    Y el intento 6 debe recibir error 429
    Y debo ver mensaje "Demasiados intentos, intente más tarde"

  @rate-limiting
  Escenario: Rate limiting específico para login
    Dado que el endpoint /auth/login tiene límite de 5 intentos fallidos
    Cuando fallo el login 6 veces consecutivas
    Entonces debo recibir error 429 "Cuenta bloqueada temporalmente"
    Y debo esperar 15 minutos antes de intentar nuevamente

  # HELMET - SECURITY HEADERS
  @helmet
  Escenario: Headers de seguridad en todas las responses
    Dado que hago un request a cualquier endpoint
    Entonces la response debe incluir los siguientes headers:
      | header                        | valor                              |
      | X-Frame-Options               | DENY                               |
      | X-Content-Type-Options        | nosniff                            |
      | Strict-Transport-Security     | max-age=31536000; includeSubDomains|
      | X-XSS-Protection              | 1; mode=block                      |
      | Referrer-Policy               | strict-origin-when-cross-origin    |

  @helmet
  Escenario: Content Security Policy configurado
    Dado que accedo a la aplicación
    Entonces debe haber un header Content-Security-Policy
    Y debe prevenir carga de scripts externos no autorizados
    Y debe prevenir inline scripts no seguros

  # PASSWORD HASHING
  @password
  Escenario: Contraseñas hasheadas con bcrypt
    Dado que un usuario se registra con password "Password123!"
    Cuando consulto la base de datos
    Entonces la contraseña debe estar hasheada con bcrypt
    Y debe tener un salt único
    Y NO debe ser visible en texto plano
    Y debe comenzar con "$2b$" (bcrypt identifier)

  @password
  Escenario: Validar contraseña con hash
    Dado que un usuario tiene password hasheado en BD
    Cuando intenta iniciar sesión con la contraseña correcta
    Entonces bcrypt.compare debe retornar true
    Y el login debe ser exitoso

  @password
  Escenario: Rechazar contraseña incorrecta
    Dado que un usuario tiene password hasheado en BD
    Cuando intenta iniciar sesión con contraseña incorrecta
    Entonces bcrypt.compare debe retornar false
    Y el login debe fallar con error "Credenciales inválidas"

  # HTTPS/SSL
  @ssl
  Escenario: Conexión HTTPS cuando hay certificados
    Dado que existen certificados SSL en backend/ssl/
    Cuando inicio el servidor
    Entonces debe activarse HTTPS
    Y debe usar los certificados cert.pem y key.pem
    Y debe mostrar mensaje "🔒 HTTPS enabled"

  @ssl
  Escenario: Fallback a HTTP sin certificados
    Dado que NO existen certificados SSL
    Cuando inicio el servidor
    Entonces debe usar HTTP
    Y debe mostrar mensaje "⚠️ HTTP only - HTTPS certificates not found"

  # CORS
  @cors
  Escenario: CORS configurado para orígenes específicos
    Dado que el frontend está en https://localhost:4200
    Cuando hace un request al backend
    Entonces debe permitirse por CORS
    Y debe incluir credentials: true

  @cors
  Escenario: CORS rechaza orígenes no autorizados
    Dado que un request viene de https://malicious-site.com
    Cuando intenta acceder al backend
    Entonces debe ser rechazado por CORS
    Y debe recibir error de CORS en el browser

  # VALIDACIÓN DE ENTRADA
  @validation
  Escenario: Validar DTOs con class-validator
    Dado que recibo un request con datos inválidos
    Cuando el DTO tiene decoradores de validación
    Entonces debe rechazarse automáticamente
    Y debe retornar errores de validación específicos
    Y NO debe ejecutarse el handler del endpoint

  @validation
  Escenario: Whitelist de propiedades en DTOs
    Dado que envío un request con propiedades extra no definidas en el DTO
    Cuando el ValidationPipe tiene whitelist: true
    Entonces las propiedades extra deben ser removidas
    Y solo deben procesarse las propiedades definidas

  @validation
  Escenario: Rechazar propiedades no permitidas
    Dado que envío un request con propiedades no definidas
    Cuando el ValidationPipe tiene forbidNonWhitelisted: true
    Entonces el request debe ser rechazado
    Y debe retornar error indicando las propiedades no permitidas

  # INYECCIÓN SQL
  @sql-injection
  Escenario: Prevenir inyección SQL con TypeORM
    Dado que un usuario intenta inyección SQL en un campo
    Cuando envía: email = "admin' OR '1'='1"
    Entonces TypeORM debe usar queries parametrizadas
    Y la inyección NO debe ejecutarse
    Y debe tratarse como un string literal

  # XSS PROTECTION
  @xss
  Escenario: Sanitizar entrada de usuario
    Dado que un usuario ingresa "<script>alert('XSS')</script>" en un campo
    Cuando se guarda en la base de datos
    Entonces debe sanitizarse o escaparse
    Y NO debe ejecutarse como script en el frontend

  # AUDITORÍA
  @auditoria
  Escenario: Registrar intentos de acceso no autorizado
    Dado que un usuario intenta acceder a un recurso sin permisos
    Cuando recibe error 403
    Entonces debe registrarse en el log:
      | campo              |
      | Usuario            |
      | Recurso intentado  |
      | Fecha y hora       |
      | IP address         |
      | User agent         |

  @auditoria
  Escenario: Registrar cambios en datos sensibles
    Dado que un admin modifica datos de un usuario
    Cuando guarda los cambios
    Entonces debe registrarse en el log de auditoría:
      | campo              |
      | Admin que modificó |
      | Usuario modificado |
      | Campos cambiados   |
      | Valores anteriores |
      | Valores nuevos     |
      | Fecha y hora       |

  # SESIONES
  @sesiones
  Escenario: Invalidar sesión al cerrar sesión
    Dado que tengo una sesión activa
    Cuando hago logout
    Entonces mis tokens deben invalidarse
    Y no debo poder usar el access token
    Y no debo poder usar el refresh token
    Y debo iniciar sesión nuevamente para acceder

  @sesiones
  Escenario: Sesiones concurrentes permitidas
    Dado que inicio sesión en el navegador Chrome
    Cuando inicio sesión en el navegador Firefox
    Entonces ambas sesiones deben estar activas
    Y cada una debe tener sus propios tokens
    Y cerrar sesión en una NO debe afectar la otra
