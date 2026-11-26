export default async function handler(req, res) {
  const name = req.query.name;
  const isFromQr = req.query.from === 'qr' || req.query.qr === '1';

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

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const qrTargetUrl = `${protocol}://${host}/${encodeURIComponent(name)}?from=qr`;
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`;

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
        ` : ''}

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

            /* 연락처 저장 버튼 스타일 */
            .save-contact-btn {
                background: #10b981; /* 눈에 띄는 초록색 계열 */
                color: white;
                border: none;
                padding: 14px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                transition: background 0.2s ease;
                width: 100%;
                box-sizing: border-box;
            }
            .save-contact-btn:active {
                background: #059669;
            }

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

            .profile-card { 
                background: white; 
                padding: 30px 20px; 
                border-radius: 16px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
                text-align: center;
                box-sizing: border-box;
            }
        </style>
    </head>
    <body>
        ${!isFromQr ? `
        <div id="installBanner" class="install-banner">
            <span>📱 홈 화면에 앱으로 추가하기</span>
            <button id="installBtn" class="install-btn">설치</button>
        </div>
        ` : ''}

        <div class="main-container">
            
            <!-- QR 코드 카드 (상단) -->
            <div class="qr-card">
                <img src="${qrImageUrl}" alt="명함 공유용 QR 코드" width="130" height="130" />
                <div class="qr-caption">카메라로 스캔하여 명함 공유 (?from=qr)</div>
            </div>

            <!-- 스마트폰 연락처 저장 버튼 -->
            <button id="saveContactBtn" class="save-contact-btn">
                👤 연락처 스마트폰에 저장하기
            </button>

            <!-- 명함 본문 카드 -->
            <div class="profile-card">
                <div class="profile-content">${profileContent}</div>
            </div>

        </div>

        <!-- 연락처 변환 및 OS별 저장 트리거 스크립트 -->
        <script>
            document.getElementById('saveContactBtn').addEventListener('click', () => {
                // 1. 블로그 본문 HTML에서 텍스트 정보만 정제하여 가져옵니다.
                const profileCard = document.querySelector('.profile-card');
                const rawText = profileCard ? profileCard.innerText : '';

                // 2. 본문 텍스트 내에서 전화번호와 이메일을 자동 감지하는 정규식
                const phoneRegex = /(?:010|02|0[3-6][1-9])[-.\\s]?\\d{3,4}[-.\\s]?\\d{4}/g;
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;

                const phones = rawText.match(phoneRegex) || [];
                const emails = rawText.match(emailRegex) || [];

                const detectedPhone = phones[0] || '';
                const detectedEmail = emails[0] || '';
                const detectedName = "${profileName}".trim();

                // 3. 연락처 표준 규격인 vCard 3.0 문자열 생성
                const vcard = [
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    'FN:' + detectedName,               // 전체 이름
                    'N:;' + detectedName + ';;;',       // 이름 상세 분류
                    detectedPhone ? 'TEL;TYPE=CELL:' + detectedPhone : '', // 핸드폰 번호
                    detectedEmail ? 'EMAIL;TYPE=PREF,INTERNET:' + detectedEmail : '', // 이메일 주소
                    'END:VCARD'
                ].filter(Boolean).join('\\n');

                // 4. 안드로이드와 iOS에서 안정적으로 호환되는 통합 다운로드 트리거
                const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
                const fileName = detectedName + '.vcf';

                if (navigator.msSaveBlob) { // IE 대응
                    navigator.msSaveBlob(blob, fileName);
                } else {
                    const link = document.createElement('a');
                    if (link.download !== undefined) {
                        // iOS Safari 및 최신 모바일 브라우저를 위해 Object URL 사용
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', fileName);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // 메모리 해제
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                    }
                }
            });
        </script>

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
