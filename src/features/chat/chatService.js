const { ipcMain, BrowserWindow } = require('electron');
const { createStreamingLLM } = require('../../common/ai/factory');
const { getStoredApiKey, getStoredProvider, windowPool, captureScreenshot } = require('../../electron/windowManager');
const authService = require('../../common/services/authService');
const sessionRepository = require('../../common/repositories/session');
const askRepository = require('../ask/repositories'); // Reuse existing repository
const { getSystemPrompt } = require('../../common/prompts/promptBuilder');

let currentChatSessionId = null;

function formatConversationForPrompt(conversationTexts) {
    if (!conversationTexts || conversationTexts.length === 0) return 'No conversation history available.';
    return conversationTexts.slice(-30).join('\n');
}

// Access conversation history via the global listenService instance created in index.js
function getConversationHistory() {
    const listenService = global.listenService;
    return listenService ? listenService.getConversationHistory() : [];
}

async function getChatHistory(sessionId) {
    try {
        const messages = await askRepository.getAllAiMessagesBySessionId(sessionId);
        return messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.sent_at,
            model: msg.model
        }));
    } catch (error) {
        console.error('[ChatService] Error fetching chat history:', error);
        return [];
    }
}

async function sendChatMessage(userPrompt, sessionId = null, transcriptContext = null, fileContext = null) {
    if (!userPrompt || userPrompt.trim().length === 0) {
        console.warn('[ChatService] Cannot process empty message');
        return { success: false, error: 'Empty message' };
    }
    
    const chatWindow = windowPool.get('chat');
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('chat-message-sending');
    }

    try {
        console.log(`[ChatService] 🤖 Processing chat message: ${userPrompt.substring(0, 50)}...`);

        // Get or create session
        const uid = authService.getCurrentUserId();
        if (!uid) throw new Error("User not logged in, cannot save message.");
        
        const activeSessionId = sessionId || currentChatSessionId || await sessionRepository.getOrCreateActive(uid, 'chat');
        currentChatSessionId = activeSessionId;

        // Get chat history for context
        const chatHistory = await getChatHistory(activeSessionId);
        
        // Build messages array with chat history
        const conversationHistoryRaw = getConversationHistory();
        const conversationHistory = formatConversationForPrompt(conversationHistoryRaw);
        
        // Add transcript and file context if provided
        let enhancedConversationHistory = conversationHistory;
        if (transcriptContext || fileContext) {
            let contextParts = [];
            
            if (transcriptContext) {
                console.log('[ChatService] 📝 Adding transcript context to prompt:', transcriptContext.substring(0, 100) + '...');
                contextParts.push(`PREVIOUS RECORDING SESSION TRANSCRIPT:\n${transcriptContext}`);
            }
            
            if (fileContext) {
                console.log('[ChatService] 📎 Adding file context to prompt:', fileContext.substring(0, 100) + '...');
                contextParts.push(`UPLOADED FILES CONTEXT:\n${fileContext}`);
            }
            
            enhancedConversationHistory = `${contextParts.join('\n\n')}\n\nCURRENT CONVERSATION:\n${conversationHistory}`;
        } else {
            console.log('[ChatService] 📝 No additional context provided');
        }
        
        const systemPrompt = await getSystemPrompt('pickle_glass_analysis', enhancedConversationHistory, false);

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add recent chat history for context (last 10 messages)
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current user message
        messages.push({
            role: 'user',
            content: userPrompt.trim()
        });

        const API_KEY = await getStoredApiKey();
        if (!API_KEY) {
            throw new Error('No API key found');
        }

        const provider = await getStoredProvider();
        const { isLoggedIn } = authService.getCurrentUser();
        
        console.log(`[ChatService] 🚀 Sending request to ${provider} AI...`);

        const streamingLLM = createStreamingLLM(provider, {
            apiKey: API_KEY,
            model: provider === 'openai' ? 'gpt-4.1' : 'gemini-2.5-flash',
            temperature: 0.7,
            maxTokens: 2048,
            usePortkey: provider === 'openai' && isLoggedIn,
            portkeyVirtualKey: isLoggedIn ? API_KEY : undefined
        });

        const response = await streamingLLM.streamChat(messages);

        // --- Stream Processing ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        const chatWin = windowPool.get('chat');
        if (!chatWin || chatWin.isDestroyed()) {
            console.error("[ChatService] Chat window is not available to send stream to.");
            reader.cancel();
            return;
        }

        // Save user message immediately
        await askRepository.addAiMessage({ 
            sessionId: activeSessionId, 
            role: 'user', 
            content: userPrompt.trim() 
        });

        // Send user message to UI
        chatWin.webContents.send('chat-message-added', {
            role: 'user',
            content: userPrompt.trim(),
            timestamp: Math.floor(Date.now() / 1000)
        });

        // Start assistant message
        chatWin.webContents.send('chat-response-start');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                        chatWin.webContents.send('chat-response-end');
                        
                        // Save assistant response to DB
                        try {
                            await askRepository.addAiMessage({ 
                                sessionId: activeSessionId, 
                                role: 'assistant', 
                                content: fullResponse 
                            });
                            
                            // Send complete assistant message to UI
                            chatWin.webContents.send('chat-message-added', {
                                role: 'assistant',
                                content: fullResponse,
                                timestamp: Math.floor(Date.now() / 1000)
                            });
                            
                            console.log(`[ChatService] DB: Saved chat message pair to session ${activeSessionId}`);
                        } catch(dbError) {
                            console.error("[ChatService] DB: Failed to save chat message pair:", dbError);
                        }
                        
                        return { success: true, response: fullResponse, sessionId: activeSessionId };
                    }
                    try {
                        const json = JSON.parse(data);
                        const token = json.choices[0]?.delta?.content || '';
                        if (token) {
                            fullResponse += token;
                            chatWin.webContents.send('chat-response-chunk', { token });
                        }
                    } catch (error) {
                        // Ignore parsing errors for now
                    }
                }
            }
        }
    } catch (error) {
        console.error('[ChatService] Error processing chat message:', error);
        const chatWin = windowPool.get('chat');
        if (chatWin && !chatWin.isDestroyed()) {
            chatWin.webContents.send('chat-error', { error: error.message });
        }
        return { success: false, error: error.message };
    }
}

async function loadChatSession(sessionId) {
    try {
        currentChatSessionId = sessionId;
        const chatHistory = await getChatHistory(sessionId);
        
        const chatWin = windowPool.get('chat');
        if (chatWin && !chatWin.isDestroyed()) {
            chatWin.webContents.send('chat-history-loaded', { messages: chatHistory, sessionId });
        }
        
        return { success: true, messages: chatHistory };
    } catch (error) {
        console.error('[ChatService] Error loading chat session:', error);
        return { success: false, error: error.message };
    }
}

async function createNewChatSession() {
    try {
        const uid = authService.getCurrentUserId();
        if (!uid) throw new Error("User not logged in, cannot create session.");
        
        // End current session if exists
        if (currentChatSessionId) {
            await sessionRepository.end(currentChatSessionId);
        }
        
        // Create new session
        const newSessionId = await sessionRepository.create(uid, 'chat');
        currentChatSessionId = newSessionId;
        
        const chatWin = windowPool.get('chat');
        if (chatWin && !chatWin.isDestroyed()) {
            chatWin.webContents.send('chat-session-created', { sessionId: newSessionId });
        }
        
        return { success: true, sessionId: newSessionId };
    } catch (error) {
        console.error('[ChatService] Error creating new chat session:', error);
        return { success: false, error: error.message };
    }
}

async function getChatSessions() {
    try {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            console.warn('[ChatService] No user logged in');
            return [];
        }
        
        const sessions = await sessionRepository.getAllByUserId(uid);
        return sessions.filter(session => session.session_type === 'ask');
    } catch (error) {
        console.error('[ChatService] Error fetching chat sessions:', error);
        return [];
    }
}

async function getRecordingSessions() {
    try {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            console.warn('[ChatService] No user logged in');
            return [];
        }
        
        const sessions = await sessionRepository.getAllByUserId(uid);
        const recordingSessions = sessions.filter(session => session.session_type === 'listen');
        
        // Get transcript count for each session
        const sttRepository = require('../listen/stt/repositories/sqlite.repository');
        const sessionsWithTranscripts = await Promise.all(
            recordingSessions.map(async (session) => {
                const transcripts = await sttRepository.getAllTranscriptsBySessionId(session.id);
                return {
                    ...session,
                    transcriptCount: transcripts.length,
                    hasTranscripts: transcripts.length > 0
                };
            })
        );
        
        // Only return sessions that have transcripts
        return sessionsWithTranscripts.filter(session => session.hasTranscripts);
    } catch (error) {
        console.error('[ChatService] Error fetching recording sessions:', error);
        return [];
    }
}

async function getSessionTranscripts(sessionId) {
    try {
        const sttRepository = require('../listen/stt/repositories/sqlite.repository');
        const transcripts = await sttRepository.getAllTranscriptsBySessionId(sessionId);
        
        // Format transcripts as conversation
        const formattedTranscripts = transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n');
        return formattedTranscripts;
    } catch (error) {
        console.error('[ChatService] Error fetching session transcripts:', error);
        return '';
    }
}

function initialize() {
    console.log('[ChatService] 🚀 Initializing Chat Service...');
    
    ipcMain.handle('chat-send-message', async (event, { message, sessionId, transcriptContext, fileContext }) => {
        return await sendChatMessage(message, sessionId, transcriptContext, fileContext);
    });
    
    ipcMain.handle('chat-load-session', async (event, { sessionId }) => {
        return await loadChatSession(sessionId);
    });
    
    ipcMain.handle('chat-new-session', async () => {
        return await createNewChatSession();
    });
    
    ipcMain.handle('chat-get-sessions', async () => {
        return await getChatSessions();
    });
    
    ipcMain.handle('chat-get-recording-sessions', async () => {
        return await getRecordingSessions();
    });
    
    ipcMain.handle('chat-get-session-transcripts', async (event, { sessionId }) => {
        return await getSessionTranscripts(sessionId);
    });
    
    console.log('[ChatService] ✅ Chat Service initialized');
}

initialize();

module.exports = {
    initialize,
    getCurrentSessionId: () => currentChatSessionId,
};
