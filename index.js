// index.js (النسخة النهائية - التحركات البشرية والتبديل والقتال)
const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3'); 

// === إعدادات البوتات والاتصال ===
// 1. قائمة البوتات (10 أسماء عشوائية)
const BOT_USERNAMES = [
    'Player_Alpha', 'Agent_Beta', 'Unit_Gama', 'Spectr_Delta', 'Echo_Bot', 
    'Nexus_One', 'Raid_Zero', 'Morpheus_X', 'Sky_Walker', 'Ghost_Rider'
]; 

const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.19.4'; 
const SWITCH_DELAY = 30000; // 30 ثانية انتظار قبل محاولة البوت التالي
const COMBAT_RANGE = 15; // نطاق الهجوم

let currentBotIndex = 0; 
let currentBot = null; 
let afkLoopTimeout = null; 
let stuckCheckInterval = null; 
let lastPosition = null; 

// قائمة بأوامر الحركة
const movementControls = ['forward', 'back', 'left', 'right', 'jump', 'sprint'];

// --- دوال التحسينات البشرية والقتال ---

// 1. تجهيز أفضل سلاح في المخزون
async function equipBestWeapon(bot) {
    const sword = bot.inventory.items().find(item => item.name.includes('sword'));
    if (sword) {
        // لا نحتاج للانتظار هنا، فقط نفذ الأمر
        await bot.equip(sword, 'hand').catch(err => {
            // هذا الخطأ شائع إذا كان السيف مجهزاً بالفعل
            // console.log(`Failed to equip sword: ${err.message}`);
        });
        return true;
    }
    return false;
}

// 2. الحركة العشوائية (AFK) والتحركات البشرية
function randomAFKLoop(bot) {
    if (!bot || !bot.entity) return;
    
    // إيقاف جميع الحركات السابقة
    for (const control of movementControls) {
        bot.setControlState(control, false);
    }
    
    // إذا كان هناك قتال، لا تبدأ الحركة العشوائية
    if (bot.nearestEntity(entity => entity.type === 'mob' && bot.entity.position.distanceTo(entity.position) <= COMBAT_RANGE)) {
        clearTimeout(afkLoopTimeout); 
        return; 
    }

    // 1. تحديد حركة عشوائية ومدة زمنية
    const randomControl = movementControls[Math.floor(Math.random() * movementControls.length)];
    let movementDuration = Math.random() * 5000 + 1000; 

    console.log(`AFK: Moving ${randomControl} for ${Math.round(movementDuration / 1000)}s. Sprinting/Jumping.`);
    
    // تفعيل الجري والقفز مع الحركة لتبدو كلاعب حقيقي
    bot.setControlState(randomControl, true);
    bot.setControlState('sprint', true);
    if (Math.random() > 0.5) bot.setControlState('jump', true);

    // 2. الدوران 360 درجة بشكل دوري (20% فرصة)
    if (Math.random() < 0.2) {
        movementDuration = 1000; // تقليل مدة الحركة للتركيز على الدوران
        bot.look(bot.entity.yaw + Math.PI * 2, bot.entity.pitch, true);
        console.log("AFK: Performing 360-degree spin.");
    }
    
    // 3. توقف الحركة وبدء الدورة التالية
    afkLoopTimeout = setTimeout(() => {
        // إيقاف الحركة
        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        // استدعاء الدالة مجدداً
        randomAFKLoop(bot); 
    }, movementDuration);
}

// 3. حركة الرأس كلاعب حقيقي
function randomHeadLook(bot) {
    if (!bot || !bot.entity) return;

    // النظر عشوائياً في نطاق ضيق لحركة رأس طبيعية
    const yaw = bot.entity.yaw + (Math.random() * 0.5 - 0.25); // تغيير أفقي بسيط
    const pitch = bot.entity.pitch + (Math.random() * 0.5 - 0.25); // تغيير عمودي بسيط
    
    bot.look(yaw, pitch, true).catch(() => {}); // catch() لتجنب التعطل عند الانفصال
}

// 4. دالة الهجوم الفوري
async function lookForMobsAndAttack(bot) {
    if (!bot || !bot.entity) return;
    
    // الهجوم على كل أنواع الكيانات (وحوش أو حيوانات)
    const filter = entity => (
        entity.type === 'mob' && 
        bot.entity.position.distanceTo(entity.position) <= COMBAT_RANGE 
    );

    const target = bot.nearestEntity(filter);

    if (target) {
        // 1. تجهيز السلاح (تأكد من وجوده في اليد)
        await equipBestWeapon(bot);

        // 2. إيقاف الحركة العشوائية فوراً
        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        clearTimeout(afkLoopTimeout);
        
        console.log(`⚔️ COMBAT PRIORITY: Engaging ${target.name} (Distance: ${bot.entity.position.distanceTo(target.position).toFixed(1)} blocks).`);
        
        // 3. النظر والهجوم
        bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
             bot.attack(target, true); // هجوم فوري
             
             // 4. مطاردة بسيطة
             if (bot.entity.position.distanceTo(target.position) > 3) {
                 bot.setControlState('forward', true);
             } else {
                 bot.setControlState('forward', false);
             }
        });
        
    } else if (!afkLoopTimeout) {
         // إذا لم يكن هناك هدف قتالي، أعد تشغيل AFK إذا كان متوقفاً
         randomAFKLoop(bot);
    }
}

// 5. دالة التحقق من التعليق والعودة إلى نقطة البداية
function stuckDetection(bot) {
    if (!bot || !bot.entity || !lastPosition) return;

    // إذا كان يتحرك (أحد أزرار التحكم مضغوط)
    const isMoving = movementControls.some(control => bot.getControlState(control));

    // إذا لم يتغير الموضع لأكثر من 5 ثوانٍ وكان يحاول التحرك (مسافة أقل من 0.1 بلوك)
    if (isMoving && bot.entity.position.distanceTo(lastPosition) < 0.1) {
        console.log("⚠️ STUCK DETECTED! Teleporting to spawn.");
        // إيقاف الحركة قبل تنفيذ الأمر
        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        // تنفيذ أمر العودة إلى نقطة البداية (يتطلب صلاحيات OP)
        bot.chat('/spawn'); 
    }
    // تحديث آخر موضع
    lastPosition = bot.entity.position.clone();
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
        console.log('✅ Bot spawned. Starting Advanced Routines.');
        
        // تعيين الموضع الأولي للتحقق من التعليق
        lastPosition = bot.entity.position.clone();

        // 1. بدء روتين الحركة العشوائية (AFK)
        randomAFKLoop(bot);
        
        // 2. بدء روتين البحث عن الوحوش والهجوم (يفحص كل 500ms للهجوم الفوري)
        setInterval(() => lookForMobsAndAttack(bot), 500); 

        // 3. بدء روتين حركة الرأس (يفحص كل 500ms)
        setInterval(() => randomHeadLook(bot), 500);
        
        // 4. بدء روتين فحص التعليق (يفحص كل 5 ثوانٍ)
        stuckCheckInterval = setInterval(() => stuckDetection(bot), 5000); 
    });
    
    // --- معالجة أخطاء إعادة الاتصال والتبديل ---
    
    const switchBot = (reason) => {
        if (currentBot) {
            // مسح كل المؤقتات قبل التبديل
            clearTimeout(afkLoopTimeout); 
            clearInterval(stuckCheckInterval);
            currentBot.end(); 
            currentBot = null;
        }
        
        currentBotIndex = (currentBotIndex + 1) % BOT_USERNAMES.length; 
        
        console.log(`🚨 Disconnected Reason: ${reason}. Switching to next bot in ${SWITCH_DELAY / 1000}s.`);
        console.log(`---> Next Bot Index: #${currentBotIndex + 1} (${BOT_USERNAMES[currentBotIndex]}) <---`);

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
