const keysDown = new Map();

window.addEventListener("keydown", (e) => {
	if (e.repeat) return;

	keysDown.set(e.key, true);
});

window.addEventListener("keyup", (e) => {
	keysDown.set(e.key, false);
});

export {
	keysDown
};
