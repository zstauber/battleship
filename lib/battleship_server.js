/******************************************************************************
 * Copyright (c) 2017 Zachary L. Stauber
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 ******************************************************************************/

define(function(requirejs) {
	// note that Chore uses requirejs, not require, because it is my module,
	// which was written for RequireJS specifically
	var socketio = requirejs('socket.io');
	var GameState = requirejs('GameState');
	var Ship = requirejs('ship/Ship');
	var ShipType = requirejs('ship/ShipType');
	var ShipOrientation = requirejs('ship/ShipOrientation');
	var Carrier = requirejs('ship/Carrier');
	var Battleship = requirejs('ship/Battleship');
	var Cruiser = requirejs('ship/Cruiser');
	var Submarine = requirejs('ship/Submarine');
	var Destroyer = requirejs('ship/Destroyer');

	var io;
	var games = [];

	var Turn = Object.freeze({
		"player1": 0,
		"player2": 1
	});

	function Game() {
		this.state = GameState.WAITING;
		this.players = [];
		this.playersReady = [];
		this.playersRestart = [];
		// In each grid, a 0 represents an unknown, a 1 represents a miss, and a 2
		// represents a hit.  All squares are initialized to 0 upon construction
		this.grids = [
			[ // player 0 ocean grid, player 1 target grid
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			],
			[ // player 1 ocean grid, player 0 target grid
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			]
		];
		this.ships = [ // one ship of each type for each player, unplaced
			[
				new Destroyer(),
				new Submarine(),
				new Cruiser(),
				new Battleship(),
				new Carrier()
			],
			[
				new Destroyer(),
				new Submarine(),
				new Cruiser(),
				new Battleship(),
				new Carrier()
			]
		];
		this.turn = Turn.player1;
		this.exit = false;
	}
	Game.prototype.resetGrid = function(grid) {
		for (var i = 0; i < 10; i++) {
			for (var j = 0; j < 10; j++) {
				this.grids[grid][i][j] = 0;
			}
		}
	};
	Game.prototype.resetShips = function(player) {
		for (var i = 0; i < 5; i++) {
			this.ships[player][i].sunk = false;
			this.ships[player][i].bow = undefined;
			this.ships[player][i].orientation = undefined;
		}
	};
	// Checks for win (actually loss) condition against one player.
	Game.prototype.allSunk = function(player) {
		// checks to see if all of player's ships are sunk
		for (var i = 0; i < 5; i++) {
			if (!this.ships[player][i].sunk) {
				return false;
			}
		}
		return true;
	};
	// Returns all the locations occupied by the ship as an array of coordinates.
	Game.prototype.getLocations = function(bow, orientation, hp) {
		var locations = [];
		for (var i = 0; i < hp; i++) {
			if (orientation === ShipOrientation.horizontal) {
				locations.push([bow[0] + i, bow[1]]);
			} else if (orientation === ShipOrientation.vertical) {
				locations.push([bow[0], bow[1] + i]);
			} else {
				return undefined;
			}
		}
		return locations;
	};
	// Returns true if ship can be placed, checks if placed ship location would be
	// inside grid
	Game.prototype.inside = function(player, ship, x, y, orientation) {
		//console.log('Checking inside for ' + ship);
		try {
			if (orientation === ShipOrientation.horizontal) {
				if (y >= 0 && y <= 10 && x >= 0 && x + this.ships[player][ship].hp <= 10) {
					return true;
				} else {
					return false;
				}
			} else if (orientation === ShipOrientation.vertical) {
				if (x >= 0 && x <= 10 && y >= 0 && y + this.ships[player][ship].hp <= 10) {
					return true;
				} else {
					return false;
				}
			} else {
				console.log('orientation parameter is not valid');
			}
		} catch(e) {
			console.log('Error: ' + e);
		}
	};
	// Returns true if ship can be placed, false if it intersects an existing ship.
	Game.prototype.overlap = function(player, ship, x, y, orientation) {
		//console.log('Checking overlap for ' + ship);
		// Get locations of proposed ship to be placed
		var proposedLocations = this.getLocations([x, y], orientation, this.ships[player][ship].hp);
		// Loop through existing ships.
		for (var i = 0; i < 5; i++) {
			if (i === ship) {
				continue;
			}
			var existingLocations = this.ships[player][i].getLocations();
			// Only compare them if they've been placed, of course,
			if (existingLocations !== undefined) {
				// Loop through each location of proposed ship.
				for (var k = 0, l = proposedLocations.length; k < l; k++) {
					// Loop through each location of each existing ship.
					for (var m = 0, n = existingLocations.length; m < n; m++) {
						// Compare coordinates, returning true on any coincidence.
						if (proposedLocations[k][0] === existingLocations[m][0] &&
								proposedLocations[k][1] === existingLocations[m][1]) {
							return true;
						}
					}
				}
			}
		}
		// If we got this far, there are no overlaps, so return false.
		return false;
	};
	// Returns true if ship can be placed, false if not.
	Game.prototype.testPlaceShip = function(player, ship, x, y, orientation) {
		if (this.inside(player, ship, x, y, orientation) &&
				!this.overlap(player, ship, x, y, orientation)) {
			return true;
		} else {
			return false;
		}
	};
	Game.prototype.placeShip = function(player, ship, x, y, orientation) {
		this.ships[player][ship].bow = [x, y];
		this.ships[player][ship].orientation = orientation;
	};
	Game.prototype.allShipsPlaced = function(player) {
		var allPlaced = true;
		for (var i = 0, j = this.ships[player].length; i < j; i++) {
			var ship = this.ships[player][i];
			if (ship.orientation === undefined) {
				allPlaced = false;
			}
		}
		return allPlaced;
	};
	Game.prototype.otherPlayer = function(player) {
		console.log('Getting player: ' + player);
		if (player === Turn.player1) {
			console.log('Returning player: ' + Turn.player2);
			return Turn.player2;
		} else if (player === Turn.player2) {
			console.log('Returning player: ' + Turn.player1);
			return Turn.player1;
		}
	};
	Game.prototype.cycleTurn = function() {
		this.turn = this.otherPlayer(this.turn);
		divColor([getSocketByPlayerId(this, this.turn)], 'divStatus', '#3c3');
		divColor([getSocketByPlayerId(this, this.otherPlayer(this.turn))], 'divStatus', '#ddd');
	};
	Game.prototype.validShot = function(targetPlayer, locX, locY) {
		// Return false if grid location has already been shot
		if (this.grids[targetPlayer][locX][locY] === 0) {
			return true;
		} else {
			return false;
		}
	};
	Game.prototype.hit = function(targetPlayer, locX, locY) {
		// loop through targetPlayer ships and return ship type hit, or undefined
		// if miss
		for (var i = 0, j = this.ships[targetPlayer].length; i < j; i++) {
			var ship = this.ships[targetPlayer][i];
			var x, y;
			for (var k = 0, l = ship.hp; k < l; k++) {
				if (ship.orientation === ShipOrientation.horizontal) {
					x = ship.bow[0] + k;
					y = ship.bow[1];
				} else if (ship.orientation === ShipOrientation.vertical) {
					x = ship.bow[0];
					y = ship.bow[1] + k;
				}
				if (x === locX && y === locY) {
					return ship;
				}
			}
		}
		return undefined;
	};
	Game.prototype.getLocation = function(player, locX, locY) {
		return this.grids[player][locX][locY];
	};

	Game.prototype.setLocation = function(player, locX, locY, value) {
		// if a ship is hit, then set grid location to 1 or 2
		this.grids[player][locX][locY] = value;
	};
	Game.prototype.sunk = function(targetPlayer, ship) {
		// loop over targetPlayer ship locations and set to sunk if all are hits
		var shipLocations = ship.getLocations();
		for (var i = 0, j = shipLocations.length; i < j; i++) {
			var shipLocation = shipLocations[i];
			// if any ship location is a 0 or 1, it's not sunk
			if (this.getLocation(targetPlayer, shipLocation[0], shipLocation[1]) !== 2) {
				return false;
			}
		}
		return true;
	};
	Game.prototype.shoot = function(targetPlayer, locX, locY) {
		// check for a hit
		var ship = this.hit(targetPlayer, locX, locY);
		var message;
		if (ship !== undefined) {
			// if hit, set location to 2
			this.setLocation(targetPlayer, locX, locY, 2);
			// check if ship is sunk (all locations are hits)
			if (this.sunk(targetPlayer, ship)) {
				ship.sunk = true;
				message = 'sunk ' + ship.name + '!'
			} else {
				message = 'hit ' + ship.name + '!';
			}
		} else {
			// if miss (shot is undefined), set tlocation to 1s
			this.setLocation(targetPlayer, locX, locY, 1);
			message = 'missed!';
		}
		return message;
	};
	Game.prototype.next = function() {
		if (this.turn === Turn.player1) {
			this.turn = Turn.player2;
		} else if (this.turn === Turn.player2) {
			this.turn = Turn.player1;
		}
	};
	Game.prototype.resetShot = function() {
		this.shotX = undefined;
		this.shotY = undefined;
		this.locX = undefined;
		this.locY = undefined;
	};
	function rnd2() {
		return Math.floor(Math.random() * 2);
	}
	function rnd10() {
		return Math.floor(Math.random() * 10);
	}
	function number_to_letter(number) {
		var letter;
		switch(number) {
			case 0:
				letter = 'A';
				break;
			case 1:
				letter = 'B';
				break;
			case 2:
				letter = 'C';
				break;
			case 3:
				letter = 'D';
				break;
			case 4:
				letter = 'E';
				break;
			case 5:
				letter = 'F';
				break;
			case 6:
				letter = 'G';
				break;
			case 7:
				letter = 'H';
				break;
			case 8:
				letter = 'I';
				break;
			case 9:
				letter = 'J';
				break;
		}
		return letter;
	}

	function getGameBySocketId(sid) {
		for (var i = 0, j = games.length; i < j; i++) {
			var game = games[i];
			for (var k = 0, l = game.players.length; k < l; k++) {
				var player = game.players[k];
				if (player === sid) {
					return game;
				}
			}
		}
	}

	var listen = function(server) {
		io = socketio.listen(server);
		io.sockets.on('connection', function(socket) {
			var game = addPlayerToGame(socket);
			console.log('games length: ' + games.length);
			console.log(io.sockets.adapter.rooms);
			console.log(socket.id + ' connected');
			if (game.players.length === 1) {
				game.state = GameState.WAITING;
				sendState(getAllGameSocketIds(game), game.state);
			} else if (game.players.length === 2) {
				startGame(getAllGameSocketIds(game));
				console.log('player 2 connected');
			}
			handleClientConnecting(socket);
			handleClientDisconnecting(socket);
		});
	};

	function addPlayerToGame(socket) {
		var placed = false;
		var game;
		for (var i = 0, j = games.length; i < j; i++) {
			game = games[i];
			if (game.players.length < 2) {
				game.players.push(socket.id);
				game.playersReady.push(false);
				game.playersRestart.push(false);
				placed = true;
			}
		}
		if (placed === false) {
			game = new Game();
			game.players.push(socket.id);
			game.playersReady.push(false);
			game.playersRestart.push(false);
			games.push(game);
		}
		return game;
	}

	function removePlayerFromGame(socket) {

	}

	function startGame(sockets) {
		// startGame is done every time there's a new game, after the initialization
		// and includes making empty objects for each run
		//var game = games[0];
		var game = getGameBySocketId(sockets[0].id);
		game.state = GameState.SETUP;
		game.playersReady[0] = false;
		game.playersReady[1] = false;
		game.playersRestart[0] = false;
		game.playersRestart[1] = false;
		game.resetGrid(0);
		game.resetGrid(1);
		game.resetShips(0);
		game.resetShips(1);
		sendState(sockets, game.state);
		update(sockets[0]);
	}

	function playGame(sockets) {
		// start game is done after ships are placed and the players are ready to
		// start shooting
		var game = getGameBySocketId(sockets[0].id);
		game.state = GameState.PLAY;
		sendState(getAllGameSocketIds(game), game.state);
		// start with turns
		sendMessage([getSocketByPlayerId(game, game.turn)], 'Your turn.  Call your shot.', 0);
		divColor([getSocketByPlayerId(game, game.turn)], 'divStatus', '#3c3');
		sendMessage([getSocketByPlayerId(game, game.otherPlayer(game.turn))], 'Other player\'s turn.  Wait please.', 0);
		divColor([getSocketByPlayerId(game, game.otherPlayer(game.turn))], 'divStatus', '#ddd');
	}

	function emptyObject(object) {
		// removes properties of an object properly
		for (var i in object) {
			if (object.hasOwnProperty(i)) {
				delete object[i];
			}
		}
	}

	function handleClientConnecting(socket) {
		console.log('handleClientConnecting');
		var game = getGameBySocketId(socket.id);
		socket.on('requestPlaceShip', function(data) {
			if (game.state === GameState.SETUP || game.state === GameState.READY) {
				var requestingPlayer = getPlayerBySocketId(socket.id);
				var ship = data.ship;
				var orientation = data.orientation;
				var location = data.location;
				var s, o, x, y;
				switch (ship) {
					case 'carrier':
						s = ShipType.carrier;
						break;
					case 'battleship':
						s = ShipType.battleship;
						break;
					case 'cruiser':
						s = ShipType.cruiser;
						break;
					case 'submarine':
						s = ShipType.submarine;
						break;
					case 'destroyer':
						s = ShipType.destroyer;
						break;
				}
				switch (orientation) {
					case 'vertical':
						o = ShipOrientation.vertical;
						break;
					case 'horizontal':
						o = ShipOrientation.horizontal;
						break;
				}
				x = location[0];
				y = location[1];

				if (game.testPlaceShip(requestingPlayer, s, x, y, o)) {
					game.placeShip(requestingPlayer, s, x, y, o);
					sendMessage([socket], 'Ship placed successfully.', 0);
					if (game.allShipsPlaced(requestingPlayer)) {
						sendState([socket], GameState.READY);
					}
					update(socket);
				} else {
					sendMessage([socket], 'Ship cannot be placed there.  Please try again.', 0);
				}
			}
		});

		socket.on('requestPlaceAllShipsRandomly', function() {
			var game = getGameBySocketId(socket.id);
			if (game.state === GameState.SETUP) {
				var requestingPlayer = getPlayerBySocketId(socket.id);
				for (var i = 0, j = game.ships[requestingPlayer].length; i < j; i++) {
					var x, y, o;
					do {
						x = rnd10();
						y = rnd10();
						o = rnd2();
					} while (!game.testPlaceShip(requestingPlayer, i, x, y, o));
					game.placeShip(requestingPlayer, i, x, y, o);
				}
				sendState([socket], GameState.READY);
				update(socket);
			}
		});

		socket.on('placeDone', function() {
			var game = getGameBySocketId(socket.id);
			if (game.state === GameState.SETUP) {
				var requestingPlayer = getPlayerBySocketId(socket.id);
				var otherPlayer = game.otherPlayer(requestingPlayer);
				var requestingPlayerSocket = socket;
				var otherPlayerSocket = getSocketByPlayerId(game, otherPlayer);
				sendState([socket], GameState.READY);
				game.playersReady[requestingPlayer] = true;
				if (game.playersReady[0] && game.playersReady[1]) {
					playGame(getAllGameSocketIds(game));
				} else {
					sendMessage([requestingPlayerSocket], 'Waiting for other player to place ships.', 0);
					sendMessage([otherPlayerSocket], 'Other player is done placing ships.', 0);
				}
			}
		});

		socket.on('requestRestart', function() {
			var game = getGameBySocketId(socket.id);
			var requestingPlayer = getPlayerBySocketId(socket.id);
			var otherPlayer = game.otherPlayer(requestingPlayer);
			var requestingPlayerSocket = socket;
			var otherPlayerSocket = getSocketByPlayerId(game, otherPlayer);
			game.playersRestart[requestingPlayer] = true;
			if (game.state === GameState.PLAY) {
				sendMessage([requestingPlayerSocket], 'You have forfeited the game.  Touch Request Restart to start a new game.', 0);
				sendMessage([otherPlayerSocket], 'Other player has forfeited the game.  Touch Request Restart to start a new game.', 0);
				game.playersRestart[0] = false;
				game.playersRestart[1] = false;
				game.state = GameState.OVER;
				sendState(getAllGameSocketIds(game), game.state);
			} else if (game.state === GameState.OVER) {
				if (game.playersRestart[0] && game.playersRestart[1]) {
					startGame(getAllGameSocketIds(game));
				} else {
					sendMessage([requestingPlayerSocket], 'You are requesting to restart.', 0);
					sendMessage([otherPlayerSocket], 'Other player is requesting to restart.  Touch Restart Game to accept.', 0);
				}
			}
		});

		socket.on('requestShoot', function(data) {
			var game = getGameBySocketId(socket.id);
			var requestingPlayer = getPlayerBySocketId(socket.id);
			var otherPlayer = game.otherPlayer(requestingPlayer);
			var requestingPlayerSocket = socket;
			var otherPlayerSocket = getSocketByPlayerId(game, otherPlayer);
			var requestingPlayerMessage = '';
			var otherPlayerMessage = '';
			if (game.state === GameState.PLAY) {
				var x = data[0];
				var y = data[1];
				if (game.turn === requestingPlayer) {
					if (game.validShot(otherPlayer, x, y) === true) {
						requestingPlayerMessage = 'You shot at ' + number_to_letter(y) + '-' + (x+1).toString() + ' and ';
						otherPlayerMessage = 'Other player shot at ' + number_to_letter(y) + '-' + (x+1).toString() + ' and ';
						var shotResult = game.shoot(otherPlayer, x, y);
						update(socket);
						requestingPlayerMessage += shotResult + '<br>Other Player\'s turn.  Wait please.';
						otherPlayerMessage += shotResult + '<br>Your turn.  Call your shot.';
						sendMessage([requestingPlayerSocket], requestingPlayerMessage, 0);
						sendMessage([otherPlayerSocket], otherPlayerMessage, 0);
						if (game.allSunk(otherPlayer) === true) {
							game.state = GameState.OVER;
							sendState(getAllGameSocketIds(game), game.state);
							sendMessage(getAllGameSocketIds(game), 'All ships sunk.  Player ' + (requestingPlayer + 1).toString() + ' wins!<br>Touch Restart Game to play again.', 0);
						} else {
							game.cycleTurn();
						}
					} else {
						sendMessage([socket], 'That square is already a miss.  Shoot again please.', 0);
					}
				} else {
					sendMessage([socket], 'It is not your turn.  Wait please.', 0);
				}
			} else {
				sendMessage([socket], 'The game is not in play.', 0);
			}
		});
	}

	function handleClientDisconnecting(socket) {
		console.log('handleClientDisconnecting');
		socket.on('disconnect', function() {
			var oldGame, oldGameId, newGame, newGameId;
			var leavingPlayer, leavingPlayerId;
			var abandonedPlayer, abandonedPlayerId;
			var reassigned = false;
			oldGame = getGameBySocketId(socket.id);
			oldGameId = games.indexOf(oldGame);
			leavingPlayer = socket.id;
			leavingPlayerId = oldGame.players.indexOf(leavingPlayer);
			// snip the player out of its existing game
			if (leavingPlayerId !== -1) {
				console.log('removing player ' + leavingPlayerId + ' from game ' + oldGameId);
				oldGame.players.splice(leavingPlayerId, 1);
			}
			// check if that was the last player in the game
			if (oldGame.players.length === 0) {
				// if so, delete the game entirely
				console.log('removing game ' + j);
				games.splice(oldGameId, 1);
			} else {
				// if not, we need to deal with the abandoned player
				abandonedPlayer = oldGame.players[0];
				abandonedPlayerId = 0;
				// let's go through the games looking for a game with only 1 player
				for (var i = 0, j = games.length; i < j; i++) {
					newGame = games[i];
					// check to make sure the game isn't the one the player is already in
					if (newGame != oldGame) {
						// does the game only have 1 player?
						if (newGame.players.length === 1) {
							// reassign abandoned player and start the new game for both
							newGame.players.push(abandonedPlayer);
							console.log('2 players now connected to game ' + newGameId);
							reassigned = true;
							startGame(getAllGameSocketIds(newGame));
							// nuke the old game
							games.splice(oldGameId, 1);
							break;
						}
					}
				}
			}
			// was abandoned player able to be reassigned?
			if (reassigned === false) {
				// if not, we just have them wait for a new player again
				console.log('Abandoned player could not be paired up');
				oldGame.state = GameState.WAITING;
				sendState(getAllGameSocketIds(oldGame), oldGame.state);
 			}
			console.log(socket.id + ' disconnected');
		});
	}

	function sendState(sockets, state) {
		for (var i = 0, il = sockets.length; i < il; i++) {
			console.log('sending state: ' + state + ' to socket: ' + sockets[i].id);
			sockets[i].emit('gstate', {
				"gstate": state
			});
		}
	}

	function divColor(sockets, div, color) {
		for (var i = 0, il = sockets.length; i < il; i++) {
			sockets[i].emit('color', {
				"div": div,
				"color": color
			});
		}
	}

	function update(socket) {
		var game = getGameBySocketId(socket.id);
		var player1 = getSocketByPlayerId(game, 0);
		player1.emit('update', {
			"ships": game.ships[0],
			"ocean": game.grids[0],
			"target": game.grids[1]
		});
		var player2 = getSocketByPlayerId(game, 1);
		player2.emit('update', {
			"ships": game.ships[1],
			"ocean": game.grids[1],
			"target": game.grids[0]
		});
	}

	function sendMessage(sockets, message, duration) {
		for (var i = 0, il = sockets.length; i < il; i++) {
			sockets[i].emit('message', {
				"message": message,
				"duration": duration
			});
		}
	}

	function getAllSockets() {
		var sockets = [];
		for (var i in io.sockets.connected) {
			if (io.sockets.connected.hasOwnProperty(i)) {
				sockets.push(io.sockets.connected[i]);
			}
		}
		return sockets;
	}

	function getPlayerBySocketId(sid) {
		var game = getGameBySocketId(sid);
		for (var i = 0, j = game.players.length; i < j; i++) {
			if (game.players[i] === sid) {
				return i;
			}
		}
		return undefined;
	}

	function getSocketByPlayerId(game, pid) {
		var sid = game.players[pid];
		return io.sockets.connected[sid];
	}

	function getAllGameSocketIds(game) {
		var activePlayerSockets = [];
		for (var i = 0, j = game.players.length; i < j; i++) {
			var sid = game.players[i];
			var socket = io.sockets.connected[sid];
			activePlayerSockets.push(socket);
		}
		return activePlayerSockets;
	}

	return listen;
});
