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

  // **الحل الحاسم للاستقرار:** تعطيل معالجة حزم الشات الواردة لمنع التعطل الداخلي
  // هذا يمنع خطأ 'unknown chat format code' ويمنع أي تفاعل مع اللاعبين.
  bot._client.on('system_chat', () => {}); 
  bot._client.on('player_chat', () => {}); 
  bot.on('message', (message) => {}); // يمنع التعطل على مستوى Mineflayer

  // عند تسجيل الدخول
  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  // عند دخول البوت للعالم
  bot.on('spawn', () => {
    // **تم إزالة جميع أوامر الإعلان الدورية والرسائل الترحيبية**
    console.log('Bot is spawned and AFK interval started (Silent Mode).');
  });

  // تحركات عشوائية كل 5 ثواني
  setInterval(() => {
    const directions = ['forward', 'back', 'left', 'right', 'jump'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    bot.setControlState(dir, true);
    setTimeout(() => bot.setControlState(dir, false), 1000);
  }, 5000);

  // **تم إزالة حماية الموت (bot.chat('/home')) لمنع أي أوامر شات متبقية**
  // bot.on('health', () => { ... });

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
