
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

const { audioContext, stream, analyser } = await initAudio();

// chunks of audio in an array of Float32Arrays
let audioChunks = [];

async function initAudio() {
    try {
        // Request access to the microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create an audio context - this is the main interface for audio processing
        const audioContext = new AudioContext();

        // The sample rate depends on the user's hardware, usually 44100 Hz or 48000 Hz
        console.log(`Recording at ${audioContext.sampleRate} Hz`);

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        // Size of the FFT window
        // The time domain data buffer length will be half this value
        analyser.fftSize = fftSize;

        // Connect the source node to the analyzer node
        // This creates a chain of nodes where audio flows from the source to the analyzer
        source.connect(analyser);

        console.log(`Processing ${analyser.frequencyBinCount} samples at a time`);

        return { audioContext, stream, analyser };

    } catch (error) {
        alert("Error accessing microphone:" + error);
    }
}


function startRecording() {
    state = RECORDING;

    // Reset recorded data
    audioChunks = [];

    // This function will be called repeatedly to collect samples while recording
    function collectSamples() {
        if (state !== RECORDING || !audioContext ) {
            return;
        }

        // create a new buffer for the time domain data since the previous call
        const nextChunk = new Float32Array(analyser.frequencyBinCount);

        // write the most recent frequencyBinCount time domain samples into the chunk
        // from the internal rolling buffer in the analyzer.
        //
        // this means we either skip samples or duplicate samples depending on
        // the fps of the browser:
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

function startPlayback() {
    state = PLAYBACK;

    // TODO
}


