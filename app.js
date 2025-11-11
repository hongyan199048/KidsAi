// Magic Pet Island 应用逻辑
class MagicPetApp {
    constructor() {
        this.currentWord = '';
        this.score = 0;
        this.wordsLearned = [];
        this.isListening = false;
        this.init();
    }

    async init() {
        // 等待服务初始化
        await this.waitForServices();
        
        // 检查登录状态
        await this.checkAuth();
        
        // 绑定事件
        this.bindEvents();
        
        // 加载初始单词
        this.loadNextWord();
        
        console.log('✅ 应用初始化完成');
    }

    async checkAuth() {
        try {
            if (window.MagicPetAPI) {
                const user = await window.MagicPetAPI.Auth.getCurrentUser();
                if (user) {
                    console.log('✅ 用户已登录:', user.email);
                    this.showWelcomeMessage(user.email);
                } else {
                    console.log('ℹ️ 游客模式');
                }
            }
        } catch (error) {
            console.log('认证检查失败:', error);
        }
    }

    showWelcomeMessage(email) {
        const title = document.querySelector('.learning-title');
        if (title) {
            const username = email.split('@')[0];
            title.textContent = `Welcome ${username}! Ready to learn?`;
            
            setTimeout(() => {
                this.loadNextWord();
            }, 2000);
        }
    }

    async waitForServices() {
        // 等待所有服务加载完成
        let attempts = 0;
        while ((!window.MagicPetAI || !window.MagicPetAPI) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    bindEvents() {
        // Speak to Feed 按钮
        const speakButton = document.querySelector('.speak-button');
        if (speakButton) {
            speakButton.addEventListener('click', () => this.handleSpeakToFeed());
        }

        // Progress 按钮
        const progressButton = document.querySelector('.progress-button');
        if (progressButton) {
            progressButton.addEventListener('click', () => this.showProgress());
        }

        // Back Home 按钮 - 改为登出功能
        const backButton = document.querySelector('.back-home-button');
        if (backButton) {
            backButton.querySelector('.button-text').textContent = 'Sign Out';
            backButton.addEventListener('click', () => this.handleSignOut());
        }

        // 宠物图片点击 - 朗读当前单词
        const petImage = document.querySelector('.pet-image');
        if (petImage) {
            petImage.addEventListener('click', () => this.speakCurrentWord());
        }
    }

    // 加载下一个单词
    async loadNextWord() {
        try {
            const result = await window.MagicPetAI.getNextWord(this.wordsLearned, 'easy');
            if (result.success) {
                this.currentWord = result.word;
                this.updateTitle(`Say "${this.currentWord}" to feed your pet!`);
                console.log('📖 新单词:', this.currentWord);
            }
        } catch (error) {
            console.error('加载单词失败:', error);
            this.currentWord = 'apple'; // 默认单词
        }
    }

    // 处理语音喂养
    async handleSpeakToFeed() {
        if (this.isListening) {
            return;
        }

        // 检查语音识别支持
        if (!window.MagicPetAI.isSpeechSupported()) {
            this.showHint('❌ Your browser doesn\'t support speech recognition. Please try Chrome or Edge.');
            return;
        }

        try {
            // 更新 UI
            this.updateButtonState(true);
            this.showHint('🎤 Listening... Say the word now!');

            // 开始语音识别
            const result = await window.MagicPetAI.startListening();

            if (result.success) {
                // 评估发音
                const evaluation = window.MagicPetAI.evaluatePronunciation(
                    result.text,
                    this.currentWord,
                    result.confidence
                );

                // 显示反馈
                this.showHint(evaluation.feedback);

                if (evaluation.isCorrect) {
                    // 正确！喂养宠物
                    await this.feedPet(evaluation.score);
                    
                    // 保存学习记录
                    this.wordsLearned.push(this.currentWord);
                    if (window.MagicPetAPI) {
                        await window.MagicPetAPI.Database.saveLearningRecord(
                            this.currentWord,
                            evaluation.score
                        );
                    }

                    // 延迟后加载新单词
                    setTimeout(() => {
                        this.loadNextWord();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('语音识别失败:', error);
            this.showHint('❌ Failed to recognize speech. Please try again!');
        } finally {
            this.updateButtonState(false);
        }
    }

    // 喂养宠物动画
    async feedPet(points) {
        this.score += points;
        
        // 宠物图片动画效果
        const petImage = document.querySelector('.pet-image');
        if (petImage) {
            petImage.style.transform = 'scale(1.1)';
            petImage.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                petImage.style.transform = 'scale(1)';
            }, 300);
        }

        // 获取 AI 鼓励
        const advice = await window.MagicPetAI.getLearningAdvice(this.currentWord);
        if (advice.success) {
            setTimeout(() => {
                this.showHint(advice.advice);
            }, 1000);
        }
    }

    // 朗读当前单词
    async speakCurrentWord() {
        if (this.currentWord) {
            try {
                await window.MagicPetAI.speakWord(this.currentWord);
                console.log('🔊 朗读:', this.currentWord);
            } catch (error) {
                console.error('朗读失败:', error);
            }
        }
    }

    // 显示进度
    async showProgress() {
        try {
            if (window.MagicPetAPI) {
                const result = await window.MagicPetAPI.Database.getProgress();
                if (result.success && result.data) {
                    alert(`📊 Your Progress:\n\n` +
                          `Words Learned: ${result.data.words_learned}\n` +
                          `Total Score: ${result.data.total_score}\n\n` +
                          `Keep learning! 🌟`);
                    return;
                }
            }
            
            // 本地进度
            alert(`📊 Your Progress:\n\n` +
                  `Words Learned: ${this.wordsLearned.length}\n` +
                  `Total Score: ${this.score}\n\n` +
                  `Keep learning! 🌟`);
        } catch (error) {
            console.error('获取进度失败:', error);
        }
    }

    // 用户登出
    async handleSignOut() {
        if (window.MagicPetAPI) {
            if (confirm('Sign out? Your progress has been saved.')) {
                const result = await window.MagicPetAPI.Auth.signOut();
                if (result.success) {
                    window.location.href = 'auth.html';
                }
            }
        } else {
            // 游客模式，直接重新加载
            if (confirm('Return to home?')) {
                location.reload();
            }
        }
    }

    // UI 更新辅助方法
    updateTitle(text) {
        const title = document.querySelector('.learning-title');
        if (title) {
            title.textContent = text;
        }
    }

    showHint(text) {
        const hint = document.querySelector('.hint-text');
        if (hint) {
            hint.textContent = text;
        }
    }

    updateButtonState(listening) {
        this.isListening = listening;
        const button = document.querySelector('.speak-button');
        const buttonText = document.querySelector('.speak-button .button-text');
        
        if (button && buttonText) {
            if (listening) {
                button.style.backgroundColor = '#FF6B6B';
                buttonText.textContent = '🎤 Listening...';
            } else {
                button.style.backgroundColor = '#FAFA1F';
                buttonText.textContent = 'Speak to Feed';
            }
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MagicPetApp();
});
