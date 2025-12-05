// index.js
const mineflayer = require('mineflayer');

// إعدادات البوت
const BOT_USERNAME = 'SkyDataBot'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;

// ***** الحل الأخير: تغيير إصدار البوت إلى بروتوكول سابق *****
const SERVER_VERSION = '1.19.4'; 

// دالة إنشاء البوت
function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    hideErrors: true 
  });

  // عند تسجيل الدخول
  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });
  
  // ... (باقي الكود كما هو)

  // عند قطع الاتصال، إعادة إنشاء البوت تلقائيًا
  bot.on('end', () => {
    console.log('Bot disconnected, reconnecting in 5s...');
    setTimeout(createBot, 5000); 
  });
}

// تشغيل البوت لأول مرة
createBot();
