import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../../services/admin.service';
import {
  User,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../../../models/admin.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit {
  roles = Object.values(UserRole);
  isEditMode = false;
  userId: string | null = null;
  loading = false;
  error: string | null = null;

  userForm: (CreateUserRequest | UpdateUserRequest) & { password?: string } = {
    email: '',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Form field, not a hardcoded credential
    password: '', // Empty string for form initialization, not a hardcoded credential
    firstName: '',
    lastName: '',
    role: UserRole.BUYER,
  };

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.userId;

    if (this.isEditMode && this.userId) {
      this.loadUser(this.userId);
    } else {
      // En modo creación, no hay loading
      this.loading = false;
    }
  }

  private loadUser(id: string) {
    this.loading = true;
    this.error = null;
    console.log('[UserForm] Loading user:', id);

    this.adminService.getUserById(id).subscribe({
      next: (user) => {
        console.log('[UserForm] User loaded:', user);
        this.userForm = {
          email: this.extractEmail(user),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
        console.log('[UserForm] Form populated:', this.userForm);
        this.loading = false;
        this.cdr.detectChanges();
        console.log('[UserForm] Loading set to false');
      },
      error: (error) => {
        console.error('[UserForm] Error loading user:', error);
        this.error = error.error?.message || 'Error al cargar el usuario';
        this.loading = false;
        console.log('[UserForm] Loading set to false (error)');
      },
    });
  }

  private extractEmail(user: User): string {
    console.log('[UserForm] Extracting email from user:', user.email);
    if (typeof user.email === 'object' && user.email !== null) {
      const emailValue = (user.email as any).value || user.email;
      console.log('[UserForm] Email extracted (from object):', emailValue);
      return emailValue;
    }
    console.log('[UserForm] Email extracted (string):', user.email);
    return user.email as string;
  }

  onSubmit() {
    this.loading = true;
    this.error = null;

    if (this.isEditMode && this.userId) {
      // Modo edición
      const { password, ...updateData } = this.userForm;
      this.adminService.updateUser(this.userId, updateData).subscribe({
        next: () => {
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Error al actualizar el usuario';
          this.loading = false;
        },
      });
    } else {
      // Modo creación
      this.adminService.createAdminUser(this.userForm as CreateUserRequest).subscribe({
        next: () => {
          this.router.navigate(['/admin/users']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Error al crear el usuario';
          this.loading = false;
        },
      });
    }
  }

  onCancel() {
    this.router.navigate(['/admin/users']);
  }
}
