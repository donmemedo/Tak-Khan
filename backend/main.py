import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager, closing
from typing import Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

from seed import ARTICLES, GIFTS, PACKS, PUBLISHERS, SUB_PRICE, TOPICS

DB = os.getenv("DB_PATH", "khana.db")
# ponytail: the OTP is echoed back for the demo; set OTP_DEMO=0 and send it through an SMS provider for real use.
OTP_DEMO = os.getenv("OTP_DEMO", "1") == "1"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"
SESSION = "khana_session"
SESSION_TTL = 30 * 86400
OTP_TTL, OTP_COOLDOWN, OTP_TRIES = 120, 60, 5
WELCOME_CREDIT = 60_000
REFUND_WINDOW = 24 * 3600
MAX_REFUNDS_30D = 5  # anti-abuse cap on the refund policy
SUB_DAYS = 30
PUBLISHER_SHARE = 0.7
BY_ID = {a["id"]: a for a in ARTICLES}
PHONE = re.compile(r"^09\d{9}$")
DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0), created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS otps (phone TEXT PRIMARY KEY, code TEXT NOT NULL, sent REAL NOT NULL, tries INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS purchases (user_id INTEGER NOT NULL, article_id TEXT NOT NULL, price INTEGER NOT NULL, ts REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1, refunds INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, article_id));
CREATE TABLE IF NOT EXISTS subs (user_id INTEGER NOT NULL, topic TEXT NOT NULL, expires REAL NOT NULL, PRIMARY KEY (user_id, topic));
CREATE TABLE IF NOT EXISTS gifts (code TEXT PRIMARY KEY, amount INTEGER NOT NULL, sender INTEGER NOT NULL, redeemer INTEGER, ts REAL NOT NULL);
CREATE TABLE IF NOT EXISTS tx (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL,
    amount INTEGER NOT NULL, ref TEXT, note TEXT, ts REAL NOT NULL);
"""


def db():
    c = sqlite3.connect(DB, timeout=10)
    c.row_factory = sqlite3.Row
    return c


@asynccontextmanager
async def lifespan(_):
    with closing(db()) as c, c:
        c.executescript(SCHEMA)
    yield


app = FastAPI(title="Khana API", lifespan=lifespan)


# ---------- helpers ----------

def move(c, uid, amount, kind, ref=None, note=None):
    """The only place balances change: wallet update + ledger row, same transaction."""
    try:
        c.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, uid))
    except sqlite3.IntegrityError:  # CHECK (balance >= 0)
        raise HTTPException(402, "insufficient_balance")
    c.execute("INSERT INTO tx (user_id, kind, amount, ref, note, ts) VALUES (?, ?, ?, ?, ?, ?)",
              (uid, kind, amount, ref, note, time.time()))


def article_or_404(aid):
    if aid not in BY_ID:
        raise HTTPException(404, "not_found")
    return BY_ID[aid]


def access(c, uid):
    """-> (purchased article ids, subscribed topics) for a user."""
    if uid is None:
        return set(), set()
    ids = {r[0] for r in c.execute("SELECT article_id FROM purchases WHERE user_id = ? AND active = 1", (uid,))}
    topics = {r[0] for r in c.execute("SELECT topic FROM subs WHERE user_id = ? AND expires > ?", (uid, time.time()))}
    return ids, topics


def summary(a, ids, topics):
    s = {k: v for k, v in a.items() if k != "body"}
    s["purchased"] = a["id"] in ids
    s["owned"] = s["purchased"] or a["topic"] in topics
    return s


def norm_phone(raw):
    p = re.sub(r"[\s\-()]", "", raw.translate(DIGITS))
    if p.startswith("+98"):
        p = "0" + p[3:]
    elif p.startswith("98") and len(p) == 12:
        p = "0" + p[2:]
    elif p.startswith("9") and len(p) == 10:
        p = "0" + p
    if not PHONE.match(p):
        raise HTTPException(422, "invalid_phone")
    return p


# ---------- auth ----------

def optional_user(khana_session: str | None = Cookie(None)):
    if not khana_session:
        return None
    with closing(db()) as c:
        return c.execute("""SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.created > ?""", (khana_session, time.time() - SESSION_TTL)).fetchone()


def user(u=Depends(optional_user)):
    if not u:
        raise HTTPException(401, "login_required")
    return u


class PhoneIn(BaseModel):
    phone: str = Field(max_length=20)


class VerifyIn(PhoneIn):
    code: str = Field(max_length=10)


@app.post("/api/auth/otp")
def send_otp(body: PhoneIn):
    phone, now = norm_phone(body.phone), time.time()
    with closing(db()) as c, c:
        r = c.execute("SELECT sent FROM otps WHERE phone = ?", (phone,)).fetchone()
        if r and r["sent"] > now - OTP_COOLDOWN:
            raise HTTPException(429, "otp_cooldown")
        code = f"{secrets.randbelow(100_000):05d}"
        c.execute("""INSERT INTO otps (phone, code, sent) VALUES (?, ?, ?)
            ON CONFLICT(phone) DO UPDATE SET code = excluded.code, sent = excluded.sent, tries = 0""", (phone, code, now))
    return {"phone": phone, "cooldown": OTP_COOLDOWN, **({"demo_code": code} if OTP_DEMO else {})}


@app.post("/api/auth/verify")
def verify(body: VerifyIn, response: Response):
    phone, code, now = norm_phone(body.phone), body.code.translate(DIGITS).strip(), time.time()
    with closing(db()) as c, c:
        r = c.execute("SELECT * FROM otps WHERE phone = ?", (phone,)).fetchone()
        if not r or r["sent"] < now - OTP_TTL or r["tries"] >= OTP_TRIES:
            raise HTTPException(400, "otp_expired")
        if not hmac.compare_digest(r["code"], code):
            c.execute("UPDATE otps SET tries = tries + 1 WHERE phone = ?", (phone,))
            c.commit()  # keep the failed attempt even though we raise
            raise HTTPException(400, "otp_wrong")
        c.execute("DELETE FROM otps WHERE phone = ?", (phone,))
        cur = c.execute("INSERT OR IGNORE INTO users (phone, created) VALUES (?, ?)", (phone, now))
        new = bool(cur.rowcount)
        uid = c.execute("SELECT id FROM users WHERE phone = ?", (phone,)).fetchone()[0]
        if new:
            move(c, uid, WELCOME_CREDIT, "welcome")
        token = secrets.token_urlsafe(32)
        c.execute("INSERT INTO sessions VALUES (?, ?, ?)", (token, uid, now))
    response.set_cookie(SESSION, token, max_age=SESSION_TTL, httponly=True, samesite="lax", secure=COOKIE_SECURE)
    return {"phone": phone, "new": new}


@app.post("/api/auth/logout")
def logout(response: Response, khana_session: str | None = Cookie(None)):
    if khana_session:
        with closing(db()) as c, c:
            c.execute("DELETE FROM sessions WHERE token = ?", (khana_session,))
    response.delete_cookie(SESSION)
    return {"ok": True}


@app.get("/api/me")
def me(u=Depends(user)):
    return {"phone": u["phone"], "balance": u["balance"]}


# ---------- catalogue & reading ----------

@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/meta")
def meta():
    return {"topics": TOPICS, "publishers": PUBLISHERS, "packs": PACKS, "sub_price": SUB_PRICE, "gifts": GIFTS}


@app.get("/api/articles")
def articles(u=Depends(optional_user)):
    with closing(db()) as c:
        ids, topics = access(c, u["id"] if u else None)
    return [summary(a, ids, topics) for a in ARTICLES]


@app.get("/api/articles/{aid}")
def article(aid: str, u=Depends(optional_user)):
    a = article_or_404(aid)
    uid = u["id"] if u else None
    with closing(db()) as c:
        ids, topics = access(c, uid)
        p = c.execute("SELECT ts, refunds FROM purchases WHERE user_id = ? AND article_id = ? AND active = 1",
                      (uid, aid)).fetchone()
        bal = c.execute("SELECT balance FROM users WHERE id = ?", (uid,)).fetchone()
    out = summary(a, ids, topics)
    out["body"] = a["body"] if out["owned"] else {k: v[:1] for k, v in a["body"].items()}
    out["locked"] = not out["owned"]
    out["refundable"] = bool(p and p["refunds"] == 0 and p["ts"] > time.time() - REFUND_WINDOW)
    out["authed"] = uid is not None
    out["balance"] = bal[0] if bal else 0
    out["sub_price"] = SUB_PRICE
    return out


@app.post("/api/articles/{aid}/buy")
def buy(aid: str, u=Depends(user)):
    a = article_or_404(aid)
    uid = u["id"]
    with closing(db()) as c, c:
        if a["topic"] in access(c, uid)[1]:
            raise HTTPException(409, "already_owned")
        # conditional upsert takes the write lock first, so double-buys serialize
        cur = c.execute("""INSERT INTO purchases (user_id, article_id, price, ts) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, article_id) DO UPDATE SET active = 1, ts = excluded.ts, price = excluded.price
            WHERE active = 0""", (uid, aid, a["price"], time.time()))
        if cur.rowcount == 0:
            raise HTTPException(409, "already_owned")
        move(c, uid, -a["price"], "purchase", aid)
    return article(aid, u)


class RefundIn(BaseModel):
    reason: Literal["not_interesting", "misleading", "low_quality", "already_read", "other"]


@app.post("/api/articles/{aid}/refund")
def refund(aid: str, body: RefundIn, u=Depends(user)):
    article_or_404(aid)
    uid, now = u["id"], time.time()
    with closing(db()) as c, c:
        cur = c.execute("""UPDATE purchases SET active = 0, refunds = refunds + 1
            WHERE user_id = ? AND article_id = ? AND active = 1 AND refunds = 0 AND ts > ?""",
                        (uid, aid, now - REFUND_WINDOW))
        if cur.rowcount == 0:
            raise HTTPException(409, "not_refundable")
        recent = c.execute("SELECT COUNT(*) FROM tx WHERE user_id = ? AND kind = 'refund' AND ts > ?",
                           (uid, now - 30 * 86400)).fetchone()[0]
        if recent >= MAX_REFUNDS_30D:
            raise HTTPException(429, "refund_limit")
        price = c.execute("SELECT price FROM purchases WHERE user_id = ? AND article_id = ?", (uid, aid)).fetchone()[0]
        move(c, uid, price, "refund", aid, body.reason)
    return article(aid, u)


# ---------- subscriptions ----------

class SubIn(BaseModel):
    topic: Literal[tuple(TOPICS)]


@app.get("/api/subscriptions")
def subscriptions(u=Depends(user)):
    with closing(db()) as c:
        rows = c.execute("SELECT topic, expires FROM subs WHERE user_id = ? AND expires > ? ORDER BY expires",
                         (u["id"], time.time())).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/subscriptions")
def subscribe(body: SubIn, u=Depends(user)):
    uid, now = u["id"], time.time()
    with closing(db()) as c, c:
        move(c, uid, -SUB_PRICE, "subscription", body.topic)
        r = c.execute("SELECT expires FROM subs WHERE user_id = ? AND topic = ?", (uid, body.topic)).fetchone()
        expires = max(now, r[0] if r else 0) + SUB_DAYS * 86400  # renewing extends, never shortens
        c.execute("""INSERT INTO subs VALUES (?, ?, ?)
            ON CONFLICT(user_id, topic) DO UPDATE SET expires = excluded.expires""", (uid, body.topic, expires))
    return subscriptions(u)


# ---------- wallet & gifts ----------

def title_of(r):
    if r["ref"] in BY_ID:
        return BY_ID[r["ref"]]["title"]
    return {"topup": PACKS, "subscription": TOPICS}.get(r["kind"], {}).get(r["ref"])


@app.get("/api/wallet")
def wallet(u=Depends(user)):
    uid = u["id"]
    with closing(db()) as c:
        rows = c.execute("SELECT * FROM tx WHERE user_id = ? ORDER BY id DESC LIMIT 50", (uid,)).fetchall()
        gifts = c.execute("""SELECT code, amount, redeemer IS NOT NULL AS redeemed FROM gifts
            WHERE sender = ? ORDER BY ts DESC""", (uid,)).fetchall()
        bal = c.execute("SELECT balance FROM users WHERE id = ?", (uid,)).fetchone()[0]
    tx = [{**dict(r), "title": title_of(r)} for r in rows]
    return {"balance": bal, "tx": tx, "packs": PACKS, "gifts": [dict(g) for g in gifts], "gift_amounts": GIFTS}


class TopupIn(BaseModel):
    pack: Literal[tuple(PACKS)]


@app.post("/api/wallet/topup")
def topup(body: TopupIn, u=Depends(user)):
    # ponytail: no payment gateway — wire a real PSP callback before this touches real money.
    with closing(db()) as c, c:
        move(c, u["id"], PACKS[body.pack]["amount"], "topup", body.pack)
    return wallet(u)


class GiftIn(BaseModel):
    amount: Literal[GIFTS]


class RedeemIn(BaseModel):
    code: str = Field(min_length=4, max_length=16)


@app.post("/api/gifts")
def send_gift(body: GiftIn, u=Depends(user)):
    code = "".join(secrets.choice(CODE_CHARS) for _ in range(8))
    with closing(db()) as c, c:
        move(c, u["id"], -body.amount, "gift_sent", code)
        c.execute("INSERT INTO gifts (code, amount, sender, ts) VALUES (?, ?, ?, ?)",
                  (code, body.amount, u["id"], time.time()))
    return {"code": code, **wallet(u)}


@app.post("/api/gifts/redeem")
def redeem_gift(body: RedeemIn, u=Depends(user)):
    code = re.sub(r"[\s-]", "", body.code.translate(DIGITS)).upper()
    with closing(db()) as c, c:
        cur = c.execute("UPDATE gifts SET redeemer = ? WHERE code = ? AND redeemer IS NULL AND sender != ?",
                        (u["id"], code, u["id"]))
        if cur.rowcount == 0:
            raise HTTPException(404, "invalid_code")
        amount = c.execute("SELECT amount FROM gifts WHERE code = ?", (code,)).fetchone()[0]
        move(c, u["id"], amount, "gift_received", code)
    return wallet(u)


# ---------- library & publishers ----------

@app.get("/api/library")
def library(u=Depends(user)):
    with closing(db()) as c:
        rows = c.execute("SELECT article_id FROM purchases WHERE user_id = ? AND active = 1 ORDER BY ts DESC",
                         (u["id"],)).fetchall()
        ids, topics = access(c, u["id"])
    return [summary(BY_ID[r[0]], ids, topics) for r in rows if r[0] in BY_ID]


@app.get("/api/publishers/stats")
def publisher_stats():
    # ponytail: counts per-article sales only; share subscription revenue per read once publishers sign on.
    with closing(db()) as c:
        live = dict(c.execute("SELECT article_id, COUNT(*) FROM purchases WHERE active = 1 GROUP BY article_id").fetchall())
    sold = {a["id"]: a["sold"] + live.get(a["id"], 0) for a in ARTICLES}
    pubs = {pid: {"id": pid, **p, "sales": 0, "gross": 0, "articles": 0} for pid, p in PUBLISHERS.items()}
    for a in ARTICLES:
        p = pubs[a["publisher"]]
        p["sales"] += sold[a["id"]]
        p["gross"] += sold[a["id"]] * a["price"]
        p["articles"] += 1
    for p in pubs.values():
        p["share"] = round(p["gross"] * PUBLISHER_SHARE)
    gross = sum(p["gross"] for p in pubs.values())
    top = sorted(ARTICLES, key=lambda a: -sold[a["id"]] * a["price"])[:5]
    return {
        "gross": gross,
        "publisher_share": round(gross * PUBLISHER_SHARE),
        "platform_share": gross - round(gross * PUBLISHER_SHARE),
        "sales": sum(sold.values()),
        "publishers": sorted(pubs.values(), key=lambda p: -p["gross"]),
        "top": [{"id": a["id"], "title": a["title"], "publisher": a["publisher"],
                 "revenue": sold[a["id"]] * a["price"]} for a in top],
    }
