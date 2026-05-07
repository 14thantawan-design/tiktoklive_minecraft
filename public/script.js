const socket = io();
let currentRules = {}; 
let settingsConfig = { 
    tiktokUsername: "14thantawan", 
    minecraftName: "Tawanzazaii",
    rcon: {
        host: "192.168.1.45",
        port: 25575,
        password: "1234"
    }
};

// 🔌 ตัวแปรเก็บสถานะการเชื่อมต่อ
let minecraftConnected = false;
let tiktokConnected = false;

// โหลด Settings จาก Server
socket.on('load_settings', (settings) => {
    settingsConfig = settings;
    document.getElementById('tiktokUsernameInput').value = settings.tiktokUsername;
    document.getElementById('minecraftNameInput').value = settings.minecraftName;
    
    // โหลด RCON Settings
    if (settings.rcon) {
        document.getElementById('rconHostInput').value = settings.rcon.host || "192.168.1.45";
        document.getElementById('rconPortInput').value = settings.rcon.port || 25575;
        document.getElementById('rconPasswordInput').value = settings.rcon.password || "";
    }
});

// 🔌 รับสถานะการเชื่อมต่อจาก Server
socket.on('connection_status', (status) => {
    minecraftConnected = status.minecraft;
    tiktokConnected = status.tiktok;
    updateConnectionButtons();
});

// 🎮 อัปเดตสีและข้อความของปุ่มเชื่อมต่อ
function updateConnectionButtons() {
    const minecraftBtn = document.getElementById('minecraftConnectBtn');
    const tiktokBtn = document.getElementById('tiktokConnectBtn');
    
    if (minecraftBtn) {
        if (minecraftConnected) {
            minecraftBtn.textContent = '🎮 Minecraft ✓';
            minecraftBtn.classList.remove('btn-disconnected');
            minecraftBtn.classList.add('btn-connected');
        } else {
            minecraftBtn.textContent = '🎮 Minecraft';
            minecraftBtn.classList.remove('btn-connected');
            minecraftBtn.classList.add('btn-disconnected');
        }
    }
    
    if (tiktokBtn) {
        if (tiktokConnected) {
            tiktokBtn.textContent = '📱 TikTok Live ✓';
            tiktokBtn.classList.remove('btn-disconnected');
            tiktokBtn.classList.add('btn-connected');
        } else {
            tiktokBtn.textContent = '📱 TikTok Live';
            tiktokBtn.classList.remove('btn-connected');
            tiktokBtn.classList.add('btn-disconnected');
        }
    }
}

// 🎮 กดปุ่มเชื่อมต่อ Minecraft
function toggleMinecraftConnection() {
    socket.emit('toggle_minecraft');
}

// 📱 กดปุ่มเชื่อมต่อ TikTok
function toggleTiktokConnection() {
    socket.emit('toggle_tiktok');
}

// บันทึก Settings
function saveSettings() {
    const tiktokUsername = document.getElementById('tiktokUsernameInput').value.trim();
    const minecraftName = document.getElementById('minecraftNameInput').value.trim();
    const rconHost = document.getElementById('rconHostInput').value.trim();
    const rconPort = parseInt(document.getElementById('rconPortInput').value);
    const rconPassword = document.getElementById('rconPasswordInput').value;
    
    if (!tiktokUsername || !minecraftName || !rconHost || !rconPort) {
        alert("กรุณาใส่ข้อมูลให้ครบถ้วน!");
        return;
    }
    
    settingsConfig = { 
        tiktokUsername, 
        minecraftName,
        rcon: {
            host: rconHost,
            port: rconPort,
            password: rconPassword
        }
    };
    socket.emit('save_settings', settingsConfig);
    alert("✅ บันทึกการตั้งค่าเรียบร้อยแล้ว!");
}

const giftCatalog = [
    // --- 1 เหรียญ ---
    { id: "Rose", name: "Rose", price: 1, img: "/images/rose.png" },
    { id: "TikTok", name: "TikTok", price: 1, img: "/images/tiktok.png" },
    { id: "GG", name: "GG", price: 1, img: "/images/gg.png" },
    { id: "Pop", name: "Pop", price: 1, img: "/images/pop.png" },
    { id: "You're awesome", name: "You're awesome", price: 1, img: "/images/awesome.png" },
    { id: "Creeper", name: "Creeper", price: 1, img: "/images/creeper.png" },
    { id: "Love you so much", name: "Love you so much", price: 1, img: "/images/loveyousomuch.png" },
    { id: "Oldies", name: "Oldies", price: 1, img: "/images/oldies.png" },
    { id: "Freestyle", name: "Freestyle", price: 1, img: "/images/freestyle.png" },
    { id: "Cake Slice", name: "Cake Slice", price: 1, img: "/images/cake.png" },
    { id: "Ice Cream Cone", name: "Ice Cream Cone", price: 1, img: "/images/icecream.png" },
    { id: "Heart Me", name: "Heart Me", price: 1, img: "/images/heartme.png" },
    { id: "Love you", name: "Love you", price: 1, img: "/images/loveyou.png" },
    { id: "Go Popular", name: "Go Popular", price: 1, img: "/images/gopopular.png" },

    // --- 5 - 9 เหรียญ ---
    { id: "Finger Heart", name: "Finger Heart", price: 5, img: "/images/fingerheart.png" },
    { id: "Overreact", name: "Overreact", price: 5, img: "/images/overreact.png" },
    { id: "Name shoutout", name: "Name shoutout", price: 5, img: "/images/nameshoutout.png" },
    { id: "The Lucky", name: "The Lucky", price: 9, img: "/images/lucky.png" },

    // --- 10 - 20 เหรียญ ---
    { id: "Rosa", name: "Rosa", price: 10, img: "/images/rosa.png" },
    { id: "Friendship Necklace", name: "Friendship Necklace", price: 10, img: "/images/friendshipnecklace.png" },
    { id: "Slow motion", name: "Slow motion", price: 10, img: "/images/slowmotion.png" },
    { id: "I love you", name: "I love you", price: 10, img: "/images/iloveyou.png" },
    { id: "Bravo!", name: "Bravo!", price: 15, img: "/images/bravo.png" },
    { id: "Flower Garland", name: "Flower Garland", price: 15, img: "/images/flowergarland.png" },
    { id: "Baby Hippo", name: "Baby Hippo", price: 15, img: "/images/hippo.png" },
    { id: "Perfume", name: "Perfume", price: 20, img: "/images/perfume.png" },

    // --- 30 - 100 เหรียญ ---
    { id: "Doughnut", name: "Doughnut", price: 30, img: "/images/doughnut.png" },
    { id: "Paper Crane", name: "Paper Crane", price: 99, img: "/images/papercrane.png" },
    { id: "Hat and Mustache", name: "Hat and Mustache", price: 99, img: "/images/hatmustache.png" },
    { id: "Greeting Heart", name: "Greeting Heart", price: 99, img: "/images/greetingheart.png" },
    { id: "Game Controller", name: "Game Controller", price: 100, img: "/images/controller.png" },
    { id: "Mishka Bear", name: "Mishka Bear", price: 100, img: "/images/mishkabear.png" },
    { id: "Confetti", name: "Confetti", price: 100, img: "/images/confetti.png" },
    { id: "Hand Hearts", name: "Hand Hearts", price: 100, img: "/images/handhearts.png" },

    // --- 149 - 299 เหรียญ ---
    { id: "Love Glasses", name: "Love Glasses", price: 149, img: "/images/loveglasses.png" },
    { id: "Hearts", name: "Hearts", price: 199, img: "/images/hearts.png" },
    { id: "Night Star", name: "Night Star", price: 199, img: "/images/nightstar.png" },
    { id: "Twinkling Star", name: "Twinkling Star", price: 199, img: "/images/twinklingstar.png" },
    { id: "Corgi", name: "Corgi", price: 299, img: "/images/corgi.png" }
];

window.onload = () => {
    updateConnectionButtons(); // อัปเดตสถานะปุ่มเมื่อโหลดหน้า
    const optionsContainer = document.getElementById('giftOptions');
    giftCatalog.forEach(gift => {
        optionsContainer.innerHTML += `
            <div class="custom-option" onclick="selectGift('${gift.id}', '${gift.name}', '${gift.img}', ${gift.price})">
                <img src="${gift.img}" alt="${gift.id}" onerror="this.src='/images/placeholder.png'">
                <span>${gift.name}</span>
                <span class="gift-price">🪙 ${gift.price}</span>
            </div>
        `;
    });
};

function toggleDropdown() {
    const options = document.getElementById('giftOptions');
    options.style.display = options.style.display === "none" ? "block" : "none";
}

// 🌟 อัปเดต: สลับหน้าจอให้รองรับ 3 แบบ (Gift, Coin, Like)
function switchRuleType(type) {
    document.getElementById('giftSection').style.display = type === 'gift' ? 'block' : 'none';
    document.getElementById('coinSection').style.display = type === 'coin' ? 'block' : 'none';
    document.getElementById('likeSection').style.display = type === 'like' ? 'block' : 'none';
}

function selectGift(id, name, img, price) {
    document.getElementById('selectedGiftImg').src = img;
    document.getElementById('selectedGiftImg').onerror = function() { this.src = '/images/placeholder.png'; };
    document.getElementById('selectedGiftName').innerText = `${name} (🪙 ${price})`;
    document.getElementById('giftSelectValue').value = id; 
    document.getElementById('giftOptions').style.display = "none";
}

socket.on('log', (message) => {
    const logsDiv = document.getElementById('logs');
    const time = new Date().toLocaleTimeString('th-TH');
    logsDiv.innerHTML += `<div><span class="log-time">[${time}]</span> ${message}</div>`;
    logsDiv.scrollTop = logsDiv.scrollHeight;
});

socket.on('load_rules', (rules) => {
    currentRules = rules;
    renderRules();
});

// 🌟 อัปเดต: ระบบบันทึกข้อมูลที่รองรับ Like
function addRule() {
    const ruleType = document.querySelector('input[name="ruleType"]:checked').value;
    const cmd = document.getElementById('commandInput').value;
    const repeatCount = parseInt(document.getElementById('repeatInput').value) || 1;

    if (!cmd) {
        alert("กรุณาใส่คำสั่ง Minecraft ให้ครบถ้วนครับ!");
        return;
    }

    const ruleData = { cmd, repeat: repeatCount };

    if (ruleType === 'gift') {
        const gift = document.getElementById('giftSelectValue').value; 
        if (gift) {
            currentRules[gift] = ruleData;
        } else {
            alert("กรุณาเลือกของขวัญ!");
            return;
        }
    } else if (ruleType === 'coin') {
        const coin = document.getElementById('coinInput').value;
        if (!coin || coin <= 0) {
            alert("กรุณาใส่จำนวนเหรียญที่ถูกต้อง!");
            return;
        }
        currentRules[`coin:${coin}`] = ruleData;
        document.getElementById('coinInput').value = '';
    } else if (ruleType === 'like') {
        const like = document.getElementById('likeInput').value;
        if (!like || like <= 0) {
            alert("กรุณาใส่ยอดหัวใจที่ถูกต้อง!");
            return;
        }
        currentRules[`like:${like}`] = ruleData;
        document.getElementById('likeInput').value = '';
    }

    socket.emit('save_rules', currentRules);
    document.getElementById('commandInput').value = '';
    document.getElementById('repeatInput').value = '1';
}

// 🌟 อัปเดต: ระบบลบข้อมูลที่รู้จักคำว่า like
function deleteRule(key) {
    let displayName = key;
    if (key.startsWith('coin:')) displayName = `เหรียญ ${key.split(':')[1]}`;
    if (key.startsWith('like:')) displayName = `ยอดหัวใจ ${key.split(':')[1]}`;
    
    if(confirm(`ต้องการลบการตั้งค่า ${displayName} ใช่หรือไม่?`)) {
        delete currentRules[key];
        socket.emit('save_rules', currentRules);
    }
}

// 🌟 อัปเดต: ระบบแสดงผลที่แยกแยะได้ทั้ง 3 แบบ
function renderRules() {
    const rulesList = document.getElementById('rulesList');
    const testButtons = document.getElementById('testButtons');
    rulesList.innerHTML = '';
    testButtons.innerHTML = '';

    for (const [key, ruleValue] of Object.entries(currentRules)) {
        // รองรับทั้ง format เก่า (string) และใหม่ (object)
        const cmd = typeof ruleValue === 'string' ? ruleValue : ruleValue.cmd;
        const repeatCount = typeof ruleValue === 'string' ? 1 : (ruleValue.repeat || 1);
        const fullCmd = repeatCount > 1 ? 
            Array(repeatCount).fill(cmd).join(' && ') : cmd;

        const isCoin = key.startsWith('coin:');
        const isLike = key.startsWith('like:');
        const isGift = !isCoin && !isLike;

        if (isGift) {
            const giftInfo = giftCatalog.find(g => g.id === key);
            const imgSrc = giftInfo ? giftInfo.img : '/images/placeholder.png';
            const displayName = giftInfo ? giftInfo.name : key;
            const displayPrice = giftInfo ? giftInfo.price : "?";
            
            rulesList.innerHTML += `
                <div class="rule-item">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <img src="${imgSrc}" onerror="this.src='/images/placeholder.png'" style="width:28px; height:28px; margin-right:15px; border-radius: 4px;">
                        <div style="flex-grow: 1;">
                            <div class="rule-gift" style="display: flex; align-items: center;">
                                🎁 ${displayName} 
                                <span class="gift-price" style="margin-left: 10px;">🪙 ${displayPrice}</span>
                                <span style="margin-left: 10px; background: #ffd700; color: #111; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">×${repeatCount}</span>
                            </div>
                            <div class="rule-cmd">/${cmd}</div>
                        </div>
                    </div>
                    <button class="btn btn-del" onclick="deleteRule('${key}')">ลบ</button>
                </div>
            `;

            testButtons.innerHTML += `
                <button class="btn-test" onclick="socket.emit('test_command', '${key}')">
                    ทดสอบ ${displayName}
                </button>
            `;
        } else if (isCoin) {
            const coins = key.split(':')[1];
            rulesList.innerHTML += `
                <div class="rule-item">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <div style="width:28px; height:28px; margin-right:15px; border-radius: 4px; background: #ffd700; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #111;">
                            ${coins}
                        </div>
                        <div style="flex-grow: 1;">
                            <div class="rule-gift" style="display: flex; align-items: center;">
                                🪙 ทุกของขวัญ ${coins} เหรียญ
                                <span style="margin-left: 10px; background: #ffd700; color: #111; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">×${repeatCount}</span>
                            </div>
                            <div class="rule-cmd">/${cmd}</div>
                        </div>
                    </div>
                    <button class="btn btn-del" onclick="deleteRule('${key}')">ลบ</button>
                </div>
            `;

            testButtons.innerHTML += `
                <button class="btn-test" onclick="socket.emit('test_command', '${key}')">
                    ทดสอบ 🪙${coins}
                </button>
            `;
        } else if (isLike) {
            const likes = key.split(':')[1];
            rulesList.innerHTML += `
                <div class="rule-item">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <div style="width:28px; height:28px; margin-right:15px; border-radius: 4px; background: #f38ba8; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                            ❤️
                        </div>
                        <div style="flex-grow: 1;">
                            <div class="rule-gift" style="display: flex; align-items: center;">
                                ❤️ สะสมยอดกดหัวใจครบ ${likes} ครั้ง
                                <span style="margin-left: 10px; background: #ffd700; color: #111; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">×${repeatCount}</span>
                            </div>
                            <div class="rule-cmd">/${cmd}</div>
                        </div>
                    </div>
                    <button class="btn btn-del" onclick="deleteRule('${key}')">ลบ</button>
                </div>
            `;

            testButtons.innerHTML += `
                <button class="btn-test" onclick="socket.emit('test_command', '${key}')">
                    ทดสอบ ❤️${likes}
                </button>
            `;
        }
    }

    if (Object.keys(currentRules).length === 0) {
        rulesList.innerHTML = '<div style="color: #6c7086;">ยังไม่มีการตั้งค่าคำสั่งครับ</div>';
    }
}