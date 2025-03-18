
// LOADED state is only when the page is first loaded, before the recoding button is pressed
const LOADED = 1;

// Enter RECORDING state when the recording button is pressed
const RECORDING = 2;

// Enter PLAYBACK immediately when the recording is stopped; there's no
// no way to go back to the LOADED state again
const PLAYBACK = 3;

let state = LOADED;

// The size of the FFT window
// The actual buffer length will be half this value
// assuming 44100 Hz sample rate, this means 1024 samples in the buffer,
// which is 23ms of audio
const fftSize = 2048;
// set by initAudio()
let audioContext;
let stream;
let analyser;

// chunks of audio in an array of Float32Arrays
let audioChunks = [];

// Initialize recording button and status text
const recordButton = document.getElementById('recordButton');
const buttonText = document.getElementById('buttonText');
const buttonIcon = document.getElementById('buttonIcon');
const statusText = document.getElementById('statusText');

document.addEventListener('DOMContentLoaded', async () => {
    const audioSetup = await initAudio();
    if (audioSetup) {
        audioContext = audioSetup.audioContext;
        stream = audioSetup.stream;
        analyser = audioSetup.analyser;
    }

    recordButton.addEventListener('click', toggleRecording);
});

async function initAudio() {
    try {
        // Request access to the microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = fftSize;

        source.connect(analyser);

        console.log(`Recording ${audioContext.sampleRate} Hz, ${analyser.frequencyBinCount} samples at a time`);
        return { audioContext, stream, analyser };

    } catch (error) {
        alert("Error accessing microphone:" + error);
    }
}



async function toggleRecording() {
    if (state === RECORDING) {
        state = PLAYBACK;
        recordButton.className = 'playback';
        buttonText.textContent = 'Record Again';
        buttonIcon.textContent = '🎙️';
        return;
    } else {
        state = RECORDING;
        recordButton.className = 'recording';
        buttonText.textContent = 'Stop Recording';
        buttonIcon.textContent = '⏹️';
    }

    // Reset recorded data
    audioChunks = [];
    const startTime = performance.now();

    // This function will be called repeatedly to collect samples while recording
    function collectSamples() {
        if (!audioContext || !analyser) {
            return;
        }
        const elapsedSeconds= (performance.now() - startTime) / 1000;

        if (state !== RECORDING) {
            // we've stopped recording
            const message = "Recorded " + audioChunks.length + " chunks in " + elapsedSeconds.toFixed(2)
                + " seconds ("
                + (audioChunks.length / elapsedSeconds).toFixed(2) + " FPS)";
            console.log(message);
            statusText.textContent = message;
            return;
        }
        statusText.textContent = `Recording: ${elapsedSeconds.toFixed(1)} seconds`;

        // create a new buffer for the time domain data since the previous call
        const nextChunk = new Float32Array(analyser.frequencyBinCount);

        // copy the most recent frequencyBinCount time domain samples into the chunk
        // from the internal rolling buffer in the analyzer.
        //
        // this either skips or duplicates samples depending on FPS.
        // e.g. if the fps is 60 then we'll get a sample every 17ms, and
        // if the buffer is 1024 samples at 44100 Hz then we'll get 23ms of audio, so each buffer
        // will overlap a bit with the previous buffer.
        analyser.getFloatTimeDomainData(nextChunk);

        // append the new chunk to the array of chunks
        audioChunks.push(nextChunk);

        // Schedule the next collection
        requestAnimationFrame(collectSamples);
    }

    // Start the sample collection process
    collectSamples();
}

