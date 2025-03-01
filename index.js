(() => {
    const storageKey = "apiKeys";
    let apiKeys = JSON.parse(localStorage.getItem(storageKey)) || [];
    let currentIndex = 0;

    // Load UI when SillyTavern starts
    window.addEventListener("load", async () => {
        await loadUI();
        hookIntoMessageSending();
    });

    // Injects the settings UI
    async function loadUI() {
        const settingsHtml = await $.get(`scripts/extensions/third-party/apirotay/apirotay.html`);
        $("#extensions_settings").append(settingsHtml);
        
        // Add event listeners
        $("#apirotay_toggle").on("change", toggleAutoRotation);
        $("#addKeyBtn").on("click", addKey);
        updateKeyList();
    }

    function toggleAutoRotation(event) {
        const enabled = $(event.target).prop("checked");
        localStorage.setItem("apirotay_enabled", JSON.stringify(enabled));
    }

    function updateKeyList() {
        const listContainer = $("#apiKeyList");
        listContainer.empty();

        apiKeys.forEach((key, index) => {
            const isActive = index === currentIndex ? "🟣" : "⚫️";
            const keyItem = $(`
                <div class="api-key-item">
                    <span class="status">${isActive}</span>
                    <span class="key-box">${key}</span>
                    <button onclick="removeKey(${index})">X</button>
                </div>
            `);
            listContainer.append(keyItem);
        });

        localStorage.setItem(storageKey, JSON.stringify(apiKeys));
    }

    function addKey() {
        const newKey = $("#newKey").val().trim();
        if (newKey) {
            apiKeys.push(newKey);
            $("#newKey").val("");
            updateKeyList();
        }
    }

    window.removeKey = (index) => {
        apiKeys.splice(index, 1);
        if (currentIndex >= apiKeys.length) {
            currentIndex = 0;
        }
        updateKeyList();
    };

    function getNextApiKey() {
        if (apiKeys.length === 0) return null;
        currentIndex = (currentIndex + 1) % apiKeys.length;
        updateKeyList();
        return apiKeys[currentIndex];
    }

    function hookIntoMessageSending() {
        if (!window.sentMessage) {
            console.error("⚠️ Could not find SillyTavern's sentMessage function.");
            return;
        }

        const originalSendMessage = window.sentMessage;
        window.sentMessage = async function (...args) {
            console.log("📩 Message sent! Rotating API key...");
            const newKey = getNextApiKey();
            autoConnectNewKey(newKey);
            return originalSendMessage.apply(this, args);
        };
    }

    function autoConnectNewKey(apiKey) {
        console.log(`🔌 Auto-connecting with key: ${apiKey}`);

        fetch("/api/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey })
        }).then(response => {
            if (response.ok) {
                console.log(`✅ Connected to new API key: ${apiKey}`);
            } else {
                console.error(`❌ Failed to connect API key: ${apiKey}`);
            }
        });
    }
})();
