import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Tts from 'react-native-tts';

const requestMicrophonePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs access to your microphone for speech recognition.',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

const TextSpeechScreen = () => {
  const [textToSpeak, setTextToSpeak] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const webviewRef = useRef(null);

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  const handleSpeak = () => {
    if (textToSpeak.trim().length > 0) {
      Tts.speak(textToSpeak);
    }
  };

  const onMessage = (event) => {
    const message = event.nativeEvent.data;
    setRecognizedText(message);
  };

  const speechToTextHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        button {
          width: 80%;
          height: 60px;
          font-size: 24px;
          background-color: #2980b9;
          color: white;
          border: none;
          border-radius: 10px;
          outline: none;
        }
        #result {
          margin-top: 20px;
          font-size: 20px;
          min-height: 50px;
          color: #333;
          text-align: center;
          word-wrap: break-word;
        }
      </style>
    </head>
    <body>
      <button id="speakBtn">Hold to Speak</button>
      <div id="result"></div>

      <script>
        const speakBtn = document.getElementById('speakBtn');
        const resultDiv = document.getElementById('result');
        let recognition;
        let recognizing = false;

        if (!('webkitSpeechRecognition' in window)) { 
          // checks if the browser supports the webkitSpeechRecognition API
          resultDiv.innerHTML = "Speech Recognition not supported";
          speakBtn.disabled = true;
        } else {
          recognition = new webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onstart = () => {
            recognizing = true;
            speakBtn.style.backgroundColor = '#e74c3c';
            speakBtn.textContent = 'Listening...';
            resultDiv.textContent = '';
          };

          recognition.onend = () => {
            recognizing = false;
            speakBtn.style.backgroundColor = '#2980b9';
            speakBtn.textContent = 'Hold to Speak';
          };

          recognition.onerror = (event) => {
            recognizing = false;
            speakBtn.style.backgroundColor = '#2980b9';
            speakBtn.textContent = 'Hold to Speak';
            resultDiv.textContent = 'Error: ' + event.error;
            window.ReactNativeWebView.postMessage('');
          };

          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            resultDiv.textContent = transcript;
            // window.ReactNativeWebView.postMessage(transcript);
          };
        }

        speakBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (!recognizing) {
            recognition.start();
          }
        });

        speakBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          if (recognizing) {
            recognition.stop();
          }
        });

        speakBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          if (!recognizing) {
            recognition.start();
          }
        });
        speakBtn.addEventListener('mouseup', (e) => {
          e.preventDefault();
          if (recognizing) {
            recognition.stop();
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.heading}>Text to Speech</Text>
        <TextInput
          style={styles.input}
          placeholder="Type text here..."
          value={textToSpeak}
          onChangeText={setTextToSpeak}
        />
        <TouchableOpacity style={styles.button} onPress={handleSpeak}>
          <Text style={styles.buttonText}>Speak</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>Speech to Text</Text>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: speechToTextHTML }}
          onMessage={onMessage}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
          onPermissionRequest={(event) => {
            event.grant();
          }}
        />
        {recognizedText ? (
          <Text style={styles.recognizedText}>{recognizedText}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  box: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#2980b9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2980b9',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  recognizedText: {
    marginTop: 10,
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
  },
});

export default TextSpeechScreen;