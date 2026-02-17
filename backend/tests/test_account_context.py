
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.database import get_session, Account

client = TestClient(app)

def test_get_default_account():
    # Ensure database is initialized or use a fresh db for testing
    # For now, we assume the dev environment DB or a test DB
    
    response = client.get("/api/accounts/default")
    assert response.status_code == 200
    data = response.json()
    assert "account_id" in data
    assert "name" in data
    # Verify UUID format
    assert uuid.UUID(data["account_id"])

def test_import_auto_create_account():
    # Generate a random account ID that definitely doesn't exist
    new_account_id = str(uuid.uuid4())
    
    csv_content = (
        "date,channel_name,spend,conversions,impressions\n"
        "2025-01-01,Test Channel,100.00,5.00,1000\n"
    )
    
    response = client.post(
        "/api/import/csv",
        files={"file": ("metrics.csv", csv_content, "text/csv")},
        data={"account_id": new_account_id},
    )
    
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    
    # Verify account was created in DB
    session = get_session()
    try:
        account = session.query(Account).filter(Account.id == uuid.UUID(new_account_id)).first()
        assert account is not None
        assert account.name == "Imported Account"
    finally:
        session.close()
