function timeDiff(diff) {
	let msec = diff;
	let dd = Math.floor(msec / 1000 / 60 / 60 / 24);
	msec -= dd * 1000 * 60 * 60 * 24;
	let hh = Math.floor(msec / 1000 / 60 / 60);
	msec -= hh * 1000 * 60 * 60;
	let mm = Math.floor(msec / 1000 / 60);
	msec -= mm * 1000 * 60;
	let ss = Math.floor(msec / 1000);
	msec -= ss * 1000;
	return {dd, hh, mm};
}

function timeFmt(diff) {
	if (diff.dd === 0 && diff.hh === 0) {
		return `${diff.mm} mins`;
	} else if (diff.dd === 0) {
		return `${diff.hh} hrs`;
	} else {
		return `${diff.dd} days`;
	}
}

exports.timeDiff = timeDiff
exports.timeFmt = timeFmt
