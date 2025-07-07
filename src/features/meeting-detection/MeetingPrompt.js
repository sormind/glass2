import { LitElement, html, css } from '../../assets/lit-core-2.7.4.min.js';

class MeetingPrompt extends LitElement {
    static properties = {
        visible: { type: Boolean },
        platform: { type: String },
        confidence: { type: Number },
        isAutoRecording: { type: Boolean }
    };

    constructor() {
        super();
        this.visible = false;
        this.platform = '';
        this.confidence = 0;
        this.isAutoRecording = false;
        this.setupMeetingDetectionListeners();
    }

    setupMeetingDetectionListeners() {
        try {
            const { ipcRenderer } = window.require('electron');
            
            // Listen for meeting detection events
            ipcRenderer.on('meeting-detected', (event, data) => {
                console.log('[MeetingPrompt] 📨 Received meeting-detected IPC:', data);
                this.showPrompt(data.platform, data.confidence);
            });

            ipcRenderer.on('meeting-ended', () => {
                this.hidePrompt();
            });

            // Listen for auto-recording started events
            ipcRenderer.on('auto-recording-started', (event, meetingInfo) => {
                this.showAutoRecordingNotification(meetingInfo);
            });
        } catch (error) {
            console.error('[MeetingPrompt] Failed to setup IPC listeners:', error);
        }
    }

    showPrompt(platform, confidence) {
        console.log(`[MeetingPrompt] 💬 Showing prompt for ${platform} meeting (${confidence}% confidence)`);
        this.platform = platform;
        this.confidence = confidence;
        this.visible = true;
        this.isAutoRecording = false;
        
        // Auto-hide after 15 seconds if no action taken
        setTimeout(() => {
            if (this.visible) {
                console.log('[MeetingPrompt] ⏰ Auto-hiding prompt after 15 seconds');
                this.hidePrompt();
            }
        }, 15000);
    }

    hidePrompt() {
        this.visible = false;
    }

    async startRecording() {
        try {
            const { ipcRenderer } = window.require('electron');
            // Start the listen feature
            await ipcRenderer.invoke('toggle-feature', 'listen');
            console.log(`[MeetingPrompt] Started recording for ${this.platform} meeting`);
            this.hidePrompt();
        } catch (error) {
            console.error('[MeetingPrompt] Failed to start recording:', error);
        }
    }

    dismissPrompt() {
        try {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('meeting-detection:dismiss-prompt');
            this.hidePrompt();
        } catch (error) {
            console.error('[MeetingPrompt] Failed to dismiss prompt:', error);
        }
    }

    showAutoRecordingNotification(meetingInfo) {
        // Show a brief notification that recording started automatically
        this.platform = meetingInfo.platform;
        this.confidence = meetingInfo.confidence;
        this.visible = true;
        this.isAutoRecording = true;
        
        console.log(`[MeetingPrompt] 🎤 Auto-recording started for ${meetingInfo.platform} meeting`);
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
            this.visible = false;
            this.isAutoRecording = false;
        }, 5000);
    }

    static styles = css`
        :host {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .meeting-prompt {
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            min-width: 300px;
            max-width: 400px;
            color: white;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        }

        .meeting-prompt.visible {
            transform: translateX(0);
            opacity: 1;
        }

        .prompt-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .meeting-icon {
            width: 20px;
            height: 20px;
            background: #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }

        .prompt-title {
            font-size: 14px;
            font-weight: 600;
            color: #4CAF50;
        }

        .prompt-message {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 16px;
            line-height: 1.4;
        }

        .platform-info {
            font-weight: 500;
            color: #4CAF50;
        }

        .confidence-info {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 4px;
        }

        .prompt-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .prompt-button {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .start-button {
            background: #4CAF50;
            color: white;
        }

        .start-button:hover {
            background: #45a049;
            transform: translateY(-1px);
        }

        .dismiss-button {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .dismiss-button:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .hidden {
            display: none;
        }
    `;

    render() {
        if (this.isAutoRecording) {
            // Show auto-recording notification
            return html`
                <div class="meeting-prompt ${this.visible ? 'visible' : 'hidden'}">
                    <div class="prompt-header">
                        <div class="meeting-icon">🎤</div>
                        <div class="prompt-title">Recording Started</div>
                    </div>
                    
                    <div class="prompt-message">
                        <div class="platform-info">✅ Auto-recording ${this.platform} meeting</div>
                        <div class="confidence-info">Detection confidence: ${this.confidence}%</div>
                    </div>
                </div>
            `;
        } else {
            // Show manual prompt
            return html`
                <div class="meeting-prompt ${this.visible ? 'visible' : 'hidden'}">
                    <div class="prompt-header">
                        <div class="meeting-icon">🎯</div>
                        <div class="prompt-title">Meeting Detected</div>
                    </div>
                    
                    <div class="prompt-message">
                        <div class="platform-info">${this.platform} meeting detected</div>
                        <div class="confidence-info">Confidence: ${this.confidence}%</div>
                        <br>
                        Would you like to start recording this conversation?
                    </div>
                    
                    <div class="prompt-actions">
                        <button class="prompt-button dismiss-button" @click=${this.dismissPrompt}>
                            Not now
                        </button>
                        <button class="prompt-button start-button" @click=${this.startRecording}>
                            Start Recording
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

customElements.define('meeting-prompt', MeetingPrompt);
export { MeetingPrompt };
