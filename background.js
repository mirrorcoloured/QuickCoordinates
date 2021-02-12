// Default parameters
let params = {
	lastCenter: null,
	lastMarker: null,
	lastZoom: 8,
	APIKey: "",
}

// Load parameters from storage asynchronously
// chrome.storage.sync.get(console.log)
chrome.storage.sync.get(function (response) {
	console.log("Got storage:", response);
	for (let key of Object.keys(params)) {
		console.log("Checking for parameter", key);
		if (response[key]) {
			params[key] = response[key];
			console.log("Set parameter", key, "to", params[key]);
		}
	}
})

// Respond to messages from frontend
chrome.extension.onMessage.addListener(
	function (request, sender, sendResponse) {

		console.log('Got request', request);

		if (request.cmd.includes("_")) {
			const [action, variable] = request.cmd.split("_");
			if (action == "set") {
				console.log("Setting", variable, "to:", request.data.value);
				params[variable] = request.data.value;
				chrome.storage.sync.set({ [variable]: params[variable] });
			} else if (action == "get") {
				if (variable in params) {
					console.log("Returning value:", params[variable]);
					sendResponse(params[variable]);
				} else {
					console.log("Unknown variable", variable);
					sendResponse(null);
				}
			}
		} else if (request.cmd = "getparams") {
			console.log("Sending parameters", params);
			sendResponse(params);
		} else {
			console.log('Unknown request: ', request.cmd);
		}

	}
);