import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImage: string) => void;
    onClose: () => void;
}

const CROP_ASPECT = 9 / 16;

const getCroppedImg = (image: HTMLImageElement, crop: {x: number, y: number, width: number, height: number}) => {
    const canvas = document.createElement('canvas');
    const outputWidth = 1080;
    const outputHeight = 1920;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
    );

    return canvas.toDataURL('image/jpeg', 0.92);
};

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [dragState, setDragState] = useState<{ type: 'move' | 'resize'; handle: string; startX: number; startY: number; startCrop: typeof crop } | null>(null);

    const onImageLoad = () => {
        if (!imgRef.current) return;
        const { clientWidth: imgWidth, clientHeight: imgHeight } = imgRef.current;
        
        const imgAspect = imgWidth / imgHeight;
        let newWidth, newHeight;

        if (imgAspect > CROP_ASPECT) {
            newHeight = imgHeight * 0.9;
            newWidth = newHeight * CROP_ASPECT;
        } else {
            newWidth = imgWidth * 0.9;
            newHeight = newWidth / CROP_ASPECT;
        }
        
        const newX = (imgWidth - newWidth) / 2;
        const newY = (imgHeight - newHeight) / 2;

        setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
    };

    useEffect(() => {
        if (imgRef.current?.complete) {
            onImageLoad();
        }
    }, [imageSrc]);
    
    const handleMouseDown = (e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({
            type: handle === 'move' ? 'move' : 'resize',
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: crop,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState || !imgRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const { clientWidth: imgWidth, clientHeight: imgHeight } = imgRef.current;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        let { x, y, width, height } = dragState.startCrop;

        if (dragState.type === 'move') {
            x += dx;
            y += dy;
        } else { // resize
            if (dragState.handle.includes('e')) width += dx;
            if (dragState.handle.includes('w')) { x += dx; width -= dx; }
            if (dragState.handle.includes('s')) height += dy;
            if (dragState.handle.includes('n')) { y += dy; height -= dy; }
            
            // Maintain aspect ratio
            if (dragState.handle.match(/[ns]/)) {
                const newWidth = height * CROP_ASPECT;
                if (dragState.handle.includes('w')) x -= (newWidth - width);
                width = newWidth;
            } else {
                const newHeight = width / CROP_ASPECT;
                 if (dragState.handle.includes('n')) y -= (newHeight - height);
                height = newHeight;
            }
        }
        
        // boundary checks
        x = Math.max(0, Math.min(x, imgWidth - width));
        y = Math.max(0, Math.min(y, imgHeight - height));
        if (x + width > imgWidth) width = imgWidth - x;
        if (y + height > imgHeight) height = imgHeight - y;

        setCrop({ x, y, width, height });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
         e.preventDefault();
         e.stopPropagation();
         setDragState(null);
    };

    const handleCropConfirm = () => {
        if (imgRef.current && crop.width > 0) {
            const croppedImageUrl = getCroppedImg(imgRef.current, crop);
            onCropComplete(croppedImageUrl);
        }
    };

    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

    return (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4" 
          onClick={onClose}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
            <div className="bg-dark-bg rounded-2xl shadow-2xl max-w-md w-full mx-auto p-6 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Crop Image (9:16)</h2>
                <div ref={containerRef} className="relative w-full max-w-xs cursor-move" onMouseDown={(e) => handleMouseDown(e, 'move')}>
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Image to crop"
                        onLoad={onImageLoad}
                        className="w-full h-auto object-contain select-none pointer-events-none"
                    />
                    <div
                        className="absolute border-2 border-dashed border-white/80"
                        style={{
                            top: crop.y,
                            left: crop.x,
                            width: crop.width,
                            height: crop.height,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                        }}
                    >
                        {handles.map(handle => (
                            <div
                                key={handle}
                                onMouseDown={(e) => handleMouseDown(e, handle)}
                                className={`absolute bg-white/80 w-3 h-3 rounded-full -m-1.5 cursor-${handle}-resize`}
                                style={{
                                    top: `${handle.includes('n') ? 0 : handle.includes('s') ? 100 : 50}%`,
                                    left: `${handle.includes('w') ? 0 : handle.includes('e') ? 100 : 50}%`,
                                    transform: `translate(${handle.includes('w') ? '-50%' : handle.includes('e') ? '50%' : '0'}, ${handle.includes('n') ? '-50%' : handle.includes('s') ? '50%' : '0'})`,
                                }}
                            />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Drag and resize the box to select your crop.</p>
                <div className="flex gap-2 mt-6 w-full">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors">Cancel</button>
                    <button type="button" onClick={handleCropConfirm} className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors">Save Crop</button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;