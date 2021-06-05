import { IS_NODE } from "../Helpers";

let _level: string | undefined = undefined;

export class Logger {
    static levels = ["error", "warn", "info", "debug"];
    private isBrowser: boolean;
    private colors: {
        warn: string;
        debug: string;
        start: string;
        end: string;
        error: string;
        info: string;
    };
    private messageFormat: string;

    constructor(level?: string) {
        if (!_level) {
            _level = level || "debug";
        }
        this.isBrowser = !IS_NODE;
        if (!this.isBrowser) {
            this.colors = {
                start: "\x1b[2m",
                warn: "\x1b[35m",
                info: "\x1b[33m",
                debug: "\x1b[36m",
                error: "\x1b[31m",
                end: "\x1b[0m",
            };
        } else {
            this.colors = {
                start: "%c",
                warn: "color : #ff00ff",
                info: "color : #ffff00",
                debug: "color : #00ffff",
                error: "color : #ff0000",
                end: "",
            };
        }
        this.messageFormat = "[%t] [%l] - [%m]";
    }

    /**
     *
     * @param level {string}
     * @returns {boolean}
     */
    canSend(level: string) {
        return _level
            ? Logger.levels.indexOf(_level) >= Logger.levels.indexOf(level)
            : false;
    }

    /**
     * @param message {string}
     */
    warn(message: string) {
        this._log("warn", message, this.colors.warn);
    }

    /**
     * @param message {string}
     */
    info(message: string) {
        this._log("info", message, this.colors.info);
    }

    /**
     * @param message {string}
     */
    debug(message: string) {
        this._log("debug", message, this.colors.debug);
    }

    /**
     * @param message {string}
     */
    error(message: string) {
        this._log("error", message, this.colors.error);
    }

    format(message: string, level: string) {
        return this.messageFormat
            .replace("%t", new Date().toISOString())
            .replace("%l", level.toUpperCase())
            .replace("%m", message);
    }

    static setLevel(level: string) {
        _level = level;
    }

    /**
     * @param level {string}
     * @param message {string}
     * @param color {string}
     */
    _log(level: string, message: string, color: string) {
        if (!_level) {
            return;
        }
        if (this.canSend(level)) {
            if (!this.isBrowser) {
                console.log(
                    color + this.format(message, level) + this.colors.end
                );
            } else {
                console.log(
                    this.colors.start + this.format(message, level),
                    color
                );
            }
        } else {
        }
    }
}
