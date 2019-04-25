function parseErr(srcType, srcStr, pos) {
	throw new Error(srcType + ' parser stopped here: "' + srcStr.substring(pos, pos + 100) + '"');
}

exports.parseErr = parseErr;