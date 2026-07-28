import imageCompression from 'browser-image-compression';

export async function compressImage(file: File) {
  // If it's a GIF, we probably don't want to compress it as it might lose animation
  if (file.type === 'image/gif') {
    return file;
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // Ensure we keep the original name but maybe update the extension if needed
    // browser-image-compression usually returns a Blob, we convert it back to File
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Fallback to original file
  }
}
