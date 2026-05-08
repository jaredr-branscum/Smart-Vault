import boto3
import os
import mimetypes
from botocore.config import Config
from botocore.exceptions import ClientError
from urllib.parse import urlparse, urlunparse
import logging

logger = logging.getLogger("smart-vault")

# AWS Configuration (Clean abstraction for Production/Dev)
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "smart-vault-receipts")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL") # Internal storage endpoint (LocalStack only)
S3_PUBLIC_URL_OVERRIDE = os.getenv("S3_PUBLIC_URL_OVERRIDE") # Public endpoint for browser access (Fixes Docker split-horizon DNS)

class S3Service:
    def __init__(self):
        # boto3 uses standard AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars automatically
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=S3_ENDPOINT_URL,
            config=Config(signature_version="s3v4")
        )
        self.public_url_override = S3_PUBLIC_URL_OVERRIDE

    def upload_file(self, file_obj, object_key, content_type=None):
        """Uploads a file with correct metadata."""
        try:
            extra_args = {"ContentType": content_type} if content_type else {}
            self.s3_client.upload_fileobj(
                file_obj, 
                S3_BUCKET_NAME, 
                object_key,
                ExtraArgs=extra_args
            )
            return True
        except ClientError as e:
            logger.error(f"S3 Upload Error: {e}")
            return False

    def generate_presigned_url(self, object_key, expiration=3600):
        """
        Generates a secure access link. 
        Note: We explicitly override 'inline' disposition and 'ContentType' to ensure
        legacy receipts (uploaded without metadata) render in-browser instead of downloading.
        """
        try:
            content_type, _ = mimetypes.guess_type(object_key)
            content_type = content_type or "application/octet-stream"
            
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": S3_BUCKET_NAME, 
                    "Key": object_key,
                    "ResponseContentDisposition": "inline",
                    "ResponseContentType": content_type
                },
                ExpiresIn=expiration
            )
            
            # Fix for Docker Split-Horizon DNS: 
            # Replaces internal container hostnames (e.g. 'localstack') with host-accessible 
            # addresses (e.g. 'localhost') so the user's browser can reach the storage.
            if self.public_url_override:
                parsed = urlparse(url)
                override_parsed = urlparse(self.public_url_override)
                # Swap internal hostname with public override (e.g. localstack -> localhost)
                new_netloc = f"{override_parsed.hostname}:{override_parsed.port}" if override_parsed.port else override_parsed.hostname
                url = urlunparse(parsed._replace(netloc=new_netloc))
                
            return url
        except Exception as e:
            logger.error(f"S3 Presigned URL Error: {e}")
            return None

    def delete_file(self, object_key):
        """Removes a file from the vault."""
        try:
            self.s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=object_key)
            return True
        except ClientError as e:
            logger.error(f"S3 Delete Error: {e}")
            return False

s3_service = S3Service()
