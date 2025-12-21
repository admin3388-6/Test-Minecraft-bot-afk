const mineflayer = require('mineflayer');

// === الإعدادات الجديدة ===
const SERVER_HOST = 'ipsd2k.progamer.me'; // العنوان الجديد
const SERVER_PORT = 23170;
const SERVER_VERSION = '1.19.4'; 

const BOT_NAMES = ['2kbot', 'skydatabot'];
let currentBotIndex = 0;
let bot = null;
let isSwitching = false; // قفل لمنع دخول أكثر من بوت

// توقيتات الحركة والمناوبة
const MOVE_INTERVAL = 60000;  // كل دقيقة
const MOVE_DURATION = 5000;   // يتحرك 5 ثواني
const SWITCH_TIME = 3600000;  // تبديل كل ساعة

let moveTimer = null;
let switchTimer = null;

function createBot() {
    // نظام الحماية: التأكد من عدم وجود اتصال نشط قبل المحاولة
    if (bot || isSwitching) return;
    
    isSwitching = true;
    const username = BOT_NAMES[currentBotIndex];
    
    console.log(`\n[${new Date().toLocaleTimeString()}] 📡 محاولة الاتصال بالعنوان الجديد: ${username}...`);

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
        console.log(`✅ [${bot.username}] دخل السيرفر بنجاح.`);
        isSwitching = false;
    });

    bot.on('spawn', () => {
        console.log(`🎮 البوت في العالم الآن. بدأت روتينات الحماية.`);
        startRoutines();
    });

    bot.on('error', (err) => {
        console.log(`🛑 خطأ في الاتصال: ${err.message}`);
    });

    bot.on('kicked', (reason) => {
        console.log(`⚠️ طرد من السيرفر: ${reason}`);
    });

    bot.on('end', () => {
        console.log(`🔌 انفصل البوت. سيتم التبديل بعد مهلة 30 ثانية لضمان الأمان...`);
        cleanup();
        
        // الانتقال للبوت التالي (نظام المناوبة)
        currentBotIndex = (currentBotIndex + 1) % BOT_NAMES.length;
        
        // مهلة 30 ثانية قبل دخول البوت القادم (لمنع مشاكل التداخل)
        setTimeout(createBot, 30000);
    });
}

function startRoutines() {
    cleanup();

    // نظام الحركة العشوائية: كل 60 ثانية يتحرك لـ 5 ثواني
    moveTimer = setInterval(() => {
        if (!bot || !bot.entity) return;

        const controls = ['forward', 'back', 'left', 'right', 'jump'];
        const action = controls[Math.floor(Math.random() * controls.length)];
        
        console.log(`⚙️ حركة وقائية (Anti-AFK): ${action}`);
        bot.setControlState(action, true);

        setTimeout(() => {
            if (bot && bot.setControlState) {
                controls.forEach(c => bot.setControlState(c, false));
                console.log(`🛑 توقف الحركة والعودة للسكون.`);
            }
        }, MOVE_DURATION);
    }, MOVE_INTERVAL);

    // نظام التبديل التلقائي كل ساعة
    switchTimer = setTimeout(() => {
        console.log(`🔄 حان وقت التبديل الدوري (كل ساعة). جاري إخراج البوت...`);
        if (bot) bot.quit();
    }, SWITCH_TIME);
}

function cleanup() {
    if (moveTimer) clearInterval(moveTimer);
    if (switchTimer) clearTimeout(switchTimer);
    bot = null;
    isSwitching = false;
}

// تشغيل النظام
createBot();
