import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { AdminService } from '../../../../services/admin.service';
import { EventCategory } from '../../../../models/admin.model';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.css',
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  form!: FormGroup;
  loading = signal(false);
  isEditing = signal(false);
  selectedImage: File | null = null;
  imagePreview = signal<string | null>(null);

  //// HUMAN REVIEW: Se refectoriza para mejorar la manejabilidad de los tipos de entradas
  categories = [
    EventCategory.CONCIERTO,
    EventCategory.DEPORTES,
    EventCategory.TEATRO,
    EventCategory.CINE,
    EventCategory.COMEDIA,
    EventCategory.MUSICAL,
    EventCategory.FESTIVAL,
    EventCategory.CULTURAL,
    EventCategory.RECREATIVO,
    EventCategory.STAND_UP_COMEDY,
    EventCategory.PODCAST,
    EventCategory.CIRCO,
    EventCategory.FERIA,
    EventCategory.TURISMO,
    EventCategory.ACCION_EXTREMO,
    EventCategory.INMERSIONES,
    EventCategory.COMFAMA,
    EventCategory.OTROS,
  ];

  ngOnInit() {
    this.initForm();
    this.checkIfEditing();
  }

  private initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      location: ['', Validators.required],
      venueName: ['', Validators.required],
      description: ['', Validators.required],
      category: ['', Validators.required],
      ticketTypes: this.fb.group({
        general: this.fb.group({
          price: ['', [Validators.required, Validators.min(0)]],
          quantity: ['', [Validators.required, Validators.min(1)]],
        }),
        vip: this.fb.group({
          price: [''],
          quantity: [''],
        }),
        early_bird: this.fb.group({
          price: [''],
          quantity: [''],
        }),
      }),
    });
  }

  private checkIfEditing() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.adminService.getEvent(id).subscribe({
        next: (event) => {
          this.populateForm(event);
        },
        error: (err) => {
          console.error('Error loading event:', err);
          this.toastService.error('Error al cargar el evento');
        },
      });
    }
  }

  private populateForm(event: any) {
    this.form.patchValue({
      name: event.name,
      date: this.formatDateForInput(event.date),
      location: event.location,
      venueName: event.venueName,
      description: event.eventDetails?.[0]?.seating || '',
      category: event.eventDetails?.[0]?.category || '',
    });

    // Load ticket configurations
    if (event.ticketConfigurations && event.ticketConfigurations.length > 0) {
      const generalTicket = event.ticketConfigurations.find((t: any) => t.type === 'GENERAL');
      const vipTicket = event.ticketConfigurations.find((t: any) => t.type === 'VIP');

      // Build updated ticket types
      const ticketTypesUpdate: any = { general: {}, vip: {} };

      if (generalTicket) {
        ticketTypesUpdate.general = {
          price: generalTicket.price,
          quantity: generalTicket.totalQuantity,
        };
      }

      if (vipTicket) {
        ticketTypesUpdate.vip = {
          price: vipTicket.price,
          quantity: vipTicket.totalQuantity,
        };
      }

      this.form.patchValue({
        ticketTypes: ticketTypesUpdate,
      });
    }

    if (event.imageUrl) {
      this.imagePreview.set(event.imageUrl);
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.toastService.error('Por favor completa todos los campos requeridos');
      return;
    }

    this.loading.set(true);

    const formData = new FormData();
    formData.append('name', this.form.get('name')?.value);
    formData.append('date', this.form.get('date')?.value);
    formData.append('location', this.form.get('location')?.value);
    formData.append('venueName', this.form.get('venueName')?.value);

    // Build ticket configurations array
    const ticketConfigurations = [];

    // Add GENERAL tickets if configured
    const generalPrice = this.form.get('ticketTypes.general.price')?.value;
    const generalQty = this.form.get('ticketTypes.general.quantity')?.value;
    if (generalPrice && generalQty) {
      ticketConfigurations.push({
        type: 'GENERAL',
        price: Number(generalPrice),
        currency: 'COP',
        quantity: Number(generalQty),
      });
    }

    // Add VIP tickets if configured
    const vipPrice = this.form.get('ticketTypes.vip.price')?.value;
    const vipQty = this.form.get('ticketTypes.vip.quantity')?.value;
    if (vipPrice && vipQty) {
      ticketConfigurations.push({
        type: 'VIP',
        price: Number(vipPrice),
        currency: 'COP',
        quantity: Number(vipQty),
      });
    }

    if (ticketConfigurations.length === 0) {
      this.toastService.error('Debes configurar al menos un tipo de entrada');
      this.loading.set(false);
      return;
    }

    formData.append('ticketConfigurations', JSON.stringify(ticketConfigurations));

    // Add event details
    const eventDetails = [
      {
        category: this.form.get('category')?.value || 'General',
        minAge: null,
        seating: 'General Admission',
        capacity: ticketConfigurations.reduce((total, config) => total + config.quantity, 0),
        foodSale: false,
        liquorSale: false,
        reducedMobilityAccess: false,
        pregnantAccess: false,
      },
    ];
    formData.append('eventDetails', JSON.stringify(eventDetails));

    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    const request$ = this.isEditing()
      ? this.adminService.updateEvent(this.route.snapshot.paramMap.get('id')!, formData)
      : this.adminService.createEvent(formData);

    request$.subscribe({
      next: () => {
        this.toastService.success(
          this.isEditing() ? 'Evento actualizado correctamente' : 'Evento creado correctamente',
        );
        this.router.navigate(['/admin/events']);
      },
      error: (err) => {
        console.error('Error saving event:', err);
        this.toastService.error('Error al guardar el evento');
        this.loading.set(false);
      },
    });
  }

  onCancel() {
    this.router.navigate(['/admin/events']);
  }

  private formatDateForInput(date: string | Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  get generalTickets() {
    return this.form.get('ticketTypes.general');
  }

  get vipTickets() {
    return this.form.get('ticketTypes.vip');
  }
}
