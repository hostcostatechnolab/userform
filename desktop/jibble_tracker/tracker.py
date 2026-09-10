"""Background thread: capture + upload a screenshot every N minutes while a
session is running."""

import threading
from datetime import datetime
from typing import Callable

from .api import Api
from .capture import grab_all_monitors

# Seconds after Start before the first screenshot.
FIRST_SHOT_DELAY = 8


class ScreenshotWorker(threading.Thread):
    def __init__(
        self,
        api: Api,
        *,
        org_id: str,
        session_id: str,
        task_id: str | None,
        interval_min: float,
        on_capture: Callable[[int, datetime], None],
        on_error: Callable[[str], None],
    ) -> None:
        super().__init__(daemon=True)
        self.api = api
        self.org_id = org_id
        self.session_id = session_id
        self.task_id = task_id
        self.interval = max(60.0, interval_min * 60.0)
        self.on_capture = on_capture
        self.on_error = on_error
        self._stop = threading.Event()
        self.count = 0

    def stop(self) -> None:
        self._stop.set()

    def run(self) -> None:
        if not self._stop.wait(FIRST_SHOT_DELAY):
            self._tick()
        while not self._stop.wait(self.interval):
            self._tick()

    def _tick(self) -> None:
        try:
            data, w, h = grab_all_monitors()
            self.api.upload_screenshot(
                self.org_id, self.session_id, self.task_id, data, w, h
            )
            self.count += 1
            self.on_capture(self.count, datetime.now())
        except Exception as e:  # keep the loop alive on transient failures
            self.on_error(str(e))
