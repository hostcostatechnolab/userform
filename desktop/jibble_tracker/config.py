"""Static configuration.

The Supabase URL + anon (publishable) key are read from the environment or from
a `desktop/.env` file (see `.env.example`). The anon key is safe to expose in a
client — Row Level Security is what protects the data — but it is kept out of the
repo so the backend isn't advertised.
"""

import os
from pathlib import Path

from . import __version__

APP_NAME = "Jibble Tracker"
APP_VERSION = __version__


def _load_dotenv() -> None:
    """Minimal .env loader (no dependency). Values already in the environment win."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()

SUPABASE_URL = os.environ.get("JIBBLE_SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("JIBBLE_SUPABASE_ANON_KEY", "")
WEBSITE_URL = os.environ.get("JIBBLE_WEBSITE_URL", "http://localhost:3001")

SCREENSHOT_BUCKET = "activity-screenshots"

# Local state (settings + saved login) lives outside the repo.
_base = os.environ.get("APPDATA") or os.environ.get("XDG_CONFIG_HOME")
CONFIG_DIR = Path(_base) / "jibble-tracker" if _base else Path.home() / ".jibble-tracker"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
SETTINGS_FILE = CONFIG_DIR / "settings.json"
SESSION_FILE = CONFIG_DIR / "session.json"

DEFAULT_INTERVAL_MIN = 5
INTERVAL_CHOICES = [1, 2, 3, 5, 10, 15]

# Screenshot encoding
MAX_SCREENSHOT_WIDTH = 2560
JPEG_QUALITY = 55


def missing_keys() -> list[str]:
    missing = []
    if not SUPABASE_URL:
        missing.append("JIBBLE_SUPABASE_URL")
    if not SUPABASE_ANON_KEY:
        missing.append("JIBBLE_SUPABASE_ANON_KEY")
    return missing
