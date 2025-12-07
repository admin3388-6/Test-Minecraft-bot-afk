// index.js (النسخة النهائية مع نظام التبديل والقتال)
const mineflayer = require('mineflayer');

// === إعدادات البوتات والاتصال ===
// قائمة البوتات التي ستدخل بالدور
const BOT_USERNAMES = [
    'demons_1', 
    'demons_2', 
    'demons_3', 
    'demons_4', 
    'demons_5'
]; 

const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.19.4'; 
const SWITCH_DELAY = 30000; // 30 ثانية انتظار قبل محاولة البوت التالي

let currentBotIndex = 0; // مؤشر البوت الحالي
let currentBot = null; // البوت النشط حالياً

// قائمة بأوامر الحركة للحركة العشوائية
const movementControls = ['forward', 'back', 'left', 'right', 'jump'];

// --- دوال الحركة والقتال ---

// دالة الحركة العشوائية (AFK)
function randomAFKLoop(bot) {
    if (!bot || !bot.entity) return;

    // 1. إيقاف كل الحركات الحالية
    for (const control of movementControls) {
        bot.setControlState(control, false);
    }

    // 2. تحديد حركة عشوائية ومدة زمنية
    const randomControl = movementControls[Math.floor(Math.random() * movementControls.length)];
    const movementDuration = Math.random() * 5000 + 1000; // 1 إلى 6 ثواني

    console.log(`AFK: Moving ${randomControl} for ${Math.round(movementDuration / 1000)} seconds.`);
    bot.setControlState(randomControl, true);

    // 3. توقف الحركة وبدء الدورة التالية
    setTimeout(() => {
        // إيقاف الحركة
        bot.setControlState(randomControl, false);
        // استدعاء الدالة مجدداً لبدء حركة جديدة عشوائية بعد 1 ثانية
        setTimeout(() => randomAFKLoop(bot), 1000); 
    }, movementDuration);
}

// دالة البحث عن الوحوش والهجوم (Mob Defense) - النطاق 15 بلوكة
function lookForMobsAndAttack(bot) {
    if (!bot || !bot.entity) return;
    
    // أنواع الكيانات المعادية (Hostile Mobs)
    const hostileMobs = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch'];
    
    // الفلتر: الكيانات من نوع Mob، اسم معادٍ، وفي نطاق 15 بلوكة
    const filter = entity => (
        entity.type === 'mob' && 
        hostileMobs.includes(entity.name) && 
        bot.entity.position.distanceTo(entity.position) <= 15 
    );

    const target = bot.nearestEntity(filter);

    if (target) {
        // إيقاف الحركة العشوائية للتركيز على القتال
        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        
        console.log(`COMBAT PRIORITY: Attacking nearest hostile mob: ${target.name} (Range 15).`);
        
        // 1. النظر إلى الهدف
        bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
             // 2. الهجوم
             bot.attack(target);
        });
        
        // يمكن هنا إضافة منطق للمطاردة إذا كان بعيداً جداً، لكننا نركز الآن على الهجوم في نطاق الرؤية.
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

    currentBot = bot; // تعيين البوت الحالي

    bot.on('login', () => {
        console.log(`✅ Bot logged in as ${bot.username}`);
    });

    bot.on('spawn', () => {
        console.log('✅ Bot spawned. Starting AFK and Combat routines.');
        
        // 1. بدء روتين الحركة العشوائية
        randomAFKLoop(bot);
        
        // 2. بدء روتين البحث عن الوحوش والهجوم (يفحص كل ثانية)
        setInterval(() => lookForMobsAndAttack(bot), 1000); 
    });
    
    // --- معالجة أخطاء إعادة الاتصال والتبديل ---
    
    const switchBot = (reason) => {
        // إذا كان البوت ما زال موجوداً، قم بمسح الاتصال (قد لا تكون ضرورية لكنها آمنة)
        if (currentBot) {
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
        // لا نحتاج لتبديل البوت فوراً في حالة الـ Error، نعتمد على حدث 'end' ليتولى الأمر
    });

    return bot;
}

// بدء العملية بالبوت الأول
createBot();
