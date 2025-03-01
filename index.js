// The main script for the extension
// Import necessary functions from SillyTavern's extensions.js and script.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Keep track of where your extension is located, name should match repo name
const extensionName = "apirotay"; // Change this to match your extension's name
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const settings = extension_settings[extensionName] || {};

// Default Settings
if (!settings.apiKeys) settings.apiKeys = [];
if (settings.currentKeyIndex === undefined) settings.currentKeyIndex = 0;
if (settings.enabled === undefined) settings.enabled = true;

// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  // Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], {
      apiKeys: [],
      currentKeyIndex: 0,
      enabled: true,
    });
  }

  // Updating settings in the UI
  $("#apirotay_enabled").prop("checked", settings.enabled).trigger("input");
  updateDropdown();
}

// Updates the API key dropdown
function updateDropdown() {
  const dropdown = $("#apirotay_dropdown");
  dropdown.empty();

  settings.apiKeys.forEach((key, index) => {
    const selected = index === settings.currentKeyIndex ? "selected" : "";
    dropdown.append(`<option value="${index}" ${selected}>API Key ${index + 1}</option>`);
  });

  saveSettingsDebounced();
}

// Selects an API key from the dropdown
function selectAPIKey(event) {
  settings.currentKeyIndex = parseInt($(event.target).val(), 10);
  saveSettingsDebounced();
  connectToAPIKey(settings.apiKeys[settings.currentKeyIndex]);
}

// Adds a new API key
function addAPIKey() {
  const newKey = $("#apirotay_input").val().trim();
  if (newKey) {
    settings.apiKeys.push(newKey);
    $("#apirotay_input").val("");
    updateDropdown();
  }
}

// Removes the selected API key
function removeAPIKey() {
  if (settings.apiKeys.length === 0) return;

  settings.apiKeys.splice(settings.currentKeyIndex, 1);
  settings.currentKeyIndex = Math.max(0, settings.currentKeyIndex - 1);
  updateDropdown();
}

// Automatically rotates to the next API key
function rotateAPIKey() {
  if (!settings.enabled || settings.apiKeys.length === 0) return;

  settings.currentKeyIndex = (settings.currentKeyIndex + 1) % settings.apiKeys.length;
  updateDropdown();
  connectToAPIKey(settings.apiKeys[settings.currentKeyIndex]);
}

// Connects to the selected API key in SillyTavern
function connectToAPIKey(apiKey) {
  console.log(`🔄 Connecting to API Key: ${apiKey}`);

  fetch("/api/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: apiKey }),
  })
    .then((response) => {
      if (response.ok) {
        console.log(`✅ Connected to API key: ${apiKey}`);
      } else {
        console.error(`❌ Failed to connect to API key: ${apiKey}`);
      }
    });
}

// Hooks into SillyTavern's message sending
function hookIntoMessageSending() {
  if (!window.sentMessage) {
    console.error("⚠️ Could not find SillyTavern's sentMessage function.");
    return;
  }

  const originalSendMessage = window.sentMessage;
  window.sentMessage = async function (...args) {
    if (settings.enabled) {
      rotateAPIKey();
    }
    return originalSendMessage.apply(this, args);
  };
}

// This function is called when the extension is loaded
jQuery(async () => {
  // Load the HTML for the extension settings
  const settingsHtml = await $.get(`${extensionFolderPath}/apirotay.html`);

  // Append settingsHtml to extensions_settings
  $("#extensions_settings").append(settingsHtml);

  // Set up event listeners
  $("#apirotay_enabled").on("change", toggleRotation);
  $("#apirotay_dropdown").on("change", selectAPIKey);
  $("#apirotay_add").on("click", addAPIKey);
  $("#apirotay_remove").on("click", removeAPIKey);

  // Load settings when starting things up
  loadSettings();

  // Hook into SillyTavern's message sending
  hookIntoMessageSending();
});
