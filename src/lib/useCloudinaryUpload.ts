import { useState, useCallback } from 'react';

type UploadOpts = {
  resourceType?: 'image' | 'video';
  folder?: string;
};

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback((file: File, opts: UploadOpts = {}): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
    const resourceType = opts.resourceType || 'image';

    setUploading(true);
    setProgress(0);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      if (opts.folder) formData.append('folder', opts.folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url as string);
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        reject(new Error('Upload failed'));
      };

      xhr.send(formData);
    });
  }, []);

  return { upload, uploading, progress };
}
