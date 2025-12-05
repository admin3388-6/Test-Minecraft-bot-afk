// index.js
const mineflayer = require('mineflayer');

// إعدادات البوت
const BOT_USERNAME = 'SkyDataBot'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.21'; // نستخدم 1.21

// رابط الديسكورد ورسالة نصية بسيطة (للتوافق المطلق)
const DISCORD_LINK = 'https://discord.gg/6m3c2up4p3';
const SIMPLE_DISCORD_MESSAGE = `Join the SkyData Discord server: ${DISCORD_LINK}`; 

// الأمر الذي سيتم تنفيذه: البوت يقول (say) الرسالة
// *ملاحظة: يجب أن يكون البوت OP (مشرف) ليعمل الأمر /say*
const SAY_COMMAND = `/say ${SIMPLE_DISCORD_MESSAGE}`; 

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
    
    // تفعيل إرسال رسالة الديسكورد كل 1 دقيقة (60,000 ملي ثانية)
    setInterval(() => {
      // نستخدم أمر /say لتفادي مشاكل bot.chat()
      bot.chat(SAY_COMMAND); 
      console.log('Say command sent.');
    }, 60 * 1000); // 1 دقيقة

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

  // **تم تعطيل معالج الشات**
  // bot.on('chat', (username, message) => {
  //   console.log(`${username}: ${message}`);
  // });

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
