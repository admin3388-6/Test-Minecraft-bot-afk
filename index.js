const mineflayer = require('mineflayer');

// إنشاء البوت
const bot = mineflayer.createBot({
  host: 'skydata.aternos.me',  // عنوان السيرفر
  port: 28068,                 // المنفذ
  username: 'SkyDataBot',      // اسم البوت بدون مسافات
  version: '1.21.10',          // إصدار السيرفر
});

// عند تسجيل الدخول
bot.on('login', () => {
  console.log(`Bot logged in as ${bot.username}`);
});

// رسالة ترحيبية عند الدخول
bot.on('spawn', () => {
  bot.chat('/say §9Welcome to SkyData world! Enjoy'); // §9 = أزرق
});

// منع AFK والتحرك بشكل بسيط عشوائي
setInterval(() => {
  const directions = ['forward', 'back', 'left', 'right', 'jump'];
  const dir = directions[Math.floor(Math.random() * directions.length)];
  bot.setControlState(dir, true);
  setTimeout(() => bot.setControlState(dir, false), 1000);
}, 5000);

// حماية من الموت
bot.on('health', () => {
  if (bot.health < 10) {
    bot.chat('/home'); // مثال، يمكن تعديل الأمر حسب السيرفر
  }
});

// تسجيل كل الرسائل في الشات
bot.on('chat', (username, message) => {
  console.log(`${username}: ${message}`);
});

// إعادة اتصال تلقائي عند الانفصال
bot.on('end', () => {
  console.log('Bot disconnected, reconnecting in 5s...');
  setTimeout(() => {
    bot.connect();
  }, 5000);
});

// معالجة الأخطاء
bot.on('error', err => console.log(`Error: ${err}`));
