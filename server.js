const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');

// ★ 창업가님의 DB 주소
const MONGO_URI = "mongodb+srv://bluepinadmin:bluepinadmin1234@cluster0.3pq60lz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch(err => console.log('🔥 DB 연결 실패:', err));

// 1. 핀 스키마
const pinSchema = new mongoose.Schema({
  lat: Number, lng: Number, type: String, message: String, storeName: String,
  createdAt: { type: Date, default: Date.now, expires: 1800 }
});
const Pin = mongoose.model('Pin', pinSchema);

// 2. 유저 스키마
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  storeName: String,
  role: { type: String, default: 'guest' },
  points: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// 3. 회원가입 (손님 1000P 지급)
app.post('/register', async (req, res) => {
  try {
    const { username, password, storeName, role } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ success: false, message: "이미 있는 아이디입니다." });

    const newUser = new User({
      username, password,
      storeName: role === 'host' ? storeName : null,
      role: role || 'guest',
      points: role === 'guest' ? 1000 : 0
    });
    await newUser.save();
    res.json({ success: true, message: "가입 성공! (손님은 1000P 지급됨)" });
  } catch (err) { res.status(500).json({ success: false, message: "서버 오류" }); }
});

// 4. 로그인
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ success: true, role: user.role, storeName: user.storeName, points: user.points });
    } else {
      res.status(400).json({ success: false, message: "로그인 실패" });
    }
  } catch (err) { res.status(500).json({ success: false, message: "서버 오류" }); }
});

// ★ [NEW] 5. 포인트 사용 (차감) API
app.post('/use-point', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(400).json({ success: false, message: "유저를 찾을 수 없음" });
    
    // 잔액 확인 (1000원 이상 있어야 함)
    if (user.points >= 1000) {
      user.points -= 1000; // 1000원 차감
      await user.save();   // DB 저장
      res.json({ success: true, newPoints: user.points, message: "사용 완료! (잔액: " + user.points + ")" });
    } else {
      res.json({ success: false, message: "잔액이 부족합니다! (필요: 1000 BP)" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// 6. 소켓 통신
io.on('connection', async (socket) => {
  const activePins = await Pin.find();
  socket.emit('loadPins', activePins);
  socket.on('bossSignal', async (data) => {
    const newPin = new Pin({
      lat: data.lat, lng: data.lng, type: data.type, message: data.message, storeName: data.storeName
    });
    await newPin.save();
    io.emit('newSignal', data);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => { console.log(`🚀 BluePin V8.1 Server Started: ${port}`); });
