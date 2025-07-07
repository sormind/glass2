#!/usr/bin/env node

// Simple test script to verify meeting detection works
const { exec } = require('child_process');

console.log('🧪 Testing Meeting Detection...\n');

// Test 1: Check if Zoom is running
console.log('1. Checking for Zoom processes...');
exec('ps aux | grep -i zoom | grep -v grep', (error, stdout, stderr) => {
    if (stdout) {
        console.log('✅ Zoom processes found:');
        console.log(stdout.split('\n').slice(0, 3).join('\n'));
    } else {
        console.log('❌ No Zoom processes detected');
    }
    
    // Test 2: Check audio activity
    console.log('\n2. Checking audio activity...');
    exec('lsof | grep -E "(CoreAudio|AudioUnit)" | head -3', (error, stdout, stderr) => {
        if (stdout) {
            console.log('✅ Audio activity detected:');
            console.log(stdout);
        } else {
            console.log('❌ No audio activity detected');
        }
        
        // Test 3: Check running applications
        console.log('\n3. Checking running applications...');
        exec('osascript -e "tell application \\"System Events\\" to get name of every process whose background only is false"', (error, stdout, stderr) => {
            if (stdout) {
                const apps = stdout.split(', ').filter(app => 
                    app.toLowerCase().includes('zoom') || 
                    app.toLowerCase().includes('meet') ||
                    app.toLowerCase().includes('teams') ||
                    app.toLowerCase().includes('discord')
                );
                
                if (apps.length > 0) {
                    console.log('✅ Meeting apps found:', apps.join(', '));
                } else {
                    console.log('❌ No meeting apps detected in active processes');
                }
            } else {
                console.log('❌ Could not get running applications');
            }
            
            console.log('\n🎯 Test complete! If you\'re in a Zoom meeting, the detection should trigger within 5 seconds.');
        });
    });
});
