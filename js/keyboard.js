const keysDown = new Map();

window.addEventListener("keydown", (e) => {
	if (e.repeat) return;
	// console.log(e.key);
	keysDown.set(e.key, true);
});

window.addEventListener("keyup", (e) => {
	keysDown.set(e.key, false);
});

export {
	keysDown
};
