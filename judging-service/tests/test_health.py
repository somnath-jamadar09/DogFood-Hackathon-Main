from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_application_imports_successfully():
    assert app.title


def test_health_returns_http_200():
    response = client.get("/health")

    assert response.status_code == 200


def test_health_reports_healthy_judging_service():
    response = client.get("/health")

    assert response.json() == {
        "status": "healthy",
        "service": "judging-service",
    }


def test_health_returns_json():
    response = client.get("/health")

    assert response.headers["content-type"].startswith("application/json")
