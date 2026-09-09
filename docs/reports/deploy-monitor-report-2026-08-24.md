# 배포 원격 확인 보고서 (deploy-monitor)

- 작성 시각(UTC): 2026-08-24T12:3x
- 대상 푸시 커밋: `fcb7764` (design: two-pane Todo layout, user menu popover, enlarge typography)
  - 동일 푸시 포함: `4c020c6`, `718d4ce`
- 최종 판정: **부분 실패 (GitHub Actions 성공 / 프로덕션 스모크 실패)**

---

## 1. GitHub Actions — "Deploy Veloo"

| 항목 | 값 |
|------|-----|
| 실행 URL | https://github.com/jwhitekim/my-research-hub/actions/runs/32727372971 |
| headSha | `fcb77644a4413e96f5c7fda08312eef17ac3059d` (= 푸시된 fcb7764) |
| status / conclusion | completed / **success** |
| 시작(created) | 2026-08-24T12:29:31Z |
| 종료(updated) | 2026-08-24T12:30:07Z |
| 소요 시간 | 약 36초 |

Job `deploy` 전 스텝 성공:
- Set up job — success
- Configure SSH — success
- Deploy — success
- Complete job — success

워크플로우 자체는 문제 없이 완료됨. `gh run view --log-failed` 대상 실패 스텝 없음.

## 2. 프로덕션 스모크 테스트

WebFetch로 아래 인증 불필요 경로를 테스트 시도(초기 1회 + 재시도 1회, 총 2회):

| 엔드포인트 | 결과 | 상태 코드 | 응답 시간 |
|-----------|------|----------|----------|
| https://veloo.page/ | 실패 (`getaddrinfo ENOTFOUND`) | 없음(연결 불가) | N/A |
| https://veloo.page/login | 실패 (`getaddrinfo ENOTFOUND`) | 없음(연결 불가) | N/A |
| https://veloo.page/api/me | 실패 (`getaddrinfo ENOTFOUND`) | 없음(연결 불가) | N/A |

3개 경로 모두 5xx/타임아웃이 아니라 **DNS 해석 실패**로 연결 자체가 성립하지 않음.

### 원인 확인 (DNS 조사)

DNS 해석 실패가 페치 도구(샌드박스) 국한 문제인지 실제 장애인지 구분하기 위해, AAAA (Address record)·CNAME (Canonical Name)·NS (Name Server) 레코드를 공용 리졸버로 직접 조회함:

```
dig +short A     veloo.page @1.1.1.1  > (없음)
dig +short AAAA  veloo.page @1.1.1.1  > (없음)
dig +short CNAME veloo.page @1.1.1.1  > (없음)
dig +short A     veloo.page @8.8.8.8  > (없음)
dig +short NS    veloo.page @1.1.1.1  >
    curitiba.ns.porkbun.com.
    fortaleza.ns.porkbun.com.
    maceio.ns.porkbun.com.
    salvador.ns.porkbun.com.
```

- **Cloudflare/8.8.8.8 두 공용 리졸버 모두** veloo.page 아펙스에 A/AAAA/CNAME 레코드가 **없음** — 특정 샌드박스 문제가 아니라 누구도 도메인을 IP로 해석할 수 없는 상태.
- 네임서버가 Cloudflare가 아닌 **porkbun 등록기관 기본 네임서버**로 남아 있음. CLAUDE.md상 배포 구조는 Docker + Cloudflare Tunnel인데, Cloudflare Tunnel 이 정상 동작하려면 도메인이 Cloudflare NS + 터널 CNAME(`*.cfargotunnel.com`)으로 구성돼야 함. 현재 해당 구성은 반영돼 있지 않음.

즉, 서버 컨테이너/배포 워크플로우와 무관하게 **공개 도메인 자체가 해석 불가**하여 사이트에 도달할 수 없음.

## 3. 최종 판정 및 후속 조치

- **판정: 부분 실패.** GitHub Actions deploy 워크플로우(fcb7764)는 정상 성공했으나, 프로덕션 스모크 테스트가 실패함. 원인은 앱 5xx가 아니라 **veloo.page 도메인의 공용 DNS 미해석**(A/AAAA/CNAME 부재, NS가 Cloudflare 아닌 porkbun).
- 지침에 따라 **자동 롤백을 시도하지 않음.** DNS/터널 구성 문제는 코드 롤백으로 해결되지 않을 가능성이 높으므로 사람의 판단이 필요함.
- 사람이 확인·조치할 사항(제안):
  1. veloo.page 네임서버가 Cloudflare로 이관됐는지 / 터널용 CNAME 레코드가 존재하는지 확인
  2. Cloudflare Tunnel(cloudflared) 및 nginx가 배포 서버에서 정상 기동 중인지 확인
  3. 위 조치 후 `https://veloo.page/`, `/login`, `/api/me` 재스모크
- 만약 사람이 코드 롤백이 필요하다고 판단하면, 롤백은 되돌리기 비용이 있는 액션이므로 **`approval-check` 절차**를 따라 승인 후 진행할 것.
- 참고: 만약 도메인 미해석이 일시적 전파 지연이었다면 위 3개 경로를 수동으로 재확인해 볼 것.
