# Especificaciones de Mockups - Sistema de Venta de Entradas

Este documento describe la estructura y componentes de cada vista del sistema. **NO incluye especificaciones de diseño visual** - solo estructura, secciones y funcionalidad.

---

## 1. LISTA DE EVENTOS (Event List / Browse Events)

### Estructura Principal
- **Header**: Barra de navegación superior fija
  - Logo del sistema (izquierda)
  - Menú de navegación: "Eventos", "Mis Tickets", "Perfil"
  - Botones: "Iniciar Sesión" / "Registrarse" (si no está autenticado)
  - Botón: "Crear Evento" (si es organizador/admin)
  - Avatar/nombre de usuario (si está autenticado)

### Hero Section
- Título principal
- Subtítulo descriptivo
- Barra de búsqueda con campo de texto
- Filtros rápidos (opcional): Categoría, Fecha, Ubicación

### Sección de Eventos
- Grid de tarjetas de eventos (responsive: 1 columna móvil, 2-3 columnas tablet, 3-4 columnas desktop)
- Cada tarjeta contiene:
  - Imagen del evento (proporción 16:9)
  - Categoría/badge del evento
  - Título del evento
  - Fecha y hora
  - Ubicación/venue
  - Precio desde (el más bajo disponible)
  - Indicador de disponibilidad (número de tickets disponibles o "Agotado")
  - Botón "Ver Detalles"

### Filtros Laterales (opcional)
- Panel lateral izquierdo o desplegable en móvil
- Filtros por:
  - Categoría (checkboxes)
  - Rango de fechas (date picker)
  - Rango de precios (slider)
  - Ubicación (dropdown o autocomplete)
  - Botón "Aplicar Filtros"
  - Botón "Limpiar Filtros"

### Estados
- Estado vacío: Mensaje cuando no hay eventos
- Estado de carga: Skeleton loaders en las tarjetas
- Paginación o scroll infinito

---

## 2. DETALLE DE EVENTO (Event Details & Tickets)

### Header Hero
- Imagen grande del evento (full width, altura 400-600px)
- Overlay oscuro sobre la imagen
- Sobre la imagen:
  - Badge de verificación/categoría
  - Título del evento
  - Fecha, hora e icono de calendario
  - Ubicación e icono de ubicación
  - Botón "Compartir"

### Layout de 2 Columnas

#### Columna Izquierda (8/12 o 2/3 del ancho)

**Información del Organizador**
- Avatar del organizador
- Nombre del organizador
- Badge de verificación (si aplica)
- Botón "Seguir"

**Descripción del Evento**
- Título de sección "Acerca del Evento"
- Texto descriptivo (múltiples párrafos)
- Posibilidad de expandir/colapsar si es muy largo

**Detalles del Evento**
- Grid de información (2 columnas en desktop):
  - Fecha y hora completa
  - Duración
  - Ubicación detallada
  - Dirección completa
  - Enlace "Ver en mapa"
  - Categoría
  - Idioma
  - Edad mínima (si aplica)

**Mapa de Ubicación**
- Contenedor de mapa (puede ser imagen estática o iframe)
- Botón "Obtener Direcciones"

**Tags/Etiquetas**
- Lista horizontal de tags del evento
- Cada tag como badge pequeño

#### Columna Derecha (4/12 o 1/3 del ancho, sticky)

**Tarjeta de Selección de Tickets**
- Header de la tarjeta:
  - Título "Seleccionar Tickets"
  - Texto informativo sobre precios

- Por cada tipo de ticket:
  - Nombre del tipo de ticket
  - Descripción breve
  - Precio
  - Badge de estado (si aplica): "Agotado", "Últimos disponibles", "Mejor valor"
  - Selector de cantidad (botones - y +)
  - Contador de cantidad seleccionada
  - Si está agotado: mostrar deshabilitado con ícono de candado

- Footer de la tarjeta:
  - Subtotal de tickets seleccionados
  - Total general
  - Botón principal "Continuar al Pago" / "Checkout"
  - Texto de seguridad ("Pago seguro con...")

**Tarjeta de Ayuda** (opcional)
- Título "¿Tienes preguntas?"
- Texto informativo
- Enlace "Contactar al Organizador"

---

## 3. PROCESO DE CHECKOUT (Checkout & Payment)

### Header Simple
- Logo
- Indicador de progreso (3 pasos):
  1. Información de Contacto
  2. Pago
  3. Confirmación

### Layout de 2 Columnas

#### Columna Izquierda (7/12)

**Paso 1: Información de Contacto**
- Título "Información de Contacto"
- Formulario:
  - Campo: Nombre
  - Campo: Apellido
  - Campo: Email
  - Campo: Teléfono
  - Checkbox: Enviar confirmación por SMS
  - Checkbox: Aceptar términos y condiciones
- Botón "Continuar"

**Paso 2: Información de Pago**
- Título "Información de Pago"
- Selector de método de pago (tabs o radio buttons):
  - Tarjeta de crédito/débito
  - PayPal (opcional)
  - Otros métodos
- Formulario de tarjeta:
  - Campo: Nombre en la tarjeta
  - Campo: Número de tarjeta
  - Campo: Fecha de expiración (MM/YY - 2 campos separados o 1 campo con formato)
  - Campo: CVV
  - Íconos de tarjetas aceptadas
- Mensaje de seguridad con ícono de candado
- Botones:
  - "Regresar"
  - "Confirmar Compra"

#### Columna Derecha (5/12, sticky)

**Resumen del Pedido**
- Título "Resumen del Pedido"
- Información del evento:
  - Imagen pequeña del evento
  - Nombre del evento
  - Fecha y hora
  - Ubicación

- Desglose de tickets:
  - Por cada tipo:
    - Nombre del ticket
    - Cantidad × Precio unitario
    - Subtotal

- Desglose de costos:
  - Subtotal
  - Impuestos
  - Cargo por servicio
  - Línea divisoria
  - **Total** (destacado)

**Temporizador de Reserva** (si aplica)
- Título "Tiempo restante"
- Contador regresivo (MM:SS)
- Mensaje "Tus tickets están reservados por X minutos"
- Barra de progreso visual

---

## 4. CONFIRMACIÓN DE COMPRA (Purchase Confirmation)

### Layout Centrado

**Sección de Éxito**
- Ícono de éxito (checkmark grande)
- Título "¡Compra Exitosa!"
- Mensaje de confirmación
- Número de orden

**Información del Pedido**
- Tarjeta con:
  - Imagen del evento
  - Nombre del evento
  - Fecha y hora
  - Ubicación
  - Nombre del comprador
  - Email de confirmación

**Desglose de Tickets**
- Lista de tickets comprados:
  - Por cada ticket:
    - Código único del ticket
    - Tipo de ticket
    - Nombre del titular
    - QR code (imagen generada)
    - Botón "Descargar Ticket" (individual)

**Resumen de Pago**
- Total pagado
- Método de pago usado
- Fecha de la transacción

**Acciones**
- Botón principal: "Descargar Todos los Tickets"
- Botón secundario: "Enviar por Email"
- Botón terciario: "Ver Mis Tickets"
- Enlace: "Volver a la página principal"

---

## 5. MIS TICKETS (My Tickets)

### Header de Página
- Título "Mis Tickets"
- Filtros rápidos:
  - "Próximos Eventos"
  - "Eventos Pasados"
  - "Todos"

### Lista de Eventos con Tickets
- Por cada evento (agrupado):
  - Tarjeta del evento:
    - Imagen del evento
    - Nombre del evento
    - Fecha y hora
    - Ubicación
    - Estado: "Próximo", "Hoy", "Finalizado", "Cancelado"
    - Número de tickets comprados
    - Botón "Ver Tickets"

### Vista Expandida de Tickets
- Al hacer clic en "Ver Tickets":
  - Lista de tickets individuales:
    - Código del ticket
    - Tipo de ticket
    - Estado: "Válido", "Usado", "Vencido"
    - QR code
    - Fecha de compra
    - Botón "Descargar"
    - Botón "Compartir"
    - Botón "Reenviar por Email"

### Estado Vacío
- Mensaje: "No tienes tickets aún"
- Ilustración
- Botón "Explorar Eventos"

---

## 6. DETALLE DE TICKET INDIVIDUAL (Individual Ticket Details)

### Layout Centrado (Mobile-First)

**Información del Evento**
- Imagen del evento
- Nombre del evento
- Fecha y hora
- Ubicación completa
- Enlace al mapa

**Información del Ticket**
- Código de ticket (grande y destacado)
- QR Code (grande, centrado)
- Tipo de ticket
- Precio pagado
- Nombre del titular
- Estado del ticket (badge)

**Detalles de la Compra**
- Fecha de compra
- Número de orden
- Método de pago

**Instrucciones**
- Sección "Cómo usar tu ticket":
  - Lista de instrucciones
  - Información sobre entrada
  - Políticas de reembolso

**Acciones**
- Botón: "Descargar Ticket (PDF)"
- Botón: "Agregar a Wallet"
- Botón: "Enviar por Email"
- Botón: "Reportar Problema"

---

## 7. CREAR/EDITAR EVENTO (Create/Edit Event)

### Header
- Título: "Crear Nuevo Evento" o "Editar Evento"
- Botón "Guardar Borrador"
- Botón "Cancelar"

### Formulario por Pasos/Secciones

**Paso 1: Información Básica**
- Campo: Nombre del evento (obligatorio)
- Campo: Descripción corta
- Editor de texto: Descripción completa (WYSIWYG)
- Selector: Categoría (dropdown)
- Upload: Imagen principal del evento
  - Vista previa de la imagen
  - Botón "Cambiar Imagen"
  - Especificaciones recomendadas

**Paso 2: Fecha y Ubicación**
- Date Picker: Fecha del evento
- Time Picker: Hora de inicio
- Time Picker: Hora de finalización
- Campo: Nombre del venue
- Campo: Dirección completa
- Campo: Ciudad
- Campo: País
- Selector de mapa (opcional): Pin de ubicación

**Paso 3: Configuración de Tickets**
- Botón: "Agregar Tipo de Ticket"
- Por cada tipo de ticket:
  - Campo: Nombre del tipo (ej: "VIP", "General")
  - Campo: Descripción
  - Campo: Precio
  - Selector: Moneda
  - Campo: Cantidad disponible
  - Campo: Cantidad mínima por compra
  - Campo: Cantidad máxima por compra
  - Toggle: ¿Es transferible?
  - Toggle: ¿Requiere nombre?
  - Botón: "Eliminar Tipo"

**Paso 4: Configuración Adicional**
- Campo: Edad mínima
- Campo: Idioma del evento
- Toggle: ¿Permitir lista de espera?
- Toggle: ¿Publicar inmediatamente?
- Date Picker: Fecha de publicación programada (si no es inmediato)
- Campo: Tags del evento (input con chips)
- Toggle: ¿Evento destacado? (solo admin)

**Paso 5: Vista Previa y Publicación**
- Vista previa del evento (como se verá en el detalle)
- Resumen de toda la información ingresada
- Botones:
  - "Regresar y Editar"
  - "Guardar como Borrador"
  - "Publicar Evento"

---

## 8. PANEL DE ORGANIZADOR (Event Organizer Dashboard)

### Sidebar de Navegación
- Menú vertical:
  - Dashboard / Resumen
  - Mis Eventos
  - Ventas y Reportes
  - Tickets Vendidos
  - Asistencia/Check-in
  - Configuración
  - Ayuda

### Vista Principal: Dashboard

**Tarjetas de Métricas** (Grid 2x2 o 4x1)
- Total de eventos activos
- Total de tickets vendidos (este mes)
- Ingresos totales (este mes)
- Próximo evento

**Gráficas**
- Gráfica de ventas por día (últimos 30 días)
- Gráfica de eventos más vendidos
- Gráfica de tipos de tickets más populares

**Tabla de Eventos Recientes**
- Columnas:
  - Nombre del evento
  - Fecha
  - Tickets vendidos / Total
  - Ingresos
  - Estado
  - Acciones (Ver, Editar, Eliminar)

**Lista de Tareas Pendientes**
- Eventos pendientes de publicación
- Eventos próximos que requieren atención
- Notificaciones importantes

---

## 9. GESTIÓN DE EVENTOS (Manage My Events)

### Filtros y Búsqueda
- Barra de búsqueda
- Filtros:
  - Estado: Todos, Publicados, Borradores, Finalizados, Cancelados
  - Fecha: Próximos, Pasados, Rango personalizado
  - Categoría

### Lista de Eventos
- Tabla responsive o lista de tarjetas:
  - Miniatura del evento
  - Nombre del evento
  - Fecha
  - Estado (badge)
  - Tickets vendidos / Total
  - Ingresos generados
  - Acciones:
    - Ver detalles
    - Editar
    - Ver estadísticas
    - Duplicar
    - Cancelar evento
    - Eliminar

### Acciones Masivas
- Checkbox para selección múltiple
- Dropdown de acciones masivas:
  - Publicar seleccionados
  - Despublicar seleccionados
  - Eliminar seleccionados

---

## 10. VALIDACIÓN DE TICKETS CON QR (QR Scanner / Ticket Validation)

### Vista de Scanner

**Área del Scanner**
- Visor de cámara (full screen o contenedor grande)
- Overlay con guías visuales (marco para centrar el QR)
- Mensaje instructivo: "Apunta la cámara al código QR del ticket"

**Controles**
- Botón: Cambiar cámara (frontal/trasera)
- Botón: Activar/desactivar linterna
- Botón: Cerrar scanner

**Sección de Búsqueda Manual** (fallback)
- Campo de texto: "Ingresar código de ticket manualmente"
- Botón: "Validar"

### Resultado de Validación

**Estado Exitoso**
- Ícono de éxito (checkmark verde grande)
- Mensaje: "Ticket Válido"
- Información del ticket:
  - Código del ticket
  - Tipo de ticket
  - Nombre del titular
  - Evento
  - Fecha y hora
  - Estado: "Entrada permitida"
- Botón: "Marcar como Usado"
- Botón: "Escanear Siguiente"

**Estado de Error**
- Ícono de error (X roja grande)
- Mensaje de error específico:
  - "Ticket ya usado" (mostrar fecha y hora de uso)
  - "Ticket inválido"
  - "Ticket para otro evento"
  - "Ticket vencido"
- Información disponible del ticket
- Botón: "Reintentar"
- Botón: "Escanear Siguiente"

---

## 11. REGISTRO E INICIO DE SESIÓN (User Registration & Login)

### Layout Centrado con Imagen de Fondo

**Formulario de Login**
- Logo del sistema
- Título "Iniciar Sesión"
- Campo: Email
- Campo: Contraseña
- Checkbox: "Recordarme"
- Enlace: "¿Olvidaste tu contraseña?"
- Botón: "Iniciar Sesión"
- Separador: "O continuar con"
- Botones de login social:
  - Continuar con Google
  - Continuar con Facebook
- Texto: "¿No tienes cuenta?" + Enlace "Regístrate"

**Formulario de Registro**
- Logo del sistema
- Título "Crear Cuenta"
- Campo: Nombre
- Campo: Apellido
- Campo: Email
- Campo: Contraseña
- Campo: Confirmar Contraseña
- Indicador de fortaleza de contraseña
- Checkbox: "Acepto los términos y condiciones"
- Checkbox: "Quiero recibir noticias y promociones"
- Botón: "Crear Cuenta"
- Separador: "O continuar con"
- Botones de registro social
- Texto: "¿Ya tienes cuenta?" + Enlace "Inicia Sesión"

**Recuperación de Contraseña**
- Título "Recuperar Contraseña"
- Texto instructivo
- Campo: Email
- Botón: "Enviar Enlace de Recuperación"
- Enlace: "Volver a Iniciar Sesión"

---

## 12. PERFIL DE USUARIO (User Profile Management)

### Sidebar de Navegación
- Avatar del usuario
- Nombre del usuario
- Email
- Menú:
  - Mi Perfil
  - Mis Tickets
  - Historial de Compras
  - Métodos de Pago
  - Preferencias
  - Seguridad
  - Cerrar Sesión

### Vista Principal: Mi Perfil

**Información Personal**
- Título "Información Personal"
- Avatar grande con botón "Cambiar Foto"
- Campo editable: Nombre
- Campo editable: Apellido
- Campo editable: Email (con verificación)
- Campo editable: Teléfono
- Campo editable: Fecha de nacimiento
- Botón: "Guardar Cambios"

**Dirección**
- Título "Dirección"
- Campo: Dirección
- Campo: Ciudad
- Campo: Estado/Provincia
- Campo: Código Postal
- Campo: País
- Botón: "Guardar Dirección"

**Preferencias de Notificaciones**
- Título "Notificaciones"
- Toggle: Notificaciones por email
- Toggle: Notificaciones por SMS
- Toggle: Ofertas y promociones
- Toggle: Recordatorios de eventos
- Botón: "Guardar Preferencias"

**Seguridad**
- Título "Seguridad"
- Botón: "Cambiar Contraseña"
- Botón: "Activar Autenticación de Dos Factores"
- Lista de sesiones activas
- Botón: "Cerrar Sesión en Todos los Dispositivos"

**Historial de Compras**
- Tabla con:
  - Fecha
  - Evento
  - Tickets comprados
  - Total pagado
  - Estado
  - Botón: "Ver Detalles"
- Paginación

---

## 13. PANEL DE ADMINISTRACIÓN (Admin Dashboard)

### Sidebar de Navegación
- Logo
- Menú principal:
  - Dashboard
  - Usuarios
  - Eventos
  - Tickets
  - Reservaciones
  - Reportes
  - Configuración
  - Logs del Sistema

### Vista Principal: Dashboard de Admin

**Métricas Generales** (Grid 4x1)
- Total de usuarios registrados
- Total de eventos activos
- Total de tickets vendidos (este mes)
- Ingresos totales (este mes)

**Gráficas**
- Gráfica de crecimiento de usuarios (últimos 6 meses)
- Gráfica de eventos creados por mes
- Gráfica de ingresos por categoría
- Gráfica de métodos de pago más usados

**Tablas de Datos**

**Usuarios Recientes**
- ID
- Nombre
- Email
- Rol
- Fecha de registro
- Estado
- Acciones

**Eventos Destacados**
- Evento
- Organizador
- Fecha
- Tickets vendidos
- Ingresos
- Estado
- Acciones

**Actividad Reciente**
- Timeline de eventos del sistema
- Filtro por tipo de actividad

---

## 14. GESTIÓN DE USUARIOS (Admin - User Management)

### Filtros y Búsqueda
- Barra de búsqueda
- Filtros:
  - Rol: Todos, Usuario, Organizador, Admin
  - Estado: Activo, Inactivo, Suspendido
  - Fecha de registro: Rango

### Tabla de Usuarios
- Columnas:
  - Avatar
  - Nombre completo
  - Email
  - Rol (editable con dropdown)
  - Eventos creados (si es organizador)
  - Tickets comprados
  - Fecha de registro
  - Estado (toggle activo/inactivo)
  - Acciones:
    - Ver perfil
    - Editar
    - Suspender/Reactivar
    - Eliminar
    - Enviar email

### Modal de Edición de Usuario
- Todos los campos del perfil (editables por admin)
- Selector de rol
- Toggle de estado
- Notas del admin (privadas)
- Botones: "Guardar", "Cancelar"

---

## 15. REPORTES Y ESTADÍSTICAS (Admin - Reports)

### Selector de Reportes
- Tabs o dropdown:
  - Reporte de Ventas
  - Reporte de Eventos
  - Reporte de Usuarios
  - Reporte Financiero

### Filtros Globales
- Rango de fechas
- Organizador específico (opcional)
- Categoría de eventos
- Botón: "Generar Reporte"
- Botón: "Exportar" (PDF, Excel, CSV)

### Visualización de Datos
- Gráficas interactivas
- Tablas con datos detallados
- Métricas clave destacadas
- Comparativas (mes actual vs anterior, año actual vs anterior)

---

## COMPONENTES COMPARTIDOS

### Header Global
- Logo (enlace a home)
- Navegación principal
- Búsqueda global (opcional)
- Notificaciones (campana con contador)
- Carrito de compras (si hay items)
- Avatar/menú de usuario

### Footer Global
- Logo
- Descripción breve
- Enlaces:
  - Acerca de
  - Contacto
  - Términos y Condiciones
  - Política de Privacidad
  - Ayuda/FAQ
- Redes sociales
- Selector de idioma
- Copyright

### Modales Comunes
- Confirmación de eliminación
- Mensaje de éxito
- Mensaje de error
- Loading spinner

### Componentes de Formulario
- Input de texto
- Input de email
- Input de número
- Textarea
- Select/Dropdown
- Date picker
- Time picker
- Checkbox
- Radio button
- Toggle switch
- File upload con drag & drop
- Mensajes de validación
- Botones (primario, secundario, terciario, destructivo)

---

## NOTAS FINALES

### Responsive Design
- Mobile First
- Breakpoints: móvil (< 768px), tablet (768px - 1024px), desktop (> 1024px)
- Navegación: hamburger menu en móvil, menú horizontal en desktop
- Grids: 1 columna en móvil, 2-3 en tablet, 3-4 en desktop

### Estados de UI
- Loading/Skeleton loaders para todas las vistas con carga de datos
- Estados vacíos con ilustración y mensaje
- Estados de error con mensaje y acción de reintento
- Estados de éxito con confirmación visual

### Accesibilidad
- Todos los campos de formulario con labels
- Botones con texto descriptivo o aria-labels
- Contraste adecuado
- Navegación por teclado
- Mensajes de error claros

### Iconos
- Usar icons consistentes (Material Icons, Font Awesome, o similar)
- Íconos comunes:
  - Calendar, Clock, Location
  - User, Users, Admin
  - Ticket, QR Code
  - Email, Phone
  - Edit, Delete, View
  - Upload, Download
  - Check, Close, Warning
  - Search, Filter, Sort
  - Menu, Settings, Logout
