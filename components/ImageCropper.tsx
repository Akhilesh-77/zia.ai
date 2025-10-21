import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImage: string) => void;
    onClose: () => void;
}

const CROP_ASPECT = 9 / 16;

const getCroppedImg = (image: HTMLImageElement, crop: {x: number, y: number, width: number, height: number}) => {
    const canvas = document.createElement('canvas');
    
    // Set canvas size to a reasonable resolution to maintain quality
    const outputWidth = 1080;
    const outputHeight = 1920;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // scale crop coordinates to the natural image size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;
    
    ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputWidth,
        outputHeight
    );

    return canvas.toDataURL('image/jpeg', 0.92); // Use high quality jpeg
};


const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const handleCrop = () => {
        if (imgRef.current && crop.width > 0) {
            const croppedImageUrl = getCroppedImg(imgRef.current, crop);
            onCropComplete(croppedImageUrl);
        }
    };
    
    useEffect(() => {
        if(imgRef.current) {
            const img = imgRef.current;
            const onImageLoad = () => {
                const imgWidth = img.clientWidth;
                const imgHeight = img.clientHeight;
                
                let newWidth, newHeight, newX, newY;
                const imgAspect = imgWidth / imgHeight;

                if (imgAspect > CROP_ASPECT) { // Image is wider than crop box
                    newHeight = imgHeight;
                    newWidth = newHeight * CROP_ASPECT;
                    newX = (imgWidth - newWidth) / 2;
                    newY = 0;
                } else { // Image is taller than or equal to crop box
                    newWidth = imgWidth;
                    newHeight = newWidth / CROP_ASPECT;
                    newY = (imgHeight - newHeight) / 2;
                    newX = 0;
                }
                 setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
            }
            img.addEventListener('load', onImageLoad);
            // If image is already loaded (e.g., from cache)
            if(img.complete) {
                onImageLoad();
            }
            return () => img.removeEventListener('load', onImageLoad);
        }
    }, [imageSrc]);


    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn p-4" onClick={onClose}>
            <div className="bg-dark-bg rounded-2xl shadow-2xl relative max-w-md w-full mx-auto p-6 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Crop to 9:16</h2>
                <div className="relative w-full max-w-xs overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
                     <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Full image to crop"
                        className="absolute top-0 left-0 w-full h-full object-contain"
                    />
                    {crop.width > 0 && (
                        <div
                            className="absolute border-2 border-dashed border-white/80 shadow-lg"
                            style={{
                                top: crop.y,
                                left: crop.x,
                                width: crop.width,
                                height: crop.height,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                            }}
                        />
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">A preview of the center-cropped image is shown. <br/>This ensures the best fit for the chat background.</p>
                <div className="flex gap-2 mt-6 w-full">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-500 text-white font-bold py-3 px-4 rounded-2xl transition-colors">Cancel</button>
                    <button type="button" onClick={handleCrop} className="flex-1 bg-accent text-white font-bold py-3 px-4 rounded-2xl transition-colors">Save Crop</button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
