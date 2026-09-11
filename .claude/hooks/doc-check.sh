#!/usr/bin/env bash
# 껍데기. 내용은 ~/.claude/skills/todo-guard/scripts/doc-check.sh 에 한 벌만 둔다.
# 셸의 현재 위치가 서브폴더로 드리프트돼 있어도(예: cd frontend && npm run build 이후) 항상
# 프로젝트 루트 기준으로 돌게 cd 한다 — 안 그러면 doc-guard.py의 os.walk(".")가 엉뚱한
# 폴더를 스캔하거나, 훅 자체가 상대경로를 못 찾아 "No such file or directory"로 실패함.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")}" || exit 0
exec bash "$HOME/.claude/skills/todo-guard/scripts/doc-check.sh" "$@"
