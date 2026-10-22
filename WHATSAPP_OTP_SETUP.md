# WhatsApp Verification Code — Setup Plan (Deferred)

Status: **Not implemented yet.** Parked while we focus on other pressing issues. Revisit this file when ready to build it.

## Current State (as of investigation)

- The signup/verify-account flow calls `send_verification_code(user)` in `backend/apps/users/views.py` (line ~55).
- Codes are generated securely (`secrets.choice`, hashed in DB) in `backend/apps/users/services/otp.py` (`generate_and_assign_code`, lines ~25-45).
- `get_otp_sender(channel)` (lines ~83-86) routes by channel:
  - `email` → `EmailOTPSender` — **real**, uses Django's `send_mail`, works today.
  - phone/WhatsApp → falls through to `ConsoleOTPSender`, which only does `logger.info(code)`. **No message is ever actually sent to the user.**
- `OTP_SENDER_BACKEND` setting exists in `settings.py` (~line 259-266) but currently has no effect for the phone channel — no real provider is wired up.
- No WhatsApp/Twilio/Meta credentials exist anywhere in `backend/.env` or `settings.py`.
- Celery is installed but not enabled (`CELERY_BROKER_URL` etc. commented out in settings.py ~269-274) — OTP sending is synchronous, not a background task.

## Decision

For **beta testing**, use an **unofficial WhatsApp library** (Baileys) instead of a paid provider. Once Msafiri Space is fully deployed / out of beta, **migrate to Meta's official WhatsApp Cloud API** (direct integration, not via a BSP like Twilio, to avoid markup fees).

Rationale: email OTP already works and is the safe fallback, but WhatsApp is the desired channel for launch. Unofficial libraries are free and fast to stand up for low-volume beta traffic; the risk (possible number ban, ToS violation) is acceptable short-term but not for production at scale.

## What's Needed to Build the Unofficial WhatsApp Integration

1. **Library choice: Baileys** (not `whatsapp-web.js`) — WebSocket-based, no headless Chromium needed, lighter to run than Puppeteer-driven alternatives.

2. **A dedicated WhatsApp number** — a separate SIM/number, not a personal daily-driver number. Contains the blast radius if the number ever gets flagged/banned.

3. **A small standalone Node.js service** (Baileys is JS-only, no viable Python port):
   - Authenticates once via QR code scan (from the WhatsApp app on the dedicated number).
   - Persists the auth/session folder to disk so restarts don't require re-scanning.
   - Exposes one internal endpoint, e.g. `POST /send-otp`, restricted to localhost/internal network traffic, secured with a shared secret. Django calls this — never expose it publicly.

4. **Process manager** (pm2, systemd, or Docker) to keep the Node service alive and auto-reconnect when WhatsApp drops the socket (happens periodically).

5. **New Django sender class** — slots into the existing `get_otp_sender()` switch in `backend/apps/users/services/otp.py`. POSTs `{phone, code}` to the internal Node endpoint instead of falling through to `ConsoleOTPSender`.

6. **Rate limiting** on outbound sends — bursty sends or messaging numbers with no prior chat history is what gets accounts flagged fastest.

7. **Logout/disconnect alerting** — WhatsApp sessions log themselves out periodically; need a way to know when to rescan the QR code rather than silently failing sends.

8. **Automatic fallback to email** if a WhatsApp send fails, so signups don't get stranded on the verify-account screen.

## Future Migration Path (Post-Beta)

- Swap the Node/Baileys sender for a `MetaWhatsAppCloudOTPSender` that calls Meta's Cloud API directly (official, requires Meta Business/developer account + phone number verification).
- `OTP_SENDER_BACKEND` setting is already the intended toggle point — no other architectural changes should be needed on the Django side beyond adding the new sender class.
- Remove/retire the Node/Baileys service once Cloud API is live.

## Key File References

- `backend/apps/users/services/otp.py` — OTP generation + sender routing (`get_otp_sender`, `ConsoleOTPSender`, `EmailOTPSender`)
- `backend/apps/users/views.py` (~line 55, ~396-435, ~457-476) — signup, confirm, resend endpoints
- `backend/msafiri/settings.py` (~259-274) — `OTP_SENDER_BACKEND` setting, commented-out Celery config
- `backend/.env` — no WhatsApp credentials present currently
