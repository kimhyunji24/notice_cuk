// functions/api/index.js
const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const apiRoutes = require("./routes");

const app = express();

// 보안을 위해 실제 배포된 프론트엔드 주소만 허용하는 것이 좋습니다.
app.use(cors({ origin: "https://cuk-alarm.web.app" }));
app.use(express.json());
app.use("/", apiRoutes);

// onRequest 함수에 v2 옵션을 추가하여 콜드 스타트 완화 가능
exports.api = onRequest({ minInstances: 1 }, app);