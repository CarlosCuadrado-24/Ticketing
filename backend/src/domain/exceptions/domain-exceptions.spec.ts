import { InsufficientTicketsException } from './insufficient-tickets.exception';
import { InvalidEmailException } from './invalid-email.exception';
import { InvalidMoneyException } from './invalid-money.exception';
import { InvalidQuantityException } from './invalid-quantity.exception';
import { InvalidStateTransitionException } from './invalid-state-transition.exception';
import { TicketTypeNotFoundException } from './ticket-type-not-found.exception';

describe('Domain Exceptions', () => {
  describe('InsufficientTicketsException', () => {
    it('should create exception with correct message', () => {
      const exception = new InsufficientTicketsException('VIP', 10, 5);
      
      expect(exception.message).toBe('Requested 10 VIP tickets but only 5 available');
      expect(exception.name).toBe('InsufficientTicketsException');
    });

    it('should extend Error', () => {
      const exception = new InsufficientTicketsException('GENERAL', 3, 0);
      
      expect(exception).toBeInstanceOf(Error);
    });

    it('should work with different ticket types', () => {
      const vipException = new InsufficientTicketsException('VIP', 5, 2);
      const generalException = new InsufficientTicketsException('GENERAL', 100, 50);
      
      expect(vipException.message).toContain('VIP');
      expect(generalException.message).toContain('GENERAL');
    });

    it('should handle zero availability', () => {
      const exception = new InsufficientTicketsException('VIP', 1, 0);
      
      expect(exception.message).toBe('Requested 1 VIP tickets but only 0 available');
    });

    it('should handle large numbers', () => {
      const exception = new InsufficientTicketsException('GENERAL', 1000, 999);
      
      expect(exception.message).toBe('Requested 1000 GENERAL tickets but only 999 available');
    });
  });

  describe('InvalidEmailException', () => {
    it('should create exception with correct message', () => {
      const message = 'invalid-email';
      const exception = new InvalidEmailException(message);
      
      expect(exception.message).toBe(message);
      expect(exception.name).toBe('InvalidEmailException');
    });

    it('should extend Error', () => {
      const exception = new InvalidEmailException('test');
      
      expect(exception).toBeInstanceOf(Error);
    });

    it('should work with different invalid formats', () => {
      const messages = [
        'Email cannot be empty',
        'no-at-sign is invalid',
        '@no-local is invalid',
        'no-domain@ is invalid',
        'spaces in email@test.com is invalid',
      ];
      const exceptions = messages.map(msg => new InvalidEmailException(msg));

      exceptions.forEach((ex, i) => {
        expect(ex.message).toBe(messages[i]);
        expect(ex.name).toBe('InvalidEmailException');
      });
    });

    it('should preserve original invalid email in message', () => {
      const invalidEmail = 'user@invalid@domain.com';
      const exception = new InvalidEmailException(invalidEmail);
      
      expect(exception.message).toContain(invalidEmail);
    });
  });

  describe('InvalidMoneyException', () => {
    it('should create exception with correct message', () => {
      const exception = new InvalidMoneyException('Amount cannot be negative');
      
      expect(exception.message).toBe('Amount cannot be negative');
      expect(exception.name).toBe('InvalidMoneyException');
    });

    it('should extend Error', () => {
      const exception = new InvalidMoneyException('Invalid amount');
      
      expect(exception).toBeInstanceOf(Error);
    });

    it('should work with different validation messages', () => {
      const exceptions = [
        new InvalidMoneyException('Amount cannot be negative'),
        new InvalidMoneyException('Invalid currency code'),
        new InvalidMoneyException('Amount must be a number'),
        new InvalidMoneyException('Amount exceeds maximum value'),
      ];

      exceptions.forEach((ex) => {
        expect(ex.message).toBeTruthy();
        expect(ex.name).toBe('InvalidMoneyException');
      });
    });

    it('should preserve custom validation message', () => {
      const customMessage = 'Currency USD is not supported';
      const exception = new InvalidMoneyException(customMessage);
      
      expect(exception.message).toBe(customMessage);
    });
  });

  describe('InvalidQuantityException', () => {
    it('should create exception with correct message', () => {
      const exception = new InvalidQuantityException('Quantity must be positive');
      
      expect(exception.message).toBe('Quantity must be positive');
      expect(exception.name).toBe('InvalidQuantityException');
    });

    it('should extend Error', () => {
      const exception = new InvalidQuantityException('Invalid quantity');
      
      expect(exception).toBeInstanceOf(Error);
    });

    it('should work with different validation messages', () => {
      const exceptions = [
        new InvalidQuantityException('Quantity must be positive'),
        new InvalidQuantityException('Quantity cannot be zero'),
        new InvalidQuantityException('Quantity exceeds limit'),
        new InvalidQuantityException('Quantity must be an integer'),
      ];

      exceptions.forEach((ex) => {
        expect(ex.message).toBeTruthy();
        expect(ex.name).toBe('InvalidQuantityException');
      });
    });

    it('should preserve custom validation message', () => {
      const customMessage = 'Maximum quantity is 10 per purchase';
      const exception = new InvalidQuantityException(customMessage);
      
      expect(exception.message).toBe(customMessage);
    });
  });

  describe('InvalidStateTransitionException', () => {
    it('should create exception with correct message format', () => {
      const exception = new InvalidStateTransitionException('ACTIVE', 'confirm');
      
      expect(exception.message).toBe('Cannot confirm reservation in ACTIVE state');
      expect(exception.name).toBe('InvalidStateTransitionException');
    });

    it('should extend Error', () => {
      const exception = new InvalidStateTransitionException('CONFIRMED', 'cancel');
      
      expect(exception).toBeInstanceOf(Error);
    });

    it('should work with different state transitions', () => {
      const transitions = [
        { from: 'CONFIRMED', action: 'confirm' },
        { from: 'CANCELLED', action: 'cancel' },
        { from: 'EXPIRED', action: 'expire' },
        { from: 'CONFIRMED', action: 'expire' },
      ];

      transitions.forEach(({ from, action }) => {
        const exception = new InvalidStateTransitionException(from as any, action);
        expect(exception.message).toBe(`Cannot ${action} reservation in ${from} state`);
      });
    });

    it('should preserve state and action in exception properties', () => {
      const exception = new InvalidStateTransitionException('PENDING_PAYMENT' as any, 'process');
      
      expect(exception.currentState).toBe('PENDING_PAYMENT');
      expect(exception.attemptedAction).toBe('process');
    });

    it('should work with any action string', () => {
      const exception = new InvalidStateTransitionException('ACTIVE', 'validate');
      
      expect(exception.message).toBe('Cannot validate reservation in ACTIVE state');
    });
  });

  describe('TicketTypeNotFoundException', () => {
    it('should create exception with correct message', () => {
      const exception = new TicketTypeNotFoundException('PREMIUM');
      
      expect(exception.message).toBe("Ticket type 'PREMIUM' not found in event configuration");
      expect(exception.name).toBe('TicketTypeNotFoundException');
    });

    it('should extend Error', () => {
      const exception = new TicketTypeNotFoundException('VIP');
      
      expect(exception).toBeInstanceOf(Error);
    });

    it('should work with different ticket types', () => {
      const ticketTypes = ['VIP', 'GENERAL', 'PREMIUM', 'BACKSTAGE', 'EARLY_BIRD'];

      ticketTypes.forEach((type) => {
        const exception = new TicketTypeNotFoundException(type);
        expect(exception.message).toBe(`Ticket type '${type}' not found in event configuration`);
      });
    });

    it('should preserve ticket type in message', () => {
      const ticketType = 'SUPER_VIP';
      const exception = new TicketTypeNotFoundException(ticketType);
      
      expect(exception.message).toContain(ticketType);
    });

    it('should handle special characters in ticket type', () => {
      const exception = new TicketTypeNotFoundException('VIP-PLUS');
      
      expect(exception.message).toBe("Ticket type 'VIP-PLUS' not found in event configuration");
    });
  });

  describe('Exception Hierarchy', () => {
    it('all domain exceptions should extend Error', () => {
      const exceptions = [
        new InsufficientTicketsException('VIP', 1, 0),
        new InvalidEmailException('test'),
        new InvalidMoneyException('test'),
        new InvalidQuantityException('test'),
        new InvalidStateTransitionException('ACTIVE', 'CONFIRMED'),
        new TicketTypeNotFoundException('VIP'),
      ];

      exceptions.forEach((ex) => {
        expect(ex).toBeInstanceOf(Error);
      });
    });

    it('all domain exceptions should have unique names', () => {
      const exceptions = [
        new InsufficientTicketsException('VIP', 1, 0),
        new InvalidEmailException('test'),
        new InvalidMoneyException('test'),
        new InvalidQuantityException('test'),
        new InvalidStateTransitionException('ACTIVE', 'CONFIRMED'),
        new TicketTypeNotFoundException('VIP'),
      ];

      const names = exceptions.map((ex) => ex.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it('exception names should match class names', () => {
      const testCases = [
        { exception: new InsufficientTicketsException('VIP', 1, 0), expectedName: 'InsufficientTicketsException' },
        { exception: new InvalidEmailException('test'), expectedName: 'InvalidEmailException' },
        { exception: new InvalidMoneyException('test'), expectedName: 'InvalidMoneyException' },
        { exception: new InvalidQuantityException('test'), expectedName: 'InvalidQuantityException' },
        { exception: new InvalidStateTransitionException('ACTIVE', 'cancel'), expectedName: 'InvalidStateTransitionException' },
        { exception: new TicketTypeNotFoundException('VIP'), expectedName: 'TicketTypeNotFoundException' },
      ];

      testCases.forEach(({ exception, expectedName }) => {
        expect(exception.name).toBe(expectedName);
      });
    });
  });
});
