// js/music-logic.js

const musicLogic = (() => {
    // A simplified database of lick fragments.
    // In a real app, this would be vastly larger and more complex.
    // Intervals are relative to the chord root. Rhythm is vexflow duration ('8' = eighth, '16' = sixteenth)
    const lickFragments = [
        {
            description: "Diatonic Scale Run Down",
            pattern: [7, 6, 5, 4, 3, 2, 1, 0], // Scale degrees
            rhythm: ['8', '8', '8', '8', '8', '8', '8', '8'],
            tags: ['diatonic', 'scale']
        },
        {
            description: "Arpeggio 1-3-5-7",
            pattern: [0, 2, 4, 6], // Chord scale degrees
            rhythm: ['8', '8', '8', '8'],
            tags: ['diatonic', 'arpeggio']
        },
        {
            description: "Bebop Enclosure on the 3rd",
            pattern: [3, 2, 1, 2], // Chromatic and diatonic steps around the 3rd
            rhythm: ['16', '16', '16', '16'],
            tags: ['bebop', 'chromatic', 'enclosure']
        },
        {
            description: "Bebop Scale Fragment (Dominant)",
            pattern: [8, 7, 6, 5, 4, 3, 2, 1],
            rhythm: ['8', '8', '8', '8', '8', '8', '8', '8'],
            tags: ['bebop', 'diatonic', 'scale']
        },
        {
            description: "Blues Pentatonic Lick",
            pattern: [0, 'b3', 4, 5, 'b7'], // Using 'b3', etc for blues color
            rhythm: ['8', '8t', '8t', '8t', '8'], // 8t for triplet
            tags: ['blues', 'pentatonic']
        },
        {
            description: "Altered Dominant Lick (b9, #9)",
            pattern: ['b9', '#9', 6, 4],
            rhythm: ['8', '8', '8', '8'],
            tags: ['altered', 'bebop']
        },
        {
            description: "Chromatic Approach to Root",
            pattern: [-1, 1, 0],
            rhythm: ['16', '16', '8'],
            tags: ['bebop', 'chromatic']
        },
    ];

    // Maps chord names to their root note and type
    const chordInfo = {
        'Dm7': { root: 'D', type: 'minor' },
        'G7': { root: 'G', type: 'dominant' },
        'Cmaj7': { root: 'C', type: 'major' },
        'Bm7b5': { root: 'B', type: 'half-diminished'},
        'E7': { root: 'E', type: 'dominant'},
        'Am7': { root: 'A', type: 'minor'},
        'F7': { root: 'F', type: 'dominant' },
        'Bb7': { root: 'Bb', type: 'dominant' },
    };

    // Note name to MIDI value map for audio playback
    const noteToMidi = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
        'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    // A simple diatonic scale map
    const diatonicScales = {
        major: [0, 2, 4, 5, 7, 9, 11],
        minor: [0, 2, 3, 5, 7, 8, 10], // Natural minor for simplicity
        dominant: [0, 2, 4, 5, 7, 9, 10], // Mixolydian
        'half-diminished': [0, 2, 3, 5, 6, 8, 10] // Locrian
    };

    // The main generative function
    function generateLick(progression, settings) {
        let fullLick = [];
        const chords = progression.split('-');

        chords.forEach(chordName => {
            const info = chordInfo[chordName];
            if (!info) return;

            // 1. Create a weighted pool of fragments based on settings
            const weightedPool = [];
            lickFragments.forEach(fragment => {
                let weight = 1;
                if (fragment.tags.includes('bebop')) weight += settings.bebop;
                if (fragment.tags.includes('blues')) weight += settings.blues;
                if (fragment.tags.includes('altered')) weight += settings.altered;
                if (fragment.tags.includes('diatonic')) weight += (100 - (settings.altered));

                // Add fragment to the pool multiple times based on weight
                for (let i = 0; i < Math.floor(weight / 20); i++) {
                    weightedPool.push(fragment);
                }
            });

            // 2. Pick a random fragment from the weighted pool
            const chosenFragment = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            
            // 3. Translate the pattern to actual notes
            const rootMidi = noteToMidi[info.root] + 60; // Start at C4 octave
            const scale = diatonicScales[info.type];

            const notes = chosenFragment.pattern.map((interval, i) => {
                let midiValue;
                if (typeof interval === 'number') { // Scale degree or chromatic offset
                     if (Math.abs(interval) < 8) { // treat as scale degree
                        const scaleIndex = (interval + 7) % 7;
                        midiValue = rootMidi + scale[scaleIndex];
                    } else { // treat as large interval (bebop scale)
                        // Simplified: find closest scale tone
                        const scaleIndex = (interval - 1 + 7) % 7;
                        midiValue = rootMidi + scale[scaleIndex] + 12; // Octave up
                    }
                } else { // Altered tone like 'b9' or 'b3'
                    let baseInterval;
                    switch(interval) {
                        case 'b3': baseInterval = 3; break;
                        case 'b7': baseInterval = 10; break;
                        case 'b9': baseInterval = 13; break;
                        case '#9': baseInterval = 15; break;
                    }
                    midiValue = rootMidi + baseInterval;
                }
                
                // Find note name for the midi value
                const noteName = midiToNote(midiValue);

                return {
                    pitch: noteName.name + "/" + noteName.octave,
                    duration: chosenFragment.rhythm[i] || '8'
                };
            });
            fullLick = fullLick.concat(notes);
        });

        return fullLick;
    }

    // Helper to convert MIDI back to a note name object
    function midiToNote(midi) {
        const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const name = pitchClasses[midi % 12];
        return { name, octave };
    }

    // Public API
    return {
        generateLick,
        noteToMidi,
        midiToNote
    };

})();
