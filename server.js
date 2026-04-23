const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات Cloudinary الجبارة (استخدام بياناتك الحقيقية)
cloudinary.config({ 
  cloud_name: 'convert', 
  api_key: '534413334623551', 
  api_secret: 'qAUdOS6tHhAS4uobpKL3bLn-8xE' 
});

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// API التحويل السحابي الفائق (عبر Cloudinary)
app.post('/api/convert', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const targetFormat = req.body.format;
    const inputPath = req.file.path;

    try {
        console.log(`Uploading to Cloudinary for conversion to ${targetFormat}...`);
        
        // الرفع والتحويل في خطوة واحدة سحابية
        const result = await cloudinary.uploader.upload(inputPath, {
            resource_type: "auto", // يتعرف تلقائياً على فيديو/صوت/صورة
            format: targetFormat,  // الصيغة المطلوبة
            folder: "conversions"
        });

        console.log("Conversion successful:", result.secure_url);
        
        // إرسال رابط التحميل المباشر للمتصفح
        // نستخدم رابط النتيجة الذي يحتوي على الصيغة الجديدة
        res.json({ 
            success: true, 
            url: result.secure_url,
            name: `converted_${Date.now()}.${targetFormat}`
        });

        // تنظيف الملف المؤقت من سيرفر Render
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    } catch (err) {
        console.error('Cloudinary Error:', err);
        res.status(500).json({ error: 'فشل التحويل السحابي، تأكد من إعدادات Cloudinary' });
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Ultimate Cloud Server running on port ${PORT}`);
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
});
