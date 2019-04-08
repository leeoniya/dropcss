"use strict";

// adapted from https://github.com/fb55/nth-check/blob/master/compile.js

// https://css-tricks.com/how-nth-child-works/
// https://css-tricks.com/useful-nth-child-recipies/
// https://css-tricks.com/examples/nth-child-tester/
// http://nthmaster.com/

/* leon's incomplete attempt
function nthChild(el, a, b) {
	if (a < 0) {
		console.log("Unimplemented: -A in :nth-child(An+B)", m);
		return true;
	}

	let p = el.idx + 1;

	let diff = p - b;

	return diff >= 0 && diff % a == 0;
}
*/


/*
	tests if an element's pos (index+1) matches the given rule
	highly optimized to return the fastest solution
*/
function nth(a, b, pos) {
	//when b <= 0, a*n won't be possible for any matches when a < 0
	//besides, the specification says that no element is matched when a and b are 0
	if (b < 0 && a <= 0)
        return false;

	//when a is in the range -1..1, it matches any element (so only b is checked)
	if (a === -1)
		return pos <= b;
	if (a === 0)
		return pos === b;
	//when b <= 0 and a === 1, they match any element
	if (a === 1)
		return b < 0 || pos >= b;

	//when a > 0, modulo can be used to check if there is a match
	let bMod = b % a;

	if (bMod < 0)
        bMod += a;

	if (a > 1)
        return pos >= b && pos % a === bMod;

	a *= -1; //make `a` positive

	return pos <= b && pos % a === bMod;
}

exports.nth = nth;