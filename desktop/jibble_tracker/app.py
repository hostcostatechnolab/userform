"""CustomTkinter desktop UI: login, project/task selection, and a Start/Stop
timer that records an activity session and uploads screenshots on an interval."""

from __future__ import annotations

import threading
import tkinter as tk
import tkinter.messagebox as mbox
import webbrowser
from datetime import datetime, timezone

import customtkinter as ctk

from . import config, store
from .api import Api, ApiError
from .tracker import ScreenshotWorker

NO_TASK = "— No task —"

ctk.set_appearance_mode("system")
ctk.set_default_color_theme("blue")


def _parse_iso(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


class App(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"{config.APP_NAME}  ·  {config.APP_VERSION}")
        self.geometry("420x560")
        self.minsize(400, 520)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self.container = ctk.CTkFrame(self, fg_color="transparent")
        self.container.pack(fill="both", expand=True, padx=16, pady=16)

        self.running = False  # set early so _on_close is safe on the config screen

        missing = config.missing_keys()
        if missing:
            self._config_error(missing)
            return

        self.api = Api()
        self.settings = store.load_settings()

        self.orgs: list[dict] = []
        self.org_id: str | None = None
        self.projects: list[dict] = []
        self.tasks: list[dict] = []

        self.session: dict | None = None
        self.start_ts: datetime | None = None
        self.worker: ScreenshotWorker | None = None
        self.shot_count = 0
        self.last_shot: datetime | None = None

        self._show_loading("Starting…")
        self._restore_or_login()

    def _config_error(self, missing: list[str]) -> None:
        self._clear()
        ctk.CTkLabel(
            self.container,
            text=config.APP_NAME,
            font=ctk.CTkFont(size=20, weight="bold"),
        ).pack(pady=(30, 8))
        ctk.CTkLabel(
            self.container,
            text=(
                "Backend is not configured.\n\n"
                "Create desktop/.env (copy .env.example) or set:\n"
                + "\n".join(f"  • {name}" for name in missing)
            ),
            justify="left",
            wraplength=340,
        ).pack(pady=6, padx=12)
        ctk.CTkButton(
            self.container, text="Quit", command=self.destroy
        ).pack(pady=16)

    # ---- view plumbing --------------------------------------------------
    def _clear(self) -> None:
        for child in self.container.winfo_children():
            child.destroy()

    def _call(self, fn) -> None:
        """Run a callable on the Tk main thread."""
        self.after(0, fn)

    def _run_bg(self, work, on_ok=None, on_err=None) -> None:
        def target():
            try:
                result = work()
            except Exception as e:  # noqa: BLE001
                msg = e.args[0] if isinstance(e, ApiError) and e.args else str(e)
                if on_err:
                    self._call(lambda: on_err(msg))
            else:
                if on_ok:
                    self._call(lambda: on_ok(result))

        threading.Thread(target=target, daemon=True).start()

    def _show_loading(self, text: str) -> None:
        self._clear()
        ctk.CTkLabel(self.container, text=text, font=ctk.CTkFont(size=14)).pack(
            expand=True
        )

    # ---- auth ---------------------------------------------------------
    def _restore_or_login(self) -> None:
        token = store.load_refresh_token()
        if not token:
            self._build_login()
            return

        self._show_loading("Signing you in…")
        self._run_bg(
            lambda: self.api.restore(token),
            on_ok=lambda rt: self._after_login(rt),
            on_err=lambda _msg: (store.save_refresh_token(None), self._build_login()),
        )

    def _build_login(self) -> None:
        self._clear()
        ctk.CTkLabel(
            self.container,
            text=config.APP_NAME,
            font=ctk.CTkFont(size=22, weight="bold"),
        ).pack(pady=(24, 4))
        ctk.CTkLabel(
            self.container,
            text="Sign in with your workspace account",
            text_color=("gray40", "gray60"),
        ).pack(pady=(0, 20))

        self.email_entry = ctk.CTkEntry(
            self.container, placeholder_text="Email", width=280
        )
        self.email_entry.pack(pady=6)
        self.pw_entry = ctk.CTkEntry(
            self.container, placeholder_text="Password", show="•", width=280
        )
        self.pw_entry.pack(pady=6)
        self.pw_entry.bind("<Return>", lambda _e: self._do_login())

        self.remember_var = tk.BooleanVar(value=self.settings.get("remember", True))
        ctk.CTkCheckBox(
            self.container, text="Keep me signed in", variable=self.remember_var
        ).pack(pady=(8, 4), anchor="w", padx=60)

        self.login_btn = ctk.CTkButton(
            self.container, text="Sign in", width=280, command=self._do_login
        )
        self.login_btn.pack(pady=14)

        self.login_err = ctk.CTkLabel(
            self.container, text="", text_color=("#b91c1c", "#f87171"), wraplength=280
        )
        self.login_err.pack()

        prefill = self.settings.get("email")
        if prefill:
            self.email_entry.insert(0, prefill)
            self.pw_entry.focus_set()
        else:
            self.email_entry.focus_set()

    def _do_login(self) -> None:
        email = self.email_entry.get().strip()
        pw = self.pw_entry.get()
        if not email or not pw:
            self.login_err.configure(text="Enter your email and password.")
            return
        self.login_btn.configure(state="disabled", text="Signing in…")
        self.login_err.configure(text="")

        def ok(refresh_token):
            store.save_settings(
                email=email, remember=bool(self.remember_var.get())
            )
            self._after_login(refresh_token)

        def err(msg):
            self.login_btn.configure(state="normal", text="Sign in")
            self.login_err.configure(text=msg)

        self._run_bg(lambda: self.api.sign_in(email, pw), on_ok=ok, on_err=err)

    def _after_login(self, refresh_token) -> None:
        if refresh_token and self.settings.get("remember", True):
            store.save_refresh_token(refresh_token)
        elif not self.settings.get("remember", True):
            store.save_refresh_token(None)

        self._show_loading("Loading your workspace…")
        self._run_bg(
            self.api.list_orgs,
            on_ok=self._on_orgs,
            on_err=lambda msg: self._fatal(msg),
        )

    def _on_orgs(self, orgs) -> None:
        if not orgs:
            self._fatal(
                "You are not a member of any workspace yet. "
                "Create or join one on the website first."
            )
            return
        self.orgs = orgs
        saved = self.settings.get("org_id")
        self.org_id = next((o["id"] for o in orgs if o["id"] == saved), orgs[0]["id"])
        self._build_main()
        self._load_projects()
        self._check_running_session()

    # ---- main view -------------------------------------------------
    def _build_main(self) -> None:
        self._clear()

        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x")
        ctk.CTkLabel(
            header,
            text=self.api.email or "Signed in",
            font=ctk.CTkFont(size=12, weight="bold"),
        ).pack(side="left")
        ctk.CTkButton(
            header, text="Sign out", width=70, height=24, fg_color="transparent",
            border_width=1, text_color=("gray30", "gray70"),
            command=self._sign_out,
        ).pack(side="right")
        ctk.CTkButton(
            header, text="Website", width=70, height=24, fg_color="transparent",
            border_width=1, text_color=("gray30", "gray70"),
            command=lambda: webbrowser.open(f"{config.WEBSITE_URL}/activity"),
        ).pack(side="right", padx=6)

        # org
        if len(self.orgs) > 1:
            ctk.CTkLabel(self.container, text="Workspace", anchor="w").pack(
                fill="x", pady=(16, 2)
            )
            self.org_menu = ctk.CTkOptionMenu(
                self.container,
                values=[o["name"] for o in self.orgs],
                command=self._on_org_change,
            )
            self.org_menu.set(self._org_name(self.org_id))
            self.org_menu.pack(fill="x")
        else:
            ctk.CTkLabel(
                self.container, text=self._org_name(self.org_id),
                text_color=("gray40", "gray60"), anchor="w",
            ).pack(fill="x", pady=(16, 0))

        # project
        ctk.CTkLabel(self.container, text="Project", anchor="w").pack(
            fill="x", pady=(16, 2)
        )
        prow = ctk.CTkFrame(self.container, fg_color="transparent")
        prow.pack(fill="x")
        self.project_menu = ctk.CTkOptionMenu(
            prow, values=["Loading…"], command=self._on_project_change
        )
        self.project_menu.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(prow, text="＋", width=36, command=self._add_project).pack(
            side="left", padx=(6, 0)
        )

        # task
        ctk.CTkLabel(self.container, text="Task", anchor="w").pack(
            fill="x", pady=(12, 2)
        )
        trow = ctk.CTkFrame(self.container, fg_color="transparent")
        trow.pack(fill="x")
        self.task_menu = ctk.CTkOptionMenu(trow, values=[NO_TASK])
        self.task_menu.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(trow, text="＋", width=36, command=self._add_task).pack(
            side="left", padx=(6, 0)
        )

        # interval
        ctk.CTkLabel(
            self.container, text="Screenshot every (minutes)", anchor="w"
        ).pack(fill="x", pady=(12, 2))
        self.interval_menu = ctk.CTkOptionMenu(
            self.container,
            values=[str(m) for m in config.INTERVAL_CHOICES],
            command=lambda v: store.save_settings(interval_min=int(v)),
        )
        self.interval_menu.set(str(self.settings.get("interval_min", config.DEFAULT_INTERVAL_MIN)))
        self.interval_menu.pack(fill="x")

        # start/stop
        self.toggle_btn = ctk.CTkButton(
            self.container, text="Start timer", height=44,
            font=ctk.CTkFont(size=15, weight="bold"), command=self._toggle,
        )
        self.toggle_btn.pack(fill="x", pady=(22, 8))

        self.elapsed_label = ctk.CTkLabel(
            self.container, text="00:00:00",
            font=ctk.CTkFont(size=26, weight="bold"),
        )
        self.elapsed_label.pack()
        self.status_label = ctk.CTkLabel(
            self.container, text="Not tracking", text_color=("gray40", "gray60")
        )
        self.status_label.pack(pady=(2, 0))

    def _org_name(self, org_id) -> str:
        return next((o["name"] for o in self.orgs if o["id"] == org_id), "Workspace")

    def _set_inputs_enabled(self, enabled: bool) -> None:
        state = "normal" if enabled else "disabled"
        for w in ("project_menu", "task_menu", "interval_menu"):
            widget = getattr(self, w, None)
            if widget is not None:
                widget.configure(state=state)
        if getattr(self, "org_menu", None):
            self.org_menu.configure(state=state)

    # ---- data loads ----------------------------------------------
    def _on_org_change(self, name: str) -> None:
        self.org_id = next((o["id"] for o in self.orgs if o["name"] == name), self.org_id)
        store.save_settings(org_id=self.org_id)
        self._load_projects()
        self._check_running_session()

    def _load_projects(self, select_id: str | None = None) -> None:
        want = select_id or self.settings.get("project_id")

        def ok(rows):
            self.projects = rows
            names = [p["name"] for p in rows] or ["(no projects)"]
            self.project_menu.configure(values=names)
            chosen = next((p for p in rows if p["id"] == want), rows[0] if rows else None)
            if chosen:
                self.project_menu.set(chosen["name"])
                self._on_project_change(chosen["name"])
            else:
                self.project_menu.set(names[0])

        self._run_bg(lambda: self.api.list_projects(self.org_id), on_ok=ok,
                     on_err=self._toast_err)

    def _current_project_id(self) -> str | None:
        name = self.project_menu.get()
        return next((p["id"] for p in self.projects if p["name"] == name), None)

    def _current_task_id(self) -> str | None:
        name = self.task_menu.get()
        if name == NO_TASK:
            return None
        return next((t["id"] for t in self.tasks if t["name"] == name), None)

    def _on_project_change(self, _name: str, select_id: str | None = None) -> None:
        pid = self._current_project_id()
        store.save_settings(project_id=pid)
        if not pid:
            self.tasks = []
            self.task_menu.configure(values=[NO_TASK])
            self.task_menu.set(NO_TASK)
            return
        want = select_id or self.settings.get("task_id")

        def ok(rows):
            self.tasks = rows
            self.task_menu.configure(values=[NO_TASK] + [t["name"] for t in rows])
            chosen = next((t for t in rows if t["id"] == want), None)
            self.task_menu.set(chosen["name"] if chosen else NO_TASK)

        self._run_bg(lambda: self.api.list_tasks(self.org_id, pid), on_ok=ok,
                     on_err=self._toast_err)

    def _add_project(self) -> None:
        dlg = ctk.CTkInputDialog(text="Project name", title="New project")
        name = (dlg.get_input() or "").strip()
        if not name:
            return
        self._run_bg(
            lambda: self.api.create_project(self.org_id, name),
            on_ok=lambda row: self._load_projects(select_id=row["id"]),
            on_err=self._toast_err,
        )

    def _add_task(self) -> None:
        pid = self._current_project_id()
        if not pid:
            self._toast_err("Pick a project first.")
            return
        dlg = ctk.CTkInputDialog(text="Task name", title="New task")
        name = (dlg.get_input() or "").strip()
        if not name:
            return
        self._run_bg(
            lambda: self.api.create_task(self.org_id, pid, name),
            on_ok=lambda row: self._on_project_change("", select_id=row["id"]),
            on_err=self._toast_err,
        )

    # ---- start / stop ------------------------------------------
    def _check_running_session(self) -> None:
        self._run_bg(
            lambda: self.api.get_running_session(self.org_id),
            on_ok=self._maybe_resume,
            on_err=lambda _m: None,
        )

    def _maybe_resume(self, sess) -> None:
        if not sess or self.running:
            return
        self.session = sess
        self.start_ts = _parse_iso(sess["started_at"])
        task = sess.get("task") or {}
        if sess.get("project"):
            self.settings["task_id"] = task.get("id")
            self._load_projects(select_id=sess["project"]["id"])
        self._enter_running_state(resumed=True, task_id=task.get("id"))

    def _toggle(self) -> None:
        if self.running:
            self._stop()
        else:
            self._start()

    def _start(self) -> None:
        pid = self._current_project_id()
        tid = self._current_task_id()
        self.toggle_btn.configure(state="disabled", text="Starting…")

        def ok(sess):
            self.session = sess
            self.start_ts = _parse_iso(sess["started_at"])
            self._enter_running_state(resumed=False, task_id=tid)

        def err(msg):
            self.toggle_btn.configure(state="normal", text="Start timer")
            self._toast_err(msg)

        self._run_bg(
            lambda: self.api.start_session(self.org_id, pid, tid), on_ok=ok, on_err=err
        )

    def _enter_running_state(self, resumed: bool, task_id: str | None = None) -> None:
        self.running = True
        self.shot_count = 0
        self.last_shot = None
        self._set_inputs_enabled(False)
        self.toggle_btn.configure(state="normal", text="Stop timer",
                                  fg_color=("#b91c1c", "#7f1d1d"),
                                  hover_color=("#991b1b", "#991b1b"))

        interval = int(self.interval_menu.get())
        self.worker = ScreenshotWorker(
            self.api,
            org_id=self.org_id,
            session_id=self.session["id"],
            task_id=task_id if task_id is not None else self._current_task_id(),
            interval_min=interval,
            on_capture=lambda n, ts: self._call(lambda: self._on_shot(n, ts)),
            on_error=lambda msg: self._call(lambda: self.status_label.configure(
                text=f"Upload failed: {msg[:60]}")),
        )
        self.worker.start()
        self._tick_clock()
        self.status_label.configure(
            text=("Resumed — capturing every " if resumed else "Capturing every ")
            + f"{interval} min"
        )

    def _stop(self) -> None:
        self.toggle_btn.configure(state="disabled", text="Stopping…")
        if self.worker:
            self.worker.stop()
            self.worker = None
        sess_id = self.session["id"] if self.session else None

        def done(_r=None):
            self.running = False
            self.session = None
            self.start_ts = None
            self._set_inputs_enabled(True)
            self.toggle_btn.configure(
                state="normal", text="Start timer",
                fg_color=("#3b8ed0", "#1f6aa5"), hover_color=("#36719f", "#144870"),
            )
            self.elapsed_label.configure(text="00:00:00")
            self.status_label.configure(text="Not tracking")

        if sess_id:
            self._run_bg(lambda: self.api.stop_session(sess_id), on_ok=done, on_err=lambda _m: done())
        else:
            done()

    def _on_shot(self, n: int, ts: datetime) -> None:
        self.shot_count = n
        self.last_shot = ts
        self.status_label.configure(
            text=f"{n} screenshot(s) · last {ts.strftime('%H:%M:%S')}"
        )

    def _tick_clock(self) -> None:
        if not self.running or not self.start_ts:
            return
        delta = datetime.now(timezone.utc) - self.start_ts
        total = max(0, int(delta.total_seconds()))
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        self.elapsed_label.configure(text=f"{h:02d}:{m:02d}:{s:02d}")
        self.after(1000, self._tick_clock)

    # ---- misc -----------------------------------------------
    def _toast_err(self, msg: str) -> None:
        if hasattr(self, "status_label"):
            self.status_label.configure(text=msg[:80])
        else:
            mbox.showerror(config.APP_NAME, msg)

    def _fatal(self, msg: str) -> None:
        self._clear()
        ctk.CTkLabel(
            self.container, text=msg, wraplength=320,
            text_color=("#b91c1c", "#f87171"),
        ).pack(expand=True, padx=10)
        ctk.CTkButton(
            self.container, text="Back to sign in",
            command=lambda: (store.save_refresh_token(None), self._build_login()),
        ).pack(pady=10)

    def _sign_out(self) -> None:
        if self.running:
            if not mbox.askyesno(config.APP_NAME, "Stop tracking and sign out?"):
                return
            self._stop()
        store.save_refresh_token(None)
        self._run_bg(self.api.sign_out)
        self._build_login()

    def _on_close(self) -> None:
        if self.running:
            if not mbox.askyesno(
                config.APP_NAME, "A timer is running. Stop it and quit?"
            ):
                return
            if self.worker:
                self.worker.stop()
            if self.session:
                try:
                    self.api.stop_session(self.session["id"])
                except Exception:
                    pass
        self.destroy()


def main() -> None:
    App().mainloop()
