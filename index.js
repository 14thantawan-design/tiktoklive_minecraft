const { WebcastPushConnection } = require('tiktok-live-connector');
const { Rcon } = require('rcon-client');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');

// 🔄 ฟังก์ชันในการทำให้คำสั่งซ้ำ N ครั้ง
function repeatCommand(command, times) {
    if (times <= 0) return '';
    return Array(times).fill(command).join(' && ');
}

const app = express();
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let tiktokUsername = "14thantawan"; 
let minecraftName = "Tawanzazaii";
let rcon = null; 
let tiktokLiveConnection = null;

// 🔌 Connection Status
let minecraftConnected = false;
let tiktokConnected = false;

let giftActions = {};
let appSettings = { 
    tiktokUsername: "14thantawan", 
    minecraftName: "Tawanzazaii",
    rcon: {
        host: "192.168.1.45",
        port: 25575,
        password: "1234"
    }
};

// โหลด Settings จาก config.json
if (fs.existsSync('config.json')) {
    const config = JSON.parse(fs.readFileSync('config.json'));
    if (config.settings) {
        appSettings = config.settings;
        tiktokUsername = appSettings.tiktokUsername;
        minecraftName = appSettings.minecraftName;
    }
    // เก็บแค่ giftActions ที่เหลือ
    Object.keys(config).forEach(key => {
        if (key !== 'settings') {
            giftActions[key] = config[key];
        }
    });
}

let likeCounters = {};

async function startBot() {
    try {
        const rconConfig = appSettings.rcon || { host: "192.168.1.45", port: 25575, password: "1234" };
        rcon = await Rcon.connect(rconConfig);
        minecraftConnected = true;
        console.log("✅ เชื่อมต่อ Minecraft สำเร็จ!");
        io.emit('connection_status', { minecraft: true, tiktok: tiktokConnected });
        io.emit('log', `✅ เชื่อมต่อ Minecraft Server สำเร็จ!`);
    } catch (error) {
        minecraftConnected = false;
        console.log("⚠️ เซิร์ฟเวอร์ Minecraft ปิดอยู่ (แต่หน้าเว็บเปิดทดสอบได้)");
        io.emit('connection_status', { minecraft: false, tiktok: tiktokConnected });
    }

    if (!tiktokLiveConnection) {
        tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);
    }
    
    tiktokLiveConnection.connect().then(state => {
        tiktokConnected = true;
        console.log(`✅ เชื่อมต่อ TikTok ห้อง ${state.roomId} สำเร็จ!`);
        io.emit('connection_status', { minecraft: minecraftConnected, tiktok: true });
        io.emit('log', `✅ เชื่อมต่อ TikTok Live สำเร็จ!`);
    }).catch(err => {
        tiktokConnected = false;
        console.log("⚠️ ยังไม่ได้ไลฟ์สด TikTok");
        io.emit('connection_status', { minecraft: minecraftConnected, tiktok: false });
    });

    // 🎁 ระบบรับของขวัญ
    tiktokLiveConnection.on('gift', async (data) => {
        if (data.giftType === 1 && !data.repeatEnd) return;
        const giftName = data.giftName;
        const giftPrice = data.diamondCount; 
        
        io.emit('log', `🎁 [TikTok] ${data.uniqueId} ส่ง: ${giftName} จำนวน ${data.repeatCount} ชิ้น`);

        let ruleValue = null;
        if (giftActions[giftName]) {
            ruleValue = giftActions[giftName];
        } else {
            const coinKey = `coin:${giftPrice}`;
            if (giftActions[coinKey]) {
                ruleValue = giftActions[coinKey];
            }
        }

        if (ruleValue && rcon) {
            // รองรับทั้ง format เก่าและใหม่
            const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
            const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
            
            // สร้างคำสั่งที่ซ้ำ
            const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
            const multipleCommands = fullCmd.split('&&');
            
            for (let i = 0; i < data.repeatCount; i++) {
                for (let singleCmd of multipleCommands) {
                    // ดึงคำสั่งมา แล้วแทนที่คำว่า {player} ด้วยชื่อในเกมที่เราตั้งค่าไว้
                    let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                    await rcon.send(finalCmd);
                }
            }
        }
    });

    // ❤️ ระบบรับยอดกดหัวใจ
    tiktokLiveConnection.on('like', async (data) => {
        const addedLikes = data.likeCount; 
        io.emit('log', `❤️ [TikTok] ${data.uniqueId} เคาะจอส่งหัวใจ ${addedLikes} ดวง`);

        for (const [key, ruleValue] of Object.entries(giftActions)) {
            if (key.startsWith('like:')) {
                const targetLikes = parseInt(key.split(':')[1]); 
                
                if (!likeCounters[key]) likeCounters[key] = 0;
                likeCounters[key] += addedLikes;

                while (likeCounters[key] >= targetLikes) {
                    likeCounters[key] -= targetLikes; 
                    
                    io.emit('log', `🎉 [ระบบ] ยอดหัวใจครบเป้าหมาย ${targetLikes} ดวง! ส่งคำสั่งเข้าเกมแล้ว!`);
                    if (rcon) {
                        // รองรับทั้ง format เก่าและใหม่
                        const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
                        const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
                        
                        // สร้างคำสั่งที่ซ้ำ
                        const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
                        const multipleCommands = fullCmd.split('&&');
                        for (let singleCmd of multipleCommands) {
                            // ดึงคำสั่งมา แล้วแทนที่คำว่า {player} ด้วยชื่อในเกมที่เราตั้งค่าไว้
                            let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                            await rcon.send(finalCmd);
                        }
                    }
                }
            }
        }
    });

    // 🌐 ระบบสื่อสารกับหน้าเว็บ
    io.on('connection', (socket) => {
        socket.emit('load_rules', giftActions);
        socket.emit('load_settings', appSettings);
        
        socket.on('save_rules', (newRules) => {
            giftActions = newRules;
            const dataToSave = { ...giftActions, settings: appSettings };
            fs.writeFileSync('config.json', JSON.stringify(dataToSave, null, 2));
            io.emit('log', `💾 บันทึกการตั้งค่าคำสั่งเรียบร้อยแล้ว!`);
            likeCounters = {}; 
            io.emit('load_rules', giftActions);
        });

        socket.on('save_settings', (newSettings) => {
            appSettings = newSettings;
            tiktokUsername = newSettings.tiktokUsername;
            minecraftName = newSettings.minecraftName;
            const dataToSave = { ...giftActions, settings: appSettings };
            fs.writeFileSync('config.json', JSON.stringify(dataToSave, null, 2));
            io.emit('log', `⚙️ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว! (TikTok: ${tiktokUsername}, Game: ${minecraftName})`);
            io.emit('load_settings', appSettings);
        });

        socket.on('save_rcon_settings', (newRconSettings) => {
            appSettings.rcon = newRconSettings;
            const dataToSave = { ...giftActions, settings: appSettings };
            fs.writeFileSync('config.json', JSON.stringify(dataToSave, null, 2));
            io.emit('log', `🖥️ บันทึกการตั้งค่า RCON เรียบร้อยแล้ว! (Host: ${newRconSettings.host}, Port: ${newRconSettings.port})`);
            io.emit('load_settings', appSettings);
        });

        // 🎮 การเชื่อมต่อ Minecraft
        socket.on('toggle_minecraft', async () => {
            if (minecraftConnected) {
                // ยกเลิกการเชื่อมต่อ
                if (rcon) {
                    await rcon.end();
                    rcon = null;
                }
                minecraftConnected = false;
                io.emit('log', `❌ ยกเลิกการเชื่อมต่อ Minecraft`);
            } else {
                // เชื่อมต่อ
                try {
                    const rconConfig = appSettings.rcon || { host: "192.168.1.45", port: 25575, password: "1234" };
                    rcon = await Rcon.connect(rconConfig);
                    minecraftConnected = true;
                    io.emit('log', `✅ เชื่อมต่อ Minecraft Server สำเร็จ!`);
                } catch (error) {
                    minecraftConnected = false;
                    io.emit('log', `❌ ไม่สามารถเชื่อมต่อ Minecraft: ${error.message}`);
                }
            }
            io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected });
        });

        // 📱 การเชื่อมต่อ TikTok
        socket.on('toggle_tiktok', async () => {
            if (tiktokConnected) {
                // ยกเลิกการเชื่อมต่อ
                if (tiktokLiveConnection) {
                    tiktokLiveConnection.disconnect();
                }
                tiktokConnected = false;
                io.emit('log', `❌ ยกเลิกการเชื่อมต่อ TikTok Live`);
            } else {
                // เชื่อมต่อ
                if (!tiktokLiveConnection) {
                    tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);
                }
                
                tiktokLiveConnection.connect().then(state => {
                    tiktokConnected = true;
                    io.emit('log', `✅ เชื่อมต่อ TikTok Live สำเร็จ!`);
                }).catch(err => {
                    tiktokConnected = false;
                    io.emit('log', `❌ ไม่สามารถเชื่อมต่อ TikTok: ยังไม่ไลฟ์หรือปิดอยู่`);
                });
            }
            io.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected });
        });

        // ส่งสถานะเชื่อมต่อปัจจุบัน
        socket.emit('connection_status', { minecraft: minecraftConnected, tiktok: tiktokConnected });

        socket.on('test_command', async (key) => {
            let displayName = key;
            if (key.startsWith('coin:')) displayName = `เหรียญ ${key.split(':')[1]}`;
            if (key.startsWith('like:')) displayName = `ยอดหัวใจ ${key.split(':')[1]}`;
            
            if (giftActions[key]) {
                const ruleValue = giftActions[key];
                io.emit('log', `🛠️ [ทดสอบ] ส่ง: ${displayName}`);
                if (rcon) {
                    // รองรับทั้ง format เก่าและใหม่
                    const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
                    const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
                    
                    // สร้างคำสั่งที่ซ้ำ
                    const fullCmd = repeatCount > 1 ? repeatCommand(cmd, repeatCount) : cmd;
                    const multipleCommands = fullCmd.split('&&');
                    for (let singleCmd of multipleCommands) {
                        // ดึงคำสั่งมา แล้วแทนที่คำว่า {player} ด้วยชื่อในเกมที่เราตั้งค่าไว้
                        let finalCmd = singleCmd.trim().replace(/{player}/g, minecraftName);
                        await rcon.send(finalCmd);
                    }
                }
            } else {
                io.emit('log', `❌ ไม่พบการตั้งค่า: ${displayName}`);
            }
        });
    });
}

server.listen(3001, () => {
    console.log("🚀 ระบบพร้อมแล้ว! เปิดหน้าเว็บได้ที่ => http://localhost:3001");
    startBot();
});