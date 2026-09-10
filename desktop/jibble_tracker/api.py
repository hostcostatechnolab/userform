"""Thin wrapper around supabase-py. All calls run as the signed-in user, so
Row Level Security on the database + storage decides what is allowed."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from supabase import Client, create_client

from . import config


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ApiError(Exception):
    pass


class Api:
    def __init__(self) -> None:
        self.client: Client = create_client(
            config.SUPABASE_URL, config.SUPABASE_ANON_KEY
        )
        self.user_id: str | None = None
        self.email: str | None = None

    # ---- auth ----------------------------------------------------------
    def _remember(self, session) -> str | None:
        if session and getattr(session, "user", None):
            self.user_id = session.user.id
            self.email = session.user.email
        return getattr(session, "refresh_token", None) if session else None

    def sign_in(self, email: str, password: str) -> str | None:
        try:
            res = self.client.auth.sign_in_with_password(
                {"email": email.strip(), "password": password}
            )
        except Exception as e:  # gotrue raises AuthApiError
            raise ApiError(_clean(e)) from e
        return self._remember(res.session)

    def restore(self, refresh_token: str) -> str | None:
        try:
            res = self.client.auth.refresh_session(refresh_token)
        except Exception as e:
            raise ApiError(_clean(e)) from e
        return self._remember(res.session)

    def sign_out(self) -> None:
        try:
            self.client.auth.sign_out()
        except Exception:
            pass
        self.user_id = None
        self.email = None

    # ---- orgs / projects / tasks ------------------------------------
    def list_orgs(self) -> list[dict]:
        res = (
            self.client.table("org_members")
            .select("role, org:organizations(id, name)")
            .order("created_at")
            .execute()
        )
        out = []
        for row in res.data or []:
            org = row.get("org")
            if org:
                out.append({"id": org["id"], "name": org["name"], "role": row["role"]})
        return out

    def list_projects(self, org_id: str) -> list[dict]:
        res = (
            self.client.table("projects")
            .select("id, name")
            .eq("org_id", org_id)
            .eq("archived", False)
            .order("name")
            .execute()
        )
        return res.data or []

    def create_project(self, org_id: str, name: str) -> dict:
        res = (
            self.client.table("projects")
            .insert({"org_id": org_id, "name": name.strip()})
            .execute()
        )
        if not res.data:
            raise ApiError("Could not create project")
        return res.data[0]

    def list_tasks(self, org_id: str, project_id: str) -> list[dict]:
        res = (
            self.client.table("tasks")
            .select("id, name")
            .eq("org_id", org_id)
            .eq("project_id", project_id)
            .eq("archived", False)
            .order("name")
            .execute()
        )
        return res.data or []

    def create_task(self, org_id: str, project_id: str, name: str) -> dict:
        res = (
            self.client.table("tasks")
            .insert(
                {
                    "org_id": org_id,
                    "project_id": project_id,
                    "name": name.strip(),
                    "created_by": self.user_id,
                }
            )
            .execute()
        )
        if not res.data:
            raise ApiError("Could not create task")
        return res.data[0]

    # ---- activity sessions ----------------------------------------
    def get_running_session(self, org_id: str) -> dict | None:
        res = (
            self.client.table("activity_sessions")
            .select("*, project:projects(id,name), task:tasks(id,name)")
            .eq("org_id", org_id)
            .eq("user_id", self.user_id)
            .is_("ended_at", "null")
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def start_session(
        self, org_id: str, project_id: str | None, task_id: str | None
    ) -> dict:
        res = (
            self.client.table("activity_sessions")
            .insert(
                {
                    "org_id": org_id,
                    "user_id": self.user_id,
                    "project_id": project_id,
                    "task_id": task_id,
                    "started_at": _now_iso(),
                    "app_version": config.APP_VERSION,
                }
            )
            .execute()
        )
        if not res.data:
            raise ApiError("Could not start session")
        return res.data[0]

    def stop_session(self, session_id: str) -> None:
        self.client.table("activity_sessions").update(
            {"ended_at": _now_iso()}
        ).eq("id", session_id).execute()

    # ---- screenshots -------------------------------------------
    def upload_screenshot(
        self,
        org_id: str,
        session_id: str,
        task_id: str | None,
        jpeg_bytes: bytes,
        width: int,
        height: int,
    ) -> str:
        path = f"{self.user_id}/{org_id}/{uuid.uuid4().hex}.jpg"
        self.client.storage.from_(config.SCREENSHOT_BUCKET).upload(
            path,
            jpeg_bytes,
            {"content-type": "image/jpeg", "upsert": "false"},
        )
        self.client.table("screenshots").insert(
            {
                "org_id": org_id,
                "user_id": self.user_id,
                "session_id": session_id,
                "task_id": task_id,
                "captured_at": _now_iso(),
                "storage_path": path,
                "width": width,
                "height": height,
            }
        ).execute()
        return path


def _clean(err: Exception) -> str:
    msg = getattr(err, "message", None) or str(err)
    return msg.strip() or "Request failed"
