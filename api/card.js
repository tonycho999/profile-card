export default async function handler(req, res) {
  // 1. URL에서 이름 가져오기 (예: vercel.app/홍길동 -> '홍길동')
  const name = req.query.name;

  // 빈 주소나 파비콘 요청 시 처리
  if (!name || name === 'favicon.ico') {
    return res.status(400).send("이름을 입력해주세요. (예: 주소창 끝에 /홍길동 입력)");
  }

  try {
    // 2. 구글 블로그에서 '이름'으로 검색하여 JSON 데이터 가져오기
    // 블로그에 글을 쓰실 때 '제목'에 사람 이름을 적어두시면 검색(?q=이름)으로 긁어옵니다.
    const blogUrl = `https://profilecard9.blogspot.com/feeds/posts/default?q=${encodeURIComponent(name)}&alt=json`;
    
    // Vercel 서버가 직접 구글 블로거와 통신 (CORS 에러 절대 발생 안 함)
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

    // 4. Vercel 서버가 완성된 HTML을 조립
    const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${profileName}님의 명함</title>
        
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
        justify-content: center; 
        align-items: flex-start; /* ★ 이 부분이 핵심! 화면이 길어질 때 짤림 방지 */
        min-height: 100vh;
    }
    .profile-card { 
        background: white; 
        padding: 30px 20px; 
        border-radius: 16px; 
        box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
        width: 100%; 
        max-width: 400px; 
        text-align: center; 
        margin-bottom: 40px; /* ★ 맨 아래 여유 공간 추가 */
    }
    /* 나머지 기존 스타일은 그대로 유지... */
</style>

    </head>
    <body>
        <div class="profile-card">
            <!-- <h2 class="profile-name">...</h2> 부분을 삭제하여 중복 이름을 없앴습니다. -->
            <div class="profile-content">${profileContent}</div>
        </div>
    </body>
    </html>
    `;

    // 5. 브라우저로 최종 화면 전송
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error) {
    return res.status(500).send("서버 오류가 발생했습니다: " + error.message);
  }
}
