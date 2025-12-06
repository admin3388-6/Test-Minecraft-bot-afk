// index.js
const mineflayer = require('mineflayer');

// === إعدادات البوت ===
const BOT_USERNAME = 'demons'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
// الإبقاء على الإصدار القديم كما طلب المستخدم
const SERVER_VERSION = '1.19.4'; 

// قائمة بأوامر الحركة التي يمكن للبوت تنفيذها
const movementControls = ['forward', 'back', 'left', 'right', 'jump'];

function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    hideErrors: true 
  });

  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  bot.on('spawn', () => {
    console.log('Bot spawned. Advanced AFK and Mob Defense routine started.');
    // بدء روتين الحركة العشوائية
    randomAFKLoop();
    // بدء روتين البحث عن الوحوش والهجوم عليها (يفحص كل ثانية)
    setInterval(() => lookForMobsAndAttack(bot), 1000); 
  });

  // دالة الحركة العشوائية (الأكثر تطوراً)
  function randomAFKLoop() {
    // 1. إيقاف كل الحركات الحالية
    for (const control of movementControls) {
      bot.setControlState(control, false);
    }

    // 2. تحديد مدة الحركة العشوائية (بين 5 إلى 20 ثانية)
    // المدة بالمللي ثانية
    const movementDuration = Math.random() * (20000 - 5000) + 5000;
    
    // 3. تحديد الحركات الجديدة بشكل عشوائي (يختار حركة أو اثنتين)
    const randomControls = [];
    const numControls = Math.floor(Math.random() * 2) + 1; 
    for (let i = 0; i < numControls; i++) {
        const randomIndex = Math.floor(Math.random() * movementControls.length);
        const control = movementControls[randomIndex];
        if (!randomControls.includes(control)) {
            randomControls.push(control);
        }
    }

    // 4. تفعيل الحركات المختارة
    for (const control of randomControls) {
        bot.setControlState(control, true);
    }
    
    // 5. حركة الرأس والجسم (360 درجة عشوائية)
    const yaw = Math.random() * Math.PI * 2; // دوران 360 درجة للجسم
    const pitch = (Math.random() * Math.PI / 2) - (Math.PI / 4); // حركة رأس عشوائية (-45 إلى +45 درجة)
    bot.look(yaw, pitch, true); 

    console.log(`Moving: ${randomControls.join(', ')} for ${Math.round(movementDuration / 1000)}s`);

    // 6. توقف الحركة وبدء الدورة التالية
    setTimeout(() => {
        // إيقاف جميع الحركات بعد انتهاء المدة
        for (const control of movementControls) {
          bot.setControlState(control, false);
        }
        // استدعاء الدالة مجدداً لبدء حركة جديدة عشوائية
        randomAFKLoop(); 
    }, movementDuration);
  }

  // دالة البحث عن الوحوش والهجوم (Mob Defense)
  function lookForMobsAndAttack(bot) {
    // أنواع الكيانات المعادية الشائعة
    const hostileMobs = ['zombie', 'skeleton', 'spider', 'creeper'];
    
    const filter = entity => (
      entity.type === 'mob' && 
      hostileMobs.includes(entity.name) && 
      bot.entity.position.distanceTo(entity.position) < 10 // نطاق رؤية 10 بلوكات
    );

    const target = bot.nearestEntity(filter);

    if (target) {
      // إيقاف الحركة المؤقتة للتركيز على الهدف والهجوم عليه
      for (const control of movementControls) {
        bot.setControlState(control, false);
      }
      
      console.log(`Attacking nearest hostile mob: ${target.name}`);
      
      bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
        bot.attack(target);
      });
    }
  }

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
