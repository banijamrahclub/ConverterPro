const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const https = require('https'); // لاستخدامها في مناداة السيرفر لنفسه
const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات Cloudinary
cloudinary.config({ 
  cloud_name: 'convert', 
  api_key: '534413334623551', 
  api_secret: 'qAUdOS6tHhAS4uobpKL3bLn-8xE' 
});

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// --- نظام إبقاء السيرفر مستيقظاً (Keep-Alive) ---
const SELF_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}.onrender.com`;

// دالة بسيطة لمناداة السيرفر
const keepAlive = () => {
    https.get(SELF_URL, (res) => {
        console.log(`Self-ping status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.log('Self-ping error: ' + err.message);
    });
};

// مناداة النفس كل 10 دقائق
setInterval(keepAlive, 600000); 

// --- رابط مخصص لخدمة Cron-Job الخارجية ---
app.get('/api/cron-clean', (req, res) => {
    console.log("Cron-job cleanup started...");
    const uploadsDir = path.join(__dirname, 'uploads');
    
    fs.readdir(uploadsDir, (err, files) => {
        if (err) return res.status(500).send("Error reading uploads");
        
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            const now = Date.now();
            const endTime = new Date(stats.ctime).getTime() + 3600000; // مسح أي ملف مر عليه ساعة

            if (now > endTime) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old file: ${file}`);
            }
        });
        res.send("Cleanup Success & Server Awake!");
    });
});

// --- محرك التحويل السحابي المزدوج ---
const localConvert = (inputPath, outputPath, format) => {
    return new Promise((resolve, reject) => {
        let cmd = `ffmpeg -i "${inputPath}" -preset ultrafast "${outputPath}"`;
        if (format === 'mp3') cmd = `ffmpeg -i "${inputPath}" -vn -ar 44100 -ac 2 -ab 192k -f mp3 "${outputPath}"`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) return reject(stderr);
            resolve(outputPath);
        });
    });
};

app.post('/api/convert', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const targetFormat = req.body.format;
    const inputPath = req.file.path;
    const isMedia = req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/') || req.file.mimetype.startsWith('audio/');

    try {
        if (isMedia) {
            const result = await cloudinary.uploader.upload(inputPath, { resource_type: "auto", format: targetFormat });
            res.json({ success: true, url: result.secure_url });
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        } else {
            const outputPath = `${inputPath}.${targetFormat}`;
            await localConvert(inputPath, outputPath, targetFormat);
            res.download(outputPath, `converted_${Date.now()}.${targetFormat}`, () => {
                // الحذف الفوري للملف بعد التحميل
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            });
        }
    } catch (err) {
        res.status(500).json({ error: 'Conversion failed' });
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server Awake & Monitoring on Port ${PORT}`);
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
});
