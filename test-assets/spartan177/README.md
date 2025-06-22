# Spartan 177 Test Assets

This directory contains all the default test files required for the **Spartan 177** interactive tour feature.

## 📁 Required Files

### Images
- `test_image_technical.png` - Technical diagram for analysis testing
- `test_image_photo.jpg` - Regular photo for general image analysis
- `test_image_code.png` - Screenshot of code for OCR testing

### Audio Files
- `test_audio_speech.mp3` - Clear speech sample for transcription demo
- `test_audio_music.mp3` - Music sample for content analysis
- `test_audio_technical.wav` - Technical presentation audio

### Video Files
- `test_video_demo.mp4` - Short demo video for analysis
- `test_video_presentation.mp4` - Technical presentation sample

### Documents
- `test_document.pdf` - Sample PDF with mixed content
- `test_code_file.js` - JavaScript file for code analysis
- `test_data.csv` - Data file for processing demo

### Code Samples
- `large_code_sample.py` - Large Python file to test attachment fallback
- `complex_algorithm.cpp` - Complex C++ code for analysis
- `web_component.tsx` - React component for frontend demo

## 🎯 Usage

These files are automatically loaded during the Spartan 177 interactive tour when users don't provide their own test files. The tour system will:

1. Check if user uploaded files are available
2. Fall back to these default files if no user files provided
3. Use these files to demonstrate specific capabilities

## 📝 File Requirements

- **Images**: Should be diverse (technical diagrams, photos, code screenshots)
- **Audio**: Different types (speech, music, technical content)
- **Video**: Various content types for comprehensive testing
- **Documents**: Mixed formats to test file processing capabilities
- **Code**: Different languages and complexity levels

## 🔧 Implementation Note

When implementing the Spartan 177 feature, ensure the tour system can gracefully handle missing files and provide meaningful demonstrations even with placeholder content. 