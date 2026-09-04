"""
SportSphere real-time WebSocket connection manager.
Maintains active client connections and broadcasts chat messages and notifications in real time.
"""
from __future__ import annotations
import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Map profile_id -> list of active WebSockets (allows multiple tabs per user)
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, profile_id: str, websocket: WebSocket):
        await websocket.accept()
        if profile_id not in self.active_connections:
            self.active_connections[profile_id] = []
        self.active_connections[profile_id].append(websocket)

    def disconnect(self, profile_id: str, websocket: WebSocket):
        if profile_id in self.active_connections:
            if websocket in self.active_connections[profile_id]:
                self.active_connections[profile_id].remove(websocket)
            if not self.active_connections[profile_id]:
                del self.active_connections[profile_id]

    async def send_personal_message(self, profile_id: str, message: dict):
        if profile_id in self.active_connections:
            dead_sockets = []
            for ws in self.active_connections[profile_id]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                self.disconnect(profile_id, ws)

    async def broadcast_chat_message(self, recipient_id: str, payload: dict):
        await self.send_personal_message(recipient_id, {"type": "chat_message", "data": payload})

    async def broadcast_read_status(self, sender_id: str, conversation_id: str):
        await self.send_personal_message(sender_id, {"type": "messages_read", "conversation_id": conversation_id})

    async def broadcast_notification(self, user_id: str, notification: dict):
        clean_pid = user_id.replace("user-", "ath-") if user_id.startswith("user-") else user_id
        await self.send_personal_message(clean_pid, {"type": "notification", "data": notification})
        await self.send_personal_message(user_id, {"type": "notification", "data": notification})


WS_MANAGER = ConnectionManager()
