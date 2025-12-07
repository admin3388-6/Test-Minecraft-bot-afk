// index.js (النسخة النهائية مع نظام التبديل والقتال العدواني)
const mineflayer = require('mineflayer');

// === إعدادات البوتات والاتصال ===
// قائمة البوتات (يمكنك تغيير هذه الأسماء بأسماء أكثر عشوائية إذا أردت)
const BOT_USERNAMES = [
    'Player_Alpha', 
    'Agent_Beta', 
    'Unit_Gama', 
    'Spectr_Delta', 
    'Echo_Bot', 
    'Nexus_One',
    'Raid_Zero'
]; 

const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.19.4'; 
const SWITCH_DELAY = 30000; // 30 ثانية انتظار قبل محاولة البوت التالي
const COMBAT_RANGE = 15; // نطاق الهجوم المطلوب (15 بلوكة)

let currentBotIndex = 0; // مؤشر البوت الحالي
let currentBot = null; // البوت النشط حالياً
let afkLoopTimeout = null; // للتحكم في توقف وبدء الحركة العشوائية

// قائمة بأوامر الحركة للحركة العشوائية
const movementControls = ['forward', 'back', 'left', 'right', 'jump'];

// --- دوال الحركة والقتال ---

// دالة الحركة العشوائية (AFK)
function randomAFKLoop(bot) {
    if (!bot || !bot.entity) return;
    
    // إيقاف كل الحركات السابقة
    for (const control of movementControls) {
        bot.setControlState(control, false);
    }
    
    // إذا كان هناك قتال، لا تبدأ الحركة العشوائية
    const target = bot.nearestEntity(entity => entity.type === 'mob');
    if (target && bot.entity.position.distanceTo(target.position) <= COMBAT_RANGE) {
        // تأكد من مسح المؤقت القديم
        clearTimeout(afkLoopTimeout); 
        return; 
    }


    // 1. تحديد حركة عشوائية ومدة زمنية
    const randomControl = movementControls[Math.floor(Math.random() * movementControls.length)];
    const movementDuration = Math.random() * 5000 + 1000; // 1 إلى 6 ثواني

    console.log(`AFK: Moving ${randomControl} for ${Math.round(movementDuration / 1000)} seconds.`);
    bot.setControlState(randomControl, true);

    // 2. توقف الحركة وبدء الدورة التالية
    afkLoopTimeout = setTimeout(() => {
        // إيقاف الحركة
        bot.setControlState(randomControl, false);
        // استدعاء الدالة مجدداً لبدء حركة جديدة عشوائية بعد 1 ثانية
        randomAFKLoop(bot); 
    }, movementDuration);
}

// دالة البحث عن الوحوش والهجوم (Mob Defense) - النطاق 15 بلوكة
function lookForMobsAndAttack(bot) {
    if (!bot || !bot.entity) return;
    
    // الأنواع: كل أنواع Mob (الوحوش والحيوانات)
    const filter = entity => (
        entity.type === 'mob' && 
        bot.entity.position.distanceTo(entity.position) <= COMBAT_RANGE 
    );

    const target = bot.nearestEntity(filter);

    if (target) {
        // 1. إيقاف الحركة العشوائية فوراً
        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        clearTimeout(afkLoopTimeout);
        
        console.log(`⚔️ COMBAT PRIORITY: Engaging ${target.name} (Distance: ${bot.entity.position.distanceTo(target.position).toFixed(1)} blocks).`);
        
        // 2. النظر إلى الهدف (ضروري للهجوم)
        bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
             // 3. الهجوم الفوري (mineflayer سيستخدم السيف إذا كان مجهزاً)
             bot.attack(target, true); // true هنا يعني هجوم بالزر الأيسر (السيف/الأداة)
             
             // 4. مطاردة بسيطة
             if (bot.entity.position.distanceTo(target.position) > 3) {
                 bot.setControlState('forward', true); // تحرك للأمام لملاحقة الهدف
             } else {
                 bot.setControlState('forward', false); // توقف عند الاقتراب جداً
             }
        });
        
    } else if (!afkLoopTimeout) {
         // إذا لم يكن هناك هدف قتالي، أعد تشغيل AFK إذا كان متوقفاً
         randomAFKLoop(bot);
    }
}


// --- دوال الاتصال والتبديل ---

function createBot() {
    const username = BOT_USERNAMES[currentBotIndex];
    console.log(`--- Attempting to connect Bot #${currentBotIndex + 1}: ${username} ---`);

    const bot = mineflayer.createBot({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: username,
        version: SERVER_VERSION,
        auth: 'offline', 
        hideErrors: true 
    });

    currentBot = bot; 

    bot.on('login', () => {
        console.log(`✅ Bot logged in as ${bot.username}`);
    });

    bot.on('spawn', () => {
        console.log('✅ Bot spawned. Starting AFK and Combat routines.');
        
        // 1. بدء روتين الحركة العشوائية
        randomAFKLoop(bot);
        
        // 2. بدء روتين البحث عن الوحوش والهجوم (يفحص كل 500ms للهجوم الفوري)
        setInterval(() => lookForMobsAndAttack(bot), 500); 
    });
    
    // --- معالجة أخطاء إعادة الاتصال والتبديل ---
    
    const switchBot = (reason) => {
        if (currentBot) {
            // إيقاف جميع مؤقتات الحركة والقتال قبل التبديل
            clearTimeout(afkLoopTimeout); 
            currentBot.end(); 
            currentBot = null;
        }
        
        // الانتقال إلى البوت التالي في القائمة
        currentBotIndex = (currentBotIndex + 1) % BOT_USERNAMES.length; 
        
        console.log(`🚨 Disconnected Reason: ${reason}. Switching to next bot in ${SWITCH_DELAY / 1000}s.`);
        console.log(`---> Next Bot Index: #${currentBotIndex + 1} (${BOT_USERNAMES[currentBotIndex]}) <---`);

        // الانتظار 30 ثانية قبل محاولة الاتصال بالبوت الجديد
        setTimeout(createBot, SWITCH_DELAY);
    };

    bot.on('kicked', (reason) => {
        const kickMessage = (typeof reason === 'object' && reason.translate) ? reason.translate : String(reason);
        switchBot(`Kicked! Reason: ${kickMessage}`);
    });

    bot.on('end', (reason) => {
        switchBot(`Bot disconnected. Reason: ${reason}`);
    });

    bot.on('error', (err) => {
        console.log(`🛑 Bot Error: ${err.message}`);
    });

    return bot;
}

// بدء العملية بالبوت الأول
createBot();
