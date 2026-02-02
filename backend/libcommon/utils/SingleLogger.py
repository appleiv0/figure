from libcommon.utils.Logger import Logger
from libcommon.utils.singleton import Singleton


class SingleLogger(Singleton):
    def __init__(self):
        self.logger = None

    def is_init(self):
        return self.logger is not None

    def set_logger(self, logger: Logger):
        if self.logger is None:
            self.logger = logger

    def get_logger(self) -> Logger:
        return self.logger
