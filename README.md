# 🥕 당근 AI 모임 통합 관리 플랫폼 (LMS & Community)

당근마켓 AI 교육 모임 회원을 위한 **강의 실시간 시청**, **회원 등급별 자료 다운로드**, **승인형 실시간 채팅 & 질의응답** 통합 웹 플랫폼입니다.

---

## 📌 주요 연동 정보
- **구글 드라이브 스토리지 (강의 영상 & 실습 파일)**:
  - 폴더 링크: [Google Drive 바로가기](https://drive.google.com/drive/folders/1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo?usp=drive_link)
  - 폴더 ID: `1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo`
  - 업로드: **관리자(모임장) 전용**
  - 다운로드: **회원 등급(정회원, VIP)에 따른 권한 제어**
  - 동영상: **구글 드라이브 스트리밍 뷰어를 통한 실시간 시청 지원**
- **구글 스프레드시트 데이터베이스 (회원 / 강의 / 댓글 / 채팅)**:
  - 시트 링크: [Google Sheets 바로가기](https://docs.google.com/spreadsheets/d/1aEh870ZH6ktUVbGJQlU66aRbzKxQ59YOXCGt2FZGWdA/edit?gid=0#gid=0)
  - 시트 ID: `1aEh870ZH6ktUVbGJQlU66aRbzKxQ59YOXCGt2FZGWdA`

---

## 🎨 디자인 규칙
- **미니멀 & 심플 블랙/화이트 모노크롬 베이스** (`#000000`, `#09090b`, `#ffffff`)
- **유채색 2가지 이내 엄수**:
  1. `Carrot Orange` (`#FF6F0F`): 메인 브랜드 및 액션 포인트
  2. `Emerald Green` (`#10B981`): 승인 완료 및 스트리밍 상태 배지

---

## 🛡️ 회원 등급 및 권한 체계
| 등급 (Role) | 강의 시청 | 자료 다운로드 | 채팅 참여 | 관리자 센터 |
| :--- | :---: | :---: | :---: | :---: |
| **준회원 / 대기자 (Guest)** | 오리엔테이션/맛보기 | ❌ 불가 | 👁️ 읽기 전용 | ❌ 불가 |
| **정회원 (Regular)** | ✅ 기본 실무 강의 전편 | ✅ 기본 요약 PDF | ✅ 실시간 대화 가능 | ❌ 불가 |
| **우수 / VIP (VIP)** | ✅ 비공개 심화 강좌 포함 | ✅ 고화질 / 소스코드 전편 | ✅ 실시간 대화 가능 | ❌ 불가 |
| **모임장 (Admin)** | ✅ 전체 열람 | ✅ 무제한 다운로드 | ✅ 공지 등록 및 대화 | ✅ **회원 승인/등급 부여/강의 등록** |

---

## 🚀 로컬 실행 방법
```bash
# 1. 패키지 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev

# 3. 브라우저 접속
# http://localhost:3000
```
> **Tip:** 화면 상단 우측 내비게이션 바에서 **[계정 스위처]**를 클릭하면 `관리자(모임장)`, `VIP회원`, `정회원`, `준회원/대기자` 계정으로 1초 만에 전환하여 등급별 동작을 바로 테스트해볼 수 있습니다.

---

## ☁️ GitHub & Vercel 배포 가이드

### 1단계: GitHub 저장소에 푸시
```bash
# git 초기화 및 커밋
git init
git add .
git commit -m "feat: 당근 AI 모임 통합 플랫폼 초기 릴리즈"

# GitHub 리포지토리 연결 및 푸시
git branch -M main
git remote add origin https://github.com/{당신의_깃허브_아이디}/{리포지토리명}.git
git push -u origin main
```

### 2단계: Vercel 배포
1. [Vercel](https://vercel.com)에 로그인 후 **"Add New Project"** 클릭
2. 방금 푸시한 GitHub 리포지토리를 Import
3. **Environment Variables (환경 변수)**에 아래 항목 입력:
   - `GOOGLE_SHEET_ID`: `1aEh870ZH6ktUVbGJQlU66aRbzKxQ59YOXCGt2FZGWdA`
   - `GOOGLE_DRIVE_FOLDER_ID`: `1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: (Google Cloud 서비스 계정 이메일)
   - `GOOGLE_PRIVATE_KEY`: (Google Cloud 서비스 계정 비공개 키)
4. **Deploy** 버튼 클릭! 1분 내로 배포가 완료됩니다.

---

## 🔑 구글 클라우드 서비스 계정 키 발급 방법 (시트 & 드라이브 자동 연동)
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 후 **Google Sheets API** 및 **Google Drive API** 사용 설정
3. **IAM 및 관리자 > 서비스 계정**에서 새 서비스 계정 생성
4. 생성된 서비스 계정의 **키 추가 > 새 키 만들기(JSON)** 다운로드
5. 발급된 서비스 계정 이메일(`xxx@xxx.iam.gserviceaccount.com`)을 복사하여:
   - 구글 스프레드시트 우측 상단 **[공유]** -> 서비스 계정 이메일 추가 (역할: **편집자**)
   - 구글 드라이브 폴더 우측 상단 **[공유]** -> 서비스 계정 이메일 추가 (역할: **편집자**)
6. JSON 파일 내의 `client_email`과 `private_key` 값을 `.env.local` 또는 Vercel 환경 변수에 입력하면 구글 클라우드와 완벽하게 양방향 동기화됩니다.
