// AI 和语音识别服务配置
const AI_CONFIG = {
    // 使用 Web Speech API（浏览器原生，免费）
    useBrowserSpeech: true,
    
    // OpenAI 配置（可选，需要 API Key）
    openai: {
        apiKey: 'YOUR_OPENAI_API_KEY', // 替换为你的 OpenAI API Key
        model: 'gpt-3.5-turbo',
        baseURL: 'https://api.openai.com/v1'
    },
    
    // 百度语音识别配置（可选）
    baidu: {
        apiKey: 'YOUR_BAIDU_API_KEY',
        secretKey: 'YOUR_BAIDU_SECRET_KEY'
    }
};

// 语音识别服务
class SpeechRecognitionService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.initBrowserSpeech();
    }

    // 初始化浏览器原生语音识别
    initBrowserSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'en-US'; // 英文识别
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            
            console.log('✅ 浏览器语音识别初始化成功');
        } else {
            console.warn('⚠️ 浏览器不支持语音识别');
        }
    }

    // 开始语音识别
    async startListening() {
        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject(new Error('语音识别不可用'));
                return;
            }

            this.isListening = true;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                console.log('识别结果:', transcript, '置信度:', confidence);
                
                resolve({
                    success: true,
                    text: transcript,
                    confidence: confidence
                });
                
                this.isListening = false;
            };

            this.recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                this.isListening = false;
                reject(new Error(event.error));
            };

            this.recognition.onend = () => {
                this.isListening = false;
            };

            try {
                this.recognition.start();
                console.log('🎤 开始语音识别...');
            } catch (error) {
                this.isListening = false;
                reject(error);
            }
        });
    }

    // 停止语音识别
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    // 检查浏览器是否支持
    isSupported() {
        return this.recognition !== null;
    }
}

// AI 服务（使用 OpenAI）
class AIService {
    constructor() {
        this.apiKey = AI_CONFIG.openai.apiKey;
        this.model = AI_CONFIG.openai.model;
        this.baseURL = AI_CONFIG.openai.baseURL;
    }

    // 生成学习建议
    async getLearningAdvice(word, userLevel = 'beginner') {
        if (!this.apiKey || this.apiKey === 'YOUR_OPENAI_API_KEY') {
            // 如果没有配置 API Key，返回默认建议
            return this.getDefaultAdvice(word);
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful English learning assistant for children. Provide simple, encouraging feedback.'
                        },
                        {
                            role: 'user',
                            content: `The child just learned the word "${word}". Give a short, encouraging message and a simple example sentence. Keep it under 50 words.`
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            return {
                success: true,
                advice: data.choices[0].message.content
            };
        } catch (error) {
            console.error('AI 服务错误:', error);
            return this.getDefaultAdvice(word);
        }
    }

    // 推荐下一个单词
    async getNextWord(learnedWords = [], difficulty = 'easy') {
        if (!this.apiKey || this.apiKey === 'YOUR_OPENAI_API_KEY') {
            return this.getDefaultNextWord(difficulty);
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an English vocabulary teacher for children. Suggest age-appropriate words.'
                        },
                        {
                            role: 'user',
                            content: `Suggest one ${difficulty} English word for a child to learn. Already learned: ${learnedWords.join(', ')}. Only return the word, nothing else.`
                        }
                    ],
                    max_tokens: 10,
                    temperature: 0.8
                })
            });

            const data = await response.json();
            const word = data.choices[0].message.content.trim().toLowerCase();
            
            return {
                success: true,
                word: word
            };
        } catch (error) {
            console.error('AI 服务错误:', error);
            return this.getDefaultNextWord(difficulty);
        }
    }

    // 评估发音质量（基于置信度）
    evaluatePronunciation(recognizedText, targetWord, confidence) {
        const normalized1 = recognizedText.toLowerCase().trim();
        const normalized2 = targetWord.toLowerCase().trim();
        
        let score = 0;
        let feedback = '';

        if (normalized1 === normalized2) {
            score = Math.round(confidence * 100);
            if (score >= 90) {
                feedback = '🌟 Perfect! Great pronunciation!';
            } else if (score >= 70) {
                feedback = '👍 Good job! Keep practicing!';
            } else {
                feedback = '💪 Nice try! Let\'s practice more!';
            }
        } else {
            score = 30;
            feedback = `🎯 Try again! You said "${recognizedText}", but the word is "${targetWord}".`;
        }

        return {
            score,
            feedback,
            isCorrect: normalized1 === normalized2
        };
    }

    // 默认建议（无 API 时使用）
    getDefaultAdvice(word) {
        const adviceTemplates = [
            `Great job learning "${word}"! 🎉`,
            `You're doing amazing with "${word}"! Keep it up! 💪`,
            `Wonderful! "${word}" is now in your vocabulary! 🌟`,
            `Fantastic! You've mastered "${word}"! 🎊`
        ];
        
        const randomAdvice = adviceTemplates[Math.floor(Math.random() * adviceTemplates.length)];
        
        return {
            success: true,
            advice: randomAdvice
        };
    }

    // 默认单词推荐（无 API 时使用）
    getDefaultNextWord(difficulty = 'easy') {
        const wordsByDifficulty = {
            easy: ['cat', 'dog', 'ball', 'sun', 'tree', 'book', 'apple', 'star', 'fish', 'bird'],
            medium: ['elephant', 'butterfly', 'rainbow', 'ocean', 'mountain', 'garden', 'flower', 'rabbit'],
            hard: ['adventure', 'wonderful', 'beautiful', 'fantastic', 'magnificent', 'incredible']
        };

        const words = wordsByDifficulty[difficulty] || wordsByDifficulty.easy;
        const randomWord = words[Math.floor(Math.random() * words.length)];

        return {
            success: true,
            word: randomWord
        };
    }
}

// 语音合成服务（文字转语音）
class TextToSpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.loadVoices();
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        
        if (this.voices.length === 0) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }
    }

    // 朗读单词
    speak(text, lang = 'en-US') {
        return new Promise((resolve, reject) => {
            if (!this.synth) {
                reject(new Error('语音合成不可用'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9; // 稍慢一点，便于学习
            utterance.pitch = 1.1; // 稍高一点，更适合儿童

            // 选择英文语音
            const enVoice = this.voices.find(voice => voice.lang.startsWith('en'));
            if (enVoice) {
                utterance.voice = enVoice;
            }

            utterance.onend = () => {
                resolve({ success: true });
            };

            utterance.onerror = (error) => {
                reject(error);
            };

            this.synth.speak(utterance);
        });
    }

    // 停止朗读
    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }
}

// 初始化服务
const speechRecognition = new SpeechRecognitionService();
const aiService = new AIService();
const textToSpeech = new TextToSpeechService();

// 导出全局 API
window.MagicPetAI = {
    // 语音识别
    startListening: () => speechRecognition.startListening(),
    stopListening: () => speechRecognition.stopListening(),
    isSpeechSupported: () => speechRecognition.isSupported(),
    
    // AI 服务
    getLearningAdvice: (word, level) => aiService.getLearningAdvice(word, level),
    getNextWord: (learnedWords, difficulty) => aiService.getNextWord(learnedWords, difficulty),
    evaluatePronunciation: (recognized, target, confidence) => aiService.evaluatePronunciation(recognized, target, confidence),
    
    // 语音合成
    speakWord: (text, lang) => textToSpeech.speak(text, lang),
    stopSpeaking: () => textToSpeech.stop()
};

console.log('✅ AI 和语音服务初始化完成');
