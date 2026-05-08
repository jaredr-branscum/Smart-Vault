"""
Structured JSON logging configuration.

Replaces plain-text logs with JSON-structured records compatible with any
log aggregator (Datadog, CloudWatch Logs, Splunk, etc.) with zero changes
in production — just point the aggregator at stdout.
"""
import logging
import sys
from pythonjsonlogger.json import JsonFormatter


def configure_logging(level: int = logging.INFO, stream=None):
    """
    Configure root and app loggers to emit structured JSON.

    Args:
        level: Logging level (default INFO).
        stream: Output stream (default stdout). Override in tests to capture output.
    """
    if stream is None:
        stream = sys.stdout

    handler = logging.StreamHandler(stream)

    # Fields: timestamp, level, logger name, message + any extra fields passed at call site
    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "asctime", "levelname": "levelname", "name": "name"},
    )
    handler.setFormatter(formatter)

    # Apply to the root logger so all libraries (SQLAlchemy, uvicorn, etc.) emit JSON
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(level)

    # Suppress noisy uvicorn access logs in structured output
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
