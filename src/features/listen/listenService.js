const { BrowserWindow } = require('electron');
const SttService = require('./stt/sttService');
const SummaryService = require('./summary/summaryService');
const authService = require('../../common/services/authService');
const sessionRepository = require('../../common/repositories/session');
const sttRepository = require('./stt/repositories');

class ListenService {
    constructor() {
        this.sttService = new SttService();
        this.summaryService = new SummaryService();
        this.currentSessionId = null;
        this.isInitializingSession = false;
        
        this.setupServiceCallbacks();
    }

    setupServiceCallbacks() {
        // STT service callbacks
        this.sttService.setCallbacks({
            onTranscriptionComplete: (speaker, text) => {
                this.handleTranscriptionComplete(speaker, text);
            },
            onStatusUpdate: (status) => {
                this.sendToRenderer('update-status', status);
            }
        });

        // Summary service callbacks
        this.summaryService.setCallbacks({
            onAnalysisComplete: (data) => {
                console.log('📊 Analysis completed:', data);
            },
            onStatusUpdate: (status) => {
                this.sendToRenderer('update-status', status);
            }
        });
    }

    sendToRenderer(channel, data) {
        BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, data);
            }
        });
    }

    async handleTranscriptionComplete(speaker, text) {
        console.log(`[ListenService] 📝 Transcription complete: ${speaker} - ${text}`);
        console.log(`[ListenService] 💾 Current session ID: ${this.currentSessionId}`);
        
        // Save to database
        await this.saveConversationTurn(speaker, text);
        
        // Add to summary service for analysis
        this.summaryService.addConversationTurn(speaker, text);
    }

    async saveConversationTurn(speaker, transcription) {
        console.log(`[DB] 💾 Attempting to save transcript - Session: ${this.currentSessionId}, Speaker: ${speaker}, Text: "${transcription}"`);
        
        if (!this.currentSessionId) {
            console.error('[DB] ❌ Cannot save turn, no active session ID.');
            return;
        }
        if (transcription.trim() === '') {
            console.log('[DB] ⚠️ Skipping empty transcript');
            return;
        }

        try {
            await sessionRepository.touch(this.currentSessionId);
            const result = await sttRepository.addTranscript({
                sessionId: this.currentSessionId,
                speaker: speaker,
                text: transcription.trim(),
            });
            console.log(`[DB] ✅ Successfully saved transcript for session ${this.currentSessionId}: (${speaker}) - ID: ${result.id}`);
        } catch (error) {
            console.error('[DB] ❌ Failed to save transcript to DB:', error);
        }
    }

    async initializeNewSession() {
        try {
            const uid = authService.getCurrentUserId();
            if (!uid) {
                throw new Error("Cannot initialize session: user not logged in.");
            }
            
            this.currentSessionId = await sessionRepository.getOrCreateActive(uid, 'listen');
            console.log(`[DB] 🆕 New listen session ensured: ${this.currentSessionId}`);
            console.log(`[DB] 👤 User ID: ${uid}`);

            // Set session ID for summary service
            this.summaryService.setSessionId(this.currentSessionId);
            
            // Reset conversation history
            this.summaryService.resetConversationHistory();

            console.log('New conversation session started:', this.currentSessionId);
            return true;
        } catch (error) {
            console.error('Failed to initialize new session in DB:', error);
            this.currentSessionId = null;
            return false;
        }
    }

    async initializeSession(language = 'en') {
        if (this.isInitializingSession) {
            console.log('Session initialization already in progress.');
            return false;
        }

        this.isInitializingSession = true;
        this.sendToRenderer('session-initializing', true);
        this.sendToRenderer('update-status', 'Initializing sessions...');

        try {
            // Initialize database session
            const sessionInitialized = await this.initializeNewSession();
            if (!sessionInitialized) {
                throw new Error('Failed to initialize database session');
            }

            // Initialize STT sessions
            await this.sttService.initializeSttSessions(language);

            console.log('✅ Listen service initialized successfully.');
            
            this.sendToRenderer('session-state-changed', { isActive: true });
            this.sendToRenderer('update-status', 'Connected. Ready to listen.');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize listen service:', error);
            this.sendToRenderer('update-status', 'Initialization failed.');
            return false;
        } finally {
            this.isInitializingSession = false;
            this.sendToRenderer('session-initializing', false);
        }
    }

    async sendAudioContent(data, mimeType) {
        return await this.sttService.sendAudioContent(data, mimeType);
    }

    async startMacOSAudioCapture() {
        if (process.platform !== 'darwin') {
            throw new Error('macOS audio capture only available on macOS');
        }
        return await this.sttService.startMacOSAudioCapture();
    }

    async stopMacOSAudioCapture() {
        this.sttService.stopMacOSAudioCapture();
    }

    isSessionActive() {
        return this.sttService.isSessionActive();
    }

    async closeSession() {
        try {
            console.log(`[DB] 🔄 Closing session: ${this.currentSessionId}`);
            
            // Close STT sessions
            await this.sttService.closeSessions();

            // End database session
            if (this.currentSessionId) {
                await sessionRepository.end(this.currentSessionId);
                console.log(`[DB] ✅ Session ${this.currentSessionId} ended successfully.`);
            } else {
                console.log(`[DB] ⚠️ No active session to close.`);
            }

            // Reset state
            this.currentSessionId = null;
            this.summaryService.resetConversationHistory();

            this.sendToRenderer('session-state-changed', { isActive: false });
            this.sendToRenderer('session-did-close');

            console.log('✅ Listen service session closed successfully.');
            return { success: true };
        } catch (error) {
            console.error('❌ Error closing listen service session:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentSessionData() {
        return {
            sessionId: this.currentSessionId,
            conversationHistory: this.summaryService.getConversationHistory(),
            totalTexts: this.summaryService.getConversationHistory().length,
            analysisData: this.summaryService.getCurrentAnalysisData(),
        };
    }

    getConversationHistory() {
        return this.summaryService.getConversationHistory();
    }

    setupIpcHandlers() {
        const { ipcMain } = require('electron');

        ipcMain.handle('is-session-active', async () => {
            const isActive = this.isSessionActive();
            console.log(`Checking session status. Active: ${isActive}`);
            return isActive;
        });

        ipcMain.handle('initialize-openai', async (event, profile = 'interview', language = 'en') => {
            console.log(`Received initialize-openai request with profile: ${profile}, language: ${language}`);
            const success = await this.initializeSession(language);
            return success;
        });

        ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
            try {
                await this.sendAudioContent(data, mimeType);
                return { success: true };
            } catch (error) {
                console.error('Error sending user audio:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('send-system-audio-content', async (event, { data, mimeType }) => {
            try {
                await this.sttService.sendSystemAudioContent(data, mimeType);
                
                // Send system audio data back to renderer for AEC reference (like macOS does)
                this.sendToRenderer('system-audio-data', { data });
                
                return { success: true };
            } catch (error) {
                console.error('Error sending system audio:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('start-macos-audio', async () => {
            if (process.platform !== 'darwin') {
                return { success: false, error: 'macOS audio capture only available on macOS' };
            }
            try {
                const success = await this.startMacOSAudioCapture();
                return { success };
            } catch (error) {
                console.error('Error starting macOS audio capture:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('stop-macos-audio', async () => {
            try {
                this.stopMacOSAudioCapture();
                return { success: true };
            } catch (error) {
                console.error('Error stopping macOS audio capture:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('close-session', async () => {
            return await this.closeSession();
        });

        ipcMain.handle('update-google-search-setting', async (event, enabled) => {
            try {
                console.log('Google Search setting updated to:', enabled);
                return { success: true };
            } catch (error) {
                console.error('Error updating Google Search setting:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('✅ Listen service IPC handlers registered');
    }
}

module.exports = ListenService; 