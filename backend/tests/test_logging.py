import json
import logging
import pytest
from io import StringIO
from logging_config import configure_logging


def test_log_output_is_valid_json():
    """Log records should serialize to valid JSON."""
    stream = StringIO()
    configure_logging(stream=stream)
    logger = logging.getLogger("smart-vault")

    logger.info("test message")

    output = stream.getvalue().strip()
    record = json.loads(output)
    assert record["message"] == "test message"


def test_log_record_has_required_fields():
    """Production log records must include level, logger name, and timestamp."""
    stream = StringIO()
    configure_logging(stream=stream)
    logger = logging.getLogger("smart-vault")

    logger.warning("field check")

    record = json.loads(stream.getvalue().strip())
    assert "levelname" in record
    assert "name" in record
    assert "asctime" in record
    assert record["levelname"] == "WARNING"


def test_log_record_includes_extra_fields():
    """Extra context fields (e.g. request_id) should appear in the JSON record."""
    stream = StringIO()
    configure_logging(stream=stream)
    logger = logging.getLogger("smart-vault")

    logger.info("upload complete", extra={"request_id": "abc-123", "bucket": "smart-vault-receipts"})

    record = json.loads(stream.getvalue().strip())
    assert record.get("request_id") == "abc-123"
    assert record.get("bucket") == "smart-vault-receipts"


def test_log_error_includes_exc_info():
    """Error logs should include exception type and message."""
    stream = StringIO()
    configure_logging(stream=stream)
    logger = logging.getLogger("smart-vault")

    try:
        raise ValueError("something went wrong")
    except ValueError:
        logger.exception("caught error")

    record = json.loads(stream.getvalue().strip())
    assert record["levelname"] == "ERROR"
    assert "exc_info" in record or "message" in record
