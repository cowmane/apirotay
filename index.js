(() => {
    const storageKey = "apiKeys";
    let apiKeys = JSON.parse(localStorage.getItem(storageKey)) || [];
    let currentIndex = 0;

    window.addEventListener("load", () => {
        createUI();
        hookIntoMessageSending();
    });

    function createUI() {
        const container = document.createElement("div");
        container.id = "apiRotatorUI";
        container.innerHTML = `
            <h2>API Key Rotator</h2>
            <div class="input-group">
                <input type="text" id="newKey" placeholder="Enter API key">
                <button id="addKeyBtn">Add</button>
            </div>
            <h3>API Keys</h3>
            <div id="apiKeyList"></div>
        `;

        document.body.appendChild(container);
        document.getElementById("addKeyBtn").addEventListener("click", addKey);
        updateKeyList();
    }

    function updateKeyList() {
        const listContainer = document.getElementById("apiKeyList");
        listContainer.innerHTML = "";

        apiKeys.forEach((key, index) => {
            const isActive = index === currentIndex ? "🟣" : "⚫️";
            const keyItem = document.createElement("div");
            keyItem.className = "api-key-item";
            keyItem.innerHTML = `
                <span class="status">${isActive}</span>
                <span class="key-box">${key}</span>
                <button onclick="removeKey(${index})">X</button>
            `;
            listContainer.appendChild(keyItem);
        });

        localStorage.setItem(storageKey, JSON.stringify(apiKeys));
    }

    function addKey() {
        const newKey = document.getElementById("newKey").value.trim();
        if (newKey) {
            apiKeys.push(newKey);
            document.getElementById("newKey").value = "";
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
