// index.js
const mineflayer = require('mineflayer');

// إعدادات البوت
const BOT_USERNAME = 'SkyDataBot'; // اسم البوت بدون مسافات
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.21.10';

// دالة إنشاء البوت
function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
  });

  // عند تسجيل الدخول
  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  // عند دخول البوت للعالم
  bot.on('spawn', () => {
    bot.chat('§9Welcome to SkyData world! Enjoy'); // رسالة ترحيب باللون الأزرق
  });

  // تحركات عشوائية كل 5 ثواني
  setInterval(() => {
    const directions = ['forward', 'back', 'left', 'right', 'jump'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    bot.setControlState(dir, true);
    setTimeout(() => bot.setControlState(dir, false), 1000);
  }, 5000);

  // حماية من الموت
  bot.on('health', () => {
    if (bot.health < 10) {
      bot.chat('/home'); // مثال، يمكنك تغييره حسب البلوك أو الأمر
    }
  });

  // تسجيل الشات
  bot.on('chat', (username, message) => {
    console.log(`${username}: ${message}`);
  });

  // تسجيل الأخطاء
  bot.on('error', err => console.log(`Error: ${err}`));

  // عند قطع الاتصال، إعادة إنشاء البوت تلقائيًا
  bot.on('end', () => {
    console.log('Bot disconnected, reconnecting in 5s...');
    setTimeout(createBot, 5000);
  });
}

// تشغيل البوت لأول مرة
createBot();
