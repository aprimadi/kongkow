//
// Implement simple logging functionality
//
// This logger read 'log_level' settings from HTML5 localStorage
//
// The following log levels are supported
//   0 - NO LOG
//   1 - FATAL
//   2 - ERROR
//   3 - WARN
//   4 - INFO
//   5 - DEBUG
//
// To change log level do:
//
//   > logger.setLogLevel(5);
//
// Then refresh the page
//
(function () {
  var Logger = function () {
    this.logLevel = parseInt(localStorage.getItem('log_level')) || 0;
    this.setLoggers();
  };

  Logger.prototype = {
    constructor: Logger,

    setLoggers: function () {
      this.fatal = function () {};
      this.error = function () {};
      this.warn = function () {};
      this.info = function () {};
      this.debug = function () {};

      if (!console) return;

      if (this.logLevel >= 1) this.fatal = Function.prototype.bind.call(console.error, console, '[FATAL]');
      if (this.logLevel >= 2) this.error = Function.prototype.bind.call(console.error, console, '[ERROR]');
      if (this.logLevel >= 3) this.warn = Function.prototype.bind.call(console.warn, console, '[WARN]');
      if (this.logLevel >= 4) this.info = Function.prototype.bind.call(console.info, console, '[INFO]');
      if (this.logLevel >= 5) this.debug = Function.prototype.bind.call(console.log, console, '[DEBUG]');
    },

    setLogLevel: function (logLevel) {
      this.logLevel = logLevel;
      localStorage.setItem('log_level', logLevel);
      this.setLoggers();
    },

    getLogLevel: function () {
      return parseInt(localStorage.getItem('log_level'));
    }
  };

  window.logger = new Logger();
})();
