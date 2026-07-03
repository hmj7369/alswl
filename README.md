# SECTOR-7 // 통합관제 시스템

관제요원이 되어 CCTV 화면을 탐색하며 수상한 인물과 범죄 현장을 찾아내는
탐정형 인터랙티브 웹 앱. 순수 HTML / CSS / JavaScript 로만 제작 (의존성 없음).

## 실행
`index.html` 파일을 브라우저로 열기만 하면 됩니다.

## 조작
- 부팅 화면에서 **시스템 접속** 클릭 → 관제 화면 진입
- CCTV 셀을 클릭하면 해당 채널로 **확대 진입**
- 확대 화면에서 마우스를 움직이면 조사 가능한 **지점(핫스팟)**이 드러남
- 핫스팟 클릭 → 인물/단서 **정보 카드** (항목을 한 줄씩 분석)
- 특정 채널의 결정적 단서를 찾으면 **EVIDENCE DETECTED** 경보 발생
- `◂ 관제화면으로` 또는 `ESC` 로 복귀

## 내용 바꾸기
대부분 [`script.js`](script.js) 상단의 **CONFIG** 영역만 수정하면 됩니다.
- `BOOT_LINES` : 부팅 로그 문구
- `CHANNELS`   : CCTV 채널 목록 / 이미지 / 장소명 / 핫스팟(인물·단서) 좌표와 정보
  - `img: ""` 로 두면 CSS 더미 화면, 경로를 넣으면 해당 이미지 사용
  - `evidence: true` 인 핫스팟이 '사건 현장(결정적 단서)'
- 색감 톤은 [`style.css`](style.css) 상단 `:root` 변수에서 조정

이미지는 프로젝트 폴더에 넣고 `img` 경로만 바꾸면 교체됩니다.

## GitHub Pages 배포
1. 이 폴더를 GitHub 저장소로 푸시
2. 저장소 **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch**, Branch: `main` / `/(root)` 선택 후 Save
4. 잠시 후 `https://<사용자명>.github.io/<저장소명>/` 에서 접속

> 별도 빌드 과정이 없으므로 루트의 `index.html` 이 그대로 서비스됩니다.
