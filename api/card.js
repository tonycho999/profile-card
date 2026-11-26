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

    // --- 1. 블로그 본문에서 첫 번째 이미지(사진) URL 동적 추출 (바탕화면 PWA 아이콘용) ---
    let profileImageUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; // 기본 대체 이미지
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = profileContent.match(imgRegex);
    if (match && match[1]) {
      profileImageUrl = match[1];
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const qrTargetUrl = `${protocol}://${host}/${encodeURIComponent(name)}?from=qr`;
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`;

    // --- 2. PWA Manifest 설정 (바탕화면 설치 시 본인 사진이 아이콘으로 적용됨) ---
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
          src: profileImageUrl, // 동적 추출된 이미지 적용
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

            /* 앱 설치 배너 */
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

            /* (선택 사항) 상단 연락처 저장 버튼 활성화 시 스타일 */
            .save-contact-btn-top {
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
            .save-contact-btn-top:active {
                transform: scale(0.98);
                background: #059669;
            }

            /* QR 코드 카드 */
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

            <!-- 2. (옵션) 상단 고정 저장 버튼 (필요할 경우 아래 주석 해제) -->
            <!--
            <button id="topSaveContactBtn" class="save-contact-btn-top">
                👤 연락처 스마트폰에 저장하기
            </button>
            -->

            <!-- 3. 명함 본문 카드 (중복 원형 아바타를 지우고 깔끔하게 본문만 출력) -->
            <div class="profile-card">
                <div class="profile-content">${profileContent}</div>
            </div>
        </div>

        <script>
            // 공통 연락처 저장 기능 로직
            const triggerSaveContact = () => {
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
            };

            // 이벤트 바인딩 로직 (상단 고정 버튼 & 블로그 내부 버튼 모두 감지 가능)
            document.addEventListener('DOMContentLoaded', () => {
                // 1) 상단 옵션 버튼이 켜져있을 경우 연동
                const topBtn = document.getElementById('topSaveContactBtn');
                if (topBtn) {
                    topBtn.addEventListener('click', triggerSaveContact);
                }

                // 2) 블로그 본문 내에 생성하신 [Save] 버튼을 자동으로 감지하여 저장 기능 연동
                // 블로그 글 작성 시, 버튼 요소에 id="saveContactBtn" 또는 class="save-contact-btn"을 지정하시면 작동합니다.
                const blogBtn = document.getElementById('saveContactBtn') || document.querySelector('.save-contact-btn');
                if (blogBtn) {
                    blogBtn.removeAttribute('href'); // 링크가 열리지 않도록 초기화
                    blogBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        triggerSaveContact();
                    });
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
