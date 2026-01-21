import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

/**
 * Logging Service
 * Provides structured logging with different levels and optional remote logging
 * Replaces console.log statements throughout the application
 */
@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private readonly maxLocalLogs = 1000;
  private readonly logs: LogEntry[] = [];
  private readonly currentLogLevel = environment.production ? LogLevel.WARN : LogLevel.DEBUG;

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  /**
   * Log authentication events
   */
  logAuth(event: 'login' | 'logout' | 'register' | 'token_refresh', data?: any): void {
    this.info(`Auth: ${event}`, data, 'AuthService');
  }

  /**
   * Log payment events
   */
  logPayment(event: 'started' | 'completed' | 'failed', data?: any): void {
    this.info(`Payment: ${event}`, data, 'PaymentService');
  }

  /**
   * Log API calls
   */
  logApiCall(method: string, url: string, status?: number, duration?: number): void {
    const message = `API: ${method} ${url}`;
    const data = { status, duration };
    
    if (status && status >= 400) {
      this.error(message, data, 'HttpClient');
    } else {
      this.debug(message, data, 'HttpClient');
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level >= level);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs.length = 0;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level < this.currentLogLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      source
    };

    // Add to local storage
    this.logs.push(logEntry);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLocalLogs) {
      this.logs.shift();
    }

    // Console output
    this.outputToConsole(logEntry);

    // Send to remote logging service in production
    if (environment.production && level >= LogLevel.ERROR) {
      this.sendToRemoteLogging(logEntry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] ${entry.source || 'App'}:`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data);
        break;
    }
  }

  /**
   * Send log entry to remote logging service
   */
  private sendToRemoteLogging(entry: LogEntry): void {
    // In a real application, this would send to a service like Sentry, LogRocket, etc.
    // For now, we'll just store it locally
    try {
      const remoteLog = {
        ...entry,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId()
      };
      
      // Store in localStorage for now (in production, send to remote service)
      const remoteLogs = JSON.parse(localStorage.getItem('remote_logs') || '[]');
      remoteLogs.push(remoteLog);
      
      // Keep only last 50 remote logs
      if (remoteLogs.length > 50) {
        remoteLogs.shift();
      }
      
      localStorage.setItem('remote_logs', JSON.stringify(remoteLogs));
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  /**
   * Get current user ID for logging context
   */
  private getCurrentUserId(): string | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      return user?.id || null;
    } catch {
      return null;
    }
  }
}