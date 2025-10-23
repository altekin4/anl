import winston from 'winston';
declare const logger: winston.Logger;
export declare const performanceLogger: {
    /**
     * Log with performance timing
     */
    timed: (level: string, message: string, startTime: number, meta?: any) => void;
    /**
     * Log database query performance
     */
    queryPerformance: (query: string, duration: number, rows?: number) => void;
    /**
     * Log cache operation performance
     */
    cachePerformance: (operation: string, key: string, duration: number, hit?: boolean) => void;
    /**
     * Log API request performance
     */
    requestPerformance: (method: string, path: string, statusCode: number, duration: number, userId?: string) => void;
    silent: boolean;
    format: winston.Logform.Format;
    levels: winston.config.AbstractConfigSetLevels;
    level: string;
    transports: winston.transport[];
    exceptions: winston.ExceptionHandler;
    rejections: winston.RejectionHandler;
    profilers: object;
    exitOnError: Function | boolean;
    defaultMeta?: any;
    log: winston.LogMethod;
    error: winston.LeveledLogMethod;
    warn: winston.LeveledLogMethod;
    help: winston.LeveledLogMethod;
    data: winston.LeveledLogMethod;
    info: winston.LeveledLogMethod;
    debug: winston.LeveledLogMethod;
    prompt: winston.LeveledLogMethod;
    http: winston.LeveledLogMethod;
    verbose: winston.LeveledLogMethod;
    input: winston.LeveledLogMethod;
    silly: winston.LeveledLogMethod;
    emerg: winston.LeveledLogMethod;
    alert: winston.LeveledLogMethod;
    crit: winston.LeveledLogMethod;
    warning: winston.LeveledLogMethod;
    notice: winston.LeveledLogMethod;
    allowHalfOpen: boolean;
    off<K>(eventName: string | symbol, listener: (...args: any[]) => void): winston.Logger;
    removeAllListeners(eventName?: string | symbol | undefined): winston.Logger;
    setMaxListeners(n: number): winston.Logger;
    getMaxListeners(): number;
    listeners<K>(eventName: string | symbol): Function[];
    rawListeners<K>(eventName: string | symbol): Function[];
    listenerCount<K>(eventName: string | symbol, listener?: Function | undefined): number;
    eventNames(): (string | symbol)[];
    readableAborted: boolean;
    readable: boolean;
    readableDidRead: boolean;
    readableEncoding: BufferEncoding | null;
    readableEnded: boolean;
    readableFlowing: boolean | null;
    readableHighWaterMark: number;
    readableLength: number;
    readableObjectMode: boolean;
    destroyed: boolean;
    closed: boolean;
    errored: Error | null;
    writable: boolean;
    writableAborted: boolean;
    writableEnded: boolean;
    writableFinished: boolean;
    writableHighWaterMark: number;
    writableLength: number;
    writableObjectMode: boolean;
    writableCorked: number;
    writableNeedDrain: boolean;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map