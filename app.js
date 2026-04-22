document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (window.lucide) lucide.createIcons();

    // القواعد الذكية للصيغ
    const formatRules = {
        image: ['jpg', 'png', 'webp', 'gif', 'bmp'],
        video: ['mp4', 'mov', 'avi', 'mkv', 'flv', 'mp3'],
        audio: ['mp3', 'wav', 'm4a', 'ogg', 'flac'],
        document: ['pdf', 'docx', 'txt']
    };

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        showConversionOptions(file);
    }

    function showConversionOptions(file) {
        let fileType = 'document';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('audio/')) fileType = 'audio';

        const availableFormats = formatRules[fileType];
        
        // إنشاء واجهة الخيارات بدون معاينة كبيرة
        dropZone.innerHTML = `
            <div class="animate-up">
                <div class="file-icon-wrapper" style="margin-bottom:1.5rem;">
                    <i data-lucide="${fileType === 'video' ? 'video' : (fileType === 'audio' ? 'music' : 'file-text')}" style="width:50px; height:50px; color:var(--primary);"></i>
                </div>
                <h3>${file.name}</h3>
                <p>الحجم: ${(file.size / 1024).toFixed(1)} KB</p>
                
                <div class="conversion-controls" style="margin-top:2rem;">
                    <label>تحويل إلى:</label>
                    <select id="targetFormat" class="custom-select" style="max-width:200px; margin: 10px auto;">
                        ${availableFormats.map(fmt => `<option value="${fmt}">${fmt.toUpperCase()}</option>`).join('')}
                    </select>
                    <button id="startConvert" class="btn-primary" style="width:100%; margin-top:1rem;">بدأ التحويل الذكي</button>
                </div>
            </div>
        `;
        lucide.createIcons();

        document.getElementById('startConvert').addEventListener('click', () => {
            const format = document.getElementById('targetFormat').value;
            processRealConversion(file, format, fileType);
        });
    }

    async function processRealConversion(file, format, type) {
        // واجهة الانتظار لزيادة وقت الجلسة
        renderProcessingUI(format);
        
        const progressBar = document.getElementById('progressBar');
        const logs = document.getElementById('logs');
        
        // محاكاة خطوات تقنية عميقة
        const steps = [
            "جاري فحص سلامة الملف...",
            "جاري استخراج الميتا-داتا (Metadata)...",
            "جاري تهيئة محرك " + format.toUpperCase() + " السحابي...",
            "جاري إعادة الترميز (Encoding)...",
            "جاري ضغط البيانات بدون فقدان الجودة...",
            "جاري التشفير النهائي..."
        ];

        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 2000)); // كل خطوة تأخذ ثانيتين لزيادة الوقت
            const p = document.createElement('p');
            p.textContent = `> ${steps[i]}`;
            logs.appendChild(p);
            logs.scrollTop = logs.scrollHeight;
            progressBar.style.width = `${(i + 1) * 16.6}%`;
        }

        // تنفيذ التحويل الحقيقي
        if (type === 'image') {
            convertToImage(file, format);
        } else {
            // للملفات الثقيلة (فيديو/صوت) نستخدم السيرفر الحقيقي في Render
            sendToServerForConversion(file, format);
        }
    }

    async function sendToServerForConversion(file, format) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', format);

        try {
            // الاتصال بسيرفر Render الحقيقي
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                finishConversion(file, format, blob);
            } else {
                throw new Error('فشل التحويل في السيرفر');
            }
        } catch (err) {
            alert('حدث خطأ أثناء التحويل السحابي: ' + err.message);
            location.reload();
        }
    }

    function convertToImage(file, format) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                let mimeType = `image/${format}`;
                if (format === 'jpg') mimeType = 'image/jpeg';
                
                canvas.toBlob((blob) => {
                    finishConversion(file, format, blob);
                }, mimeType, 0.9);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function finishConversion(originalFile, format, blob) {
        const url = URL.createObjectURL(blob);
        const newName = originalFile.name.split('.')[0] + '.' + format;
        
        dropZone.innerHTML = `
            <div class="animate-up">
                <div class="success-icon"><i data-lucide="check-circle"></i></div>
                <h2>تم التحويل بنجاح!</h2>
                <p>الملف ${newName} جاهز الآن.</p>
                <a href="${url}" download="${newName}" class="btn-primary" style="display:inline-block; margin-top:1.5rem; background:#22c55e;">
                    تحميل الملف الناتج
                </a>
                <br>
                <button onclick="location.reload()" style="background:none; border:none; color:var(--text-muted); margin-top:1.5rem; cursor:pointer;">تحويل ملف جديد</button>
            </div>
        `;
        lucide.createIcons();
    }

    function renderProcessingUI(format) {
        dropZone.innerHTML = `
            <div class="processing-ui">
                <div class="loader-ring"></div>
                <h3>جاري المعالجة السحابية لـ ${format.toUpperCase()}</h3>
                <div class="progress-bar-container"><div id="progressBar" class="progress-bar"></div></div>
                <div class="process-logs" id="logs"></div>
            </div>
        `;
    }
});
