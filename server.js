const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;
const db = require('./database.js'); // 데이터베이스 연결 가져오기

const corsOptions = {
  origin: 'http://127.0.0.1:5502',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// server.js 파일

app.post('/api/subscribe', (req, res) => {
    console.log('서버가 받은 데이터:', req.body);

    // 프론트엔드로부터 받은 데이터를 변수에 저장
    let { selectedSites, method, noticeTypes } = req.body;
    const userId = 'test_user_01';

    // --- 리팩토링 핵심 로직 ---
    // 1. 만약 선택한 학과가 없다면, '모든 학과'를 의미하는 기본값을 설정
    if (!selectedSites || selectedSites.length === 0) {
        // 'catholic_notice'는 우리가 이전에 정한 '가톨릭대학교 전체 공지사항'을 의미하는 값입니다.
        // 이 부분은 나중에 전체 공지사항을 크롤링할 때 사용할 수 있습니다.
        // 지금은 임시로 하나의 대표값만 넣습니다.
        selectedSites = ['catholic_notice']; 
        console.log('선택된 학과가 없어 기본값으로 설정:', selectedSites);
    }

    // 2. 만약 선택한 알림 종류가 없다면, '모든 종류'를 의미하는 기본값을 설정
    if (!noticeTypes || noticeTypes.length === 0) {
        noticeTypes = ['important', 'general'];
        console.log('선택된 종류가 없어 기본값으로 설정:', noticeTypes);
    }
    // -------------------------


    const stmt = db.prepare("INSERT INTO subscriptions (user_id, site_value, method, notice_type) VALUES (?, ?, ?, ?)");

    // 모든 조합을 DB에 저장
    selectedSites.forEach(site => {
        noticeTypes.forEach(type => {
            stmt.run(userId, site, method, type, (err) => {
                if (err) {
                    console.error('DB 저장 실패:', err.message);
                }
            });
        });
    });

    stmt.finalize();

    res.json({ status: 'success', message: '구독 정보가 데이터베이스에 성공적으로 저장되었습니다!' });
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});