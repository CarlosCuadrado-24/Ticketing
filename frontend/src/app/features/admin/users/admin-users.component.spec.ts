import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminUsersComponent } from './admin-users.component';
import { AdminService } from '../../../services/admin.service';
import { User, UserRole } from '../../../models/admin.model';
import { of, throwError } from 'rxjs';

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;
  let mockAdminService: Partial<AdminService>;
  let mockRouter: Partial<Router>;

  const TEST_CREDENTIAL = 'test-credential-fixture-value';

  const mockUsers: User[] = [
    {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      email: 'buyer@test.com',
      firstName: 'Buyer',
      lastName: 'User',
      role: UserRole.BUYER,
      createdAt: new Date('2024-01-15'),
    },
  ];

  beforeEach(async () => {
    mockAdminService = {
      getUsers: jasmine.createSpy(),
      createAdminUser: jasmine.createSpy(),
      updateUser: jasmine.createSpy(),
      deleteUser: jasmine.createSpy(),
    };
    mockRouter = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, AdminUsersComponent],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', async () => {
    const mockResponse = {
      data: mockUsers,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    };

    (mockAdminService.getUsers as jasmine.Spy).and.returnValue(of(mockResponse));

    fixture.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockAdminService.getUsers).toHaveBeenCalled();
    expect(component.users()).toEqual(mockUsers);
    expect(component.pagination().total).toBe(2);
    expect(component.loading()).toBeFalsy();
  });

  it('should handle loading error', async () => {
    (mockAdminService.getUsers as jasmine.Spy).and.returnValue(
      throwError(() => ({ message: 'Network error' })),
    );

    fixture.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(component.error()).toBe('Error al cargar los usuarios');
    expect(component.loading()).toBeFalsy();
  });

  it('should navigate to create user page', () => {
    component.createUser();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/users/create']);
  });

  it('should navigate to edit user page', () => {
    component.editUser(mockUsers[0]);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/users/edit', '1']);
  });

  it('should delete a user', () => {
    (mockAdminService.deleteUser as jasmine.Spy).and.returnValue(of({ message: 'User deleted' }));
    component.users.set(mockUsers);

    spyOn(window, 'confirm').and.returnValue(true);
    component.deleteUser('1', 'admin@test.com');

    expect(mockAdminService.deleteUser).toHaveBeenCalledWith('1');
    expect(component.users().length).toBe(1);
  });

  it('should not delete user if not confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteUser('1', 'admin@test.com');

    expect(mockAdminService.deleteUser).not.toHaveBeenCalled();
  });

  it('should navigate to edit user page when editUser is called', () => {
    component.editUser(mockUsers[0]);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/users/edit', '1']);
  });

  it('should change page and reload users', () => {
    (mockAdminService.getUsers as jasmine.Spy).and.returnValue(
      of({ data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 1 } }),
    );

    component.changePage(2);

    expect(component.filters.page).toBe(2);
    expect(mockAdminService.getUsers).toHaveBeenCalled();
  });

  it('should search users with debounce', async () => {
    (mockAdminService.getUsers as jasmine.Spy).and.returnValue(
      of({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );

    component.filters.search = 'test';
    component.searchUsers();

    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(component.filters.page).toBe(1);
    expect(mockAdminService.getUsers).toHaveBeenCalled();
  });

  it('should get email from user object', () => {
    const user: User = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.BUYER,
      createdAt: new Date(),
    };

    const email = component.getEmail(user);
    expect(email).toBe('test@example.com');
  });
});
