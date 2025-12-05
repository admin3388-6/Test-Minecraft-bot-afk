const express = require('express');
const mineflayer = require('mineflayer');
const chalk = require('chalk');

const app = express();
app.use(express.json());

let bot = null;
let movementInterval = null;

// ======== CONFIGURATION ========
const botConfig = {
  host: "Skydata.aternos.me",
  port: 28068,
  username: "skydata bot",
  version: false, // auto detect
  welcomeMessage: "Welcome to skydata world Enjoy"
};

// ======== BOT FUNCTIONS ========
function startBot() {
  return new Promise((resolve, reject) => {
    if (bot) return resolve("Bot already running.");

    bot = mineflayer.createBot({
      host: botConfig.host,
      port: botConfig.port,
      username: botConfig.username,
      version: botConfig.version
    });

    bot.once('login', () => {
      console.log(chalk.blue(`Bot logged in as ${bot.username}`));
      bot.chat(chalk.blue(botConfig.welcomeMessage));
      startMovement();
      resolve("Bot started!");
    });

    bot.on('end', () => {
      console.log("Bot disconnected, restarting...");
      stopBot();
      setTimeout(startBot, 5000); // إعادة الاتصال تلقائياً
    });

    bot.on('error', err => {
      console.error("Bot error:", err);
      stopBot();
      setTimeout(startBot, 5000);
    });

    bot.on('spawn', () => {
      // AutoEat & Anti-Void
      if (bot.autoEat) bot.autoEat.options = { priority: "food", startAt: 14 };
      bot.on('health', () => {
        if (bot.food < 14 && bot.autoEat) bot.autoEat.eat();
        if (bot.position.y < 0) bot.chat("Help! Anti-Void activated!");
      });
    });
  });
}

function stopBot() {
  if (movementInterval) clearInterval(movementInterval);
  movementInterval = null;

  if (bot) {
    bot.quit();
    bot = null;
  }
}

// ======== SMART MOVEMENT ========
function startMovement() {
  if (!bot) return;

  movementInterval = setInterval(() => {
    if (!bot) return;

    const actions = ["forward", "back", "left", "right"];
    actions.forEach(a => bot.setControlState(a, false));

    // حركة عشوائية ذكية
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);

    // قفز عشوائي
    if (Math.random() < 0.4) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }

    // إرسال رسالة شات عشوائية أحياناً
    if (Math.random() < 0.2) {
      bot.chat(chalk.blue(botConfig.welcomeMessage));
    }

    console.log("Bot moving:", action);
  }, 8000);
}

// ======== EXPRESS ROUTES ========
app.get('/health', (req, res) => res.send("ok")); // UptimeRobot ping

app.post('/start', async (req, res) => {
  try {
    const result = await startBot();
    res.send(result);
  } catch (err) {
    res.status(500).send(String(err));
  }
});

app.post('/stop', (req, res) => {
  stopBot();
  res.send("Bot stopped.");
});

// ======== START EXPRESS SERVER ========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
