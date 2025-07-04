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
        if (notes.length === 0) {
             notationContainer.innerHTML = '<p class="placeholder-text">Could not generate a lick with current settings. Try adjusting the dials!</p>';
             return;
        }

        const vf = new Factory({
            renderer: { elementId: 'notation-container', width: 800, height: 150 }
        });
        const score = vf.EasyScore();

        // Create VexFlow notes string, handling accidentals properly
        const vexNotesString = notes.map(note => {
            const pitch = note.pitch.toLowerCase().replace('#', '##'); // Vexflow needs '##' for sharp
            return `${pitch}/${note.duration}`;
        }).join(', ');
        
        const chords = progressionSelect.value.split('-').slice(0, 3).map(key => chordMap[key]).join(' | ');

        const system = vf.System();
        system.addStave({
            voices: [
                score.voice(score.notes(vexNotesString, { stem: 'up' }))
            ]
        }).addClef('treble').addTimeSignature('4/4');

        // Add tablature
        const tabStave = system.addStave({
            voices: [
                score.voice(score.tabNotes(vexNotesString))
            ]
        }).addClef('tab');
        
        // This is a placeholder for chord symbols. A real implementation would be more complex.
        const chordsInProg = progressionData[progressionSelect.value].chords;
        // Simplified chord placement
        vf.text(chordsInProg.join('       '), Vex.Flow.TextNote.Justification.LEFT, -15);


        vf.draw();
    }
    
    // Mapping for chord symbols above staff
    const progressionData = {
        "ii-V-I-C": { chords: ['Dm7', 'G7', 'Cmaj7']},
        "ii-V-i-A": { chords: ['Bm7b5', 'E7', 'Am7']},
        "blues-F": { chords: ['F7', 'Bb7', 'F7', 'F7']}
    };


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

            // Use Tonal.js to get MIDI number from pitch string (e.g., "C#4")
            const midiNote = Tonal.Note.midi(note.pitch);
            if (!midiNote) return; // Skip if note is invalid

            oscillator.frequency.value = Tonal.Note.freq(note.pitch);
            
            // Calculate duration
            let duration = quarterNoteTime; // Default
            const noteType = parseInt(note.duration.replace('t', ''), 10);
            if (noteType === 8) duration = quarterNoteTime / 2;
            else if (noteType === 16) duration = quarterNoteTime / 4;
            else if (noteType === 4) duration = quarterNoteTime;

            if (note.duration.includes('t')) {
                duration *= (2/3);
            }
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Simple ADSR-like envelope
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration * 0.9);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);

            currentTime += duration;
        });
    }
});
