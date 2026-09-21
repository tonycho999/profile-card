// /api/card.js
export default async function handler(req, res) {
  // 1. 요청받은 이름 가져오기 (예: vercel.app/api/card?name=홍길동)
  const name = req.query.name;
  
  if (!name) {
    return res.status(400).send("이름이 필요합니다.");
  }

  try {
    // 2. 구글 블로거에서 해당 이름의 글(JSON)을 Vercel 서버가 직접 가져옴!
    // 주의: 블로그 주소 체계에 맞춰 URL 구조를 수정해야 합니다. 
    // 예: 블로그 주소가 profilecard9.blogspot.com/2026/09/홍길동.html 인 경우
    const encodedName = encodeURIComponent(name);
    // (블로그의 특정 라벨이나 검색을 활용하는 것이 관리하기 좋습니다.)
    // 예시: 라벨(태그)이 '홍길동'인 글을 가져옴
    const blogJsonUrl = `https://profilecard9.blogspot.com/feeds/posts/default/-/${encodedName}?alt=json`; 

    const response = await fetch(blogJsonUrl);
    const data = await response.json();

    if (!data.feed || !data.feed.entry || data.feed.entry.length === 0) {
      return res.status(404).send("명함을 찾을 수 없습니다.");
    }

    const entry = data.feed.entry[0];
    const profileName = entry.title.$t;
    const profileContent = entry.content.$t;

    // 3. Vercel 서버가 완성된 HTML 껍데기를 만들어 사용자에게 던져줌
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${profileName}님의 명함</title>
          <!-- SEO/미리보기 썸네일 태그 추가 가능 -->
          <style>
              body { font-family: sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; display: flex; justify-content: center; }
              .profile-card { background: white; padding: 30px 20px; border-radius: 16px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
              .profile-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .profile-content { text-align: left; margin-top: 20px; font-size: 15px; border-top: 1px solid #eee; padding-top: 20px; }
              .profile-content img { max-width: 100%; height: auto; border-radius: 8px; }
          </style>
      </head>
      <body>
          <div class="profile-card">
              <h2 class="profile-name">${profileName}</h2>
              <div class="profile-content">${profileContent}</div>
          </div>
      </body>
      </html>
    `;

    // 4. 완성된 HTML 전송
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error(error);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
}
