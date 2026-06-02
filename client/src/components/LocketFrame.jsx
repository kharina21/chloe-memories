import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, RotateCw, Send, X, RefreshCw } from 'lucide-react';
import ImageCropModal from './ImageCropModal.jsx';

export default function LocketFrame({ onUploadSuccess, apiBase, token }) {
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption]           = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [cropSrc, setCropSrc]           = useState(null); // original src waiting for crop
  
  // Camera states
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // user or environment
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  // Start camera stream
  const startCamera = async () => {
    setError('');
    setImageFile(null);
    setImagePreview(null);
    
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: 480, height: 480 },
        audio: false
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraMode(true);
    } catch (err) {
      console.error(err);
      setError('Không thể truy cập camera. Vui lòng chọn ảnh từ thư viện.');
      setCameraMode(false);
      setCameraActive(false);
    }
  };

  // Toggle Camera Facing Mode (Front/Back)
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Handle Capture Photo
  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Draw cropped square center of video
    const video = videoRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'locket_capture.jpg', { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(blob));
      stopCamera();
      setCameraMode(false);
    }, 'image/jpeg', 0.9);
  };

  // Handle file select from gallery — show crop modal first
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      setCameraMode(false);
      // Store the original file URL so ImageCropModal can display it
      setCropSrc(URL.createObjectURL(file));
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Called when crop is confirmed
  const handleCropConfirm = (croppedFile) => {
    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };

  // Upload to server
  const handleSend = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);

    try {
      const res = await fetch(`${apiBase}/api/posts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi tải ảnh lên');
      }

      // Reset
      setImageFile(null);
      setImagePreview(null);
      setCaption('');
      onUploadSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setImageFile(null);
    setImagePreview(null);
    setCaption('');
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '24px' }}>

      {/* Crop modal — shown before preview */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
      
      {error && (
        <div className="sweet-alert sweet-alert-error" style={{ width: '100%' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Physical-style Circular Squircle Widget */}
      <div 
        className="locket-pulse" 
        style={{
          width: '280px',
          height: '280px',
          borderRadius: '30%',
          overflow: 'hidden',
          backgroundColor: '#2d1e21',
          border: '10px solid #ff6b8b',
          position: 'relative',
          boxShadow: '0 12px 28px rgba(255, 107, 139, 0.25)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Camera stream view */}
        {cameraMode && cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* Captured / Selected photo view */}
        {imagePreview && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={imagePreview}
              alt="Locket moment preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            {/* Overlay Caption Input inside the locket */}
            <div style={{
              position: 'absolute',
              bottom: '10%',
              left: '5%',
              right: '5%',
              zIndex: 10
            }}>
              <input
                type="text"
                placeholder="Viết lời nhắn gửi người thương..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: 'none',
                  borderRadius: '20px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  padding: '8px 14px',
                  textAlign: 'center',
                  width: '100%',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              />
            </div>
          </div>
        )}

        {/* Empty state: Waiting to trigger camera or pick file */}
        {!cameraActive && !imagePreview && (
          <div style={{ textAlign: 'center', color: '#ffd3da', padding: '20px' }}>
            <Camera size={44} style={{ marginBottom: '12px', opacity: 0.8 }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Chụp ảnh gửi người thương</p>
          </div>
        )}

        {/* Upload Loading Overlay */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            zIndex: 20
          }}>
            <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '0.85rem' }}>Đang gửi yêu thương...</span>
          </div>
        )}
      </div>

      {/* Custom Control Bar (below locket) */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '20px', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* State 1: No photo captured or selected */}
        {!cameraActive && !imagePreview && (
          <>
            <button 
              onClick={startCamera} 
              className="btn-primary" 
              style={{
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Camera size={26} />
            </button>

            <button 
              onClick={() => fileInputRef.current.click()} 
              className="btn-secondary"
              style={{
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ImageIcon size={20} />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </>
        )}

        {/* State 2: Camera active - stream running */}
        {cameraActive && (
          <>
            <button 
              onClick={toggleCameraFacing} 
              className="btn-secondary"
              style={{
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCw size={20} />
            </button>

            <button 
              onClick={handleCapture} 
              className="btn-primary"
              style={{
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                border: '6px solid #ff6b8b',
                boxShadow: '0 4px 15px rgba(255, 107, 139, 0.4)'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#ff6b8b'
              }} />
            </button>

            <button 
              onClick={() => { stopCamera(); setCameraMode(false); }} 
              className="btn-secondary"
              style={{
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </>
        )}

        {/* State 3: Photo preview available - ready to send */}
        {imagePreview && (
          <>
            <button 
              onClick={handleCancel} 
              className="btn-secondary"
              style={{
                borderRadius: '20px',
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <X size={16} /> Chụp lại
            </button>

            <button 
              onClick={handleSend} 
              className="btn-primary"
              disabled={loading}
              style={{
                borderRadius: '20px',
                padding: '10px 24px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <Send size={16} /> Gửi đi 💕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
