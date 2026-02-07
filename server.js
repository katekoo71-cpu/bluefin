const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');

// ★ 창업가님의 DB 주소
const MONGO_URI = "mongodb+srv://bluepinadmin:bluepinadmin1234@cluster0.3pq60lz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// 1. DB 연결
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch(err => console.log('🔥 DB 연결 실패:', err));

// 2. 데이터 설계도 (스키마)
// (1) 핀(Pin) - 30분 뒤 삭제
const pinSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  type: String,
  message: String,
  storeName: String, // 누가 썼는지 가게 이름 추가!
  createdAt: { type: Date, default: Date.now, expires: 1800 }
});
const Pin = mongoose.model('Pin', pinSchema);

// (2) 유저(User) - 사장님 정보 (영구 저장)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // 아이디
  password: { type: String, required: true }, // 비번
  storeName: { type: String, required: true } // 가게 이름 (예: 성수족발)
});
const User = mongoose.model('User', userSchema);

// ★ JSON 데이터 해석기 (로그인할 때 필요함)
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 3. 회원가입 API
app.post('/register', async (req, res) => {
  try {
    const { username, password, storeName } = req.body;
    // 이미 있는 아이디인지 확인
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ success: false, message: "이미 있는 아이디입니다." });

    const newUser = new User({ username, password, storeName });
    await newUser.save();
    res.json({ success: true, message: "가입 성공!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// 4. 로그인 API
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password }); // (실무에선 암호화 필수, 지금은 학습용이라 원문비교)
    
    if (user) {
      res.json({ success: true, storeName: user.storeName });
    } else {
      res.status(400).json({ success: false, message: "아이디 또는 비번이 틀렸습니다." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// 5. 소켓 통신
io.on('connection', async (socket) => {
  console.log('✅ 접속 확인');

  // 기존 핀 불러오기
  try {
    const activePins = await Pin.find();
    socket.emit('loadPins', activePins);
  } catch (e) {}

  // 핀 꽂기 (로그인한 사람만 가능하게 프론트에서 막음)
  socket.on('bossSignal', async (data) => {
    // DB 저장
    const newPin = new Pin({
      lat: data.lat,
      lng: data.lng,
      type: data.type,
      message: data.message,
      storeName: data.storeName // 가게 이름도 같이 저장
    });
    await newPin.save();

    io.emit('newSignal', data);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 서버 실행 중: ${port}`);
});
