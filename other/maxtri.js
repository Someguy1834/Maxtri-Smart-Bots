const { uint8ify } = require("./fun.js");

/* CUSTOM SOCKET CODE */
class SocketSchema {
    parse_data(message) {
        var buf = new StreamPeerBuffer();
        buf.set_data_array(message);
        var type = buf.get_u8();
        switch (type) {
            case 0: {
                return {
                    type: 'connection',
                    content: buf.get_utf8()
                };
            }
            case 1: {
                return {
                    type: type_to_string(type),
                    content: buf.get_utf8()
                };
            }
            case 4: {
                return {
                    type: type_to_string(type),
                    content: buf.get_utf8()
                };
            }
            case 6: {
                let camera = {
                    x: buf.get_u16(),
                    y: buf.get_u16(),
                    fov: buf.get_u16(),
                };
                return {
                    type: "camera",
                    content: camera
                };
            }
            case 7: {
                let death = {
                    killerName: buf.get_utf8(),
                    score: buf.get_float(),
                    level: buf.get_u16(),
                    timeAlive: buf.get_u16()
                };
                return {
                    type: "death",
                    content: death
                };
            }
            case 3: {
                var pos = {};
                var length = buf.get_u16();
                for (var i = 0; i < length; i++) {
                    var id = buf.get_u32();
                    var t = this.entityTypeToStr(buf.get_u8());
                    switch (t) {
                        case "Tank":
                            pos[id] = {
                                type: t,
                                position: {
                                    x: buf.get_u16(),
                                    y: buf.get_u16()
                                },
                                rotation: buf.get_float(),
                                name: buf.get_utf8(),
                                level: buf.get_float(),
                                health: buf.get_float(),
                                kind: buf.get_u8(),
                                score: buf.get_float(),
                                namecolor: buf.get_u8(),
                                team: buf.get_u8(),
                                speed: buf.get_float()
                            };
                            break;
                        case "Square":
                            pos[id] = {
                                type: t,
                                position: {
                                    x: buf.get_u16(),
                                    y: buf.get_u16()
                                },
                                rotation: buf.get_float(),
                                health: buf.get_float()
                            };
                            break;
                        case "Triangle":
                            pos[id] = {
                                type: t,
                                position: {
                                    x: buf.get_u16(),
                                    y: buf.get_u16()
                                },
                                rotation: buf.get_float(),
                                health: buf.get_float()
                            };
                            break;
                        case "Pentagon":
                            pos[id] = {
                                type: t,
                                position: {
                                    x: buf.get_u16(),
                                    y: buf.get_u16()
                                },
                                rotation: buf.get_float(),
                                health: buf.get_float()
                            };
                            break;
                        case "AlphaPentagon":
                            pos[id] = {
                                type: t,
                                position: {
                                    x: buf.get_u16(),
                                    y: buf.get_u16()
                                },
                                rotation: buf.get_float(),
                                health: buf.get_float()
                            };
                            break;
                        case "Bullet":
                            pos[id] = {
                                type: t,
                                position: {
                                    x: buf.get_16(),
                                    y: buf.get_16()
                                },
                                owner: buf.get_u32(),
                                radius: buf.get_u16(),
                                velocity: {
                                    x: buf.get_16(),
                                    y: buf.get_16()
                                },
                                barrel: buf.get_u8(),
                                kind: buf.get_u8(),
                                team: buf.get_u8(),
                                angle: buf.get_float()
                            };
                            break;
                    };
                };
                return {
                    type: "census",
                    content: pos
                };
            };
        };
    };

    entityTypeToStr(int) {
        switch (int) {
            case 0: return 'Tank';
            case 1: return 'Square';
            case 2: return 'Bullet';
            case 3: return 'Pentagon';
            case 4: return 'Triangle';
            case 5: return 'AlphaPentagon';
        };
    };

    prep_data(message) {
        var buf = new StreamPeerBuffer();
        buf.put_u8(type_to_int(message.type));
        switch (message.type) {
            case "connection":
                buf.put_utf8(message.content[0]); // Put the name
                buf.put_utf8(message.content[1]); // Put the token
                break;
            case "message":
                buf.put_utf8(message.content);
                break;
            case "worldData":
                buf.put_utf8(message.content);
                break;
            case "upgrade":
                buf.put_u8(message.content);
                break;
            case "input":
                buf.put_u8(message.content[0]); // Up
                buf.put_u8(message.content[1]); // Down
                buf.put_u8(message.content[2]); // Left
                buf.put_u8(message.content[3]); // Right
                buf.put_float(message.content[4]); // Direction
                buf.put_u8(message.content[5]); // Pressing "K"
                buf.put_u8(message.content[6]); // Mousedown
                buf.put_16(message.content[7]); // MouseX
                buf.put_16(message.content[8]); // MouseY
                buf.put_u8(message.content[9]); // Rightclick
        };
        return buf.buffer;
    };
};

function Uint8ToString16(ui8) {
    if (ui8.length % 2) return false;
    let length = 0, l = Math.min(ui8[0], 4), i;
    for (i = 0; i < l; i++) length += ui8[i + 1] << i;
    let ui16 = new Uint16Array(ui8.buffer);
    let string = "";
    for (i = 0; i < length; i++) string += String.fromCharCode(ui16[i + l]);
    return string;
};

function string16ToUint8(string) {
    let length = string.length, i;
    if (length >= 4294967295) throw Error("String to large: " + length + " chars.");
    let h = length < 256 ? 1 : length < 65536 ? 2 : length < 16777216 ? 3 : 4;
    let arrLength = h + 1 + length * 2;
    let ui8 = new Uint8Array((arrLength % 2) + arrLength);
    let ui16 = new Uint16Array(ui8.buffer);
    ui8[0] = h;
    for (i = 0; i < h; i++) ui8[i + 1] = length >>> i;
    for (i = 0; i < length; i++) ui16[i + h] = string.charCodeAt(i);
    return ui8;
};

function type_to_int(type) {
    switch (type) {
        case "connection": return 0;
        case "message": return 1;
        case "input": return 2;
        case "worldData": return 4;
        case "upgrade": return 5;
        case "respawn": return 8;
    };
};

function type_to_string(type) {
    switch (type) {
        case 0: return "connection";
        case 1: return "message";
        case 2: return "input";
        case 3: return "census";
        case 4: return "worldData";
        case 5: return "upgrade";
        case 8: return "respawn";
    };
};


class StreamPeerBuffer {
    constructor() {
        this.view = new DataView(new ArrayBuffer(4000));
        this.offset = 0;
        this.read = 0;
        this.textEnc = new TextEncoder();
        this.textDec = new TextDecoder();
    };
    get buffer() {
        var buf = this.view.buffer;
        var trimmer = new Uint8Array(buf);
        var trimmed = trimmer.slice(0, this.offset + this.read);
        return trimmed.buffer;
    };

    put_u8(byte) {
        this.view.setUint8(this.offset, byte);
        this.offset++;
    };

    put_u16(dbyte) {
        this.view.setUint16(this.offset, dbyte);
        this.offset += 2;
    };

    put_u32(qbyte) {
        this.view.setUint32(this.offset, qbyte);
        this.offset += 4;
    };

    put_8(byte) {
        this.view.setInt8(this.offset, byte);
        this.offset++;
    };

    put_16(dbyte) {
        this.view.setInt16(this.offset, dbyte);
        this.offset += 2;
    };

    put_32(qbyte) {
        this.view.setInt32(this.offset, qbyte);
        this.offset += 4;
    };

    put_float(float) {
        this.view.setFloat32(this.offset, float)
        this.offset += 4;
    };

    put_utf8(str) {
        var bytes = this.textEnc.encode(str);
        if (bytes.length >= 1000) bytes = string16ToUint8("[Warn] Message too long!");
        this.put_u16(bytes.length)
        bytes.forEach(byte => this.put_u8(byte));
    };

    set_data_array(arrbuf) {
        this.offset = 0;
        this.view = new DataView(arrbuf);
        this.read = arrbuf.byteLength;
    };

    get_u8() {
        var res = this.view.getUint8(this.offset);
        this.offset++;
        return res;
    };

    get_u16() {
        var res = this.view.getUint16(this.offset);
        this.offset += 2;
        return res;
    };

    get_u32() {
        var res = this.view.getUint32(this.offset);
        this.offset += 4;
        return res;
    };

    get_8() {
        var res = this.view.getInt8(this.offset);
        this.offset++;
        return res;
    };

    get_16() {
        var res = this.view.getInt16(this.offset);
        this.offset += 2;
        return res;
    };

    get_32() {
        var res = this.view.getInt32(this.offset);
        this.offset += 4;
        return res;
    };

    get_float() {
        var res = this.view.getFloat32(this.offset);
        this.offset += 4;
        return res;
    };

    get_utf8() {
        var length = this.get_u16();
        var arr = [];
        for (var i = 0; i < length; i++) arr.push(this.get_u8());
        var buf = new Uint8Array(arr);
        return this.textDec.decode(buf);
    };
};


const socket = new SocketSchema();
class PacketManager {
    movement(input) {
        let data = socket.prep_data({
            type: "input",
            content: input
        });
        let array8 = uint8ify(data);
        return { data, array8 };
    };
    upgrade() { return undefined; }
    connection(name, token) {
        let data = socket.prep_data({
            type: "connection",
            content: [
                name,
                token
            ]
        });
        let array8 = uint8ify(data);
        return { data, array8 };
    };
    message(msg) {
        if (!msg) msg = "";
        let data = socket.prep_data({
            type: "message",
            content: msg
        });
        let array8 = uint8ify(data);
        return { data, array8 };
    };
};


module.exports = { SocketSchema, StreamPeerBuffer, PacketManager };