// index.js
const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalNear } = require('mineflayer-pathfinder').goals;
const Movements = require('mineflayer-pathfinder').Movements;
const pvp = require('mineflayer-pvp').plugin; 

// === إعدادات البوت ===
const BOT_USERNAME = 'demons'; 
const SERVER_HOST = 'skydata.aternos.me';
const SERVER_PORT = 28068;
const SERVER_VERSION = '1.19.4'; 

// قائمة بأنواع البلوكات التي يمكن للبوت جمعها
const collectableMaterials = {
    // الخشب (Wood): يستخدم الفأس تلقائياً
    wood: block => block.name.includes('log') || block.name.includes('wood'), 
    // الحجر (Stone): يستخدم البيكاكس تلقائياً
    stone: block => block.name.includes('stone') || block.name.includes('ore'), 
    // الرمل/التراب (Sand/Dirt): يستخدم الشوفل تلقائياً
    soil: block => block.name.includes('dirt') || block.name.includes('sand')
};

function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    auth: 'microsoft', // ضروري لتسجيل الدخول الحديث
    hideErrors: true 
  });

  let defaultMovements;

  // تحميل الإضافات
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);

  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username}`);
  });

  bot.on('spawn', () => {
    console.log('Bot spawned. Advanced AI routine started.');
    
    // 1. تفعيل إعدادات PathFinder
    defaultMovements = new Movements(bot, bot.registry);
    defaultMovements.canDig = true; // السماح للبوت بالكسر
    bot.pathfinder.setMovements(defaultMovements);

    // 2. بدء حلقة الذكاء الاصطناعي الرئيسية
    startAILoop(); 
  });

  // --- دوال القتال والبحث عن الهدف ---

  // دالة تصفية الأهداف (يهاجم الوحوش فقط)
  function findHostileMob() {
      // البحث عن أقرب كيان من نوع 'mob' وليس 'player'
      return bot.nearestEntity(entity => {
          const isHostileMob = entity.type === 'mob';
          const isAlive = entity.health > 0;
          return isHostileMob && isAlive;
      });
  }

  // دالة البحث عن المادة (مثلاً: الخشب)
  function findClosestBlock(materialType) {
      return bot.findBlock({
          matching: collectableMaterials[materialType],
          maxDistance: 64,
          allowUnsafe: true // يسمح بالبحث عن بلوكات غير قابلة للكسر فوراً
      });
  }

  // دالة كسر البلوك (تستخدم الأداة الصحيحة تلقائياً)
  function breakAndCollect(block) {
      if (!block) return;

      console.log(`Breaking ${block.name} at ${block.position.x}, ${block.position.y}, ${block.position.z}`);
      
      // mineflayer سيختار أفضل أداة في المخزون تلقائياً ويكسر البلوك
      bot.dig(block, (err) => {
          if (err) {
              console.log('Error breaking block:', err.message);
              // إذا كان هناك خطأ، يعود للبحث عن هدف جديد
              return; 
          }
          console.log(`Successfully collected ${block.name}.`);
      });
  }

  // --- حلقة الذكاء الاصطناعي الرئيسية (تحديد الأولويات) ---
  function startAILoop() {
      setInterval(() => {
          // 1. الأولوية القصوى: القتال والدفاع
          const target = findHostileMob();
          if (target) {
              if (!bot.pvp.target) {
                console.log(`ATTACK PRIORITY: Attacking ${target.name}`);
                bot.pvp.attack(target); // يبدأ القتال
              }
              return; 
          }

          // 2. إلغاء أي هدف قتال سابق إذا لم يعد هناك وحوش
          if (bot.pvp.target) {
              bot.pvp.stop();
          }

          // 3. جمع الموارد (إذا لم يكن هناك هدف تنقل حالي)
          if (!bot.pathfinder.isGoalSet()) {
              const tree = findClosestBlock('wood');
              if (tree) {
                  console.log('GATHER PRIORITY: Moving to chop wood.');
                  const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 1);
                  bot.pathfinder.setGoal(goal, true);
                  
                  bot.once('goal_reached', () => {
                      breakAndCollect(tree);
                  });
              } else {
                  // 4. لا يوجد هدف: تنقل عشوائي لتجنب الحظر
                  console.log('No specific goal, wandering.');
                  // (يمكن إضافة منطق تنقل عشوائي بسيط هنا)
                  
              }
          }
      }, 3000); // يفحص الأهداف كل 3 ثوان
  }

  // --- معالجة الأخطاء والرسائل ---
  bot.on('kicked', (reason) => console.log(`Kicked for reason: ${reason}`));
  bot.on('error', (err) => console.log(`Bot Error: ${err.message}`));
  bot.on('chat', (username, message) => {
    if (message === 'حالة') {
        bot.chat(`I am currently ${bot.pathfinder.isGoalSet() ? 'moving' : 'idle'}.`);
    }
  });

  return bot;
}

createBot();
