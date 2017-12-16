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
	['ship/Ship', 'ship/ShipType'],
	function(Ship, ShipType) {
		return function() {
			function Carrier() {
				this.type = ShipType.carrier;
				this.name = 'carrier';
				this.hp = 5;
			}
			Carrier.prototype = new Ship();
			// These have been moved to the object properties, not the prototype, because when these are stringified
			// and sent over a socket.io connection, all prototype properties are nuked, but not own properties.
			//Carrier.prototype.type = ShipType.carrier;
			//Carrier.prototype.name = 'carrier';
			//Carrier.prototype.hp = 5;

			return new Carrier();
		}
	}
);
