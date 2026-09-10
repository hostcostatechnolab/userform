"""Tiny JSON persistence for user settings and the saved refresh token.

Note: session.json holds a Supabase refresh token in plain text under the user's
profile directory. For a hardened build, swap these helpers for the `keyring`
package.
"""

import json
from typing import Any

from . import config


def _read(path) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _write(path, data: dict) -> None:
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
    except OSError:
        pass


# ---- settings --------------------------------------------------------------
def load_settings() -> dict:
    s = _read(config.SETTINGS_FILE)
    s.setdefault("interval_min", config.DEFAULT_INTERVAL_MIN)
    s.setdefault("org_id", None)
    s.setdefault("project_id", None)
    s.setdefault("task_id", None)
    s.setdefault("remember", True)
    return s


def save_settings(**changes: Any) -> None:
    s = load_settings()
    s.update(changes)
    _write(config.SETTINGS_FILE, s)


# ---- saved login ---------------------------------------------------------
def load_refresh_token() -> str | None:
    return _read(config.SESSION_FILE).get("refresh_token")


def save_refresh_token(token: str | None) -> None:
    if token:
        _write(config.SESSION_FILE, {"refresh_token": token})
    else:
        try:
            config.SESSION_FILE.unlink(missing_ok=True)
        except OSError:
            pass
