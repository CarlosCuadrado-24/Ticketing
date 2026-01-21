import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let router: Router;
  let authService: AuthService;

  beforeEach(() => {
    const routerMock = {
      navigate: jasmine.createSpy(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerMock },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
  });

  it('should handle 401 errors by logging out', async () => {
    const logoutSpy = spyOn(authService, 'logout').and.returnValue({
      subscribe: (callbacks: any) => {
        callbacks.next();
        return { unsubscribe: () => {} };
      }
    } as any);

    const promise = httpClient
      .get('/api/test')
      .toPromise()
      .catch((err) => err);

    const req = httpMock.expectOne('/api/test');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await promise;

    expect(logoutSpy).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should handle 403 errors', async () => {
    const promise = httpClient
      .get('/api/test')
      .toPromise()
      .catch((err) => err);

    const req = httpMock.expectOne('/api/test');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    const error = await promise;

    expect(error.status).toBe(403);
  });

  it('should handle 500 errors', async () => {
    const promise = httpClient
      .get('/api/test')
      .toPromise()
      .catch((err) => err);

    const req = httpMock.expectOne('/api/test');
    req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    const error = await promise;

    expect(error.status).toBe(500);
  });

  it('should pass through successful responses', () => {
    httpClient.get('/api/test').subscribe((data) => {
      expect(data).toEqual({ success: true });
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ success: true });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
