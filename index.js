const mineflayer = require('mineflayer');

// إعدادات البوت
const bot = mineflayer.createBot({
  host: 'skydata.aternos.me', // عنوان السيرفر
  port: 28068,               // المنفذ
  username: 'SkyDataBot',    // اسم البوت بدون مسافات
  version: '1.21.10',        // نفس إصدار السيرفر
  // إذا أردت إضافة كلمة مرور للحساب يمكن هنا
  // password: 'password'
});

// عند دخول البوت
bot.on('login', () => {
  console.log(`Bot logged in as ${bot.username}`);
});

// رسالة ترحيبية عند الدخول
bot.on('spawn', () => {
  bot.chat('/say §9Welcome to SkyData world! Enjoy'); // §9 للون الأزرق
});

// منع البوت من AFK
bot.setControlState('forward', true);

// حماية من الموت
bot.on('health', () => {
  if (bot.health < 10) {
    bot.chat('/home'); // مثال، أو يمكنك تفعيل أمر الشفاء المناسب
  }
});

// تسجيل كل أحداث البوت
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
