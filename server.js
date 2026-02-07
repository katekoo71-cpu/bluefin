const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');

// ★ 창업가님의 전용 창고 주소 (만들어주신 ID/PW 적용 완료)
const MONGO_URI = "mongodb+srv://bluepinadmin:bluepinadmin1234@cluster0.3pq60lz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// 1. 데이터베이스 연결 (창고 문 열기)
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 창고 연결 성공!'))
  .catch(err => console.log('🔥 DB 연결 실패:', err));

// 2. 핀(Pin) 데이터 설계도 (저장 규칙)
const pinSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  type: String,
  message: String,
  createdAt: { type: Date, default: Date.now, expires: 1800 } // 1800초(30분) 뒤 자동 폭파
});
const Pin = mongoose.model('Pin', pinSchema);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 3. 실시간 통신
io.on('connection', async (socket) => {
  console.log('✅ 누군가 접속했습니다!');

  // (1) 접속하자마자: "창고에 있는 핀 다 꺼내와!"
  try {
    const activePins = await Pin.find();
    socket.emit('loadPins', activePins);
  } catch (e) {
    console.log('핀 불러오기 에러:', e);
  }

  // (2) 핀 꽂기 신호가 오면: "창고에 넣고 + 사람들한테 보여줘"
  socket.on('bossSignal', async (data) => {
    console.log('📢 핀 요청:', data.message);
    
    // DB 저장
    const newPin = new Pin({
      lat: data.lat,
      lng: data.lng,
      type: data.type,
      message: data.message,
      // 시간은 서버 시간 기준
    });
    await newPin.save();

    // 모두에게 발사
    io.emit('newSignal', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ 접속 끊김');
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 BluePin 서버 가동! 포트: ${port}`);
});
