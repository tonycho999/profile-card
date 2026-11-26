export default async function handler(req, res) {
  const name = req.query.name;
  // QR 접속 여부 체크 (?source=qr 또는 ?from=qr)
  const isFromQr = req.query.source === 'qr' || req.query.from === 'qr' || req.query.qr === '1';

  if (!name || name === 'favicon.ico') {
    return res.status(400).send("이름을 입력해주세요. (예: 주소창 끝에 /홍길동 입력)");
  }

  try {
    const blogUrl = `https://profilecard9.blogspot.com/feeds/posts/default?q=${encodeURIComponent(name)}&alt=json`;
    const response = await fetch(blogUrl);
    const data = await response.json();

    if (!data.feed || !data.feed.entry || data.feed.entry.length === 0) {
      return res.status(404).send(`'${name}' 님의 명함 데이터를 블로그에서 찾을 수 없습니다.`);
    }

    const entry = data.feed.entry[0];
    const profileName = entry.title.$t;
    const profileContent = entry.content.$t;

    // --- 1. 블로그 본문에서 첫 번째 이미지 주소 추출 (홈 화면 앱 아이콘 전용) ---
    let profileImageUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = profileContent.match(imgRegex);
    if (match && match[1]) {
      profileImageUrl = match[1];
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    // QR 접속용 URL (?source=qr)
    const qrTargetUrl = `${protocol}://${host}/${encodeURIComponent(name)}?source=qr`;
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`;

    // --- 2. PWA Manifest (본인 사진이 앱 아이콘으로 지정됨) ---
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
          src: profileImageUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };
    const manifestDataUri = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(JSON.stringify(manifestJson))}`;

    const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${profileName}님의 명함</title>

        ${!isFromQr ? `
        <link rel="manifest" href="${manifestDataUri}">
        <meta name="theme-color" content="#2563eb">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="${profileName}">
        <link rel="apple-touch-icon" href="${profileImageUrl}">
        ` : ''}

        <meta property="og:title" content="${profileName}님의 디지털 명함">
        <meta property="og:description" content="클릭하여 명함 및 상세 정보를 확인하세요.">
        <meta property="og:image" content="${profileImageUrl}">

        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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

            /* 앱 설치 유도 상단 배너 */
            .install-banner {
                background: #2563eb;
                color: #ffffff;
                width: 100%;
                max-width: 400px;
                padding: 12px 16px;
                border-radius: 12px;
                display: none;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            }
            .install-banner span { font-size: 14px; font-weight: 600; }
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

            .main-container {
                width: 100%; 
                max-width: 400px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-bottom: 40px;
            }

            /* 상단 QR 코드 카드 */
            .qr-card {
                background: white; 
                padding: 20px; 
                border-radius: 16px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.05); 
                text-align: center;
                box-sizing: border-box;
            }
            .qr-card img {
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .qr-caption { font-size: 12px; color: #64748b; margin-top: 8px; }

            /* 명함 본문 카드 */
            .profile-card { 
                background: white; 
                padding: 30px 20px; 
                border-radius: 16px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
                box-sizing: border-box;
                line-height: 1.6;
            }
        </style>
    </head>
    <body>
        <!-- PWA 설치 배너 (QR 접속 시 미노출) -->
        ${!isFromQr ? `
        <div id="installBanner" class="install-banner">
            <span>📱 홈 화면에 앱으로 추가하기</span>
            <button id="installBtn" class="install-btn">설치</button>
        </div>
        ` : ''}

        <div class="main-container">
            <!-- 1. 상단 QR 코드 카드 (QR로 스캔해 들어온 경우 자동 숨김 처리됨) -->
            ${!isFromQr ? `
            <div id="qrCodeSection" class="qr-card">
                <img src="${qrImageUrl}" alt="명함 공유용 QR 코드" width="130" height="130" />
                <div class="qr-caption">카메라로 스캔하여 명함 공유 </div>
            </div>
            ` : ''}

            <!-- 2. 명함 본문 카드 (블로그에서 작성하신 HTML 그대로 출력) -->
            <div class="profile-card">
                <div class="profile-content">${profileContent}</div>
            </div>
        </div>

        <!-- PWA 설치 처리 스크립트 (QR 접속 시 제외) -->
        ${!isFromQr ? `
        <script>
            let deferredPrompt;
            const banner = document.getElementById('installBanner');
            const btn = document.getElementById('installBtn');

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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send("서버 오류가 발생했습니다: " + error.message);
  }
}
