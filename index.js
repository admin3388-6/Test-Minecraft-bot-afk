// index.js (النسخة النهائية مع تجاوز التحقق الذكي للاتصال المباشر)
try {
    const mineflayer = require('mineflayer');
    const { Vec3 } = require('vec3'); 
    const mcs = require('minecraft-server-util'); 

    // === إعدادات البوتات والاتصال ===
    const SERVER_HOST = '2k-SD.aternos.me';
    const SERVER_PORT = 51547;
    const SERVER_VERSION = '1.19.4';  

    const BOT_COUNT = 50; 
    const SERVER_PING_CHECK_INTERVAL = 10000; // تم تركه، لكن لن يُستخدم
    const STAGGER_DELAY_MIN = 3000; 
    const STAGGER_DELAY_MAX = 8000; 
    const RECONNECT_DELAY = 15000; // مهلة إعادة الاتصال (الخطة ب)
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

    const movementControls = ['forward', 'back', 'left', 'right', 'jump', 'sprint'];

    // --- الدوال المساعدة (AFK, Combat, Stuck Detection) --- (لم تتغير)

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
    // ***************************************************************


    // ************* منطق التحكم الصارم في الاتصال (تم تعطيله بالفعل) *************
    function strictConnectionControl(bot) {
        // ... (تم إبقاء الكود معطلاً)
    }
    // ***************************************************************

    // --- دوال الاتصال والتبديل ---

    function switchBot(reason, isImmediate = false) {
        if (currentBot) {
            clearTimeout(afkLoopTimeout); 
            if (stuckCheckInterval) clearTimeout(stuckCheckInterval);
            currentBot.end(); 
            currentBot = null;
        }
        
        // نظام البوت الواحد: البوت المعتمد هو دائمًا 0
        currentBotIndex = 0; 
        
        console.log(`🚨 Disconnected Reason: ${reason}.`);
        
        const waitTime = isImmediate ? 1000 : RECONNECT_DELAY; 
        
        console.log(`---> Attempting to reconnect Designated Bot #${currentBotIndex + 1} (${BOT_USERNAMES[currentBotIndex]}) in ${waitTime / 1000}s <---`);

        setTimeout(createBot, waitTime); // تم تغيير الاستدعاء إلى createBot مباشرة
    }

    // *** الخطة أ: التحقق من حالة الخادم أولاً (تم تجاوزها) ***
    async function checkServerAndCreateBot() { 
        if (isConnecting) return; 
        
        console.log("=== Bot Startup Initiated ==="); 
        console.log(`🔍 [Server Check] Pinging ${SERVER_HOST}:${SERVER_PORT}...`);
        
        try {
            const result = await mcs.status(SERVER_HOST, SERVER_PORT, { timeout: 5000, enableSRV: true });

            console.log(`✅ [Server Check] Server is active! Version: ${result.version.name}. Player Count: ${result.players.online}/${result.players.max}.`);
            
            createBot();
            
        } catch (err) {
            console.log(`🛑 [Server Check] Server is not responding. Waiting ${SERVER_PING_CHECK_INTERVAL / 1000}s before re-check. Error: ${err.message}`);
            
            setTimeout(checkServerAndCreateBot, SERVER_PING_CHECK_INTERVAL);
        }
    }

    function createBot() {
        isConnecting = true;
        const username = BOT_USERNAMES[currentBotIndex];
        const waitTime = Math.random() * (STAGGER_DELAY_MAX - STAGGER_DELAY_MIN) + STAGGER_DELAY_MIN; 

        console.log(`--- Attempting to connect Designated Bot: ${username} ---`);
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
            });

            bot.on('spawn', () => {
                console.log('✅ Bot spawned. Starting Advanced Routines.');
                
                lastPosition = bot.entity.position.clone();
                
                randomAFKLoop(bot);
                console.log('🤖 ROUTINE CHECK: AFK Loop initiated.'); 
                
                setInterval(() => lookForMobsAndAttack(bot), 500); 
                console.log('🤖 ROUTINE CHECK: Combat Scanner activated.'); 

                setInterval(() => randomHeadLook(bot), 500);
                console.log('🤖 ROUTINE CHECK: Head Look initiated.'); 
                
                setInterval(() => stuckDetection(bot), 5000); 
                console.log('🤖 ROUTINE CHECK: Stuck Detector running.'); 
            });
            
            // --- معالجة أخطاء إعادة الاتصال والتبديل (الخطة ب/استقرار البوت الواحد) ---
            
            const switchBotHandler = (reason) => {
                if (isConnecting) isConnecting = false;
                switchBot(reason, false); // استخدام مهلة RECONNECT_DELAY الافتراضية
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
                
                // الخطة ب: إذا فشل الاتصال الأولي (ECONNREFUSED، إلخ)، نقوم بالتبديل الفوري
                if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('Timeout')) {
                     if (isConnecting) isConnecting = false;
                     // نستخدم التبديل الفوري لإعادة محاولة الاتصال بالبوت المعتمد
                     switchBot(`Connection failed immediately: ${err.code || err.message}. Retrying...`, true); 
                     return;
                }
            });

            bot.on('connect', () => {
                isConnecting = false; // تم الاتصال بنجاح
            });

        }, waitTime); 
    }

    // ********** نقطة البداية الجديدة (تجاوز التحقق الذكي) **********
    createBot();

} catch (error) {
    console.error("🚨 FATAL INITIALIZATION ERROR: APPLICATION CRASHED BEFORE STARTING CORE LOGIC.");
    console.error(`Error details: ${error.message}`);
    console.error("Check 1: Ensure all dependencies are present in package.json.");
    process.exit(1);
}
