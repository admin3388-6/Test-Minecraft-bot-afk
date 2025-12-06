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
    wood: block => block && (block.name.includes('log') || block.name.includes('wood')),
    stone: block => block && (block.name.includes('stone') || block.name.includes('ore') || block.name.includes('cobblestone')),
    soil: block => block && (block.name.includes('dirt') || block.name.includes('sand') || block.name.includes('gravel'))
};

function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    auth: 'offline', // الحل النهائي لتجاوز مشكلة Microsoft/Mojang
    hideErrors: true 
  });

  let defaultMovements;

  // تحميل الإضافات
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);

  bot.on('login', () => {
    console.log(`Bot logged in as ${bot.username} (Offline Mode)`);
  });

  bot.on('spawn', () => {
    console.log('Bot spawned. Advanced AI routine started.');
    
    // 1. تفعيل إعدادات PathFinder
    defaultMovements = new Movements(bot, bot.registry);
    defaultMovements.canDig = true; // السماح للبوت بالكسر (مع استخدام الأداة الصحيحة تلقائياً)
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

  // دالة البحث عن المادة
  function findClosestBlock(materialType) {
      return bot.findBlock({
          matching: collectableMaterials[materialType],
          maxDistance: 64,
          allowUnsafe: true 
      });
  }

  // دالة كسر البلوك (تستخدم الأداة الصحيحة تلقائياً)
  function breakAndCollect(block) {
      if (!block) return;

      console.log(`Breaking ${block.name}...`);
      
      // mineflayer سيختار أفضل أداة في المخزون تلقائياً ويكسر البلوك
      bot.dig(block, (err) => {
          if (err) {
              console.log('Error breaking block:', err.message);
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

          // 3. جمع الموارد (البحث عن الخشب أولاً)
          if (!bot.pathfinder.isGoalSet()) {
              const tree = findClosestBlock('wood');
              if (tree) {
                  console.log('GATHER PRIORITY: Moving to chop wood.');
                  // الهدف هو الوصول إلى نقطة قريبة من البلوك
                  const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 2);
                  bot.pathfinder.setGoal(goal, true);
                  
                  // عند الوصول، ابدأ بكسر البلوك
                  bot.once('goal_reached', () => {
                      breakAndCollect(tree);
                  });
              } else {
                  // 4. لا يوجد هدف: تنقل عشوائي لتجنب الكشف
                  console.log('No goals, starting slow random walk.');
                  // يمكن إضافة منطق تنقل بطيء هنا
                  
              }
          }
      }, 3000); // يفحص الأهداف كل 3 ثوان
  }

  // --- معالجة الأخطاء والرسائل ---
  bot.on('kicked', (reason) => console.log(`Kicked for reason: ${reason}`));
  bot.on('error', (err) => {
      // طباعة رسائل الخطأ غير المتعلقة بالاتصال
      if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND') {
         console.log(`Bot Error: ${err.message}`);
      }
  });

  return bot;
}

createBot();
