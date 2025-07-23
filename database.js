const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./notifier.db', (err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err.message);
    } else {
        console.log('데이터베이스에 성공적으로 연결되었습니다.');
        db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            site_value TEXT,
            method TEXT,
            notice_type TEXT, -- 알림 종류를 저장할 컬럼 추가
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('테이블 생성 실패:', err);
            } else {
                console.log("'subscriptions' 테이블이 성공적으로 준비되었습니다.");
            }
        });
    }
});

module.exports = db;