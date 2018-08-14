const stream = require('stream')
const Duplex = stream.Duplex
const recorder = require('node-record-lpcm16')
const fs = require('fs')

class DuplexStream extends Duplex {
  constructor(options) {
    super(options)
    this.waiting = false
  }

  _write(chunk, encoding, callback) {
    this.waiting = false
    this.push(chunk)
    callback()
  }

  _read(size) {
    if(!this.waiting) {
      this.waiting = true
    }
  }
}

class MicrophoneStream {
  constructor(encoding, sampleRate) {
      this.encoding = encoding
      this.sampleRate = sampleRate
  }

  start(){
    this.setupBuffer()
    this.rec = recorder.start({
      sampleRate: this.sampleRate,
      verbose: false,
      recordProgram: 'rec',
      silence: '10.0',
      threshold: 0
    })
    .on('error', console.error)
    .pipe(this.buffer)
  }

  stop(){
    this.rec.unpipe(this.buffer)
    recorder.stop()
  }

  audio(){
    return this.buffer
  }

  setupBuffer() {
    var bytesPerSample = 2 * NUM_CHANNELS
    var bytesPerSecond = this.sampleRate * bytesPerSample
    this.buffer = new DuplexStream()
  }
}

const speech = require('@google-cloud/speech')

const DEFAULT_ENCODING = 'LINEAR16'
const DEFAULT_SAMPLE_RATE_IN_HERTZ = 16000
const DEFAULT_LANGUAGE_CODE = 'hi-IN'
const MAX_API_TIME_LIMIT_IN_MS = 60000
const NUM_CHANNELS = 1
const NUM_CHUNKS_PER_INTERVAL = 10
const SLIDING_WINDOW_BUFFER_SECS = 10
const OUT_OF_RANGE_ERROR_CODE = 11

class SpeechToText {

  constructor(microphoneStream, languageCode) {
    this.client = new speech.SpeechClient()
    this.mic = microphoneStream
    this.encoding = microphoneStream.encoding
    this.sampleRate = microphoneStream.sampleRate
    this.isTranscribing = false
    this.config = {
      config: {
        encoding: this.encoding,
        sampleRateHertz: this.sampleRate,
        languageCode: languageCode
      },
      interimResults: true
    }
    this.initializeStream()
  }

  handle_reconnect_error(error) {
    if(error.code == OUT_OF_RANGE_ERROR_CODE) {
      this.initializeStream()
      if(this.isTranscribing) {
        this.transcribe()
      }
    }
    else {
      console.error
    }
  }

  initializeStream() {
    this.stream = this.client
                        .streamingRecognize(this.config)
                        .on('error', (error) => this.handle_reconnect_error(error))
                        .on('data',  (data) => this.print_transcribed_text(data))
  }

  transcribe(){
    if(this.mic && this.mic.audio()) {
      this.isTranscribing = true
      this.mic.audio().pipe(this.stream)
    }
  }

  print_transcribed_text(data) {
    if(data.results[0] && data.results[0].alternatives[0]) {

      if(data.results[0].isFinal) {
        process.stdout.write(data.results[0].alternatives[0].transcript + "\n")
      }
      else {
        process.stdout.write(data.results[0].alternatives[0].transcript + "\r")
      }
    }
  }

}

const argv = require('yargs')
              .alias('h', 'help')
              .help('help')
              .usage('Usage: $0 [-e encoding] [-r sample_rate_in_hz] [-l language_code_BCP-47]')
              .showHelpOnFail(false, "Specify --help for help with command usage")
              .options({
                e: {
                  alias: 'encoding',
                  describe: 'encoding type',
                  type: 'string',
                  default: DEFAULT_ENCODING
                },
                r: {
                  alias: 'samplerate',
                  describe: 'sample rate in Hertz',
                  type: 'number',
                  default: DEFAULT_SAMPLE_RATE_IN_HERTZ
                },
                l: {
                  alias: 'languagecode',
                  describe: 'BCP-47 language code',
                  type: 'string',
                  default: DEFAULT_LANGUAGE_CODE
                }
              }).argv

process.stdout.write(`Config:\n  encoding: ${argv.e}\n  sample rate: ${argv.r}\n  language code: ${argv.l}\n`)
process.stdout.write(`Transcript:\n`)
var microphoneStream = new MicrophoneStream(argv.e, argv.r)
microphoneStream.start()
var speechToTextClient = new SpeechToText(microphoneStream, argv.l)
speechToTextClient.transcribe()
