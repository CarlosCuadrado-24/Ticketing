import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { User, UserRole, UsersQuery } from '../../../models/admin.model';
import { ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  users = signal<User[]>([]);
  roles = Object.values(UserRole);
  filters: UsersQuery = { page: 1, limit: 10 };
  pagination = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private searchTimeout: any;

  constructor(
    private adminService: AdminService,
    private router: Router,
  ) {}
  private readonly toastService = inject(ToastService);

  ngOnInit() {
    this.initializeData();
  }

  private async initializeData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.loadUsersPromise();
    } catch (err) {
      this.error.set('Error al cargar los usuarios');
      console.warn('Error cargando usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  private loadUsersPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.adminService.getUsers(this.filters).subscribe({
        next: (response) => {
          this.users.set(response.data);
          this.pagination.set(response.pagination);
          resolve();
        },
        error: (error) => {
          this.error.set(error.message || 'Error al cargar los usuarios');
          reject(error);
        },
      });
    });
  }

  loadUsers() {
    this.initializeData();
  }

  searchUsers() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.filters.page = 1;
      this.loadUsers();
    }, 500);
  }

  changePage(page: number) {
    this.filters.page = page;
    this.loadPageData();
  }

  private loadPageData() {
    this.loading.set(true);
    this.error.set(null);

    this.loadUsersPromise()
      .then(() => {
        this.loading.set(false);
      })
      .catch(() => {
        this.loading.set(false);
      });
  }

  createUser() {
    this.router.navigate(['/admin/users/create']);
  }

  editUser(user: User) {
    this.router.navigate(['/admin/users/edit', user.id]);
  }

  deleteUser(userId: string, userEmail: string) {
    if (confirm(`¿Estás seguro de que quieres eliminar el usuario "${userEmail}"?`)) {
      console.log('[AdminUsers] Deleting user:', userId);
      this.adminService.deleteUser(userId).subscribe({
        next: () => {
          const currentUsers = this.users();
          this.users.set(currentUsers.filter((u: User) => u.id !== userId));
          console.log('[AdminUsers] User deleted successfully');
        },
        error: (error) => {
          const errorMsg = error.error?.message || error.message || 'Error desconocido';
          console.warn('[AdminUsers] Error deleting user:', errorMsg);
          this.toastService.show('Error al eliminar usuario: ' + errorMsg, 'error');
        },
      });
    }
  }

  getEmail(user: User): string {
    if (typeof user.email === 'object' && user.email.value) {
      return user.email.value;
    }
    return user.email as string;
  }
}
