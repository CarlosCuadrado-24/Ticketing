import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminLayoutComponent } from './admin-layout.component';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let authService: Partial<AuthService>;
  let router: Partial<Router>;

  beforeEach(async () => {
    const authServiceSpy = {
      logout: jasmine.createSpy('logout').and.returnValue({
        subscribe: (callbacks: any) => {
          callbacks.next();
          return { unsubscribe: () => {} };
        }
      } as any),
      currentUser: signal({
        id: '1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      }),
    };
    const routerSpy = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue('/'),
      events: { subscribe: () => ({ unsubscribe: () => {} }) },
    };

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call logout and navigate when logout button is clicked', () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should display sidebar with navigation menu', () => {
    const sidebar = fixture.nativeElement.querySelector('.sidebar');
    expect(sidebar).toBeTruthy();
    expect(sidebar.querySelector('.sidebar-menu')).toBeTruthy();
  });

  it('should display main content area with router-outlet', () => {
    const mainContent = fixture.nativeElement.querySelector('.main-content');
    expect(mainContent).toBeTruthy();
    expect(mainContent.querySelector('router-outlet')).toBeTruthy();
  });

  it('should have active router links', () => {
    const links = fixture.nativeElement.querySelectorAll('.sidebar-menu a');
    expect(links.length).toBeGreaterThan(0);
  });
});
