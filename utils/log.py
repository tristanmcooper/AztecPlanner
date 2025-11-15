import logging
import os
from dotenv import load_dotenv
load_dotenv(override=True)

LOG_LEVEL = os.getenv("LOG_LEVEL")

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(filename)s:%(lineno)d] %(message)s",
)
logger = logging.getLogger()
