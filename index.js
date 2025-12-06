const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalNear } = require('mineflayer-pathfinder').goals;
const Movements = require('mineflayer-pathfinder').Movements;
const pvp = require('mineflayer-pvp').plugin; // لإضافة منطق القتال

// --- قم بملء تفاصيل الاتصال الخاصة بك هنا ---
const bot = mineflayer.createBot({
    host: 'localhost', // أو عنوان IP الخاص بخادمك (مثلاً: aternos-server.net)
    port: 25565,       // أو المنفذ الخاص بخادمك
    username: 'JasonDuck9736',
    auth: 'microsoft'  // 'mojang' أو 'microsoft'
});
// ---------------------------------------------

let defaultMovements;

// تفعيل الإضافات
bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);

bot.once('spawn', () => {
    console.log('Bot Spawned. Initializing AI...');
    defaultMovements = new Movements(bot, bot.registry);
    
    // إعدادات الحركة: السماح للبوت بكسر البلوكات
    defaultMovements.canDig = true; 
    
    // إعدادات البوت لاستخدام أفضل أداة لكسر البلوكات
    bot.pathfinder.setMovements(defaultMovements);

    // ابدأ البحث عن الأهداف بعد 5 ثوانٍ
    setTimeout(startAILoop, 5000); 
});

// --- دوال القتال والبحث عن الهدف ---

// دالة تصفية الأهداف (يهاجم الوحوش فقط، يتجاهل اللاعبين)
function findHostileMob() {
    return bot.nearestEntity(entity => {
        // نتحقق من النوع: نريد فقط الوحوش (Mobs)، وليس اللاعبين (player)
        const isHostileMob = entity.type === 'mob' && entity.name !== 'player';
        
        // يجب أن يكون الكيان على قيد الحياة
        const isAlive = entity.health > 0;

        return isHostileMob && isAlive;
    });
}

// دالة البحث عن أقرب شجرة
function findClosestTree() {
    return bot.findBlock({
        matching: block => block.name.includes('log'), // البحث عن أي نوع من الخشب
        maxDistance: 64 // البحث ضمن نطاق 64 بلوكة
    });
}

// --- حلقة الذكاء الاصطناعي الرئيسية (تحديد الأولويات) ---
function startAILoop() {
    setInterval(() => {
        // الأولوية 1: القتال (إذا كان هناك وحش قريب)
        const target = findHostileMob();
        if (target) {
            console.log(`ATTACK PRIORITY: Attacking ${target.name}`);
            // يقوم pvp بالانتقال إلى الهدف وتجهيز السيف والهجوم
            bot.pvp.attack(target); 
            return; // توقف عن تنفيذ باقي المهام
        }

        // الأولوية 2: جمع الخشب (إذا لم يكن هناك قتال)
        if (!bot.pathfinder.is</pathfinder.is>GoalSet()) {
            const tree = findClosestTree();
            if (tree) {
                console.log('GATHER PRIORITY: Moving to chop wood.');
                // ضع هدف التنقل
                const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 1);
                bot.pathfinder.setGoal(goal, true);
                
                // بمجرد الوصول، يبدأ بالكسر
                bot.once('goal_reached', () => {
                    chopBlock(tree);
                });
            } else {
                // إذا لم يجد هدفًا، يمشي بشكل عشوائي وببطء لتجنب الكشف
                console.log('No goals, walking slowly.');
                // هنا يمكن إضافة منطق التنقل البشري البطيء بدلاً من العشوائي
            }
        }
    }, 5000); // يفحص الأهداف كل 5 ثوان
}

// دالة الكسر الذكية (تستخدم الأداة الصحيحة)
function chopBlock(block) {
    if (block.name.includes('log') || block.name.includes('wood')) {
        // يقوم mineflayer تلقائياً بالبحث عن أفضل فأس في المخزون وتجهيزه
        bot.dig(block, (err) => {
            if (err) {
                console.log('Error chopping block:', err);
                return;
            }
            console.log(`Successfully chopped ${block.name}.`);
            // بعد الكسر، يبحث عن شجرة أخرى أو يعود للروتين
            startAILoop(); 
        });
    }
}

// --- معالجة الأخطاء والرسائل ---
bot.on('kicked', (reason) => console.log(`Kicked for reason: ${reason}`));
bot.on('error', (err) => console.log(`Bot Error: ${err.message}`));
bot.on('chat', (username, message) => {
    if (message === 'حالة') {
        bot.chat(`I am currently ${bot.pathfinder.isGoalSet() ? 'moving' : 'idle'}.`);
    }
});
