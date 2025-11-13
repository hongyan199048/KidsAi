// Vercel Serverless Function - Minimax Speech API 代理
// 用于安全地调用 Minimax 语音识别 API，不暴露 API Key

export const config = {
    api: {
        bodyParser: false, // 需要处理文件上传
    },
};

export default async function handler(req, res) {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 从环境变量获取 API Key（安全）
        const apiKey = process.env.MINIMAX_API_KEY;
        const groupId = process.env.MINIMAX_GROUP_ID;
        
        if (!apiKey || !groupId) {
            return res.status(500).json({ error: 'Minimax API key or Group ID not configured' });
        }

        // 获取请求体（音频数据）
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // 准备 FormData
        const FormData = require('form-data');
        const formData = new FormData();
        
        // 添加音频文件
        formData.append('file', buffer, {
            filename: 'audio.webm',
            contentType: 'audio/webm'
        });
        
        // 添加可选参数
        formData.append('model', 'speech-01'); // Minimax 语音模型
        
        const { language } = req.query;
        if (language) {
            formData.append('language', language === 'en' ? 'en' : 'zh'); // 仅支持 en 和 zh
        }

        // 调用 Minimax API
        const response = await fetch(`https://api.minimax.chat/v1/speech_to_text?GroupId=${groupId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            return res.status(response.status).json({ 
                error: error.base_resp?.status_msg || error.error || 'Minimax API error' 
            });
        }

        const result = await response.json();
        
        // 转换 Minimax 响应为统一格式
        if (result.base_resp?.status_code === 0 && result.text) {
            return res.status(200).json({
                text: result.text,
                language: result.language || 'en',
                duration: result.audio_length || 0,
                confidence: 0.95 // Minimax 没有置信度，默认高值
            });
        } else {
            return res.status(500).json({ 
                error: result.base_resp?.status_msg || 'Recognition failed' 
            });
        }

    } catch (error) {
        console.error('Minimax proxy error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
