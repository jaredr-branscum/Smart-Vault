import os

class Settings:
    # API Settings
    PROJECT_NAME: str = "Smart Vault API"
    
    # CORS & CSP
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    
    # Storage Settings
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "http://localstack:4566")
    S3_PUBLIC_URL: str = os.getenv("S3_PUBLIC_URL_OVERRIDE", "http://localhost:4566")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "smart-vault-receipts")
    
    # Identity Settings
    KEYCLOAK_URL: str = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "smart-vault")
    KEYCLOAK_CLIENT_ID: str = os.getenv("KEYCLOAK_CLIENT_ID", "smart-vault-app")
    
    @property
    def ISSUER(self) -> str:
        return f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}"
    
    @property
    def JWKS_URL(self) -> str:
        return f"{self.ISSUER}/protocol/openid-connect/certs"

settings = Settings()
