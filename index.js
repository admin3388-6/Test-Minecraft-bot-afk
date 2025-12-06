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

// دالة لمعالجة إعادة الاتصال
const RECONNECT_DELAY = 5000; // 5 ثواني
function reconnect() {
    console.log(`Connection lost. Attempting reconnect in ${RECONNECT_DELAY / 1000} seconds...`);
    // التأكد من عدم وجود اتصال حالي قبل محاولة إنشاء بوت جديد
    setTimeout(createBot, RECONNECT_DELAY);
}

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

  // --- دوال القتال والبحث عن الهدف (كما في الكود السابق) ---
  function findHostileMob() {
      // ... (الكود لم يتغير)
      return bot.nearestEntity(entity => {
          const isHostileMob = entity.type === 'mob';
          const isAlive = entity.health > 0;
          return isHostileMob && isAlive;
      });
  }

  function findClosestBlock(materialType) {
      // ... (الكود لم يتغير)
      return bot.findBlock({
          matching: collectableMaterials[materialType],
          maxDistance: 64,
          allowUnsafe: true 
      });
  }

  function breakAndCollect(block) {
      if (!block) return;
      console.log(`Breaking ${block.name}...`);
      bot.dig(block, (err) => {
          if (err) {
              console.log('Error breaking block:', err.message);
              return; 
          }
          console.log(`Successfully collected ${block.name}.`);
      });
  }

  function startAILoop() {
      setInterval(() => {
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

          if (!bot.pathfinder.isGoalSet()) {
              const tree = findClosestBlock('wood');
              if (tree) {
                  console.log('GATHER PRIORITY: Moving to chop wood.');
                  const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 2);
                  bot.pathfinder.setGoal(goal, true);
                  
                  bot.once('goal_reached', () => {
                      breakAndCollect(tree);
                  });
              } else {
                  console.log('No goals, starting slow random walk.');
              }
          }
      }, 3000); 
  }

  // --- معالجة الأخطاء والاتصال (Auto-Reconnect) ---
  
  // 1. عند الطرد من الخادم
  bot.on('kicked', (reason) => {
      console.log(`Kicked! Reason: ${reason}`);
      reconnect(); // أعد محاولة الاتصال
  });

  // 2. عند فقدان الاتصال (يغطي ECONNRESET)
  bot.on('end', (reason) => {
      console.log(`Bot disconnected. Reason: ${reason}`);
      reconnect(); // أعد محاولة الاتصال
  });

  // 3. الأخطاء العامة
  bot.on('error', (err) => {
      // إذا كان الخطأ هو رفض الاتصال، فسيتم معالجته بواسطة 'end'
      if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND') {
         console.log(`Bot Error: ${err.message}`);
      }
  });

  return bot;
}

createBot();