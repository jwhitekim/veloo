from __future__ import annotations
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None
_initialized = False


def get_supabase() -> Client | None:
    global _client, _initialized
    if not _initialized:
        _initialized = True
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
        if url and key:
            _client = create_client(url, key)
    return _client
