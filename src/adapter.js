// slightly tweaked version of https://github.com/nrkn/css-select-browser-adapter/blob/master/index.js

function isTag(elem){
	return elem.nodeType === 1;
}
function getChildren(elem){
	return elem.childNodes ? Array.prototype.slice.call(elem.childNodes, 0) : [];
}
function getParent(elem){
	return elem.parentNode;
}
function removeSubsets(nodes) {
	var idx = nodes.length, node, ancestor, replace;

	// Check if each node (or one of its ancestors) is already contained in the
	// array.
	while(--idx > -1) {
		node = ancestor = nodes[idx];

		// Temporarily remove the node under consideration
		nodes[idx] = null;
		replace = true;

		while(ancestor) {
			if(nodes.indexOf(ancestor) > -1) {
				replace = false;
				nodes.splice(idx, 1);
				break;
			}
			ancestor = getParent(ancestor)
		}

		// If the node has been found to be unique, re-insert it.
		if(replace) {
			nodes[idx] = node;
		}
	}

	return nodes;
}

var adapter = {
	isTag: isTag,
	existsOne: function(test, elems){
		return elems.some(function(elem){
			return isTag(elem) ?
				test(elem) || adapter.existsOne(test, getChildren(elem)) :
				false;
		});
	},
	getSiblings: function(elem){
		var parent = getParent(elem);
		return parent ? getChildren(parent) : [elem];
	},
	getChildren: getChildren,
	getParent: getParent,
	getAttributeValue: function(elem, name){
		if(elem.attributes && elem.attributes[name]){
			return elem.attributes[name].value;
		} else if (name === "class" && elem.classList) {
			return Array.from(elem.classList).join(" ");
		}
	},
	hasAttrib: function(elem, name){
		return elem.attributes && name in elem.attributes;
	},
	removeSubsets: removeSubsets,
	getName: function(elem){
		if (elem.tagName == null)
			return null;

		return elem.tagName.toLowerCase();
	},
	findOne: function findOne(test, arr){
		var elem = null;

		for(var i = 0, l = arr.length; i < l && !elem; i++){
			if(test(arr[i])){
				elem = arr[i];
			} else {
				var childs = getChildren(arr[i]);
				if(childs && childs.length > 0){
					elem = findOne(test, childs);
				}
			}
		}

		return elem;
	},
	findAll: function findAll(test, elems){
		var result = [];
		for(var i = 0, j = elems.length; i < j; i++){
			if(!isTag(elems[i])) continue;
			if(test(elems[i])) result.push(elems[i]);
			var childs = getChildren(elems[i]);
			if(childs) result = result.concat(findAll(test, childs));
		}
		return result;
	},
	getText: function getText(elem) {
		if(Array.isArray(elem)) return elem.map(getText).join("");

		if(isTag(elem)) return getText(getChildren(elem));

		if(elem.nodeType === 3) return elem.nodeValue;

		return "";
	}
};

module.exports = adapter;
