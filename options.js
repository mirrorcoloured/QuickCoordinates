let input_apikey = document.querySelector("#apikey");
let output_keymsg = document.querySelector("#keymsg");

// Pull data from storage
window.onload = function () {
    chrome.extension.sendMessage({ cmd: "get_APIKey", }, function (response) {
        input_apikey.value = response;
    });
}

// Listen for changes
input_apikey.addEventListener("input", function (e) {
    if (input_apikey.value.length == 39) {
        output_keymsg.innerHTML = "";
        chrome.extension.sendMessage({
            cmd: "set_APIKey",
            data: {
                value: input_apikey.value
            },
        });
    } else {
        output_keymsg.innerHTML = "Please enter a valid google API key.";
        if (input_apikey.value.length == 0) {
            chrome.extension.sendMessage({
                cmd: "set_APIKey",
                data: {
                    value: ""
                },
            });
        }
    }
})