import sys
from pathlib import Path

# routers, database, schemas를 flat import로 사용하기 위해 core/를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).parent / "core"))

from .api import app
