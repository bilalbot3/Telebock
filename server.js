require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/socialbridge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Database Models
const User = require('./models/User');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Reel = require('./models/Reel');
const Call = require('./models/Call');

// Telegram Bot Setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve React Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Telegram Bot Logic
const telegramUsers = new Map();

bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    telegramUsers.set(chatId, decoded.userId);
    
    await User.findByIdAndUpdate(decoded.userId, { 
      telegramChatId: chatId,
      telegramConnected: true
    });
    
    bot.sendMessage(chatId, '✅ تم ربط حسابك بنجاح! يمكنك الآن إرسال واستقبال الرسائل والمكالمات عبر Telegram.');
  } catch (err) {
    bot.sendMessage(chatId, '❌ الرابط غير صالح. يرجى تسجيل الدخول إلى الموقع وإنشاء رابط جديد.');
  }
});

// Handle all types of Telegram messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (!telegramUsers.has(chatId)) return;
  
  const userId = telegramUsers.get(chatId);
  const user = await User.findById(userId);
  
  // Handle different message types
  if (msg.text && !msg.text.startsWith('/')) {
    await handleTextMessage(user, msg);
  } else if (msg.photo) {
    await handlePhotoMessage(user, msg);
  } else if (msg.video) {
    await handleVideoMessage(user, msg);
  } else if (msg.voice) {
    await handleVoiceMessage(user, msg);
  }
});

async function handleTextMessage(user, msg) {
  const newMessage = new Message({
    sender: user._id,
    content: msg.text,
    timestamp: new Date()
  });
  
  await newMessage.save();
  await bot.sendMessage(msg.chat.id, '📩 تم حفظ رسالتك في محادثتك على الموقع.');
}

async function handlePhotoMessage(user, msg) {
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const filePath = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath.file_path}`;
  
  const newMessage = new Message({
    sender: user._id,
    content: msg.caption || '',
    media: fileUrl,
    mediaType: 'image',
    timestamp: new Date()
  });
  
  await newMessage.save();
  await bot.sendMessage(msg.chat.id, '📷 تم حفظ الصورة في محادثتك على الموقع.');
}

async function handleVideoMessage(user, msg) {
  const fileId = msg.video.file_id;
  const filePath = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath.file_path}`;
  
  const newMessage = new Message({
    sender: user._id,
    content: msg.caption || '',
    media: fileUrl,
    mediaType: 'video',
    timestamp: new Date()
  });
  
  await newMessage.save();
  await bot.sendMessage(msg.chat.id, '🎥 تم حفظ الفيديو في محادثتك على الموقع.');
}

async function handleVoiceMessage(user, msg) {
  const fileId = msg.voice.file_id;
  const filePath = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath.file_path}`;
  
  const newMessage = new Message({
    sender: user._id,
    media: fileUrl,
    mediaType: 'voice',
    timestamp: new Date()
  });
  
  await newMessage.save();
  
  // Save as call record
  const newCall = new Call({
    caller: user._id,
    duration: msg.voice.duration,
    mediaUrl: fileUrl,
    callType: 'voice',
    timestamp: new Date()
  });
  
  await newCall.save();
  await bot.sendMessage(msg.chat.id, '🎙 تم حفظ الرسالة الصوتية في محادثتك على الموقع.');
}

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// ... (جميع routes الأخرى من النسخة السابقة)

// Create uploads directory if not exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Telegram bot is running with token: ${process.env.TELEGRAM_BOT_TOKEN}`);
});
