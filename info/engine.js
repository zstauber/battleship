var stdin = process.stdin;

var LocationType = {
	unknown: 0,
	miss: 1,
	hit: 2
};

var ShipType = {
	carrier: 5,
	battleship: 4,
	cruiser: 3,
	submarine: 2,
	destroyer: 1
};

var ShipOrientation = {
	horizontal: 0,
	vertical: 1
};

var Turn = {
	player1: 0,
	player2: 1
};

// Returns all the locations occupied by the ship as an array of coordinates.
function getLocations(bow, orientation, hp) {
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
}

function Ship() {
	this.sunk = false;
	this.bow; // this is an [x,y] pair array
	this.orientation;
}
// Wrapper to run getLocations on current ship.
Ship.prototype.getLocations = function() {
	return getLocations(this.bow, this.orientation, this.hp);
};
function Carrier() {
}
Carrier.prototype = new Ship();
Carrier.prototype.type = ShipType.carrier;
Carrier.prototype.name = 'carrier';
Carrier.prototype.hp = 5;

function Battleship() {
}
Battleship.prototype = new Ship();
Battleship.prototype.type = ShipType.battleship;
Battleship.prototype.name = 'battleship';
Battleship.prototype.hp = 4;

function Cruiser() {
}
Cruiser.prototype = new Ship();
Cruiser.prototype.type = ShipType.cruiser;
Cruiser.prototype.name = 'cruiser';
Cruiser.prototype.hp = 3;

function Submarine() {
}
Submarine.prototype = new Ship();
Submarine.prototype.type = ShipType.submarine;
Submarine.prototype.name = 'submarine';
Submarine.prototype.hp = 3;

function Destroyer() {
}
Destroyer.prototype = new Ship();
Destroyer.prototype.type = ShipType.destroyer;
Destroyer.prototype.name = 'destroyer';
Destroyer.prototype.hp = 2;

function Game() {
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
			new Carrier(),
			new Battleship(),
			new Cruiser(),
			new Submarine(),
			new Destroyer()
		],
		[
			new Carrier(),
			new Battleship(),
			new Cruiser(),
			new Submarine(),
			new Destroyer()
		]
	];
	this.turn = Turn.player1;
	this.shotX;
	this.shotY;
	this.locX;
	this.locY;
	this.win = false;
	this.exit = false;
}
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
// Returns true if ship can be placed, checks if placed ship location would be
// inside grid
Game.prototype.inside = function(player, ship, x, y, orientation) {
	try {
		if (orientation === ShipOrientation.horizontal) {
			if (y >= 0 && y <= 9 && x >= 0 && x + this.ships[player][ship].hp <= 9) {
				return true;
			} else {
				return false;
			}
		} else if (orientation === ShipOrientation.vertical) {
			if (x >= 0 && x <= 9 && y >= 0 && y + this.ships[player][ship].hp <= 9) {
				return true;
			} else {
				return false;
			}
		} else {
			throw 'orientation parameter is not valid';
		}
	} catch(e) {
		console.log('Error: ' + e);
	}
};
// Returns true if ship can be placed, false if it intersects an existing ship.
Game.prototype.overlap = function(player, ship, x, y, orientation) {
	// Get locations of proposed ship to be placed
	var proposedLocations = getLocations([x, y], orientation, this.ships[player][ship].hp);
	// Loop through existing ships.
	for (var i = 0; i < 5; i++) {
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
// This prints out the grids as text, from the perspective of a given player.
// A player can only see their own ships, and doesn't need to see misses by
// the other player on their own grid.
Game.prototype.renderToConsole = function(player) {
	var otherPlayer = this.otherPlayer(player);
	var ocean = [
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈'],
		['≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈', '≈']
	];
	var target = [
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·'],
		['·', '·', '·', '·', '·', '·', '·', '·', '·', '·']
	];
	// Add in the ships for one player to the ocean grid
	for (var i = 0, j = this.ships[player].length; i < j; i++) {
		var ship = this.ships[player][i];
		for (var k = 0, l = ship.hp; k < l; k++) {
			var x, y;
			if (ship.orientation === ShipOrientation.horizontal) {
				x = ship.bow[0] + k;
				y = ship.bow[1];
			} else if (ship.orientation === ShipOrientation.vertical) {
				x = ship.bow[0];
				y = ship.bow[1] + k;
			}
			ocean[x][y] = ship.type.toString();
		}
	}
	// Add hits to ocean grid, hits and misses to target grid
	for (var i = 0, j = 10; i < j; i++) {
		for (var k = 0, l = 10; k < l; k++) {
			var location = this.grids[player][i][k];
			var otherLocation = this.grids[otherPlayer][i][k];
			if (location === LocationType.hit) {
				ocean[i][k] = 'X';
			}
			if (otherLocation === LocationType.miss) {
				target[i][k] = 'O';
			} else if (otherLocation === LocationType.hit) {
				target[i][k] = 'X';
			}
		}
	}
	// Header
	console.log('Player: ' + player);
	// Copy to strings that will be output
	console.log('Ocean Grid  Target Grid');
	console.log(' 1234567890  1234567890');
	var output = '';
	for (var i = 0, j = 10; i < j; i++ ) {
		output += String.fromCharCode(65 + i);
		for (var k = 0, l = 10; k < l; k++) {
			output += ocean[k][i];
		}
		output += ' ';
		output += String.fromCharCode(65 + i);
		for (var k = 0, l = 10; k < l; k++) {
			output += target[k][i];
		}
		output += '\n';
	}
	console.log(output);
};
function rnd2() {
	return Math.floor(Math.random() * 2);
}
function rnd10() {
	return Math.floor(Math.random() * 10);
}
Game.prototype.otherPlayer = function(player) {
	if (player === Turn.player1) {
		return Turn.player2;
	} else if (player === Turn.player2) {
		return Turn.player1;
	}
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
	var shipHit;
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
	if (ship !== undefined) {
		// if hit, set location to 2
		this.setLocation(targetPlayer, locX, locY, 2);
		console.log('Hit-' + ship.name);
		// check if ship is sunk (all locations are hits)
		if (this.sunk(targetPlayer, ship)) {
			ship.sunk = true;
			console.log(ship.name + ' sunk!');
		}
	} else {
		// if miss (shot is undefined), set tlocation to 1s
		this.setLocation(targetPlayer, locX, locY, 1);
		console.log('Miss');
	}
	// also if hit, check rest of that ship's Locations to see if sunk
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
var game = new Game();
//game.grids[0][9][4] = 1;
for (var i = 0, j = 2; i < j; i++) {
	for (var k = 0, l = game.ships[i].length; k < l; k++) {
		var x, y, o;
		do {
			x = rnd10();
			y = rnd10();
			o = rnd2();
		} while (!game.testPlaceShip(i, k, x, y, o));
		game.placeShip(i, k, x, y, o);
	}
}
game.renderToConsole(0);
game.renderToConsole(1);
/*
 * Game loop starts.  It alternates on each iteration between the two players.
 * stdin.resume() to get their move, and it makes sure the first character is
 * [A-Za-z] and the second character is [0-9] and then stdin.pause(), which is
 * all handled in the stdin.on, and that passes the result to a hit checker.
 * If it's a miss, that's announced, the grid location is changed to 1 and turn
 * changes to the other player.  If it's a hit, it's announced where, the grid
 * location is changed to a 2, a sink condition is checked, and if yes, a win
 * condition is checked, and if so, that's announced and the game ends.
 * Otherwise, turn changes to the other player.
 */
console.log('Player ' + game.turn + '\'s turn');
stdin.setRawMode(true);
stdin.setEncoding('utf8');
stdin.resume();
// Behold, the game loop!
stdin.on('data', function(key) {
	// ctrl-c (end of text)
	if (key === '\u0003') {
		game.exit = true;
		stdin.pause();
		process.exit();
	} else if (key >= '\u0041' && key <= '\u004A') {
		game.shotY = key;
		game.locY = key.charCodeAt(0) - 65;
		//process.stdout.write(key);
	} else if (key >= '\u0061' && key <= '\u006A') {
		game.shotY = key;
		game.locY = key.charCodeAt(0) - 97;
		//process.stdout.write(key);
	} else if (key >= '\u0030' && key <= '\u0039') {
		game.shotX = key;
		if (key === '\u0030') { // 0 is equivalent to 10 here
			game.locX = 9;
		} else {
			game.locX = key.charCodeAt(0) - 49;
		}
		//process.stdout.write(key);
	};
	if (game.shotX !== undefined && game.shotY !== undefined) {
		console.log('shot: ' + game.shotY + '-' + game.shotX);
		console.log('loc: ' + + game.locY + '-' + game.locX);
		if (game.validShot(game.otherPlayer(game.turn), game.locX, game.locY)) {
			game.shoot(game.otherPlayer(game.turn), game.locX, game.locY);
			// check win condition (allSunk);
			if (game.allSunk(game.otherPlayer(game.turn))) {
				console.log('All of player ' + game.otherPlayer(game.turn) + '\'s ships sunk.');
				console.log('Player ' + game.turn + ' wins!');
				process.exit();
			}
			game.resetShot();
			game.next();
		} else {
			game.resetShot();
			console.log('Grid location already shot.  Please shoot again.');
		}
		game.renderToConsole(0);
		game.renderToConsole(1);
		console.log('Player ' + game.turn + '\'s turn');
	}
});
