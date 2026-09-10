"""Grab every monitor as a single JPEG."""

import io

import mss
from PIL import Image

from . import config


def grab_all_monitors() -> tuple[bytes, int, int]:
    with mss.mss() as sct:
        # monitors[0] is the virtual screen spanning all physical displays
        bbox = sct.monitors[0]
        raw = sct.grab(bbox)
        img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

    width, height = img.size
    if width > config.MAX_SCREENSHOT_WIDTH:
        ratio = config.MAX_SCREENSHOT_WIDTH / width
        img = img.resize(
            (config.MAX_SCREENSHOT_WIDTH, max(1, int(height * ratio))),
            Image.LANCZOS,
        )

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=config.JPEG_QUALITY, optimize=True)
    return buf.getvalue(), img.size[0], img.size[1]
