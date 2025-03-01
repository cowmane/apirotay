import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "apirotay";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
    enabled: true,
    apiKeys: []
};

// Loads the extension settings
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};

    // Set defaults if settings don't exist
    if (!("enabled" in extension_settings[extensionName])) {
        extension_settings[extensionName].enabled = defaultSettings.enabled;
    }
    if (!("apiKeys" in extension_settings[extensionName])) {
        extension_settings[extensionName].apiKeys = defaultSettings.apiKeys;
    }

    // Update settings in SillyTavern UI
    $("#apirotay_enabled").prop("checked", extension_settings[extensionName].enabled);
    $("#apirotay_keys").val(extension_settings[extensionName].apiKeys.join("\n"));
}

// Saves API keys from the settings panel
function saveAPIKeys() {
    const keys = $("#apirotay_keys").val().split("\n").map(k => k.trim()).filter(k => k);
    extension_settings[extensionName].apiKeys = keys;
    saveSettingsDebounced();
}

// Toggles API rotation on/off
function toggleRotation(event) {
    const isEnabled = $(event.target).prop("checked");
    extension_settings[extensionName].enabled = isEnabled;
    saveSettingsDebounced();
}

// Rotates API key after each message
function hookIntoMessageSending() {
    if (!window.sentMessage) {
        console.error("⚠️ Could not find SillyTavern's sentMessage function.");
        return;
    }

    const originalSendMessage = window.sentMessage;
    window.sentMessage = async function (...args) {
        if (extension_settings[extensionName].enabled && extension_settings[extensionName].apiKeys.length > 0) {
            console.log("📩 Message sent! Rotating API key...");
            rotateAPIKey();
        }
        return originalSendMessage.apply(this, args);
    };
}

// Switches to the next API key
function rotateAPIKey() {
    const keys = extension_settings[extensionName].apiKeys;
    if (keys.length === 0) return;

    let currentIndex = localStorage.getItem("apirotay_index") || 0;
    currentIndex = (parseInt(currentIndex) + 1) % keys.length;
    localStorage.setItem("apirotay_index", currentIndex);

    const newKey = keys[currentIndex];
    console.log(`🔄 Switched API Key: ${newKey}`);

    fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey })
    }).then(response => {
        if (response.ok) {
            console.log(`✅ Connected to new API key: ${newKey}`);
        } else {
            console.error(`❌ Failed to connect API key: ${newKey}`);
        }
    });
}

// Append the settings panel in SillyTavern
jQuery(async () => {
    const settingsHtml = `
        <div class="extension-category">
            <h4>API Key Rotator</h4>
            <div class="extension-toggle">
                <input type="checkbox" id="apirotay_enabled">
                <label for="apirotay_enabled">Enable API Key Rotation</label>
            </div>
            <label>API Keys (one per line):</label>
            <textarea id="apirotay_keys" rows="5" style="width: 100%;"></textarea>
            <button id="apirotay_save">Save</button>
        </div>
    `;

    $("#extensions_settings").append(settingsHtml);

    // Load saved settings
    await loadSettings();

    // Add event listeners
    $("#apirotay_enabled").on("change", toggleRotation);
    $("#apirotay_save").on("click", saveAPIKeys);

    // Hook into message sending
    hookIntoMessageSending();
});
