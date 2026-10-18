import os
import tempfile

os.environ["DB_PATH"] = tempfile.mktemp(suffix=".db")
from fastapi.testclient import TestClient  # noqa: E402

from main import OTP_TRIES, SUB_PRICE, WELCOME_CREDIT, app  # noqa: E402


def login(c, phone):
    code = c.post("/api/auth/otp", json={"phone": phone}).json()["demo_code"]
    assert c.post("/api/auth/verify", json={"phone": phone, "code": code}).status_code == 200


def test_auth():
    with TestClient(app) as c:
        assert c.get("/api/me").status_code == 401
        assert c.post("/api/articles/remote-work/buy").status_code == 401
        assert c.post("/api/auth/otp", json={"phone": "12345"}).status_code == 422
        r = c.post("/api/auth/otp", json={"phone": "۰۹۱۲ ۱۱۱ ۲۲۳۳"}).json()  # Persian digits + spaces
        assert r["phone"] == "09121112233"
        assert c.post("/api/auth/otp", json={"phone": "+989121112233"}).status_code == 429  # cooldown
        bad = "00000" if r["demo_code"] != "00000" else "11111"
        for _ in range(OTP_TRIES):
            assert c.post("/api/auth/verify", json={"phone": r["phone"], "code": bad}).json()["detail"] == "otp_wrong"
        # attempts are exhausted, even the right code is refused now
        assert c.post("/api/auth/verify", json={"phone": r["phone"], "code": r["demo_code"]}).status_code == 400


def test_money_flow():
    with TestClient(app) as c:
        login(c, "09120000001")
        assert c.get("/api/me").json()["balance"] == WELCOME_CREDIT
        a = c.get("/api/articles/remote-work").json()
        assert a["locked"] and len(a["body"]["fa"]) == 1  # preview only
        r = c.post("/api/articles/remote-work/buy").json()
        assert r["owned"] and r["refundable"] and r["balance"] == WELCOME_CREDIT - a["price"]
        assert c.post("/api/articles/remote-work/buy").status_code == 409
        r = c.post("/api/articles/remote-work/refund", json={"reason": "not_interesting"}).json()
        assert r["locked"] and r["balance"] == WELCOME_CREDIT
        c.post("/api/articles/remote-work/buy")  # rebuy is fine, a second refund is not
        assert c.post("/api/articles/remote-work/refund", json={"reason": "other"}).status_code == 409
        assert c.post("/api/articles/housing-report/buy").status_code == 200  # 55k -> 23k
        assert c.post("/api/articles/zayandeh-water/buy").status_code == 402  # 25k > 23k
        assert c.post("/api/subscriptions", json={"topic": "science"}).status_code == 402
        assert c.post("/api/wallet/topup", json={"pack": "nope"}).status_code == 422
        w = c.post("/api/wallet/topup", json={"pack": "pro"}).json()
        assert w["balance"] == 23_000 + 249_000

        subs = c.post("/api/subscriptions", json={"topic": "science"}).json()
        assert subs[0]["topic"] == "science"
        z = c.get("/api/articles/zayandeh-water").json()
        assert z["owned"] and not z["purchased"] and not z["locked"]
        assert c.post("/api/articles/zayandeh-water/buy").status_code == 409  # covered by subscription
        once = subs[0]["expires"]
        assert c.post("/api/subscriptions", json={"topic": "science"}).json()[0]["expires"] > once  # renew extends

        g = c.post("/api/gifts", json={"amount": 50_000}).json()
        assert c.post("/api/gifts", json={"amount": 1}).status_code == 422
        assert c.post("/api/gifts/redeem", json={"code": g["code"]}).status_code == 404  # can't redeem own gift
        bal = c.get("/api/me").json()["balance"]
        assert bal == 272_000 - 2 * SUB_PRICE - 50_000

        s = c.get("/api/publishers/stats").json()
        assert s["publisher_share"] + s["platform_share"] == s["gross"]

    with TestClient(app) as other:  # separate cookie jar = separate user
        login(other, "09120000002")
        assert other.get("/api/library").json() == []  # purchases are per user
        w = other.post("/api/gifts/redeem", json={"code": g["code"].lower()}).json()
        assert w["balance"] == WELCOME_CREDIT + 50_000
        assert other.post("/api/gifts/redeem", json={"code": g["code"]}).status_code == 404  # single use
