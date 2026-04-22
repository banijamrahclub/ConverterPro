const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// إعداد تخزين الملفات المرفوعة مؤقتاً
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// دالة التحويل باستخدام ffmpeg (الموجود سحابياً في Render)
const convertFile = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        // أمر التحويل العالمي
        const command = `ffmpeg -i "${inputPath}" "${outputPath}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('FFMPEG Error:', stderr);
                return reject(stderr);
            }
            resolve(outputPath);
        });
    });
};

// API التحويل الحقيقي
app.post('/api/convert', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const targetFormat = req.body.format;
    const inputPath = req.file.path;
    const outputPath = `${inputPath}.${targetFormat}`;

    try {
        console.log(`Converting ${req.file.originalname} to ${targetFormat}...`);
        await convertFile(inputPath, outputPath);
        
        // إرسال الملف المحول للمستخدم
        res.download(outputPath, `converted_${req.file.originalname.split('.')[0]}.${targetFormat}`, (err) => {
            // حذف الملفات المؤقتة بعد التحميل
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
    } catch (err) {
        console.error('Conversion Failed:', err);
        res.status(500).json({ error: 'فشل التحويل السحابي' });
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
});

// الـ API القديم لـ yt-dlp (للبحث والتحميل)
app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'URL is required' });
    const ytdlpPath = path.join(__dirname, 'yt-dlp');
    const command = `python3 ${ytdlpPath} -j --no-playlist "${videoUrl}"`;
    exec(command, (error, stdout) => {
        if (error) return res.status(500).json({ error: 'Failed' });
        res.json({ success: true, ...JSON.parse(stdout) });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
});
