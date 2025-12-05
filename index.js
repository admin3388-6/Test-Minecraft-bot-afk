// index.js
const mineflayer = require('mineflayer');

// إعدادات البوت
const BOT_USERNAME = 'SkyDataBot'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.21'; 

// دالة إنشاء البوت
function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
  });

  // **تمت إزالة جميع محاولات منع الشات الفاشلة**
  // **تمت إزالة جميع أوامر الشات والإعلانات**

  // عند تسجيل الدخول
  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  // عند دخول البوت للعالم
  bot.on('spawn', () => {
    console.log('Bot is spawned and AFK interval started (Silent Mode).');
  });

  // تحركات عشوائية كل 5 ثواني
  setInterval(() => {
    const directions = ['forward', 'back', 'left', 'right', 'jump'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    bot.setControlState(dir, true);
    setTimeout(() => bot.setControlState(dir, false), 1000);
  }, 5000);

  // تسجيل الأخطاء
  bot.on('error', err => console.log(`Error: ${err}`));

  // عند قطع الاتصال، إعادة إنشاء البوت تلقائيًا
  bot.on('end', () => {
    console.log('Bot disconnected, reconnecting in 5s...');
    // **نعتمد على إعادة الاتصال السريعة**
    setTimeout(createBot, 5000); 
  });
}

// تشغيل البوت لأول مرة
createBot();
