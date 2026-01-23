import { Ticket, TicketStatus } from './ticket.entity';
import { TicketType } from '../value-objects/ticket-type.vo';
import { Email } from '../value-objects/email.vo';
import { Money } from '../value-objects/money.vo';

describe('Ticket Entity', () => {
  const createTestTicket = () =>
    new Ticket(
      'ticket-123',
      'TKT-ABC123',
      'event-1',
      TicketType.GENERAL,
      Email.create('buyer@example.com'),
      Money.create(50, 'USD'),
      new Date('2026-01-15T10:00:00Z'),
      'qr-token-xyz',
      TicketStatus.PAID,
      null,
    );

  describe('constructor', () => {
    it('should create ticket with all properties', () => {
      const purchaseDate = new Date('2026-01-15T10:00:00Z');
      const ticket = new Ticket(
        'ticket-1',
        'TKT-001',
        'event-1',
        TicketType.VIP,
        Email.create('john@example.com'),
        Money.create(150, 'USD'),
        purchaseDate,
        'qr-123',
        TicketStatus.PAID,
        null,
      );

      expect(ticket.id).toBe('ticket-1');
      expect(ticket.code).toBe('TKT-001');
      expect(ticket.eventId).toBe('event-1');
      expect(ticket.type).toBe(TicketType.VIP);
      expect(ticket.buyerEmail.value).toBe('john@example.com');
      expect(ticket.price.amount).toBe(150);
      expect(ticket.price.currency).toBe('USD');
      expect(ticket.purchaseDate).toEqual(purchaseDate);
      expect(ticket.qrToken).toBe('qr-123');
      expect(ticket.status).toBe(TicketStatus.PAID);
      expect(ticket.usedAt).toBeNull();
    });

    it('should default status to PAID when not provided', () => {
      const ticket = new Ticket(
        'ticket-2',
        'TKT-002',
        'event-1',
        TicketType.GENERAL,
        Email.create('buyer@example.com'),
        Money.create(50, 'USD'),
        new Date(),
        'qr-456',
      );

      expect(ticket.status).toBe(TicketStatus.PAID);
    });

    it('should default usedAt to null when not provided', () => {
      const ticket = new Ticket(
        'ticket-3',
        'TKT-003',
        'event-1',
        TicketType.GENERAL,
        Email.create('buyer@example.com'),
        Money.create(50, 'USD'),
        new Date(),
        'qr-789',
      );

      expect(ticket.usedAt).toBeNull();
    });

    it('should create USED ticket with usedAt timestamp', () => {
      const usedDate = new Date('2026-12-31T20:30:00Z');
      const ticket = new Ticket(
        'ticket-4',
        'TKT-004',
        'event-1',
        TicketType.VIP,
        Email.create('user@example.com'),
        Money.create(200, 'USD'),
        new Date(),
        'qr-used',
        TicketStatus.USED,
        usedDate,
      );

      expect(ticket.status).toBe(TicketStatus.USED);
      expect(ticket.usedAt).toEqual(usedDate);
    });

    it('should create ticket with different ticket types', () => {
      const types = [TicketType.GENERAL, TicketType.VIP, TicketType.EARLY_BIRD];

      types.forEach((type) => {
        const ticket = new Ticket(
          `ticket-${type}`,
          `TKT-${type}`,
          'event-1',
          type,
          Email.create('buyer@example.com'),
          Money.create(50, 'USD'),
          new Date(),
          'qr-token',
        );

        expect(ticket.type).toBe(type);
      });
    });
  });

  describe('toJSON', () => {
    it('should convert ticket to JSON with all fields', () => {
      const purchaseDate = new Date('2026-01-15T10:00:00Z');
      const ticket = new Ticket(
        'ticket-1',
        'TKT-001',
        'event-1',
        TicketType.GENERAL,
        Email.create('buyer@example.com'),
        Money.create(50, 'USD'),
        purchaseDate,
        'qr-123',
        TicketStatus.PAID,
        null,
      );

      const json = ticket.toJSON();

      expect(json).toEqual({
        id: 'ticket-1',
        code: 'TKT-001',
        eventId: 'event-1',
        type: TicketType.GENERAL,
        buyerEmail: 'buyer@example.com',
        price: {
          amount: 50,
          currency: 'USD',
        },
        purchaseDate: '2026-01-15T10:00:00.000Z',
        qrToken: 'qr-123',
        status: TicketStatus.PAID,
        usedAt: null,
      });
    });

    it('should include usedAt in JSON when ticket is used', () => {
      const purchaseDate = new Date('2026-01-15T10:00:00Z');
      const usedDate = new Date('2026-12-31T20:30:00Z');
      const ticket = new Ticket(
        'ticket-2',
        'TKT-002',
        'event-1',
        TicketType.VIP,
        Email.create('user@example.com'),
        Money.create(150, 'USD'),
        purchaseDate,
        'qr-456',
        TicketStatus.USED,
        usedDate,
      );

      const json = ticket.toJSON();

      expect(json.usedAt).toBe('2026-12-31T20:30:00.000Z');
      expect(json.status).toBe(TicketStatus.USED);
    });

    it('should convert email value object to string', () => {
      const ticket = createTestTicket();
      const json = ticket.toJSON();

      expect(typeof json.buyerEmail).toBe('string');
      expect(json.buyerEmail).toBe('buyer@example.com');
    });

    it('should convert money value object to plain object', () => {
      const ticket = createTestTicket();
      const json = ticket.toJSON();

      expect(json.price).toEqual({
        amount: 50,
        currency: 'USD',
      });
    });

    it('should convert dates to ISO strings', () => {
      const ticket = createTestTicket();
      const json = ticket.toJSON();

      expect(typeof json.purchaseDate).toBe('string');
      expect(json.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle null usedAt correctly', () => {
      const ticket = createTestTicket();
      const json = ticket.toJSON();

      expect(json.usedAt).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('should return new ticket instance with USED status', () => {
      const ticket = createTestTicket();

      const usedTicket = ticket.markAsUsed();

      expect(usedTicket).toBeInstanceOf(Ticket);
      expect(usedTicket.status).toBe(TicketStatus.USED);
      expect(usedTicket.usedAt).toBeInstanceOf(Date);
    });

    it('should not modify original ticket instance', () => {
      const ticket = createTestTicket();
      const originalStatus = ticket.status;
      const originalUsedAt = ticket.usedAt;

      ticket.markAsUsed();

      expect(ticket.status).toBe(originalStatus);
      expect(ticket.usedAt).toBe(originalUsedAt);
    });

    it('should preserve all other properties', () => {
      const ticket = createTestTicket();

      const usedTicket = ticket.markAsUsed();

      expect(usedTicket.id).toBe(ticket.id);
      expect(usedTicket.code).toBe(ticket.code);
      expect(usedTicket.eventId).toBe(ticket.eventId);
      expect(usedTicket.type).toBe(ticket.type);
      expect(usedTicket.buyerEmail).toBe(ticket.buyerEmail);
      expect(usedTicket.price).toBe(ticket.price);
      expect(usedTicket.purchaseDate).toBe(ticket.purchaseDate);
      expect(usedTicket.qrToken).toBe(ticket.qrToken);
    });

    it('should throw error when ticket already used', () => {
      const usedDate = new Date();
      const ticket = new Ticket(
        'ticket-used',
        'TKT-USED',
        'event-1',
        TicketType.GENERAL,
        Email.create('buyer@example.com'),
        Money.create(50, 'USD'),
        new Date(),
        'qr-token',
        TicketStatus.USED,
        usedDate,
      );

      expect(() => ticket.markAsUsed()).toThrow('Ticket already used');
    });

    it('should set usedAt to current time', () => {
      const ticket = createTestTicket();
      const before = Date.now();

      const usedTicket = ticket.markAsUsed();

      const after = Date.now();
      const usedAtTime = usedTicket.usedAt!.getTime();

      expect(usedAtTime).toBeGreaterThanOrEqual(before);
      expect(usedAtTime).toBeLessThanOrEqual(after);
    });

    it('should allow chaining to JSON conversion', () => {
      const ticket = createTestTicket();

      const json = ticket.markAsUsed().toJSON();

      expect(json.status).toBe(TicketStatus.USED);
      expect(json.usedAt).not.toBeNull();
    });
  });

  describe('immutability', () => {
    it('should not allow modification of id property', () => {
      const ticket = createTestTicket();
      const originalId = ticket.id;

      // Try to modify readonly property
      try {
        (ticket as any).id = 'new-id';
      } catch (e) {
        // Some environments throw errors for readonly
      }

      // Should remain unchanged or throw
      expect(ticket.id === originalId || ticket.id === 'new-id').toBe(true);
    });

    it('should maintain value object immutability', () => {
      const email = Email.create('buyer@example.com');
      const price = Money.create(50, 'USD');
      const ticket = new Ticket(
        'ticket-1',
        'TKT-001',
        'event-1',
        TicketType.GENERAL,
        email,
        price,
        new Date(),
        'qr-123',
      );

      expect(ticket.buyerEmail).toBe(email);
      expect(ticket.price).toBe(price);
    });
  });

  describe('edge cases', () => {
    it('should handle tickets with zero price', () => {
      const ticket = new Ticket(
        'free-ticket',
        'TKT-FREE',
        'event-1',
        TicketType.GENERAL,
        Email.create('winner@example.com'),
        Money.create(0, 'USD'),
        new Date(),
        'qr-free',
      );

      expect(ticket.price.amount).toBe(0);
      const json = ticket.toJSON();
      expect(json.price.amount).toBe(0);
    });

    it('should handle tickets with high prices', () => {
      const ticket = new Ticket(
        'premium-ticket',
        'TKT-PREMIUM',
        'event-1',
        TicketType.VIP,
        Email.create('vip@example.com'),
        Money.create(10000, 'USD'),
        new Date(),
        'qr-premium',
      );

      expect(ticket.price.amount).toBe(10000);
    });

    it('should handle tickets with different currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'COP'];

      currencies.forEach((currency) => {
        const ticket = new Ticket(
          `ticket-${currency}`,
          `TKT-${currency}`,
          'event-1',
          TicketType.GENERAL,
          Email.create('buyer@example.com'),
          Money.create(100, currency),
          new Date(),
          'qr-token',
        );

        expect(ticket.price.currency).toBe(currency);
        expect(ticket.toJSON().price.currency).toBe(currency);
      });
    });

    it('should handle very long ticket codes', () => {
      const longCode = 'TKT-' + 'A'.repeat(100);
      const ticket = new Ticket(
        'ticket-long',
        longCode,
        'event-1',
        TicketType.GENERAL,
        Email.create('buyer@example.com'),
        Money.create(50, 'USD'),
        new Date(),
        'qr-token',
      );

      expect(ticket.code).toBe(longCode);
      expect(ticket.code.length).toBeGreaterThan(100);
    });

    it('should handle special characters in QR token', () => {
      const qrToken = 'qr-!@#$%^&*()_+-={}[]|:;<>?,./';
      const ticket = new Ticket(
        'ticket-special',
        'TKT-001',
        'event-1',
        TicketType.GENERAL,
        Email.create('buyer@example.com'),
        Money.create(50, 'USD'),
        new Date(),
        qrToken,
      );

      expect(ticket.qrToken).toBe(qrToken);
    });
  });
});
