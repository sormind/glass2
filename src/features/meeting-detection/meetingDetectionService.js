const { exec } = require('child_process');
const { ipcMain } = require('electron');

class MeetingDetectionService {
    constructor() {
        this.isMonitoring = false;
        this.detectionInterval = null;
        this.currentMeetingState = {
            inMeeting: false,
            platform: null,
            confidence: 0,
            startTime: null
        };
        
        // Define meeting platforms and their detection patterns
        this.meetingPlatforms = {
            'Zoom': { 
                name: 'Zoom', 
                patterns: ['zoom.us.app', 'zoom', 'zoomus', 'ZoomOpener'],
                processes: ['zoom.us', 'ZoomOpener', 'zoom']
            },
            'Google Meet': { 
                name: 'Google Meet', 
                patterns: ['meet.google.com', 'google meet', 'chrome.*meet'],
                processes: ['chrome', 'safari', 'firefox']
            },
            'Microsoft Teams': { 
                name: 'Microsoft Teams', 
                patterns: ['microsoft teams', 'teams.microsoft.com', 'msteams'],
                processes: ['Microsoft Teams', 'Teams']
            },
            'Skype': { 
                name: 'Skype', 
                patterns: ['skype'],
                processes: ['Skype']
            },
            'Discord': { 
                name: 'Discord', 
                patterns: ['discord'],
                processes: ['Discord']
            },
            'Slack': { 
                name: 'Slack', 
                patterns: ['slack'],
                processes: ['Slack']
            },
            'WhatsApp': { 
                name: 'WhatsApp', 
                patterns: ['whatsapp'],
                processes: ['WhatsApp']
            },
            'Telegram': { 
                name: 'Telegram', 
                patterns: ['telegram'],
                processes: ['Telegram']
            },
            'FaceTime': { 
                name: 'FaceTime', 
                patterns: ['facetime'],
                processes: ['FaceTime']
            },
            'WebEx': { 
                name: 'WebEx', 
                patterns: ['cisco webex', 'webex.app'],
                processes: ['Webex', 'CiscoWebEx']
            }
        };
        
        this.autoStartEnabled = false; // Show prompt by default, let user choose
        this.setupIpcHandlers();
    }

    setupIpcHandlers() {
        ipcMain.handle('meeting-detection:start', () => this.startMonitoring());
        ipcMain.handle('meeting-detection:stop', () => this.stopMonitoring());
        ipcMain.handle('meeting-detection:get-state', () => this.currentMeetingState);
        ipcMain.handle('meeting-detection:dismiss-prompt', () => this.dismissMeetingPrompt());
        ipcMain.handle('meeting-detection:toggle-auto-start', (event, enabled) => {
            this.autoStartEnabled = enabled;
            console.log(`[MeetingDetection] Auto-start ${enabled ? 'enabled' : 'disabled'}`);
        });
        ipcMain.handle('start-meeting-detection', () => {
            this.startMonitoring();
            return { success: true };
        });

        ipcMain.handle('stop-meeting-detection', () => {
            this.stopMonitoring();
            return { success: true };
        });

        ipcMain.handle('toggle-auto-start', (event, enabled) => {
            this.autoStartEnabled = enabled;
            return { success: true, autoStartEnabled: this.autoStartEnabled };
        });
        
        ipcMain.handle('reset-meeting-state', () => {
            console.log('[MeetingDetection] 🔄 Manually resetting meeting state');
            this.currentMeetingState = {
                inMeeting: false,
                platform: null,
                confidence: 0,
                startTime: null
            };
            return { success: true };
        });
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        console.log('[MeetingDetection] 🔍 Starting meeting detection...');
        this.isMonitoring = true;
        
        // Check every 5 seconds for faster response
        this.detectionInterval = setInterval(() => {
            this.detectMeetingActivity();
        }, 5000);
        
        // Initial check
        this.detectMeetingActivity();
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        console.log('[MeetingDetection] ⏹️ Stopping meeting detection...');
        this.isMonitoring = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }
    
    async isRecordingActive() {
        try {
            // Check if any Glass windows are in recording state
            const { BrowserWindow } = require('electron');
            const windows = BrowserWindow.getAllWindows();
            
            for (const window of windows) {
                if (window && !window.isDestroyed()) {
                    try {
                        const result = await window.webContents.executeJavaScript(`
                            window.sessionState && window.sessionState.isActive
                        `);
                        if (result) {
                            return true;
                        }
                    } catch (e) {
                        // Window might not have sessionState, continue
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('[MeetingDetection] Error checking recording state:', error);
            return false;
        }
    }

    async detectMeetingActivity() {
        try {
            // Skip detection if recording is already active
            const isRecording = await this.isRecordingActive();
            if (isRecording) {
                console.log('[MeetingDetection] 🎤 Recording already active, skipping detection');
                return;
            }
            
            const [runningApps, audioActivity, windowTitles] = await Promise.all([
                this.getRunningApplications(),
                this.detectAudioActivity(),
                this.getActiveWindowTitles()
            ]);

            console.log('[MeetingDetection] 🔍 Detection scan:');
            console.log('[MeetingDetection] 💻 Running apps:', runningApps.substring(0, 200) + '...');
            console.log('[MeetingDetection] 💼 Window titles:', windowTitles.substring(0, 200) + '...');
            console.log('[MeetingDetection] 🎧 Audio activity:', audioActivity.substring(0, 100) + '...');

            const meetingDetected = this.analyzeMeetingIndicators(runningApps, audioActivity, windowTitles);
            
            console.log(`[MeetingDetection] 🔄 State check - Meeting detected: ${!!meetingDetected}, Currently in meeting: ${this.currentMeetingState.inMeeting}`);
            
            if (meetingDetected && !this.currentMeetingState.inMeeting) {
                console.log('[MeetingDetection] 🎆 Triggering onMeetingDetected!');
                this.onMeetingDetected(meetingDetected);
            } else if (!meetingDetected && this.currentMeetingState.inMeeting) {
                console.log('[MeetingDetection] 🔴 Triggering onMeetingEnded!');
                this.onMeetingEnded();
            } else if (meetingDetected && this.currentMeetingState.inMeeting) {
                console.log('[MeetingDetection] ♾️ Meeting already detected, skipping trigger');
            } else {
                console.log('[MeetingDetection] ℹ️ No meeting detected, no action needed');
            }
            
        } catch (error) {
            console.error('[MeetingDetection] Error during detection:', error);
        }
    }

    getRunningApplications() {
        return new Promise((resolve, reject) => {
            // macOS: Get running applications with multiple methods
            const commands = [
                // Check running processes
                'ps aux | grep -i -E "(zoom|teams|skype|discord|slack|whatsapp|telegram|facetime|webex|meet|google chrome)"',
                // Check active applications
                'osascript -e "tell application \"System Events\" to get name of every process whose background only is false"'
            ];
            
            Promise.all(commands.map(cmd => 
                new Promise(resolve => {
                    exec(cmd, (error, stdout) => {
                        resolve(stdout || '');
                    });
                })
            )).then(results => {
                const combined = results.join('\n');
                console.log('[MeetingDetection] Running apps check:', combined.substring(0, 200) + '...');
                resolve(combined);
            }).catch(reject);
        });
    }

    detectAudioActivity() {
        return new Promise((resolve, reject) => {
            // macOS: Check multiple audio indicators
            const commands = [
                // Check audio processes
                'lsof | grep -E "(CoreAudio|AudioUnit|coreaudiod)"',
                // Check microphone usage
                'lsof | grep -i microphone',
                // Check if any app is using audio input/output
                'ps aux | grep -i -E "(audio|sound|mic)"'
            ];
            
            Promise.all(commands.map(cmd => 
                new Promise(resolve => {
                    exec(cmd, (error, stdout) => {
                        resolve(stdout || '');
                    });
                })
            )).then(results => {
                const combined = results.join('\n');
                const hasAudio = combined.length > 50; // If we have substantial audio activity
                console.log('[MeetingDetection] Audio activity detected:', hasAudio, 'bytes:', combined.length);
                resolve(combined);
            }).catch(reject);
        });
    }

    getActiveWindowTitles() {
        return new Promise((resolve, reject) => {
            // macOS: Get active window titles
            exec(`osascript -e 'tell application "System Events" to get name of (processes where background only is false)'`, 
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout || '');
                });
        });
    }

    analyzeMeetingIndicators(runningApps, audioActivity, windowTitles) {
        let confidence = 0;
        let detectedPlatform = null;
        let indicators = [];

        // Check running applications - prioritize specific matches
        let platformMatches = [];
        for (const [appKey, appInfo] of Object.entries(this.meetingPlatforms)) {
            // Check patterns in running apps and window titles
            for (const pattern of appInfo.patterns) {
                if (runningApps.toLowerCase().includes(pattern.toLowerCase()) ||
                    windowTitles.toLowerCase().includes(pattern.toLowerCase())) {
                    platformMatches.push({ name: appInfo.name, pattern, specificity: pattern.length });
                }
            }
            
            // Also check process names
            for (const process of appInfo.processes) {
                if (runningApps.toLowerCase().includes(process.toLowerCase())) {
                    platformMatches.push({ name: appInfo.name, pattern: process, specificity: process.length + 10 });
                }
            }
        }
        
        // Use the most specific match (longest pattern)
        if (platformMatches.length > 0) {
            const bestMatch = platformMatches.sort((a, b) => b.specificity - a.specificity)[0];
            confidence += 30;
            detectedPlatform = bestMatch.name;
            indicators.push(`${bestMatch.name} detected`);
        }
        
        // Simple fallback: if any meeting app is running, give it significant confidence
        const simplePatterns = ['zoom', 'teams', 'meet', 'skype', 'discord', 'slack'];
        for (const pattern of simplePatterns) {
            if (runningApps.toLowerCase().includes(pattern) || windowTitles.toLowerCase().includes(pattern)) {
                if (confidence === 0) {
                    confidence += 30; // Increased from 20 to 30
                    detectedPlatform = pattern.charAt(0).toUpperCase() + pattern.slice(1);
                    indicators.push(`${pattern} app running`);
                }
                break;
            }
        }

        // Check audio activity (indicates active call)
        if (audioActivity.length > 0) {
            confidence += 25;
            indicators.push('Audio activity detected');
        }

        // Meeting-specific window title patterns
        const meetingKeywords = ['meeting', 'call', 'conference', 'room', 'zoom', 'meet', 'teams'];
        const titleLower = windowTitles.toLowerCase();
        for (const keyword of meetingKeywords) {
            if (titleLower.includes(keyword)) {
                confidence += 15;
                indicators.push(`Meeting keyword: ${keyword}`);
                break;
            }
        }

        console.log(`[MeetingDetection] Analysis - Confidence: ${confidence}%, Platform: ${detectedPlatform}, Indicators: ${indicators.join(', ')}`);

        // Require at least 15% confidence to trigger (very aggressive)
        console.log(`[MeetingDetection] 📊 Current confidence: ${confidence}% (threshold: 15%)`);
        if (confidence >= 15) {
            return {
                platform: detectedPlatform || 'Unknown',
                confidence,
                indicators,
                timestamp: new Date()
            };
        }

        return null;
    }

    async onMeetingDetected(meetingInfo) {
        console.log(`[MeetingDetection] 🎯 Meeting detected: ${meetingInfo.platform} (${meetingInfo.confidence}% confidence)`);
        
        this.currentMeetingState = {
            inMeeting: true,
            platform: meetingInfo.platform,
            confidence: meetingInfo.confidence,
            startTime: meetingInfo.timestamp
        };

        if (this.autoStartEnabled) {
            // Automatically start listening
            console.log('[MeetingDetection] 🤖 Auto-start enabled - starting recording automatically');
            await this.autoStartListening(meetingInfo);
        } else {
            // Show prompt for manual confirmation
            console.log('[MeetingDetection] 💬 Auto-start disabled - showing prompt to user');
            this.notifyMeetingDetected(meetingInfo);
        }
    }

    onMeetingEnded() {
        console.log('[MeetingDetection] 📞 Meeting ended');
        
        this.currentMeetingState = {
            inMeeting: false,
            platform: null,
            confidence: 0,
            startTime: null
        };

        // Notify renderer process
        this.notifyMeetingEnded();
    }

    notifyMeetingDetected(meetingInfo) {
        // Send to all renderer processes (header, main windows)
        const { BrowserWindow } = require('electron');
        const windows = BrowserWindow.getAllWindows();
        console.log(`[MeetingDetection] 📡 Sending meeting-detected IPC to ${windows.length} windows`);
        
        windows.forEach((window, index) => {
            if (window.webContents) {
                console.log(`[MeetingDetection] 📤 Sending to window ${index + 1}: ${window.getTitle()}`);
                window.webContents.send('meeting-detected', {
                    platform: meetingInfo.platform,
                    confidence: meetingInfo.confidence,
                    timestamp: meetingInfo.timestamp
                });
            }
        });
    }

    notifyMeetingEnded() {
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(window => {
            if (window.webContents) {
                window.webContents.send('meeting-ended');
            }
        });
    }

    dismissMeetingPrompt() {
        console.log('[MeetingDetection] Meeting prompt dismissed by user');
        // Could implement logic to temporarily suppress prompts
    }

    async autoStartListening(meetingInfo) {
        try {
            console.log(`[MeetingDetection] 🎤 Auto-starting recording for ${meetingInfo.platform} meeting...`);
            
            // Access the global listenService to start recording
            if (global.listenService) {
                const isCurrentlyListening = global.listenService.isListening;
                
                if (!isCurrentlyListening) {
                    // Start listening automatically
                    await global.listenService.startListening();
                    console.log(`[MeetingDetection] ✅ Successfully started recording for ${meetingInfo.platform} meeting`);
                    
                    // Show a brief notification that recording started
                    this.notifyAutoRecordingStarted(meetingInfo);
                } else {
                    console.log('[MeetingDetection] 📝 Recording already active, skipping auto-start');
                }
            } else {
                console.error('[MeetingDetection] ❌ listenService not available for auto-start');
            }
        } catch (error) {
            console.error('[MeetingDetection] ❌ Failed to auto-start recording:', error);
            // Fallback to showing prompt if auto-start fails
            this.notifyMeetingDetected(meetingInfo);
        }
    }

    notifyAutoRecordingStarted(meetingInfo) {
        // Send notification that recording started automatically
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(window => {
            if (window.webContents) {
                window.webContents.send('auto-recording-started', {
                    platform: meetingInfo.platform,
                    confidence: meetingInfo.confidence,
                    timestamp: meetingInfo.timestamp
                });
            }
        });
    }
}

module.exports = MeetingDetectionService;
