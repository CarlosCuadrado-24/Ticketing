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
            border-radius: 0 !important;
          }
          
          body {
            font-family: 'Arial Black', 'Helvetica', sans-serif;
            background: #000000;
            padding: 40px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .page-container {
            max-width: 800px;
            position: relative;
          }
          
          .status-badge {
            position: absolute;
            top: -20px;
            right: -20px;
            background: #FF4D00;
            color: #000;
            padding: 8px 24px;
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            transform: rotate(-5deg);
            box-shadow: 4px 4px 0 #000;
            border: 2px solid #000;
            z-index: 20;
          }
          
          header {
            margin-bottom: 40px;
            position: relative;
          }
          
          .header-title {
            font-size: 120px;
            font-weight: 900;
            color: #FFF;
            line-height: 0.9;
            letter-spacing: -0.05em;
            text-transform: uppercase;
            font-style: italic;
            transform: skew(-2deg);
            display: inline-block;
          }
          
          .header-subtitle {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            color: #FFF;
            margin-top: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5em;
            border-left: 4px solid #FF4D00;
            padding-left: 16px;
          }
          
          main {
            background: #FFF;
            color: #000;
            border: 8px solid #000;
            box-shadow: 16px 16px 0 #FF4D00;
            overflow: hidden;
          }
          
          .event-section {
            display: flex;
            border-bottom: 8px solid #000;
          }
          
          .event-name-container {
            width: 66.666%;
            padding: 32px;
            border-right: 8px solid #000;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .event-label {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.2em;
          }
          
          .event-name {
            font-size: 80px;
            font-weight: 900;
            line-height: 0.85;
            text-transform: uppercase;
            letter-spacing: -0.05em;
            transform: skew(-2deg);
            display: inline-block;
          }
          
          .qr-container {
            width: 33.333%;
            padding: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          
          .vertical-text {
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%) rotate(180deg);
            writing-mode: vertical-rl;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 0.2em;
          }
          
          .qr-wrapper {
            border: 6px solid #000;
            padding: 8px;
            background: #FFF;
          }
          
          .qr-code {
            width: 180px;
            height: 180px;
            display: block;
            filter: grayscale(100%) contrast(1.25);
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          
          .info-item {
            padding: 32px;
            border-bottom: 8px solid #000;
          }
          
          .info-item:nth-child(odd) {
            border-right: 8px solid #000;
          }
          
          .info-item:nth-last-child(-n+2) {
            border-bottom: none;
          }
          
          .info-label {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            text-transform: uppercase;
            opacity: 0.6;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 48px;
            font-weight: 900;
            color: #FF4D00;
            text-transform: uppercase;
            word-break: break-all;
            line-height: 1.1;
          }
          
          .glitch-line {
            height: 4px;
            background: repeating-linear-gradient(
              90deg,
              #FFF,
              #FFF 20px,
              transparent 20px,
              transparent 25px,
              #FF4D00 25px,
              #FF4D00 30px
            );
          }
          
          .barcode-strip {
            height: 100px;
            width: 100%;
            background: repeating-linear-gradient(
              90deg,
              #000,
              #000 2px,
              transparent 2px,
              transparent 4px,
              #000 4px,
              #000 5px
            );
            border-top: 8px solid #000;
          }
          
          footer {
            margin-top: 32px;
            background: #FFF;
            color: #000;
            padding: 32px;
            border: 8px solid #000;
          }
          
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .footer-company {
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          
          .footer-text {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.5;
            max-width: 500px;
          }
          
          .footer-highlight {
            background: #000;
            color: #FFF;
            padding: 0 4px;
          }
          
          .footer-right {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            text-align: right;
          }
          
          .serial-footer {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            color: #FFF;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            opacity: 0.5;
          }
          
          .void-watermark {
            margin-top: 48px;
            text-align: center;
            opacity: 0.2;
            pointer-events: none;
          }
          
          .void-text {
            font-size: 120px;
            font-weight: 900;
            text-transform: uppercase;
            color: #FFF;
            line-height: 1;
            overflow: hidden;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <header>
            <div class="status-badge">✓ CONFIRMADO</div>
            <div class="header-title">ENTRADA<br/>DIGITAL</div>
            <div class="header-subtitle">Ticket Electrónico / No: ${ticket.code}</div>
          </header>
          
          <main>
            <div class="event-section">
              <div class="event-name-container">
                <div class="event-label">EVENTO / UNDERGROUND PHASE</div>
                <div class="event-name">${eventName}</div>
              </div>
              
              <div class="qr-container">
                <div class="vertical-text">ESCANEAME_NOW</div>
                <div class="qr-wrapper">
                  <img src="${qrBase64}" alt="QR Code" class="qr-code">
                </div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">CÓDIGO DE TICKET</div>
                <div class="info-value">${ticket.code}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">TIPO</div>
                <div class="info-value">${ticket.type}</div>
              </div>
            </div>
            
            <div class="glitch-line"></div>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">PRECIO</div>
                <div class="info-value">${ticket.price.amount.toLocaleString("es-ES")} ${ticket.price.currency}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">FECHA DE COMPRA</div>
                <div class="info-value">${ticket.purchaseDate.toLocaleDateString("es-ES", { day: "numeric", month: "numeric", year: "numeric" })}</div>
              </div>
            </div>
            
            <div class="barcode-strip"></div>
          </main>
          
          <footer>
            <div class="footer-content">
              <div>
                <div class="footer-company">TICKETSALES</div>
                <div class="footer-text">
                  ESTE TICKET ES VÁLIDO PARA UN INGRESO ÚNICO AL EVENTO. PROHIBIDA SU REVENTA NO AUTORIZADA. 
                  SOPORTE TÉCNICO: <span class="footer-highlight">${this.configService.get<string>("SUPPORT_EMAIL", "SOPORTE@TICKETSALES.COM")}</span>
                </div>
              </div>
              <div class="footer-right">
                <p>© 2026 BRUTALIST RECORDS</p>
                <p>ALL RIGHTS DESTROYED</p>
              </div>
            </div>
          </footer>
          
          <div class="serial-footer">
            <span>S/N: 994-001-X992</span>
            <span>SYSTEM_CORE_V.2.0.4</span>
            <span>ORIGIN: BOG_CO</span>
          </div>
          
          <div class="void-watermark">
            <div class="void-text">VOID VOID VOID VOID VOID VOID VOID</div>
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
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
            body { 
              font-family: 'Arial Black', 'Helvetica', sans-serif;
              background: #000000;
              padding: 40px;
              min-height: 100vh;
            }
            .page-container { max-width: 800px; position: relative; }
            .status-badge {
              position: absolute; top: -20px; right: -20px;
              background: #FF4D00; color: #000;
              padding: 8px 24px; font-size: 18px; font-weight: 900;
              text-transform: uppercase; transform: rotate(-5deg);
              box-shadow: 4px 4px 0 #000; border: 2px solid #000; z-index: 20;
            }
            header { margin-bottom: 40px; position: relative; }
            .header-title {
              font-size: 80px; font-weight: 900; color: #FFF;
              line-height: 0.9; letter-spacing: -0.05em;
              text-transform: uppercase; font-style: italic;
              transform: skew(-2deg); display: inline-block;
            }
            .header-subtitle {
              font-family: 'Courier New', monospace; font-size: 10px;
              color: #FFF; margin-top: 16px; text-transform: uppercase;
              letter-spacing: 0.5em; border-left: 4px solid #FF4D00; padding-left: 16px;
            }
            main {
              background: #FFF; color: #000;
              border: 8px solid #000; box-shadow: 16px 16px 0 #FF4D00; overflow: hidden;
            }
            .event-section { display: flex; border-bottom: 8px solid #000; }
            .event-name-container {
              width: 66.666%; padding: 32px; border-right: 8px solid #000;
              display: flex; flex-direction: column; justify-content: center;
            }
            .event-label {
              font-family: 'Courier New', monospace; font-size: 9px;
              text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.2em;
            }
            .event-name {
              font-size: 50px; font-weight: 900; line-height: 0.85;
              text-transform: uppercase; letter-spacing: -0.05em;
              transform: skew(-2deg); display: inline-block;
            }
            .qr-container {
              width: 33.333%; padding: 32px;
              display: flex; align-items: center; justify-content: center; position: relative;
            }
            .vertical-text {
              position: absolute; left: 8px; top: 50%;
              transform: translateY(-50%) rotate(180deg); writing-mode: vertical-rl;
              font-family: 'Courier New', monospace; font-size: 10px;
              font-weight: bold; letter-spacing: 0.2em;
            }
            .qr-wrapper { border: 6px solid #000; padding: 8px; background: #FFF; }
            .qr-code { width: 180px; height: 180px; display: block; filter: grayscale(100%) contrast(1.25); }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; }
            .info-item { padding: 32px; border-bottom: 8px solid #000; }
            .info-item:nth-child(odd) { border-right: 8px solid #000; }
            .info-item:nth-last-child(-n+2) { border-bottom: none; }
            .info-label {
              font-family: 'Courier New', monospace; font-size: 10px;
              text-transform: uppercase; opacity: 0.6; margin-bottom: 4px;
            }
            .info-value {
              font-size: 36px; font-weight: 900; color: #FF4D00;
              text-transform: uppercase; word-break: break-all; line-height: 1.1;
            }
            .glitch-line {
              height: 4px;
              background: repeating-linear-gradient(
                90deg, #FFF, #FFF 20px, transparent 20px, transparent 25px,
                #FF4D00 25px, #FF4D00 30px
              );
            }
            .barcode-strip {
              height: 100px; width: 100%;
              background: repeating-linear-gradient(
                90deg, #000, #000 2px, transparent 2px, transparent 4px,
                #000 4px, #000 5px
              );
              border-top: 8px solid #000;
            }
            footer {
              margin-top: 32px; background: #FFF; color: #000;
              padding: 32px; border: 8px solid #000;
            }
            .footer-content { display: flex; justify-content: space-between; align-items: flex-end; }
            .footer-company {
              font-size: 24px; font-weight: 900;
              text-transform: uppercase; margin-bottom: 8px;
            }
            .footer-text {
              font-family: 'Courier New', monospace; font-size: 10px;
              line-height: 1.5; max-width: 500px;
            }
            .footer-highlight { background: #000; color: #FFF; padding: 0 4px; }
            .footer-right {
              font-family: 'Courier New', monospace; font-size: 10px; text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <header>
              <div class="status-badge">✓ CONFIRMADO</div>
              <div class="header-title">ENTRADA<br/>DIGITAL</div>
              <div class="header-subtitle">Ticket Electrónico / No: ${ticket.code}</div>
            </header>
            
            <main>
              <div class="event-section">
                <div class="event-name-container">
                  <div class="event-label">EVENTO / UNDERGROUND PHASE</div>
                  <div class="event-name">${eventName}</div>
                </div>
                
                <div class="qr-container">
                  <div class="vertical-text">ESCANEAME_NOW</div>
                  <div class="qr-wrapper">
                    <img src="${qrBase64}" alt="QR Code" class="qr-code">
                  </div>
                </div>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">CÓDIGO DE TICKET</div>
                  <div class="info-value">${ticket.code}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">TIPO</div>
                  <div class="info-value">${ticket.type}</div>
                </div>
              </div>
              
              <div class="glitch-line"></div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">PRECIO</div>
                  <div class="info-value">${ticket.price.amount.toLocaleString("es-ES")} ${ticket.price.currency}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">FECHA DE COMPRA</div>
                  <div class="info-value">${ticket.purchaseDate.toLocaleDateString("es-ES", { day: "numeric", month: "numeric", year: "numeric" })}</div>
                </div>
              </div>
              
              <div class="barcode-strip"></div>
            </main>
            
            <footer>
              <div class="footer-content">
                <div>
                  <div class="footer-company">TICKETSALES</div>
                  <div class="footer-text">
                    ESTE TICKET ES VÁLIDO PARA UN INGRESO ÚNICO AL EVENTO. PROHIBIDA SU REVENTA NO AUTORIZADA. 
                    SOPORTE TÉCNICO: <span class="footer-highlight">SOPORTE@TICKETSALES.COM</span>
                  </div>
                </div>
                <div class="footer-right">
                  <p>© 2026 BRUTALIST RECORDS</p>
                  <p>ALL RIGHTS DESTROYED</p>
                </div>
              </div>
            </footer>
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
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
            body { 
              font-family: 'Arial Black', 'Helvetica', sans-serif;
              background: #000000;
              padding: 40px;
              min-height: 100vh;
            }
            .page-container { max-width: 800px; position: relative; }
            .status-badge {
              position: absolute; top: -20px; right: -20px;
              background: #FF4D00; color: #000;
              padding: 8px 24px; font-size: 18px; font-weight: 900;
              text-transform: uppercase; transform: rotate(-5deg);
              box-shadow: 4px 4px 0 #000; border: 2px solid #000; z-index: 20;
            }
            header { margin-bottom: 40px; position: relative; }
            .header-title {
              font-size: 80px; font-weight: 900; color: #FFF;
              line-height: 0.9; letter-spacing: -0.05em;
              text-transform: uppercase; font-style: italic;
              transform: skew(-2deg); display: inline-block;
            }
            .header-subtitle {
              font-family: 'Courier New', monospace; font-size: 10px;
              color: #FFF; margin-top: 16px; text-transform: uppercase;
              letter-spacing: 0.5em; border-left: 4px solid #FF4D00; padding-left: 16px;
            }
            main {
              background: #FFF; color: #000;
              border: 8px solid #000; box-shadow: 16px 16px 0 #FF4D00; overflow: hidden;
            }
            .event-section { display: flex; border-bottom: 8px solid #000; }
            .event-name-container {
              width: 66.666%; padding: 32px; border-right: 8px solid #000;
              display: flex; flex-direction: column; justify-content: center;
            }
            .event-label {
              font-family: 'Courier New', monospace; font-size: 9px;
              text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.2em;
            }
            .event-name {
              font-size: 50px; font-weight: 900; line-height: 0.85;
              text-transform: uppercase; letter-spacing: -0.05em;
              transform: skew(-2deg); display: inline-block;
            }
            .qr-container {
              width: 33.333%; padding: 32px;
              display: flex; align-items: center; justify-content: center; position: relative;
            }
            .vertical-text {
              position: absolute; left: 8px; top: 50%;
              transform: translateY(-50%) rotate(180deg); writing-mode: vertical-rl;
              font-family: 'Courier New', monospace; font-size: 10px;
              font-weight: bold; letter-spacing: 0.2em;
            }
            .qr-wrapper { border: 6px solid #000; padding: 8px; background: #FFF; }
            .qr-code { width: 180px; height: 180px; display: block; filter: grayscale(100%) contrast(1.25); }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; }
            .info-item { padding: 32px; border-bottom: 8px solid #000; }
            .info-item:nth-child(odd) { border-right: 8px solid #000; }
            .info-item:nth-last-child(-n+2) { border-bottom: none; }
            .info-label {
              font-family: 'Courier New', monospace; font-size: 10px;
              text-transform: uppercase; opacity: 0.6; margin-bottom: 4px;
            }
            .info-value {
              font-size: 36px; font-weight: 900; color: #FF4D00;
              text-transform: uppercase; word-break: break-all; line-height: 1.1;
            }
            .glitch-line {
              height: 4px;
              background: repeating-linear-gradient(
                90deg, #FFF, #FFF 20px, transparent 20px, transparent 25px,
                #FF4D00 25px, #FF4D00 30px
              );
            }
            .barcode-strip {
              height: 100px; width: 100%;
              background: repeating-linear-gradient(
                90deg, #000, #000 2px, transparent 2px, transparent 4px,
                #000 4px, #000 5px
              );
              border-top: 8px solid #000;
            }
            footer {
              margin-top: 32px; background: #FFF; color: #000;
              padding: 32px; border: 8px solid #000;
            }
            .footer-content { display: flex; justify-content: space-between; align-items: flex-end; }
            .footer-company {
              font-size: 24px; font-weight: 900;
              text-transform: uppercase; margin-bottom: 8px;
            }
            .footer-text {
              font-family: 'Courier New', monospace; font-size: 10px;
              line-height: 1.5; max-width: 500px;
            }
            .footer-highlight { background: #000; color: #FFF; padding: 0 4px; }
            .footer-right {
              font-family: 'Courier New', monospace; font-size: 10px; text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <header>
              <div class="status-badge">✓ CONFIRMADO</div>
              <div class="header-title">ENTRADA<br/>DIGITAL</div>
              <div class="header-subtitle">Ticket Electrónico / No: ${ticket.code}</div>
            </header>
            
            <main>
              <div class="event-section">
                <div class="event-name-container">
                  <div class="event-label">EVENTO / UNDERGROUND PHASE</div>
                  <div class="event-name">${eventName}</div>
                </div>
                
                <div class="qr-container">
                  <div class="vertical-text">ESCANEAME_NOW</div>
                  <div class="qr-wrapper">
                    <img src="${qrBase64}" alt="QR Code" class="qr-code">
                  </div>
                </div>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">CÓDIGO DE TICKET</div>
                  <div class="info-value">${ticket.code}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">TIPO</div>
                  <div class="info-value">${ticket.type}</div>
                </div>
              </div>
              
              <div class="glitch-line"></div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">PRECIO</div>
                  <div class="info-value">${ticket.price.amount.toLocaleString("es-ES")} ${ticket.price.currency}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">FECHA DE COMPRA</div>
                  <div class="info-value">${ticket.purchaseDate.toLocaleDateString("es-ES", { day: "numeric", month: "numeric", year: "numeric" })}</div>
                </div>
              </div>
              
              <div class="barcode-strip"></div>
            </main>
            
            <footer>
              <div class="footer-content">
                <div>
                  <div class="footer-company">TICKETSALES</div>
                  <div class="footer-text">
                    ESTE TICKET ES VÁLIDO PARA UN INGRESO ÚNICO AL EVENTO. PROHIBIDA SU REVENTA NO AUTORIZADA. 
                    SOPORTE TÉCNICO: <span class="footer-highlight">SOPORTE@TICKETSALES.COM</span>
                  </div>
                </div>
                <div class="footer-right">
                  <p>© 2026 BRUTALIST RECORDS</p>
                  <p>ALL RIGHTS DESTROYED</p>
                </div>
              </div>
            </footer>
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
  private loadTemplate(
    templateName: string,
  ): handlebars.TemplateDelegate {
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
      const template = this.loadTemplate("ticket-confirmation");

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

      const template = this.loadTemplate("event-reminder");

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
      const template = this.loadTemplate(templateName);
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
