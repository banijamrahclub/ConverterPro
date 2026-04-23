document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (window.lucide) lucide.createIcons();

    const formatRules = {
        image: ['jpg', 'png', 'webp', 'gif', 'bmp'],
        video: ['mp4', 'mov', 'avi', 'mkv', 'mp3'],
        audio: ['mp3', 'wav', 'm4a', 'ogg', 'flac'],
        document: ['pdf', 'docx', 'txt']
    };

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('active'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('active'); });
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); });

    function handleFiles(files) {
        if (files.length === 0) return;
        showConversionOptions(files[0]);
    }

    function showConversionOptions(file) {
        let fileType = 'document';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('audio/')) fileType = 'audio';

        const availableFormats = formatRules[fileType];
        
        dropZone.innerHTML = `
            <div class="animate-up">
                <div class="file-icon-wrapper" style="margin-bottom:1.5rem;">
                    <i data-lucide="${fileType === 'video' ? 'video' : (fileType === 'audio' ? 'music' : 'file-text')}" style="width:50px; height:50px; color:var(--primary);"></i>
                </div>
                <h3>${file.name}</h3>
                <p>الحجم: ${(file.size / 1024).toFixed(1)} KB</p>
                
                <div class="conversion-controls" style="margin-top:2rem;">
                    <label>تحويل سحابي إلى:</label>
                    <select id="targetFormat" class="custom-select">
                        ${availableFormats.map(fmt => `<option value="${fmt}">${fmt.toUpperCase()}</option>`).join('')}
                    </select>
                    <button id="startConvert" class="btn-primary" style="width:100%; margin-top:1rem;">بدأ التحويل السحابي (ضغط 0% على جهازك)</button>
                </div>
            </div>
        `;
        lucide.createIcons();

        document.getElementById('startConvert').addEventListener('click', () => {
            const format = document.getElementById('targetFormat').value;
            startFullCloudConversion(file, format);
        });
    }

    async function startFullCloudConversion(file, format) {
        renderProcessingUI(format);
        const progressBar = document.getElementById('progressBar');
        const logs = document.getElementById('logs');
        
        const updateLog = (msg) => {
            const p = document.createElement('p');
            p.textContent = `> ${msg}`;
            logs.appendChild(p);
            logs.scrollTop = logs.scrollHeight;
        };

        try {
            updateLog("جاري إنشاء اتصال آمن مع السيرفر السحابي...");
            progressBar.style.width = '20%';

            updateLog("جاري رفع الملف للمعالجة (الضغط 0% على جهازك)...");
            progressBar.style.width = '40%';
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('format', format);

            // الاتصال بسيرفر Render الحقيقي
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // جلب الملف النهائي من رابط Cloudinary
                const res = await fetch(data.url);
                const blob = await res.blob();
                finishConversion(file, format, blob);
            } else {
                throw new Error(data.error || 'فشل التحويل السحابي');
            }
        } catch (err) {
            alert('خطأ في Cloudinary: ' + err.message);
            location.reload();
        }
    }

    function finishConversion(originalFile, format, blob) {
        const url = URL.createObjectURL(blob);
        const newName = originalFile.name.split('.')[0] + '.' + format;
        dropZone.innerHTML = `
            <div class="animate-up">
                <div class="success-icon"><i data-lucide="check-circle"></i></div>
                <h2>تم التحويل سحابياً!</h2>
                <a href="${url}" download="${newName}" class="btn-primary" style="display:inline-block; margin-top:1.5rem; background:#22c55e;">
                    تحميل الملف المحول
                </a>
                <br><button onclick="location.reload()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; margin-top:1rem;">تحويل ملف جديد</button>
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
                <div class="process-logs" id="logs" style="text-align:left; font-size:0.8rem; height:100px;"></div>
            </div>
        `;
    }
});
