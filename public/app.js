// ==========================================================================
// GENAI CHATBOT FRONTEND LOGIC (JS)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const chatForm = document.getElementById("chat-form");
    const chatTextarea = document.getElementById("chat-textarea");
    const chatHistory = document.getElementById("chat-history");
    const welcomeContainer = document.getElementById("welcome-container");
    const typingIndicator = document.getElementById("typing-indicator");
    const clearChatBtn = document.getElementById("clear-chat-btn");
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
    const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
    const chatStatusText = document.getElementById("chat-status-text");

    // Chat History State
    let conversation = [];

    // Retrieve or generate unique thread ID for backend conversation cache
    let threadId = localStorage.getItem("chat_thread_id");
    if (!threadId) {
        threadId = "thread_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("chat_thread_id", threadId);
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem("theme") || "dark-theme";
    document.body.className = savedTheme;

    // Load Chat History from LocalStorage
    const savedChat = localStorage.getItem("chat_history");
    if (savedChat) {
        try {
            conversation = JSON.parse(savedChat);
            if (conversation.length > 0) {
                welcomeContainer.classList.add("hidden");
                conversation.forEach(msg => {
                    renderMessage(msg.role, msg.content, false);
                });
                scrollToBottom();
            }
        } catch (e) {
            console.error("Failed to parse saved chat history", e);
            localStorage.removeItem("chat_history");
        }
    }

    // Auto-resize Textarea as user types
    chatTextarea.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
    });

    // Theme Toggle Handler
    themeToggleBtn.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.className = "light-theme";
            localStorage.setItem("theme", "light-theme");
        } else {
            document.body.className = "dark-theme";
            localStorage.setItem("theme", "dark-theme");
        }
    });

    // Clear Chat Handler
    clearChatBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to clear the conversation history?")) {
            const oldThreadId = threadId;

            conversation = [];
            localStorage.removeItem("chat_history");

            // Regenerate thread ID to reset backend cache history
            threadId = "thread_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("chat_thread_id", threadId);

            // Remove all message rows, keep welcome box
            const messageRows = chatHistory.querySelectorAll(".message-row");
            messageRows.forEach(row => row.remove());
            welcomeContainer.classList.remove("hidden");
            chatStatusText.textContent = "Ready for your prompt";
            scrollToBottom();

            // Notify backend to clear server-side cache for this session
            try {
                await fetch("/api/chat/clear", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ threadId: oldThreadId })
                });
            } catch (err) {
                console.error("Failed to clear backend cache:", err);
            }
        }
    });

    // Sidebar Mobile Toggles
    sidebarToggleBtn.addEventListener("click", () => {
        sidebar.classList.add("show-sidebar");
    });

    sidebarCloseBtn.addEventListener("click", () => {
        sidebar.classList.remove("show-sidebar");
    });

    // Close sidebar on mobile clicking outside
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 900) {
            if (!sidebar.contains(e.target) && !sidebarToggleBtn.contains(e.target) && sidebar.classList.contains("show-sidebar")) {
                sidebar.classList.remove("show-sidebar");
            }
        }
    });

    // Chat Form Submit Handler
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = chatTextarea.value.trim();
        if (!message) return;

        // Clear textarea & reset height
        chatTextarea.value = "";
        chatTextarea.style.height = "auto";

        // Hide welcome on first message
        if (welcomeContainer) {
            welcomeContainer.classList.add("hidden");
        }

        // Render User Message
        renderMessage("user", message);
        conversation.push({ role: "user", content: message });
        saveHistory();
        scrollToBottom();

        // Show Typing Indicator
        showTyping(true);
        chatStatusText.textContent = "Thinking...";

        try {
            // Call local API endpoint
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: message, threadId: threadId })
            });

            const data = await response.json();

            showTyping(false);

            if (response.ok && data.response) {
                renderMessage("assistant", data.response);
                conversation.push({ role: "assistant", content: data.response });
                saveHistory();
                chatStatusText.textContent = "Ready for your prompt";
            } else {
                const errorMessage = data.error || "Failed to fetch response from server.";
                const errorCode = data.code || "unknown";
                renderErrorMessage(
                    errorCode === "request_too_large" ? "Token Limit Exceeded" : "Error Encountered",
                    errorMessage,
                    errorCode === "request_too_large"
                );
                chatStatusText.textContent = "Error occurred";
            }
        } catch (err) {
            console.error("API Fetch Error:", err);
            showTyping(false);
            renderMessage("assistant", "⚠️ **Connection Error:** Could not connect to the local server. Make sure the Node server is running.");
            chatStatusText.textContent = "Connection failed";
        }

        scrollToBottom();
    });

    // Scroll to bottom of chat
    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Toggle Typing Indicator visibility
    function showTyping(show) {
        if (show) {
            typingIndicator.classList.remove("hidden");
            // Move typing indicator to the bottom of the list
            chatHistory.appendChild(typingIndicator);
        } else {
            typingIndicator.classList.add("hidden");
        }
    }

    // Save history to localStorage
    function saveHistory() {
        localStorage.setItem("chat_history", JSON.stringify(conversation));
    }

    // Render message bubble to DOM
    function renderMessage(role, content, animate = true) {
        const messageRow = document.createElement("div");
        messageRow.classList.add("message-row", role);
        if (!animate) {
            messageRow.style.animation = "none";
        }

        const avatar = document.createElement("div");
        avatar.classList.add("avatar", `${role}-avatar`);
        avatar.innerHTML = role === "user" ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

        const bubble = document.createElement("div");
        bubble.classList.add("message-bubble", "glass-panel");
        bubble.innerHTML = formatMarkdown(content);

        messageRow.appendChild(avatar);
        messageRow.appendChild(bubble);

        // Insert before typing indicator if it is visible
        if (!typingIndicator.classList.contains("hidden")) {
            chatHistory.insertBefore(messageRow, typingIndicator);
        } else {
            chatHistory.appendChild(messageRow);
        }
    }

    // Render detailed error message with optional action button
    function renderErrorMessage(title, details, showClearButton = false) {
        const messageRow = document.createElement("div");
        messageRow.classList.add("message-row", "assistant");

        const avatar = document.createElement("div");
        avatar.classList.add("avatar", "assistant-avatar");
        avatar.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444"></i>';

        const bubble = document.createElement("div");
        bubble.classList.add("message-bubble", "glass-panel", "error-bubble");

        let html = `
            <div class="error-container">
                <div class="error-title"><i class="fa-solid fa-circle-exclamation"></i> ${title}</div>
                <div class="error-details">${details}</div>
        `;

        if (showClearButton) {
            html += `
                <button class="error-action-btn" onclick="document.getElementById('clear-chat-btn').click()">
                    <i class="fa-solid fa-trash-can"></i> Clear Conversation History
                </button>
            `;
        }

        html += `</div>`;
        bubble.innerHTML = html;

        messageRow.appendChild(avatar);
        messageRow.appendChild(bubble);

        // Insert before typing indicator if it is visible
        if (!typingIndicator.classList.contains("hidden")) {
            chatHistory.insertBefore(messageRow, typingIndicator);
        } else {
            chatHistory.appendChild(messageRow);
        }
    }

    // Simple Regex Markdown & HTML Formatting Parser
    function formatMarkdown(text) {
        if (!text) return "";

        // Escape HTML to prevent XSS
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 1. Fenced Code Blocks (```javascript ... ```)
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
        escaped = escaped.replace(codeBlockRegex, (match, lang, code) => {
            const language = lang || "plaintext";
            const uniqueId = "code-" + Math.random().toString(36).substring(2, 9);
            // Trim code to avoid unnecessary newlines
            const cleanCode = code.trim();
            return `
                <div class="code-block-wrapper">
                    <div class="code-header">
                        <span><i class="fa-solid fa-code"></i> ${language}</span>
                        <button class="copy-btn" onclick="copyToClipboard('${uniqueId}')" id="btn-${uniqueId}">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                    </div>
                    <pre><code id="${uniqueId}">${cleanCode}</code></pre>
                </div>
            `;
        });

        // 2. Inline Code Blocks (`const foo = 1`)
        escaped = escaped.replace(/`([^`\n]+)`/g, "<code>$1</code>");

        // 3. Bold Tags (**text**)
        escaped = escaped.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");

        // 4. Italic Tags (*text*)
        escaped = escaped.replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");

        // 5. Bullet points lists (* item) or (- item)
        // Match bullet lists starting at newlines
        escaped = escaped.replace(/(?:^|\n)[*\-]\s+(.+)/g, (match, p1) => {
            return `\n<li>${p1}</li>`;
        });

        // Wrap <li> runs in <ul>
        // This is a simple parser, we match sequences of <li> tags
        escaped = escaped.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => {
            return `<ul>${match}</ul>`;
        });

        // 6. Split double newlines into paragraph blocks
        const paragraphs = escaped.split(/\n\n+/);
        return paragraphs.map(p => {
            const trimmed = p.trim();
            if (!trimmed) return "";

            // If the block is already a structured layout (like pre-formatted block or list), return it directly
            if (trimmed.startsWith('<div class="code-block-wrapper"') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>')) {
                return trimmed;
            }
            return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
        }).join("");
    }

    // Global utility function mapping for suggest prompts
    window.fillPrompt = (text) => {
        chatTextarea.value = text;
        chatTextarea.focus();

        // Trigger textarea auto-resize
        chatTextarea.style.height = "auto";
        chatTextarea.style.height = (chatTextarea.scrollHeight) + "px";
    };

    // Global utility function for copying code to clipboard
    window.copyToClipboard = (id) => {
        const codeElement = document.getElementById(id);
        if (!codeElement) return;

        const textToCopy = codeElement.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const copyBtn = document.getElementById(`btn-${id}`);
            if (copyBtn) {
                copyBtn.innerHTML = `<i class="fa-solid fa-check" style="color: #10b981"></i> Copied!`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy`;
                }, 2000);
            }
        }).catch(err => {
            console.error("Clipboard write failed", err);
        });
    };
});
