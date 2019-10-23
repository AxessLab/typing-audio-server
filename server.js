const textToSpeech = require('@google-cloud/text-to-speech');

const fs = require('fs'); // 'memfs' could be used instead, for clearing files on each run, instead of each reboot
const uuid = require('uuid/v4');

const express = require('express');
const logger = require('morgan');

const app = express();
const client = new textToSpeech.TextToSpeechClient(); // Google requires that you set up an environment variable that points to your credentials file

// Add middleware
app.use(logger('dev')); // Logger with nice colored terminal output
app.use('/assets', express.static('assets')); // Static content server TODO: Remove this. Assets should not be commited, but rather stored in object storage

// Send error in case of error
// TODO: Add proper logging
app.use((err, req, res, next) => {
  console.error(err.message);
  console.error(err.stack);
  // TODO: Will error handling inherit the content type from the throwing handler?
  res.sendStatus(500);
});


const textToFile = new Map(); // We map (text input + parameters) to files on disk

// TODO: I suppose this could be error handled better, but let's not bother
app.get('/speech', (req, res) => {

  // User specifies codec, we translate that into API input and mimetype
  const encodings = new Map([
    ['OPUS', { parameter: 'OPUS', request: 'OGG_OPUS', mime: 'audio/ogg' }],
    ['MP3', { parameter: 'MP3', request: 'MP3', mime: 'audio/mpeg' }],
    ['PCM', { parameter: 'PCM', request: 'LINEAR16', mime: 'audio/wav' }]
  ]);

  let encoding = encodings.get('OPUS'); // Set default encoding
  if (req.query.encoding) encoding = encodings.get(req.query.encoding.toUpperCase()) || encoding; // Set new encoding from user input
  res.set('Content-Type', encoding.mime); // Set HTTP response content type

  // Supported voices and languages: https://cloud.google.com/text-to-speech/docs/voices
  const [rate, pitch] =  [req.query.rate, req.query.pitch];
  const [language, voice] = [req.query.language || 'sv-SE', req.query.voice || 'sv-SE-Wavenet-A'];
  const gender = req.query.gender && req.query.gender.length > 0 && req.query.gender.toUpperCase()[0] === 'M' ? 'MALE' : 'FEMALE';

  const text = req.query.text || '?';
  const parameters = [encoding.parameter, language, voice, gender, rate, pitch].join('_');
  const fileName = textToFile.get(`${text}_${parameters}`); // Check if text with those parameters exists

  // Send file if found
  if (fileName) {
    console.log(`File found for text '${text}' with '${parameters}'`);
    res.sendFile(`/tmp/${fileName}`);

  // Generate file with those parameters if not found
  } else {
    console.log(`Requesting file with text '${text}' and '${parameters}'`);
    const newFileName = uuid(); // We'll just use UUID so that we won't have to deal with malicious text input

    // Request speech from Google Cloud TTS API
    client.synthesizeSpeech({
      input: {
        text: text // There's also a thing called 'ssml' if we want to control ~how~ something should be read out
      },
      voice: {
        languageCode: language,
        name: voice,
        ssmlGender: gender
      },
      audioConfig: {
        speakingRate: rate, // These will not be present in the JSON if undefined, since JSON doesn't support undefined as a type
        pitch: pitch,
        audioEncoding: encoding.request
      }
    }).then(response => {
      fs.writeFile(`/tmp/${newFileName}`, response[0].audioContent, 'binary', (error) => {
        if (error) throw error;

        console.log(`Sending file with text '${text}' and '${parameters}'`);
        textToFile.set(`${text}_${parameters}`, newFileName);
        res.sendFile(`/tmp/${newFileName}`);
      });
    })
    .catch(error => { throw error });
  }

});


// Start server
const [address, port] = [process.env.ADDRESS || '0.0.0.0', process.env.PORT || '3000'];
app.listen(port, address, () => console.log('API running on ' + address + ':' + port));
