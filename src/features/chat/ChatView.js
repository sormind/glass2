import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ChatView extends LitElement {
    static properties = {
        messages: { type: Array },
        currentInput: { type: String },
        isLoading: { type: Boolean },
        currentSessionId: { type: String },
        sessions: { type: Array },
        showSidebar: { type: Boolean },
        isStreaming: { type: Boolean },
        streamingMessage: { type: String },
        recordingSessions: { type: Array },
        selectedTranscriptSession: { type: String },
        showTranscriptSelector: { type: Boolean },
        uploadedFiles: { type: Array },
        isDragging: { type: Boolean },
        backgroundOpacity: { type: Number },
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease-out;
            will-change: transform, opacity;
        }

        :host(.hiding) {
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        :host(.showing) {
            animation: slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        :host(.hidden) {
            opacity: 0;
            transform: translateY(-150%) scale(0.85);
            pointer-events: none;
        }

        @keyframes slideUp {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
            }
            30% {
                opacity: 0.7;
                transform: translateY(-20%) scale(0.98);
                filter: blur(0.5px);
            }
            70% {
                opacity: 0.3;
                transform: translateY(-80%) scale(0.92);
                filter: blur(1.5px);
            }
            100% {
                opacity: 0;
                transform: translateY(-150%) scale(0.85);
                filter: blur(2px);
            }
        }

        @keyframes slideDown {
            0% {
                opacity: 0;
                transform: translateY(-150%) scale(0.85);
                filter: blur(2px);
            }
            30% {
                opacity: 0.5;
                transform: translateY(-50%) scale(0.92);
                filter: blur(1px);
            }
            65% {
                opacity: 0.9;
                transform: translateY(-5%) scale(0.99);
                filter: blur(0.2px);
            }
            85% {
                opacity: 0.98;
                transform: translateY(2%) scale(1.005);
                filter: blur(0px);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
            }
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(0, 0, 0, var(--bg-opacity, 0.2));
            backdrop-filter: blur(20px);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            min-height: 400px;
            min-width: 600px;
            resize: both;
            max-width: 95vw;
            max-height: 90vh;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .main-content.sidebar-open {
            margin-left: 280px;
        }

        .chat-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            filter: blur(10px);
            z-index: -1;
        }

        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
            min-height: 60px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .chat-icon {
            width: 20px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .chat-icon svg {
            width: 12px;
            height: 12px;
            fill: rgba(255, 255, 255, 0.9);
        }

        .chat-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
        }

        .session-info {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
            margin-right: 8px;
        }

        .header-controls {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-shrink: 0;
        }

        .control-button {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 36px;
            height: 36px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }

        .control-button:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.4);
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message {
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }

        .message.user {
            flex-direction: row-reverse;
            align-self: flex-end;
        }

        .message-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 500;
            flex-shrink: 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .message.user .message-avatar {
            background: rgba(76, 175, 80, 0.3);
        }

        .message-content {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 12px;
            border-radius: 8px;
            line-height: 1.4;
            font-size: 13px;
            max-width: 400px;
            word-wrap: break-word;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .message.user .message-content {
            background: rgba(33, 150, 243, 0.2);
            border-color: rgba(33, 150, 243, 0.3);
        }

        .streaming-message {
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 12px;
            border-radius: 8px;
            line-height: 1.4;
            font-size: 13px;
            max-width: 400px;
            word-wrap: break-word;
            border: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0.8;
            position: relative;
        }

        .streaming-message::after {
            content: '▋';
            animation: blink 1s infinite;
            color: rgba(255, 255, 255, 0.7);
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        .input-container {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            position: relative;
            z-index: 10;
        }

        .input-row {
            display: flex;
            width: 100%;
        }

        .input-wrapper {
            display: flex;
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.2s ease;
        }

        .input-wrapper:focus-within {
            border-color: rgba(33, 150, 243, 0.5);
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
        }

        .input-actions {
            display: flex;
            align-items: flex-end;
            padding: 8px;
            gap: 4px;
        }

        .attach-btn {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 8px;
            border-radius: 6px;
            font-size: 16px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .attach-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }



        .uploaded-files {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }

        .uploaded-file {
            background: rgba(33, 150, 243, 0.2);
            border: 1px solid rgba(33, 150, 243, 0.4);
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .remove-file {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            font-size: 14px;
            padding: 0;
            margin-left: 4px;
        }

        .remove-file:hover {
            color: rgba(255, 100, 100, 0.9);
        }

        .drag-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(33, 150, 243, 0.1);
            border: 2px dashed rgba(33, 150, 243, 0.5);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 500;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }

        .message-input {
            flex: 1;
            background: transparent;
            border: none;
            padding: 12px 16px;
            color: white;
            font-family: inherit;
            font-size: 14px;
            resize: none;
            min-height: 20px;
            max-height: 200px;
            outline: none;
            line-height: 1.4;
        }

        .message-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        .send-btn {
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.6), rgba(33, 150, 243, 0.8));
            color: rgba(255, 255, 255, 0.95);
            border: none;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s ease;
            min-width: 36px;
            min-height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
        }

        .send-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.8), rgba(33, 150, 243, 1));
            box-shadow: 0 4px 16px rgba(33, 150, 243, 0.4);
            transform: scale(1.05);
        }

        .send-btn:disabled {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.5);
            cursor: not-allowed;
        }

        .loading {
            display: flex;
            align-items: center;
            gap: 6px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            padding: 8px 12px;
        }

        .loading-spinner {
            width: 12px;
            height: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
            padding: 40px 20px;
        }

        .empty-state h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
        }

        .empty-state p {
            margin: 0;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
            width: 6px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
        }

        ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Sidebar Styles */
        .sidebar {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10;
            display: flex;
            flex-direction: column;
        }

        .sidebar.open {
            transform: translateX(0);
        }

        .sidebar-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .sidebar-title {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
        }

        .sidebar-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .new-session-btn {
            background: rgba(33, 150, 243, 0.3);
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(33, 150, 243, 0.5);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .new-session-btn:hover {
            background: rgba(33, 150, 243, 0.4);
            border-color: rgba(33, 150, 243, 0.7);
        }

        .close-sidebar-btn {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
        }

        .close-sidebar-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
        }

        .floating-sidebar-toggle {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .floating-sidebar-toggle:hover {
            background: rgba(0, 0, 0, 0.9);
            border-color: rgba(255, 255, 255, 0.4);
        }

        .sessions-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .session-item {
            padding: 12px;
            margin-bottom: 4px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }

        .session-item:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .session-item.active {
            background: rgba(33, 150, 243, 0.2);
            border-color: rgba(33, 150, 243, 0.4);
        }

        .session-title {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .session-meta {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-top: 4px;
        }

        .session-date {
            color: rgba(255, 255, 255, 0.6);
            font-size: 11px;
        }

        .session-count {
            color: rgba(33, 150, 243, 0.8);
            font-size: 10px;
            font-weight: 500;
        }

        .session-duration {
            color: rgba(76, 175, 80, 0.8);
            font-size: 10px;
            font-weight: 500;
        }

        .empty-sessions {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            text-align: center;
            padding: 40px 20px;
        }

        .transcript-selector {
            position: absolute;
            bottom: 80px;
            left: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            max-height: 400px;
            overflow: hidden;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .transcript-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
        }

        .close-btn {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .close-btn:hover {
            color: rgba(255, 255, 255, 0.9);
        }

        .transcript-sessions {
            max-height: 200px;
            overflow-y: auto;
        }

        .transcript-session {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: background-color 0.2s;
        }

        .transcript-session:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .transcript-session.selected {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.3);
        }

        .session-info {
            flex: 1;
        }

        .session-meta {
            color: rgba(255, 255, 255, 0.6);
            font-size: 11px;
            margin-top: 2px;
        }

        .selected-indicator {
            color: #3b82f6;
            font-size: 16px;
            font-weight: bold;
        }

        .empty-recordings {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            text-align: center;
            padding: 20px;
        }

        .control-button.active {
            background: rgba(59, 130, 246, 0.3);
            color: #60a5fa;
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
        }
    `;

    constructor() {
        super();
        this.messages = [];
        this.currentInput = '';
        this.isLoading = false;
        this.currentSessionId = null;
        this.sessions = [];
        this.showSidebar = true;
        this.isStreaming = false;
        this.streamingMessage = '';
        this.recordingSessions = [];
        this.selectedTranscriptSession = null;
        this.showTranscriptSelector = false;
        this.uploadedFiles = [];
        this.isDragging = false;
        this.backgroundOpacity = 0.2; // Default opacity
        
        this.setupIpcListeners();
        this.loadSessions();
        this.loadRecordingSessions();
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + B to toggle sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                this.showSidebar = !this.showSidebar;
                this.requestUpdate();
            }
            // Cmd/Ctrl + M to toggle transcript selector
            if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleTranscriptSelector();
            }
            // Escape to close any open panels
            if (e.key === 'Escape') {
                if (this.showTranscriptSelector) {
                    this.showTranscriptSelector = false;
                    this.requestUpdate();
                }
            }
        });
    }

    setupIpcListeners() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            ipcRenderer.on('chat-message-added', (event, data) => {
                this.messages = [...this.messages, data];
                this.requestUpdate();
                this.scrollToBottom();
            });

            ipcRenderer.on('chat-response-start', () => {
                this.isStreaming = true;
                this.streamingMessage = '';
                this.requestUpdate();
            });

            ipcRenderer.on('chat-response-chunk', (event, data) => {
                this.streamingMessage += data.token;
                this.requestUpdate();
                this.scrollToBottom();
            });

            ipcRenderer.on('chat-response-end', () => {
                this.isStreaming = false;
                this.streamingMessage = '';
                this.isLoading = false;
                this.requestUpdate();
            });

            ipcRenderer.on('chat-history-loaded', (event, data) => {
                this.messages = data.messages;
                this.currentSessionId = data.sessionId;
                this.requestUpdate();
                this.scrollToBottom();
            });

            ipcRenderer.on('chat-session-created', (event, data) => {
                this.currentSessionId = data.sessionId;
                this.messages = [];
                this.loadSessions();
                this.requestUpdate();
            });

            ipcRenderer.on('chat-error', (event, data) => {
                this.isLoading = false;
                this.isStreaming = false;
                console.error('Chat error:', data.error);
                this.requestUpdate();
            });
        }
    }

    async loadSessions() {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('chat-get-sessions');
                if (result.success) {
                    this.sessions = result.sessions;
                    this.requestUpdate();
                }
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }

    async loadRecordingSessions() {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const sessions = await ipcRenderer.invoke('chat-get-recording-sessions');
                this.recordingSessions = sessions || [];
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Failed to load recording sessions:', error);
        }
    }

    async sendMessage() {
        if (!this.currentInput.trim() || this.isLoading) return;

        const message = this.currentInput.trim();
        this.currentInput = '';
        this.isLoading = true;
        this.requestUpdate();

        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                
                // Get transcript context if a recording session is selected
                let transcriptContext = null;
                if (this.selectedTranscriptSession) {
                    console.log('[ChatView] 📝 Fetching transcript context for session:', this.selectedTranscriptSession);
                    transcriptContext = await ipcRenderer.invoke('chat-get-session-transcripts', {
                        sessionId: this.selectedTranscriptSession
                    });
                    console.log('[ChatView] 📝 Transcript context received:', transcriptContext ? transcriptContext.substring(0, 100) + '...' : 'null');
                }
                
                // Process uploaded files for context
                let fileContext = null;
                if (this.uploadedFiles.length > 0) {
                    console.log('[ChatView] 📎 Processing uploaded files:', this.uploadedFiles.length);
                    fileContext = await this.processUploadedFiles();
                }
                
                await ipcRenderer.invoke('chat-send-message', {
                    message,
                    sessionId: this.currentSessionId,
                    transcriptContext,
                    fileContext
                });
                
                // Clear uploaded files after sending
                this.uploadedFiles = [];
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    async loadSession(sessionId) {
        if (sessionId === this.currentSessionId) return;
        
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('chat-load-session', { sessionId });
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    }

    async createNewSession() {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('chat-new-session');
            }
        } catch (error) {
            console.error('Failed to create new session:', error);
        }
    }

    getCurrentSessionName() {
        if (!this.currentSessionId) {
            return 'No Session';
        }
        
        const currentSession = this.sessions.find(s => s.id === this.currentSessionId);
        if (currentSession && currentSession.title) {
            return currentSession.title;
        }
        
        return 'Current Chat';
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 10);
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    toggleTranscriptSelector() {
        this.showTranscriptSelector = !this.showTranscriptSelector;
        this.requestUpdate();
    }

    selectTranscriptSession(sessionId) {
        this.selectedTranscriptSession = this.selectedTranscriptSession === sessionId ? null : sessionId;
        // Auto-close the transcript selector after selection
        this.showTranscriptSelector = false;
        this.requestUpdate();
    }

    setupDragAndDrop() {
        // Will be set up after first render when shadowRoot is available
        this.updateComplete.then(() => {
            const container = this.shadowRoot.querySelector('.main-content');
            if (container) {
                container.addEventListener('dragover', this.handleDragOver.bind(this));
                container.addEventListener('dragenter', this.handleDragEnter.bind(this));
                container.addEventListener('dragleave', this.handleDragLeave.bind(this));
                container.addEventListener('drop', this.handleDrop.bind(this));
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
        this.requestUpdate();
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        // Only hide if leaving the main container
        if (!e.currentTarget.contains(e.relatedTarget)) {
            this.isDragging = false;
            this.requestUpdate();
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;
        
        const files = Array.from(e.dataTransfer.files);
        this.handleFiles(files);
        this.requestUpdate();
    }

    handleFiles(files) {
        const validFiles = files.filter(file => {
            // Accept images, documents, and text files
            const validTypes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain', 'text/markdown',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            return validTypes.includes(file.type) || file.size < 10 * 1024 * 1024; // 10MB limit
        });

        validFiles.forEach(file => {
            if (!this.uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
                this.uploadedFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file
                });
            }
        });
        
        this.requestUpdate();
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.requestUpdate();
    }

    openFileDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,.pdf,.txt,.md,.doc,.docx';
        input.onchange = (e) => {
            this.handleFiles(Array.from(e.target.files));
        };
        input.click();
    }

    async processUploadedFiles() {
        const fileContents = [];
        
        for (const fileInfo of this.uploadedFiles) {
            try {
                if (fileInfo.type.startsWith('image/')) {
                    // For images, just include metadata
                    fileContents.push(`[IMAGE: ${fileInfo.name} (${(fileInfo.size / 1024).toFixed(1)}KB)]`);
                } else if (fileInfo.type === 'text/plain' || fileInfo.type === 'text/markdown') {
                    // Read text files
                    const text = await this.readFileAsText(fileInfo.file);
                    fileContents.push(`[FILE: ${fileInfo.name}]\n${text}`);
                } else {
                    // For other files, just include metadata
                    fileContents.push(`[FILE: ${fileInfo.name} (${fileInfo.type}, ${(fileInfo.size / 1024).toFixed(1)}KB)]`);
                }
            } catch (error) {
                console.error('Error processing file:', fileInfo.name, error);
                fileContents.push(`[FILE: ${fileInfo.name} - Error reading file]`);
            }
        }
        
        return fileContents.length > 0 ? fileContents.join('\n\n') : null;
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    adjustTransparency() {
        // Cycle through opacity levels: 0.1, 0.2, 0.3, 0.4, 0.5
        const opacityLevels = [0.1, 0.2, 0.3, 0.4, 0.5];
        const currentIndex = opacityLevels.indexOf(this.backgroundOpacity);
        const nextIndex = (currentIndex + 1) % opacityLevels.length;
        this.backgroundOpacity = opacityLevels[nextIndex];
        
        // Apply to the chat container background
        this.updateComplete.then(() => {
            const container = this.shadowRoot.querySelector('.chat-container');
            if (container) {
                container.style.setProperty('--bg-opacity', this.backgroundOpacity);
            }
        });
        
        this.requestUpdate();
    }

    render() {
        return html`
            <div class="chat-container">
                ${!this.showSidebar ? html`
                    <button class="floating-sidebar-toggle" @click=${() => this.showSidebar = true} title="Show Sessions (Cmd+B)">
                        ☰ <span>Sessions</span>
                    </button>
                ` : ''}
                
                <div class="main-content ${this.showSidebar ? 'sidebar-open' : ''}">
                    ${this.isDragging ? html`
                        <div class="drag-overlay">
                            📁 Drop files here to attach
                        </div>
                    ` : ''}
                    
                    <div class="chat-header">
                    <div class="header-left">
                        <div class="chat-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                            </svg>
                        </div>
                        <span class="chat-label">Chat</span>
                    </div>
                    <div class="header-right">
                        <div class="session-info">
                            ${this.getCurrentSessionName()}
                        </div>
                        <div class="header-controls">
                            <button class="control-button ${this.selectedTranscriptSession ? 'active' : ''}" @click=${this.toggleTranscriptSelector} title="Add Recording Context (Cmd+M)">
                                📝
                            </button>
                            <button class="control-button" @click=${this.adjustTransparency} title="Adjust Background Transparency (${Math.round(this.backgroundOpacity * 100)}%)">
                                🔆
                            </button>
                            <button class="control-button ${this.showSidebar ? 'active' : ''}" @click=${() => this.showSidebar = !this.showSidebar} title="${this.showSidebar ? 'Hide Sessions (Cmd+B)' : 'Show Sessions (Cmd+B)'}">
                                ${this.showSidebar ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="messages-container">
                    ${this.messages.length === 0 ? html`
                        <div class="empty-state">
                            <h3>Start a conversation</h3>
                            <p>Ask me anything and I'll help you out!</p>
                        </div>
                    ` : ''}

                    ${this.messages.map(message => html`
                        <div class="message ${message.role}">
                            <div class="message-avatar">
                                ${message.role === 'user' ? 'U' : 'AI'}
                            </div>
                            <div class="message-content">
                                ${message.content}
                            </div>
                        </div>
                    `)}

                    ${this.isStreaming ? html`
                        <div class="message assistant">
                            <div class="message-avatar">AI</div>
                            <div class="streaming-message">
                                ${this.streamingMessage}
                            </div>
                        </div>
                    ` : ''}

                    ${this.isLoading && !this.isStreaming ? html`
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <span>Thinking...</span>
                        </div>
                    ` : ''}
                </div>

                <div class="input-container">
                    ${this.uploadedFiles.length > 0 ? html`
                        <div class="uploaded-files">
                            ${this.uploadedFiles.map((file, index) => html`
                                <div class="uploaded-file">
                                    <span>${file.name}</span>
                                    <button class="remove-file" @click=${() => this.removeFile(index)}>×</button>
                                </div>
                            `)}
                        </div>
                    ` : ''}
                    
                    <div class="input-row">
                        <div class="input-wrapper">
                            <textarea
                                class="message-input"
                                placeholder="Type your message..."
                                .value=${this.currentInput}
                                @input=${(e) => this.currentInput = e.target.value}
                                @keydown=${this.handleInputKeydown}
                                ?disabled=${this.isLoading}
                            ></textarea>
                            <div class="input-actions">
                                <button class="attach-btn" @click=${this.openFileDialog} title="Attach Files">
                                    📎
                                </button>
                                <button 
                                    class="send-btn"
                                    @click=${this.sendMessage}
                                    ?disabled=${this.isLoading || !this.currentInput.trim()}
                                    title="Send Message"
                                >
                                    ${this.isLoading ? '⏳' : '➤'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.showTranscriptSelector ? html`
                    <div class="transcript-selector">
                        <div class="transcript-header">
                            <span>Add Recording Context</span>
                            <button class="close-btn" @click=${this.toggleTranscriptSelector}>×</button>
                        </div>
                        <div class="transcript-sessions">
                            ${this.recordingSessions.length === 0 ? html`
                                <div class="empty-recordings">
                                    No recordings available
                                </div>
                            ` : ''}
                            ${this.recordingSessions.map(session => html`
                                <div 
                                    class="transcript-session ${session.id === this.selectedTranscriptSession ? 'selected' : ''}"
                                    @click=${() => this.selectTranscriptSession(session.id)}
                                >
                                    <div class="session-info">
                                        <div class="session-title">${session.title || 'Recording Session'}</div>
                                        <div class="session-meta">
                                            ${this.formatTimestamp(session.started_at)} • ${session.transcriptCount} messages
                                        </div>
                                    </div>
                                    ${session.id === this.selectedTranscriptSession ? html`
                                        <div class="selected-indicator">✓</div>
                                    ` : ''}
                                </div>
                            `)}
                        </div>
                    </div>
                ` : ''}
                </div>
            </div>

            <div class="sidebar ${this.showSidebar ? 'open' : ''}">
                <div class="sidebar-header">
                    <div class="sidebar-title">Chat Sessions</div>
                    <div class="sidebar-controls">
                        <button class="new-session-btn" @click=${this.createNewSession} title="Create New Session">
                            + New Session
                        </button>
                        <button class="close-sidebar-btn" @click=${() => this.showSidebar = false} title="Close Sessions">
                            ✕
                        </button>
                    </div>
                </div>
                <div class="sessions-list">
                    ${this.sessions.length === 0 ? html`
                        <div class="empty-sessions">
                            No sessions yet
                        </div>
                    ` : ''}
                    ${this.sessions.map(session => html`
                        <div 
                            class="session-item ${session.id === this.currentSessionId ? 'active' : ''}"
                            @click=${() => this.loadSession(session.id)}
                        >
                            <div class="session-title">
                                ${session.title || 'New Chat'}
                            </div>
                            <div class="session-meta">
                                <div class="session-date">
                                    ${this.formatTimestamp(session.started_at)}
                                </div>
                                ${session.message_count ? html`
                                    <div class="session-count">
                                        ${session.message_count} messages
                                    </div>
                                ` : ''}
                                ${session.duration ? html`
                                    <div class="session-duration">
                                        ${this.formatDuration(session.duration)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }
}

customElements.define('chat-view', ChatView);
