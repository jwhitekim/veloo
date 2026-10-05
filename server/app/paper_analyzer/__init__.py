import sys
from pathlib import Path

# core/ 모듈을 flat import로 사용하기 위해 패키지 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).parent))

from .api import app
