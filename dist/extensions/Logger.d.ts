export declare enum LogLevel {
    NONE = "none",
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
export declare class Logger {
    private levels;
    private readonly isBrowser;
    private colors;
    messageFormat: string;
    private _logLevel;
    tzOffset: number;
    constructor(level?: LogLevel);
    /**
     *
     * @param level {string}
     * @returns {boolean}
     */
    canSend(level: LogLevel): boolean;
    /**
     * @param message {string}
     */
    warn(message: string): void;
    /**
     * @param message {string}
     */
    info(message: string): void;
    /**
     * @param message {string}
     */
    debug(message: string): void;
    /**
     * @param message {string}
     */
    error(message: string): void;
    format(message: string, level: string): string;
    get logLevel(): LogLevel;
    setLevel(level: LogLevel): void;
    static setLevel(level: string): void;
    /**
     * @param level {string}
     * @param message {string}
     * @param color {string}
     */
    _log(level: LogLevel, message: string, color: string): void;
    /**
     * Override this function for custom Logger. <br />
     *
     * @remarks use `this.isBrowser` to check and handle for different environment.
     * @param level {string}
     * @param message {string}
     * @param color {string}
     */
    log(level: LogLevel, message: string, color: string): void;
    getDateTime(): string;
}
