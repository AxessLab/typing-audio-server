# TTS Audio Server

To get started with running the server, you first need to [follow this guide](https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries). You'll need to download your API credentials as a JSON file, and then store them somewhere securely. Then you need to set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to point to that file. Alternatively, you could skip this, and only set the variable when running the command to start the application.

Here's how to start it:

1. Install dependencies: `npm i`
2. Start the application: `GOOGLE_APPLICATION_CREDENTIALS=/home/username/.secret/google.json npm start`
