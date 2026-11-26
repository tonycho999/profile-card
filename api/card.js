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

    // --- 1. 블로그 본문에서 첫 번째 이미지(사진) URL 동적 추출 ---
    let profileImageUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; // 기본 프로필 사진 아이콘 (대체용)
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = profileContent.match(imgRegex);
    if (match && match[1]) {
      profileImageUrl = match[1];
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const qrTargetUrl = `${protocol}://${host}/${encodeURIComponent(name)}?from=qr`;
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`;

    // --- 2. 동적으로 추출한 사진을 PWA 바탕화면 앱 아이콘으로 등록 ---
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
          src: profileImageUrl, // 본인 사진 적용
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
        <link rel="apple-touch-icon" href="${profileImageUrl}"> <!-- 아이폰 홈 화면 아이콘용 -->
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

            .save-contact-btn {
                background: #10b981;
                color: white;
                border: none;
                padding: 15px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
                transition: transform 0.1s ease;
            }
            .save-contact-btn:active {
                transform: scale(0.98);
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

            /* 명함 본문 카드 */
            .profile-card { 
                background: white; 
                padding: 30px 20px; 
                border-radius: 16px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
                text-align: center;
                box-sizing: border-box;
                line-height: 1.6;
            }

            /* 동적 원형 프로필 이미지 스타일 */
            .profile-avatar-wrapper {
                margin: -10px auto 20px auto;
                width: 110px;
                height: 110px;
                border-radius: 50%;
                padding: 4px;
                background: white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                display: inline-block;
            }
            .profile-avatar {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }

            /* 하단 정보 / 회사 링크 전용 섹션 */
            .links-card {
                background: white;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 10px 20px rgba(0,0,0,0.05);
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .links-title {
                font-size: 14px;
                font-weight: bold;
                color: #475569;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .info-link-btn {
                background: #f1f5f9;
                color: #334155;
                text-decoration: none;
                padding: 12px 16px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.15s ease, transform 0.1s ease;
                border: 1px solid #e2e8f0;
            }
            .info-link-btn:active {
                background: #e2e8f0;
                transform: scale(0.99);
            }
            .info-link-btn span.arrow {
                color: #94a3b8;
                font-weight: bold;
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
            <!-- 1. 상단 QR 코드 카드 -->
            <div class="qr-card">
                <img src="${qrImageUrl}" alt="명함 공유용 QR 코드" width="130" height="130" />
                <div class="qr-caption">카메라로 스캔하여 명함 공유 (?from=qr)</div>
            </div>

            <!-- 2. 스마트폰 연락처 저장 버튼 -->
            <button id="saveContactBtn" class="save-contact-btn">
                👤 연락처 스마트폰에 저장하기
            </button>

            <!-- 3. 명함 본문 카드 -->
            <div class="profile-card">
                <!-- 동적으로 분석한 프로필 사진이 명함 안의 최상단에 원형으로 깔끔하게 배치됩니다 -->
                <div class="profile-avatar-wrapper">
                    <img class="profile-avatar" src="${profileImageUrl}" alt="${profileName} 프로필 사진">
                </div>
                <div class="profile-content">${profileContent}</div>
            </div>

            <!-- 4. 하단 회사 정보 / 커스텀 외부 링크 영역 -->
            <div class="links-card">
                <div class="links-title">🔗 추가 정보 및 연결 링크</div>
                
                <a href="https://your-company.com" target="_blank" class="info-link-btn">
                    🏢 회사 공식 홈페이지 바로가기 <span class="arrow">➔</span>
                </a>
                
                <a href="https://blog.naver.com/your-id" target="_blank" class="info-link-btn">
                    ✍️ 공식 네이버 블로그 방문 <span class="arrow">➔</span>
                </a>

                <a href="https://instagram.com/your-id" target="_blank" class="info-link-btn">
                    📸 공식 인스타그램 연결 <span class="arrow">➔</span>
                </a>
            </div>
        </div>

        <script>
            document.getElementById('saveContactBtn').addEventListener('click', () => {
                const profileCard = document.querySelector('.profile-card');
                const rawText = profileCard ? profileCard.innerText : '';
                const lines = rawText.split('\\n').map(l => l.trim()).filter(Boolean);

                const findByPrefix = (keywords) => {
                    for (const line of lines) {
                        for (const kw of keywords) {
                            if (line.toLowerCase().startsWith(kw.toLowerCase())) {
                                return line.substring(kw.length).replace(/^[:\\-\\s]+/, '').trim();
                            }
                        }
                    }
                    return '';
                };

                const detectedName = "${profileName}".trim();

                const mobileMatch = rawText.match(/010[-.\\s]?\\d{4}[-.\\s]?\\d{4}/);
                const mobilePhone = mobileMatch ? mobileMatch[0].replace(/[^0-9]/g, '') : '';

                const workPhoneMatch = rawText.match(/(?:02|0[3-6][1-5]|070)[-.\\s]?\\d{3,4}[-.\\s]?\\d{4}/);
                const workPhone = workPhoneMatch ? workPhoneMatch[0].replace(/[^0-9]/g, '') : '';

                const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
                const email = emailMatch ? emailMatch[0] : '';

                const company = findByPrefix(['회사', '소속', '직장', '상호', 'Company']);
                const department = findByPrefix(['부서', '팀', '본부', 'Department']);
                const title = findByPrefix(['직급', '직책', '직함', '포지션', 'Title']);

                let address = findByPrefix(['주소', '위치', '오시는 길', 'Address', 'Location']);
                if (!address) {
                    const addrMatch = rawText.match(/(?:서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣\\s0-9-]+(?:로|길|동|읍|면|번지)\\s?[0-9-]*/);
                    if (addrMatch) address = addrMatch[0];
                }

                const urlMatch = rawText.match(/https?:\\/\\/[^\\s]+/);
                const website = urlMatch ? urlMatch[0] : '';

                const vcardParts = [
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    'FN;CHARSET=UTF-8:' + detectedName,
                    'N;CHARSET=UTF-8:;' + detectedName + ';;;'
                ];

                if (mobilePhone) vcardParts.push('TEL;TYPE=CELL,VOICE:' + mobilePhone);
                if (workPhone && workPhone !== mobilePhone) vcardParts.push('TEL;TYPE=WORK,VOICE:' + workPhone);
                if (email) vcardParts.push('EMAIL;TYPE=PREF,INTERNET:' + email);
                if (company || department) {
                    vcardParts.push('ORG;CHARSET=UTF-8:' + (company || '') + ';' + (department || ''));
                }
                if (title) vcardParts.push('TITLE;CHARSET=UTF-8:' + title);
                if (address) {
                    vcardParts.push('ADR;TYPE=WORK;CHARSET=UTF-8:;;' + address + ';;;;');
                }
                if (website) vcardParts.push('URL:' + website);

                vcardParts.push('END:VCARD');
                const vcardString = vcardParts.join('\\r\\n');

                const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8;' });
                const fileName = detectedName + '.vcf';
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(() => URL.revokeObjectURL(url), 100);
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
