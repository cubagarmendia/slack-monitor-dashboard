"""
Slack Client Monitor — Dashboard API
FastAPI backend that serves data from the skill's JSON files.
"""
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

SKILL_DIR = Path("/home/ernesto/.openclaw/workspace/skills/slack-client-monitor")
SCRIPT = SKILL_DIR / "scripts" / "check-channels.py"

app = FastAPI(title="Slack Monitor Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_json(path: Path, default=None):
    try:
        return json.loads(path.read_text())
    except Exception:
        return default if default is not None else {}


def write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# GET /api/status
# ---------------------------------------------------------------------------
@app.get("/api/status")
def get_status():
    state = read_json(SKILL_DIR / "report-state.json", {})
    dismissed = read_json(SKILL_DIR / "dismissed.json", [])
    cache = read_json(SKILL_DIR / "pm-cache.json", {})
    config = read_json(SKILL_DIR / "config.json", {})

    posted_at = state.get("posted_at")
    items = state.get("items", [])
    channels = cache.get("channels", [])

    # Clean dismissed (7-day expiry)
    now = time.time()
    active_dismissed = [
        d for d in dismissed
        if now - d.get("dismissed_at", 0) < 7 * 86400
    ]

    return {
        "last_run_at": posted_at,
        "last_run_ago_hours": round((now - posted_at) / 3600, 1) if posted_at else None,
        "report_item_count": len(items),
        "dismissed_count": len(active_dismissed),
        "channel_count": len(channels),
        "cache_date": cache.get("date"),
    }


# ---------------------------------------------------------------------------
# GET /api/report
# ---------------------------------------------------------------------------
@app.get("/api/report")
def get_report():
    state = read_json(SKILL_DIR / "report-state.json", {})
    cache = read_json(SKILL_DIR / "pm-cache.json", {})
    dismissed = read_json(SKILL_DIR / "dismissed.json", [])
    now = time.time()

    dismissed_keys = {
        (d["channel_id"], d["thread_ts"]) for d in dismissed
        if now - d.get("dismissed_at", 0) < 7 * 86400
    }

    pms = cache.get("pms", {})
    # Build channel_name → pm info from cache
    channel_names = {v: k for k, v in {}}  # placeholder
    # channel_id → channel_name from pm-cache channels list
    channels_list = cache.get("channels", [])

    items = []
    for item in state.get("items", []):
        ch_id = item.get("channel_id", "")
        tts = item.get("thread_ts", "")
        msg_ts = item.get("message_ts", "")
        is_dismissed = (ch_id, tts) in dismissed_keys

        age_hours = round((now - float(tts)) / 3600, 1) if tts else None

        if age_hours and age_hours >= 24:
            bucket = "critical"
        elif age_hours and age_hours >= 6:
            bucket = "urgent"
        elif age_hours and age_hours >= 2:
            bucket = "warning"
        elif age_hours and age_hours >= 1:
            bucket = "recent"
        else:
            bucket = "very_recent"

        items.append({
            "channel_id": ch_id,
            "thread_ts": tts,
            "message_ts": msg_ts,
            "age_hours": age_hours,
            "bucket": bucket,
            "is_dismissed": is_dismissed,
            "slack_url": f"https://hellolitebox.slack.com/archives/{ch_id}/p{msg_ts.replace('.', '')}?thread_ts={tts}&cid={ch_id}" if msg_ts and tts else None,
        })

    return {
        "posted_at": state.get("posted_at"),
        "items": items,
    }


# ---------------------------------------------------------------------------
# GET /api/dismissed
# ---------------------------------------------------------------------------
@app.get("/api/dismissed")
def get_dismissed():
    dismissed = read_json(SKILL_DIR / "dismissed.json", [])
    now = time.time()
    active = [
        {**d, "age_hours": round((now - d.get("dismissed_at", 0)) / 3600, 1)}
        for d in dismissed
        if now - d.get("dismissed_at", 0) < 7 * 86400
    ]
    return {"items": active, "count": len(active)}


# ---------------------------------------------------------------------------
# DELETE /api/dismissed/{channel_id}/{thread_ts}
# ---------------------------------------------------------------------------
@app.delete("/api/dismissed/{channel_id}/{thread_ts}")
def revoke_dismissed(channel_id: str, thread_ts: str):
    dismissed = read_json(SKILL_DIR / "dismissed.json", [])
    original_len = len(dismissed)
    dismissed = [
        d for d in dismissed
        if not (d["channel_id"] == channel_id and d["thread_ts"] == thread_ts)
    ]
    if len(dismissed) == original_len:
        raise HTTPException(status_code=404, detail="Dismissed item not found")
    write_json(SKILL_DIR / "dismissed.json", dismissed)
    return {"ok": True, "removed": original_len - len(dismissed)}


# ---------------------------------------------------------------------------
# GET /api/config
# ---------------------------------------------------------------------------
@app.get("/api/config")
def get_config():
    config = read_json(SKILL_DIR / "config.json", {})
    # Remove sensitive tokens
    safe = {k: v for k, v in config.items() if k not in ("user_token", "bot_token", "app_token")}
    if "runn" in safe:
        safe["runn"] = {k: v for k, v in safe["runn"].items() if k != "token"}
    return safe


# ---------------------------------------------------------------------------
# PATCH /api/config
# ---------------------------------------------------------------------------
class ConfigUpdate(BaseModel):
    min_age_hours: float | None = None
    max_age_hours: float | None = None
    non_actionable_patterns: list[str] | None = None
    exclude_channels: list[str] | None = None
    include_channels: list[str] | None = None
    non_actionable_max_chars: int | None = None


@app.patch("/api/config")
def update_config(update: ConfigUpdate):
    config_path = SKILL_DIR / "config.json"
    config = read_json(config_path, {})
    changed = {}
    for field, value in update.model_dump(exclude_none=True).items():
        config[field] = value
        changed[field] = value
    write_json(config_path, config)
    return {"ok": True, "updated": changed}


# ---------------------------------------------------------------------------
# GET /api/channels
# ---------------------------------------------------------------------------
@app.get("/api/channels")
def get_channels():
    cache = read_json(SKILL_DIR / "pm-cache.json", {})
    config = read_json(SKILL_DIR / "config.json", {})
    pms = cache.get("pms", {})
    tls = cache.get("tls", {})
    channels = cache.get("channels", [])
    exclude = set(config.get("exclude_channels", []))

    result = []
    for ch in channels:
        if ch in exclude:
            continue
        pm_info = pms.get(ch, {})
        tl_info = tls.get(ch, {})
        result.append({
            "name": ch,
            "pm_email": pm_info.get("email"),
            "pm_slack_id": pm_info.get("slack_id"),
            "tl_email": tl_info.get("email"),
            "tl_slack_id": tl_info.get("slack_id"),
        })

    return {"channels": result, "count": len(result)}


# ---------------------------------------------------------------------------
# POST /api/run
# ---------------------------------------------------------------------------
@app.post("/api/run")
def run_check():
    try:
        result = subprocess.run(
            ["python3", str(SCRIPT)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Script timed out after 120s")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
