# transcribe-live-audio
Transcribe live audio using Google Cloud Speech to Text API

The script provides a workaround for the 60s time limit restriction posed by Google Cloud Speech to Text API. 

#### Solution Approach
The script stages the the audio/microphone input into a buffer before transcribing the "audio chunks" from the buffer using the API. That way, when the existing API client returns a time out error it is simply reinitialized and the new client will continue transcribing the audio from the buffer. 

![Solution Approach](https://user-images.githubusercontent.com/20769938/44086324-cd92736e-9fd9-11e8-8f48-4165fcfeabe6.png)

#### To run the demo

##### Install dependencies
```
npm install 
```
##### Show help
```
node transcribe.js -h
```

### Example
```
node transcribe.js -e LINEAR16 -r 16000 -l hi-IN 
```
