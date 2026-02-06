const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// 1. 정적 파일들(HTML, CSS, 이미지)을 보여줄 폴더 지정
app.use(express.static(__dirname));

// 2. 기본 접속 시 index.html 보여주기
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 3. 소켓(실시간 통신) 관리자
io.on('connection', (socket) => {
  console.log('✅ 누군가 접속했습니다!');

  // ★ 여기가 핵심입니다! ★
  // 사장님이 'bossSignal'을 보내면 -> 모든 사람에게 'newSignal'로 뿌려줍니다.
  socket.on('bossSignal', (data) => {
    console.log('📢 핀 요청 받음:', data.message);
    io.emit('newSignal', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ 접속이 끊어졌습니다.');
  });
});

// 4. 서버 시작 (Render가 주는 포트번호 사용)
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 BluePin 서버가 ${port}번 포트에서 돌아가는 중입니다!`);
});
