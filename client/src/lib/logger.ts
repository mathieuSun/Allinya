/**
 * Professional Logging System
 * Provides debug/info/warn/error levels with timestamps
 * Supports both browser and server environments
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private level: LogLevel = LogLevel.INFO;
  private maxLogs = 1000;
  private listeners: ((entry: LogEntry) => void)[] = [];
  
  private constructor() {
    // Set log level from environment
    const envLevel = typeof window !== 'undefined' 
      ? import.meta.env?.VITE_LOG_LEVEL 
      : process.env.LOG_LEVEL;
    
    if (envLevel) {
      this.level = LogLevel[envLevel.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;
    }
    
    // In development, show debug logs
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      this.level = LogLevel.DEBUG;
    }
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private formatTimestamp(): string {
    return new Date().toISOString();
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }
  
  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener(entry));
  }
  
  private formatMessage(level: LogLevel, category: string, message: string, data?: any): string {
    const levelStr = LogLevel[level];
    const timestamp = this.formatTimestamp();
    return `[${timestamp}] [${levelStr}] [${category}] ${message}`;
  }
  
  debug(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.DEBUG,
      category,
      message,
      data,
    };
    
    this.addLog(entry);
    console.debug(this.formatMessage(LogLevel.DEBUG, category, message), data);
  }
  
  info(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.INFO,
      category,
      message,
      data,
    };
    
    this.addLog(entry);
    console.info(this.formatMessage(LogLevel.INFO, category, message), data);
  }
  
  warn(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.WARN,
      category,
      message,
      data,
    };
    
    this.addLog(entry);
    console.warn(this.formatMessage(LogLevel.WARN, category, message), data);
  }
  
  error(category: string, message: string, error?: Error | any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.ERROR,
      category,
      message,
      data: error,
      stack: error?.stack || new Error().stack,
    };
    
    this.addLog(entry);
    console.error(this.formatMessage(LogLevel.ERROR, category, message), error);
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  getLevel(): LogLevel {
    return this.level;
  }
  
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Performance logging utilities
  time(label: string): void {
    if (typeof window !== 'undefined') {
      console.time(label);
    }
  }
  
  timeEnd(label: string): void {
    if (typeof window !== 'undefined') {
      console.timeEnd(label);
    }
  }
  
  // Timer drift monitoring
  private timerDriftInterval: NodeJS.Timeout | null = null;
  private timerStartTime: number = 0;
  
  startTimerDriftMonitoring(expectedInterval = 10000): void {
    this.timerStartTime = Date.now();
    let iterations = 0;
    
    this.timerDriftInterval = setInterval(() => {
      iterations++;
      const actualTime = Date.now() - this.timerStartTime;
      const expectedTime = iterations * expectedInterval;
      const drift = actualTime - expectedTime;
      
      this.debug('TIMER_DRIFT', `Timer drift after ${iterations} iterations`, {
        expectedTime,
        actualTime,
        drift,
        driftPercentage: ((drift / expectedTime) * 100).toFixed(2) + '%',
      });
    }, expectedInterval);
  }
  
  stopTimerDriftMonitoring(): void {
    if (this.timerDriftInterval) {
      clearInterval(this.timerDriftInterval);
      this.timerDriftInterval = null;
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Category constants for consistent logging
export const LogCategory = {
  AUTH: 'AUTH',
  SESSION: 'SESSION',
  AGORA: 'AGORA',
  SUPABASE: 'SUPABASE',
  API: 'API',
  UI: 'UI',
  TIMER: 'TIMER',
  PERFORMANCE: 'PERFORMANCE',
  ERROR: 'ERROR',
  TIMER_DRIFT: 'TIMER_DRIFT',
} as const;

// Convenience functions
export const logDebug = (category: string, message: string, data?: any) => 
  logger.debug(category, message, data);

export const logInfo = (category: string, message: string, data?: any) => 
  logger.info(category, message, data);

export const logWarn = (category: string, message: string, data?: any) => 
  logger.warn(category, message, data);

export const logError = (category: string, message: string, error?: Error | any) => 
  logger.error(category, message, error);

// Export timer utilities
export const logTimers = () => logger.startTimerDriftMonitoring();
export const stopLogTimers = () => logger.stopTimerDriftMonitoring();

export default logger;