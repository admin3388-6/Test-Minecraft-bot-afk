// index.js (النسخة النهائية والمستقرة)
const mineflayer = require('mineflayer');
// جلب دالة Vec3 وهي مطلوبة لبعض عمليات mineflayer الداخلية
const { Vec3 } = require('vec3'); 
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
    // يكسر الخشب
    wood: block => block && (block.name.includes('log') || block.name.includes('wood')),
    // يكسر الحجر والمعادن
    stone: block => block && (block.name.includes('stone') || block.name.includes('ore') || block.name.includes('cobblestone')),
    // يكسر التراب والرمل
    soil: block => block && (block.name.includes('dirt') || block.name.includes('sand') || block.name.includes('gravel'))
};

// دالة لمعالجة إعادة الاتصال
const RECONNECT_DELAY = 5000; // 5 ثواني
function reconnect() {
    console.log(`Connection lost. Attempting reconnect in ${RECONNECT_DELAY / 1000} seconds...`);
    setTimeout(createBot, RECONNECT_DELAY);
}

function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    auth: 'offline', // يحل مشكلة المصادقة
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
    console.log('Bot spawned. Advanced AI routine started (DELAYED 10s).');
    
    // 1. تفعيل إعدادات PathFinder
    defaultMovements = new Movements(bot, bot.registry);
    defaultMovements.canDig = true; // يسمح له بالكسر
    defaultMovements.allowSprinting = false; // Anti-Cheat: لتقليل الاكتشاف
    bot.pathfinder.setMovements(defaultMovements);

    // 2. بدء حلقة الذكاء الاصطناعي الرئيسية
    setTimeout(startAILoop, 10000); // Anti-Cheat: تأخير 10 ثواني
  });

  // --- دوال القتال والبحث عن الهدف ---
  function findHostileMob() {
      // البحث عن أقرب وحش معادٍ لا يزال حياً
      return bot.nearestEntity(entity => {
          const isHostileMob = entity.type === 'mob';
          const isAlive = entity.health > 0;
          return isHostileMob && isAlive;
      });
  }

  function findClosestBlock(materialType) {
      return bot.findBlock({
          matching: collectableMaterials[materialType],
          maxDistance: 64,
          allowUnsafe: true 
      });
  }

  // **>> الدالة المُعدلة لضمان الكسر وإلغاء الجمود <<**
  function breakAndCollect(block) {
      // إذا كان البلوك غير موجود (مثلاً: تم كسره من لاعب آخر)، قم بمسح الهدف
      if (!block) {
          bot.pathfinder.setGoal(null);
          return;
      }
      
      // 1. يجب على البوت النظر إلى البلوك قبل الكسر
      bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true, () => {
          console.log(`Breaking ${block.name}...`);
          
          // 2. الكسر الفعلي
          // mineflayer سيختار أفضل أداة في المخزون تلقائياً
          bot.dig(block, (err) => {
              if (err) {
                  // إذا حدث خطأ (عدم وجود أداة، خطأ في الحماية)، قم بمسح الهدف
                  console.log(`Error breaking block: ${err.message}. Clearing goal to unfreeze.`);
                  bot.pathfinder.setGoal(null); // الحل لعدم الجمود
                  return; 
              }
              console.log(`Successfully collected ${block.name}.`);
              // بعد الكسر الناجح، قم بمسح الهدف للبحث عن هدف جديد فوراً
              bot.pathfinder.setGoal(null);
          });
      });
  }

  // --- حلقة الذكاء الاصطناعي الرئيسية (تحديد الأولويات) ---
  function startAILoop() {
      // تأكد من أن البوت لا يزال موجوداً في اللعبة
      if (bot.entity === null) return; 

      setInterval(() => {
          // 1. الأولوية القصوى: القتال
          const target = findHostileMob();
          if (target) {
              if (!bot.pvp.target) {
                console.log(`ATTACK PRIORITY: Attacking ${target.name}`);
                bot.pvp.attack(target); 
              }
              return; 
          }
          if (bot.pvp.target) {
              bot.pvp.stop();
          }

          // 2. الأولوية الثانية: التجميع (إذا لم يكن هناك هدف حالي)
          if (!bot.pathfinder.goal) { 
              const tree = findClosestBlock('wood');
              if (tree) {
                  console.log('GATHER PRIORITY: Moving to chop wood.');
                  // الهدف هو الوصول إلى مسافة 2 بلوك من الشجرة
                  const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 2);
                  bot.pathfinder.setGoal(goal, true);
                  
                  // عند الوصول، يبدأ بالتكسير
                  bot.once('goal_reached', () => {
                      breakAndCollect(tree);
                  });
              } else {
                  console.log('No goals, wandering slowly.');
                  // يمكن هنا إضافة منطق تنقل عشوائي بسيط (مثل bot.setControlState('forward', true))
              }
          }
      }, 3000); 
  }

  // --- معالجة أخطاء إعادة الاتصال (Auto-Reconnect) ---
  
  bot.on('kicked', (reason) => {
      console.log(`Kicked! Reason: ${reason}`); 
      reconnect();
  });

  bot.on('end', (reason) => {
      console.log(`Bot disconnected. Reason: ${reason}`);
      reconnect();
  });

  bot.on('error', (err) => {
      console.log(`Bot Error: ${err.message}`);
  });

  return bot;
}

createBot();