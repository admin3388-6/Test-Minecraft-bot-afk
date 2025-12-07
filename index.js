// index.js (النسخة النهائية والمستقرة)
const mineflayer = require('mineflayer');
// جلب دالة Vec3
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

// **>> تم زيادة المهلة لتجنب "Connection throttled" <<**
const RECONNECT_DELAY = 15000; // 15 ثانية

// قائمة بأنواع البلوكات التي يمكن للبوت جمعها
const collectableMaterials = {
    wood: block => block && (block.name.includes('log') || block.name.includes('wood')),
    stone: block => block && (block.name.includes('stone') || block.name.includes('ore') || block.name.includes('cobblestone')),
    soil: block => block && (block.name.includes('dirt') || block.name.includes('sand') || block.name.includes('gravel'))
};


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
    
    defaultMovements = new Movements(bot, bot.registry);
    defaultMovements.canDig = true; 
    defaultMovements.allowSprinting = false; 
    bot.pathfinder.setMovements(defaultMovements);
    
    // **>> تم إزالة الكود المسبب لـ TypeError: bot.pathfinder.on <<**

    setTimeout(startAILoop, 10000); 
  });

  // --- دوال القتال والبحث عن الهدف ---
  function findHostileMob() {
      return bot.nearestEntity(entity => entity.type === 'mob' && entity.health > 0);
  }

  function findClosestBlock(materialType) {
      return bot.findBlock({
          matching: collectableMaterials[materialType],
          maxDistance: 64,
          allowUnsafe: true 
      });
  }

  // الدالة المعدلة لضمان الكسر وإلغاء الجمود
  function breakAndCollect(block) {
      if (!block) {
          bot.pathfinder.setGoal(null);
          return;
      }
      
      bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true, () => {
          console.log(`Breaking ${block.name}...`);
          
          bot.dig(block, (err) => {
              if (err) {
                  console.log(`Error breaking block: ${err.message}. Clearing goal to unfreeze.`);
                  bot.pathfinder.setGoal(null); // الحل لعدم الجمود
                  return; 
              }
              console.log(`Successfully collected ${block.name}.`);
              bot.pathfinder.setGoal(null);
          });
      });
  }

  // --- حلقة الذكاء الاصطناعي الرئيسية ---
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

          if (!bot.pathfinder.goal) { 
              const tree = findClosestBlock('wood');
              if (tree) {
                  console.log('GATHER PRIORITY: Moving to chop wood.');
                  const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 2);
                  bot.pathfinder.setGoal(goal, true);
                  
                  // **>> تم إعادة bot.once إلى هنا <<**
                  bot.once('goal_reached', () => { 
                      breakAndCollect(tree); 
                  });
                  
              } else {
                  console.log('No goals, starting random movement.');
                  // **>> إضافة حركة عشوائية لضمان عدم الجمود <<**
                  const randomPoint = bot.entity.position.offset(Math.random() * 10 - 5, 0, Math.random() * 10 - 5);
                  bot.pathfinder.setGoal(new GoalNear(randomPoint.x, randomPoint.y, randomPoint.z, 1));
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
