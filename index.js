const { WebcastPushConnection } = require('tiktok-live-connector');
const { Rcon } = require('rcon-client');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const cors = require('cors');
const fs = require('fs');

// ⚙️ ค่า Constants
const CONFIG_FILE = 'config.json';
const DEFAULT_PORT = 3001;
const DEFAULT_SETTINGS = {
    tiktokUsername: "14thantawan",
    tipmeToken: "",
    minecraftName: "Tawanzazaii",
    rcon: { host: "192.168.1.45", port: 25575, password: "1234" }
};

// 🔄 ฟังก์ชันในการทำให้คำสั่งซ้ำ N ครั้ง
function repeatCommand(command, times) {
    if (times <= 0) return '';
    return Array(times).fill(command).join(' && ');
}

// ✅ ฟังก์ชัน Validation
function validateSettings(settings) {
    if (!settings.tiktokUsername || typeof settings.tiktokUsername !== 'string') return false;
    if (!settings.minecraftName || typeof settings.minecraftName !== 'string') return false;
    if (!settings.rcon || !settings.rcon.host || !settings.rcon.port) return false;
    if (settings.rcon.port < 1 || settings.rcon.port > 65535) return false;
    return true;
}

const app = express();
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let tiktokUsername = DEFAULT_SETTINGS.tiktokUsername;
let minecraftName = DEFAULT_SETTINGS.minecraftName;
let rcon = null;
let tiktokLiveConnection = null;
let tipmeSocket = null;

// 🔌 Connection Status
let minecraftConnected = false;
let tiktokConnected = false;
let tipmeConnected = false;

let giftActions = {};
let appSettings = { ...DEFAULT_SETTINGS };

// โหลด Settings จาก config.json
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
            if (config.settings && validateSettings(config.settings)) {
                appSettings = config.settings;
                tiktokUsername = appSettings.tiktokUsername;
                minecraftName = appSettings.minecraftName;
            }
            Object.keys(config).forEach(key => {
                if (key !== 'settings') giftActions[key] = config[key];
            });
        }
    } catch (error) {
        console.error('⚠️ Error loading config:', error.message);
    }
}

loadConfig();
let likeCounters = {};

// 💸 ฟังก์ชันรับยอดโดเนทผ่าน Streamlabs
function connectTipme() {
    if (tipmeSocket) tipmeSocket.disconnect();

    if (!appSettings.tipmeToken) {
        io.emit('log', `❌ ไม่สามารถเชื่อมต่อได้: โปรดใส่ Streamlabs Socket Token ในช่องตั้งค่าก่อน`);
        tipmeConnected = false;
        io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
        return;
    }

    io.emit('log', `⏳ กำลังพยายามเชื่อมต่อเซิร์ฟเวอร์ Streamlabs...`);

    tipmeSocket = ClientIO(`https://sockets.streamlabs.com?token=${appSettings.tipmeToken}`, {
        transports: ['websocket']
    });

    tipmeSocket.on('connect', () => {
        tipmeConnected = true;
        io.emit('log', `✅ เชื่อมต่อบัญชี Streamlabs (รับยอด TipMe) สำเร็จ!`);
        io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
    });

    tipmeSocket.on('connect_error', (error) => {
        tipmeConnected = false;
        io.emit('log', `❌ เชื่อมต่อ Streamlabs ไม่สำเร็จ: ${error.message}`);
        io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
    });

    tipmeSocket.on('disconnect', () => {
        tipmeConnected = false;
        io.emit('log', `❌ หลุดการเชื่อมต่อจาก Streamlabs`);
        io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
    });

    tipmeSocket.on('event', async (eventData) => {
        if (eventData.type === 'donation') {
            const messages = eventData.message;
            for (let data of messages) {
                try {
                    const amount = parseFloat(data.amount);
                    const sender = data.name || "คนใจดี";
                    io.emit('log', `💸 [ระบบรับโดเนท] คุณ ${sender} โดเนทมา ${amount} บาท!`);

                    const tipmeKey = `tipme:${amount}`;
                    const ruleValue = giftActions[tipmeKey];

                    if (ruleValue && rcon) {
                        const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
                        const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
                        const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
                        const multipleCommands = fullCmd.split('&&');
                        for (let singleCmd of multipleCommands) {
                            let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                            await rcon.send(finalCmd);
                        }
                        io.emit('log', `🎉 ส่งคำสั่ง ${tipmeKey} เข้าเกมสำเร็จ!`);
                    } else {
                        io.emit('log', `⚠️ บอททำงาน: ยอดเงิน ${amount} บาท ไม่ตรงกับคำสั่งที่ตั้งไว้`);
                    }
                } catch (error) {
                    io.emit('log', `❌ Error processing donation: ${error.message}`);
                }
            }
        }
    });
}

// 🔌 ฟังก์ชันเชื่อมต่อ Minecraft
async function connectMinecraft() {
    try {
        if (rcon) await rcon.end().catch(() => {});
        
        rcon = await Rcon.connect(appSettings.rcon);
        minecraftConnected = true;
        console.log("✅ เชื่อมต่อ Minecraft สำเร็จ!");
        io.emit('log', `✅ เชื่อมต่อ Minecraft Server สำเร็จ!`);
    } catch (error) {
        minecraftConnected = false;
        console.error("❌ ไม่สามารถเชื่อมต่อ Minecraft:", error.message);
        io.emit('log', `❌ ไม่สามารถเชื่อมต่อ Minecraft: ${error.message}`);
    }
}

// 🔌 ฟังก์ชันเชื่อมต่อ TikTok
async function connectTikTok() {
    try {
        if (tiktokLiveConnection) {
            try { tiktokLiveConnection.disconnect(); } catch (e) {}
        }
        
        tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

        // 🌟 ย้ายระบบดักจับมาไว้ตรงนี้! บอทจะได้มี "หู" ทุกครั้งที่เชื่อมต่อใหม่
        
        // 💬 ระบบดักจับคอมเมนต์
        tiktokLiveConnection.on('chat', (data) => {
            io.emit('log', `💬 [คอมเมนต์] ${data.uniqueId} พิมพ์ว่า: ${data.comment}`);
        });

        // 🎁 ระบบรับของขวัญ
        tiktokLiveConnection.on('gift', async (data) => {
            if (data.giftType === 1 && !data.repeatEnd) return;
            try {
                const giftName = data.giftName;
                const giftPrice = data.diamondCount;
                io.emit('log', `🎁 [TikTok] ${data.uniqueId} ส่ง: ${giftName} จำนวน ${data.repeatCount} ชิ้น`);

                let ruleValue = null;
                if (giftActions[giftName]) {
                    ruleValue = giftActions[giftName];
                } else {
                    const coinKey = `coin:${giftPrice}`;
                    if (giftActions[coinKey]) ruleValue = giftActions[coinKey];
                }

                if (ruleValue && rcon) {
                    const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
                    const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
                    const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
                    const multipleCommands = fullCmd.split('&&');
                    for (let i = 0; i < data.repeatCount; i++) {
                        for (let singleCmd of multipleCommands) {
                            let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                            await rcon.send(finalCmd);
                        }
                    }
                }
            } catch (error) {
                io.emit('log', `❌ Error processing gift: ${error.message}`);
            }
        });

        // ❤️ ระบบรับยอดกดหัวใจ
        tiktokLiveConnection.on('like', async (data) => {
            try {
                const addedLikes = data.likeCount;
                io.emit('log', `❤️ [TikTok] ${data.uniqueId} เคาะจอส่งหัวใจ ${addedLikes} ดวง`);

                for (const [key, ruleValue] of Object.entries(giftActions)) {
                    if (key.startsWith('like:')) {
                        const targetLikes = parseInt(key.split(':')[1]);
                        if (!likeCounters[key]) likeCounters[key] = 0;
                        likeCounters[key] += addedLikes;

                        while (likeCounters[key] >= targetLikes) {
                            likeCounters[key] -= targetLikes;
                            io.emit('log', `🎉 [ระบบ] ยอดหัวใจครบเป้าหมาย ${targetLikes} ดวง!`);
                            if (rcon) {
                                const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
                                const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
                                const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
                                const multipleCommands = fullCmd.split('&&');
                                for (let singleCmd of multipleCommands) {
                                    let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                                    await rcon.send(finalCmd);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                io.emit('log', `❌ Error processing likes: ${error.message}`);
            }
        });

        const state = await tiktokLiveConnection.connect();
        tiktokConnected = true;
        console.log(`✅ เชื่อมต่อ TikTok ห้อง ${state.roomId} สำเร็จ!`);
        io.emit('log', `✅ เชื่อมต่อ TikTok Live สำเร็จ!`);
    } catch (error) {
        tiktokConnected = false;
        console.error("❌ ไม่สามารถเชื่อมต่อ TikTok:", error.message);
        io.emit('log', `❌ ไม่สามารถเชื่อมต่อ TikTok: ${error.message}`);
    }
}

async function startBot() {
    await connectMinecraft();
    await connectTikTok();

    // 🌐 ระบบสื่อสารกับหน้าเว็บ
    io.on('connection', (socket) => {
        socket.emit('load_rules', giftActions);
        socket.emit('load_settings', appSettings);
        socket.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
        
        socket.on('save_rules', (newRules) => {
            try {
                giftActions = newRules;
                const dataToSave = { ...giftActions, settings: appSettings };
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(dataToSave, null, 2));
                io.emit('log', `💾 บันทึกการตั้งค่าคำสั่งเรียบร้อยแล้ว!`);
                likeCounters = {};
                io.emit('load_rules', giftActions);
            } catch (error) {
                io.emit('log', `❌ Error saving rules: ${error.message}`);
            }
        });

        socket.on('save_settings', (newSettings) => {
            try {
                if (!validateSettings(newSettings)) {
                    io.emit('log', `❌ ข้อมูลการตั้งค่าไม่ถูกต้อง`);
                    return;
                }
                appSettings = newSettings;
                tiktokUsername = newSettings.tiktokUsername;
                minecraftName = newSettings.minecraftName;
                const dataToSave = { ...giftActions, settings: appSettings };
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(dataToSave, null, 2));
                io.emit('log', `⚙️ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!`);
                io.emit('load_settings', appSettings);
            } catch (error) {
                io.emit('log', `❌ Error saving settings: ${error.message}`);
            }
        });

        socket.on('toggle_minecraft', async () => {
            if (minecraftConnected) {
                if (rcon) { await rcon.end().catch(() => {}); rcon = null; }
                minecraftConnected = false;
                io.emit('log', `❌ ยกเลิกการเชื่อมต่อ Minecraft`);
            } else {
                await connectMinecraft();
            }
            io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
        });

        socket.on('toggle_tiktok', async () => {
            if (tiktokConnected) {
                if (tiktokLiveConnection) { tiktokLiveConnection.disconnect(); }
                tiktokConnected = false;
                io.emit('log', `❌ ยกเลิกการเชื่อมต่อ TikTok Live`);
            } else {
                await connectTikTok();
            }
            io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
        });

        // 🌟 กดปุ่มเชื่อมต่อ TipMe
        socket.on('toggle_tipme', () => {
            if (tipmeConnected) {
                if (tipmeSocket) tipmeSocket.disconnect();
                tipmeConnected = false;
                io.emit('log', `❌ ยกเลิกการเชื่อมต่อ TipMe`);
                io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected, tipme: tipmeConnected });
            } else {
                connectTipme();
            }
        });

        socket.on('test_command', async (key) => {
            try {
                let displayName = key;
                if (key.startsWith('coin:')) displayName = `เหรียญ ${key.split(':')[1]}`;
                if (key.startsWith('like:')) displayName = `ยอดหัวใจ ${key.split(':')[1]}`;
                if (key.startsWith('tipme:')) displayName = `ยอดโดเนท ${key.split(':')[1]} บาท`;
                
                if (giftActions[key]) {
                    const ruleValue = giftActions[key];
                    io.emit('log', `🛠️ [ทดสอบ] ส่ง: ${displayName}`);
                    if (rcon) {
                        const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
                        const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
                        const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
                        const multipleCommands = fullCmd.split('&&');
                        for (let singleCmd of multipleCommands) {
                            let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                            await rcon.send(finalCmd);
                        }
                        io.emit('log', `✅ ส่งคำสั่งทดสอบเสร็จ!`);
                    } else {
                        io.emit('log', `❌ ไม่ได้เชื่อมต่อกับ Minecraft Server`);
                    }
                } else {
                    io.emit('log', `❌ ไม่พบการตั้งค่า: ${displayName}`);
                }
            } catch (error) {
                io.emit('log', `❌ Error testing command: ${error.message}`);
            }
        });
    });
}

// 🛑 Graceful Shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (rcon) await rcon.end().catch(() => {});
    if (tiktokLiveConnection) tiktokLiveConnection.disconnect();
    if (tipmeSocket) tipmeSocket.disconnect();
    process.exit(0);
});

server.listen(DEFAULT_PORT, () => {
    console.log(`🚀 ระบบพร้อมแล้ว! เปิดหน้าเว็บได้ที่ => http://localhost:${DEFAULT_PORT}`);
    startBot();
});