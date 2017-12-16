/*******************************************************************************
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

define(
	['ship/ShipOrientation'],
	function(ShipOrientation) {
		// Returns all the locations occupied by the ship as an array of coordinates.
		return function() {
			function Ship() {
				this.sunk = false;
				this.bow; // this is an [x,y] pair array
				this.orientation;
			}
			// Warning, this will not work on ships transmitted via a socket.io because objects are stringified and lose
			// their methods, and prototype properties, they keep only their own properties, as in hasOwnProperty()
			Ship.prototype.getLocations = function() {
				return getLocations(this.bow, this.orientation, this.hp);
			};
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
			return new Ship();
		}
	}
);
