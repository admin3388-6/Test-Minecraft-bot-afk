// index.js
const mineflayer = require('mineflayer');

// إعدادات البوت
const BOT_USERNAME = 'SkyDataBot'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.21'; // نتركه 1.21 لتجربة أفضل توافق ممكن

// رابط الديسكورد و إعدادات الرسالة
const DISCORD_LINK = 'https://discord.gg/6m3c2up4p3';

// رسالة JSON المنسقة (ككائن نصي واحد ليتم تنفيذه بواسطة tellraw)
// تم تبسيط الكائن ليتناسب مع أمر tellraw
const JSON_TEXT = '{"text":"Join the SkyData Discord server: ","color":"green","extra":[{"text":"[Click Here to Join]","color":"aqua","bold":true,"clickEvent":{"action":"open_url","value":"' + DISCORD_LINK + '"},"hoverEvent":{"action":"show_text","value":{"text":"' + DISCORD_LINK + '","color":"aqua"}}}]}';

// الأمر الكامل الذي سيتم تنفيذه كل 5 دقائق
const TELLRAW_COMMAND = `/tellraw @a ${JSON_TEXT}`;


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
    
    // تفعيل إرسال رسالة الديسكورد كل 5 دقائق (300,000 مللي ثانية)
    // ملاحظة: يجب أن يكون البوت OP (مشرف) ليعمل الأمر /tellraw
    setInterval(() => {
      bot.chat(TELLRAW_COMMAND); // نرسل الأمر كرسالة شات
      console.log('Discord link command sent.');
    }, 5 * 60 * 1000); // 5 دقائق

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

  // تسجيل الشات
  bot.on('chat', (username, message) => {
    // هذا الجزء هو الذي كان يفشل في معالجة رسالة الديسكورد، لكن الآن سيتعامل معها بشكل مختلف
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
