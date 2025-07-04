// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // VexFlow setup
    const { Factory, EasyScore, System } = Vex.Flow;

    // DOM Elements
    const progressionSelect = document.getElementById('progression-select');
    const generateBtn = document.getElementById('generate-btn');
    const playBtn = document.getElementById('play-btn');
    const notationContainer = document.getElementById('notation-container');
    
    const dials = {
        bebop: document.getElementById('bebop-dial'),
        blues: document.getElementById('blues-dial'),
        altered: document.getElementById('altered-dial'),
    };
    const valueSpans = {
        bebop: document.getElementById('bebop-value'),
        blues: document.getElementById('blues-value'),
        altered: document.getElementById('altered-value'),
    };
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoValue = document.getElementById('tempo-value');
    
    let currentLick = [];

    // Update dial percentage text
    Object.keys(dials).forEach(key => {
        dials[key].addEventListener('input', (e) => {
            valueSpans[key].textContent = `${e.target.value}%`;
        });
    });
    
    // Update tempo text
    tempoSlider.addEventListener('input', e => {
        tempoValue.textContent = e.target.value;
    });

    // Generate Lick Button Event
    generateBtn.addEventListener('click', () => {
        const progression = progressionSelect.value;
        const settings = {
            bebop: parseInt(dials.bebop.value, 10),
            blues: parseInt(dials.blues.value, 10),
            altered: parseInt(dials.altered.value, 10),
        };

        currentLick = musicLogic.generateLick(progression, settings);
        renderNotation(currentLick);
        playBtn.disabled = false;
    });
    
    // Play Button Event
    playBtn.addEventListener('click', () => {
        const tempo = parseInt(tempoSlider.value, 10);
        playLick(currentLick, tempo);
    });

    // Render notation using VexFlow
    function renderNotation(notes) {
        notationContainer.innerHTML = '';
        const vf = new Factory({
            renderer: { elementId: 'notation-container', width: 800, height: 150 }
        });
        const score = vf.EasyScore();
        const system = vf.System();

        // Format notes for EasyScore
        const vexNotes = notes.map(note => {
            let vexNote = `${note.pitch}/${note.duration}`;
            if (note.duration.includes('t')) {
                // Handle triplets by adding options
                vexNote += `[options="{'type':'T'}"]`;
            }
            return vexNote;
        }).join(', ');
        
        // Add staves and notes
        system.addStave({
            voices: [
                score.voice(score.notes(vexNotes, { stem: 'up' })),
            ]
        }).addClef('treble').addTimeSignature('4/4');

        // Add tablature
        system.addStave({
            voices: [
                score.voice(score.tabNotes(vexNotes))
            ]
        }).addClef('tab');

        // Draw everything
        vf.draw();
    }

    // Playback using Web Audio API
    let audioContext;
    function playLick(notes, tempo) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const quarterNoteTime = 60 / tempo;
        let currentTime = audioContext.currentTime;

        notes.forEach(note => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Calculate frequency from MIDI
            const pitchParts = note.pitch.split('/');
            const noteName = pitchParts[0];
            const octave = parseInt(pitchParts[1], 10);
            const midiNote = musicLogic.noteToMidi[noteName.toUpperCase().replace('#', 's').replace('B', 'b')] + (octave + 1) * 12;
            oscillator.frequency.value = 440 * Math.pow(2, (midiNote - 69) / 12);
            
            // Calculate duration
            let duration = quarterNoteTime; // Default to quarter
            const noteType = parseInt(note.duration.replace('t',''), 10);
            if (noteType === 8) duration = quarterNoteTime / 2;
            if (noteType === 16) duration = quarterNoteTime / 4;
            
            if(note.duration.includes('t')) {
                duration *= (2/3);
            }

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Simple envelope
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, currentTime + duration * 0.9);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);

            currentTime += duration;
        });
    }
});
