import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QRScannerService, QRValidationResponse } from '../../services/qr-scanner.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AdminService } from '../../services/admin.service';
import jsQR from 'jsqr';

interface ScanResult {
  success: boolean;
  message: string;
  ticket?: {
    id: string;
    code: string;
    type: string;
    buyerEmail: string;
    usedAt: string | null;
  };
  timestamp: Date;
}

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.css',
})
export class QRScannerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  // Canvas for QR scanning
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private readonly qrScannerService = inject(QRScannerService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // QR Scanner properties
  private stream: MediaStream | null = null;
  private scanningInterval: any = null;

  // Signals
  readonly isLoading = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraSupported = signal(false);
  readonly selectedEventId = signal<string>('');
  readonly events = signal<any[]>([]);
  readonly scanResults = signal<ScanResult[]>([]);
  readonly currentUser = this.authService.currentUser;
  readonly scanState = signal<'scanning' | 'success' | 'error'>('scanning');
  readonly lastValidation = signal<QRValidationResponse | null>(null);
  readonly manualTicketId = signal<string>('');
  readonly validatedCount = signal<number>(0);

  // Computed
  readonly canScan = computed(
    () => this.cameraSupported() && this.selectedEventId() && !this.isLoading(),
  );

  readonly isOrganizer = computed(() => this.currentUser()?.role === 'ORGANIZER');
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  ngOnInit() {
    this.checkPermissions();
    this.checkCameraSupport();
    this.loadEvents();
    this.checkEventFromRoute();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  private checkPermissions() {
    const user = this.currentUser();
    if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
      this.toastService.show('No tienes permisos para acceder al escáner QR', 'error');
      this.router.navigate(['/']);
      return;
    }
  }

  private async checkCameraSupport() {
    console.log('[QRComponent] Checking camera support...');
    const supported = await this.qrScannerService.checkCameraSupport();
    this.cameraSupported.set(supported);

    console.log('[QRComponent] Camera supported:', supported);
    console.log('[QRComponent] Current protocol:', window.location.protocol);
    console.log('[QRComponent] Current hostname:', window.location.hostname);
    console.log('[QRComponent] Secure context:', window.isSecureContext);

    if (!supported) {
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      let message = '❌ Cámara no disponible. ';

      if (!window.isSecureContext) {
        message += 'Se requiere HTTPS para acceder a la cámara. ';
      } else if (!navigator.mediaDevices) {
        message += 'Tu navegador no soporta acceso a la cámara. ';
      } else {
        message += 'Verifica permisos de cámara en tu navegador. ';
      }

      this.toastService.show(message, 'error');
    } else {
      this.toastService.show('✅ Cámara disponible', 'success');
    }
  }

  private loadEvents() {
    this.isLoading.set(true);
    this.adminService.getEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.toastService.show('Error al cargar eventos', 'error');
        this.isLoading.set(false);
      },
    });
  }

  private checkEventFromRoute() {
    const eventId = this.route.snapshot.queryParams['eventId'];
    if (eventId) {
      this.selectedEventId.set(eventId);
    }
  }

  async startCamera() {
    if (!this.canScan()) {
      this.toastService.show('Selecciona un evento antes de iniciar el escáner', 'warning');
      return;
    }

    try {
      console.log('[QRComponent] Starting camera...');
      this.isLoading.set(true);

      // Activate camera state first to show video element
      this.isCameraActive.set(true);

      console.log('[QRComponent] Requesting camera stream...');
      // Get camera stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log('[QRComponent] Camera stream obtained:', this.stream);

      // Wait for video element to be available in DOM
      await this.waitForVideoElement();

      // Set video source
      if (this.videoElement?.nativeElement) {
        console.log('[QRComponent] Setting video source...');
        this.videoElement.nativeElement.srcObject = this.stream;
        await this.videoElement.nativeElement.play();
        console.log('[QRComponent] Video playing');
      } else {
        console.error('[QRComponent] Video element still not found after waiting!');
        throw new Error('Video element not available');
      }

      // Initialize QR Scanner
      await this.initQRScanner();

      this.isLoading.set(false);
      this.toastService.show('✅ Cámara iniciada. Apunta al código QR', 'success');
    } catch (error: any) {
      console.error('[QRComponent] Error starting camera:', error.name, error.message);
      let errorMessage = '❌ Error al acceder a la cámara. ';

      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permisos de cámara denegados.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No se encontró cámara en el dispositivo.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Cámara no soportada - usa HTTPS.';
      } else {
        errorMessage += 'Verifica los permisos y conexión.';
      }

      this.toastService.show(errorMessage, 'error');
      this.isLoading.set(false);
      this.isCameraActive.set(false); // Reset camera state on error
    }
  }

  private async initQRScanner() {
    try {
      console.log('[QRComponent] Initializing jsQR scanner...');

      if (this.videoElement?.nativeElement && this.canvasElement?.nativeElement) {
        const video = this.videoElement.nativeElement;
        const canvas = this.canvasElement.nativeElement;
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Start scanning loop
        this.scanningInterval = setInterval(() => {
          if (video.videoWidth === 0 || video.videoHeight === 0) return;

          // Update canvas size if video dimensions changed
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Draw the current video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get image data from canvas
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

          // Try to detect QR code
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode) {
            console.log('[QRComponent] QR Code detected:', qrCode.data);
            this.onQRDetected(qrCode.data);
          }
        }, 250); // Scan every 250ms

        console.log('[QRComponent] jsQR scanner initialized and started');
      }
    } catch (error) {
      console.error('[QRComponent] Failed to initialize jsQR scanner:', error);
      throw error;
    }
  }

  private async waitForVideoElement(): Promise<void> {
    const maxAttempts = 10;
    const delay = 100; // 100ms

    for (let i = 0; i < maxAttempts; i++) {
      if (this.videoElement?.nativeElement) {
        console.log('[QRComponent] Video element found after', i * delay, 'ms');
        return;
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error('Video element not found after waiting');
  }

  private async onQRDetected(qrData: string) {
    if (this.isLoading()) return; // Prevent multiple scans

    console.log('QR detected:', qrData);
    this.isLoading.set(true);

    try {
      // Get the selected event code directly - no need to search by ID
      const selectedEventCode = this.selectedEventId();

      if (!selectedEventCode) {
        console.error('No event selected');
        this.toastService.show('Selecciona un evento primero', 'error');
        this.isLoading.set(false);
        return;
      }

      console.log('[QRComponent] Validating QR for event code:', selectedEventCode);
      console.log('[QRComponent] QR Data scanned:', qrData);

      // Validate if QR data looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(qrData.trim())) {
        console.warn('[QRComponent] QR data is not a valid UUID:', qrData);
        this.stopCamera(); // Stop camera on invalid QR
        this.toastService.show(`QR inválido: debe ser un código UUID válido`, 'error');
        this.isLoading.set(false);
        return;
      }

      // Stop camera to show results
      this.stopCamera();

      // Validate the QR token using the event code directly
      this.qrScannerService
        .validateQR(
          qrData.trim(), // QR Token (UUID)
          selectedEventCode, // Event Code (TICK0009-XXX)
        )
        .subscribe(
          (response: QRValidationResponse) => {
            this.addScanResult(response);
            this.lastValidation.set(response);

            if (response.valid) {
              this.scanState.set('success');
              this.validatedCount.update(count => count + 1);
              this.toastService.show('¡Entrada válida! Acceso permitido', 'success');
              this.playSound('success');
            } else {
              this.scanState.set('error');
              this.toastService.show(response.message, 'error');
              this.playSound('error');
            }
          },
          (error: any) => {
            throw error; // Re-throw to be caught by outer catch block
          },
        );
    } catch (error: any) {
      console.error('Error validating QR:', error);

      let errorMessage = 'Error al validar el código QR';

      if (error.status === 400) {
        // Bad Request - validation error
        errorMessage = 'Código QR o evento inválido';
        if (error.error?.message) {
          errorMessage += `: ${error.error.message}`;
        }
      } else if (error.status === 404) {
        errorMessage = 'Ticket no encontrado';
      } else if (error.status === 403) {
        errorMessage = 'Ticket ya utilizado o no válido para este evento';
      } else if (error.status >= 500) {
        errorMessage = 'Error del servidor. Inténtelo más tarde';
      }

      this.toastService.show(errorMessage, 'error');

      // Create a manual scan result for errors
      const errorResult: ScanResult = {
        success: false,
        message: errorMessage,
        timestamp: new Date(),
      };
      this.scanResults.update((results) => [errorResult, ...results.slice(0, 9)]);
    } finally {
      // Add delay before allowing next scan
      setTimeout(() => {
        this.isLoading.set(false);
      }, 2000);
    }
  }

  private addScanResult(response: QRValidationResponse) {
    const result: ScanResult = {
      success: response.valid,
      message: response.message,
      ticket: response.ticket,
      timestamp: new Date(),
    };

    this.scanResults.update((results) => [result, ...results.slice(0, 9)]); // Keep last 10 results
  }

  private playSound(type: 'success' | 'error') {
    try {
      const audio = new Audio();
      audio.src =
        type === 'success'
          ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTuR2O/Eeyw='
          : 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTuR2O/Eeyw=';
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors if audio can't play
    } catch (error) {
      // Ignore audio errors
    }
  }

  // Testing method - simulate a QR scan with a UUID
  testValidUUID() {
    if (!this.selectedEventId()) {
      this.toastService.show('Selecciona un evento primero', 'warning');
      return;
    }

    // Generate a random UUID for testing (this would be a real ticket qrToken)
    const testUUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
    console.log('[QRComponent] Testing with UUID:', testUUID);
    console.log('[QRComponent] Selected event code:', this.selectedEventId());

    // Call onQRDetected with test data
    this.onQRDetected(testUUID);
  }

  stopCamera() {
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = null;
    }

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.isCameraActive.set(false);
  }

  onEventChange(eventId: string) {
    this.selectedEventId.set(eventId);
    if (this.isCameraActive()) {
      this.stopCamera();
    }
  }

  clearResults() {
    this.scanResults.set([]);
  }

  getResultIcon(success: boolean): string {
    return success ? '✅' : '❌';
  }

  getResultClass(success: boolean): string {
    return success ? 'result-success' : 'result-error';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // New methods for redesigned UI
  validateManualTicket() {
    const ticketId = this.manualTicketId();
    if (!ticketId || !this.selectedEventId()) {
      this.toastService.show('Ingresa un ID de ticket válido', 'warning');
      return;
    }
    
    // Simulate QR detection with manual ID
    this.onQRDetected(ticketId);
    this.manualTicketId.set('');
  }

  markAsUsed() {
    // Already marked as used during validation
    this.scanNext();
  }

  scanNext() {
    this.scanState.set('scanning');
    this.lastValidation.set(null);
    if (this.selectedEventId() && this.cameraSupported()) {
      this.startCamera();
    }
  }

  retryValidation() {
    this.scanNext();
  }

  getEventName(): string {
    const eventId = this.selectedEventId();
    const event = this.events().find(e => e.id === eventId);
    return event?.name || 'Evento desconocido';
  }

  getEventDate(): string {
    const eventId = this.selectedEventId();
    const event = this.events().find(e => e.id === eventId);
    if (!event?.date) return 'Fecha no disponible';
    return new Date(event.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

