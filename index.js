// index.js
const mineflayer = require('mineflayer');

// إعدادات البوت
const BOT_USERNAME = 'SkyDataBot'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.21'; 

// قائمة الرسائل العادية (بدون ألوان أو روابط)
const ANNOUNCEMENT_MESSAGES = [
    "/say Welcome, enjoy Sky Data!",
    "/say Don't forget to visit the Discord server (Link in description!).",
    "/say Warning: Violating the rules will result in a permanent ban.",
    "/say Sky Data welcomes you. Have a great time!",
    "/say Server is protected by our AFK bot. Please follow the rules."
];

// دالة لاختيار رسالة عشوائية
function getRandomMessage() {
    const index = Math.floor(Math.random() * ANNOUNCEMENT_MESSAGES.length);
    return ANNOUNCEMENT_MESSAGES[index];
}


// دالة إنشاء البوت
function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
  });

  // **الحل الحاسم للاستقرار:** تجاهل معالجات حزم الشات لمنع التعطل الداخلي
  // هذا يحل مشكلة 'unknown chat format code: [object Object]' بشكل نهائي.
  bot._client.on('system_chat', () => {}); 
  bot._client.on('player_chat', () => {}); 
  bot.on('message', (message) => {}); // كحماية إضافية


  // عند تسجيل الدخول
  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  // عند دخول البوت للعالم
  bot.on('spawn', () => {
    
    // تفعيل إرسال رسالة عشوائية كل 2 دقيقة (120,000 ملي ثانية)
    setInterval(() => {
      const messageToSend = getRandomMessage();
      // نستخدم أمر /say مع رسالة غير ملونة
      bot.chat(messageToSend); 
      console.log(`Announcement sent: ${messageToSend}`);
    }, 2 * 60 * 1000); // 2 دقيقة

    console.log('Bot is spawned and AFK interval started.');
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
      bot.chat('/home');
    }
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
