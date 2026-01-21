import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { Ticket } from "../../domain/entities/ticket.entity";
import * as puppeteer from "puppeteer";
import * as QRCode from "qrcode";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SendTicketEmailParams {
  buyerEmail: string;
  buyerName?: string;
  tickets: Ticket[];
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventVenueName?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  eventImage?: string;
  attachments?: EmailAttachment[];
}

/**
 * EmailService
 * Servicio para envío de correos electrónicos con plantillas personalizadas
 * Configurado para usar Gmail SMTP
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;
  private templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = path.join(__dirname, "../../templates/email");
    this.initializeTransporter();
    this.registerHandlebarsHelpers();
  }

  /**
   * Inicializa el transportador de nodemailer con configuración de Gmail
   */
  private initializeTransporter(): void {
    const smtpConfig = {
      service: "gmail", // Usar servicio predefinido de Gmail
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASSWORD"),
      },
    };

    console.log(
      "📧 [EmailService] Inicializando transporter con configuración:",
    );
    console.log("- Service: gmail");
    console.log("- User:", smtpConfig.auth.user);
    console.log(
      "- Pass:",
      smtpConfig.auth.pass ? "***configurada***" : "NO CONFIGURADA",
    );

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verificar conexión al inicializar
    this.verifyConnection();
  }

  /**
   * Verifica la conexión SMTP
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log("✅ Conexión SMTP verificada correctamente");
    } catch (error) {
      this.logger.error("❌ Error al verificar conexión SMTP:", error);
    }
  }

  /**
   * Genera un código QR usando la librería qrcode
   */
  private async generateQRCode(data: string): Promise<Buffer> {
    try {
      const qrBuffer = await QRCode.toBuffer(data, {
        type: "png",
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Convertir Uint8Array a Buffer si es necesario
      return Buffer.from(qrBuffer);
    } catch (error) {
      this.logger.error("Error generando QR code:", error);
      throw error;
    }
  }

  /**
   * Genera el HTML del ticket para usar en PDF y PNG
   */
  private generateTicketHTML(
    ticket: Ticket,
    eventName: string,
    eventDate: string,
    eventLocation: string,
    eventVenueName?: string,
    eventStartTime?: string,
    eventEndTime?: string,
    qrBase64?: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket - ${ticket.code}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .ticket-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            width: 600px;
            max-width: 100%;
          }
          
          .ticket-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
          }
          
          .ticket-header::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
          }
          
          .ticket-title {
            font-size: 28px;
            font-weight: 300;
            margin-bottom: 10px;
          }
          
          .ticket-subtitle {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .ticket-body {
            padding: 40px 30px;
          }
          
          .event-info {
            margin-bottom: 30px;
          }
          
          .event-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
          }
          
          .event-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .event-detail {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .detail-icon {
            font-size: 24px;
            margin-bottom: 8px;
            color: #667eea;
          }
          
          .detail-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .detail-value {
            font-size: 16px;
            color: #2c3e50;
            font-weight: 600;
          }
          
          .ticket-info {
            border-top: 2px dashed #e0e0e0;
            padding-top: 30px;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 30px;
            align-items: center;
          }
          
          .ticket-details {
            display: grid;
            gap: 15px;
          }
          
          .ticket-detail {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .ticket-label {
            font-size: 14px;
            color: #7f8c8d;
            font-weight: 600;
          }
          
          .ticket-value {
            font-size: 16px;
            color: #2c3e50;
            font-weight: bold;
          }
          
          .ticket-code {
            font-family: 'Courier New', monospace;
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 6px;
            border: 2px solid #e9ecef;
          }
          
          .ticket-type {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .qr-section {
            text-align: center;
          }
          
          .qr-code {
            width: 150px;
            height: 150px;
            border: 3px solid #e9ecef;
            border-radius: 12px;
            margin-bottom: 10px;
          }
          
          .qr-instructions {
            font-size: 12px;
            color: #7f8c8d;
            max-width: 150px;
            line-height: 1.4;
          }
          
          .ticket-footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .footer-text {
            font-size: 12px;
            color: #6c757d;
            line-height: 1.5;
          }
          
          .status-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="ticket-header">
            <div class="status-badge">✓ CONFIRMADO</div>
            <div class="ticket-title">ENTRADA DIGITAL</div>
            <div class="ticket-subtitle">Ticket Electrónico</div>
          </div>
          
          <div class="ticket-body">
            <div class="event-info">
              <div class="event-name">${eventName}</div>
              
              <div class="event-details">
                <div class="event-detail">
                  <div class="detail-icon">📅</div>
                  <div class="detail-label">Fecha</div>
                  <div class="detail-value">${new Date(
                    eventDate,
                  ).toLocaleDateString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}</div>
                </div>
                
                ${
                  eventStartTime
                    ? `
                <div class="event-detail">
                  <div class="detail-icon">🕐</div>
                  <div class="detail-label">Hora</div>
                  <div class="detail-value">${eventStartTime}${eventEndTime ? ` - ${eventEndTime}` : ""}</div>
                </div>
                `
                    : ""
                }
                
                <div class="event-detail">
                  <div class="detail-icon">📍</div>
                  <div class="detail-label">Ubicación</div>
                  <div class="detail-value">${eventLocation}</div>
                </div>
                
                ${
                  eventVenueName
                    ? `
                <div class="event-detail">
                  <div class="detail-icon">🏢</div>
                  <div class="detail-label">Venue</div>
                  <div class="detail-value">${eventVenueName}</div>
                </div>
                `
                    : ""
                }
              </div>
            </div>
            
            <div class="ticket-info">
              <div class="ticket-details">
                <div class="ticket-detail">
                  <span class="ticket-label">Código de Ticket:</span>
                  <span class="ticket-value ticket-code">${ticket.code}</span>
                </div>
                
                <div class="ticket-detail">
                  <span class="ticket-label">Tipo:</span>
                  <span class="ticket-type">${ticket.type}</span>
                </div>
                
                <div class="ticket-detail">
                  <span class="ticket-label">Precio:</span>
                  <span class="ticket-value">${ticket.price.amount.toLocaleString("es-ES")} ${ticket.price.currency}</span>
                </div>
                
                <div class="ticket-detail">
                  <span class="ticket-label">Fecha de Compra:</span>
                  <span class="ticket-value">${ticket.purchaseDate.toLocaleDateString("es-ES")}</span>
                </div>
              </div>
              
              <div class="qr-section">
                <img src="${qrBase64}" alt="Código QR" class="qr-code">
                <div class="qr-instructions">
                  Presenta este código en la entrada del evento
                </div>
              </div>
            </div>
          </div>
          
          <div class="ticket-footer">
            <div class="footer-text">
              <strong>${this.configService.get<string>("COMPANY_NAME", "TicketSales")}</strong><br>
              Este ticket es válido para un ingreso único al evento<br>
              Soporte: ${this.configService.get<string>("SUPPORT_EMAIL", "soporte@ticketsales.com")}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera un PDF profesional del ticket usando Puppeteer
   */
  private async generateTicketPDF(
    ticket: Ticket,
    eventName: string,
    eventDate: string,
    eventLocation: string,
    eventVenueName?: string,
    eventStartTime?: string,
    eventEndTime?: string,
  ): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      // Generar QR code
      const qrBuffer = await this.generateQRCode(ticket.qrToken);
      const qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;

      // Crear HTML del ticket
      const ticketHTML = this.generateTicketHTML(
        ticket,
        eventName,
        eventDate,
        eventLocation,
        eventVenueName,
        eventStartTime,
        eventEndTime,
        qrBase64,
      );

      // Inicializar Puppeteer con configuración más robusta
      browser = await puppeteer.launch({
        headless: true,
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-ipc-flooding-protection",
          "--memory-pressure-off",
        ],
        ignoreDefaultArgs: ["--disable-extensions"],
        timeout: 60000,
      });

      const page = await browser.newPage();

      // Configurar el viewport
      await page.setViewport({ width: 800, height: 1200 });

      // Cargar el HTML con timeout más largo
      await page.setContent(ticketHTML, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Generar PDF con timeout
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
        timeout: 30000,
      });

      // Convertir Uint8Array a Buffer si es necesario
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error("Error generando PDF profesional:", error);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.warn("Error cerrando navegador PDF:", closeError);
        }
      }
    }
  }

  /**
   * Genera una imagen PNG del ticket usando Puppeteer
   */
  private async generateTicketPNG(
    ticket: Ticket,
    eventName: string,
    eventDate: string,
    eventLocation: string,
    eventVenueName?: string,
    eventStartTime?: string,
    eventEndTime?: string,
  ): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      // Generar QR code
      const qrBuffer = await this.generateQRCode(ticket.qrToken);
      const qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;

      // Crear HTML del ticket
      const ticketHTML = this.generateTicketHTML(
        ticket,
        eventName,
        eventDate,
        eventLocation,
        eventVenueName,
        eventStartTime,
        eventEndTime,
        qrBase64,
      );

      // Inicializar Puppeteer con configuración más robusta
      browser = await puppeteer.launch({
        headless: true,
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-ipc-flooding-protection",
          "--memory-pressure-off",
        ],
        ignoreDefaultArgs: ["--disable-extensions"],
        timeout: 60000,
      });

      const page = await browser.newPage();

      // Configurar el viewport para PNG
      await page.setViewport({ width: 800, height: 1000 });

      // Cargar el HTML con timeout más largo
      await page.setContent(ticketHTML, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Generar PNG
      const pngBuffer = await page.screenshot({
        type: "png",
        fullPage: true,
        omitBackground: false,
      });

      // Convertir Uint8Array a Buffer si es necesario
      return Buffer.from(pngBuffer);
    } catch (error) {
      this.logger.error("Error generando PNG profesional:", error);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.warn("Error cerrando navegador PNG:", closeError);
        }
      }
    }
  }
  /**
   * Genera un PDF profesional pero estable del ticket
   */
  private async generateSimpleTicketPDF(
    ticket: Ticket,
    eventName: string,
  ): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      this.logger.log(
        `🔧 Generando PDF profesional para ticket ${ticket.code}...`,
      );

      // Generar QR code
      const qrBuffer = await this.generateQRCode(ticket.qrToken);
      const qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;

      browser = await puppeteer.launch({
        headless: true,
        executablePath: "/usr/bin/chromium-browser",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        timeout: 30000,
      });

      const page = await browser.newPage();

      const professionalHTML = `
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                min-height: 100vh;
              }
              .ticket-container {
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                overflow: hidden;
                max-width: 600px;
                margin: 0 auto;
              }
              .ticket-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                position: relative;
              }
              .ticket-title {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .ticket-subtitle {
                font-size: 16px;
                opacity: 0.9;
              }
              .status-badge {
                position: absolute;
                top: 15px;
                right: 15px;
                background: #28a745;
                color: white;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
              }
              .ticket-body {
                padding: 30px;
              }
              .event-name {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 20px;
                text-align: center;
              }
              .ticket-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
              }
              .detail-item {
                text-align: center;
              }
              .detail-label {
                font-size: 12px;
                color: #7f8c8d;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .detail-value {
                font-size: 16px;
                color: #2c3e50;
                font-weight: bold;
              }
              .ticket-code {
                font-family: 'Courier New', monospace;
                background: #f8f9fa;
                padding: 8px 12px;
                border-radius: 6px;
                border: 2px solid #e9ecef;
              }
              .qr-section {
                text-align: center;
                border-top: 2px dashed #e0e0e0;
                padding-top: 20px;
              }
              .qr-code {
                width: 120px;
                height: 120px;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                margin-bottom: 10px;
              }
              .qr-instructions {
                font-size: 12px;
                color: #6c757d;
                margin-top: 10px;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              <div class="ticket-header">
                <div class="status-badge">✓ CONFIRMADO</div>
                <div class="ticket-title">ENTRADA DIGITAL</div>
                <div class="ticket-subtitle">Ticket Electrónico</div>
              </div>
              
              <div class="ticket-body">
                <div class="event-name">${eventName}</div>
                
                <div class="ticket-details">
                  <div class="detail-item">
                    <div class="detail-label">Código de Ticket</div>
                    <div class="detail-value ticket-code">${ticket.code}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Tipo</div>
                    <div class="detail-value">${ticket.type}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Precio</div>
                    <div class="detail-value">${ticket.price.amount.toLocaleString("es-ES")} ${ticket.price.currency}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Fecha de Compra</div>
                    <div class="detail-value">${ticket.purchaseDate.toLocaleDateString("es-ES")}</div>
                  </div>
                </div>
                
                <div class="qr-section">
                  <img src="${qrBase64}" alt="Código QR" class="qr-code">
                  <div class="qr-instructions">
                    Presenta este código en la entrada del evento
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <strong>TicketSales</strong><br>
                Este ticket es válido para un ingreso único al evento<br>
                Soporte: soporte@ticketsales.com
              </div>
            </div>
          </body>
        </html>
      `;

      await page.setContent(professionalHTML, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
      });

      this.logger.log(`✅ PDF profesional generado: ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error("Error generando PDF profesional:", error);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          this.logger.warn("Error cerrando navegador:", e);
        }
      }
    }
  }

  /**
   * Genera un PNG profesional pero estable del ticket
   */
  private async generateSimpleTicketPNG(
    ticket: Ticket,
    eventName: string,
  ): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      this.logger.log(`🔧 Generando PNG simple para ticket ${ticket.code}...`);

      // Generar QR code
      const qrBuffer = await this.generateQRCode(ticket.qrToken);
      const qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;
      this.logger.log(`✅ QR code generado para PNG: ${qrBuffer.length} bytes`);

      browser = await puppeteer.launch({
        headless: true,
        executablePath: "/usr/bin/chromium-browser",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        timeout: 30000,
      });
      this.logger.log(`✅ Navegador PNG iniciado`);

      const page = await browser.newPage();
      await page.setViewport({ width: 800, height: 1000 });
      this.logger.log(`✅ Página PNG configurada`);

      // Usar HTML simplificado pero profesional
      const professionalHTML = `
        <html>
          <head>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px; margin: 0;
              }
              .ticket { 
                background: white; border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                max-width: 600px; margin: 0 auto; overflow: hidden;
              }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 30px; text-align: center;
              }
              .title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .body { padding: 30px; }
              .event-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 20px; text-align: center; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .detail { text-align: center; }
              .label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
              .value { font-size: 16px; color: #2c3e50; font-weight: bold; }
              .code { font-family: 'Courier New', monospace; background: #f8f9fa; padding: 8px 12px; border-radius: 6px; }
              .qr-section { text-align: center; border-top: 2px dashed #e0e0e0; padding-top: 20px; }
              .qr-code { width: 120px; height: 120px; border: 2px solid #dee2e6; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="header">
                <div class="title">ENTRADA DIGITAL</div>
                <div>Ticket Electrónico</div>
              </div>
              <div class="body">
                <div class="event-name">${eventName}</div>
                <div class="details">
                  <div class="detail">
                    <div class="label">Código</div>
                    <div class="value code">${ticket.code}</div>
                  </div>
                  <div class="detail">
                    <div class="label">Tipo</div>
                    <div class="value">${ticket.type}</div>
                  </div>
                  <div class="detail">
                    <div class="label">Precio</div>
                    <div class="value">${ticket.price.amount.toLocaleString("es-ES")} ${ticket.price.currency}</div>
                  </div>
                  <div class="detail">
                    <div class="label">Fecha</div>
                    <div class="value">${ticket.purchaseDate.toLocaleDateString("es-ES")}</div>
                  </div>
                </div>
                <div class="qr-section">
                  <img src="${qrBase64}" alt="QR" class="qr-code">
                  <div style="font-size: 12px; color: #6c757d; margin-top: 10px;">
                    Presenta este código en la entrada
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      await page.setContent(professionalHTML, { waitUntil: "networkidle0" });
      this.logger.log(`✅ Contenido HTML cargado en PNG`);

      const pngBuffer = await page.screenshot({
        type: "png",
        fullPage: true,
        omitBackground: false,
      });

      this.logger.log(`✅ PNG simple generado: ${pngBuffer.length} bytes`);
      return Buffer.from(pngBuffer);
    } catch (error) {
      this.logger.error("Error generando PNG simple:", error);
      this.logger.error(
        "PNG Error stack:",
        error instanceof Error ? error.stack : "No stack available",
      );
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
          this.logger.log(`✅ Navegador PNG cerrado`);
        } catch (e) {
          this.logger.warn("Error cerrando navegador PNG:", e);
        }
      }
    }
  }

  private registerHandlebarsHelpers(): void {
    // Helper para formatear fechas
    handlebars.registerHelper("formatDate", (date: string) => {
      return new Date(date).toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });

    // Helper para formatear hora
    handlebars.registerHelper("formatTime", (time: string) => {
      if (!time) return "";
      return new Date(`2000-01-01T${time}`).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    });

    // Helper para formatear precio
    handlebars.registerHelper(
      "formatPrice",
      (amount: number, currency: string) => {
        return new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: currency || "EUR",
        }).format(amount);
      },
    );

    // Helper para generar QR URL
    handlebars.registerHelper("qrCodeUrl", (qrToken: string) => {
      const baseUrl = this.configService.get<string>(
        "FRONTEND_URL",
        "https://localhost",
      );
      return `${baseUrl}/qr/${qrToken}`;
    });

    // Helper condicional
    handlebars.registerHelper(
      "ifEquals",
      function (this: any, arg1: any, arg2: any, options: any) {
        return arg1 == arg2 ? options.fn(this) : options.inverse(this);
      },
    );
  }

  /**
   * Carga y compila una plantilla de email
   */
  private async loadTemplate(
    templateName: string,
  ): Promise<handlebars.TemplateDelegate> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      const templateContent = fs.readFileSync(templatePath, "utf8");
      return handlebars.compile(templateContent);
    } catch (error) {
      this.logger.error(`Error al cargar plantilla ${templateName}:`, error);
      throw new Error(
        `No se pudo cargar la plantilla de email: ${templateName}`,
      );
    }
  }

  /**
   * Envía email de confirmación de compra con entradas
   */
  async sendTicketConfirmationEmail(
    params: SendTicketEmailParams,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `📧 Enviando email de confirmación a: ${params.buyerEmail}`,
      );

      // Cargar plantilla
      const template = await this.loadTemplate("ticket-confirmation");

      // Preparar datos para la plantilla
      const ticketsWithQR = params.tickets.map((ticket) => ({
        id: ticket.id,
        code: ticket.code,
        type: ticket.type,
        price: ticket.price.amount,
        currency: ticket.price.currency,
        qrToken: ticket.qrToken,
        purchaseDate: ticket.purchaseDate.toISOString(),
      }));

      // Preparar datos para la plantilla
      const templateData = {
        buyerName: params.buyerName || "Estimado/a cliente",
        buyerEmail: params.buyerEmail,
        eventName: params.eventName,
        eventDate: params.eventDate,
        eventLocation: params.eventLocation,
        eventVenueName: params.eventVenueName,
        eventStartTime: params.eventStartTime,
        eventEndTime: params.eventEndTime,
        eventImage: params.eventImage,
        tickets: ticketsWithQR,
        totalTickets: params.tickets.length,
        totalAmount: params.tickets.reduce(
          (sum, ticket) => sum + ticket.price.amount,
          0,
        ),
        currency: params.tickets[0]?.price.currency || "EUR",
        purchaseDate: new Date().toISOString(),
        supportEmail: this.configService.get<string>(
          "SUPPORT_EMAIL",
          "soporte@ticketsales.com",
        ),
        companyName: this.configService.get<string>(
          "COMPANY_NAME",
          "TicketSales",
        ),
        websiteUrl: this.configService.get<string>(
          "FRONTEND_URL",
          "https://localhost",
        ),
      };

      // Generar HTML del email
      const htmlContent = template(templateData);

      // Generar PDFs y PNGs para cada ticket según configuración
      const attachments: EmailAttachment[] = [];
      const attachPDF =
        this.configService.get<string>("EMAIL_ATTACH_PDF", "true") === "true";
      const attachPNG =
        this.configService.get<string>("EMAIL_ATTACH_PNG", "true") === "true";

      if (attachPDF || attachPNG) {
        this.logger.log(
          `📄 Generando archivos para ${params.tickets.length} tickets (PDF: ${attachPDF}, PNG: ${attachPNG})...`,
        );

        for (const ticket of params.tickets) {
          try {
            this.logger.log(
              `🔄 Iniciando generación de archivos para ticket ${ticket.code}...`,
            );

            // Generar PDF si está habilitado
            if (attachPDF) {
              this.logger.log(`📄 Generando PDF para ticket ${ticket.code}...`);
              try {
                // Usar método simple temporalmente
                const pdfBuffer = await this.generateSimpleTicketPDF(
                  ticket,
                  params.eventName,
                );

                attachments.push({
                  filename: `ticket-${ticket.code}.pdf`,
                  content: pdfBuffer,
                  contentType: "application/pdf",
                });
                this.logger.log(
                  `✅ PDF generado para ticket ${ticket.code}, tamaño: ${pdfBuffer.length} bytes`,
                );
              } catch (pdfError) {
                this.logger.error(
                  `❌ Error generando PDF para ticket ${ticket.code}:`,
                  pdfError,
                );
              }

              // Pequeño delay para evitar conflictos
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            // Generar PNG si está habilitado
            if (attachPNG) {
              this.logger.log(`🖼️ Generando PNG para ticket ${ticket.code}...`);
              try {
                const pngBuffer = await this.generateSimpleTicketPNG(
                  ticket,
                  params.eventName,
                );

                if (pngBuffer && pngBuffer.length > 0) {
                  attachments.push({
                    filename: `ticket-${ticket.code}.png`,
                    content: pngBuffer,
                    contentType: "image/png",
                  });
                  this.logger.log(
                    `✅ PNG generado y adjuntado para ticket ${ticket.code}, tamaño: ${pngBuffer.length} bytes`,
                  );
                } else {
                  this.logger.error(
                    `❌ PNG buffer vacío para ticket ${ticket.code}`,
                  );
                }
              } catch (pngError) {
                this.logger.error(
                  `❌ Error generando PNG para ticket ${ticket.code}:`,
                  pngError,
                );
                this.logger.error(
                  `❌ PNG Error stack:`,
                  pngError instanceof Error
                    ? pngError.stack
                    : "No stack available",
                );
              }
            }

            this.logger.log(
              `✅ Archivos generados para ticket ${ticket.code} (PDF: ${attachPDF}, PNG: ${attachPNG})`,
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
              `❌ Error generando archivos para ticket ${ticket.code}:`,
              errorMessage,
            );
            if (errorStack) {
              this.logger.error(`❌ Stack trace:`, errorStack);
            }
          }
        }
      } else {
        this.logger.log(
          "📄 Generación de adjuntos deshabilitada por configuración",
        );
      }

      // Configurar opciones del email
      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: this.configService.get<string>("FROM_NAME", "TicketSales"),
          address:
            this.configService.get<string>("FROM_EMAIL") ||
            this.configService.get<string>("SMTP_USER") ||
            "noreply@ticketsales.com",
        },
        to: params.buyerEmail,
        subject: `🎫 Confirmación de compra - ${params.eventName}`,
        html: htmlContent,
        attachments: [...(params.attachments || []), ...attachments],
      };

      // Enviar email
      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `✅ Email enviado exitosamente a ${params.buyerEmail}. MessageId: ${result.messageId}`,
      );
      this.logger.log(
        `📎 Adjuntos incluidos: ${attachments.length} archivos (${attachments.filter((a) => a.contentType === "application/pdf").length} PDFs, ${attachments.filter((a) => a.contentType === "image/png").length} PNGs)`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Error al enviar email a ${params.buyerEmail}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Envía email de recordatorio del evento
   */
  async sendEventReminderEmail(
    params: SendTicketEmailParams,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `📧 Enviando recordatorio de evento a: ${params.buyerEmail}`,
      );

      const template = await this.loadTemplate("event-reminder");

      const templateData = {
        buyerName: params.buyerName || "Estimado/a cliente",
        eventName: params.eventName,
        eventDate: params.eventDate,
        eventLocation: params.eventLocation,
        eventVenueName: params.eventVenueName,
        eventStartTime: params.eventStartTime,
        eventEndTime: params.eventEndTime,
        tickets: params.tickets.map((ticket) => ({
          code: ticket.code,
          type: ticket.type,
          qrToken: ticket.qrToken,
        })),
        totalTickets: params.tickets.length,
        supportEmail: this.configService.get<string>(
          "SUPPORT_EMAIL",
          "soporte@ticketsales.com",
        ),
        companyName: this.configService.get<string>(
          "COMPANY_NAME",
          "TicketSales",
        ),
        websiteUrl: this.configService.get<string>(
          "FRONTEND_URL",
          "https://localhost",
        ),
      };

      const htmlContent = template(templateData);

      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: this.configService.get<string>("FROM_NAME", "TicketSales"),
          address:
            this.configService.get<string>("FROM_EMAIL") ||
            this.configService.get<string>("SMTP_USER") ||
            "noreply@ticketsales.com",
        },
        to: params.buyerEmail,
        subject: `🔔 Recordatorio: ${params.eventName} - ¡No olvides tus entradas!`,
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `✅ Recordatorio enviado exitosamente a ${params.buyerEmail}. MessageId: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Error al enviar recordatorio a ${params.buyerEmail}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Método genérico para enviar emails con plantilla personalizada
   */
  async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    templateData: any,
    attachments?: EmailAttachment[],
  ): Promise<boolean> {
    try {
      const template = await this.loadTemplate(templateName);
      const htmlContent = template(templateData);

      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: this.configService.get<string>("FROM_NAME", "TicketSales"),
          address:
            this.configService.get<string>("FROM_EMAIL") ||
            this.configService.get<string>("SMTP_USER") ||
            "noreply@ticketsales.com",
        },
        to,
        subject,
        html: htmlContent,
        attachments: attachments || [],
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `✅ Email personalizado enviado a ${to}. MessageId: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Error al enviar email personalizado a ${to}:`,
        error,
      );
      return false;
    }
  }
}
