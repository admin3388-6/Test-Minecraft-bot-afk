// index.js (النسخة النهائية والمصحّحة)
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
    setTimeout(createBot, RECONNECT_DELAY);
}

function createBot() {
  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    version: SERVER_VERSION,
    auth: 'offline', 
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
    defaultMovements.canDig = true; 
    defaultMovements.allowSprinting = false; // Anti-Cheat: لتقليل الاكتشاف
    bot.pathfinder.setMovements(defaultMovements);

    // 2. بدء حلقة الذكاء الاصطناعي الرئيسية
    setTimeout(startAILoop, 10000); // Anti-Cheat: تأخير 10 ثواني
  });

  // --- دوال القتال والبحث عن الهدف ---
  function findHostileMob() {
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
      if (bot.entity === null) return; 

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

          // **التصحيح الرئيسي: استخدام bot.pathfinder.goal للتحقق من وجود هدف**
          if (!bot.pathfinder.goal) { 
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
