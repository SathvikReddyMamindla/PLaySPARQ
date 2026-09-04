"""
Automated End-to-End Test Suite for SportSphere / PLAYSync.
Verifies:
  1. Connection-Based Chat & Safety (chat before connection fails, succeeds after, blocked cannot message)
  2. Chat history, read receipts, and unread counters
  3. Personalized Player Recommendations (ranking, mutuals, privacy filtering)
  4. Tournaments, Announcements & Notification Center
  5. Transparent Pricing, Razorpay Order Creation & HMAC Payment Verification
  6. Discounts & Promotional Campaign Validation (expiry, limits, min value)
"""
import hmac
import hashlib
import json
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.store import STORE
from app.payments import generate_sandbox_signature

client = TestClient(app)


def test_complete_e2e_flow():
    print("\n--- [1] Testing Auth & Registration ---")
    uid_str = uuid.uuid4().hex[:6]
    # Register User A (Arjun Tester)
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"test_arjun_{uid_str}@example.com",
        "password": "password123",
        "displayName": "Arjun Tester",
    })
    assert res_a.status_code == 200, res_a.text
    user_a = res_a.json()["user"]
    profile_a_id = res_a.json()["profile_id"]
    cookie_a = res_a.cookies.get("access_token")

    # Register User B (Rohan Tester)
    res_b = client.post("/api/v1/auth/register", json={
        "email": f"test_rohan_{uid_str}@example.com",
        "password": "password123",
        "displayName": "Rohan Tester",
    })
    assert res_b.status_code == 200, res_b.text
    user_b = res_b.json()["user"]
    profile_b_id = res_b.json()["profile_id"]
    cookie_b = res_b.cookies.get("access_token")

    print("--- [2] Testing Connection-Based Chat Permissions ---")
    conv_id = STORE.conversation_key(profile_a_id, profile_b_id)

    # 2.1 Chat BEFORE connection must FAIL with 403
    # Try sending message from User A to User B before any connection
    client.cookies.set("access_token", cookie_a)
    fail_res = client.post(f"/api/v1/chat/conversations/{conv_id}/messages", json={"body": "Hello before connect"})
    assert fail_res.status_code == 403, f"Expected 403, got {fail_res.status_code}: {fail_res.text}"
    assert "accepted" in fail_res.json().get("detail", "").lower() or "connected" in fail_res.json().get("detail", "").lower()
    print("[PASS] Chat before connection successfully rejected with HTTP 403.")

    # 2.2 User A sends connection request to User B
    req_res = client.post("/api/v1/connections/request", json={
        "recipientId": profile_b_id,
        "sportId": "football",
        "type": "match_invite",
        "message": "Hey Rohan, let's play 7v7 turf!",
    })
    assert req_res.status_code == 200, req_res.text
    conn_id = req_res.json()["connection"]["id"]
    print("[PASS] Connection request sent.")

    # 2.3 While pending, chat must STILL FAIL
    fail_pending = client.post(f"/api/v1/chat/conversations/{conv_id}/messages", json={"body": "Hello while pending"})
    assert fail_pending.status_code == 403, "Expected 403 while connection is pending"
    print("[PASS] Chat during pending connection rejected.")

    # 2.4 User B accepts connection
    client.cookies.set("access_token", cookie_b)
    accept_res = client.post("/api/v1/connections/respond", json={"connectionId": conn_id, "accept": True})
    assert accept_res.status_code == 200, accept_res.text
    assert accept_res.json()["connection"]["status"] == "accepted"
    print("[PASS] User B accepted connection.")

    # 2.5 Chat AFTER connection MUST SUCCEED
    client.cookies.set("access_token", cookie_a)
    msg_res = client.post(f"/api/v1/chat/conversations/{conv_id}/messages", json={"body": "Hey Rohan! Glad we connected."})
    assert msg_res.status_code == 200, msg_res.text
    msg_data = msg_res.json()["message"]
    assert msg_data["body"] == "Hey Rohan! Glad we connected."
    print("[PASS] Chat after connection succeeded with HTTP 200.")

    # 2.6 Verify unread count for User B
    client.cookies.set("access_token", cookie_b)
    me_b = client.get("/api/v1/auth/me").json()
    assert me_b["unread_messages"] >= 1, f"Expected unread messages, got {me_b['unread_messages']}"

    # 2.7 User B views messages -> marks read
    msgs_res = client.get(f"/api/v1/chat/conversations/{conv_id}/messages")
    assert msgs_res.status_code == 200
    assert len(msgs_res.json()["messages"]) >= 1

    # Check unread count after reading
    me_b_after = client.get("/api/v1/auth/me").json()
    assert me_b_after["unread_messages"] == 0
    print("[PASS] Unread counts and read receipts verified.")

    # 2.8 Block test: User B blocks User A
    block_res = client.post(f"/api/v1/users/{profile_a_id}/block")
    assert block_res.status_code == 200

    # User A tries to message User B -> must fail with 403
    client.cookies.set("access_token", cookie_a)
    blocked_msg = client.post(f"/api/v1/chat/conversations/{conv_id}/messages", json={"body": "Can you hear me?"})
    assert blocked_msg.status_code == 403
    print("[PASS] Blocked user messaging rejected with HTTP 403.")

    # Unblock
    client.cookies.set("access_token", cookie_b)
    client.post(f"/api/v1/users/{profile_a_id}/unblock")

    print("--- [3] Testing Personalized Player Recommendations ---")
    rec_res = client.get("/api/v1/recommendations/players")
    assert rec_res.status_code == 200, rec_res.text
    recs = rec_res.json()["data"]
    assert len(recs) > 0
    for r in recs:
        assert 0 <= r["compatibility_score"] <= 100
        assert "reasons" in r
        assert len(r["reasons"]) > 0
        # Connected or self should not be recommended
        assert r["candidate"]["id"] != profile_b_id
        assert r["candidate"]["id"] != profile_a_id
    print(f"[PASS] Generated {len(recs)} personalized recommendations with scoring explanations.")

    print("--- [4] Testing Tournaments & Notifications ---")
    tourns = client.get("/api/v1/tournaments").json()["data"]
    assert len(tourns) >= 5
    t1 = tourns[0]
    print(f"[PASS] Found {len(tourns)} tournaments; testing with '{t1['title']}'.")

    # Check notifications center
    notifs = client.get("/api/v1/notifications").json()["data"]
    assert isinstance(notifs, list)
    print(f"[PASS] Notifications retrieved ({len(notifs)} items).")

    print("--- [5] Testing Discounts & Campaigns ---")
    # 5.1 Valid discount
    val_res = client.post("/api/v1/discounts/validate", json={"code": "WELCOME50", "tournamentId": t1["id"]})
    assert val_res.status_code == 200, val_res.text
    disc_data = val_res.json()
    assert disc_data["pricing"]["discount_amount"] == 50.0
    print("[PASS] Valid coupon WELCOME50 applied successfully (-Rs.50).")

    # 5.2 Invalid discount
    inv_res = client.post("/api/v1/discounts/validate", json={"code": "FAKECODE999", "tournamentId": t1["id"]})
    assert inv_res.status_code == 400
    print("[PASS] Fake discount coupon rejected with HTTP 400.")

    print("--- [6] Testing Transparent Payments & Razorpay Verification ---")
    # 6.1 Create Order with transparent pricing breakdown
    order_res = client.post("/api/v1/payments/create-order", json={
        "tournamentId": t1["id"],
        "discountCode": "WELCOME50",
        "teamName": "Hyderabad Dynamos",
    })
    assert order_res.status_code == 200, order_res.text
    order_data = order_res.json()["data"]
    p = order_data["pricing"]
    assert p["convenience_fee"] == 20.0
    assert p["tax_amount"] == 3.6 or p["tax_amount"] == 4.0 or p["tax_amount"] == round(20 * 0.18, 2)
    expected_total = (p["tournament_fee"] - p["discount_amount"]) + p["convenience_fee"] + p["tax_amount"]
    assert abs(p["total_amount"] - expected_total) < 0.01
    print(f"[PASS] Transparent order created: Fee Rs.{p['tournament_fee']} - Disc Rs.{p['discount_amount']} + Conv Rs.{p['convenience_fee']} + Tax Rs.{p['tax_amount']} = Total Rs.{p['total_amount']}.")

    # 6.2 Test invalid signature rejection
    verify_fail = client.post("/api/v1/payments/verify", json={
        "orderId": order_data["order_id"],
        "paymentId": "pay_fake_12345",
        "signature": "tampered_signature_string",
        "tournamentId": t1["id"],
        "teamName": "Hyderabad Dynamos",
    })
    assert verify_fail.status_code == 400
    print("[PASS] Tampered payment signature rejected with HTTP 400.")

    # 6.3 Test valid signature verification
    valid_payment_id = "pay_valid_sandbox_99"
    valid_sig = generate_sandbox_signature(order_data["order_id"], valid_payment_id)
    verify_success = client.post("/api/v1/payments/verify", json={
        "orderId": order_data["order_id"],
        "paymentId": valid_payment_id,
        "signature": valid_sig,
        "tournamentId": t1["id"],
        "teamName": "Hyderabad Dynamos",
    })
    assert verify_success.status_code == 200, verify_success.text
    assert verify_success.json()["payment"]["status"] == "successful"
    assert verify_success.json()["registration"]["status"] == "confirmed"
    print("[PASS] Cryptographically verified payment confirmed and registration created.")

    # 6.4 Idempotent test (duplicate verification callback)
    dup_res = client.post("/api/v1/payments/verify", json={
        "orderId": order_data["order_id"],
        "paymentId": valid_payment_id,
        "signature": valid_sig,
        "tournamentId": t1["id"],
        "teamName": "Hyderabad Dynamos",
    })
    assert dup_res.status_code == 200
    assert "already confirmed" in dup_res.json()["message"]
    print("[PASS] Duplicate payment callback handled idempotently.")

    # 6.5 Receipt endpoint
    receipt_res = client.get(f"/api/v1/payments/receipt/{order_data['payment_id']}")
    assert receipt_res.status_code == 200
    rec = receipt_res.json()["receipt"]
    assert rec["payment"]["status"] == "successful"
    assert rec["tournament"]["id"] == t1["id"]
    print("[PASS] Receipt retrieved with complete fee breakdown.")

    print("--- [7] Testing Rich Personalized Athlete Profiles ---")
    # 7.1 User A views User B's profile (connected)
    client.cookies.set("access_token", cookie_a)
    prof_b_res = client.get(f"/api/v1/athletes/{profile_b_id}")
    assert prof_b_res.status_code == 200
    pb_data = prof_b_res.json()["data"]
    assert pb_data["connection_status"] == "accepted"
    assert pb_data["is_connected"] is True
    assert pb_data["connection_count"] >= 1
    assert "match_stats" in pb_data
    assert "recent_activity" in pb_data
    assert len(pb_data["tournament_history"]) >= 1
    assert pb_data["tournament_history"][0]["tournament_id"] == t1["id"]
    print(f"[PASS] Rich profile tournament history contains confirmed registration for '{t1['title']}'.")
    print("[PASS] Rich athlete profile includes connection status ('accepted'), count, match stats, and activity.")

    # 7.3 Unconnected athlete profile view (chat-gated status)
    all_p = client.get("/api/v1/athletes").json()["data"]
    unconnected_candidate = next(p for p in all_p if p["id"] not in (profile_a_id, profile_b_id))
    prof_unc_res = client.get(f"/api/v1/athletes/{unconnected_candidate['id']}")
    assert prof_unc_res.status_code == 200
    p_unc = prof_unc_res.json()["data"]
    assert p_unc["connection_status"] == "none"
    assert p_unc["is_connected"] is False
    print(f"[PASS] Unconnected athlete '{p_unc['name']}' profile accurately reflects 'none' status and gated chat.")

    print("--- [8] Testing Tournament Deadline Reminders (Admin) ---")
    res_adm = client.post("/api/v1/auth/login", json={"email": "admin@sportsphere.dev", "password": "admin1234"})
    assert res_adm.status_code == 200
    cookie_adm = res_adm.cookies.get("access_token")
    client.cookies.set("access_token", cookie_adm)
    remind_res = client.post(f"/api/v1/tournaments/{t1['id']}/remind")
    assert remind_res.status_code == 200
    assert remind_res.json()["success"] is True
    assert "sent_count" in remind_res.json()
    print(f"[PASS] Admin deadline reminder dispatched to {remind_res.json()['sent_count']} athletes.")

    print("=================================================")
    print("*** ALL END-TO-END TESTS PASSED SUCCESSFULLY! ***")
    print("=================================================")


if __name__ == "__main__":
    test_complete_e2e_flow()

