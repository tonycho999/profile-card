export default async function handler(req, res) {
  // 1. URL에서 이름 및 쿼리 파라미터 가져오기
  const name = req.query.name;
  // QR 코드로 접속했는지 여부 확인 (?from=qr 파라미터 체크)
  const isFromQr = req.query.from === 'qr' || req.query.qr === '1';

  // 빈 주소나 파비콘 요청 시 처리
  if (!name || name === 'favicon.ico') {
    return res.status(400).send("이름을 입력해주세요. (예: 주소창 끝에 /홍길동 입력)");
  }

  try {
    // 2. 구글 블로그에서 '이름'으로 검색하여 JSON 데이터 가져오기
    const blogUrl = `https://profilecard9.blogspot.com/feeds/posts/default?q=${encodeURIComponent(name)}&alt=json`;
    const response = await fetch(blogUrl);
    const data = await response.json();

    // 일치하는 명함 데이터가 없는 경우
    if (!data.feed || !data.feed.entry || data.feed.entry.length === 0) {
      return res.status(404).send(`'${name}' 님의 명함 데이터를 블로그에서 찾을 수 없습니다.`);
    }

    // 3. 가장 정확히 검색된 첫 번째 글의 제목과 본문 추출
    const entry = data.feed.entry[0];
    const profileName = entry.title.$t;
    const profileContent = entry.content.$t;

    // 4. 호스트 주소 및 QR 코드 링크 구성 (QR로 찍으면 ?from=qr 로 연결)
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const qrTargetUrl = `${protocol}://${host}/${encodeURIComponent(name)}?from=qr`;
    
    // 무료 QR 코드 생성 API를 활용한 QR 이미지 URL
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`;

    // 5. PWA Manifest (Data URI 방식으로 별도 파일 없이 바로 삽입)
    const manifestJson = {
      name: `${profileName}님의 명함`,
      short_name: profileName,
      description: `${profileName}님의 디지털 명함`,
      start_url: `/${encodeURIComponent(name)}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#2563eb",
      icons: [
        {
          src: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    };
    const manifestDataUri = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(JSON.stringify(manifestJson))}`;

    // 6. Vercel 서버가 완성된 HTML을 조립
    const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${profileName}님의 명함</title>

        <!-- PWA / 모바일 웹앱 메타 태그 (QR 접속이 아닐 때만 적용) -->
        ${!isFromQr ? `
        <link rel="manifest" href="${manifestDataUri}">
        <meta name="theme-color" content="#2563eb">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="${profileName}">
        ` : ''}

        <!-- 카톡 등 공유 시 나타날 미리보기(OG) 태그 -->
        <meta property="og:title" content="${profileName}님의 디지털 명함">
        <meta property="og:description" content="클릭하여 명함 및 상세 정보를 확인하세요.">

        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background-color: #f0f2f5; 
                margin: 0; 
                padding: 20px; 
                display: flex; 
                flex-direction: column;
                justify-content: flex-start; 
                align-items: center; 
                min-height: 100vh;
                box-sizing: border-box;
            }

            /* 상단 앱 설치 유도 배너 스타일 */
            .install-banner {
                background: #2563eb;
                color: #ffffff;
                width: 100%;
                max-width: 400px;
                padding: 12px 16px;
                border-radius: 12px;
                display: none; /* 스크립트로 조건 충족 시 flex로 변경 */
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            }
            .install-banner span {
                font-size: 14px;
                font-weight: 600;
            }
            .install-btn {
                background: #ffffff;
                color: #2563eb;
                border: none;
                padding: 6px 14px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 13px;
                cursor: pointer;
            }

            .profile-card { 
                background: white; 
                padding: 30px 20px; 
                border-radius: 16px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
                width: 100%; 
                max-width: 400px; 
                text-align: center; 
                margin-bottom: 24px;
                box-sizing: border-box;
            }

            /* QR 코드 영역 */
            .qr-section {
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px dashed #e2e8f0;
            }
            .qr-section img {
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .qr-caption {
                font-size: 12px;
                color: #64748b;
                margin-top: 8px;
            }
        </style>
    </head>
    <body>
        <!-- 1. 앱 설치 배너 (QR 접속이 아닐 때만 렌더링) -->
        ${!isFromQr ? `
        <div id="installBanner" class="install-banner">
            <span>📱 홈 화면에 앱으로 추가하기</span>
            <button id="installBtn" class="install-btn">설치</button>
        </div>
        ` : ''}

        <!-- 2. 명함 본문 카드 -->
        <div class="profile-card">
            <div class="profile-content">${profileContent}</div>

            <!-- 명함 내 QR 코드 (스캔 시 ?from=qr로 접속됨) -->
            <div class="qr-section">
                <img src="${qrImageUrl}" alt="명함 공유용 QR 코드" width="140" height="140" />
                <div class="qr-caption">카메라로 스캔하여 명함 공유 (?from=qr)</div>
            </div>
        </div>

        <!-- 3. PWA 설치 처리 스크립트 (QR 접속 시 제외) -->
        ${!isFromQr ? `
        <script>
            let deferredPrompt;
            const banner = document.getElementById('installBanner');
            const btn = document.getElementById('installBtn');

            // 크롬/안드로이드 설치 이벤트 감지
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                if (banner) banner.style.display = 'flex';
            });

            if (btn) {
                btn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            banner.style.display = 'none';
                        }
                        deferredPrompt = null;
                    }
                });
            }

            // iOS 사파리 안내 (사파리는 beforeinstallprompt 미지원)
            const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
            const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

            if (isIos() && !isInStandaloneMode() && banner) {
                banner.style.display = 'flex';
                banner.innerHTML = '<span>📲 하단 공유(⬆) 누른 후 <b>[홈 화면에 추가]</b></span>';
            }
        </script>
        ` : ''}
    </body>
    </html>
    `;

    // 7. 브라우저로 최종 화면 전송
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send("서버 오류가 발생했습니다: " + error.message);
  }
}
