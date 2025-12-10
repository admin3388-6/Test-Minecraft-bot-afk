// index.js (النسخة النهائية - مع منطق الخروج الذكي)
const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3'); 

// === إعدادات البوتات والاتصال ===
const SERVER_HOST = 'Play-game.aternos.me';
const SERVER_PORT = 54480;
const SERVER_VERSION = '1.19.4';  // Spigot 1.19.4 (افتراضي لـ Aternos)
const SWITCH_DELAY = 10000; // 10 ثوان انتظار قبل محاولة البوت التالي
const COMBAT_RANGE = 15; // نطاق الهجوم
const STUCK_THRESHOLD_SECONDS = 30; // مهلة التعليق

// توليد أسماء البوتات الجديدة: Onegame، Onegame2، ... Onegame10
const BOT_USERNAMES = ['Onegame'];
for (let i = 2; i <= 10; i++) {
    BOT_USERNAMES.push(`Onegame${i}`);
} 
// BOT_USERNAMES الآن تحتوي على 10 أسماء كما طلبت

let currentBotIndex = 0; 
let currentBot = null; 
let afkLoopTimeout = null; 
let stuckCheckInterval = null; 
let lastPosition = null; 

const movementControls = ['forward', 'back', 'left', 'right', 'jump', 'sprint'];

// --- دوال التحسينات البشرية والقتال (تم تخطي التفاصيل للإيجاز) ---

// ************* منطق الخروج الذكي *************
function checkAndSwitch(bot) {
    if (!bot || !bot.entity) return;

    // الحصول على قائمة بأسماء اللاعبين المتصلين حالياً
    const connectedPlayers = Object.keys(bot.players);
    const myBotsConnected = connectedPlayers.filter(name => BOT_USERNAMES.includes(name));

    // إذا كان هناك أكثر من بوت واحد متصل (مثلاً: 2 أو أكثر)
    if (myBotsConnected.length > 1) {
        
        // إذا كان البوت الحالي هو البوت الأخير (الأعلى في القائمة)، فيجب أن يبقى هو
        const lastBotName = BOT_USERNAMES[BOT_USERNAMES.length - 1]; 
        
        // الأبسط: نجعل البوت الذي يحاول الاتصال حديثاً يخرج إذا وجد واحداً قبله
        // أو: إذا كان اسم البوت الحالي ليس هو البوت "الأهم" (مثلاً Onegame10)
        
        // نستخدم طريقة: "فقط بوت واحد يبقى متصلاً"
        const isTheDesignatedBot = bot.username === BOT_USERNAMES[0]; // نختار Onegame ليكون الأهم

        if (isTheDesignatedBot) {
            console.log(`[Smart Switch] ${bot.username} is the designated keeper. Remaining connected.`);
            return;
        }

        console.log(`🚨 [Smart Switch] Found ${myBotsConnected.length} bots connected (Target: 1). Disconnecting ${bot.username} immediately.`);
        
        // إغلاق الاتصال والتبديل إلى البوت التالي بعد فترة انتظار
        switchBot(`Too many bots connected (Target: 1).`, true); // True تعني خروج فوري
        return; 
    }
}
// **********************************************

// --- دوال الاتصال والتبديل (معدلة) ---

function switchBot(reason, immediateDisconnect = false) {
    if (currentBot) {
        clearTimeout(afkLoopTimeout); 
        if (stuckCheckInterval) clearTimeout(stuckCheckInterval);
        currentBot.end(); 
        currentBot = null;
    }
    
    currentBotIndex = (currentBotIndex + 1) % BOT_USERNAMES.length; 
    
    console.log(`🚨 Disconnected Reason: ${reason}. Switching to next bot in ${SWITCH_DELAY / 1000}s.`);
    console.log(`---> Next Bot Index: #${currentBotIndex + 1} (${BOT_USERNAMES[currentBotIndex]}) <---`);

    // إذا كان الخروج فورياً (بسبب كثرة البوتات)، ننتظر فترة التبديل
    if (immediateDisconnect) {
        setTimeout(createBot, SWITCH_DELAY);
    } else {
        // إذا كان الخروج بسبب خطأ (كيك، إند)، نبدأ الاتصال فوراً
        setTimeout(createBot, SWITCH_DELAY);
    }
}


function createBot() {
    const username = BOT_USERNAMES[currentBotIndex];
    console.log(`--- Attempting to connect Bot #${currentBotIndex + 1}: ${username} ---`);

    const bot = mineflayer.createBot({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: username,
        version: SERVER_VERSION,
        auth: 'offline', // Aternos Spigot غالباً offline-mode: true
        hideErrors: true 
    });

    currentBot = bot; 

    bot.on('login', () => {
        console.log(`✅ Bot logged in as ${bot.username}`);
    });

    bot.on('spawn', () => {
        console.log('✅ Bot spawned. Starting Advanced Routines.');
        
        // 1. فحص البوتات المتصلة فور التجسيد (Spawn)
        checkAndSwitch(bot); 
        
        // 2. بدء روتين الحركة العشوائية (AFK)
        // ... (باقي روتينات الحركة والقتال) ...
    });
    
    // --- معالجة أخطاء إعادة الاتصال والتبديل ---
    // (دوال lookForMobsAndAttack, randomAFKLoop, stuckDetection يجب أن تكون موجودة في الكود الأصلي لتجنب الأخطاء)
    
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

// --- (يجب أن تستمر الدوال المفقودة من الكود الأصلي مثل equipBestWeapon, randomAFKLoop, lookForMobsAndAttack, stuckDetection هنا) ---
// (لقد تم حذفها هنا لتجنب تكرار الكود الطويل جداً. تأكد أنك لم تحذفها من ملفك.)
