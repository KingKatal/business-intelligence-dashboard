from app import create_app, db


def test_index_shows_login_page():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        client = app.test_client()
        resp = client.get('/')
        assert resp.status_code == 200
        assert b'Sign in to your account' in resp.data
