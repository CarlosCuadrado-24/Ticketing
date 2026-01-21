import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CheckoutService } from '../../../checkout/services/checkout.service';
import { AuthService } from '../../../../core/services/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly checkoutService = inject(CheckoutService);

  readonly isLoading = this.authService.isLoading;
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly authMode = signal<AuthMode>('login');
  readonly showPassword = signal<boolean>(false);

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        terms: [false, [Validators.requiredTrue]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  switchMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  onLoginSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage.set(null);

      const { rememberMe, ...credentials } = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: () => {
          const user = this.authService.currentUser();
          // Resume pending checkout if exists
          if (this.checkoutService.restorePendingCheckout()) {
            this.router.navigate(['/checkout']);
            return;
          }

          // Role-based navigation using AuthService method
          if (user) {
            const defaultRoute = this.authService.getDefaultRouteForUser(user);
            this.router.navigate([defaultRoute]);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (error: any) => {
          console.error('Login error:', error);
          this.errorMessage.set(
            error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.',
          );
        },
      });
    }
  }

  onRegisterSubmit(): void {
    if (this.registerForm.valid) {
      this.errorMessage.set(null);
      this.successMessage.set(null);

      const { confirmPassword, terms, ...registerData } = this.registerForm.value;

      this.authService.register(registerData).subscribe({
        next: () => {
          this.successMessage.set('¡Cuenta creada exitosamente! Redirigiendo...');
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (error: any) => {
          console.error('Register error:', error);
          this.errorMessage.set(
            error.error?.message || 'Error al crear la cuenta. Intenta nuevamente.',
          );
        },
      });
    }
  }
}
