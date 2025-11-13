// AI 和语音识别服务配置
const AI_CONFIG = {
    // 语音识别模式选择：'browser' 或 'minimax'
    speechMode: 'minimax', // Minimax Speech-01 高精度模式（需要配置 API Key）
    
    // 后端 API 代理配置（安全）
    apiProxy: {
        speechUrl: '/api/whisper', // 后端代理接口，不暴露 API Key
    },
    
    // Minimax 识别配置
    minimax: {
        language: 'en', // 识别语言：en, zh
        model: 'speech-01' // Minimax 语音模型
    }
};

// 语音识别服务（支持浏览器原生和 Whisper API）
class SpeechRecognitionService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.mode = AI_CONFIG.speechMode;
        
        if (this.mode === 'browser') {
            this.initBrowserSpeech();
        }
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

    // 开始语音识别（自动选择模式）
    async startListening() {
        if (this.mode === 'minimax') {
            return await this.startMinimaxRecognition();
        } else {
            return await this.startBrowserRecognition();
        }
    }

    // 浏览器原生语音识别
    async startBrowserRecognition() {
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

    // Minimax API 语音识别（通过后端代理）
    async startMinimaxRecognition() {
        try {
            this.isListening = true;
            console.log('🎤 开始录音（Minimax 模式）...');

            // 录制音频
            const audioBlob = await this.recordAudio();
            
            console.log('📤 发送到后端 API...');

            // 构建请求 URL 和参数
            const params = new URLSearchParams();
            if (AI_CONFIG.minimax.language) {
                params.append('language', AI_CONFIG.minimax.language);
            }

            const url = `${AI_CONFIG.apiProxy.speechUrl}?${params.toString()}`;

            // 调用后端代理 API
            const response = await fetch(url, {
                method: 'POST',
                body: audioBlob
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(`API 错误: ${error.error || response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Minimax 识别结果:', result);

            this.isListening = false;

            return {
                success: true,
                text: result.text,
                language: result.language,
                duration: result.duration,
                confidence: result.confidence || 0.95
            };

        } catch (error) {
            this.isListening = false;
            console.error('❌ Minimax 识别错误:', error);
            
            // 自动降级到浏览器原生模式
            console.log('🔄 Minimax API 不可用，自动切换到浏览器原生识别...');
            
            // 初始化浏览器识别（如果还未初始化）
            if (!this.recognition) {
                this.initBrowserSpeech();
            }
            
            // 尝试使用浏览器识别
            if (this.recognition) {
                try {
                    return await this.startBrowserRecognition();
                } catch (browserError) {
                    console.error('❌ 浏览器识别也失败:', browserError);
                    throw new Error('语音识别不可用：Minimax API 和浏览器识别都失败');
                }
            } else {
                throw new Error('语音识别不可用：浏览器不支持语音识别');
            }
        }
    }

    // 录制音频
    async recordAudio(maxDuration = 10000) {
        return new Promise(async (resolve, reject) => {
            try {
                // 请求麦克风权限
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                
                const audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    resolve(audioBlob);
                };

                mediaRecorder.onerror = (error) => {
                    stream.getTracks().forEach(track => track.stop());
                    reject(error);
                };

                // 开始录音
                mediaRecorder.start();

                // 监听静音或最大时长
                const stopRecording = () => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                };

                // 最大录音时长（3秒，适合单词识别）
                setTimeout(stopRecording, 3000);

            } catch (error) {
                reject(new Error('无法访问麦克风: ' + error.message));
            }
        });
    }

    // 计算平均置信度（从 verbose_json 结果）
    calculateConfidence(result) {
        if (result.words && result.words.length > 0) {
            const avgProb = result.words.reduce((sum, word) => sum + (word.probability || 1), 0) / result.words.length;
            return avgProb;
        }
        return 0.95; // 默认高置信度
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
        if (this.mode === 'minimax') {
            return true; // Minimax API 始终可用（如果有 API Key）
        }
        return this.recognition !== null;
    }

    // 切换识别模式
    switchMode(mode) {
        if (mode === 'browser' || mode === 'minimax') {
            this.mode = mode;
            AI_CONFIG.speechMode = mode;
            console.log(`🔄 切换到 ${mode} 模式`);
            
            if (mode === 'browser' && !this.recognition) {
                this.initBrowserSpeech();
            }
        }
    }
}

// AI 服务（使用 OpenAI GPT）
class AIService {
    constructor() {
        this.apiKey = AI_CONFIG.openai.apiKey;
        this.gptModel = AI_CONFIG.openai.gptModel;
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
                    model: this.gptModel,
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
                    model: AI_CONFIG.openai.gptModel,
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
    switchSpeechMode: (mode) => speechRecognition.switchMode(mode), // 切换识别模式
    getCurrentMode: () => speechRecognition.mode, // 获取当前模式
    
    // AI 服务
    getLearningAdvice: (word, level) => aiService.getLearningAdvice(word, level),
    getNextWord: (learnedWords, difficulty) => aiService.getNextWord(learnedWords, difficulty),
    evaluatePronunciation: (recognized, target, confidence) => aiService.evaluatePronunciation(recognized, target, confidence),
    
    // 语音合成
    speakWord: (text, lang) => textToSpeech.speak(text, lang),
    stopSpeaking: () => textToSpeech.stop(),
    
    // 配置
    config: AI_CONFIG
};

console.log('✅ AI 和语音服务初始化完成');
console.log(`🎤 当前语音识别模式: ${AI_CONFIG.speechMode}`);
