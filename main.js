const WebSocket = require("ws");
const Maxtri = require("./other/maxtri.js");
const config = require("./other/config.json");
const { notify, uint8ify, avarage, getD } = require("./other/fun.js");
const name = config.name;
const token = config.token;
const url = config.urls.tdm;
const amount = parseInt(config.amount);
const origin = config.origin;
const wantedTeam = parseInt(config.wantedTeam);


/* GAME HANDLER */
function spawnBot() {
    const socket = new Maxtri.SocketSchema();
    const manager = new Maxtri.PacketManager();
    const ws = new WebSocket(url, { origin: origin });
    ws.binaryType = "arraybuffer";
    ws.onopen = function () {
        // Set defualts
        var world = {};
        var netX = 0;
        var netY = 0;
        var id = 0;
        var team = wantedTeam;
        var health = 1;
        var user = {};
        const data = socket.prep_data({
            type: "connection",
            content: [name, token]
        });
        ws.send(data);
        ws.onmessage = function (message) {
            message = socket.parse_data(message.data);
            switch (message.type) {
                case "census": world = message.content; break;
                case "connection": id = message.content;
            };
        };
        const Cloop = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) return clearInterval(Cloop);
            for (const key in world) if (key === id) user = world[key];
            if (!user.position) return;
            netY = user.position.y;
            netX = user.position.x;
            team = user.team;
            health = user.health;
        }, 30);



        /* BOT */
        const mapsize = { x: 12000, y: 12000 };
        const afriadSize = 1500;
        var roamPos = { x: mapsize.x / 2, y: mapsize.y / 2 };
        const makePacket = (userX, userY, tankX, tankY, Blimit, kind) => {
            let packet = [];
            let bothX = tankX - userX;
            let bothY = tankY - userY;
            let dist = getD(userX, userY, tankX, tankY);

            let movementArray = [false, false, false, false];
            if (kind === "tank" && health < 0.4) {
                if (userX < tankX) movementArray[2] = true; // Right
                if (userX > tankX) movementArray[3] = true; // Left
                if (userY < tankY) movementArray[0] = true; // Up
                if (userY > tankY) movementArray[1] = true; // Down
            } else if (dist > Blimit) {
                if (userX < tankX) movementArray[3] = true; // Left
                if (userX > tankX) movementArray[2] = true; // Right
                if (userY < tankY) movementArray[1] = true; // Down
                if (userY > tankY) movementArray[0] = true; // Up
            } else {
                if (userX < tankX) movementArray[2] = true; // Right
                if (userX > tankX) movementArray[3] = true; // Left
                if (userY < tankY) movementArray[0] = true; // Up
                if (userY > tankY) movementArray[1] = true; // Down
            };
            movementArray.forEach((m) => packet.push(m)); // Movement

            let theta = Math.atan2(bothY, bothX);
            let theta2 = (theta === 1) ? theta - Math.PI : theta + Math.PI;
            switch (kind) {
                case "shape": (dist > 800) ? packet.push(theta2) : packet.push(theta); break;
                case "tank": packet.push(theta); break;
                case "roam": (dist > 100) ? packet.push(theta2) : packet.push(theta); break;
            }; // Mouse

            packet.push(0); // "K"
            packet.push(true); // Firing
            packet.push(bothX);
            packet.push(bothY);// Mouse X,Y
            packet.push(false); // Right click

            packet = manager.movement(packet).array8;
            return packet;
        };

        function makePos() {
            let X = Math.round(Math.random() * mapsize.x);
            let Y = Math.round(Math.random() * mapsize.y);
            if (mapsize.x - afriadSize < X || afriadSize > X || mapsize.y - afriadSize < Y || afriadSize > Y) {
                makePos();
                return;
            };
            roamPos = { x: X, y: Y };
        };

        function roam() {
            let X = netX;
            let Y = netY;
            let difference = getD(X, Y, roamPos.x, roamPos.y);
            if (difference < 500) makePos();
            ws.send(makePacket(X, Y, roamPos.x, roamPos.y, 0, "roam"));
        };

        function getFood() {
            let X = netX;
            let Y = netY;
            let score = 99999;
            let index = 0;
            let secscore = 0;
            for (const key in world) {
                let branch = world[key];
                if (branch.name !== undefined) continue;
                if (branch.kind === 0 || branch.kind === 1 || branch.kind === 2) continue;
                let temp = { x: branch.position.x, y: branch.position.y };

                if (mapsize.x - afriadSize < temp.x || afriadSize > temp.x || mapsize.y - afriadSize < temp.y || afriadSize > temp.y) continue;
                secscore = getD(X, Y, temp.x, temp.y);
                if (secscore < score) { score = secscore; index = key; }
            };
            if (index === 0) return roam();
            let info = { x: world[index].position.x, y: world[index].position.y };
            ws.send(makePacket(X, Y, info.x, info.y, 400, "shape"));
            return;
        };

        function pick() {
            ws.send(uint8ify([8])); // For Respawning.
            ws.send(uint8ify([5, 1])); // For upgrading to penta.
            return;
        };

        function attack() {
            let score = 99999;
            let X = netX;
            let Y = netY;
            let index = 0;
            let secscore = 0;
            let tanks = [];
            let awayscore = 400;
            let thres = 1;
            let tempscore = user.score;
            for (const key in world) {
                let branch = world[key];
                if (branch.name === undefined) continue;
                if (key === id) continue;
                if (team === branch.team) { thres++; tempscore += branch.score; continue; };
                let temp = { x: branch.position.x, y: branch.position.y };
                if (mapsize.x - afriadSize < temp.x || afriadSize > temp.x || mapsize.y - afriadSize < temp.y || afriadSize > temp.y) continue;
                secscore = getD(X, Y, temp.x, temp.y);
                tanks.push(key);
                if (secscore < score) { score = secscore; index = key; };
            };
            if (score === 99999) return getFood();
            let info = { x: world[index].position.x, y: world[index].position.y };
            if (tanks.length > thres) {
                for (let i = 0; i < tanks.length; i++) {
                    info.y = avarage(info.y, world[tanks[i]].position.y);
                    info.x = avarage(info.x, world[tanks[i]].position.x);
                };
                awayscore = 9999;
            };
            if (world[index].score > tempscore && user.score < 24000) awayscore = 9999;
            ws.send(makePacket(X, Y, info.x, info.y, awayscore, "tank"));
            return;
        };

        function check() {
            let X = netX;
            let Y = netY;
            let score = 200;
            let index = 0;
            let secscore = 0;
            for (const key in world) {
                if (key === id) continue;
                let branch = world[key];
                if (branch.team === team) continue;
                if (branch.kind === 0) continue;
                let temp = { x: branch.position.x, y: branch.position.y };
                secscore = getD(X, Y, temp.x, temp.y);
                if (secscore < score) { score = secscore; index = key; };
            };
            if (index === 0) return attack();
            let info = { x: world[index].position.x, y: world[index].position.y };
            ws.send(makePacket(X, Y, info.x, info.y, 9999, "tank"));
            return;
        };

        const Mloop = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) { notify("A bot disconnected."); return clearInterval(Mloop); }
            if (team !== wantedTeam) { ws.close(); return; };
            pick();
            check();
        }, 30);
    };
};

notify(`Spawning ${amount} ${(amount === 1) ? "bot" : "bots"}...`);
for (let i = 0; i < amount; i++) spawnBot();