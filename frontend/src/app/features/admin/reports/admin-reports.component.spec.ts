import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReportsComponent } from './admin-reports.component';
import { AdminService } from '../../../services/admin.service';
import { of } from 'rxjs';

describe('AdminReportsComponent', () => {
  let component: AdminReportsComponent;
  let fixture: ComponentFixture<AdminReportsComponent>;
  let adminService: Partial<AdminService>;

  beforeEach(async () => {
    const adminServiceSpy = {
      getDashboardStats: jasmine.createSpy(),
      getEventStats: jasmine.createSpy(),
      getTicketStats: jasmine.createSpy(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminReportsComponent],
      providers: [{ provide: AdminService, useValue: adminServiceSpy }],
    }).compileComponents();

    adminService = TestBed.inject(AdminService);
    fixture = TestBed.createComponent(AdminReportsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate average ticket price', () => {
    component.dashboardStats = {
      overview: {
        totalUsers: 100,
        totalEvents: 10,
        totalTicketsSold: 500,
        totalRevenue: 5000,
        activeReservations: 50,
      },
      recentEvents: [],
      topEvents: [],
    };

    const avgPrice = component.getAverageTicketPrice();
    expect(avgPrice).toBe(10);
  });

  it('should handle export report', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock');
    
    const mockLink = document.createElement('a');
    spyOn(mockLink, 'click');
    spyOn(document, 'createElement').and.returnValue(mockLink);
    spyOn(document.body, 'appendChild').and.stub();
    spyOn(document.body, 'removeChild').and.stub();

    component.dashboardStats = {
      overview: {
        totalUsers: 100,
        totalEvents: 10,
        totalTicketsSold: 500,
        totalRevenue: 5000,
        activeReservations: 50,
      },
      recentEvents: [],
      topEvents: [],
    };

    expect(() => component.exportReport('events')).not.toThrow();
  });

  it('should load all reports on init', () => {
    const mockDashboardStats = {
      overview: {
        totalUsers: 100,
        totalEvents: 10,
        totalTicketsSold: 500,
        totalRevenue: 5000,
        activeReservations: 50,
      },
      recentEvents: [],
      topEvents: [],
    };

    (adminService.getDashboardStats as jasmine.Spy).and.returnValue(of(mockDashboardStats));
    (adminService.getEventStats as jasmine.Spy).and.returnValue(
      of({ upcomingEvents: [], pastEvents: [], eventsByCategory: [] } as any),
    );
    (adminService.getTicketStats as jasmine.Spy).and.returnValue(
      of({ ticketsByType: [], salesByMonth: [] } as any),
    );

    component.ngOnInit();

    expect(adminService.getDashboardStats).toHaveBeenCalled();
    expect(adminService.getEventStats).toHaveBeenCalled();
    expect(adminService.getTicketStats).toHaveBeenCalled();
  });
});
