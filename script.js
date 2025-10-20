 // Initialize AOS
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });

        document.addEventListener('DOMContentLoaded', function() {
            // DOM Elements
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');
            const uploadBtn = document.getElementById('uploadBtn');
            const previewContent = document.getElementById('previewContent');
            const webcamContainer = document.getElementById('webcamContainer');
            const webcamVideo = document.getElementById('webcamVideo');
            const recordBtn = document.getElementById('recordBtn');
            const createBtn = document.getElementById('createBtn');
            const downloadBtn = document.getElementById('downloadBtn');
            const resetBtn = document.getElementById('resetBtn');
            const timer = document.getElementById('timer');
            const fileSizeValue = document.getElementById('fileSizeValue');
            
            // Sliders
            const speedSlider = document.getElementById('speed');
            const sizeSlider = document.getElementById('size');
            const loopSlider = document.getElementById('loop');
            const qualitySlider = document.getElementById('quality');
            
            // Value displays
            const speedValue = document.getElementById('speedValue');
            const sizeValue = document.getElementById('sizeValue');
            const loopValue = document.getElementById('loopValue');
            const qualityValue = document.getElementById('qualityValue');
            
            // Preset buttons
            const presetButtons = document.querySelectorAll('.preset-btn');
            
            let mediaStream = null;
            let mediaRecorder = null;
            let recordedChunks = [];
            let isRecording = false;
            let recordingTimer = null;
            let recordingSeconds = 0;
            let uploadedFiles = [];
            
            // Event Listeners
            uploadBtn.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('click', () => fileInput.click());
            
            // Drag and drop functionality
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('active');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('active');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('active');
                if (e.dataTransfer.files.length) {
                    handleFiles(e.dataTransfer.files);
                }
            });
            
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    handleFiles(fileInput.files);
                }
            });
            
            // Update slider value displays
            speedSlider.addEventListener('input', () => {
                speedValue.textContent = `${speedSlider.value}%`;
                updateFileSizeEstimate();
            });
            
            sizeSlider.addEventListener('input', () => {
                const sizes = ['Small', 'Medium', 'Large'];
                sizeValue.textContent = sizes[sizeSlider.value - 1];
                updateFileSizeEstimate();
            });
            
            loopSlider.addEventListener('input', () => {
                if (loopSlider.value == 0) {
                    loopValue.textContent = 'Infinite';
                } else {
                    loopValue.textContent = `${loopSlider.value}x`;
                }
                updateFileSizeEstimate();
            });
            
            qualitySlider.addEventListener('input', () => {
                const qualities = ['Low', 'Medium', 'High'];
                qualityValue.textContent = qualities[qualitySlider.value - 1];
                updateFileSizeEstimate();
            });
            
            // Preset buttons
            presetButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove active class from all buttons
                    presetButtons.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    btn.classList.add('active');
                    
                    // Apply preset values
                    const preset = btn.getAttribute('data-preset');
                    applyPreset(preset);
                });
            });
            
            // Record button
            recordBtn.addEventListener('click', toggleRecording);
            
            // Create button
            createBtn.addEventListener('click', createGIF);
            
            // Download button
            downloadBtn.addEventListener('click', downloadGIF);
            
            // Reset button
            resetBtn.addEventListener('click', resetApp);
            
            // Functions
            function handleFiles(files) {
                uploadedFiles = Array.from(files);
                
                // Show first file in preview
                if (uploadedFiles.length > 0) {
                    const file = uploadedFiles[0];
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        previewContent.innerHTML = '';
                        
                        if (file.type.startsWith('image/')) {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            previewContent.appendChild(img);
                        } else if (file.type.startsWith('video/')) {
                            const video = document.createElement('video');
                            video.src = e.target.result;
                            video.controls = true;
                            video.style.maxWidth = '100%';
                            video.style.maxHeight = '100%';
                            previewContent.appendChild(video);
                        }
                        
                        // Update file size estimate
                        updateFileSizeEstimate();
                    };
                    
                    reader.readAsDataURL(file);
                }
            }
            
            function applyPreset(preset) {
                switch(preset) {
                    case 'social':
                        speedSlider.value = 80;
                        sizeSlider.value = 1;
                        loopSlider.value = 0;
                        qualitySlider.value = 2;
                        break;
                    case 'meme':
                        speedSlider.value = 150;
                        sizeSlider.value = 1;
                        loopSlider.value = 0;
                        qualitySlider.value = 1;
                        break;
                    case 'slideshow':
                        speedSlider.value = 50;
                        sizeSlider.value = 3;
                        loopSlider.value = 0;
                        qualitySlider.value = 3;
                        break;
                    case 'smooth':
                        speedSlider.value = 100;
                        sizeSlider.value = 2;
                        loopSlider.value = 0;
                        qualitySlider.value = 3;
                        break;
                }
                
                // Update value displays
                speedValue.textContent = `${speedSlider.value}%`;
                
                const sizes = ['Small', 'Medium', 'Large'];
                sizeValue.textContent = sizes[sizeSlider.value - 1];
                
                if (loopSlider.value == 0) {
                    loopValue.textContent = 'Infinite';
                } else {
                    loopValue.textContent = `${loopSlider.value}x`;
                }
                
                const qualities = ['Low', 'Medium', 'High'];
                qualityValue.textContent = qualities[qualitySlider.value - 1];
                
                // Update file size estimate
                updateFileSizeEstimate();
            }
            
            async function toggleRecording() {
                if (!isRecording) {
                    // Start recording
                    try {
                        mediaStream = await navigator.mediaDevices.getUserMedia({ 
                            video: { width: 640, height: 480 }, 
                            audio: false 
                        });
                        
                        webcamVideo.srcObject = mediaStream;
                        previewContent.style.display = 'none';
                        webcamContainer.style.display = 'block';
                        
                        // Setup media recorder
                        recordedChunks = [];
                        mediaRecorder = new MediaRecorder(mediaStream, { 
                            mimeType: 'video/webm; codecs=vp9' 
                        });
                        
                        mediaRecorder.ondataavailable = (e) => {
                            if (e.data.size > 0) {
                                recordedChunks.push(e.data);
                            }
                        };
                        
                        mediaRecorder.onstop = () => {
                            // Convert recorded video to a blob
                            const blob = new Blob(recordedChunks, { type: 'video/webm' });
                            const url = URL.createObjectURL(blob);
                            
                            // Show recorded video in preview
                            previewContent.innerHTML = '';
                            const video = document.createElement('video');
                            video.src = url;
                            video.controls = true;
                            video.style.maxWidth = '100%';
                            video.style.maxHeight = '100%';
                            previewContent.appendChild(video);
                            
                            previewContent.style.display = 'flex';
                            webcamContainer.style.display = 'none';
                            
                            // Stop webcam stream
                            mediaStream.getTracks().forEach(track => track.stop());
                            
                            // Update file size estimate
                            updateFileSizeEstimate();
                        };
                        
                        // Start recording
                        mediaRecorder.start();
                        isRecording = true;
                        recordBtn.classList.add('recording');
                        recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
                        
                        // Start timer
                        recordingSeconds = 0;
                        timer.textContent = '0s';
                        recordingTimer = setInterval(() => {
                            recordingSeconds++;
                            timer.textContent = `${recordingSeconds}s`;
                        }, 1000);
                        
                    } catch (err) {
                        console.error('Error accessing webcam:', err);
                        alert('Could not access your webcam. Please check permissions.');
                    }
                } else {
                    // Stop recording
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                    
                    isRecording = false;
                    recordBtn.classList.remove('recording');
                    recordBtn.innerHTML = '<i class="fas fa-video"></i> Record GIF';
                    
                    // Stop timer
                    clearInterval(recordingTimer);
                }
            }
            
            function createGIF() {
                if (uploadedFiles.length === 0 && recordedChunks.length === 0) {
                    alert('Please upload images/video or record a video first.');
                    return;
                }
                
                // Show processing state
                createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
                createBtn.disabled = true;
                
                // Simulate GIF creation process
                setTimeout(() => {
                    // In a real application, this would use a GIF creation library
                    // For this demo, we'll just simulate the process
                    
                    // Enable download button
                    downloadBtn.disabled = false;
                    
                    // Reset button state
                    createBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Create GIF';
                    createBtn.disabled = false;
                    
                    // Show success message
                    alert('GIF created successfully! Click Download to save it.');
                }, 2000);
            }
            
            function downloadGIF() {
                // In a real application, this would download the actual GIF
                // For this demo, we'll create a placeholder
                
                const link = document.createElement('a');
                link.download = 'warmgif-creation.gif';
                
                // Create a simple GIF-like image for demonstration
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                
                // Draw gradient background
                const gradient = ctx.createLinearGradient(0, 0, 300, 200);
                gradient.addColorStop(0, '#FF7E5F');
                gradient.addColorStop(1, '#FEB47B');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 300, 200);
                
                // Draw text
                ctx.fillStyle = 'white';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Your GIF Here', 150, 100);
                
                ctx.font = '16px Arial';
                ctx.fillText('Created with WarmGIF', 150, 130);
                
                // Add creator credit
                ctx.font = '12px Arial';
                ctx.fillText('By Manav Singh', 150, 160);
                
                // Convert to data URL and download
                link.href = canvas.toDataURL('image/png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            function resetApp() {
                // Reset sliders to default values
                speedSlider.value = 100;
                sizeSlider.value = 2;
                loopSlider.value = 0;
                qualitySlider.value = 2;
                
                // Update value displays
                speedValue.textContent = '100%';
                sizeValue.textContent = 'Medium';
                loopValue.textContent = 'Infinite';
                qualityValue.textContent = 'High';
                
                // Reset preview
                previewContent.innerHTML = '<i class="fas fa-film"></i>';
                previewContent.style.display = 'flex';
                webcamContainer.style.display = 'none';
                
                // Stop recording if active
                if (isRecording) {
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                    
                    if (mediaStream) {
                        mediaStream.getTracks().forEach(track => track.stop());
                    }
                    
                    isRecording = false;
                    recordBtn.classList.remove('recording');
                    recordBtn.innerHTML = '<i class="fas fa-video"></i> Record GIF';
                    clearInterval(recordingTimer);
                }
                
                // Reset file input
                fileInput.value = '';
                uploadedFiles = [];
                
                // Disable download button
                downloadBtn.disabled = true;
                
                // Reset file size estimate
                fileSizeValue.textContent = '0 KB';
                
                // Reset presets
                presetButtons.forEach(btn => btn.classList.remove('active'));
            }
            
            function updateFileSizeEstimate() {
                // Simple file size estimation based on settings
                let baseSize = 500; // KB
                
                // Adjust based on quality
                baseSize *= qualitySlider.value;
                
                // Adjust based on size
                baseSize *= sizeSlider.value;
                
                // Adjust based on speed (faster = more frames)
                baseSize *= (speedSlider.value / 100);
                
                fileSizeValue.textContent = `${Math.round(baseSize)} KB`;
            }
        });