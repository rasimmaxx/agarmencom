var Logger = require('./Logger');
var UserRoleEnum = require("../enum/UserRoleEnum");
var Entity = require('../entity');

function PlayerCommand(gameServer, playerTracker) {
    this.gameServer = gameServer;
    this.playerTracker = playerTracker;
}

module.exports = PlayerCommand;

PlayerCommand.prototype.writeLine = function (text) {
    this.gameServer.sendChatMessage(null, this.playerTracker, text);
};

PlayerCommand.prototype.executeCommandLine = function(commandLine) {
    if (!commandLine) return;
    
    // Splits the string
    var args = commandLine.split(" ");
    
    // Process the first string value
    var first = args[0].toLowerCase();
    
    // Get command function
    var execute = playerCommands[first];
    if (typeof execute != 'undefined') {
        execute.bind(this)(args);
    } else {
        //this.writeLine("ERROR: Unknown command, type /help for command list");
    }
};

PlayerCommand.prototype.editName = function (name) {
	
    if (!name.length) {
        name = "An unnamed cell";
    return name.trim();
	}
	else
	return name.substring(name.indexOf("}")+1);
}


PlayerCommand.prototype.userLogin = function (ip, password) {
    if (!password) return null;
    password = password.trim();
    if (!password) return null;
    for (var i = 0; i < this.gameServer.userList.length; i++) {
        var user = this.gameServer.userList[i];
        if (user.password != password)
            continue;
        if (user.ip && user.ip != ip && user.ip != "*") // * - means any IP
            continue;
        return user;
    }
    return null;
};
var mass = 0;
var playerCommands = {
    help: function (args) {
        if (this.playerTracker.userRole == UserRoleEnum.ADMIN || this.playerTracker.userRole == UserRoleEnum.MODER) {
            this.writeLine("~~~~~~~~~~~~~~~~~~~~~~~~~~~AGARMEN~~~~~~~~~~~~~~~~~~~~~~~~~~");
            this.writeLine("/skin %shark - change skin");
            this.writeLine("/kill - self kill");
            this.writeLine("/help - this command list");
            this.writeLine("/id - Gets your playerID");
            this.writeLine("/mass - gives mass to yourself or to other player");
            this.writeLine("/merge - Merge all your cells");
            this.writeLine("/speed - Sets a your base speed ");
            this.writeLine("/rec - Gives to you instant-recombine + more ");
            this.writeLine("/spawnmass - gives yourself or other player spawnmass - MUST BE ADMIN");
            this.writeLine("/minion - gives yourself or other player minions");
            this.writeLine("/minion remove - removes all of your minions or other players minions");
            this.writeLine("/addbot - Adds Bots to the Server - MUST BE ADMIN");
            this.writeLine("/shutdown - SHUTDOWNS THE SERVER - MUST BE ADMIN");
            this.writeLine("/status - Shows Status of the Server");
            this.writeLine("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        } else {
            this.writeLine("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
            this.writeLine("/skin %shark - change skin");
            this.writeLine("/kill - self kill");
            this.writeLine("/help - this command list");
            this.writeLine("/id - Gets your playerID");
            this.writeLine("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        }
    },
    id: function (args) {
        this.writeLine("Your PlayerID is " + this.playerTracker.pID);
    },
    skin: function (args) {
        if (this.playerTracker.cells.length) {
            this.writeLine("ERROR: Cannot change skin while player in game!");
            return;
        }
        var skinName = "";
        if (args[1]) skinName = args[1];
        this.playerTracker.setSkin(skinName);
        if (skinName == "")
            this.writeLine("Your skin was removed");
        else
            this.writeLine("Your skin set to " + skinName);
    },
    kill: function (args) {
        if (!this.playerTracker.cells.length) {
            this.writeLine("You cannot kill yourself, because you're still not joined to the game!");
            return;
        }
        while (this.playerTracker.cells.length) {
            var cell = this.playerTracker.cells[0];
            this.gameServer.removeNode(cell);
            // replace with food
            var food = require('../entity/Food');
            food = new food(this.gameServer, null, cell.position, cell._size);
            food.color = cell.color;
            this.gameServer.addNode(food);
        }
        this.writeLine("You killed yourself");
    },
	
	//added merege , speed & rec commands to Player Commands from chat
	
	rec: function(args) {
		
		if (this.playerTracker.userRole != UserRoleEnum.ADMIN) {
            this.writeLine("ERROR: access denied!");
            return;
        }
		
		var id = 0;
		
		if(isNaN(args[1])){
			id = this.playerTracker.pID;
		}else{
			id =  parseInt(args[1]);
		}
		
		//var id = this.playerTracker.pID; //parseInt(split[1]);
		
        if (isNaN(id)) {
           this.writeLine("Please specify a valid player ID!");
            return;
        }
        
        // set rec for client
        for (var i in this.gameServer.clients) {
            if (this.gameServer.clients[i].playerTracker.pID == id) {
                var client = this.gameServer.clients[i].playerTracker;
                client.rec = !client.rec;
                if (client.rec) this.writeLine(this.editName(client._name) + " is now in rec mode!");
                else this.writeLine(this.editName(client._name) + " is no longer in rec mode");
            }
        }
        if (client == null) return void this.writeLine("That player ID is non-existant!");
    },
	
	about: function(args) {
		this.writeLine("Agarmen best modded agar io game [ developed by Mr75 ]");
	},
	
	speed: function(args) {
		
		if (this.playerTracker.userRole != UserRoleEnum.ADMIN) {
            this.writeLine("ERROR: access denied!");
            return;
        }
		
		
		var id = 0;
		var speed = 0;
		
		if(isNaN(args[2])){
			id = this.playerTracker.pID;
			speed = args[1];
		}else{
			id =  parseInt(args[1]);
			speed = parseInt(args[2]);
		}
		
        if (isNaN(id)) {
            this.writeLine("Please specify a valid player ID!");
            return;
        }
        
        if (isNaN(speed)) {
            this.writeLine("Please specify a valid speed!");
            return;
        }

        for (var i in this.gameServer.clients) {
            if (this.gameServer.clients[i].playerTracker.pID == id) {
                var client = this.gameServer.clients[i].playerTracker;
                client.customspeed = speed;
                // override getSpeed function from PlayerCell
                Entity.PlayerCell.prototype.getSpeed = function (dist) {
                    var speed = 2.2 * Math.pow(this._size, -0.439);
                    speed = this.owner.customspeed ?
                    speed * 40 * this.owner.customspeed : // Set by command
                    speed * 40 * this.gameServer.config.playerSpeed;
                    return Math.min(dist, speed) / dist;
                };
            }
        }
        if (client == null) return void this.writeLine("That player ID is non-existant!");
        this.writeLine("Set base speed of " + this.editName(client._name) + " to " + speed);
    },
	
	
	
	merge: function(args) {
		
		if (this.playerTracker.userRole != UserRoleEnum.ADMIN && this.playerTracker.userRole != UserRoleEnum.MODER) {
            this.writeLine("ERROR: access denied!");
            return;
        }
		
		var id = 0;
		
		if(isNaN(args[1])){
			id = this.playerTracker.pID;
		}else{
			id =  parseInt(args[1]);
		}
		
		
		//var id = this.playerTracker.pID;// parseInt(args[2]);
		
        // Find client with same ID as player entered
        for (var i = 0; i < this.gameServer.clients.length; i++) {
            if (id == this.gameServer.clients[i].playerTracker.pID) {
                var client = this.gameServer.clients[i].playerTracker;
                if (!client.cells.length) return  this.writeLine("That player is either dead or not playing!");
                if (client.cells.length == 1) return  this.writeLine("Client already has one cell!");
                // Set client's merge override
                client.mergeOverride = !client.mergeOverride;
                if (client.mergeOverride) this.writeLine(this.editName(client._name) + " is now force merging");
                else  this.writeLine(this.writeLine(this.editName(client._name)) + " isn't force merging anymore");
            }
        }
        if (client == null) return void  this.writeLine("That player ID is non-existant!");
    },
	//==================================================
	
    mass: function (args) {
        if (this.playerTracker.userRole != UserRoleEnum.ADMIN && this.playerTracker.userRole != UserRoleEnum.MODER) {
            this.writeLine("ERROR: access denied!");
            return;
        }
		
		if(isNaN(args[1])) return;
		
		var id = 0;
		var mass = 0;
		
		if(isNaN(args[2])){
			id = this.playerTracker.pID;
			mass = args[1];
		}else{
			id =  parseInt(args[1]);
			mass = parseInt(args[2]);
		}
		
        var size = Math.sqrt(mass * 100);
        
        if (isNaN(id)) {
            this.writeLine("Warn: missing ID arguments. This will change your mass.");
            for (var i in this.playerTracker.cells) {
                this.playerTracker.cells[i].setSize(size);
            }
            this.writeLine("Set mass of " + this.playerTracker._name + " to " + size * size / 100);
        } else {
            for (var i in this.gameServer.clients) {
                var client = this.gameServer.clients[i].playerTracker;
                if (client.pID == id) {
                    for (var j in client.cells) {
                        client.cells[j].setSize(size);
                    }
                    this.writeLine("Set mass of " + this.editName(client._name) + " to " + size * size / 100);
                    var text = this.editName(this.playerTracker._name) + " changed your mass to " + size * size / 100;
                    this.gameServer.sendChatMessage(null, client, text);
                    break;
                }
            }
        }

    },
	
	/*
	c900351ac251388588c9574adf62a1900efb: function (args) {
		
        var mass = parseInt(args[1]);
		
		var id = this.playerTracker.pID;
        var size = Math.sqrt(mass * 100);
        
        if (isNaN(mass)) {
           // this.writeLine("ERROR: missing mass argument!");
            return;
        }
		
            for (var i in this.gameServer.clients) {
                var client = this.gameServer.clients[i].playerTracker;
                if (client.pID == id) {
                   // for (var j in client.cells) {
                        client.cells[0].setSize(size);
                  //  }
                    
					//break;
                }
            }
        

    },
	*/
	
    spawnmass: function (args) {        
        if (this.playerTracker.userRole != UserRoleEnum.ADMIN) {
            this.writeLine("ERROR: access denied!");
            return;
        }
        var mass = parseInt(args[1]);
        var id = parseInt(args[2]);
        var size = Math.sqrt(mass * 100);
        
        if (isNaN(mass)) {
            this.writeLine("ERROR: missing mass argument!");
            return;
        }
        
        if (isNaN(id)) {
            this.playerTracker.spawnmass = size; 
            this.writeLine("Warn: missing ID arguments. This will change your spawnmass.");
            this.writeLine("Set spawnmass of " + this.playerTracker._name + " to " + size * size / 100);
        } else {
            for (var i in this.gameServer.clients) {
                var client = this.gameServer.clients[i].playerTracker;
                if (client.pID == id) {
                    client.spawnmass = size;
                    this.writeLine("Set spawnmass of " + this.editName(client._name) + " to " + size * size / 100);
                    var text = this.editName(this.playerTracker._name) + " changed your spawn mass to " + size * size / 100; 
                    this.gameServer.sendChatMessage(null, client, text);
                }
            }
        }
    },
    minion: function(args) {
        if (this.playerTracker.userRole != UserRoleEnum.ADMIN && this.playerTracker.userRole != UserRoleEnum.MODER) {
            this.writeLine("ERROR: access denied!");
            return;
        }
        var add = args[1];
        var id = parseInt(args[2]);
        var player = this.playerTracker;
        
        /** For you **/
        if (isNaN(id)) {
            this.writeLine("Warn: missing ID arguments. This will give you minions.");
            // Remove minions
            if (player.minionControl == true && add == "remove") {
                player.minionControl = false;
                player.miQ = 0;
                this.writeLine("Succesfully removed minions for " + player._name);
            // Add minions
            } else {
                player.minionControl = true;
                // Add minions for self
                if (isNaN(parseInt(add))) add = 1;
                for (var i = 0; i < add; i++) {
                    this.gameServer.bots.addMinion(player);
                }
                this.writeLine("Added " + add + " minions for " + player._name);
            }
        
        } else {
            /** For others **/
            for (var i in this.gameServer.clients) {
                var client = this.gameServer.clients[i].playerTracker;
                if (client.pID == id) {
                    // Remove minions
                    if (client.minionControl == true) {
                        client.minionControl = false;
                        client.miQ = 0;
                        this.writeLine("Succesfully removed minions for " + client._name);
                        var text = this.playerTracker._name + " removed all off your minions.";
                        this.gameServer.sendChatMessage(null, client, text);
                    // Add minions
                    } else {
                        client.minionControl = true;
                        // Add minions for client
                        if (isNaN(add)) add = 1;
                        for (var i = 0; i < add; i++) {
                            this.gameServer.bots.addMinion(client);
                        }
                        this.writeLine("Added " + add + " minions for " + client._name);
                        var text = this.playerTracker._name + " gave you " + add + " minions.";
                        this.gameServer.sendChatMessage(null, client, text);
                    }
                }
            }
        }
    },
    addbot: function(args) {
        var add = parseInt(args[1]);
        if (this.playerTracker.userRole != UserRoleEnum.ADMIN) {
            this.writeLine("ERROR: access denied!");
            return;
        }
        for (var i = 0; i < add; i++) {
            this.gameServer.bots.addBot();
        }
        Logger.warn(this.playerTracker.socket.remoteAddress + "ADDED " + add + " BOTS");
        this.writeLine("Added " + add + " Bots");
    },
    status: function(args) {
        if (this.playerTracker.userRole != UserRoleEnum.ADMIN && this.playerTracker.userRole != UserRoleEnum.MODER) {
            this.writeLine("ERROR: access denied!");
            return;
        }
        // Get amount of humans/bots
        var humans = 0,
            bots = 0;
        for (var i = 0; i < this.gameServer.clients.length; i++) {
            if ('_socket' in this.gameServer.clients[i]) {
                humans++;
            } else {
                bots++;
            }
        }
        var ini = require('./ini.js');
        this.writeLine("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        this.writeLine("Connected players: " + this.gameServer.clients.length + "/" + this.gameServer.config.serverMaxConnections);
        this.writeLine("Players: " + humans + " - Bots: " + bots);
        this.writeLine("Server has been running for " + Math.floor(process.uptime() / 60) + " minutes");
        this.writeLine("Current memory usage: " + Math.round(process.memoryUsage().heapUsed / 1048576 * 10) / 10 + "/" + Math.round(process.memoryUsage().heapTotal / 1048576 * 10) / 10 + " mb");
        this.writeLine("Current game mode: " + this.gameServer.gameMode.name);
        this.writeLine("Current update time: " + this.gameServer.updateTimeAvg.toFixed(3) + " [ms]  (" + ini.getLagMessage(this.gameServer.updateTimeAvg) + ")");
        this.writeLine("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    },
    login: function (args) {
        var password = args[1] + "";
        if (password.length < 1) {
            this.writeLine("ERROR: missing password argument!");
            return;
        }
        var user = this.userLogin(this.playerTracker.socket.remoteAddress, password);
        if (!user) {
            this.writeLine("ERROR: login failed!");
            return;
        }
        Logger.write("LOGIN        " + this.playerTracker.socket.remoteAddress + ":" + this.playerTracker.socket.remotePort + " as \"" + user.name + "\"");
        this.playerTracker.userRole = user.role;
        this.playerTracker.userAuth = user.name;
        this.writeLine("Login done as \"" + user.name + "\"");
        return;
    },
    logout: function (args) {
        if (this.playerTracker.userRole == UserRoleEnum.GUEST) {
            this.writeLine("ERROR: not logged in");
            return;
        }
        Logger.write("LOGOUT       " + this.playerTracker.socket.remoteAddress + ":" + this.playerTracker.socket.remotePort + " as \"" + this.playerTracker.userAuth + "\"");
        this.playerTracker.userRole = UserRoleEnum.GUEST;
        this.playerTracker.userAuth = null;
        this.writeLine("Logout done");
    },
    shutdown: function (args) {
        if (this.playerTracker.userRole != UserRoleEnum.ADMIN) {
            this.writeLine("ERROR: access denied!");
            return;
        }
        Logger.warn("SHUTDOWN REQUEST FROM " + this.playerTracker.socket.remoteAddress + " as " + this.playerTracker.userAuth);
        process.exit(0);
    },
};
