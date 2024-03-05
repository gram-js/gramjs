"use strict";
// let _level: string | undefined = undefined;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
const platform_1 = require("../platform");
var LogLevel;
(function (LogLevel) {
    LogLevel["NONE"] = "none";
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Logger {
    constructor(level) {
        this.levels = ["error", "warn", "info", "debug"];
        // if (!_level) {
        //     _level = level || "info"; // defaults to info
        // }
        this._logLevel = level || LogLevel.INFO;
        this.isBrowser = !platform_1.isNode;
        if (!this.isBrowser) {
            this.colors = {
                start: "\x1b[2m",
                warn: "\x1b[35m",
                info: "\x1b[33m",
                debug: "\x1b[36m",
                error: "\x1b[31m",
                end: "\x1b[0m",
            };
        }
        else {
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
        this.tzOffset = new Date().getTimezoneOffset() * 60000;
    }
    /**
     *
     * @param level {string}
     * @returns {boolean}
     */
    canSend(level) {
        return this._logLevel
            ? this.levels.indexOf(this._logLevel) >= this.levels.indexOf(level)
            : false;
    }
    /**
     * @param message {string}
     */
    warn(message) {
        this._log(LogLevel.WARN, message, this.colors.warn);
    }
    /**
     * @param message {string}
     */
    info(message) {
        this._log(LogLevel.INFO, message, this.colors.info);
    }
    /**
     * @param message {string}
     */
    debug(message) {
        this._log(LogLevel.DEBUG, message, this.colors.debug);
    }
    /**
     * @param message {string}
     */
    error(message) {
        this._log(LogLevel.ERROR, message, this.colors.error);
    }
    format(message, level) {
        return this.messageFormat
            .replace("%t", this.getDateTime())
            .replace("%l", level.toUpperCase())
            .replace("%m", message);
    }
    get logLevel() {
        return this._logLevel;
    }
    setLevel(level) {
        this._logLevel = level;
    }
    static setLevel(level) {
        console.log("Logger.setLevel is deprecated, it will has no effect. Please, use client.setLogLevel instead.");
    }
    /**
     * @param level {string}
     * @param message {string}
     * @param color {string}
     */
    _log(level, message, color) {
        if (this.canSend(level)) {
            this.log(level, message, color);
        }
        else {
            return;
        }
    }
    /**
     * Override this function for custom Logger. <br />
     *
     * @remarks use `this.isBrowser` to check and handle for different environment.
     * @param level {string}
     * @param message {string}
     * @param color {string}
     */
    log(level, message, color) {
        if (!this.isBrowser) {
            console.log(color + this.format(message, level) + this.colors.end);
        }
        else {
            console.log(this.colors.start + this.format(message, level), color);
        }
    }
    getDateTime() {
        return new Date(Date.now() - this.tzOffset).toISOString().slice(0, -1);
    }
}
exports.Logger = Logger;
