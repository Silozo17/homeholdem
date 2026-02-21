

# Auto-Enable Table Notifications for 15 Users

## What This Does

Inserts rows into `poker_table_watchers` for the table **"Texas Hold'em 24/7"** so all 15 listed users automatically have notifications enabled for that table.

**Note:** There is no table called "Poker Masters 24/7" in the database. The only 24/7 table is **"Texas Hold'em 24/7"** (`b9eb7f44-...`). This plan assumes that is the correct table.

## Data to Insert

| User | ID |
|------|-----|
| Kryniu | `01de4645-...` |
| Borys | `f1e0cfa9-...` |
| Matt R | `7e5a9aef-...` |
| Kuba | `7672bfb9-...` |
| Amir | `9255cdbf-...` |
| Puchar | `ac40d9b2-...` |
| Kris | `c122cd52-...` |
| BluffMeBaby | `744cd829-...` |
| Tomek | `4e6263f7-...` |
| Mikołaj | `b5959f31-...` |
| TimmyPoker | `9db2b9e1-...` |
| Julia | `8192d4fb-...` |
| Wuzet | `f3bb9039-...` |
| Breku | `70daebda-...` |
| Admin | `f42473bf-...` |

## Technical Detail

Single SQL INSERT into `poker_table_watchers` with `ON CONFLICT DO NOTHING` (safe to re-run). All 15 rows reference table `b9eb7f44-9bbc-4c2f-8fa6-5c4dfcafb985`.

No code changes, no schema changes, no navigation or UI changes.

