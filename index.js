const mineflayer = require('mineflayer');

// === الإعدادات الأساسية ===
const SERVER_HOST = '2kskydata.progamer.me';
const SERVER_VERSION = '1.19.4'; // نسخة الجافا المطلوبة

// قائمة البوتات المحددة
const BOT_NAMES = ['2kbot', 'skydatabot'];
let currentBotIndex = 0;
let bot = null;
let isSwitching = false; // لمنع تداخل عمليات الاتصال

// توقيتات الحركة (بالملي ثانية)
const MOVE_INTERVAL = 60000; // كل دقيقة
const MOVE_DURATION = 5000; // لمدة 5 ثواني
const ROTATION_TIME = 3600000; // تبديل كل ساعة

// متغيرات التحكم في الوقت (Intervals/Timeouts)
let movementTimer = null;
let stopMovementTimer = null;
let rotationTimer = null;

function createBot() {
    if (isSwitching) return;
    isSwitching = true;

    const username = BOT_NAMES[currentBotIndex];
    console.log(`\n[نظام الاتصال] محاولة إدخال البوت: ${username}...`);

    bot = mineflayer.createBot({
        host: SERVER_HOST,
        username: username,
        version: SERVER_VERSION,
        auth: 'offline',
        hideErrors: true
    });

    setupEvents();
}

function setupEvents() {
    bot.on('login', () => {
        console.log(`✅ [تم الدخول] البوت ${bot.username} متصل الآن.`);
        isSwitching = false;
    });

    bot.on('spawn', () => {
        console.log(`🎮 [الحالة] البوت في العالم الآن. بدأت أنظمة الحماية.`);
        startRoutines();
    });

    bot.on('error', (err) => {
        console.log(`🛑 [خطأ] حدث مشكل في الاتصال: ${err.message}`);
    });

    bot.on('kicked', (reason) => {
        console.log(`⚠️ [طرد] تم طرد البوت: ${reason}`);
    });

    bot.on('end', () => {
        console.log(`🔌 [فصل] البوت غير متصل الآن. التبديل للبوت التالي...`);
        cleanupAndRotate();
    });
}

// --- نظام الحركة الذكي (Anti-AFK Detection) ---
function startRoutines() {
    // إلغاء أي روتينات قديمة
    stopRoutines();

    // تشغيل نظام الحركة (كل دقيقة يتحرك 5 ثواني)
    movementTimer = setInterval(() => {
        if (!bot || !bot.entity) return;

        const actions = ['forward', 'back', 'left', 'right', 'jump'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        console.log(`🏃 [حركة] البوت يقوم بحركة (${randomAction}) لمدة 5 ثوانٍ لمنع الكشف.`);
        bot.setControlState(randomAction, true);
        if (Math.random() > 0.5) bot.setControlState('sprint', true);

        stopMovementTimer = setTimeout(() => {
            if (bot) {
                actions.forEach(a => bot.setControlState(a, false));
                bot.setControlState('sprint', false);
                console.log(`🛑 [توقف] البوت عاد لوضع السكون.`);
            }
        }, MOVE_DURATION);

    }, MOVE_INTERVAL);

    // تشغيل مؤقت المناوبة (ساعة واحدة)
    rotationTimer = setTimeout(() => {
        console.log(`🔄 [مناوبة] انتهت الساعة. جاري تبديل البوت...`);
        if (bot) bot.quit();
    }, ROTATION_TIME);
}

function stopRoutines() {
    if (movementTimer) clearInterval(movementTimer);
    if (stopMovementTimer) clearTimeout(stopMovementTimer);
    if (rotationTimer) clearTimeout(rotationTimer);
}

function cleanupAndRotate() {
    stopRoutines();
    bot = null;
    isSwitching = false;
    
    // الانتقال للبوت التالي في القائمة
    currentBotIndex = (currentBotIndex + 1) % BOT_NAMES.length;
    
    // انتظار بسيط لضمان خروج البوت الأول تماماً من السيرفر
    console.log(`⏳ انتظار 10 ثوانٍ للتأكد من خلو السيرفر قبل دخول البوت القادم...`);
    setTimeout(createBot, 10000);
}

// تشغيل النظام لأول مرة
createBot();

// التعامل مع توقف التطبيق
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
