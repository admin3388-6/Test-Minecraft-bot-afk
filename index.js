// index.js (النسخة النهائية - مع منطق الخروج الذكي ورسائل تشخيص الحركة)
const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3'); 

// === إعدادات البوتات والاتصال ===
const SERVER_HOST = 'Play-game.aternos.me';
const SERVER_PORT = 54480;
const SERVER_VERSION = '1.19.4';  // يجب التأكد من إصدار الخادم الفعلي
const SWITCH_DELAY = 10000; // 10 ثوان انتظار قبل محاولة البوت التالي
const COMBAT_RANGE = 15; // نطاق الهجوم
const STUCK_THRESHOLD_SECONDS = 30; // مهلة التعليق

// توليد أسماء البوتات: Onegame، Onegame2، ... Onegame10
const BOT_USERNAMES = ['Onegame'];
for (let i = 2; i <= 10; i++) {
    BOT_USERNAMES.push(`Onegame${i}`);
} 

let currentBotIndex = 0; 
let currentBot = null; 
let afkLoopTimeout = null; 
let stuckCheckInterval = null; 
let lastPosition = null; 

const movementControls = ['forward', 'back', 'left', 'right', 'jump', 'sprint'];

// --- دوال التحسينات البشرية والقتال ---

async function equipBestWeapon(bot) {
    const sword = bot.inventory.items().find(item => item.name.includes('sword'));
    if (sword) {
        await bot.equip(sword, 'hand').catch(() => {});
        return true;
    }
    return false;
}

function randomAFKLoop(bot) {
    if (!bot || !bot.entity) return;
    
    for (const control of movementControls) {
        bot.setControlState(control, false);
    }
    
    // الأولوية للقتال: إذا كان هناك وحش قريب، لا تدخل في حلقة AFK العشوائية
    if (bot.nearestEntity(entity => entity.type === 'mob' && bot.entity.position.distanceTo(entity.position) <= COMBAT_RANGE)) {
        clearTimeout(afkLoopTimeout); 
        return; 
    }

    const randomControl = movementControls[Math.floor(Math.random() * movementControls.length)];
    let movementDuration = Math.random() * 5000 + 1000; 

    console.log(`AFK: Moving ${randomControl} for ${Math.round(movementDuration / 1000)}s. Sprinting/Jumping.`);
    
    bot.setControlState(randomControl, true);
    bot.setControlState('sprint', true);
    if (Math.random() > 0.5) bot.setControlState('jump', true);

    if (Math.random() < 0.2) {
        movementDuration = 1000; 
        bot.look(bot.entity.yaw + Math.PI * 2, bot.entity.pitch, true);
        console.log("AFK: Performing 360-degree spin.");
    }
    
    afkLoopTimeout = setTimeout(() => {
        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        randomAFKLoop(bot); 
    }, movementDuration);
}

function randomHeadLook(bot) {
    if (!bot || !bot.entity) return;

    const yaw = bot.entity.yaw + (Math.random() * 0.5 - 0.25); 
    const pitch = bot.entity.pitch + (Math.random() * 0.5 - 0.25); 
    
    bot.look(yaw, pitch, true).catch(() => {}); 
}

async function lookForMobsAndAttack(bot) {
    if (!bot || !bot.entity) return;
    
    const filter = entity => (
        entity.type === 'mob' && 
        bot.entity.position.distanceTo(entity.position) <= COMBAT_RANGE 
    );

    const target = bot.nearestEntity(filter);

    if (target) {
        await equipBestWeapon(bot);

        for (const control of movementControls) {
            bot.setControlState(control, false);
        }
        clearTimeout(afkLoopTimeout);
        
        console.log(`⚔️ COMBAT PRIORITY: Engaging ${target.name} (Distance: ${bot.entity.position.distanceTo(target.position).toFixed(1)} blocks).`);
        
        bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
             bot.attack(target, true); 
             
             if (bot.entity.position.distanceTo(target.position) > 3) {
                 bot.setControlState('forward', true);
             } else {
                 bot.setControlState('forward', false);
             }
        });
        
    } else if (!afkLoopTimeout) {
         randomAFKLoop(bot); // إذا لم يكن هناك هدف قتال، ابدأ AFK
    }
}

function stuckDetection(bot) {
    if (!bot || !bot.entity || !lastPosition) return;

    const isMoving = movementControls.some(control => bot.getControlState(control));

    if (isMoving && bot.entity.position.distanceTo(lastPosition) < 0.1) {
        
        if (stuckCheckInterval === null) {
            console.log(`[Stuck Check] Started ${STUCK_THRESHOLD_SECONDS}s timer.`);
            stuckCheckInterval = setTimeout(() => {
                
                if (bot.entity.position.distanceTo(lastPosition) < 0.1) {
                    console.log(`⚠️ STUCK DETECTED! No movement for ${STUCK_THRESHOLD_SECONDS}s. Teleporting to spawn.`);
                    
                    for (const control of movementControls) {
                        bot.setControlState(control, false);
                    }
                    bot.chat('/spawn'); // أمر الاستعادة
                } else {
                    console.log("[Stuck Check] Timer expired, but bot moved just in time.");
                }

                stuckCheckInterval = null; 
            }, STUCK_THRESHOLD_SECONDS * 1000); 

        }
    } else {
        if (stuckCheckInterval) {
            console.log("[Stuck Check] Movement detected, resetting timer.");
            clearTimeout(stuckCheckInterval);
            stuckCheckInterval = null;
        }
    }
    lastPosition = bot.entity.position.clone();
}


// ************* منطق الخروج الذكي *************
function checkAndSwitch(bot) {
    if (!bot || !bot.entity) return;

    const connectedPlayers = Object.keys(bot.players);
    const myBotsConnected = connectedPlayers.filter(name => BOT_USERNAMES.includes(name));

    if (myBotsConnected.length > 1) {
        
        const isTheDesignatedBot = bot.username === BOT_USERNAMES[0]; // نختار Onegame ليكون الأهم

        if (isTheDesignatedBot) {
            console.log(`[Smart Switch] ${bot.username} is the designated keeper. Remaining connected.`);
            return;
        }

        console.log(`🚨 [Smart Switch] Found ${myBotsConnected.length} bots connected (Target: 1). Disconnecting ${bot.username} immediately.`);
        
        switchBot(`Too many bots connected (Target: 1).`, true); 
        return; 
    }
}
// **********************************************

// --- دوال الاتصال والتبديل ---

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

    setTimeout(createBot, SWITCH_DELAY);
}

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
        
        lastPosition = bot.entity.position.clone();

        // 1. فحص البوتات المتصلة فور التجسيد 
        checkAndSwitch(bot); 
        
        // 2. بدء روتين الحركة العشوائية (AFK)
        randomAFKLoop(bot);
        console.log('🤖 ROUTINE CHECK: AFK Loop initiated.'); // رسالة تأكيد 1
        
        // 3. بدء روتين البحث عن الوحوش والهجوم 
        setInterval(() => lookForMobsAndAttack(bot), 500); 
        console.log('🤖 ROUTINE CHECK: Combat Scanner activated.'); // رسالة تأكيد 2

        // 4. بدء روتين حركة الرأس
        setInterval(() => randomHeadLook(bot), 500);
        console.log('🤖 ROUTINE CHECK: Head Look initiated.'); // رسالة تأكيد 3
        
        // 5. فحص التعليق
        setInterval(() => stuckDetection(bot), 5000); 
        console.log('🤖 ROUTINE CHECK: Stuck Detector running.'); // رسالة تأكيد 4
    });
    
    // --- معالجة أخطاء إعادة الاتصال والتبديل ---
    
    const switchBotHandler = (reason) => {
        if (currentBot) {
            clearTimeout(afkLoopTimeout); 
            if (stuckCheckInterval) clearTimeout(stuckCheckInterval); 
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
        switchBotHandler(`Kicked! Reason: ${kickMessage}`);
    });

    bot.on('end', (reason) => {
        switchBotHandler(`Bot disconnected. Reason: ${reason}`);
    });

    bot.on('error', (err) => {
        console.log(`🛑 Bot Error: ${err.message}`);
    });

    return bot;
}

// بدء العملية بالبوت الأول
createBot();
