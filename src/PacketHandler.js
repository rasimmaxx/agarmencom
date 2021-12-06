var Packet = require('./packet');
var BinaryReader = require('./packet/BinaryReader');
var PlayerCommand = require('./modules/PlayerCommand');
var Entity = require('./entity');

function PacketHandler(gameServer, socket) {
    this.gameServer = gameServer;
    this.socket = socket;
    this.protocol = 0;
    this.handshakeProtocol = null;
    this.handshakeKey = null;
    this.lastJoinTick = 0;
    this.lastChatTick = 0;
    this.lastStatTick = 0;
    this.lastWTick = 0;
	this.lastDTick = 0;
    this.lastQTick = 0;
    this.lastSpaceTick = 0;
    this.pressQ = false;
    this.pressW = false;
	this.pressD = false;
    this.pressSpace = false;
    this.mouseData = null;
    this.handler = {
        254: this.handshake_onProtocol.bind(this),
    };
}


PacketHandler.prototype.writeLine = function (text) {
    this.gameServer.sendChatMessage(null, this.socket.playerTracker, text);
};


module.exports = PacketHandler;

PacketHandler.prototype.handleMessage = function (message) {
    if (!this.handler.hasOwnProperty(message[0]))
        return;

    this.handler[message[0]](message);
    this.socket.lastAliveTime = this.gameServer.stepDateTime;
};

PacketHandler.prototype.handshake_onProtocol = function (message) {
    if (message.length !== 5) return;
    this.handshakeProtocol = message[1] | (message[2] << 8) | (message[3] << 16) | (message[4] << 24);
    if (this.handshakeProtocol < 1 || this.handshakeProtocol > 13) {
        this.socket.close(1002, "Not supported protocol");
        return;
    }
    this.handler = {
        255: this.handshake_onKey.bind(this),
    };
};

PacketHandler.prototype.handshake_onKey = function (message) {
    if (message.length !== 5) return;
    this.handshakeKey = message[1] | (message[2] << 8) | (message[3] << 16) | (message[4] << 24);
    if (this.handshakeProtocol > 6 && this.handshakeKey !== 0) {
        this.socket.close(1002, "Not supported protocol");
        return;
    }
    this.handshake_onCompleted(this.handshakeProtocol, this.handshakeKey);
};

PacketHandler.prototype.handshake_onCompleted = function (protocol, key) {
    this.handler = {
        0: this.message_onJoin.bind(this),
        1: this.message_onSpectate.bind(this),
		12: this.message_onKeyX.bind(this),
        13: this.message_onKeyF.bind(this),
        16: this.message_onMouse.bind(this),
        17: this.message_onKeySpace.bind(this),
        18: this.message_onKeyQ.bind(this),
		19: this.message_onKeyD.bind(this),
        20: this.message_onKeyA.bind(this),
        21: this.message_onKeyW.bind(this),
        22: this.message_onKeyE.bind(this),
        23: this.message_onKeyR.bind(this),
        24: this.message_onKeyT.bind(this),
        25: this.message_onKeyP.bind(this),
        99: this.message_onChat.bind(this),
        254: this.message_onStat.bind(this),
    };
    this.protocol = protocol;
    // Send handshake response
    this.sendPacket(new Packet.ClearAll());
    this.sendPacket(new Packet.SetBorder(this.socket.playerTracker, this.gameServer.border, this.gameServer.config.serverGamemode, "Agarmen.com " + this.gameServer.version));
	
    // Send welcome message
    /*this.gameServer.sendChatMessage(null, this.socket.playerTracker, "Agarmen.com " + this.gameServer.version);*/
    if (this.gameServer.config.serverWelcome1)
       this.writeLine(this.gameServer.config.serverWelcome1);
    if (this.gameServer.config.serverWelcome2)
         this.writeLine(this.gameServer.config.serverWelcome2);
    if (this.gameServer.config.serverChat == 0)
        this.writeLine("This server's chat is disabled.");
    /*if (this.protocol < 4)
        this.gameServer.sendChatMessage(null, this.socket.playerTracker, "WARNING: Protocol " + this.protocol + " assumed as 4!");
	*/
};


PacketHandler.prototype.message_onJoin = function (message) {
    var tick = this.gameServer.tickCounter;
    var dt = tick - this.lastJoinTick;
    this.lastJoinTick = tick;
    if (dt < 25 || this.socket.playerTracker.cells.length !== 0) {
        return;
    }
    var reader = new BinaryReader(message);
    reader.skipBytes(1);
    var text = null;
    if (this.protocol < 6)
        text = reader.readStringZeroUnicode();
    else
        text = reader.readStringZeroUtf8();
    this.setNickname(text);
};

PacketHandler.prototype.message_onSpectate = function (message) {
    if (message.length !== 1 || this.socket.playerTracker.cells.length !== 0) {
        return;
    }
    this.socket.playerTracker.spectate = true;
};

PacketHandler.prototype.message_onMouse = function (message) {
    if (message.length !== 13 && message.length !== 9 && message.length !== 21) {
        return;
    }
    this.mouseData = Buffer.concat([message]);
};

PacketHandler.prototype.message_onKeySpace = function (message) {
    if (this.socket.playerTracker.miQ) {
        this.socket.playerTracker.minionSplit = true;
    } else {
        this.pressSpace = true;
    }
};

PacketHandler.prototype.message_onKeyQ = function (message) {
    if (message.length !== 1) return;
    var tick = this.gameServer.tickCoutner;
    var dt = tick - this.lastQTick;
    if (dt < this.gameServer.config.ejectCooldown) {
        return;
    }
    this.lastQTick = tick;
    if (this.socket.playerTracker.minionControl && !this.gameServer.config.disableQ) {
        this.socket.playerTracker.miQ = !this.socket.playerTracker.miQ;
    } else {
        this.pressQ = true;
    }
};

PacketHandler.prototype.message_onKeyW = function (message) {
    if (message.length !== 1) return;
    var tick = this.gameServer.tickCounter;
    var dt = tick - this.lastWTick;
    if (dt < this.gameServer.config.ejectCooldown) {
        return;
    }
    this.lastWTick = tick;
    if (this.socket.playerTracker.miQ) {
        this.socket.playerTracker.minionEject = true;
    } else {
        this.pressW = true;
    }
};

PacketHandler.prototype.message_onKeyE = function (message) {
    if (this.gameServer.config.disableERTP) return;
    this.socket.playerTracker.minionSplit = true;
};

PacketHandler.prototype.message_onKeyF = function (message) {
	if(!this.gameServer.config.enableKBEF) return;
    var id = this.socket.playerTracker.pID;
        if (isNaN(id)) {
             this.writeLine("Please specify a valid player ID!");
            return;
        }

        for (var i in this.gameServer.clients) {
            if (this.gameServer.clients[i].playerTracker.pID == id) {
                var client = this.gameServer.clients[i].playerTracker;
                //if (!client.cells.length) return this.writeLine("That player is either dead or not playing!");
                // set frozen state
                client.frozen = !client.frozen;
                if (client.frozen) this.writeLine("Froze " + this.editName(client._name) + "(Press [F] to unfroze)");
                //else this.writeLine("Unfroze " + this.editName(client._name));
            }
        }
        if (client == null) return void this.writeLine("That player ID is non-existant!");
};


PacketHandler.prototype.editName = function (name) {
	
    if (!name.length) {
        name = "An unnamed cell";
    return name.trim();
	}
	
	else
	return name.substring(name.indexOf("}")+1);

}

PacketHandler.prototype.message_onKeyD = function (message) {
	if (message.length !== 1) return;
    var tick = this.gameServer.tickCounter;
    var dt = tick - this.lastDTick;
    if (dt < this.gameServer.config.ejectCooldown) {
        return;
    }
    this.lastDTick = tick;
    if (this.socket.playerTracker.miQ) {
        this.socket.playerTracker.minionEject = true;
    } else {
        this.pressD = true;
    }
};

PacketHandler.prototype.getScore = function(client) {
    var score = 0;// reset to not cause bugs
	var curmass = ~~(this.gameServer.config.massSizeForKeys.toString()); //Mass for keys system;	
    if (client.cells.length < 1 ) return;
        score = client.cells[0]._mass;
    return Math.sqrt((score+curmass) * 100); 
};

// Keys system for Agarmen, keys system required a decent client
PacketHandler.prototype.message_onKeyA = function (message) {
	if(!this.gameServer.config.enableKBEF) return;
		var id = this.socket.playerTracker.pID;
            for (var i in this.gameServer.clients) {
                var client = this.gameServer.clients[i].playerTracker;
                if (client.pID == id && this.getScore(client) > 1) { // added this.socket.playerTracker.spectate into if
                        client.cells[0].setSize(this.getScore(client));
					break;
                }
            }
};

PacketHandler.prototype.message_onKeyX = function (message) {
if(!this.gameServer.config.enableKBEF) return;
        var id = this.socket.playerTracker.pID;
		if (isNaN(id)){
            this.writeLine("Please specify a valid player ID!");
            return;
        }
		
		var thisclient = this.socket.playerTracker;
		//this.writeLine(thisclient._score.toString());
		var limitToExplode = ~~(this.gameServer.config.ejectMassLimitToExp);
		
		if(~~(thisclient._score) > limitToExplode){
			this.writeLine("To explode, max score allowed ( "+limitToExplode+" ) or less!");
			return;
		}
		
		var es = this.gameServer.config.ejectSize;
		var ev = this.gameServer.config.ejectVelocity;
		
        for (var i in this.gameServer.clients) {
            if (this.gameServer.clients[i].playerTracker.pID == id) {
                var client = this.gameServer.clients[i].playerTracker;
                for (var i = 0; i < client.cells.length; i++) {
                    var cell = client.cells[i];
                    while (cell._size > this.gameServer.config.playerMinSize) {
                        // remove mass from parent cell
                        var angle = 6.28 * Math.random();
                        var loss = this.gameServer.config.ejectSizeLoss;
                        var size = cell.radius - loss * loss;
                        cell.setSize(Math.sqrt(size));
                        // explode the cell
                        var pos = {
                            x: cell.position.x + angle,
                            y: cell.position.y + angle
                        };
                        var ejected = new Entity.EjectedMass(this.gameServer, null, pos, es);
                        ejected.color = cell.color;
                        ejected.setBoost(ev * Math.random(), angle);
                        this.gameServer.addNode(ejected);
                    }
                    cell.setSize(this.gameServer.config.playerMinSize);
                }
					
                if (!client.cells.length) return this.writeLine("That player is either dead or not playing!");
                this.writeLine("Successfully exploded " + this.editName(client._name));
            }
        }
        if (client == null) return void this.writeLine("Your player ID is non-existant!");
  
};

PacketHandler.prototype.message_onKeyR = function (message) {
    if (this.gameServer.config.disableERTP) return;
    this.socket.playerTracker.minionEject = true;
};

PacketHandler.prototype.message_onKeyT = function (message) {
    if (this.gameServer.config.disableERTP) return;
    this.socket.playerTracker.minionFrozen = !this.socket.playerTracker.minionFrozen;
};

PacketHandler.prototype.message_onKeyP = function (message) {
    if (this.gameServer.config.disableERTP) return;
    if (this.gameServer.config.collectPellets) {
        this.socket.playerTracker.collectPellets = !this.socket.playerTracker.collectPellets;
    }
};

PacketHandler.prototype.message_onChat = function (message) {
    if (message.length < 3) return;
    var tick = this.gameServer.tickCounter;
    var dt = tick - this.lastChatTick;
    this.lastChatTick = tick;
    if (dt < 25 * 2) {
        return;
    }
    
    var flags = message[1];    // flags
    var rvLength = (flags & 2 ? 4:0) + (flags & 4 ? 8:0) + (flags & 8 ? 16:0);
    if (message.length < 3 + rvLength) // second validation
        return;
    
    var reader = new BinaryReader(message);
    reader.skipBytes(2 + rvLength);     // reserved
    var text = null;
    if (this.protocol < 6)
        text = reader.readStringZeroUnicode();
    else
        text = reader.readStringZeroUtf8();
    this.gameServer.onChatMessage(this.socket.playerTracker, null, text);
};

PacketHandler.prototype.message_onStat = function (message) {
    if (message.length !== 1) return;
    var tick = this.gameServer.tickCounter;
    var dt = tick - this.lastStatTick;
    this.lastStatTick = tick;
    if (dt < 25) {
        return;
    }
    this.sendPacket(new Packet.ServerStat(this.socket.playerTracker));
};

PacketHandler.prototype.processMouse = function () {
    if (this.mouseData == null) return;
    var client = this.socket.playerTracker;
    var reader = new BinaryReader(this.mouseData);
    reader.skipBytes(1);
    if (this.mouseData.length === 13) {
        // protocol late 5, 6, 7
        client.mouse.x = reader.readInt32() - client.scrambleX;
        client.mouse.y = reader.readInt32() - client.scrambleY;
    } else if (this.mouseData.length === 9) {
        // early protocol 5
        client.mouse.x = reader.readInt16() - client.scrambleX;
        client.mouse.y = reader.readInt16() - client.scrambleY;
    } else if (this.mouseData.length === 21) {
        // protocol 4
        var x = reader.readDouble() - client.scrambleX;
        var y = reader.readDouble() - client.scrambleY;
        if (!isNaN(x) && !isNaN(y)) {
            client.mouse.x = x;
            client.mouse.y = y;
        }
    }
    this.mouseData = null;
};

PacketHandler.prototype.process = function () {
    if (this.pressSpace) { // Split cell
        this.socket.playerTracker.pressSpace();
        this.pressSpace = false;
    }
    if (this.pressW) { // Eject mass
        this.socket.playerTracker.pressW();
        this.pressW = false;
    }
	if (this.pressD && this.gameServer.config.enableKBEF) { // Eject bomb
        this.socket.playerTracker.pressD();
        this.pressD = false;
    }
    if (this.pressQ) { // Q Press
        this.socket.playerTracker.pressQ();
        this.pressQ = false;
    }
    if (this.socket.playerTracker.minionSplit) {
        this.socket.playerTracker.minionSplit = false;
    }
    if (this.socket.playerTracker.minionEject) {
        this.socket.playerTracker.minionEject = false;
    }
    this.processMouse();
};

PacketHandler.prototype.getRandomSkin = function () {
    var randomSkins = [];
    var fs = require("fs");
    if (fs.existsSync("../src/randomskins.txt")) {
        // Read and parse the Skins - filter out whitespace-only Skins
        randomSkins = fs.readFileSync("../src/randomskins.txt", "utf8").split(/[\r\n]+/).filter(function (x) {
            return x != ''; // filter empty Skins
        });
    }
    // Picks a random skin
    if (randomSkins.length > 0) {
        var index = (randomSkins.length * Math.random()) >>> 0;
        var rSkin = randomSkins[index];
    }
    return rSkin;
};

PacketHandler.prototype.setNickname = function (text) {
    var name = "",
        skin = null;
    if (text != null && text.length > 0) {
        var skinName = null,
            userName = text,
            n = -1;
        if (text[0] == '<' && (n = text.indexOf('>', 1)) >= 1) {
            var inner = text.slice(1, n);
            if (n > 1)
                skinName = (inner == "r") ? this.getRandomSkin() : inner;
            else
                skinName = "";
            userName = text.slice(n + 1);
        }
        skin = skinName;
        name = userName;
    }
    
    if (name.length > this.gameServer.config.playerMaxNickLength)
        name = name.substring(0, this.gameServer.config.playerMaxNickLength);
    
    if (this.gameServer.checkBadWord(name)) {
        skin = null;
        name = "Hi there!";
    }
    
    this.socket.playerTracker.joinGame(name, skin);
};

PacketHandler.prototype.sendPacket = function(packet) {
    var socket = this.socket;
    if (!packet || socket.isConnected == null || socket.playerTracker.isMi) 
        return;
    if (socket.readyState == this.gameServer.WebSocket.OPEN) {
        var buffer = packet.build(this.protocol);
        if (buffer) socket.send(buffer, { binary: true });
    } else {
        socket.readyState = this.gameServer.WebSocket.CLOSED;
        socket.emit('close');
    }
};
