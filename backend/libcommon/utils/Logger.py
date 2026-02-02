import logging
from logging.handlers import TimedRotatingFileHandler
from enum import Enum


class LoggerLevel(Enum):
    CRITICAL = 50
    FATAL = CRITICAL
    ERROR = 40
    WARNING = 30
    WARN = WARNING
    INFO = 20
    DEBUG = 10
    NOTSET = 0


class LOG_FILE_WHEN(Enum):
    Seconds = "S"
    Minutes = "M"
    Hours = "H"
    Days = "D"


class Logger:
    def __init(
        self,
        log_file_path: str = None,
        log_file_when: LOG_FILE_WHEN = LOG_FILE_WHEN.Days,
        log_file_interval: int = 1,
        log_file_backup_count: int = 30,
        log_file_levels: [LoggerLevel] = None,
    ):
        self.stream_handler: logging.StreamHandler = None
        self.file_handlers: [TimedRotatingFileHandler] = []
        self.__set_logger_file_setting(
            log_file_path,
            log_file_when,
            log_file_interval,
            log_file_backup_count,
            log_file_levels,
        )
        default_formatter = logging.Formatter(
            "%(asctime)s - %(processName)s - %(name)s - %(levelname)s - %(message)s"
        )
        self.__set_formatter(default_formatter)
        self.__set_file_logger()

    def __init__(
        self,
        name: str,
        log_file_path: str = None,
        log_file_when: LOG_FILE_WHEN = LOG_FILE_WHEN.Days,
        log_file_interval: int = 1,
        log_file_backup_count: int = 30,
        log_file_levels: [LoggerLevel] = None,
    ):
        if name is not None:
            self.logger = logging.getLogger(name)

            self.__init(
                log_file_path,
                log_file_when,
                log_file_interval,
                log_file_backup_count,
                log_file_levels if log_file_levels is not None else [],
            )
        else:
            raise NameError("logger name is None!")

    def __set_logger_file_setting(
        self,
        log_file_path: str = None,
        log_file_when: LOG_FILE_WHEN = LOG_FILE_WHEN.Days,
        log_file_interval: int = 1,
        log_file_backup_count: int = 30,
        log_file_levels: [LoggerLevel] = [],
    ):
        self.log_file_path = log_file_path
        self.log_file_when = log_file_when
        self.log_file_interval = log_file_interval
        self.log_file_backup_count = log_file_backup_count
        self.log_file_levels = list(set(log_file_levels))

    def __set_formatter(self, formatter: logging.Formatter):
        if self.stream_handler is not None:
            self.logger.removeHandler(self.stream_handler)

        self.stream_handler = logging.StreamHandler()
        self.formatter = formatter
        self.stream_handler.setFormatter(formatter)
        self.logger.addHandler(self.stream_handler)

    def __set_file_logger_handler(
        self,
        level: LoggerLevel = LoggerLevel.DEBUG,
    ):
        print(
            f"set Logger file path: {self.log_file_path}, when {self.log_file_when.value}, interval {self.log_file_interval}, backup_count: {self.log_file_backup_count}, level: {level.value}"
        )
        filename = self.log_file_path + "-" + level.name + ".log"
        file_handler = TimedRotatingFileHandler(
            filename=filename,
            encoding="utf-8",
            when=self.log_file_when.value,
            interval=self.log_file_interval,
            backupCount=self.log_file_backup_count,
        )

        if self.log_file_when == LOG_FILE_WHEN.Seconds:
            file_handler.suffix = "%Y-%m-%d_%H-%M-%S.log"
        elif self.log_file_when == LOG_FILE_WHEN.Minutes:
            file_handler.suffix = "%Y-%m-%d_%H-%M.log"
        elif self.log_file_when == LOG_FILE_WHEN.Hours:
            file_handler.suffix = "%Y-%m-%d_%H.log"
        elif self.log_file_when == LOG_FILE_WHEN.Days:
            file_handler.suffix = "%Y-%m-%d.log"

        self.file_handlers.append(file_handler)
        file_handler.setFormatter(self.formatter)
        file_handler.setLevel(level.value)
        self.logger.addHandler(file_handler)

    def __set_file_logger(self):
        if self.log_file_path is not None:
            for file_handler in self.file_handlers:
                self.logger.removeHandler(file_handler)
            self.file_handlers = []

            # 파일 저장시 log_file_levels가 없으면, debug 레벨 로그 파일 하나만 저장
            if len(self.log_file_levels) > 0:
                for level in self.log_file_levels:
                    self.__set_file_logger_handler(
                        level,
                    )
            else:
                self.__set_file_logger_handler()

    def set_level(self, level: LoggerLevel = LoggerLevel.DEBUG):
        self.logger.setLevel(level.value)

    def set_formatter(self, formatter: logging.Formatter):
        self.remove_handler()
        self.__set_formatter(formatter)
        self.__set_file_logger()

    def set_file_logger(
        self,
        log_file_path: str,
        log_file_when: LOG_FILE_WHEN = LOG_FILE_WHEN.Days,
        log_file_interval: int = 1,
        log_file_backup_count: int = 30,
        log_file_levels: [LoggerLevel] = None,
    ):
        self.__set_logger_file_setting(
            log_file_path,
            log_file_when,
            log_file_interval,
            log_file_backup_count,
            log_file_levels if log_file_levels is not None else [],
        )
        self.remove_handler()
        self.set_formatter(self.formatter)
        self.__set_file_logger()

    def set_logging_logger(
        self,
        logger: logging.Logger,
        log_file_path: str = None,
        log_file_when: LOG_FILE_WHEN = LOG_FILE_WHEN.Days,
        log_file_interval: int = 1,
        log_file_backup_count: int = 30,
        log_file_levels: [LoggerLevel] = None,
    ):
        if logger is not None:
            self.remove_handler()
            self.logger = logger
            self.__init(
                log_file_path,
                log_file_when,
                log_file_interval,
                log_file_backup_count,
                log_file_levels if log_file_levels is not None else [],
            )
        else:
            raise NameError("logger is None!")

    def remove_handler(self):
        self.logger.removeHandler(self.stream_handler)
        for file_handler in self.file_handlers:
            self.logger.removeHandler(file_handler)

    def message(self, msg: str, level: LoggerLevel = LoggerLevel.DEBUG):
        if level == LoggerLevel.DEBUG:
            self.msg_debug(msg)
        elif level == LoggerLevel.INFO:
            self.msg_info(msg)
        elif level == LoggerLevel.WARNING:
            self.msg_warn(msg)
        elif level == LoggerLevel.WARN:
            self.msg_warn(msg)
        elif level == LoggerLevel.ERROR:
            self.msg_error(msg)
        elif level == LoggerLevel.FATAL:
            self.msg_fatal(msg)
        elif level == LoggerLevel.CRITICAL:
            self.msg_fatal(msg)

    def msg_fatal(self, msg: str):
        self.logger.fatal(msg)

    def msg_error(self, msg: str):
        self.logger.error(msg)

    def msg_warn(self, msg: str):
        self.logger.warning(msg)

    def msg_info(self, msg: str):
        self.logger.info(msg)

    def msg_debug(self, msg: str):
        self.logger.debug(msg)
