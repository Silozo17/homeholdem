

# Fix: Missing Translations for OTP and Auth Screens

## Problem

The OTP verification screen and parts of the AuthForm use translation keys that either:
1. Reference the wrong namespace (`auth.check_email` instead of `otp.check_email`)
2. Don't exist at all in the translation files

This causes raw key strings like `auth.otp_enter_code` to display instead of readable text.

## Missing Key Mapping

| Code uses | Should map to (en.json) | Status |
|-----------|------------------------|--------|
| `auth.check_email` | `otp.check_email` | Wrong namespace |
| `auth.otp_sent_to` | `otp.code_sent_to` | Wrong namespace + wrong key name |
| `auth.otp_enter_code` | `otp.please_enter_code` | Wrong namespace + wrong key name |
| `auth.verify_create` | `otp.verify_create_account` | Wrong namespace + wrong key name |
| `auth.verifying` | `otp.verifying` | Wrong namespace |
| `auth.sending` | `otp.sending` | Wrong namespace |
| `auth.otp_invalid` | `otp.invalid_code` | Wrong namespace + wrong key name |
| `auth.otp_new_sent` | `otp.new_code_sent` | Wrong namespace + wrong key name |
| `auth.otp_resend_failed` | -- | Completely missing |
| `auth.resend_code` | `otp.resend_code` | Wrong namespace |
| `auth.resend_countdown` | `otp.resend_in` | Wrong namespace + wrong key name |
| `auth.account_created` | -- | Completely missing |
| `auth.otp_send_failed` | -- | Completely missing |
| `auth.otp_sent` | `otp.code_sent` | Wrong namespace + wrong key name |
| `auth.have_account` | `auth.already_have_account` | Wrong key name |
| `auth.signup_description` | `auth.join_club_description` | Wrong key name |

## Fix Approach

Rather than changing all the component code, add the missing keys directly into the `auth` section of both `en.json` and `pl.json`. This is simpler and avoids touching multiple component files.

**File: `src/i18n/locales/en.json`** -- Add to the `auth` section:
- `"check_email": "Check your email"`
- `"otp_sent_to": "We've sent a verification code to"`
- `"otp_enter_code": "Please enter the verification code"`
- `"verify_create": "Verify & Create Account"`
- `"verifying": "Verifying..."`
- `"sending": "Sending..."`
- `"otp_invalid": "Invalid verification code"`
- `"otp_new_sent": "New verification code sent"`
- `"otp_resend_failed": "Failed to resend code"`
- `"resend_code": "Resend code"`
- `"resend_countdown": "Resend in {{seconds}}s"`
- `"account_created": "Account created successfully!"`
- `"otp_send_failed": "Failed to send verification code"`
- `"otp_sent": "Verification code sent"`
- `"have_account": "Already have an account?"`
- `"signup_description": "Join your poker club and start playing"`

**File: `src/i18n/locales/pl.json`** -- Add equivalent Polish translations to the `auth` section.

## Summary

| File | Change |
|------|--------|
| `src/i18n/locales/en.json` | Add 16 missing keys to `auth` section |
| `src/i18n/locales/pl.json` | Add 16 matching Polish keys to `auth` section |

No component files need to change -- only the translation JSON files.
