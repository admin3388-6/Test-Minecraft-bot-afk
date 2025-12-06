// index.js
const mineflayer = require('mineflayer');

// === إعدادات البوت ===
const BOT_USERNAME = 'demons'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
// الحل النهائي لخطأ الفصل: استخدام بروتوكول قديم مستقر
const SERVER_VERSION = '1.19.4'; 

// دالة إنشاء البوت
function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    // إخفاء الأخطاء التي قد تسبب تعطل البوت
    hideErrors: true 
  });

  // عند تسجيل الدخول
  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  // عند دخول البوت للعالم
  bot.on('spawn', () => {
    console.log('Bot is spawned and AFK interval started (Stable Silent Mode).');
    
    // === الحركة البديلة AFK (حركة أمام/خلف دورية) ===
    
    // نبدأ بتعيين حالة التحكم الأولية للامام
    bot.setControlState('forward', true);

    // حلقة الحركة لتبديل الاتجاه كل 5 ثواني
    setInterval(() => {
        // تبديل بين الأمام (forward) والخلف (back)
        if (bot.controlState.forward) {
          bot.setControlState('forward', false);
          bot.setControlState('back', true);
        } else if (bot.controlState.back) {
          bot.setControlState('back', false);
          bot.setControlState('forward', true);
        } else {
            // حالة بدئية أو حالة خطأ: ابدأ للأمام
            bot.setControlState('forward', true);
        }
        
        // إضافة قفزة عشوائية أحياناً
        if (Math.random() < 0.3) { // قفزة عشوائية بنسبة 30%
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 200);
        }

    }, 5000); // تغيير الاتجاه كل 5 ثواني
  });

  // تسجيل الأخطاء
  bot.on('error', err => console.log(`Error: ${err}`));

  // عند قطع الاتصال، إعادة إنشاء البوت تلقائيًا
  bot.on('end', () => {
    console.log('Bot disconnected, reconnecting in 5s...');
    // إعادة الاتصال السريعة كضمان أخير
    setTimeout(createBot, 5000); 
  });
}

// تشغيل البوت لأول مرة
createBot();
