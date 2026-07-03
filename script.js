/* ============================================================
   SECTOR-7 통합관제 시스템 — 로직
   ────────────────────────────────────────────────────────────
   ▣ 내용을 바꾸려면 대부분 아래 CONFIG 영역만 수정하면 됩니다.
     - CCTV 화면 / 이미지 / 위치 이름
     - 화면 속 인물·단서 (핫스팟) 좌표와 정보
     - 어떤 채널에 '결정적 단서(사건 현장)'가 있는지
============================================================ */

/* ============================================================
   CONFIG 1) 부팅 로그 — 한 줄씩 타이핑되어 나타납니다.
============================================================ */
const BOOT_LINES = [
  "SECTOR-7 SURVEILLANCE GRID v3.1",
  "© MUNICIPAL CONTROL CENTER",
  "",
  "> 전원 공급 ............... OK",
  "> 코어 모듈 로드 .......... OK",
  "> 카메라 노드 동기화 ...... 12 채널 감지",
  "> 야간 모드 .............. 활성화",
  "> 무결성 검사 ............ 경고: CH-07 신호 불안정",
  "",
  "> 관제요원 인증 대기중...",
];

/* ============================================================
   CONFIG 1.5) 관제 시스템 보안 코드
   ────────────────────────────────────────────────────────────
   ACCESS_CODE : 이 코드를 입력해야 CCTV 관제 화면이 열립니다.
   ACCESS_HINT : 입력 화면 하단에 보이는 힌트(전시/발표용). 비우면 "" 로.
============================================================ */
const ACCESS_CODE = "7401";
const ACCESS_HINT = "야간 근무 코드: 7 4 0 1";   // 힌트를 숨기려면 "" 로 두세요.

/* ============================================================
   CONFIG 2) CCTV 채널 정의
   ────────────────────────────────────────────────────────────
   각 채널 옵션:
     id        : 채널 식별자 (예: "CH-01")
     location  : 화면에 표시될 장소명
     img       : 표시할 이미지 경로. 비워두면("") CSS 더미 화면이 나옵니다.
                 → 나중에 본인 이미지로 교체하세요 (예: "images/lobby.jpg")
     offline   : true 이면 'NO SIGNAL' 채널로 표시
     suspicious: true 이면 hover 시 미세하게 경고색 (노골적이지 않게)
     hotspots  : 확대 화면에서 조사 가능한 지점들 (인물/단서)
        x, y   : 화면 기준 퍼센트 좌표 (0~100). 중심점 기준입니다.
        type   : "person"(인물) 또는 "clue"(단서)
        evidence(선택): true 이면 이 지점이 '결정적 단서(사건 현장)'.
                        발견 시 EVIDENCE DETECTED 경보가 울립니다.
        person / clue 데이터는 아래 형식 참고.
============================================================ */
const CHANNELS = [
  {
    // 실제 사진: cctv/<채널id>.jpg 를 자동으로 불러옵니다(오프라인 채널 제외).
    // track: 사진 속 대상에 얹는 빨간 감지 박스 {x,y,w,h(%), label}
    id: "CH-01", location: "병원 로비", // cctv/ch-01.jpg (무인)
  },
  {
    id: "CH-02", location: "지하 주차장 B2", suspicious: true, // cctv/ch-02.jpg
    track: { x: 42, y: 45, w: 13, h: 30, label: "TRACKING" },
    hotspots: [
      {
        x: 48, y: 58, type: "person",
        trait: { key: "bag", label: "소지품", value: "왼쪽 어깨에 검은 크로스백" },
        person: {
          name: "검은 코트", age: "미상", status: "차량 사이 은신",
          lastSeen: "주차장 B2 / 23:41", suspicion: "중간",
          desc: "기둥 사이에서 움직임 포착. 자동 추적 시스템에 잡힘.",
        },
      },
    ],
  },
  {
    id: "CH-03", location: "폐병동 복도", // cctv/ch-03.jpg
    track: { x: 44, y: 40, w: 17, h: 34, label: "MOTION" },
    hotspots: [
      {
        x: 52, y: 56, type: "person",
        trait: { key: "gait", label: "걸음걸이", value: "다리를 끄는 듯한 빠른 걸음" },
        person: {
          name: "정체불명 형체", age: "미상", status: "빠르게 이동",
          lastSeen: "폐병동 복도 / 03:47", suspicion: "중간",
          desc: "복도 끝을 가로질러 사라짐. 잔상만 포착됨.",
        },
      },
    ],
  },
  { id: "CH-04", location: "옥상", }, // cctv/ch-04.jpg (무인)
  {
    id: "CH-05", location: "뒷문 골목", suspicious: true, // cctv/ch-05.jpg
    track: { x: 49, y: 51, w: 15, h: 26, label: "TRACKING" },
    hotspots: [
      {
        x: 56, y: 62, type: "person",
        trait: { key: "shoes", label: "신발", value: "밑창이 밝은 운동화" },
        person: {
          name: "신원 미상 #2", age: "20대 추정", status: "웅크린 자세",
          lastSeen: "뒷문 골목 / 02:47", suspicion: "중간",
          desc: "적재물 뒤에서 무언가를 뒤지는 중. CH-02의 인물과 동선이 겹침.",
        },
      },
    ],
  },
  {
    /* ★ 결정적 단서가 있는 채널 — 사건 현장 ★ */
    id: "CH-07", location: "창고 구역 / 신호 불안정", suspicious: true, // cctv/ch-07.jpg
    track: { x: 41, y: 39, w: 18, h: 46, label: "SUSPECT" },
    hotspots: [
      {
        x: 50, y: 60, type: "clue", evidence: true,
        trait: { key: "time", label: "이동 시간", value: "최종 목격 02:47 · 창고 구역", decisive: true },
        clue: {
          name: "정면을 응시하는 후드 인물",
          status: "미동 없음",
          lastSeen: "창고 구역 / 02:47",
          suspicion: "매우 높음",
          desc: "카메라를 정면으로 응시한 채 서 있음. 복장이 CH-02·CH-05의 인물과 동일.",
        },
      },
    ],
  },
  /* 분위기용 채널 */
  { id: "CH-06", location: "엘리베이터 홀", }, // cctv/ch-06.jpg (무인)
  {
    id: "CH-08", location: "엘리베이터 내부", suspicious: true, // cctv/ch-08.jpg
    track: { x: 34, y: 19, w: 28, h: 74, label: "SUSPECT" },
    hotspots: [
      {
        x: 48, y: 55, type: "person",
        trait: { key: "face", label: "인상착의", value: "마른 체형 · 20대 남성 추정" },
        person: {
          name: "후드 남성", age: "미상", status: "정면 응시",
          lastSeen: "엘리베이터 / 23:47", suspicion: "높음",
          desc: "좁은 엘리베이터 안에서 카메라를 응시. 창고의 인물과 동일 복장.",
        },
      },
    ],
  },
  { id: "CH-09", location: "지하철 승강장", }, // cctv/ch-09.jpg (무인)
  {
    id: "CH-10", location: "대형마트 매장", suspicious: true, // cctv/ch-10.jpg
    track: { x: 45, y: 42, w: 11, h: 21, label: "TRACKING" },
    hotspots: [
      {
        x: 45, y: 48, type: "person",
        trait: { key: "clothing", label: "의상", value: "검은 후드 집업 상의" },
        person: {
          name: "후드 인물", age: "미상", status: "매장 배회",
          lastSeen: "대형마트 / 03:17", suspicion: "높음",
          desc: "통로 중앙을 따라 카메라 쪽으로 접근. 자동 추적 시스템에 포착됨.",
        },
      },
    ],
  },
  { id: "CH-11", location: "복도 B", offline: true },
  { id: "CH-12", location: "관리사무소", offline: true },
];

/* ============================================================
   CONFIG 3) CCTV 장면 생성기 (SVG)
   ────────────────────────────────────────────────────────────
   각 장면은 320x180 좌표계에 그려지는 CCTV풍 SVG를 반환합니다.
   - 인물은 fig()/figCrouch()/figLying() 헬퍼로 실루엣을 그립니다.
   - 새 장면을 추가하려면 SCENES.이름 = function(){ return svgWrap(...) }
   - 위 CHANNELS 의 hotspots x/y(%)는 장면 속 인물 위치에 맞춰져 있습니다.
============================================================ */
function svgWrap(inner) {
  return '<svg class="scene-svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" '
       + 'xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
}
// 서 있는 인물 실루엣 (cx, 발끝y, 키, 색, 기울기)
function fig(cx, fy, h, fill, lean) {
  lean = lean || 0;
  var hr = h * 0.12, hcy = fy - h + hr, shY = hcy + hr * 1.5,
      hw = h * 0.17, fw = h * 0.10, tx = lean * h;
  return '<g fill="' + fill + '">'
    + '<ellipse cx="' + (cx + tx).toFixed(1) + '" cy="' + hcy.toFixed(1) + '" rx="' + hr.toFixed(1) + '" ry="' + (hr * 1.12).toFixed(1) + '"/>'
    + '<path d="M' + (cx - fw).toFixed(1) + ',' + fy.toFixed(1)
      + ' L' + (cx - hw + tx).toFixed(1) + ',' + shY.toFixed(1)
      + ' Q' + (cx + tx).toFixed(1) + ',' + (shY - hr * 0.6).toFixed(1) + ' ' + (cx + hw + tx).toFixed(1) + ',' + shY.toFixed(1)
      + ' L' + (cx + fw).toFixed(1) + ',' + fy.toFixed(1) + ' Z"/></g>';
}
// 웅크린 인물
function figCrouch(cx, fy, h, fill) {
  var hr = h * 0.15, hcy = fy - h * 0.72, shY = hcy + hr * 1.2, hw = h * 0.24, fw = h * 0.26;
  return '<g fill="' + fill + '">'
    + '<ellipse cx="' + cx + '" cy="' + hcy.toFixed(1) + '" rx="' + hr.toFixed(1) + '" ry="' + (hr * 1.05).toFixed(1) + '"/>'
    + '<path d="M' + (cx - fw) + ',' + fy + ' L' + (cx - hw) + ',' + shY.toFixed(1)
      + ' Q' + cx + ',' + (shY - hr * 0.6).toFixed(1) + ' ' + (cx + hw) + ',' + shY.toFixed(1)
      + ' L' + (cx + fw) + ',' + fy + ' Z"/></g>';
}
// 쓰러진(누운) 인물
function figLying(cx, cy, len, fill) {
  var hr = len * 0.13;
  return '<g fill="' + fill + '">'
    + '<ellipse cx="' + (cx - len * 0.5) + '" cy="' + cy + '" rx="' + hr.toFixed(1) + '" ry="' + (hr * 0.9).toFixed(1) + '"/>'
    + '<path d="M' + (cx - len * 0.4) + ',' + (cy - hr * 0.8)
      + ' L' + (cx + len * 0.5) + ',' + (cy - hr * 0.5)
      + ' Q' + (cx + len * 0.62) + ',' + cy + ' ' + (cx + len * 0.5) + ',' + (cy + hr * 0.5)
      + ' L' + (cx - len * 0.4) + ',' + (cy + hr * 0.8) + ' Z"/></g>';
}

// 빨간 감지/추적 박스 (범죄 대상 표시) — 레퍼런스의 빨간 사각형 느낌
function detectBox(x, y, w, h, label) {
  label = label || "TRACKING";
  var t = 6; // 모서리 눈금 길이
  return '<g stroke="#ff3b3b" stroke-width="1.4" fill="none" opacity="0.92">'
    + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>'
    + '<path d="M' + x + ',' + (y + t) + ' L' + x + ',' + y + ' L' + (x + t) + ',' + y + '" stroke-width="2"/>'
    + '<path d="M' + (x + w - t) + ',' + y + ' L' + (x + w) + ',' + y + ' L' + (x + w) + ',' + (y + t) + '" stroke-width="2"/>'
    + '<path d="M' + x + ',' + (y + h - t) + ' L' + x + ',' + (y + h) + ' L' + (x + t) + ',' + (y + h) + '" stroke-width="2"/>'
    + '<path d="M' + (x + w - t) + ',' + (y + h) + ' L' + (x + w) + ',' + (y + h) + ' L' + (x + w) + ',' + (y + h - t) + '" stroke-width="2"/>'
    + '</g>'
    + '<text x="' + x + '" y="' + (y - 3) + '" fill="#ff3b3b" font-size="7" font-family="monospace" opacity="0.9">' + label + '</text>';
}

const SCENES = {};

SCENES.lobby = function () {
  return svgWrap(
    '<rect width="320" height="180" fill="#0a120d"/>'
    + '<rect width="320" height="74" fill="#0e1a13"/>'
    + '<rect y="74" width="320" height="106" fill="#13241a"/>'
    + '<g stroke="rgba(120,220,170,0.09)" stroke-width="1">'
    + '<line x1="160" y1="74" x2="-20" y2="180"/><line x1="160" y1="74" x2="110" y2="180"/>'
    + '<line x1="160" y1="74" x2="210" y2="180"/><line x1="160" y1="74" x2="340" y2="180"/>'
    + '<line x1="0" y1="120" x2="320" y2="120" opacity="0.5"/></g>'
    + '<rect x="240" y="30" width="30" height="44" fill="#0a130d" stroke="rgba(120,220,170,0.12)"/>'
    + '<rect x="20" y="96" width="70" height="30" fill="#0c1712" stroke="rgba(120,220,170,0.10)"/>'
    + '<ellipse cx="150" cy="140" rx="78" ry="30" fill="#1e3a29" opacity="0.55"/>'
    + fig(150, 150, 66, "#05100b", 0.03)
  );
};

SCENES.parking = function () {
  return svgWrap(
    '<rect width="320" height="180" fill="#080f0b"/>'
    + '<rect y="70" width="320" height="110" fill="#0e1c14"/>'
    + '<g stroke="rgba(150,230,180,0.08)" stroke-width="1"><line x1="60" y1="180" x2="120" y2="90"/><line x1="250" y1="180" x2="200" y2="90"/></g>'
    + '<rect x="18" y="40" width="26" height="140" fill="#0b1610"/><rect x="278" y="40" width="26" height="140" fill="#0b1610"/>'
    + '<rect x="18" y="40" width="26" height="10" fill="#183327"/>'
    + '<g fill="#0c1913" stroke="rgba(150,230,180,0.10)"><path d="M60,150 Q64,120 96,118 L150,118 Q176,120 182,150 Z"/><rect x="92" y="121" width="70" height="16" rx="4" fill="#0a1710"/></g>'
    + '<g fill="#0b1712" stroke="rgba(150,230,180,0.08)"><path d="M210,152 Q214,128 240,126 L300,126 L300,152 Z"/></g>'
    + figCrouch(96, 150, 52, "#050d08")
    + '<g fill="#08150e" stroke="rgba(150,230,180,0.12)"><rect x="196" y="150" width="22" height="14" rx="3"/><path d="M199,150 Q207,142 215,150" fill="none"/></g>'
    + '<ellipse cx="207" cy="167" rx="16" ry="4" fill="#0a1811" opacity="0.6"/>'
  );
};

SCENES.stairwell = function () {
  var steps = '';
  for (var i = 0; i < 7; i++) {
    var x = 40 + i * 20, y = 150 - i * 16;
    steps += '<rect x="' + x + '" y="' + y + '" width="70" height="10" fill="' + (i % 2 ? '#122318' : '#0e1c14') + '" stroke="rgba(120,220,170,0.08)"/>';
  }
  return svgWrap(
    '<rect width="320" height="180" fill="#0a120d"/>'
    + '<rect width="200" height="180" fill="#0c160f"/>'
    + steps
    + '<line x1="150" y1="60" x2="250" y2="150" stroke="rgba(120,220,170,0.14)" stroke-width="2"/>'
    + '<line x1="150" y1="80" x2="250" y2="170" stroke="rgba(120,220,170,0.08)" stroke-width="2"/>'
    + fig(150, 120, 58, "#06110b", -0.04)
    + '<rect x="270" y="20" width="34" height="14" rx="2" fill="#123726"/><text x="287" y="31" fill="#3fae7a" font-size="9" text-anchor="middle" font-family="monospace">EXIT</text>'
  );
};

function corridorScene(figX, hooded) {
  var vpx = 172, vpy = 78;
  return svgWrap(
    '<rect width="320" height="180" fill="#0c160f"/>'
    + '<rect x="140" y="58" width="62" height="56" fill="#0f1f16" stroke="rgba(120,220,170,0.12)"/>'
    + '<g stroke="rgba(120,220,170,0.09)" stroke-width="1">'
    + '<line x1="0" y1="0" x2="' + vpx + '" y2="' + vpy + '"/><line x1="320" y1="0" x2="' + vpx + '" y2="' + vpy + '"/>'
    + '<line x1="0" y1="180" x2="' + vpx + '" y2="' + (vpy + 36) + '"/><line x1="320" y1="180" x2="' + vpx + '" y2="' + (vpy + 36) + '"/></g>'
    + '<rect x="150" y="20" width="40" height="6" fill="#24503a"/><rect x="122" y="6" width="20" height="4" fill="#1c3e2c"/>'
    + '<rect x="30" y="70" width="26" height="60" fill="#0a130d" stroke="rgba(120,220,170,0.10)"/>'
    + '<rect x="264" y="70" width="26" height="60" fill="#0a130d" stroke="rgba(120,220,170,0.10)"/>'
    + '<ellipse cx="' + vpx + '" cy="150" rx="60" ry="18" fill="#173325" opacity="0.5"/>'
    + fig(figX, 140, 60, hooded ? "#040a06" : "#06110b", 0.02)
  );
}
SCENES.corridor = function () { return corridorScene(150, true); };
SCENES.corridor2 = function () { return corridorScene(120, false); };

SCENES.warehouse = function () {
  var rack = function (x) {
    var s = '';
    for (var i = 0; i < 4; i++) s += '<rect x="' + x + '" y="' + (50 + i * 30) + '" width="46" height="6" fill="#12241a" stroke="rgba(120,220,170,0.08)"/>';
    return s + '<rect x="' + x + '" y="50" width="4" height="106" fill="#0c1811"/><rect x="' + (x + 42) + '" y="50" width="4" height="106" fill="#0c1811"/>';
  };
  return svgWrap(
    '<rect width="320" height="180" fill="#080f0b"/>'
    + '<rect y="120" width="320" height="60" fill="#0d1b13"/>'
    + rack(6) + rack(268)
    + '<rect x="120" y="46" width="80" height="70" fill="#0b1710" stroke="rgba(120,220,170,0.08)"/>'
    + '<g stroke="rgba(120,220,170,0.06)"><line x1="120" y1="60" x2="200" y2="60"/><line x1="120" y1="76" x2="200" y2="76"/><line x1="120" y1="92" x2="200" y2="92"/></g>'
    + '<path d="M235,120 Q195,130 150,138" fill="none" stroke="rgba(150,60,60,0.28)" stroke-width="3" stroke-dasharray="2 5"/>'
    + '<path d="M235,126 Q198,135 152,143" fill="none" stroke="rgba(120,180,150,0.10)" stroke-width="2" stroke-dasharray="1 6"/>'
    + '<ellipse cx="140" cy="146" rx="26" ry="7" fill="#1a0d0d" opacity="0.55"/>'
    + '<ellipse cx="160" cy="44" rx="90" ry="16" fill="#14281b" opacity="0.35"/>'
    + figLying(150, 138, 60, "#060f0a")
    + fig(238, 120, 54, "#050c07", 0.10)
    + detectBox(222, 74, 32, 48, "SUSPECT")
  );
};

SCENES.elevator = function () {
  return svgWrap(
    '<rect width="320" height="180" fill="#0a120d"/>'
    + '<rect x="40" width="240" height="180" fill="#0e1a13"/>'
    + '<rect x="96" y="30" width="128" height="150" fill="#101f16" stroke="rgba(120,220,170,0.12)"/>'
    + '<line x1="160" y1="30" x2="160" y2="180" stroke="rgba(120,220,170,0.16)" stroke-width="1.5"/>'
    + '<rect x="140" y="14" width="40" height="12" rx="2" fill="#06120b"/><text x="160" y="24" fill="#3fae7a" font-size="9" text-anchor="middle" font-family="monospace">B2</text>'
    + '<rect x="236" y="90" width="10" height="26" rx="2" fill="#0a170f" stroke="rgba(120,220,170,0.12)"/>'
    + '<ellipse cx="160" cy="176" rx="90" ry="12" fill="#16301f" opacity="0.4"/>'
  );
};

SCENES.gate = function () {
  var bars = '';
  for (var i = 0; i < 5; i++) bars += '<rect x="' + (70 + i * 40) + '" y="70" width="6" height="80" fill="#0e1c14" stroke="rgba(120,220,170,0.10)"/>';
  return svgWrap(
    '<rect width="320" height="180" fill="#0a120d"/>'
    + '<rect y="70" width="320" height="110" fill="#0f1d15"/><rect y="60" width="320" height="12" fill="#132719"/>'
    + bars
    + '<line x1="150" y1="120" x2="200" y2="120" stroke="rgba(120,220,170,0.16)" stroke-width="3"/>'
    + '<circle cx="175" cy="120" r="6" fill="#0c1811" stroke="rgba(120,220,170,0.16)"/>'
    + '<ellipse cx="175" cy="150" rx="70" ry="14" fill="#16301f" opacity="0.4"/>'
  );
};

SCENES.office = function () {
  return svgWrap(
    '<rect width="320" height="180" fill="#0a120d"/>'
    + '<rect width="320" height="80" fill="#0e1a13"/><rect y="80" width="320" height="100" fill="#122318"/>'
    + '<rect x="60" y="104" width="150" height="14" fill="#0c1712"/>'
    + '<rect x="66" y="118" width="10" height="46" fill="#0a140e"/><rect x="194" y="118" width="10" height="46" fill="#0a140e"/>'
    + '<rect x="150" y="78" width="44" height="30" rx="2" fill="#0a1710" stroke="rgba(120,220,170,0.12)"/><rect x="156" y="83" width="32" height="20" fill="#13301f"/>'
    + '<rect x="96" y="120" width="40" height="44" rx="8" fill="#0b160f"/>'
    + '<rect x="250" y="96" width="40" height="68" fill="#0c1712" stroke="rgba(120,220,170,0.08)"/><line x1="250" y1="120" x2="290" y2="120" stroke="rgba(120,220,170,0.08)"/><line x1="250" y1="142" x2="290" y2="142" stroke="rgba(120,220,170,0.08)"/>'
    + '<circle cx="40" cy="36" r="12" fill="#0a140e" stroke="rgba(120,220,170,0.14)"/><line x1="40" y1="36" x2="40" y2="28" stroke="rgba(120,220,170,0.3)"/><line x1="40" y1="36" x2="46" y2="36" stroke="rgba(120,220,170,0.3)"/>'
  );
};

// 대형마트 매장 (부감 CCTV) — 레퍼런스 구도: 통로 양옆 진열대,
// 중앙 통로로 다가오는 후드 인물 + 빨간 추적 박스
SCENES.mart = function () {
  var s = '<rect width="320" height="180" fill="#0c1712"/>';
  s += '<path d="M0,0 L320,0 L206,40 L114,40 Z" fill="#0e1c15"/>';
  s += '<g fill="#20452f"><rect x="66" y="10" width="30" height="4"/><rect x="150" y="6" width="24" height="3"/><rect x="224" y="10" width="30" height="4"/></g>';
  s += '<rect x="114" y="40" width="92" height="52" fill="#173021"/>';
  s += '<g stroke="rgba(150,220,180,0.09)"><line x1="114" y1="58" x2="206" y2="58"/><line x1="114" y1="74" x2="206" y2="74"/></g>';
  s += '<g fill="#102017" stroke="rgba(150,220,180,0.06)">';
  s += '<path d="M0,42 L114,50 L114,64 L0,58 Z"/><path d="M0,70 L114,72 L114,88 L0,86 Z"/>';
  s += '<path d="M0,102 L114,96 L114,114 L0,120 Z"/><path d="M0,140 L114,120 L114,140 L0,166 Z"/></g>';
  s += '<g fill="#102017" stroke="rgba(150,220,180,0.06)">';
  s += '<path d="M320,42 L206,50 L206,64 L320,58 Z"/><path d="M320,70 L206,72 L206,88 L320,86 Z"/>';
  s += '<path d="M320,102 L206,96 L206,114 L320,120 Z"/><path d="M320,140 L206,120 L206,140 L320,166 Z"/></g>';
  s += '<g fill="rgba(150,220,180,0.05)">';
  for (var i = 0; i < 22; i++) {
    var lx = (i * 53) % 100, ly = 46 + (i * 29) % 70;
    s += '<rect x="' + lx + '" y="' + ly + '" width="4" height="3"/><rect x="' + (300 - lx) + '" y="' + ly + '" width="4" height="3"/>';
  }
  s += '</g>';
  s += '<path d="M114,92 L92,180 L228,180 L206,92 Z" fill="#183024" opacity="0.55"/>';
  s += '<line x1="160" y1="92" x2="160" y2="180" stroke="rgba(150,220,180,0.07)"/>';
  s += fig(160, 152, 60, "#05100b", 0.02);
  s += detectBox(138, 96, 44, 60, "TRACKING");
  return svgWrap(s);
};

/* 채널의 시각 요소 렌더링.
   ▣ 실제 사진: 오프라인이 아닌 채널은 cctv/<채널id>.jpg 를 자동으로 불러와 표시.
      파일이 없으면(404) 생성 장면(scene) 또는 어두운 화면으로 폴백됩니다.
   ▣ track: 사진 위에 빨간 감지/추적 박스를 얹습니다(범죄 대상 표시).
   ▣ 특정 채널만 다른 경로를 쓰려면 CHANNELS 항목에 img:"경로.jpg" 를 지정하세요. */
function renderVisual(ch) {
  var base = (ch.scene && SCENES[ch.scene]) ? SCENES[ch.scene]() : '<div class="cctv-dummy"></div>';
  var src = ch.img || (!ch.offline ? "cctv/" + ch.id.toLowerCase() + ".jpg" : "");
  var photo = src
    ? '<img class="cctv-img photo" src="' + src + '" alt="" style="opacity:0" '
      + 'onload="this.style.opacity=1" onerror="this.remove()">'
    : "";
  var track = "";
  if (ch.track && !ch.offline) {
    var t = ch.track;
    track = '<div class="track-box" style="left:' + t.x + '%;top:' + t.y + '%;width:'
      + t.w + '%;height:' + t.h + '%"><span class="track-label">'
      + (t.label || "TRACKING") + '</span></div>';
  }
  return base + photo + track;
}

/* ============================================================
   여기서부터는 동작 로직 — 일반적으로 수정할 필요 없습니다.
============================================================ */

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ============================================================
   화면 맞춤 — 가상 캔버스(1000x600)를 모니터 화면 영역에 맞게 스케일.
   (style.css 의 .screen-content 크기와 동일하게 유지)
============================================================ */
const BASE_W = 1000, BASE_H = 600;
function fitScreen() {
  const ms = document.querySelector(".monitor-screen");
  const content = document.getElementById("screen-content");
  if (!ms || !content) return;
  const w = ms.clientWidth, h = ms.clientHeight;
  content.style.transform = `scale(${w / BASE_W}, ${h / BASE_H})`;
}

// 발견한 단서 추적 (전체 evidence/clue 개수 대비)
let totalCluesFound = 0;
const totalClues = CHANNELS.reduce(
  (n, ch) => n + (ch.hotspots ? ch.hotspots.filter(h => h.type === "clue").length : 0), 0
);
const foundSet = new Set();      // 이미 조사한 핫스팟 키
let evidenceTriggered = false;   // 사건 경보 1회 연출

/* ---------- 화면 전환 헬퍼 ---------- */
function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
  syncObjectivePanel(id);   // [추가] 목표 패널 표시/숨김 동기화
}

/* ============================================================
   [추가] 용의자 특징(단서) + Objective + Evidence Board
   ────────────────────────────────────────────────────────────
   각 CCTV(핫스팟)는 용의자의 특징을 하나씩 보여줍니다.
   플레이어가 특징을 발견하면 Objective 갱신 + Evidence Board 저장.
============================================================ */
const SUSPECT_TRAITS = [
  { key: "clothing", label: "의상" },
  { key: "bag",      label: "소지품" },
  { key: "shoes",    label: "신발" },
  { key: "gait",     label: "걸음걸이" },
  { key: "face",     label: "인상착의" },
  { key: "time",     label: "이동 시간" },
];
const traitsFound = {};   // key -> { label, value, chId, chLoc, time, decisive }

function traitOrder(key) {
  const i = SUSPECT_TRAITS.findIndex(t => t.key === key);
  return i < 0 ? 99 : i;
}

// 특징 발견 등록 (investigate 에서 호출)
function registerTrait(ch, hotspot) {
  const tr = hotspot.trait;
  if (!tr || traitsFound[tr.key]) return;
  const data = hotspot.clue || hotspot.person || {};
  const time = data.lastSeen ? data.lastSeen.split("/").pop().trim() : "--:--";
  traitsFound[tr.key] = {
    label: tr.label, value: tr.value,
    chId: ch.id, chLoc: ch.location, time: time,
    decisive: !!tr.decisive,
    img: ch.img || "cctv/" + ch.id.toLowerCase() + ".jpg",
  };
  updateObjective(tr);           // 목표 갱신 + 신규 단서 하이라이트
}

function traitsFoundCount() { return Object.keys(traitsFound).length; }
function allTraitsFound() { return traitsFoundCount() >= SUSPECT_TRAITS.length; }

// Objective 패널 내용 갱신
function updateObjective(newTrait) {
  const list = $("#obj-list");
  if (list) {
    list.innerHTML = SUSPECT_TRAITS.map(t => {
      const f = traitsFound[t.key];
      return `<li class="${f ? "obj-done" : ""}">
          <span class="obj-mark">${f ? "▣" : "▢"}</span>
          <span class="obj-key">${t.label}</span>
          <span class="obj-val">${f ? f.value : "미확인"}</span>
        </li>`;
    }).join("");
  }
  const prog = $("#obj-progress");
  if (prog) prog.textContent = traitsFoundCount() + " / " + SUSPECT_TRAITS.length;
  const hint = $("#obj-hint");
  if (hint) hint.textContent = allTraitsFound()
    ? "모든 특징 확보 · 사건 보고서를 제출하십시오"
    : "미확인 특징을 다른 CCTV에서 찾으십시오";

  // 신규 단서 발견 시 패널을 잠깐 강조
  if (newTrait) {
    const panel = $("#objective-panel");
    if (panel) { panel.classList.remove("flash"); void panel.offsetWidth; panel.classList.add("flash"); }
    // 모든 특징 확보 시 완료 안내 준비
    if (allTraitsFound()) investigationReady = true;
  }
}

// 목표 패널은 관제화면/확대화면에서만 표시
function syncObjectivePanel(id) {
  const panel = $("#objective-panel");
  if (!panel) return;
  panel.classList.toggle("show", id === "main-screen" || id === "detail-screen");
}

/* ============================================================
   [추가] AI 얼굴 대조 — 확보 단서로 생성된 후보 A~D 중 특정
   ────────────────────────────────────────────────────────────
   CCTV 화질이 낮아 얼굴은 흐릿함. 확보 단서(프로필)와 각 후보의
   얼굴/의상/키/체형을 대조해 일치하는 후보를 지목한다.
   후보는 서로 조금씩 다르며, 확보 단서와 모두 부합하는 후보는 하나뿐이다.
============================================================ */
const AI_CANDIDATES = [
  { id: "A", face: "40대 남성", clothing: "밝은 패딩",  height: "큼",   build: "보통", seed: 1 },
  { id: "B", face: "20대 남성", clothing: "검은 후드",  height: "보통", build: "마름", seed: 2, correct: true },
  { id: "C", face: "20대 남성", clothing: "검은 롱코트", height: "작음", build: "마름", seed: 3 },
  { id: "D", face: "30대 남성", clothing: "검은 후드",  height: "보통", build: "건장", seed: 4 },
];
// 대조 항목 정의: 어떤 확보 단서가 어떤 후보 속성의 '정답값'을 알려주는가
const AI_ATTRS = [
  { key: "face",     label: "얼굴", traitKey: "face", target: "20대 남성" },
  { key: "clothing", label: "의상", traitKey: "clothing", target: "검은 후드" },
  { key: "height",   label: "키",   traitKey: "gait", target: "보통" },
  { key: "build",    label: "체형", traitKey: "face", target: "마름" },
];
let confirmedSuspect = null;

// 확보 단서로 구성된 프로필(값이 있으면 확보, null 이면 미확보)
function aiProfile() {
  const p = {};
  AI_ATTRS.forEach(a => { p[a.key] = traitsFound[a.traitKey] ? a.target : null; });
  return p;
}

// 흐릿한 CCTV 얼굴(SVG) — 후보마다 조금씩 다르게, 저화질 느낌
function aiFace(c) {
  const skin = ["#6f6f6f", "#7b756e", "#5f5c58", "#726c64"][(c.seed - 1) % 4];
  const hood = c.clothing.indexOf("후드") >= 0;
  const bright = c.clothing.indexOf("밝") >= 0;
  const topCol = bright ? "#9a988f" : "#20242a";
  const w = c.build === "건장" ? 56 : c.build === "마름" ? 44 : 50;
  const hr = w * 0.42;
  return '<svg class="ai-face-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><filter id="b' + c.id + '"><feGaussianBlur stdDeviation="2.1"/></filter></defs>'
    + '<rect width="120" height="120" fill="#0c1310"/>'
    + '<g filter="url(#b' + c.id + ')">'
    + '<path d="M18,120 Q22,66 60,60 Q98,66 102,120 Z" fill="' + topCol + '"/>'
    + '<ellipse cx="60" cy="58" rx="' + hr.toFixed(0) + '" ry="26" fill="' + skin + '"/>'
    + (hood
        ? '<path d="M' + (60 - hr - 4) + ',54 Q60,16 ' + (60 + hr + 4) + ',54 L' + (60 + hr) + ',52 Q60,30 ' + (60 - hr) + ',52 Z" fill="' + topCol + '"/>'
        : '<ellipse cx="60" cy="40" rx="' + (hr + 2) + '" ry="15" fill="#2a2723"/>')
    + '<ellipse cx="51" cy="56" rx="4" ry="3" fill="#0e0f10"/><ellipse cx="69" cy="56" rx="4" ry="3" fill="#0e0f10"/>'
    + '<rect x="57" y="60" width="6" height="8" fill="rgba(0,0,0,0.22)"/>'
    + '<rect x="52" y="72" width="16" height="3" fill="rgba(0,0,0,0.3)"/>'
    + '</g></svg>';
}

function openAiScreen() {
  $("#invest-complete").classList.remove("show");
  buildAiScreen();
  showScreen("ai-screen");
}

function buildAiScreen() {
  const prof = aiProfile();
  // 확보 단서 프로필
  const pl = $("#ai-profile-list");
  if (pl) {
    pl.innerHTML = AI_ATTRS.map(a =>
      `<li>${a.label}: <b class="${prof[a.key] ? "" : "unk"}">${prof[a.key] || "미확보"}</b></li>`
    ).join("");
  }
  // 후보 카드
  const wrap = $("#ai-candidates");
  wrap.innerHTML = "";
  AI_CANDIDATES.forEach(c => {
    const card = document.createElement("div");
    card.className = "ai-card";
    card.innerHTML =
        `<div class="ai-face">
          <span class="ai-face-tag">Suspect ${c.id}</span>
          <span class="ai-face-q">LOW-RES</span>
          ${aiFace(c)}
         </div>
         <ul class="ai-attrs">
           ${AI_ATTRS.map(a => `<li data-attr="${a.key}"><span class="a-key">${a.label}</span><span class="a-val">${c[a.key]}</span></li>`).join("")}
         </ul>
         <button class="sys-btn ai-pick">▸ 이 후보 지목</button>`;
    card.querySelector(".ai-pick").addEventListener("click", () => selectCandidate(c, card));
    wrap.appendChild(card);
  });
  confirmedSuspect = null;
  const fb = $("#ai-feedback");
  fb.className = "ai-feedback";
  fb.textContent = "CCTV에서 확보한 단서 프로필과 대조해, 모든 항목이 일치하는 후보를 지목하십시오.";
  const btn = $("#ai-to-report");
  if (btn) btn.disabled = true;
}

function selectCandidate(c, card) {
  const prof = aiProfile();
  const fb = $("#ai-feedback");
  // 확보된 항목만 대조
  const mism = AI_ATTRS.filter(a => prof[a.key] && c[a.key] !== prof[a.key]);
  // 카드 표시 초기화
  $$("#ai-candidates .ai-card").forEach(el => el.classList.remove("matched", "rejected"));
  card.querySelectorAll(".ai-attrs li").forEach(li => li.classList.remove("match", "miss"));
  AI_ATTRS.forEach(a => {
    if (!prof[a.key]) return;
    const li = card.querySelector('.ai-attrs li[data-attr="' + a.key + '"]');
    if (li) li.classList.add(c[a.key] === prof[a.key] ? "match" : "miss");
  });

  if (mism.length > 0) {
    card.classList.add("rejected");
    fb.className = "ai-feedback err";
    fb.innerHTML = `Suspect ${c.id} 제외 — 확보 단서와 상충: <b>`
      + mism.map(a => a.label + "(" + prof[a.key] + " ≠ " + c[a.key] + ")").join(", ") + "</b>";
    $("#ai-to-report").disabled = true;
    confirmedSuspect = null;
  } else if (c.correct) {
    card.classList.add("matched");
    fb.className = "ai-feedback ok";
    fb.innerHTML = `Suspect ${c.id} 일치 — 확보 단서의 모든 항목이 부합합니다. 용의자로 특정.`;
    $("#ai-to-report").disabled = false;
    confirmedSuspect = c;
  } else {
    fb.className = "ai-feedback warn";
    fb.innerHTML = `Suspect ${c.id} — 확보한 단서만으로는 배제할 근거가 없습니다. `
      + `CCTV에서 단서를 더 확보해 후보를 좁히십시오.`;
    $("#ai-to-report").disabled = true;
    confirmedSuspect = null;
  }
}

/* ============================================================
   1) 부팅 시퀀스
============================================================ */
function runBoot() {
  // 대기(STANDBY) 표시 숨김
  const stby = $("#standby");
  if (stby) stby.style.display = "none";
  // 전원 켜지는 번쩍임
  const flash = $(".power-flash");
  flash.classList.add("on");

  const logEl = $("#boot-log");
  let line = 0, char = 0;

  // 번쩍임이 끝난 뒤 타이핑 시작
  setTimeout(typeNext, 750);

  function typeNext() {
    if (line >= BOOT_LINES.length) {
      // 부팅 완료 → 보안 코드 입력 화면으로
      setTimeout(openAuth, 800);
      return;
    }
    const text = BOOT_LINES[line];
    if (char <= text.length) {
      logEl.textContent =
        BOOT_LINES.slice(0, line).join("\n") +
        (line > 0 ? "\n" : "") +
        text.slice(0, char) + "▋";
      char++;
      setTimeout(typeNext, 14 + Math.random() * 26);
    } else {
      logEl.textContent =
        BOOT_LINES.slice(0, line + 1).join("\n");
      line++; char = 0;
      setTimeout(typeNext, text === "" ? 60 : 180);
    }
  }
}

/* ============================================================
   1.5) 보안 코드 인증
============================================================ */
let authTries = 0;

function openAuth() {
  showScreen("auth-screen");
  const hint = $("#auth-hint");
  if (hint) hint.textContent = ACCESS_HINT || "";
  const input = $("#auth-input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 60);
  }
}

function submitCode() {
  const input = $("#auth-input");
  const msg = $("#auth-msg");
  const val = (input.value || "").trim();
  if (!val) return;

  if (val === ACCESS_CODE) {
    // 인증 성공 → 화면 글리치 후 관제 그리드 오픈
    msg.className = "auth-msg ok";
    msg.textContent = "ACCESS GRANTED · 접속 허가";
    document.body.animate(
      [{ filter: "none" }, { filter: "brightness(2) hue-rotate(30deg)" }, { filter: "none" }],
      { duration: 200, iterations: 2 }
    );
    setTimeout(() => showScreen("briefing-screen"), 850);   // [변경] 인증 후 사건 브리핑
  } else {
    // 인증 실패 → 거부 + 흔들림
    authTries++;
    msg.className = "auth-msg err";
    msg.textContent = "ACCESS DENIED · 코드 불일치 (" + authTries + "회 실패)";
    const box = document.querySelector(".auth-box");
    if (box) { box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake"); }
    input.value = "";
    input.focus();
  }
}

/* ============================================================
   [추가] 사건 해결 시스템
   ────────────────────────────────────────────────────────────
   - CCTV(채널)를 확인할 때마다 markViewed() 로 기록.
   - 수상한 채널(용의자/단서 존재)은 evidenceLog 에 자동 저장.
   - 모든(오프라인 제외) 채널을 확인하면 Investigation Complete 안내 후
     Final Investigation 화면으로 진입.
   ※ 기존 로직은 수정하지 않고 openDetail 안에서 markViewed 만 호출합니다.
============================================================ */
// 용의자 이동 경로(사건 서사 순서) — 마지막이 사건 현장(CH-07)
const SUSPECT_PATH = ["CH-02", "CH-05", "CH-10", "CH-08", "CH-03", "CH-07"];

const viewedChannels = new Set();   // 확인한 채널 id
const evidenceLog = [];             // 자동 수집된 증거
let investigationReady = false;     // 모든 CCTV 확인 완료 여부
let completeShown = false;          // 완료 안내 1회만 노출

function viewableCount() {
  return CHANNELS.filter((c) => !c.offline).length;
}
function pathIdx(id) {
  const i = SUSPECT_PATH.indexOf(id);
  return i < 0 ? 99 : i;
}

// CCTV를 확인할 때마다 호출 (openDetail 내부에서 호출됨)
function markViewed(ch) {
  if (!ch || ch.offline) return;
  if (!viewedChannels.has(ch.id)) {
    viewedChannels.add(ch.id);
    collectEvidence(ch);
  }
  updateViewedCounter();
  if (!investigationReady && viewedChannels.size >= viewableCount()) {
    investigationReady = true;   // 관제화면 복귀 시 완료 안내 노출
  }
}

// 수상한 장면/단서만 증거로 자동 저장
function collectEvidence(ch) {
  const hs = (ch.hotspots || [])[0];
  if (!ch.suspicious && !hs) return;               // 특이사항 없는 채널은 제외
  const data = hs ? (hs.person || hs.clue) : null;
  const time = data && data.lastSeen ? data.lastSeen.split("/").pop().trim() : "--:--";
  evidenceLog.push({
    id: ch.id,
    location: ch.location,
    img: ch.img || "cctv/" + ch.id.toLowerCase() + ".jpg",
    time: time,
    name: data ? data.name : "특이 장면",
    note: data ? data.desc : "수상한 정황 포착됨.",
    suspicion: data ? data.suspicion : "-",
    isKey: !!(hs && hs.evidence),
  });
}

function updateViewedCounter() {
  const el = $("#viewed-counter");
  if (el) el.textContent = "확인 " + viewedChannels.size + " / " + viewableCount();
}

// 모든 CCTV 확인 → 완료 안내
function showInvestigationComplete() {
  if (completeShown) return;
  completeShown = true;
  $("#invest-complete").classList.add("show");
}

// Final Investigation 화면 열기 + 내용 구성
function openFinalScreen() {
  $("#invest-complete").classList.remove("show");
  buildFinalScreen();
  showScreen("final-screen");
}

function buildFinalScreen() {
  // ── 좌측: Evidence Board (특징 슬롯 6개) ──
  const board = $("#evidence-list");
  board.innerHTML = SUSPECT_TRAITS.map((t) => {
    const f = traitsFound[t.key];
    if (!f) {
      return `<div class="ev-card ev-locked">
          <div class="ev-thumb ev-thumb-lock">?</div>
          <div class="ev-info">
            <div class="ev-title">${t.label} · <span class="ev-miss">미확보</span></div>
            <p class="ev-note">해당 특징이 담긴 CCTV를 아직 확인하지 못했습니다.</p>
          </div>
        </div>`;
    }
    return `<div class="ev-card${f.decisive ? " ev-key" : ""}">
        <div class="ev-thumb" style="background-image:url('${f.img}')"></div>
        <div class="ev-info">
          <div class="ev-title">${t.label} · <b>${f.value}</b></div>
          <ul class="ev-fields">
            <li><span>출처 CCTV</span><b>${f.chId} · ${f.chLoc}</b></li>
            <li><span>발견 시간</span><b>${f.time}</b></li>
          </ul>
        </div>
      </div>`;
  }).join("");

  // ── 우측: 근거 목록 + 제출 대기 상태 ──
  const reason = $("#report-reason");
  reason.innerHTML = SUSPECT_TRAITS.map((t) => {
    const f = traitsFound[t.key];
    return `<li class="${f ? "" : "reason-missing"}">
        <span class="r-mark">${f ? "✓" : "—"}</span>
        <span class="r-text">${t.label}: ${f ? f.value + " <em>(" + f.chId + ")</em>" : "미확보"}</span>
      </li>`;
  }).join("");

  const verdict = $("#report-verdict");
  verdict.className = "report-verdict";
  verdict.innerHTML = confirmedSuspect
    ? `AI 얼굴 대조 결과 <b>Suspect ${confirmedSuspect.id}</b> 일치 · 수집된 특징 `
      + `<b>${traitsFoundCount()} / ${SUSPECT_TRAITS.length}</b>. 근거를 확인하고 보고서를 제출하십시오.`
    : `AI 얼굴 대조로 용의자를 먼저 특정하십시오.`;
  const btn = $("#report-submit");
  if (btn) { btn.disabled = false; btn.textContent = "▸ 사건 보고서 제출"; }
}

// 증거 기반 보고서 제출 → AI 대조로 용의자를 특정했을 때만 성립
function submitReport() {
  const verdict = $("#report-verdict");
  if (!confirmedSuspect) {
    verdict.className = "report-verdict err";
    verdict.innerHTML = `<div class="verdict-title">특정 미완료 · 제출 반려</div>`
      + `<p class="verdict-summary">AI 얼굴 대조에서 확보 단서와 일치하는 후보를 먼저 지목하십시오.</p>`;
    return;
  }
  if (allTraitsFound()) {
    const scene = CHANNELS.find((c) => c.id === "CH-07");
    const keyHs = scene && scene.hotspots ? scene.hotspots.find((h) => h.evidence) : null;
    const clue = keyHs ? keyHs.clue : {};
    const t = traitsFound["time"] || {};
    const proof = SUSPECT_TRAITS.map((x) => traitsFound[x.key])
      .map((f) => f.label + "(" + f.value + ")").join(", ");
    verdict.className = "report-verdict ok";
    verdict.innerHTML =
        `<div class="verdict-title">사건 종결 · 용의자 특정 완료</div>`
      + `<ul class="report-body">`
      + `<li><span>사건 번호</span><b>CASE-S7-0714</b></li>`
      + `<li><span>사건 시간</span><b>${t.time || "02:47"}</b></li>`
      + `<li><span>사건 장소</span><b>${scene ? scene.location : "-"}</b></li>`
      + `<li><span>최종 용의자</span><b class="susp">후드 인물 (검은 코트)</b></li>`
      + `<li><span>결정적 증거</span><b>${clue.name || "-"}</b></li>`
      + `</ul>`
      + `<p class="verdict-summary">서로 다른 CCTV에서 확인된 <b>${proof}</b> 특징이 모두 일치함. `
      + `AI 얼굴 대조 결과 <b>Suspect ${confirmedSuspect ? confirmedSuspect.id : "-"}</b> 와 부합. `
      + `동일 인물이 여러 감시 구역을 이동한 뒤 창고 구역에서 결정적으로 포착됨. `
      + `수집된 증거만으로 동일 인물임이 증명되어 용의자로 특정함.</p>`;
    const btn = $("#report-submit");
    if (btn) { btn.textContent = "▣ 보고서 제출 완료"; btn.disabled = true; }
    document.body.animate(
      [{ filter: "none" }, { filter: "brightness(1.6) hue-rotate(20deg)" }, { filter: "none" }],
      { duration: 220, iterations: 2 }
    );
  } else {
    const missing = SUSPECT_TRAITS.filter((t) => !traitsFound[t.key]).map((t) => t.label).join(", ");
    verdict.className = "report-verdict err";
    verdict.innerHTML =
        `<div class="verdict-title">증거 불충분 · 제출 반려</div>`
      + `<p class="verdict-summary">확보 ${traitsFoundCount()} / ${SUSPECT_TRAITS.length}. `
      + `미확보 특징: <b>${missing}</b>. 해당 특징이 담긴 CCTV를 확인한 뒤 다시 제출하십시오.</p>`;
  }
}

/* ============================================================
   2) CCTV 그리드 생성
============================================================ */
function buildGrid() {
  const grid = $("#cctv-grid");
  grid.innerHTML = "";

  CHANNELS.forEach((ch, idx) => {
    const cell = document.createElement("div");
    cell.className = "cctv";
    if (ch.offline) cell.classList.add("offline");
    if (ch.suspicious) cell.classList.add("suspicious");
    cell.dataset.index = idx;

    cell.innerHTML = `
      ${renderVisual(ch)}
      <div class="cctv-noise"></div>
      <div class="cctv-meta">
        <span class="cctv-ch">${ch.id}</span>
        <span class="cctv-loc">${ch.location}</span>
      </div>
      <div class="cctv-time" data-clock>--:--:--</div>
    `;

    // 오프라인 채널은 진입 불가
    if (!ch.offline) {
      cell.addEventListener("click", () => openDetail(idx));
    }
    grid.appendChild(cell);
  });

  updateEvidenceCounter();
}

/* ============================================================
   3) 상세(확대) 화면
============================================================ */
function openDetail(idx) {
  const ch = CHANNELS[idx];
  markViewed(ch);   // [추가] 확인한 CCTV 기록 + 증거 자동 수집
  const scene = $("#detail-scene");
  $("#detail-label").textContent = ch.id + " / " + ch.location;

  scene.innerHTML = `
    ${renderVisual(ch)}
    <div class="cctv-noise"></div>
    <div class="detail-stamp">
      <span>${ch.id} · ${ch.location}</span>
      <span class="detail-time" data-clock>--:--:--</span>
    </div>
  `;

  // 핫스팟 배치
  (ch.hotspots || []).forEach((h, hIdx) => {
    const key = ch.id + ":" + hIdx;
    const dot = document.createElement("div");
    dot.className = "hotspot " + (h.type === "clue" ? "clue" : "person");
    if (foundSet.has(key)) dot.classList.add("found");
    dot.style.left = h.x + "%";
    dot.style.top  = h.y + "%";
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      investigate(ch, h, key, dot);
    });
    scene.appendChild(dot);
  });

  $("#detail-hint").textContent = (ch.hotspots && ch.hotspots.length)
    ? "화면 위로 마우스를 움직여 이상 지점을 탐지하십시오..."
    : "특이사항 없음. 다른 채널을 확인하십시오.";

  showScreen("detail-screen");
}

/* ============================================================
   4) 핫스팟 조사 → 정보 카드 / 사건 경보
============================================================ */
function investigate(ch, hotspot, key, dotEl) {
  const isClue = hotspot.type === "clue";

  // 처음 발견하는 단서면 카운트
  if (isClue && !foundSet.has(key)) {
    totalCluesFound++;
    updateEvidenceCounter();
  }
  foundSet.add(key);
  if (dotEl) dotEl.classList.add("found");

  // [추가] 용의자 특징 발견 → Objective/Evidence Board 갱신
  registerTrait(ch, hotspot);

  // 정보 카드 사진으로 해당 채널 이미지를 사용
  const data = isClue ? hotspot.clue : hotspot.person;
  data._photo = ch.img || "";

  // 결정적 단서(사건 현장)면 경보 우선 연출
  if (hotspot.evidence && !evidenceTriggered) {
    evidenceTriggered = true;
    triggerCaseAlert(hotspot);
    return;
  }

  openInfoCard(data, isClue);
}

/* ---------- 정보 카드: 항목을 한 줄씩 '분석'하며 공개 ---------- */
function openInfoCard(data, isClue) {
  const wrap = $("#info-card-wrap") || $("#info-card");
  $("#card-name").textContent = data.name || "UNKNOWN";

  // 사진: 인물/단서가 속한 채널 이미지를 흐릿하게 사용 (없으면 더미 톤)
  $("#card-photo").style.backgroundImage =
    data._photo ? `url(${data._photo})` : "linear-gradient(135deg,#0a1a12,#04110b)";

  // 표시할 항목 구성 (순서대로 하나씩 공개)
  const fields = [];
  if (!isClue && data.age)   fields.push(["나이", data.age]);
  if (data.status)           fields.push(["상태", data.status]);
  if (data.lastSeen)         fields.push(["마지막 목격", data.lastSeen]);
  if (data.suspicion)        fields.push(["의심도", data.suspicion, suspClass(data.suspicion)]);

  const ul = $("#card-fields");
  ul.innerHTML = "";
  fields.forEach(([k]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="k">${k}</span><span class="v locked">█████</span>`;
    ul.appendChild(li);
  });

  $("#card-desc").textContent = "";
  $("#card-desc").dataset.full = data.desc || "";

  // '다음 항목 분석' 버튼으로 한 줄씩 해독
  let revealed = 0;
  const btn = $("#card-analyze");
  btn.classList.remove("hidden");
  btn.textContent = "▸ 다음 항목 분석";

  btn.onclick = () => {
    if (revealed < fields.length) {
      const li = ul.children[revealed];
      const [, val, cls] = fields[revealed];
      const v = li.querySelector(".v");
      v.textContent = val;
      v.classList.remove("locked");
      if (cls) v.classList.add(cls);
      revealed++;
      if (revealed === fields.length) btn.textContent = "▸ 정밀 메모 확인";
    } else {
      // 마지막: 설명문 타이핑
      typeInto($("#card-desc"), $("#card-desc").dataset.full);
      btn.classList.add("hidden");
    }
  };

  $("#info-card").classList.add("show");
}

function suspClass(s) {
  if (/매우 높음|높음/.test(s)) return "susp-high";
  if (/중간/.test(s)) return "susp-mid";
  return "";
}

// 설명문을 한 글자씩 출력
function typeInto(el, text) {
  el.textContent = "";
  let i = 0;
  (function step() {
    if (i <= text.length) { el.textContent = text.slice(0, i++); setTimeout(step, 18); }
  })();
}

/* ============================================================
   5) 사건 발견 경보
============================================================ */
function triggerCaseAlert(hotspot) {
  const data = hotspot.clue || hotspot.person || {};
  $("#case-title").textContent = "EVIDENCE DETECTED";
  $("#case-sub").innerHTML =
    `결정적 단서 확보: <b>${data.name || "UNKNOWN"}</b><br>` +
    `위치: ${data.lastSeen || "-"} · 의심도: ${data.suspicion || "-"}<br>` +
    `사건 현장으로 추정됨. 보고서를 확인하십시오.`;

  // 화면 전체 짧은 글리치
  document.body.animate(
    [{ filter: "none" }, { filter: "invert(0.25) hue-rotate(40deg)" }, { filter: "none" }],
    { duration: 220, iterations: 2 }
  );

  $("#case-alert").classList.add("show");
}

/* ============================================================
   카운터 / 시계
============================================================ */
function updateEvidenceCounter() {
  $("#evidence-counter").textContent = `단서 ${totalCluesFound} / ${totalClues}`;
}

function tickClock() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const el = $("#clock"); if (el) el.textContent = t;
  // 각 CCTV 셀의 시간도 살짝 다르게(±몇 초) 보여 진짜 같게
  $$("[data-clock]").forEach((c, i) => {
    const dd = new Date(d.getTime() - i * 1700);
    c.textContent = `${pad(dd.getHours())}:${pad(dd.getMinutes())}:${pad(dd.getSeconds())}`;
  });
}

/* ============================================================
   이벤트 바인딩 / 시작
============================================================ */
/* ============================================================
   시작 연출: 원경(관제실) → 모니터 '픽' 점등 → 의자 클릭 →
   천천히 다가가 착석(돌리 인) → 모니터 클로즈업에서 CCTV 앱 시작
============================================================ */
function startIntro() {
  // 1) 원경 + 꺼진 모니터 상태로 시작 (body.intro-off 는 HTML에 이미 지정)
  // 2) 잠시 후 모니터가 '픽' 켜짐
  setTimeout(powerOn, 1500);
}

function powerOn() {
  document.body.classList.remove("intro-off");
  document.body.classList.add("intro-on");
  // 사진 속 모니터가 '픽' 켜짐 → 은은한 잔광 유지
  const mon = $("#intro-mon");
  if (mon) {
    mon.classList.add("flash");
    setTimeout(() => { mon.classList.remove("flash"); mon.classList.add("on"); }, 680);
  }
  // 3) 의자 클릭 대기
  $("#chair-zone").addEventListener("click", approach, { once: true });
}

function approach() {
  // 4) 사진 속 모니터로 다가감(줌인 + 페이드)
  document.body.classList.remove("intro-on");
  document.body.classList.add("intro-walk");

  const introImg = document.querySelector(".intro-img");
  let done = false;
  const arrive = () => {
    if (done) return;
    done = true;
    // 5) 착석 완료 → 시작 레이어 제거(근경 클로즈업 고정)
    document.body.classList.remove("intro-walk");
    document.body.classList.add("seated");
    // 6) 모니터 화면 안에서 CCTV 앱 부팅 시작
    runBoot();
  };
  // 줌인 종료 시점에 부팅 시작 (+ 안전장치 타이머)
  introImg.addEventListener("transitionend", (e) => {
    if (e.propertyName === "transform") arrive();
  }, { once: true });
  setTimeout(arrive, 2900);
}

function init() {
  fitScreen();
  window.addEventListener("resize", fitScreen);
  buildGrid();
  setInterval(tickClock, 1000);
  tickClock();

  startIntro();

  $("#enter-btn").addEventListener("click", () => showScreen("main-screen"));
  $("#back-btn").addEventListener("click", () => showScreen("main-screen"));

  // [추가] 브리핑 → 관제 시작 / 목표 패널 초기화 / 보고서 제출
  updateObjective();
  $("#briefing-start").addEventListener("click", () => showScreen("main-screen"));
  $("#obj-report").addEventListener("click", openAiScreen);       // 분석 → AI 대조 먼저
  $("#ai-back").addEventListener("click", () => showScreen("main-screen"));
  $("#ai-to-report").addEventListener("click", openFinalScreen);  // 특정 후 보고서
  $("#report-submit").addEventListener("click", submitReport);

  // [추가] 사건 해결 시스템 바인딩
  updateViewedCounter();
  // 관제화면으로 돌아올 때 모든 CCTV를 확인했으면 완료 안내 노출
  $("#back-btn").addEventListener("click", () => {
    if (investigationReady && !completeShown) setTimeout(showInvestigationComplete, 450);
  });
  $("#invest-start").addEventListener("click", openAiScreen);   // 완료 → AI 얼굴 대조
  $("#final-back").addEventListener("click", () => showScreen("main-screen"));
  // 확인 완료 후에는 카운터를 눌러 언제든 사건 분석 화면 재진입
  $("#viewed-counter").addEventListener("click", () => {
    if (investigationReady) openFinalScreen();
  });

  // 보안 코드 인증
  $("#auth-submit").addEventListener("click", submitCode);
  $("#auth-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitCode(); }
  });
  $("#card-close").addEventListener("click", () => $("#info-card").classList.remove("show"));
  $("#info-card").addEventListener("click", (e) => {
    if (e.target.id === "info-card") $("#info-card").classList.remove("show");
  });
  $("#case-close").addEventListener("click", () => {
    $("#case-alert").classList.remove("show");
    // 경보 닫은 뒤 단서 상세 카드도 이어서 보여주기
    const ch = CHANNELS.find(c => c.id === "CH-07");
    const ev = ch && ch.hotspots.find(h => h.evidence);
    if (ev) { ev.clue._photo = ch.img || ""; openInfoCard(ev.clue, true); }
  });

  // ESC 로 모달/경보 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#info-card").classList.remove("show");
      $("#case-alert").classList.remove("show");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
