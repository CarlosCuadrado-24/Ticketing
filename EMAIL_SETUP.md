# 📧 Configuración del Sistema de Emails

## Estado Actual

✅ **Sistema de generación de tickets funcionando al 100%:**
- PDF profesionales generados (~107KB cada uno)
- PNG con códigos QR generados (~257KB cada uno)  
- Flujo de compra completado exitosamente
- Tickets guardados en base de datos con estado PAID

❌ **Envío de email bloqueado** por autenticación Gmail

---

## Soluciones por Entorno

### Opción 1: Mailtrap (Recomendado para Desarrollo)

**Ventajas:**
- Captura todos los emails sin enviarlos realmente
- Interfaz web para ver los emails enviados
- Sin riesgo de spam o bloqueos
- Gratis para desarrollo

**Pasos:**
1. Crear cuenta en [mailtrap.io](https://mailtrap.io/)
2. Ir a "Email Testing" → "Inboxes" → Obtener credenciales SMTP
3. Actualizar `docker-compose.yml`:

```yaml
SMTP_HOST: smtp.mailtrap.io
SMTP_PORT: 2525
SMTP_SECURE: false
SMTP_USER: tu_usuario_mailtrap
SMTP_PASSWORD: tu_password_mailtrap
FROM_EMAIL: noreply@ticketsales.com
```

4. Reiniciar backend:
```bash
docker-compose restart backend
```

5. Hacer compra de prueba y revisar emails en Mailtrap

---

### Opción 2: Gmail con App Password (Producción)

**IMPORTANTE:** Gmail bloqueó el acceso SMTP directo. Se requiere:

1. **Habilitar verificación en 2 pasos:**
   - Ir a [Google Account](https://myaccount.google.com/)
   - Seguridad → Verificación en 2 pasos → Activar

2. **Generar App Password:**
   - Ir a [App Passwords](https://myaccount.google.com/apppasswords)
   - Seleccionar app: "Mail"
   - Seleccionar dispositivo: "Other (custom name)" → "TicketSales"
   - Copiar la contraseña de 16 caracteres generada

3. **Actualizar `docker-compose.yml`:**
```yaml
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_SECURE: false
SMTP_USER: rapidoysabrosocol23@gmail.com
SMTP_PASSWORD: xxxx xxxx xxxx xxxx  # App Password de 16 caracteres
FROM_EMAIL: rapidoysabrosocol23@gmail.com
```

4. Reiniciar backend:
```bash
docker-compose restart backend
```

---

### Opción 3: SendGrid (Producción Escalable)

**Ventajas:**
- 100 emails/día gratis
- Alta deliverability
- Sin problemas de spam

**Pasos:**
1. Crear cuenta en [sendgrid.com](https://sendgrid.com/)
2. Crear API Key en "Settings" → "API Keys"
3. Actualizar `docker-compose.yml`:

```yaml
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_SECURE: false
SMTP_USER: apikey
SMTP_PASSWORD: SG.xxxxxxxxxxxxxxxxxxxxxxxx  # Tu API Key
FROM_EMAIL: noreply@tudominio.com
```

4. Reiniciar backend

---

## Verificación del Sistema

### Script de Prueba Completo

El script `test-purchase-flow.js` ya está creado y probado:

```bash
# Copiar script al contenedor
docker cp test-purchase-flow.js ticket-backend:/tmp/

# Ejecutar flujo completo
docker-compose exec -T backend node /tmp/test-purchase-flow.js
```

**Flujo que ejecuta:**
1. ✅ Login y obtención de JWT token (24h de validez)
2. ✅ Obtener lista de eventos disponibles
3. ✅ Comprar 2 tickets GENERAL
4. ✅ Generar códigos QR únicos
5. ✅ Guardar tickets como PAID
6. ✅ Generar PDF y PNG adjuntos
7. ⏳ Enviar email de confirmación (pendiente de configuración SMTP)

### Última Compra de Prueba

**Tickets generados:**
- `TKT-FELLG7` - QR: `42899e7b-2543-4fe1-bfb4-e3bc39c36a78`
- `TKT-Q71PR4` - QR: `1eb7eedb-54a3-4195-b104-781cf4867fd1`

**Evento:** Mitski – Noche Íntima en Bogotá (TICK0009-002)  
**Precio:** 62,000 COP por ticket  
**Comprador:** admin@ticketapp.com  
**Estado:** PAID ✅

---

## Logs de Email

### Ver logs del servicio de email:
```bash
docker-compose logs backend | Select-String -Pattern "EmailService" -Context 2
```

### Log esperado después de configurar SMTP:
```
[EmailService] ✅ Conexión SMTP verificada correctamente
[EmailService] 📄 PDF generado para ticket TKT-XXXXX
[EmailService] 🖼️ PNG generado para ticket TKT-XXXXX
[EmailService] ✅ Email de confirmación enviado exitosamente
```

---

## Troubleshooting

### Error: "Invalid login" (Gmail)
- ❌ **Causa:** Contraseña incorrecta o sin App Password
- ✅ **Solución:** Generar App Password (ver Opción 2)

### Error: "Connection timeout"
- ❌ **Causa:** Puerto bloqueado o host incorrecto
- ✅ **Solución:** Verificar SMTP_HOST y SMTP_PORT

### Error: "Self-signed certificate"
- ❌ **Causa:** SMTP_SECURE=true en puerto no SSL
- ✅ **Solución:** SMTP_SECURE=false para puerto 587

### Emails no llegan pero logs dicen "enviado"
- ❌ **Causa:** FROM_EMAIL no verificado
- ✅ **Solución:** Verificar dominio en SendGrid/Gmail

---

## Próximos Pasos

1. **Configurar SMTP** según tu entorno (Mailtrap/Gmail/SendGrid)
2. **Reiniciar backend:** `docker-compose restart backend`
3. **Ejecutar script de prueba** para validar flujo completo
4. **Verificar inbox** (Mailtrap, Gmail, etc.)
5. **Revisar logs** para confirmar envío exitoso

---

## Notas Técnicas

- **Archivos generados:** PDF + PNG con QR codes
- **Template:** Handlebars ubicado en `backend/src/templates/email/`
- **Adjuntos:** Configurables via `EMAIL_ATTACH_PDF` y `EMAIL_ATTACH_PNG`
- **From Name:** Configurable via `FROM_NAME` (actualmente "TicketSales")
- **Timezone:** Colombia (America/Bogota)

---

**Última actualización:** 2026-01-22  
**Estado del sistema:** ✅ Generación de tickets funcional | ⏳ SMTP pendiente de configuración
