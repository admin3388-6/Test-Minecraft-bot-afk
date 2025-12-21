const mineflayer = require('mineflayer');

// === الإعدادات ===
const SERVER_HOST = '2kskydata.progamer.me';
const SERVER_PORT = 23170; // المنفذ الذي حددته
const SERVER_VERSION = '1.19.4'; 

const BOT_NAMES = ['2kbot', 'skydatabot'];
let currentBotIndex = 0;
let bot = null;
let isAttemptingConnect = false;

// توقيتات
const MOVE_INTERVAL = 60000; // كل دقيقة
const MOVE_DURATION = 5000;  // يتحرك 5 ثواني
const ROTATION_TIME = 3600000; // تبديل كل ساعة

let movementTimer = null;
let rotationTimer = null;

function createBot() {
    // نظام حماية: منع دخول أكثر من بوت في نفس الوقت
    if (bot || isAttemptingConnect) return;
    
    isAttemptingConnect = true;
    const username = BOT_NAMES[currentBotIndex];
    
    console.log(`\n[${new Date().toLocaleTimeString()}] 📡 محاولة دخول: ${username}...`);

    bot = mineflayer.createBot({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: username,
        version: SERVER_VERSION,
        auth: 'offline',
        checkTimeoutInterval: 60000
    });

    setupEvents();
}

function setupEvents() {
    bot.on('login', () => {
        console.log(`✅ تم تسجيل الدخول: ${bot.username}`);
        isAttemptingConnect = false;
    });

    bot.on('spawn', () => {
        console.log(`🎮 البوت متصل الآن في العالم.`);
        startRoutines();
    });

    bot.on('kicked', (reason) => {
        console.log(`⚠️ تم الطرد: ${reason}`);
    });

    bot.on('error', (err) => {
        console.log(`🛑 خطأ في الاتصال: ${err.message}`);
    });

    bot.on('end', () => {
        console.log(`🔌 انقطع الاتصال. التجهيز لتبديل البوت...`);
        cleanupAndRotate();
    });
}

function startRoutines() {
    // إلغاء أي مؤقتات سابقة لتجنب التداخل
    stopRoutines();

    // 1. نظام الحركة العشوائية (كل دقيقة يتحرك 5 ثواني)
    movementTimer = setInterval(() => {
        if (!bot || !bot.entity) return;

        const actions = ['forward', 'back', 'left', 'right', 'jump'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        console.log(`🏃 حركة عشوائية: ${randomAction}`);
        bot.setControlState(randomAction, true);

        setTimeout(() => {
            if (bot && bot.setControlState) {
                actions.forEach(a => bot.setControlState(a, false));
                console.log(`🛑 توقف الحركة.`);
            }
        }, MOVE_DURATION);
    }, MOVE_INTERVAL);

    // 2. نظام المناوبة (تبديل البوت كل ساعة)
    rotationTimer = setTimeout(() => {
        console.log(`🔄 انتهت الساعة، جاري تبديل البوت الآن لتعزيز الحماية...`);
        if (bot) bot.quit();
    }, ROTATION_TIME);
}

function stopRoutines() {
    if (movementTimer) clearInterval(movementTimer);
    if (rotationTimer) clearTimeout(rotationTimer);
}

function cleanupAndRotate() {
    stopRoutines();
    bot = null;
    isAttemptingConnect = false;
    
    // الانتقال للاسم التالي
    currentBotIndex = (currentBotIndex + 1) % BOT_NAMES.length;
    
    // مهلة 30 ثانية قبل دخول البوت الثاني لضمان خروج الأول تماماً (حسب طلبك)
    console.log(`⏳ انتظار 30 ثانية قبل إدخال البوت التالي...`);
    setTimeout(createBot, 30000);
}

// نقطة الانطلاق
createBot();
