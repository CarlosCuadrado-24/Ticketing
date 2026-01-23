import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Events } from '../../services/events';
import { EventService } from '../../services/event.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { environment } from '../../../environments/environment';

// Event categories enum
export enum EventCategory {
  CUALQUIER_CATEGORIA = 'Cualquier categoría',
  ACCION_EXTREMO = 'Acción Extremo',
  CINE = 'Cine',
  CIRCO = 'Circo',
  COMEDIA = 'Comedia',
  COMFAMA = 'Comfama',
  CONCIERTO = 'Concierto',
  CULTURAL = 'Cultural',
  DEPORTES = 'Deportes',
  FERIA = 'Feria',
  FESTIVAL = 'Festival',
  INMERSIONES_CENTROS_EXPERIENCIAS = 'Inmersiones a los centros de experiencias',
  MUSICAL = 'Musical',
  OTROS = 'Otros',
  PODCAST = 'Podcast',
  RECREATIVO = 'Recreativo',
  STAND_UP_COMEDY = 'Stand-Up Comedy',
  TEATRO = 'Teatro',
  TURISMO = 'Turismo',
}
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingSpinner],
  templateUrl: './event-form.html',
  styleUrl: './event-form.css',
})
export class EventForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventsService = inject(Events);
  private readonly eventService = inject(EventService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  form!: FormGroup;
  isLoading = false;
  isEditing = false;
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  eventId: string | null = null;
  categories = Object.values(EventCategory);
  onSubmit(): void {
    if (!this.form.valid) {
      this.toastService.show('Completa todos los campos requeridos', 'warning');
      return;
    }

    this.isLoading = true;
    const formData = new FormData();

    // Add form fields
    formData.append('name', this.form.get('name')?.value);
    formData.append('date', new Date(this.form.get('date')?.value).toISOString());
    formData.append('location', this.form.get('location')?.value);
    formData.append('venueName', this.form.get('venueName')?.value || '');

    const description = this.form.get('description')?.value;
    if (description) {
      formData.append('description', description);
    }

    // Add event details
    const eventDetails = {
      category: this.form.get('category')?.value,
      minAge: this.form.get('minAge')?.value,
      seating: this.form.get('seating')?.value,
      capacity: this.form.get('capacity')?.value,
      foodSale: this.form.get('foodSale')?.value,
      liquorSale: this.form.get('liquorSale')?.value,
      reducedMobilityAccess: this.form.get('reducedMobilityAccess')?.value,
      pregnantAccess: this.form.get('pregnantAccess')?.value,
    };
    formData.append('eventDetails', JSON.stringify(eventDetails));

    formData.append(
      'ticketConfigurations',
      JSON.stringify(this.form.get('ticketConfigurations')?.value),
    );

    // Add image if selected
    if (this.selectedFile) {
      formData.append('image', this.selectedFile, this.selectedFile.name);
    }

    const request =
      this.isEditing && this.eventId
        ? this.eventsService.updateEvent(this.eventId, formData)
        : this.eventsService.createEvent(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show(
          this.isEditing ? '¡Evento actualizado exitosamente!' : '¡Evento creado exitosamente!',
          'success',
        );
        this.eventService.loadEvents();
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error saving event:', err);
        this.toastService.show('Error al guardar el evento. Inténtalo nuevamente.', 'error');
      },
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.checkIfEditing();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      location: ['', [Validators.required, Validators.minLength(3)]],
      venueName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: [EventCategory.CUALQUIER_CATEGORIA, Validators.required],
      minAge: [null],
      seating: [''],
      capacity: [null, [Validators.min(1)]],
      foodSale: [false],
      liquorSale: [false],
      reducedMobilityAccess: [false],
      pregnantAccess: [false],
      ticketConfigurations: [
        [
          { type: 'VIP', price: 100, currency: 'COP', quantity: 50 },
          { type: 'GENERAL', price: 50, currency: 'COP', quantity: 100 },
        ],
        Validators.required,
      ],
    });
  }

  private checkIfEditing(): void {
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditing = true;
      this.loadEvent();
    }
  }

  private loadEvent(): void {
    if (!this.eventId) return;

    this.isLoading = true;
    this.eventsService.getEvent(this.eventId).subscribe({
      next: (event) => {
        this.form.patchValue({
          name: event.name,
          date: new Date(event.date).toISOString().slice(0, 16),
          location: event.location,
          venueName: event.venueName || '',
          description: event.description || '',
          category: event.eventDetails?.[0]?.category || EventCategory.CUALQUIER_CATEGORIA,
          minAge: event.eventDetails?.[0]?.minAge || null,
          seating: event.eventDetails?.[0]?.seating || '',
          capacity: event.eventDetails?.[0]?.capacity || null,
          foodSales: event.eventDetails?.[0]?.foodSale || false,
          liquorSales: event.eventDetails?.[0]?.liquorSale || false,
          wheelchairAccess: event.eventDetails?.[0]?.reducedMobilityAccess || false,
          pregnancyAccess: event.eventDetails?.[0]?.pregnantAccess || false,
          ticketConfigurations: event.ticketConfigurations || [],
        });

        if (event.imageUrl) {
          if (event.imageUrl.startsWith('http') && !event.imageUrl.includes('minio')) {
            this.previewUrl = event.imageUrl;
          } else {
            let filename = event.imageUrl;
            if (filename.includes('/')) {
              filename = filename.split('/').pop() || filename;
            }
            this.previewUrl = `${environment.apiUrl}/events/file/${filename}`;
          }
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading event:', err);
        this.isLoading = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Solo se permiten imágenes JPEG, PNG y GIF', 'warning');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.toastService.show('La imagen no puede superar 5MB', 'warning');
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result || null;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }
}
