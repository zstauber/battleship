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

define.amd.jQuery = true;

require.config({
    baseUrl: 'js/lib',
    packages: [
			//{name: 'domReady', location: 'https://cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1', main: 'domReady.min'},
			{name: 'domReady', location: '.', main: 'domReady.min.js'},
			//{name: 'jquery', location: 'https://code.jquery.com', main: 'jquery-3.1.1.min'},
			{name: 'jquery', location: '.', main: 'jquery-3.1.1.min.js'},
			{name: 'socketio', location: '/socket.io', main: 'socket.io'}, // slash is pathname starting at server name (e.g. turner.stauber.org:3000)
			{name: 'ship', location: 'ship'},
			{name: 'GameState', location: '.', main: 'GameState'}
    ]
});

define(
	// dependencies
	[
		'domReady',
		'jquery',
		'socketio',
		'ship/ShipType',
		'ship/ShipOrientation',
		'ship/Carrier',
		'ship/Battleship',
		'ship/Cruiser',
		'ship/Submarine',
		'ship/Destroyer',
		'GameState'
	],
	// call back
	function(
		domReady,
		$,
		//jquerymobile,
		io,
		ShipType,
		ShipOrientation,
		Carrier,
		Battleship,
		Cruiser,
		Submarine,
		Destroyer,
		GameState
	) {
		var socket;
		var communications;

		var gstate = null;

		// gameplay objects
		var ships;
		var ocean;
		var target;

		// DOM elements
		var divGame, divStart, divPlay, divOcean, divTarget, divStatus;
		var tableOcean, tHeadOcean, tBodyOcean;
		var tableTarget, tHeadTarget, tBodyTarget;
		var fieldsetShipOrientation, fieldsetShipType;
		var radioOrientVertical, radioOrientHorizontal;
		var radioPlaceCarrier, radioPlaceBattleship, radioPlaceCruiser, radioPlaceSubmarine, radioPlaceDestroyer;
		var buttonPlaceAll, buttonPlaceDone, buttonRestartGame;
		var forfeit;

		var LocationType = Object.freeze({
			"unknown": 0,
			"miss": 1,
			"hit": 2
		});

		domReady(function() {
			// we don't connect until assets are loaded, because connecting
			// will precipitate a setup and an update coming back from the
			// server. which will try to load assets as needed
			initializeGame();
		});

		function initializeGame() {
			// create handles to all our HTML elements
			if (divGame === undefined) {
				divGame = document.getElementById('divGame');
			}
			if (divStart === undefined) {
				divStart = document.getElementById('divStart');
			}
			if (divPlay === undefined) {
				divPlay = document.getElementById('divPlay');
			}
			if (divTarget === undefined) {
				divTarget = document.getElementById('divTarget');
			}
			if (tableTarget === undefined) {
				tableTarget = document.getElementById('tableTarget');
			}
			if (tHeadTarget === undefined) {
				tHeadTarget = document.getElementById('tHeadTarget');
			}
			if (tBodyTarget === undefined) {
				tBodyTarget = document.getElementById('tBodyTarget');
			}
			if (divOcean === undefined) {
				divOcean = document.getElementById('divOcean');
			}
			if (tableOcean === undefined) {
				tableOcean = document.getElementById('tableOcean');
			}
			if (tHeadOcean === undefined) {
				tHeadOcean = document.getElementById('tHeadOcean');
			}
			if (tBodyOcean === undefined) {
				tBodyOcean = document.getElementById('tBodyOcean');
			}
			if (divStatus === undefined) {
				divStatus = document.getElementById('divStatus');
			}
			if (fieldsetShipOrientation === undefined) {
				fieldsetShipOrientation = document.getElementById('fieldsetShipOrientation');
			}
			if (radioOrientVertical === undefined) {
				radioOrientVertical = document.getElementById('radioOrientVertical');
			}
			if (radioOrientHorizontal === undefined) {
				radioOrientHorizontal = document.getElementById('radioOrientHorizontal');
			}
			if (fieldsetShipType === undefined) {
				fieldsetShipType = document.getElementById('fieldsetShipType');
			}
			if (radioPlaceCarrier === undefined) {
				radioPlaceCarrier = document.getElementById('radioPlaceCarrier');
			}
			if (radioPlaceBattleship === undefined) {
				radioPlaceBattleship = document.getElementById('radioPlaceBattleship');
			}
			if (radioPlaceCruiser === undefined) {
				radioPlaceCruiser = document.getElementById('radioPlaceCruiser');
			}
			if (radioPlaceSubmarine === undefined) {
				radioPlaceSubmarine = document.getElementById('radioPlaceSubmarine');
			}
			if (radioPlaceDestroyer === undefined) {
				radioPlaceDestroyer = document.getElementById('radioPlaceDestroyer');
			}
			if (buttonPlaceAll === undefined) {
				buttonPlaceAll = document.getElementById('buttonPlaceAll');
			}
			if (buttonPlaceDone === undefined) {
				buttonPlaceDone = document.getElementById('buttonPlaceDone');
			}
			if (buttonRestartGame === undefined) {
				buttonRestartGame = document.getElementById('buttonRestartGame');
			}
			// create ocean and target grids
			createTargetGrid();
			createOceanGrid();

			setStateWaiting();
			gstate = GameState.WAITING;

			// connect up the new game button
			$(buttonPlaceAll).on('click', function(e) {
				requestPlaceAllShipsRandomly();
			});

			$(buttonPlaceDone).on('click', function(e) {
				placeDone();
			});

			$(buttonRestartGame).on('click', function(e) {
				requestRestartGame();
			});

			// since we have no assets yet, just connect
			communications = 0;
			socket = io.connect();

			// the following functions reference socket so they must go
			// after socket is set to something, not before
			handleReceiveState();
			handleReceiveUpdate();
			handleReceiveMessage();
			handleColorDiv();
		}

		function createTargetGrid() {
			var tr = $('<tr></tr>', {
				"class": "game"
			}).appendTo(tHeadTarget);
			$('<th></th>', {
				"class": "game blank"
			}).appendTo(tr);
			for (var i = 0; i < 10; i++) {
				$('<th></th>', {
					"id": "col_target_" + String(i),
					"class": "game"
				}).appendTo(tr).html(String(i + 1));
			}
			for (i = 0; i < 10; i++) {
				tr = $('<tr></tr>', {
					"class": "game"
				}).appendTo(tBodyTarget);
				$('<td></td>', {
					"id": "row_target_" + String(i),
					"class": "game"
				}).appendTo(tr).html(String.fromCharCode(65 + i));
				for (var j = 0; j < 10; j++) {
					$('<td></td>', {
						"id": "target_" + String(j) + String(i),
						"class": "game target",
						"click": function(e) {
							var x = parseInt(e.target.id.substr(7,1));
							var y = parseInt(e.target.id.substr(8,1));
							requestShoot([x, y]);
						}
					}).appendTo(tr);
				}
			}
		}

		function createOceanGrid() {
			var tr = $('<tr></tr>', {
				"class": "game"
			}).appendTo(tHeadOcean);
			$('<th></th>', {
				"class": "game blank"
			}).appendTo(tr);
			for (var i = 0; i < 10; i++) {
				$('<th></th>', {
					"id": "col_ocean_" + String(i),
					"class": "game"
				}).appendTo(tr).html(String(i + 1));
			}
			for (i = 0; i < 10; i++) {
				tr = $('<tr></tr>', {
					"class": "game"
				}).appendTo(tBodyOcean);
				$('<td></td>', {
					"id": "row_ocean_" + String(i),
					"class": "game"
				}).appendTo(tr).html(String.fromCharCode(65 + i));
				for (var j = 0; j < 10; j++) {
					$('<td></td>', {
						"id": "ocean_" + String(j) + String(i),
						"class": "game ocean",
						"click": function(e) {
							var x = parseInt(e.target.id.substr(6,1));
							var y = parseInt(e.target.id.substr(7,1));
							requestPlaceShip([x, y]);
						}
					}).appendTo(tr);
				}
			}
		}

		function emptyTargetGrid() {
			var x, y;
			for (x = 0; x < 10; x++) {
				for (y = 0; y < 10; y++) {
					var td = $('#target_' + x.toString() + y.toString());
					td.html('');
				}
			}
		}

		function emptyOceanGrid() {
			var x, y;
			for (x = 0; x < 10; x++) {
				for (y = 0; y < 10; y++) {
					var td = $('#ocean_' + x.toString() + y.toString());
					td.html('');
					td.removeClass('ship-bow-h ship-mid-h ship-stern-h ship-bow-v ship-mid-v ship-stern-v fade');
				}
			}
		}

		function emptyGrids() {
			emptyOceanGrid();
			emptyTargetGrid();
		}

		function handleReceiveState() {
			socket.on('gstate', function(data) {
				gstate = data.gstate;
				console.log('in state: ' + gstate);
				switch (gstate) {
					case GameState.WAITING:
						setStateWaiting();
						break;
					case GameState.SETUP:
						setStateSetup();
						break;
					case GameState.READY:
						setStateReady();
						break;
					case GameState.PLAY:
						setStatePlay();
						break;
					case GameState.OVER:
						setStateOver();
						break;
				}
			});
		}

		function handleReceiveUpdate() {
			socket.on('update', function(data) {
				communications++;
				ships = data.ships;
				ocean = data.ocean;
				target = data.target;
				render();
			});
		}

		function handleReceiveMessage() {
			socket.on('message', function(data) {
				var message = data.message;
				var duration = data.duration;
				divStatus.innerHTML = message;
				if (duration > 0) {
					setTimeout(function() {
						divStatus.innerHTML = '';
					}, duration);
				}
			});
		}

		function enableControls(controls) {
			for (var i = 0, j = controls.length; i < j; i++) {
				var control = document.getElementById(controls[i]);
				$(control).prop('disabled', false);
			}
		}

		function disableControls(controls) {
			for (var i = 0, j = controls.length; i < j; i++) {
				 var control = document.getElementById(controls[i]);
				$(control).prop('disabled', true);
			}
		}

		function handleColorDiv() {
			socket.on('color', function(data) {
				var div = document.getElementById(data.div);
				var color = data.color;
				$(div).css('background-color', color);
			});
		}

		function render() {
			var i, j, k, l, char, td, color, render;
			emptyTargetGrid();
			// render hits and misses on the target grid
			for (i = 0, j = target.length; i < j; i++) {
				var col = target[i];
				for (k = 0, l = col.length; k < l; k++) {
					render = false;
					if (target[i][k] === LocationType.miss) {
						char = 'O';
						color = '#fff';
						render = true;
					} else if (target[i][k] === LocationType.hit) {
						char = 'X';
						color = '#f00';
						render = true;
					}
					if (render === true) {
						td = $('#target_' + i.toString() + k.toString());
						td.css('color', color);
						td.html(char);
					}
				}
			}
			// blank out any existing ships
			emptyOceanGrid();
			// then we render our ships
			for (i = 0, j = ships.length; i < j; i++) {
				var ship = ships[i];
				if (ship.bow !== undefined) {
					for (k = 0, l = ship.hp; k < l; k++) {
						if (ship.orientation === ShipOrientation.horizontal) {
							td = $('#ocean_' + (ship.bow[0] + k).toString() + ship.bow[1].toString());
							if (k === 0) {
								td.addClass('ship-bow-h');
							} else if (k === l - 1) {
								td.addClass('ship-stern-h');
							} else {
								td.addClass('ship-mid-h');
							}
						} else if (ship.orientation === ShipOrientation.vertical) {
							td = $('#ocean_' + ship.bow[0].toString() + (ship.bow[1] + k).toString());
							if (k === 0) {
								td.addClass('ship-bow-v');
							} else if (k === l - 1) {
								td.addClass('ship-stern-v');
							} else {
								td.addClass('ship-mid-v');
							}
						}
					}
				}
			}
			// then we render hits on our ocean grid (misses fade)
			for (i = 0, j = ocean.length; i < j; i++) {
				col = ocean[i];
				for (k = 0, l = col.length; k < l; k++) {
					if (ocean[i][k] === LocationType.hit) {
						char = 'X';
						color = '#f00';
						td = $('#ocean_' + i.toString() + k.toString());
						td.css('color', color);
						td.html(char);
					} else if (ocean[i][k] === LocationType.miss) {
						char = 'O';
						color = '#fff';
						td = $('#ocean_' + i.toString() + k.toString());
						td.css('color', color);
						td.html(char);
						td.addClass('fade');
					}
				}
			}
		}

		function requestPlaceShip(location) {
			if (gstate === GameState.SETUP || gstate === GameState.READY) {
				socket.emit('requestPlaceShip', {
					"ship": $("#formShip input[type='radio']:checked").val(),
					"orientation": $("#formOrient input[type='radio']:checked").val(),
					"location": location
				});
			}
		}

		function requestPlaceAllShipsRandomly() {
			socket.emit('requestPlaceAllShipsRandomly');
		}

		function placeDone() {
			socket.emit('placeDone');
		}

		function requestRestartGame() {
			console.log('requesting restart');
			if (gstate === GameState.PLAY) {
				if (forfeit > 0) {
					socket.emit('requestRestart');
				} else {
					forfeit++;
					divStatus.innerHTML = 'You are offering to forfeit.  Touch Restart Game again to confirm.';
				}
			} else if (gstate === GameState.OVER) {
				socket.emit('requestRestart');
			}
		}

		function requestShoot(location) {
			if (gstate === GameState.PLAY) {
				socket.emit('requestShoot', location);
			}
		}

		function setStateWaiting() {
			// This is the state when only one player is connected
			disableControls([
				'fieldsetShipOrientation',
				'radioOrientVertical',
				'radioOrientHorizontal',
				'fieldsetShipType',
				'radioPlaceCarrier',
				'radioPlaceBattleship',
				'radioPlaceCruiser',
				'radioPlaceSubmarine',
				'radioPlaceDestroyer',
				'buttonPlaceAll',
				'buttonPlaceDone',
				'buttonRestartGame'
			]);
			$(divStatus).css('background-color', '#ddd');
			setTimeout(function() {
				divStatus.innerHTML = '1 player connected.  Waiting for 2 players.';
			}, 0);
		}

		function setStateSetup() {
			// This is the state when two players are connected, but still placing ships
			enableControls([
				'fieldsetShipOrientation',
				'radioOrientVertical',
				'radioOrientHorizontal',
				'fieldsetShipType',
				'radioPlaceCarrier',
				'radioPlaceBattleship',
				'radioPlaceCruiser',
				'radioPlaceSubmarine',
				'radioPlaceDestroyer',
				'buttonPlaceAll'
			]);
			disableControls([
				'buttonPlaceDone',
				'buttonRestartGame'
			]);
			divStatus.innerHTML = '2 players connected.  Place ships and click Done Placing.';
		}

		function setStateReady() {
			// This is the state when a player is done placing ships, but waiting for the other player to finish placing
			enableControls([
				'buttonPlaceDone'
			]);
		}

		function setStatePlay() {
			// This is the state when both players have pressed Done Placing, and the game is in play
			disableControls([
				'fieldsetShipOrientation',
				'radioOrientVertical',
				'radioOrientHorizontal',
				'fieldsetShipType',
				'radioPlaceCarrier',
				'radioPlaceBattleship',
				'radioPlaceCruiser',
				'radioPlaceSubmarine',
				'radioPlaceDestroyer',
				'buttonPlaceAll',
				'buttonPlaceDone'
			]);
			enableControls([
				'buttonRestartGame'
			]);
			forfeit = 0;
		}

		function setStateOver() {
			$(divStatus).css('background-color', '#ddd');
		}
	}
);
