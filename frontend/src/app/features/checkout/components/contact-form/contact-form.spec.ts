import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ContactForm } from './contact-form';

describe('ContactForm', () => {
  let component: ContactForm;
  let fixture: ComponentFixture<ContactForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactForm, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validation', () => {
    it('should validate empty form as invalid', () => {
      const isValid = component.validate();

      expect(isValid).toBe(false);
      expect(component.errors['firstName']).toBeTruthy();
      expect(component.errors['lastName']).toBeTruthy();
      expect(component.errors['email']).toBeTruthy();
      expect(component.errors['phone']).toBeTruthy();
    });

    it('should validate firstName required', () => {
      component.formData.firstName = '';
      component.validate();

      expect(component.errors['firstName']).toBe('El nombre es obligatorio');
    });

    it('should validate lastName required', () => {
      component.formData.lastName = '';
      component.validate();

      expect(component.errors['lastName']).toBe('El apellido es obligatorio');
    });

    it('should validate email required', () => {
      component.formData.email = '';
      component.validate();

      expect(component.errors['email']).toBe('El correo es obligatorio');
    });

    it('should validate email format', () => {
      component.formData.email = 'invalid-email';
      component.validate();

      expect(component.errors['email']).toBe('Formato de correo inválido');
    });

    it('should validate phone required', () => {
      component.formData.phone = '';
      component.validate();

      expect(component.errors['phone']).toBe('El teléfono es obligatorio');
    });

    it('should validate complete form as valid', () => {
      component.formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      const isValid = component.validate();

      expect(isValid).toBe(true);
      expect(Object.keys(component.errors).length).toBe(0);
    });
  });
});
