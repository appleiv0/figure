import os
from libcommon.utils.SingleLogger import SingleLogger
from libcommon.utils.Logger import Logger, LOG_FILE_WHEN, LoggerLevel
import pathlib
import dotenv

dotenv.load_dotenv(dotenv.find_dotenv())

HOST = "0.0.0.0"
PORT = os.environ["PORT"]
PRODUCTION = os.environ["PRODUCTION"]
DOC_TITLE = os.environ["DOC_TITLE"]

FRONT_HOST = os.environ["FRONT_HOST"]
FRONT_PORT = os.environ["FRONT_PORT"]

LOGGER_NAME = os.environ["LOGGER_NAME"]
LOG_FILE_DIR = os.environ["LOG_FILE_DIR"]

# MongoDB Configuration
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "abuse_therapy")


def init_logger():
    if PRODUCTION == "False":
        if not SingleLogger.instance().is_init():
            logger = Logger(
                name=LOGGER_NAME,
                log_file_path=f"{LOG_FILE_DIR}/{LOGGER_NAME}",
                log_file_when=LOG_FILE_WHEN.Days,
                log_file_interval=1,
                log_file_backup_count=30,
                log_file_levels=[
                    LoggerLevel.DEBUG,
                    LoggerLevel.INFO,
                    LoggerLevel.ERROR,
                ],
            )
            logger.set_level(LoggerLevel.DEBUG)
            SingleLogger.instance().set_logger(logger)
        else:
            logger = SingleLogger.instance().get_logger()
    else:
        if not SingleLogger.instance().is_init():
            logger = Logger(
                name=LOGGER_NAME,
                log_file_path=f"{LOG_FILE_DIR}/{LOGGER_NAME}",
                log_file_when=LOG_FILE_WHEN.Days,
                log_file_interval=1,
                log_file_backup_count=30,
                log_file_levels=[LoggerLevel.INFO, LoggerLevel.ERROR],
            )
            logger.set_level(LoggerLevel.INFO)
            SingleLogger.instance().set_logger(logger)
        else:
            logger = SingleLogger.instance().get_logger()
    return logger


def make_logs_dir():
    cur_dir = str(pathlib.Path(__file__).parent.resolve())
    csv_dir = f"{cur_dir}/../../{LOG_FILE_DIR}"
    os.makedirs(csv_dir, exist_ok=True)


def make_public_dir():
    cur_dir = str(pathlib.Path(__file__).parent.resolve())
    os.makedirs(f"{cur_dir}/../../public", exist_ok=True)


def make_downloads_dir():
    cur_dir = str(pathlib.Path(__file__).parent.resolve())
    os.makedirs(f"{cur_dir}/../../downloads", exist_ok=True)


def init_directories():
    make_logs_dir()
    make_downloads_dir()
    make_public_dir()


def get_downloads_dir():
    cur_dir = str(pathlib.Path(__file__).parent.resolve())
    return f"{cur_dir}/../../downloads"
