import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PaymentFormData {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-form.html',
  styleUrl: './payment-form.css',
})
export class PaymentForm {
  formData: PaymentFormData = {
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  };

  errors: { [key: string]: string } = {};

  validate(): boolean {
    this.errors = {};

    if (!this.formData.cardholderName.trim()) {
      this.errors['cardholderName'] = 'El nombre del titular es obligatorio';
    }

    const cleanCardNumber = this.formData.cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber) {
      this.errors['cardNumber'] = 'El número de tarjeta es obligatorio';
    } else if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      this.errors['cardNumber'] = 'El número de tarjeta debe tener 13-19 dígitos';
    } else if (!this.isValidCardNumber(cleanCardNumber)) {
      this.errors['cardNumber'] = 'Número de tarjeta inválido';
    }

    if (!this.formData.expiryMonth) {
      this.errors['expiryMonth'] = 'El mes de vencimiento es obligatorio';
    }
    if (!this.formData.expiryYear) {
      this.errors['expiryYear'] = 'El año de vencimiento es obligatorio';
    } else {
      // Check if the card is not expired
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const expiryYear = parseInt(this.formData.expiryYear, 10);
      const expiryMonth = parseInt(this.formData.expiryMonth, 10);

      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        this.errors['expiryYear'] = 'La tarjeta está vencida';
      }
    }

    if (!this.formData.cvv) {
      this.errors['cvv'] = 'El CVV es obligatorio';
    } else if (!/^\d{3,4}$/.test(this.formData.cvv)) {
      this.errors['cvv'] = 'El CVV debe tener 3 o 4 dígitos';
    }

    return Object.keys(this.errors).length === 0;
  }

  private isValidCardNumber(cardNumber: string): boolean {
    // Luhn algorithm for card number validation
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  formatCardNumber(value: string): void {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');

    // Limit to 19 characters (16 digits + 3 spaces)
    this.formData.cardNumber = formatted.slice(0, 19);
  }

  formatCVV(value: string): void {
    this.formData.cvv = value.replace(/\D/g, '').slice(0, 4);
  }

  getFormData(): PaymentFormData & { expiryDate: string } {
    // Extract last 2 digits of year (e.g., "2026" -> "26")
    const shortYear = this.formData.expiryYear.slice(-2);
    return {
      ...this.formData,
      expiryDate: `${this.formData.expiryMonth}/${shortYear}`,
    };
  }
}
