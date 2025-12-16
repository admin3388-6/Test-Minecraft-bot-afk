// index.js (النسخة النهائية مع نظام التناوب الدوري ومراقبة الاتصال الفريد)
try {
    const mineflayer = require('mineflayer');
    const { Vec3 } = require('vec3'); 
    const mcs = require('minecraft-server-util'); 

    // === إعدادات البوتات والاتصال ===
    const SERVER_HOST = '2kskydata.progamer.me';
    const SERVER_PORT = 23170;
    const SERVER_VERSION = '1.19.4';  

    const BOT_COUNT = 50; 
    const STAGGER_DELAY_MIN = 3000; 
    const STAGGER_DELAY_MAX = 8000; 
    const RECONNECT_DELAY = 20000; // مهلة إعادة الاتصال بعد الفصل (20 ثانية)
    const FORCED_SWITCH_MIN = 3600000; // 1 ساعة (للتبديل الدوري)
    const FORCED_SWITCH_MAX = 10800000; // 3 ساعات (للتبديل الدوري)
    const COMBAT_RANGE = 15; 
    const STUCK_THRESHOLD_SECONDS = 30; 

    // قائمة كبيرة بالأسماء الواقعية والمميزة
    const BASE_USERNAMES = [
        'SkyData', 'SkyData_One', 'SkyData_X', 'SkyData_Raid', 'SkyData_Ghost', 
        'AetherLord', 'EnderKnight', 'NetherRex', 'LavaFlow', 'CrimsonHawk',
        'ShadowFox', 'ViperVenom', 'IronHeart', 'StoneEdge', 'GoldRush',
        'DarkBlade', 'SwiftArrow', 'PixelGuru', 'AlphaGamer', 'NexusCore',
        'TitaniumX', 'VectorX', 'MysticElf', 'WitchKing', 'DragonSoul',
        'RainDrops', 'SunRay', 'MoonLight', 'StarDust', 'CloudNine',
        'PhoenixFly', 'Grizzly', 'StormBringer', 'ZeroCool', 'UltraMan',
        'KingCraft', 'QueenGame', 'DukeMine', 'LordRealm', 'PrincePvP',
        'Agent47', 'Ranger', 'Guardian', 'Sentinel', 'Spectre',
        'HunterXD', 'NinjaFlow', 'SamuraiCode', 'GlitchBuster' 
    ];

    // توليد أسماء فريدة لـ 50 بوت
    const BOT_USERNAMES = [];
    for (let i = 0; i < BOT_COUNT; i++) {
        const baseName = BASE_USERNAMES[i % BASE_USERNAMES.length];
        const uniqueName = `${baseName}${i > 0 ? i : ''}`;
        BOT_USERNAMES.push(uniqueName);
    }

    let currentBotIndex = 0; 
    let currentBot = null; 
    let afkLoopTimeout = null; 
    let stuckCheckInterval = null; 
    let lastPosition = null; 
    let isConnecting = false; 
    let isBotActive = false; // ******* متغير جديد لمراقبة البوت النشط *******
    let combatInterval = null; 
    let headLookInterval = null; 
    let stuckInterval = null; 
    let forcedRotationTimeout = null; 

    const movementControls = ['forward', 'back', 'left', 'right', 'jump', 'sprint'];

    // --- الدوال المساعدة (AFK, Combat, Stuck Detection) ---
    // (جميع الدوال الفرعية لم تتغير)
    
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
             randomAFKLoop(bot);
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
                        
                        console.log(`⚠️ STUCK DETECTED! No movement for ${STUCK_THRESHOLD_SECONDS}s. Using /spawn command.`);
                        
                        for (const control of movementControls) {
                            bot.setControlState(control, false);
                        }
                        
                        bot.chat('/spawn'); 
                        
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
    
    // *** دالة التناوب الدوري ***
    function startForcedRotation(bot) {
        if (forcedRotationTimeout) {
            clearTimeout(forcedRotationTimeout);
            forcedRotationTimeout = null;
        }

        const randomTime = Math.random() * (FORCED_SWITCH_MAX - FORCED_SWITCH_MIN) + FORCED_SWITCH_MIN;
        const hours = Math.floor(randomTime / 3600000);
        const minutes = Math.floor((randomTime % 3600000) / 60000);

        console.log(`🔄 FORCED ROTATION: Current bot (${bot.username}) will switch in ${hours}h ${minutes}m.`);
        
        forcedRotationTimeout = setTimeout(() => {
            console.log(`⚡ FORCED ROTATION TRIGGERED: Switching bot to simulate human disconnect.`);
            switchBot("Forced periodic rotation", false); 
        }, randomTime);
    }
    // **********************************

    // --- دالة تنظيف الروتينات عند الفصل ---
    function cleanupRoutines() {
        if (afkLoopTimeout) {
            clearTimeout(afkLoopTimeout);
            afkLoopTimeout = null;
        }
        if (stuckCheckInterval) {
            clearTimeout(stuckCheckInterval);
            stuckCheckInterval = null;
        }
        if (combatInterval) {
            clearInterval(combatInterval);
            combatInterval = null;
        }
        if (headLookInterval) {
            clearInterval(headLookInterval);
            headLookInterval = null;
        }
        if (stuckInterval) {
            clearInterval(stuckInterval);
            stuckInterval = null;
        }
        if (forcedRotationTimeout) { 
            clearTimeout(forcedRotationTimeout);
            forcedRotationTimeout = null;
        }
        
        if (currentBot) {
            for (const control of movementControls) {
                currentBot.setControlState(control, false);
            }
        }
    }
    // ------------------------------------

    // --- دوال الاتصال والتبديل (تم تعديل التبديل ليدور بين جميع البوتات) ---

    function switchBot(reason, isImmediate = false) {
        cleanupRoutines(); 
        
        // ** التحديث هنا **
        isBotActive = false;
        
        if (currentBot) {
            currentBot.end(); 
            currentBot = null;
        }
        
        // الانتقال إلى البوت التالي
        currentBotIndex = (currentBotIndex + 1) % BOT_COUNT; 
        
        console.log(`🚨 Disconnected Reason: ${reason}.`);
        
        const waitTime = isImmediate ? 1000 : RECONNECT_DELAY; 
        
        console.log(`---> Attempting to connect Bot #${currentBotIndex + 1} (${BOT_USERNAMES[currentBotIndex]}) in ${waitTime / 1000}s <---`);

        setTimeout(createBot, waitTime); 
    }

    function createBot() {
        // ******* التعديل الحاسم: إذا كان هناك بوت نشط، لا تحاول الاتصال *******
        if (isBotActive) {
            console.log("⚠️ Connection attempt blocked: A bot is already active or connecting.");
            return;
        }
        
        isConnecting = true;
        const username = BOT_USERNAMES[currentBotIndex];
        // انتظار 1 ثانية فقط للبوتات اللاحقة (لتقليل الفجوة الزمنية)
        const waitTime = currentBotIndex === 0 ? Math.random() * (STAGGER_DELAY_MAX - STAGGER_DELAY_MIN) + STAGGER_DELAY_MIN : 1000; 

        console.log("=== Bot Startup Initiated ==="); 
        console.log(`--- Attempting to connect Bot: ${username} ---`);
        console.log(`⏳ STAGGERED LOGIN: Waiting ${Math.round(waitTime / 1000)}s before connecting...`);

        // ****** نظام الدخول المتدرج ******
        setTimeout(() => {
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
                isBotActive = true; // ** تحديث حالة البوت النشط **
            });

            bot.on('spawn', () => {
                console.log('✅ Bot spawned. Starting Advanced Routines.');
                
                lastPosition = bot.entity.position.clone();
                
                startForcedRotation(bot);

                randomAFKLoop(bot);
                console.log('🤖 ROUTINE CHECK: AFK Loop initiated.'); 
                
                combatInterval = setInterval(() => lookForMobsAndAttack(bot), 500); 
                console.log('🤖 ROUTINE CHECK: Combat Scanner activated.'); 

                headLookInterval = setInterval(() => randomHeadLook(bot), 500);
                console.log('🤖 ROUTINE CHECK: Head Look initiated.'); 
                
                stuckInterval = setInterval(() => stuckDetection(bot), 5000); 
                console.log('🤖 ROUTINE CHECK: Stuck Detector running.'); 
            });
            
            // --- معالجة أخطاء إعادة الاتصال والتبديل ---
            
            const switchBotHandler = (reason) => {
                if (isConnecting) isConnecting = false;
                switchBot(reason, false); 
            };

            bot.on('kicked', (reason) => {
                const kickMessage = (typeof reason === 'object' && reason.translate) ? reason.translate : String(reason);
                console.log(`🚨 KICKED REASON: ${kickMessage}`); 
                switchBotHandler(`Kicked! Reason: ${kickMessage}`);
            });

            bot.on('end', (reason) => {
                if (reason === 'quitting' || reason === 'disconnect.quitting') return; 
                switchBotHandler(`Bot disconnected. Reason: ${reason}`);
            });

            bot.on('error', (err) => {
                console.log(`🛑 Bot Error: ${err.message}`);
                
                if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('Timeout') || err.message.includes('Login failed')) {
                     if (isConnecting) isConnecting = false;
                     // التبديل الفوري (isImmediate = true) لاستخدام البوت التالي على الفور
                     switchBot(`Connection failed immediately: ${err.code || err.message}. Switching to next bot.`, true); 
                     return;
                }
            });

            bot.on('connect', () => {
                isConnecting = false; 
            });

        }, waitTime); 
    }

    // ********** نقطة البداية **********
    createBot();

} catch (error) {
    console.error("🚨 FATAL INITIALIZATION ERROR: APPLICATION CRASHED BEFORE STARTING CORE LOGIC.");
    console.error(`Error details: ${error.message}`);
    process.exit(1);
}
